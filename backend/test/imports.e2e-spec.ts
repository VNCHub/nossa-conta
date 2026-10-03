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
const faturaSetembroCsv = readFileSync(join(fixturesDir, 'fatura-setembro.csv'));

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

  const analyze = (s: Session, files: { buffer: Buffer; name: string }[]) => {
    let req = auth(s)(http().post('/gastos/importacoes/analise')).field('bank', 'nubank');
    for (const f of files) req = req.attach('files', f.buffer, f.name);
    return req;
  };

  const allFiles = [
    { buffer: contaCsv, name: 'conta.csv' },
    { buffer: faturaCsv, name: 'fatura.csv' },
    { buffer: faturaSetembroCsv, name: 'fatura-setembro.csv' },
  ];

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

    const { body: { files: results } } = await upload(owner, [
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
    const boleto = expenses.find((e: { description: string }) => e.description.includes('SABESP'));
    expect(boleto).toMatchObject({ amount: 75.13, paymentMethod: 'Boleto' });
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
    const { body: { files: results } } = await upload(owner, [
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

    const { body: { files: results } } = await upload(owner, [{ buffer: bogus, name: 'estranho.csv' }]).expect(
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
    const { body: { files: results } } = await upload(owner, [
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

  it('analysis proposes decisions across files and saves nothing', async () => {
    const owner = await register('owner-e', 'Casa Import E');

    const { body: analysis } = await analyze(owner, allFiles).expect(201);

    expect(analysis.files.every((f: { status: string }) => f.status === 'ok')).toBe(true);
    const decathlon = analysis.mergeGroups.find((g: { title: string }) => g.title === 'Decathlon');
    expect(decathlon).toMatchObject({ kind: 'sameDescription', month: '2026-07' });
    expect(decathlon.merged.amount).toBe(363.98);
    expect(decathlon.items).toHaveLength(2);

    // 1/6 (fatura de agosto) and 2/6 (fatura de setembro) both fall in August: one group over two files.
    const meli = analysis.mergeGroups.find((g: { title: string }) => g.title === 'Mp *Mercadolivre');
    expect(meli).toMatchObject({ kind: 'installments', month: '2026-08' });
    expect(meli.merged).toMatchObject({ description: 'Mp *Mercadolivre - Parcelas 1 e 2/6', amount: 64.39 });
    expect(new Set(meli.items.map((i: { fileName: string }) => i.fileName)).size).toBe(2);

    // A monthly subscription is not a duplicate of itself, and a 2/3 and a 3/3 in different months stay apart.
    expect(analysis.mergeGroups.map((g: { title: string }) => g.title)).not.toContain('Mp *Melimais');
    expect(analysis.mergeGroups.map((g: { title: string }) => g.title)).not.toContain('Good Auto Center');

    expect(analysis.credits).toHaveLength(4);

    const { body: history } = await auth(owner)(http().get('/gastos/importacoes')).expect(200);
    expect(history).toHaveLength(0);
  });

  it('applies the decisions: unifies the chosen groups and imports only the accepted credits', async () => {
    const owner = await register('owner-f', 'Casa Import F');
    const { body: analysis } = await analyze(owner, allFiles).expect(201);

    const decisions = {
      mergeGroupIds: analysis.mergeGroups.map((g: { id: string }) => g.id),
      acceptedCreditIds: analysis.credits.slice(0, 2).map((c: { id: string }) => c.id),
    };
    let req = auth(owner)(http().post('/gastos/importacoes')).field('bank', 'nubank');
    req = req.field('decisions', JSON.stringify(decisions));
    for (const f of allFiles) req = req.attach('files', f.buffer, f.name);
    const { body: report } = await req.expect(201);

    expect(report.files.every((f: { status: string }) => f.status === 'success')).toBe(true);

    const { body: august } = await auth(owner)(http().get('/gastos?mes=2026-08')).expect(200);
    const meli = august.filter((e: { description: string }) => e.description.includes('Mp *Mercadolivre'));
    expect(meli).toHaveLength(1);
    expect(meli[0]).toMatchObject({ description: 'Mp *Mercadolivre - Parcelas 1 e 2/6', amount: 64.39 });
    const { body: july } = await auth(owner)(http().get('/gastos?mes=2026-07')).expect(200);
    expect(july.filter((e: { description: string }) => e.description === 'Decathlon')).toEqual([
      expect.objectContaining({ amount: 363.98 }),
    ]);

    const reasons = (r: string) => report.notImported.filter((n: { reason: string }) => n.reason === r);
    expect(reasons('merged')).toHaveLength(analysis.mergeGroups.reduce((s: number, g: { items: unknown[] }) => s + g.items.length, 0));
    expect(reasons('creditRejected')).toHaveLength(2);
    expect(reasons('invoicePayment')).toHaveLength(1);
    expect(report.imported.filter((r: { mergedFrom?: number }) => r.mergedFrom)).toHaveLength(analysis.mergeGroups.length);

    // The 3 invoice credits of fatura.csv always come in; of the 4 account credits only the 2 ticked ones do.
    const { body: incomes } = await auth(owner)(http().get('/entradas')).expect(200);
    const imported = incomes.filter((i: { source: string }) => i.source === 'import');
    const named = (text: string) => imported.filter((i: { description: string }) => i.description.includes(text));
    expect(named('Transferência recebida')).toHaveLength(2);
    expect(named('Crédito na fatura').length).toBeGreaterThanOrEqual(3);
  });

  it('reports why a re-exported statement leaves transactions out', async () => {
    const owner = await register('owner-g', 'Casa Import G');
    await upload(owner, [{ buffer: contaCsv, name: 'conta.csv' }]).expect(201);

    const { body: report } = await upload(owner, [
      { buffer: contaUpdatedCsv, name: 'conta-atualizado.csv' },
    ]).expect(201);

    const duplicates = report.notImported.filter((n: { reason: string }) => n.reason === 'duplicate');
    expect(duplicates).toHaveLength(7);
    expect(duplicates[0].detail).toMatch(/já existe/i);
  });

  it('refuses malformed decisions', async () => {
    const owner = await register('owner-h', 'Casa Import H');
    await auth(owner)(http().post('/gastos/importacoes'))
      .field('bank', 'nubank')
      .field('decisions', '{"mergeGroupIds":"x"}')
      .attach('files', contaCsv, 'conta.csv')
      .expect(400);
  });

  it('keeps imports isolated between families, including the fingerprint dedup', async () => {
    const houseA = await register('house-a', 'Casa Isolada A');
    const houseB = await register('house-b', 'Casa Isolada B');

    await upload(houseA, [{ buffer: contaCsv, name: 'conta.csv' }]).expect(201);

    const { body: historyB } = await auth(houseB)(http().get('/gastos/importacoes')).expect(200);
    expect(historyB).toHaveLength(0);

    // The same file, never imported by house B before, must succeed there —
    // the dedup key is scoped per family, not global.
    const { body: { files: resultsB } } = await upload(houseB, [
      { buffer: contaCsv, name: 'conta.csv' },
    ]).expect(201);
    expect(resultsB[0].status).toBe('success');
  });
});
