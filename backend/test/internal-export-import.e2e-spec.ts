/**
 * "Exportar dados" (GET /gastos/exportar) and its "Interno" counterpart in
 * the import wizard (POST /gastos/importacoes with bank=internal) exist for
 * one thing: moving a person's gastos into a different environment/family.
 * That is exactly where family isolation matters most, so this covers the
 * round trip, the escopo/date filters, dedup on re-import, and that the
 * shared/participants/ruleId never survive the trip. Runs against a real
 * Postgres.
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

describe('Internal export/import (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => request.SuperTest<request.Test>;
  const emails: string[] = [];

  const register = async (
    tag: string,
    body: { familyName?: string; inviteCode?: string },
  ): Promise<Session> => {
    const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const email = `e2e-exp-${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@teste.local`;
    emails.push(email);
    const { body: session } = await http()
      .post('/auth/register')
      .send({ name: `Teste ${tag}`, email, password: 'senha123', ...body })
      .expect(201);
    return { token: session.accessToken, userId: session.user.id };
  };

  const auth = (s: Session) => (r: request.Test) => r.set('Authorization', `Bearer ${s.token}`);

  const inviteCode = async (s: Session): Promise<string> => {
    const { body } = await auth(s)(http().get('/familias/minha')).expect(200);
    return body.inviteCode;
  };

  const createExpense = (s: Session, body: Record<string, unknown>) =>
    auth(s)(http().post('/gastos')).send(body).expect(201);

  const importInternal = (s: Session, file: unknown) =>
    auth(s)(http().post('/gastos/importacoes'))
      .field('bank', 'internal')
      .attach('files', Buffer.from(JSON.stringify(file)), 'export.json');

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
    await prisma.user.updateMany({
      where: { id: { in: users.map((u) => u.id) } },
      data: { familyId: null },
    });
    await prisma.family.deleteMany({ where: { id: { in: families } } });
    await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    await app.close();
  });

  it('exports only the portable fields, dropping shared/participants/ruleId', async () => {
    const owner = await register('owner-a', { familyName: 'Casa Export A' });
    await createExpense(owner, {
      date: '2026-08-03',
      description: 'Mercado',
      amount: 154.9,
      category: 'food',
      expenseType: 'optional',
      paymentMethod: 'Pix',
      shared: false,
    });

    const { body } = await auth(owner)(http().get('/gastos/exportar')).expect(200);
    expect(body.version).toBe(1);
    expect(body.expenses).toHaveLength(1);
    expect(body.expenses[0]).toMatchObject({
      date: '2026-08-03',
      description: 'Mercado',
      amount: 154.9,
      category: 'food',
      expenseType: 'optional',
      paymentMethod: 'Pix',
    });
    expect(body.expenses[0]).not.toHaveProperty('id');
    expect(body.expenses[0]).not.toHaveProperty('shared');
    expect(body.expenses[0]).not.toHaveProperty('ruleId');
  });

  it('escopo=meus vs todos, and inicio/fim narrow the export by date', async () => {
    const owner = await register('owner-b', { familyName: 'Casa Export B' });
    const code = await inviteCode(owner);
    const partner = await register('partner-b', { inviteCode: code });

    await createExpense(owner, { date: '2026-06-10', description: 'Aluguel', amount: 1000, category: 'home', expenseType: 'fixed', paymentMethod: 'Pix' });
    await createExpense(owner, { date: '2026-08-10', description: 'Cinema', amount: 40, category: 'outing', expenseType: 'optional', paymentMethod: 'Crédito' });
    await createExpense(partner, { date: '2026-08-15', description: 'Ração', amount: 90, category: 'pets', expenseType: 'fixed', paymentMethod: 'Débito' });

    const { body: mine } = await auth(owner)(http().get('/gastos/exportar?escopo=meus')).expect(200);
    expect(mine.expenses.map((e: { description: string }) => e.description).sort()).toEqual(['Aluguel', 'Cinema']);

    const { body: all } = await auth(owner)(http().get('/gastos/exportar?escopo=todos')).expect(200);
    expect(all.expenses).toHaveLength(3);

    const { body: ranged } = await auth(owner)(
      http().get('/gastos/exportar?escopo=todos&inicio=2026-08-01&fim=2026-08-31'),
    ).expect(200);
    expect(ranged.expenses.map((e: { description: string }) => e.description).sort()).toEqual(['Cinema', 'Ração']);
  });

  it('rejects an inverted date range', async () => {
    const owner = await register('owner-c', { familyName: 'Casa Export C' });
    await auth(owner)(http().get('/gastos/exportar?inicio=2026-08-31&fim=2026-08-01')).expect(400);
  });

  it('re-imports an exported file into a different family as personal, unshared, complete gastos', async () => {
    const source = await register('source-a', { familyName: 'Casa Origem A' });
    await createExpense(source, {
      date: '2026-08-03',
      description: 'Mercado',
      amount: 154.9,
      category: 'food',
      expenseType: 'optional',
      paymentMethod: 'Pix',
    });
    const { body: exported } = await auth(source)(http().get('/gastos/exportar')).expect(200);

    const target = await register('target-a', { familyName: 'Casa Destino A' });
    const { body: results } = await importInternal(target, exported).expect(201);

    expect(results[0].status).toBe('success');
    expect(results[0].file.bank).toBe('internal');
    expect(results[0].file.documentType).toBe('internalExport');
    expect(results[0].file.fileFormat).toBe('json');
    expect(results[0].file.expensesCount).toBe(1);

    const { body: expenses } = await auth(target)(http().get('/gastos?mes=2026-08')).expect(200);
    expect(expenses).toHaveLength(1);
    expect(expenses[0]).toMatchObject({
      userId: target.userId,
      description: 'Mercado',
      amount: 154.9,
      category: 'food',
      expenseType: 'optional',
      paymentMethod: 'Pix',
      shared: false,
      participants: [],
      ruleId: null,
      complete: true,
      source: 'import',
    });
  });

  it('re-importing the same export file again is a no-op, not a duplicate', async () => {
    const source = await register('source-b', { familyName: 'Casa Origem B' });
    await createExpense(source, { date: '2026-08-03', description: 'Mercado', amount: 50, category: 'food', expenseType: 'optional', paymentMethod: 'Pix' });
    const { body: exported } = await auth(source)(http().get('/gastos/exportar')).expect(200);

    const target = await register('target-b', { familyName: 'Casa Destino B' });
    await importInternal(target, exported).expect(201);
    const { body: resultsAgain } = await importInternal(target, exported).expect(201);

    expect(resultsAgain[0].status).toBe('error');
    expect(resultsAgain[0].message).toMatch(/já foi importado/i);

    const { body: expenses } = await auth(target)(http().get('/gastos?mes=2026-08')).expect(200);
    expect(expenses).toHaveLength(1);
  });

  it('dedup survives a re-export from an intermediate environment (A -> B -> C and A -> C direct land as one gasto in C)', async () => {
    const houseA = await register('house-a-chain', { familyName: 'Casa A da Cadeia' });
    await createExpense(houseA, { date: '2026-08-03', description: 'Mercado', amount: 154.9, category: 'food', expenseType: 'optional', paymentMethod: 'Pix' });
    const { body: exportFromA } = await auth(houseA)(http().get('/gastos/exportar')).expect(200);

    // A -> B: the gasto lands in B with a brand-new id, unrelated to the one it had in A.
    const houseB = await register('house-b-chain', { familyName: 'Casa B da Cadeia' });
    await importInternal(houseB, exportFromA).expect(201);
    const { body: exportFromB } = await auth(houseB)(http().get('/gastos/exportar')).expect(200);

    // C receives it twice, by two different paths: direct from A, and relayed through B.
    // If dedup were keyed by the source row's id, these two files would carry different
    // ids for the same gasto (A's original id vs. the new one minted in B) and both would
    // land in C as separate rows.
    const houseC = await register('house-c-chain', { familyName: 'Casa C da Cadeia' });
    await importInternal(houseC, exportFromA).expect(201);
    // A different file (different exportedAt, so a different file-level fingerprint) —
    // the file itself imports "successfully", but the one gasto inside it is recognized
    // as a duplicate of what A's direct export already created and is skipped.
    const { body: secondResult } = await importInternal(houseC, exportFromB).expect(201);

    expect(secondResult[0].status).toBe('success');
    expect(secondResult[0].file.expensesCount).toBe(0);
    expect(secondResult[0].file.duplicateTransactionsSkipped).toBe(1);

    const { body: expensesInC } = await auth(houseC)(http().get('/gastos?mes=2026-08')).expect(200);
    expect(expensesInC).toHaveLength(1);
  });

  it('rejects a file that is not a recognized internal export', async () => {
    const target = await register('target-c', { familyName: 'Casa Destino C' });
    const { body: results } = await importInternal(target, { foo: 'bar' }).expect(201);
    expect(results[0].status).toBe('error');
  });

  it("family isolation: escopo=todos never reaches outside the caller's family", async () => {
    const houseA = await register('house-a', { familyName: 'Casa Isolada Export A' });
    const houseB = await register('house-b', { familyName: 'Casa Isolada Export B' });

    await createExpense(houseA, { date: '2026-08-01', description: 'Só da Casa A', amount: 10, category: 'other', expenseType: 'oneOff', paymentMethod: 'Pix' });

    const { body } = await auth(houseB)(http().get('/gastos/exportar?escopo=todos')).expect(200);
    expect(body.expenses).toHaveLength(0);
  });
});
