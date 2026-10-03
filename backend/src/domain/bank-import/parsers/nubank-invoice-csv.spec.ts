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

  describe('amounts with a thousands separator', () => {
    const csv = (amount: string) => Buffer.from(`date,title,amount\n2026-08-20,Algum lugar,"${amount}"\n`);

    it('reads "1.146,46" as a purchase of 114646 cents, not zero', () => {
      expect(parseNubankInvoiceCsv(csv('1.146,46'))[0]).toMatchObject({ amountCents: 114646, kind: 'debit' });
    });

    it('reads a spaced refund "- 1.146,46" as a credit of 114646 cents', () => {
      expect(parseNubankInvoiceCsv(csv('- 1.146,46'))[0]).toMatchObject({ amountCents: 114646, kind: 'credit' });
    });

    it('handles more than one thousands group', () => {
      expect(parseNubankInvoiceCsv(csv('12.345.678,90'))[0].amountCents).toBe(1234567890);
    });
  });

  it('refuses an amount it cannot read instead of importing it as zero', () => {
    const bad = Buffer.from('date,title,amount\n2026-08-20,Algum lugar,"abc"\n');
    expect(() => parseNubankInvoiceCsv(bad)).toThrow(/valor/i);
  });
});
