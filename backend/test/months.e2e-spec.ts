/**
 * "Finalizar meus lançamentos": the per-member freeze on a month. Covers the
 * family boundary (one family never sees or moves another's finalizations)
 * and every write path the freeze has to hold on — expenses, incomes and
 * imports. Runs against a real Postgres.
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

interface Session {
  token: string;
  userId: string;
}

// A month that has surely started, so finalizing it is allowed.
const MONTH = '2026-03';
const IN_MONTH = '2026-03-10';

describe('Month finalization (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => request.SuperTest<request.Test>;
  const emails: string[] = [];

  const register = async (tag: string, body: { familyName?: string; inviteCode?: string }) => {
    const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const email = `e2e-mes-${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@teste.local`;
    emails.push(email);
    const { body: session } = await http()
      .post('/auth/register')
      .send({ name: `Teste ${tag}`, email, password: 'senha123', ...body })
      .expect(201);
    return { token: session.accessToken, userId: session.user.id } as Session;
  };

  const auth = (s: Session) => (r: request.Test) => r.set('Authorization', `Bearer ${s.token}`);

  const makeFamily = async (name: string) => {
    const owner = await register(`owner-${name}`, { familyName: name });
    const { body } = await auth(owner)(http().get('/familias/minha')).expect(200);
    const member = await register(`member-${name}`, { inviteCode: body.inviteCode });
    return { owner, member };
  };

  const expense = (date: string) => ({
    date, paymentMethod: 'Pix', category: 'home', expenseType: 'fixed',
    description: 'Conta de luz', amount: 120, shared: false,
  });

  const finalize = (s: Session, month = MONTH) => auth(s)(http().post(`/meses/${month}/finalizacao`));
  const reopen = (s: Session, month = MONTH) => auth(s)(http().delete(`/meses/${month}/finalizacao`));

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
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({ where: { email: { in: emails } } });
    const families = [...new Set(users.map((u) => u.familyId).filter(Boolean))] as string[];
    await prisma.user.updateMany({ where: { id: { in: users.map((u) => u.id) } }, data: { familyId: null } });
    await prisma.family.deleteMany({ where: { id: { in: families } } });
    await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    await app.close();
  });

  it('finalizes and reopens the caller\'s own month, visible to the whole family only', async () => {
    const a = await makeFamily('Casa Finaliza');
    const b = await makeFamily('Casa Vizinha');

    const { body: after } = await finalize(a.owner).expect(201);
    expect(Object.keys(after.finalized)).toEqual([a.owner.userId]);
    await finalize(a.owner).expect(409);

    const { body: seenByMember } = await auth(a.member)(http().get(`/meses/${MONTH}`)).expect(200);
    expect(Object.keys(seenByMember.finalized)).toEqual([a.owner.userId]);

    // Another family sees nothing of it, and its own finalization stays its own.
    const { body: seenByOther } = await auth(b.owner)(http().get(`/meses/${MONTH}`)).expect(200);
    expect(seenByOther.finalized).toEqual({});
    await finalize(b.owner).expect(201);
    const { body: stillA } = await auth(a.owner)(http().get(`/meses/${MONTH}`)).expect(200);
    expect(Object.keys(stillA.finalized)).toEqual([a.owner.userId]);

    const { body: reopened } = await reopen(a.owner).expect(200);
    expect(reopened.finalized).toEqual({});
  });

  it('refuses to finalize a month that has not started, or a malformed one', async () => {
    const { owner } = await makeFamily('Casa Futuro');
    await finalize(owner, '2999-01').expect(400);
    await finalize(owner, '2026-13').expect(400);
  });

  it('freezes the member\'s expenses in that month, and only theirs', async () => {
    const { owner, member } = await makeFamily('Casa Gastos');
    const { body: existing } = await auth(owner)(http().post('/gastos')).send(expense(IN_MONTH)).expect(201);
    const { body: elsewhere } = await auth(owner)(http().post('/gastos')).send(expense('2026-04-02')).expect(201);

    await finalize(owner).expect(201);

    await auth(owner)(http().post('/gastos')).send(expense(IN_MONTH)).expect(409);
    await auth(owner)(http().patch(`/gastos/${existing.id}`)).send({ ...expense(IN_MONTH), amount: 999 }).expect(409);
    await auth(owner)(http().patch(`/gastos/${existing.id}`)).send(expense('2026-04-05')).expect(409);
    await auth(owner)(http().patch(`/gastos/${elsewhere.id}`)).send(expense(IN_MONTH)).expect(409);
    await auth(owner)(http().delete(`/gastos/${existing.id}`)).expect(409);

    // Other months and other members are untouched by it.
    await auth(owner)(http().patch(`/gastos/${elsewhere.id}`)).send({ ...expense('2026-04-02'), amount: 80 }).expect(200);
    await auth(member)(http().post('/gastos')).send(expense(IN_MONTH)).expect(201);

    await reopen(owner).expect(200);
    await auth(owner)(http().delete(`/gastos/${existing.id}`)).expect(204);
  });

  it('freezes incomes by what each finalized month would count', async () => {
    const { owner } = await makeFamily('Casa Entradas');
    const { body: salary } = await auth(owner)(http().post('/entradas'))
      .send({ type: 'recurring', description: 'Salário', amount: 5000, dayOfMonth: 5, since: '2026-01' })
      .expect(201);
    const { body: bonus } = await auth(owner)(http().post('/entradas'))
      .send({ type: 'oneOff', description: 'Bônus', amount: 300, date: IN_MONTH })
      .expect(201);

    await finalize(owner).expect(201);

    // One-off in the month: frozen, whatever the edit.
    await auth(owner)(http().post('/entradas')).send({ type: 'oneOff', description: 'Extra', amount: 50, date: IN_MONTH }).expect(409);
    await auth(owner)(http().patch(`/entradas/${bonus.id}`)).send({ description: 'Bônus anual' }).expect(409);
    await auth(owner)(http().delete(`/entradas/${bonus.id}`)).expect(409);

    // Recurring across it: anything that changes March is refused...
    await auth(owner)(http().patch(`/entradas/${salary.id}`)).send({ amount: 6000 }).expect(409);
    await auth(owner)(http().patch(`/entradas/${salary.id}`)).send({ until: '2026-02' }).expect(409);
    await auth(owner)(http().delete(`/entradas/${salary.id}`)).expect(409);
    await auth(owner)(http().post('/entradas'))
      .send({ type: 'recurring', description: 'Aluguel recebido', amount: 800, dayOfMonth: 1, since: '2026-02' })
      .expect(409);
    // ...but ending it later, renaming it, or starting a new one after March is fine.
    await auth(owner)(http().patch(`/entradas/${salary.id}`)).send({ until: '2026-06' }).expect(200);
    await auth(owner)(http().patch(`/entradas/${salary.id}`)).send({ description: 'Salário CLT' }).expect(200);
    await auth(owner)(http().post('/entradas'))
      .send({ type: 'recurring', description: 'Aluguel recebido', amount: 800, dayOfMonth: 1, since: '2026-04' })
      .expect(201);
  });

  it('rejects an import with any row in a finalized month', async () => {
    const { owner } = await makeFamily('Casa Importa');
    await finalize(owner).expect(201);
    // The internal import is admin-only; roles are read from the database on every request.
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.ADMIN } });
    await prisma.userRole.create({ data: { userId: owner.userId, roleId: adminRole.id } });

    const file = {
      version: 1,
      exportedAt: new Date().toISOString(),
      expenses: [
        { date: '2026-02-20', description: 'Mercado', amount: 210, category: 'food', expenseType: 'optional', paymentMethod: 'Pix' },
        { date: IN_MONTH, description: 'Farmácia', amount: 45, category: 'other', expenseType: 'oneOff', paymentMethod: 'Pix' },
      ],
    };
    const { body } = await auth(owner)(http().post('/gastos/importacoes'))
      .field('bank', 'internal')
      .attach('files', Buffer.from(JSON.stringify(file)), 'export.json')
      .expect(201);
    expect(body.files[0].status).toBe('error');
    expect(body.files[0].message).toMatch(/março de 2026/);

    const { body: expenses } = await auth(owner)(http().get('/gastos')).expect(200);
    expect(expenses).toHaveLength(0);
  });
});
