/**
 * The admin panel is gated by role, not by family: a regular member (only the
 * "default" role) must be refused, and an "admin" member must see the
 * platform-wide shape (not scoped to their own family).
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { RoleName } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Admin panel (e2e)', () => {
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
    await app.init();

    prisma = app.get(PrismaService);
    http = () => request(app.getHttpServer()) as unknown as request.SuperTest<request.Test>;

    const member = `e2e-member-${Date.now()}@teste.local`;
    const admin = `e2e-admin-${Date.now()}@teste.local`;
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

    // Granting the admin role has no API today — it is done in the database,
    // same as the data migration that ships it for the platform admin.
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.ADMIN } });
    await prisma.userRole.create({
      data: { userId: adminSession.user.id, roleId: adminRole.id },
    });

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

  it('refuses a plain member', async () => {
    await http()
      .get('/administracao/resumo')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);
    await http()
      .get('/administracao/usuarios')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);
  });

  it('refuses an anonymous request', () => http().get('/administracao/resumo').expect(401));

  it('gives an admin the platform-wide overview', async () => {
    const { body } = await http()
      .get('/administracao/resumo')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(body).toEqual({
      totalUsers: expect.any(Number),
      totalFamilies: expect.any(Number),
      totalExpenses: expect.any(Number),
      totalIncomes: expect.any(Number),
    });
    // Two families were created in this suite alone, so the admin — scoped to
    // neither — must still see both.
    expect(body.totalFamilies).toBeGreaterThanOrEqual(2);
  });

  it('paginates the user list', async () => {
    const { body } = await http()
      .get('/administracao/usuarios?page=1&pageSize=1')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(1);
    expect(body.items).toHaveLength(1);
    expect(body.total).toBeGreaterThanOrEqual(2);
    const [row] = body.items;
    expect(typeof row.id).toBe('string');
    expect(typeof row.name).toBe('string');
    expect(row.lastLoginAt === null || typeof row.lastLoginAt === 'string').toBe(true);
  });
});
