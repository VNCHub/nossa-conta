import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseNubankOfx } from './nubank-ofx';

const fixturesDir = join(__dirname, '../../../../test/fixtures/nubank');
const contaOfx = readFileSync(join(fixturesDir, 'conta.ofx'));
const faturaOfx = readFileSync(join(fixturesDir, 'fatura.ofx'));

describe('parseNubankOfx', () => {
  it('parses every STMTTRN block of an account statement, converting OFX dates to ISO', () => {
    const rows = parseNubankOfx(contaOfx);
    expect(rows).toHaveLength(12);
    expect(rows[0]).toEqual({
      date: '2026-08-05',
      description: expect.stringContaining('Transferência recebida pelo Pix'),
      amountCents: 64131,
      kind: 'credit',
    });
    expect(rows[1]).toMatchObject({ date: '2026-08-05', amountCents: 7513, kind: 'debit' });
  });

  it('parses an invoice OFX with the same TRNTYPE-driven sign convention', () => {
    const rows = parseNubankOfx(faturaOfx);
    expect(rows).toHaveLength(24);
    expect(rows[0]).toEqual({
      date: '2026-08-14',
      description: 'Google Wikiloc Trails',
      amountCents: 4190,
      kind: 'debit',
    });
    expect(rows[1]).toEqual({
      date: '2026-08-11',
      description: 'Estorno de "Azul Seguros" (Azul Seguros)',
      amountCents: 24465,
      kind: 'credit',
    });
  });

  it('matches the credit/debit counts against the equivalent CSV export', () => {
    const account = parseNubankOfx(contaOfx);
    expect(account.filter((r) => r.kind === 'credit')).toHaveLength(4);
    expect(account.filter((r) => r.kind === 'debit')).toHaveLength(8);

    const invoice = parseNubankOfx(faturaOfx);
    expect(invoice.filter((r) => r.kind === 'debit')).toHaveLength(21);
    expect(invoice.filter((r) => r.kind === 'credit')).toHaveLength(3);
  });

  // Nubank's own invoice OFX repeats one FITID across two distinct STMTTRN
  // (an estorno and its original purchase) — the parser must not dedupe by
  // FITID, only return every block as-is.
  it('keeps both transactions when the invoice OFX repeats a FITID', () => {
    const rows = parseNubankOfx(faturaOfx);
    const liquidam = rows.filter((r) => r.description.includes('Mercadolivre*Liquidam'));
    expect(liquidam).toHaveLength(2);
    expect(liquidam.map((r) => r.kind).sort()).toEqual(['credit', 'debit']);
  });
});
