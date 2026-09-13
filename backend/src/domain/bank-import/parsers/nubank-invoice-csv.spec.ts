import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseNubankInvoiceCsv } from './nubank-invoice-csv';

const fixture = readFileSync(
  join(__dirname, '../../../../test/fixtures/nubank/fatura.csv'),
);

describe('parseNubankInvoiceCsv', () => {
  it('parses every row, keeping the ISO date and reading the inverted sign convention', () => {
    const rows = parseNubankInvoiceCsv(fixture);
    expect(rows).toHaveLength(24);
    expect(rows[0]).toEqual({
      date: '2026-08-14',
      description: 'Google Wikiloc Trails',
      amountCents: 4190,
      kind: 'debit',
    });
  });

  it('reads a spaced, comma-decimal refund as a credit', () => {
    const rows = parseNubankInvoiceCsv(fixture);
    expect(rows[1]).toEqual({
      date: '2026-08-11',
      description: 'Estorno de "Azul Seguros" (Azul Seguros)',
      amountCents: 24465,
      kind: 'credit',
    });
  });

  it('counts purchases and refunds as they appear on the invoice', () => {
    const rows = parseNubankInvoiceCsv(fixture);
    expect(rows.filter((r) => r.kind === 'debit')).toHaveLength(21);
    expect(rows.filter((r) => r.kind === 'credit')).toHaveLength(3);
  });
});
