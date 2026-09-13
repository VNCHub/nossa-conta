import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mapAccountStatement, mapInvoice, periodOf } from './map-to-records';
import { parseNubankAccountCsv } from './parsers/nubank-account-csv';
import { parseNubankInvoiceCsv } from './parsers/nubank-invoice-csv';
import type { RawTransaction } from './types';

const fixturesDir = join(__dirname, '../../../test/fixtures/nubank');
const accountTransactions = parseNubankAccountCsv(
  readFileSync(join(fixturesDir, 'conta.csv')),
);
const invoiceTransactions = parseNubankInvoiceCsv(
  readFileSync(join(fixturesDir, 'fatura.csv')),
);

describe('mapAccountStatement', () => {
  it('drops credits and the invoice-payment line, keeping only real expenses', () => {
    const result = mapAccountStatement(accountTransactions, 'nubank');
    // 12 rows - 4 credits - 1 "Pagamento de fatura" debit = 7
    expect(result.expenses).toHaveLength(7);
    expect(result.skippedCredits).toBe(4);
    expect(result.incomes).toEqual([]);
    expect(result.expenses.some((e) => e.description.includes('Pagamento de fatura'))).toBe(false);
  });

  it('infers paymentMethod only from unambiguous wording', () => {
    const result = mapAccountStatement(accountTransactions, 'nubank');
    const byMethod = (m: string | null) => result.expenses.filter((e) => e.paymentMethod === m);
    expect(byMethod('Débito')).toHaveLength(3);
    expect(byMethod('Pix')).toHaveLength(3);
    expect(byMethod(null)).toHaveLength(1); // the boleto payment — no matching PAYMENT_METHOD
  });
});

describe('mapInvoice', () => {
  it('splits purchases into expenses and refunds into one-off incomes', () => {
    const result = mapInvoice(invoiceTransactions, 'nubank');
    expect(result.expenses).toHaveLength(21);
    expect(result.incomes).toHaveLength(3);
    expect(result.skippedCredits).toBe(0);
  });

  it('always attributes Crédito as paymentMethod — the source is a credit card invoice', () => {
    const result = mapInvoice(invoiceTransactions, 'nubank');
    expect(result.expenses.every((e) => e.paymentMethod === 'Crédito')).toBe(true);
  });

  it('labels invoice credits generically instead of assuming every one is a refund', () => {
    const result = mapInvoice(invoiceTransactions, 'nubank');
    expect(result.incomes.map((i) => i.description)).toContain(
      'Crédito na fatura: Pagamento recebido',
    );
  });
});

describe('importKey', () => {
  it('is stable across two independent parses of the same file — the case a re-export must match', () => {
    const first = mapAccountStatement(parseNubankAccountCsv(readFileSync(join(fixturesDir, 'conta.csv'))), 'nubank');
    const second = mapAccountStatement(parseNubankAccountCsv(readFileSync(join(fixturesDir, 'conta.csv'))), 'nubank');
    expect(first.expenses.map((e) => e.importKey)).toEqual(second.expenses.map((e) => e.importKey));
  });

  it('gives every expense a distinct key when dates, amounts or descriptions differ', () => {
    const result = mapAccountStatement(accountTransactions, 'nubank');
    const keys = result.expenses.map((e) => e.importKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('tells apart an invoice purchase from its same-amount refund on the same FITID', () => {
    // "Mercadolivre*Liquidam": a 39,92 purchase and a 39,92 estorno share one
    // FITID in Nubank's own OFX export — the key must not collide them.
    const result = mapInvoice(invoiceTransactions, 'nubank');
    const purchase = result.expenses.find((e) => e.description === 'Mercadolivre*Liquidam');
    const refund = result.incomes.find((i) => i.description.includes('Mercadolivre*Liquidam'));
    expect(purchase?.importKey).toBeDefined();
    expect(refund?.importKey).toBeDefined();
    expect(purchase?.importKey).not.toBe(refund?.importKey);
  });
});

describe('periodOf', () => {
  it('returns the oldest and newest date across every parsed line, before any filtering', () => {
    expect(periodOf(accountTransactions)).toEqual({ start: '2026-08-05', end: '2026-08-26' });
    expect(periodOf(invoiceTransactions)).toEqual({ start: '2026-07-15', end: '2026-08-14' });
  });

  it('returns null for an empty file', () => {
    const empty: RawTransaction[] = [];
    expect(periodOf(empty)).toBeNull();
  });
});
