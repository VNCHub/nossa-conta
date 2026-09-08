/**
 * Requirement 7: a family's data is invisible to anyone outside it.
 * Builds two real families and tries to cross the boundary by every path.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { PrismaService } from '../src/prisma/prisma.service';

const MONTH = '2031-03';

interface Account {
  token: string;
  userId: string;
  expenseId: string;
  ruleId: string;
  incomeId: string;
}

describe('Family isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => request.SuperTest<request.Test>;
  const emails: string[] = [];

  let houseA: Account;
  let houseB: Account;

  const createAccount = async (tag: string, familyName: string): Promise<Account> => {
    const email = `e2e-${tag}-${Date.now()}@teste.local`;
    emails.push(email);

    const { body: session } = await http()
      .post('/auth/register')
      .send({ name: `Teste ${tag}`, email, password: 'senha123', familyName })
      .expect(201);
    const token = session.accessToken;

    const { body: rules } = await http()
      .get('/regras')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const { body: income } = await http()
      .post('/entradas')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'recurring', description: 'Salário', amount: 5000, dayOfMonth: 5 })
      .expect(201);

    const { body: expense } = await http()
      .post('/gastos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: `${MONTH}-10`, paymentMethod: 'Pix', category: 'home', expenseType: 'fixed',
        description: `Aluguel ${tag}`, amount: 1000, shared: false,
      })
      .expect(201);

    return {
      token,
      userId: session.user.id,
      expenseId: expense.id,
      ruleId: rules[0].id,
      incomeId: income.id,
    };
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

    houseA = await createAccount('a', 'Casa A');
    houseB = await createAccount('b', 'Casa B');
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

  const asB = (r: request.Test) => r.set('Authorization', `Bearer ${houseB.token}`);

  it('the expense list only brings the ones from the own family', async () => {
    const { body } = await asB(http().get(`/gastos?mes=${MONTH}`)).expect(200);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(houseB.expenseId);
    expect(body.map((e: { id: string }) => e.id)).not.toContain(houseA.expenseId);
  });

  it('the statement does not see members or amounts from the other family', async () => {
    const { body } = await asB(
      http().get(`/relatorios/consolidado?mes=${MONTH}`),
    ).expect(200);
    expect(Object.keys(body.byUser)).toEqual([houseB.userId]);
    expect(body.monthTotal).toBe(1000);
  });

  it('the member list does not leak outside users', async () => {
    const { body } = await asB(http().get('/familias/minha/membros')).expect(200);
    expect(body.map((m: { id: string }) => m.id)).toEqual([houseB.userId]);
  });

  it('editing someone else\'s expense responds 404, without confirming it exists', () =>
    asB(http().patch(`/gastos/${houseA.expenseId}`))
      .send({
        date: `${MONTH}-10`, paymentMethod: 'Pix', category: 'home', expenseType: 'fixed',
        description: 'invadido', amount: 1, shared: false,
      })
      .expect(404));

  it('deleting someone else\'s expense responds 404', () =>
    asB(http().delete(`/gastos/${houseA.expenseId}`)).expect(404));

  it('deleting someone else\'s income responds 404', () =>
    asB(http().delete(`/entradas/${houseA.incomeId}`)).expect(404));

  it('touching another family\'s split rule responds 404', () =>
    asB(http().put(`/regras/${houseA.ruleId}/pesos`))
      .send({ weights: [{ userId: houseB.userId, percent: 100 }] })
      .expect(404));

  it('you cannot point an expense at another family\'s rule', () =>
    asB(http().post('/gastos'))
      .send({
        date: `${MONTH}-11`, paymentMethod: 'Pix', category: 'home', expenseType: 'fixed',
        description: 'regra de fora', amount: 100, shared: true,
        participants: [houseB.userId], ruleId: houseA.ruleId,
      })
      .expect(400));

  it('you cannot push a share onto someone outside the family', () =>
    asB(http().post('/gastos'))
      .send({
        date: `${MONTH}-11`, paymentMethod: 'Pix', category: 'home', expenseType: 'fixed',
        description: 'participante de fora', amount: 100, shared: true,
        participants: [houseB.userId, houseA.userId], ruleId: houseB.ruleId,
      })
      .expect(400));

  it('without a token, nothing responds', async () => {
    await http().get(`/gastos?mes=${MONTH}`).expect(401);
    await http().get(`/relatorios/consolidado?mes=${MONTH}`).expect(401);
    await http().get('/familias/minha').expect(401);
  });
});
