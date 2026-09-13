/**
 * The bank-import endpoint touches three sensitive things at once: file
 * upload, family isolation and money — so this covers the happy path, the
 * duplicate-fingerprint rejection, and that one family never sees or
 * collides with another's import. Runs against a real Postgres.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

const fixturesDir = join(__dirname, 'fixtures/nubank');
const contaCsv = readFileSync(join(fixturesDir, 'conta.csv'));
const contaUpdatedCsv = readFileSync(join(fixturesDir, 'conta-updated.csv'));
const faturaCsv = readFileSync(join(fixturesDir, 'fatura.csv'));

describe('Bank statement imports (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => request.SuperTest<request.Test>;
  const emails: string[] = [];

  const register = async (tag: string, familyName: string): Promise<Session> => {
    const email = `e2e-imp-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@teste.local`;
    emails.push(email);
    const { body: session } = await http()
      .post('/auth/register')
      .send({ name: `Teste ${tag}`, email, password: 'senha123', familyName })
      .expect(201);
    return { token: session.accessToken, userId: session.user.id };
  };

  const auth = (s: Session) => (r: request.Test) => r.set('Authorization', `Bearer ${s.token}`);

  const upload = (s: Session, files: { buffer: Buffer; name: string }[]) => {
    let req = auth(s)(http().post('/gastos/importacoes')).field('bank', 'nubank');
    for (const f of files) req = req.attach('files', f.buffer, f.name);
    return req;
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
    const families = [...new Set(users.map((u) => u.familyId).filter(Boolean))] as string[];
    await prisma.user.updateMany({
      where: { id: { in: users.map((u) => u.id) } },
      data: { familyId: null },
    });
    await prisma.family.deleteMany({ where: { id: { in: families } } });
    await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    await app.close();
  });

  it('imports an account statement and an invoice, creating incomplete Gastos and refund Incomes', async () => {
    const owner = await register('owner-a', 'Casa Import A');

    const { body: results } = await upload(owner, [
      { buffer: contaCsv, name: 'conta.csv' },
      { buffer: faturaCsv, name: 'fatura.csv' },
    ]).expect(201);

    expect(results).toHaveLength(2);
    const conta = results.find((r: { fileName: string }) => r.fileName === 'conta.csv');
    const fatura = results.find((r: { fileName: string }) => r.fileName === 'fatura.csv');

    expect(conta.status).toBe('success');
    expect(conta.file.documentType).toBe('accountStatement');
    expect(conta.file.expensesCount).toBe(7);
    expect(conta.file.incomesCount).toBe(0);

    expect(fatura.status).toBe('success');
    expect(fatura.file.documentType).toBe('invoice');
    expect(fatura.file.expensesCount).toBe(21);
    expect(fatura.file.incomesCount).toBe(3);

    const { body: history } = await auth(owner)(http().get('/gastos/importacoes')).expect(200);
    expect(history).toHaveLength(2);

    const { body: expenses } = await auth(owner)(
      http().get('/gastos?mes=2026-08'),
    ).expect(200);
    const debito = expenses.find((e: { description: string }) =>
      e.description.includes('AUTO POSTO GRUTA'),
    );
    expect(debito).toMatchObject({
      amount: 50,
      paymentMethod: 'Débito',
      category: null,
      complete: false,
      source: 'import',
    });

    const { body: incomes } = await auth(owner)(http().get('/entradas')).expect(200);
    expect(incomes.filter((i: { source: string }) => i.source === 'import')).toHaveLength(3);
  });

  it('rejects a file whose fingerprint was already imported', async () => {
    const owner = await register('owner-b', 'Casa Import B');

    await upload(owner, [{ buffer: contaCsv, name: 'conta.csv' }]).expect(201);
    const { body: results } = await upload(owner, [
      { buffer: contaCsv, name: 'conta-de-novo.csv' },
    ]).expect(201);

    expect(results[0].status).toBe('error');
    expect(results[0].message).toMatch(/já foi importado/i);

    const { body: history } = await auth(owner)(http().get('/gastos/importacoes')).expect(200);
    expect(history).toHaveLength(1);
  });

  it('rejects a file that does not match a known Nubank report', async () => {
    const owner = await register('owner-c', 'Casa Import C');
    const bogus = Buffer.from('coluna1,coluna2\nvalor1,valor2\n');

    const { body: results } = await upload(owner, [{ buffer: bogus, name: 'estranho.csv' }]).expect(
      201,
    );

    expect(results[0].status).toBe('error');
    const { body: history } = await auth(owner)(http().get('/gastos/importacoes')).expect(200);
    expect(history).toHaveLength(0);
  });

  it('re-importing an overlapping, differently-shaped export only saves the new transactions', async () => {
    const owner = await register('owner-d', 'Casa Import D');

    await upload(owner, [{ buffer: contaCsv, name: 'conta.csv' }]).expect(201);

    // A re-export covering more days: 12 of its 13 rows were already imported
    // (byte-for-byte identical transactions), one ("PADARIA CENTRAL") is new.
    // The file's fingerprint differs from conta.csv, so the file-level dedup
    // does not catch this — the per-transaction key must.
    const { body: results } = await upload(owner, [
      { buffer: contaUpdatedCsv, name: 'conta-atualizado.csv' },
    ]).expect(201);

    expect(results[0].status).toBe('success');
    expect(results[0].file.expensesCount).toBe(1);
    expect(results[0].file.duplicateTransactionsSkipped).toBe(7);

    const { body: expenses } = await auth(owner)(http().get('/gastos?mes=2026-08')).expect(200);
    const padaria = expenses.filter((e: { description: string }) =>
      e.description.includes('PADARIA CENTRAL'),
    );
    expect(padaria).toHaveLength(1);

    const autoPosto = expenses.filter((e: { description: string }) =>
      e.description.includes('AUTO POSTO GRUTA'),
    );
    expect(autoPosto).toHaveLength(1);
  });

  it('keeps imports isolated between families, including the fingerprint dedup', async () => {
    const houseA = await register('house-a', 'Casa Isolada A');
    const houseB = await register('house-b', 'Casa Isolada B');

    await upload(houseA, [{ buffer: contaCsv, name: 'conta.csv' }]).expect(201);

    const { body: historyB } = await auth(houseB)(http().get('/gastos/importacoes')).expect(200);
    expect(historyB).toHaveLength(0);

    // The same file, never imported by house B before, must succeed there —
    // the dedup key is scoped per family, not global.
    const { body: resultsB } = await upload(houseB, [
      { buffer: contaCsv, name: 'conta.csv' },
    ]).expect(201);
    expect(resultsB[0].status).toBe('success');
  });
});
