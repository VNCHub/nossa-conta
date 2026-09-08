/**
 * The critical actions on the family screen: only the creator edits the family
 * or removes a member, dissolving wipes the shared data, and leaving cuts the
 * account's access. Runs against a real Postgres.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { PrismaService } from '../src/prisma/prisma.service';

interface Session {
  token: string;
  userId: string;
}

describe('Family critical actions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => request.SuperTest<request.Test>;
  const emails: string[] = [];

  const register = async (
    tag: string,
    body: { familyName?: string; inviteCode?: string },
  ): Promise<Session> => {
    const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const email = `e2e-fam-${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@teste.local`;
    emails.push(email);
    const { body: session } = await http()
      .post('/auth/register')
      .send({ name: `Teste ${tag}`, email, password: 'senha123', ...body })
      .expect(201);
    return { token: session.accessToken, userId: session.user.id };
  };

  const auth = (s: Session) => (r: request.Test) =>
    r.set('Authorization', `Bearer ${s.token}`);

  const inviteCode = async (s: Session): Promise<string> => {
    const { body } = await auth(s)(http().get('/familias/minha')).expect(200);
    return body.inviteCode;
  };

  /** A family with a creator plus `extra` members joined by the invite code. */
  const makeFamily = async (name: string, extra = 0) => {
    const owner = await register(`owner-${name}`, { familyName: name });
    const code = await inviteCode(owner);
    const members: Session[] = [];
    for (let i = 0; i < extra; i++) {
      members.push(await register(`m${i}-${name}`, { inviteCode: code }));
    }
    return { owner, code, members };
  };

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
    const families = [
      ...new Set(users.map((u) => u.familyId).filter(Boolean)),
    ] as string[];
    await prisma.user.updateMany({
      where: { id: { in: users.map((u) => u.id) } },
      data: { familyId: null },
    });
    await prisma.family.deleteMany({ where: { id: { in: families } } });
    await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    await app.close();
  });

  it('a non-creator cannot rename, remove a member or dissolve', async () => {
    const { owner, members } = await makeFamily('Casa Guard', 1);
    const member = members[0];

    await auth(member)(http().patch('/familias/minha')).send({ name: 'Renomeada' }).expect(403);
    await auth(member)(http().delete(`/familias/minha/membros/${owner.userId}`)).expect(403);
    await auth(member)(http().delete('/familias/minha')).expect(403);

    const { body } = await auth(owner)(http().get('/familias/minha')).expect(200);
    expect(body.name).toBe('Casa Guard');
  });

  it('the creator renames the family', async () => {
    const { owner } = await makeFamily('Casa Nome');
    await auth(owner)(http().patch('/familias/minha')).send({ name: '  Casa Nova  ' }).expect(200);
    const { body } = await auth(owner)(http().get('/familias/minha')).expect(200);
    expect(body.name).toBe('Casa Nova');
  });

  it('the creator removes a member: access is cut, past entries stay in history', async () => {
    const { owner, members } = await makeFamily('Casa Remove', 1);
    const member = members[0];

    await auth(member)(http().post('/gastos'))
      .send({
        date: '2031-05-04', paymentMethod: 'Pix', category: 'home', expenseType: 'fixed',
        description: 'Aluguel do mês', amount: 900, shared: false,
      })
      .expect(201);

    await auth(owner)(http().delete(`/familias/minha/membros/${member.userId}`)).expect(204);

    await auth(member)(http().get('/familias/minha')).expect(403);

    const { body } = await auth(owner)(
      http().get('/relatorios/consolidado?mes=2031-05'),
    ).expect(200);
    expect(body.monthTotal).toBe(900);
  });

  it('removing a member re-splits shared expenses from the current month on, keeping closed months frozen', async () => {
    const { owner, members } = await makeFamily('Casa Rateio', 2);
    const [m0, m1] = members;

    const { body: rules } = await auth(owner)(http().get('/regras')).expect(200);
    const equalRule = rules.find((r: { type: string }) => r.type === 'equal').id;

    const FUTURE = '2031-07';
    const PAST = '2020-02';
    const everyone = [owner.userId, m0.userId, m1.userId];

    // Current month on: owner pays 300 split three ways, m1 pays 90 split three ways.
    await auth(owner)(http().post('/gastos')).send({
      date: `${FUTURE}-10`, paymentMethod: 'Pix', category: 'home', expenseType: 'fixed',
      description: 'Aluguel', amount: 300, shared: true, participants: everyone, ruleId: equalRule,
    }).expect(201);
    await auth(m1)(http().post('/gastos')).send({
      date: `${FUTURE}-12`, paymentMethod: 'Pix', category: 'food', expenseType: 'optional',
      description: 'Mercado', amount: 90, shared: true, participants: everyone, ruleId: equalRule,
    }).expect(201);

    // Closed month: owner pays 300 split three ways.
    await auth(owner)(http().post('/gastos')).send({
      date: `${PAST}-10`, paymentMethod: 'Pix', category: 'home', expenseType: 'fixed',
      description: 'Aluguel antigo', amount: 300, shared: true, participants: everyone, ruleId: equalRule,
    }).expect(201);

    await auth(owner)(http().delete(`/familias/minha/membros/${m1.userId}`)).expect(204);

    // Current month: m1 is out — the 300 is re-split 150/150 and the expense m1
    // paid no longer generates a transfer.
    const { body: future } = await auth(owner)(
      http().get(`/relatorios/consolidado?mes=${FUTURE}`),
    ).expect(200);
    expect(Object.keys(future.byUser).sort()).toEqual([owner.userId, m0.userId].sort());
    expect(future.byUser[owner.userId].share).toBe(150);
    expect(future.byUser[m0.userId].share).toBe(150);
    expect(future.transfers).toEqual([{ from: m0.userId, to: owner.userId, amount: 150 }]);

    // Closed month: still split three ways — owner's share stays at 100.
    const { body: past } = await auth(owner)(
      http().get(`/relatorios/consolidado?mes=${PAST}`),
    ).expect(200);
    expect(past.byUser[owner.userId].share).toBe(100);
    expect(past.lines[0].shares[m1.userId]).toBeGreaterThan(0);
  });

  it('removing someone who is not a member responds 404', async () => {
    const { owner } = await makeFamily('Casa 404');
    const outsider = await register('outsider', { familyName: 'Casa de Fora' });
    await auth(owner)(http().delete(`/familias/minha/membros/${outsider.userId}`)).expect(404);
  });

  it('a member leaves and loses access', async () => {
    const { members } = await makeFamily('Casa Saida', 1);
    const member = members[0];
    await auth(member)(http().post('/familias/minha/sair')).expect(204);
    await auth(member)(http().get('/familias/minha')).expect(403);
  });

  it('when the creator leaves, ownership moves to the oldest remaining member', async () => {
    const { owner, members } = await makeFamily('Casa Herda', 2);
    const [first, second] = members;

    await auth(owner)(http().post('/familias/minha/sair')).expect(204);
    await auth(owner)(http().get('/familias/minha')).expect(403);

    // The oldest remaining member now owns it — and can do creator-only things.
    await auth(first)(http().patch('/familias/minha')).send({ name: 'Casa do Primeiro' }).expect(200);
    await auth(second)(http().patch('/familias/minha')).send({ name: 'Tentativa' }).expect(403);
  });

  it('dissolving deletes the shared data and cuts every member', async () => {
    const { owner, members } = await makeFamily('Casa Fim', 1);
    const member = members[0];

    const { body: expense } = await auth(owner)(http().post('/gastos'))
      .send({
        date: '2031-06-10', paymentMethod: 'Pix', category: 'home', expenseType: 'fixed',
        description: 'Conta de luz', amount: 200, shared: false,
      })
      .expect(201);

    await auth(owner)(http().delete('/familias/minha')).expect(204);

    await auth(owner)(http().get('/familias/minha')).expect(403);
    await auth(member)(http().get('/familias/minha')).expect(403);
    expect(await prisma.expense.count({ where: { id: expense.id } })).toBe(0);
  });
});
