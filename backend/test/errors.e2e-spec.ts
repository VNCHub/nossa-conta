/**
 * The public ingest endpoint groups repeated errors into one issue; the
 * listing/detail endpoints are admin-only; and a normal business exception
 * (a 404 from crossing a family boundary) must never show up as an issue —
 * only unexpected errors are bugs worth tracking.
 */
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { RoleName } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { ErrorLoggingFilter } from '../src/common/filters/error-logging.filter';
import { ErrorsService } from '../src/modules/errors/errors.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Error observability (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => request.SuperTest<request.Test>;
  const emails: string[] = [];

  let memberToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalGuards(new JwtAuthGuard(app.get(Reflector)));
    const httpAdapter = app.get(HttpAdapterHost).httpAdapter;
    const errors = app.get(ErrorsService);
    app.useGlobalFilters(
      new PrismaExceptionFilter(httpAdapter, errors),
      new ErrorLoggingFilter(httpAdapter, errors),
    );
    await app.init();

    prisma = app.get(PrismaService);
    http = () => request(app.getHttpServer()) as unknown as request.SuperTest<request.Test>;

    const member = `e2e-errmember-${Date.now()}@teste.local`;
    const admin = `e2e-erradmin-${Date.now()}@teste.local`;
    emails.push(member, admin);

    const { body: memberSession } = await http()
      .post('/auth/register')
      .send({ name: 'Membro', email: member, password: 'senha123', familyName: 'Casa do membro' })
      .expect(201);
    memberToken = memberSession.accessToken;

    const { body: adminSession } = await http()
      .post('/auth/register')
      .send({ name: 'Admin', email: admin, password: 'senha123', familyName: 'Casa do admin' })
      .expect(201);

    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.ADMIN } });
    await prisma.userRole.create({ data: { userId: adminSession.user.id, roleId: adminRole.id } });

    const { body: refreshedAdmin } = await http()
      .post('/auth/login')
      .send({ email: admin, password: 'senha123' })
      .expect(200);
    adminToken = refreshedAdmin.accessToken;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({ where: { email: { in: emails } } });
    const families = [...new Set(users.map((u) => u.familyId).filter(Boolean))] as string[];
    await prisma.user.updateMany({
      where: { id: { in: users.map((u) => u.id) } },
      data: { familyId: null },
    });
    await prisma.family.deleteMany({ where: { id: { in: families } } });
    await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    await app.close();
  });

  it('accepts a report with no token and refuses listing/detail to non-admins', async () => {
    await http()
      .post('/erros')
      .send({ title: 'Boom (unauthenticated report)', stack: 'Error: Boom\n    at x (/app/y.ts:1:1)' })
      .expect(204);

    await http().get('/erros').set('Authorization', `Bearer ${memberToken}`).expect(403);
    await http().get('/erros').expect(401);
  });

  it('groups repeated occurrences of the same error into one issue', async () => {
    const title = `Cannot read properties of undefined ${Date.now()}`;
    const stackA = `TypeError: ${title}\n    at getUserId (/app/backend/src/modules/x.ts:10:5)`;
    const stackB = `TypeError: ${title}\n    at getUserId (/app/backend/src/modules/x.ts:11:5)`; // line shifted

    await http().post('/erros').send({ title, stack: stackA }).expect(204);
    await http().post('/erros').send({ title, stack: stackB }).expect(204);

    const { body } = await http()
      .get('/erros?page=1&pageSize=50')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const matches = body.items.filter((i: { title: string }) => i.title.includes(title));
    expect(matches).toHaveLength(1);
    expect(matches[0].eventsCount).toBe(2);
    expect(matches[0].source).toBe('frontend');

    const { body: detail } = await http()
      .get(`/erros/${matches[0].id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(detail.issue.id).toBe(matches[0].id);
    expect(detail.events.items).toHaveLength(2);
    expect(detail.events.items[0].stack).toEqual(expect.any(String));
  });

  it('a real business 404 is never logged as an issue', async () => {
    // Cross a family boundary on purpose — privacy.e2e-spec.ts already proves
    // this responds 404; here the point is that it leaves no trace in /erros.
    await http()
      .patch('/gastos/does-not-exist')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        date: '2031-03-10', paymentMethod: 'Pix', category: 'home', expenseType: 'fixed',
        description: 'x', amount: 1, shared: false,
      })
      .expect(404);

    const { body } = await http()
      .get('/erros?page=1&pageSize=50')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(body.items.some((i: { title: string }) => i.title.includes('Registro não encontrado'))).toBe(false);
  });
});
