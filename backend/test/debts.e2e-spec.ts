/**
 * Debts between members and the month closing that creates them: the family
 * boundary, who may pay or delete, how a payment fans out into an expense and
 * an income that stay out of the split, and closing/reopening a month. Runs
 * against a real Postgres.
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

const MONTH = '2026-03';

describe('Debts and month closing (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => request.SuperTest<request.Test>;
  const emails: string[] = [];

  const register = async (tag: string, body: { familyName?: string; inviteCode?: string }) => {
    const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const email = `e2e-div-${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@teste.local`;
    emails.push(email);
    const { body: session } = await http()
      .post('/auth/register')
      .send({ name: `Teste ${tag}`, email, password: 'senha123', ...body })
      .expect(201);
    return { token: session.accessToken, userId: session.user.id } as Session;
  };

  const auth = (s: Session) => (r: request.Test) => r.set('Authorization', `Bearer ${s.token}`);

  /** owner (creditor in most tests), payer and a third member who is in no debt. */
  const makeFamily = async (name: string) => {
    const owner = await register(`owner-${name}`, { familyName: name });
    const { body } = await auth(owner)(http().get('/familias/minha')).expect(200);
    const payer = await register(`payer-${name}`, { inviteCode: body.inviteCode });
    const third = await register(`third-${name}`, { inviteCode: body.inviteCode });
    return { owner, payer, third };
  };

  const newDebt = (by: Session, from: Session, to: Session, amount = 1000) =>
    auth(by)(http().post('/dividas')).send({
      fromUserId: from.userId, toUserId: to.userId, amount,
      description: 'Conserto do carro', date: '2026-03-02',
    });

  const pay = (s: Session, debtId: string, amount: number, date = '2026-03-15') =>
    auth(s)(http().post(`/dividas/${debtId}/pagamentos`)).send({ amount, date });

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

  it('keeps debts inside the family: invisible, unpayable and undeletable from outside', async () => {
    const a = await makeFamily('Casa Divida');
    const b = await makeFamily('Casa Outra');
    const { body: debt } = await newDebt(a.owner, a.payer, a.owner).expect(201);

    const { body: otherList } = await auth(b.owner)(http().get('/dividas')).expect(200);
    expect(otherList).toEqual([]);
    await pay(b.owner, debt.id, 10).expect(404);
    await auth(b.owner)(http().delete(`/dividas/${debt.id}`)).expect(404);

    // Nor can a debt be pointed at someone from another family.
    await newDebt(a.owner, b.owner, a.owner).expect(400);
    await newDebt(a.owner, a.owner, a.owner).expect(400);
  });

  it('only the debtor pays, never above what is left', async () => {
    const { owner, payer, third } = await makeFamily('Casa Paga');
    const { body: debt } = await newDebt(third, payer, owner, 1000).expect(201);

    await pay(owner, debt.id, 100).expect(403);
    await pay(third, debt.id, 100).expect(403);
    await pay(payer, debt.id, 1000.01).expect(409);

    const { body: after } = await pay(payer, debt.id, 400).expect(201);
    expect(after).toMatchObject({ paid: 400, remaining: 600 });
    await pay(payer, debt.id, 600.01).expect(409);
    const { body: settled } = await pay(payer, debt.id, 600).expect(201);
    expect(settled).toMatchObject({ paid: 1000, remaining: 0 });
  });

  it('a payment is an expense for the payer and an income for the receiver, outside the split', async () => {
    const { owner, payer } = await makeFamily('Casa Rateio');
    const { body: debt } = await newDebt(owner, payer, owner, 500).expect(201);
    const { body: before } = await auth(owner)(http().get(`/relatorios/consolidado?mes=${MONTH}`)).expect(200);

    await pay(payer, debt.id, 200).expect(201);

    const { body: expenses } = await auth(payer)(http().get(`/gastos?mes=${MONTH}`)).expect(200);
    expect(expenses).toEqual([
      expect.objectContaining({ userId: payer.userId, expenseType: 'debt', amount: 200, debtId: debt.id, complete: true }),
    ]);
    const { body: incomes } = await auth(owner)(http().get('/entradas')).expect(200);
    expect(incomes).toEqual([
      expect.objectContaining({ userId: owner.userId, type: 'oneOff', amount: 200, date: '2026-03-15' }),
    ]);
    const receiptId = incomes[0].id;

    // The family's statement is exactly what it was; only the personal debt fields move.
    const { body: after } = await auth(owner)(http().get(`/relatorios/consolidado?mes=${MONTH}`)).expect(200);
    expect(after.monthTotal).toBe(before.monthTotal);
    expect(after.lines).toEqual(before.lines);
    expect(after.transfers).toEqual(before.transfers);
    expect(after.byUser[owner.userId]).toMatchObject({ income: 0, debtReceived: 200 });
    expect(after.byUser[payer.userId]).toMatchObject({ paid: 0, debtPaid: 200 });

    // Neither side can be edited on its own.
    await auth(payer)(http().patch(`/gastos/${expenses[0].id}`)).send({ amount: 1 }).expect(400);
    await auth(owner)(http().patch(`/entradas/${receiptId}`)).send({ amount: 1 }).expect(400);
    await auth(owner)(http().delete(`/entradas/${receiptId}`)).expect(400);

    // Undoing it — deleting the expense — takes the income along and frees the balance.
    await auth(payer)(http().delete(`/gastos/${expenses[0].id}`)).expect(204);
    const { body: incomesAfter } = await auth(owner)(http().get('/entradas')).expect(200);
    expect(incomesAfter).toEqual([]);
    const { body: debts } = await auth(owner)(http().get('/dividas')).expect(200);
    expect(debts[0]).toMatchObject({ paid: 0, remaining: 500, payments: [] });
  });

  it('respects the payer\'s finalized month, not the receiver\'s', async () => {
    const { owner, payer } = await makeFamily('Casa Trava');
    const { body: debt } = await newDebt(owner, payer, owner, 300).expect(201);

    // Receiver finalized: the payment still lands, income included.
    await auth(owner)(http().post(`/meses/${MONTH}/finalizacao`)).expect(201);
    await pay(payer, debt.id, 100).expect(201);

    // Payer finalized: no new payment in that month, and the one there can't be undone.
    await auth(payer)(http().post(`/meses/${MONTH}/finalizacao`)).expect(201);
    await pay(payer, debt.id, 50).expect(409);
    const { body: expenses } = await auth(payer)(http().get(`/gastos?mes=${MONTH}`)).expect(200);
    await auth(payer)(http().delete(`/gastos/${expenses[0].id}`)).expect(409);
    await pay(payer, debt.id, 50, '2026-04-01').expect(201);
  });

  it('only the two people in a debt delete it, and its payments stay', async () => {
    const { owner, payer, third } = await makeFamily('Casa Exclui');
    const { body: debt } = await newDebt(owner, payer, owner, 300).expect(201);
    await pay(payer, debt.id, 100).expect(201);

    await auth(third)(http().delete(`/dividas/${debt.id}`)).expect(403);
    await auth(owner)(http().delete(`/dividas/${debt.id}`)).expect(204);

    const { body: debts } = await auth(owner)(http().get('/dividas')).expect(200);
    expect(debts).toEqual([]);
    const { body: expenses } = await auth(payer)(http().get(`/gastos?mes=${MONTH}`)).expect(200);
    expect(expenses).toEqual([expect.objectContaining({ expenseType: 'debt', amount: 100, debtId: null })]);
    const { body: incomes } = await auth(owner)(http().get('/entradas')).expect(200);
    expect(incomes).toHaveLength(1);
  });

  it('closes the month into one debt per transfer, and reopening deletes what is left of them', async () => {
    const { owner, payer, third } = await makeFamily('Casa Fecha');
    // R$ 300 rent paid by the owner, split equally: payer and third owe R$ 100 each.
    const { body: rules } = await auth(owner)(http().get('/regras')).expect(200);
    const equal = rules.find((r: { type: string }) => r.type === 'equal');
    await auth(owner)(http().post('/gastos')).send({
      date: '2026-03-05', paymentMethod: 'Pix', category: 'home', expenseType: 'fixed',
      description: 'Aluguel', amount: 300, shared: true,
      participants: [owner.userId, payer.userId, third.userId], ruleId: equal.id,
    }).expect(201);

    const close = () => auth(owner)(http().post(`/meses/${MONTH}/fechamento`));
    await auth(owner)(http().post(`/meses/${MONTH}/finalizacao`)).expect(201);
    await auth(payer)(http().post(`/meses/${MONTH}/finalizacao`)).expect(201);
    await close().expect(409);
    await auth(third)(http().post(`/meses/${MONTH}/finalizacao`)).expect(201);

    const { body: closed } = await close().expect(201);
    expect(closed.closed).toMatchObject({ closedById: owner.userId, generatedCount: 2 });
    await close().expect(409);

    const { body: debts } = await auth(owner)(http().get('/dividas')).expect(200);
    expect(debts).toHaveLength(2);
    for (const d of debts) {
      expect(d).toMatchObject({ toUserId: owner.userId, amount: 100, origin: 'monthClosing', closingMonth: MONTH });
    }

    // Closed: nobody reopens their own entries.
    await auth(payer)(http().delete(`/meses/${MONTH}/finalizacao`)).expect(409);

    // One generated debt deleted by hand, one paid in April; reopening still works.
    const fromPayer = debts.find((d: { fromUserId: string }) => d.fromUserId === payer.userId);
    const fromThird = debts.find((d: { fromUserId: string }) => d.fromUserId === third.userId);
    await auth(third)(http().delete(`/dividas/${fromThird.id}`)).expect(204);
    await pay(payer, fromPayer.id, 40, '2026-04-02').expect(201);

    const { body: reopened } = await auth(third)(http().delete(`/meses/${MONTH}/fechamento`)).expect(200);
    expect(reopened.closed).toBeNull();
    const { body: debtsAfter } = await auth(owner)(http().get('/dividas')).expect(200);
    expect(debtsAfter).toEqual([]);
    const { body: april } = await auth(payer)(http().get('/gastos?mes=2026-04')).expect(200);
    expect(april).toEqual([expect.objectContaining({ expenseType: 'debt', amount: 40, debtId: null })]);

    await auth(payer)(http().delete(`/meses/${MONTH}/finalizacao`)).expect(200);
    await auth(owner)(http().delete(`/meses/${MONTH}/fechamento`)).expect(404);
  });

  it('leaves debt payments out of the export, but keeps expenses with no type yet', async () => {
    const { owner, payer } = await makeFamily('Casa Exporta');
    const { body: debt } = await newDebt(owner, payer, owner, 300).expect(201);
    await pay(payer, debt.id, 100).expect(201);
    await auth(payer)(http().post('/gastos')).send({
      date: '2026-03-20', description: 'Padaria', amount: 25, paymentMethod: 'Pix', shared: false,
    }).expect(201);

    const { body } = await auth(payer)(http().get('/gastos/exportar?escopo=meus')).expect(200);
    expect(body.expenses).toEqual([expect.objectContaining({ description: 'Padaria', expenseType: null })]);
  });

  it('keeps another family out of closing and reopening', async () => {
    const a = await makeFamily('Casa Fecha A');
    const b = await makeFamily('Casa Fecha B');
    for (const s of [a.owner, a.payer, a.third]) {
      await auth(s)(http().post(`/meses/${MONTH}/finalizacao`)).expect(201);
    }
    await auth(a.owner)(http().post(`/meses/${MONTH}/fechamento`)).expect(201);

    const { body: seenByB } = await auth(b.owner)(http().get(`/meses/${MONTH}`)).expect(200);
    expect(seenByB.closed).toBeNull();
    await auth(b.owner)(http().delete(`/meses/${MONTH}/fechamento`)).expect(404);
    const { body: stillA } = await auth(a.owner)(http().get(`/meses/${MONTH}`)).expect(200);
    expect(stillA.closed).not.toBeNull();
  });
});
