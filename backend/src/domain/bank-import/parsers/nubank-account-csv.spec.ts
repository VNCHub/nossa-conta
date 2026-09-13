import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseNubankAccountCsv } from './nubank-account-csv';

const fixture = readFileSync(
  join(__dirname, '../../../../test/fixtures/nubank/conta.csv'),
);

describe('parseNubankAccountCsv', () => {
  it('parses every row, converting DD/MM/YYYY to ISO and splitting sign into kind', () => {
    const rows = parseNubankAccountCsv(fixture);
    expect(rows).toHaveLength(12);
    expect(rows[0]).toEqual({
      date: '2026-08-05',
      description: expect.stringContaining('Transferência recebida pelo Pix'),
      amountCents: 64131,
      kind: 'credit',
    });
    expect(rows[1]).toMatchObject({
      date: '2026-08-05',
      amountCents: 7513,
      kind: 'debit',
    });
  });

  it('counts credits and debits as they appear in the statement', () => {
    const rows = parseNubankAccountCsv(fixture);
    expect(rows.filter((r) => r.kind === 'credit')).toHaveLength(4);
    expect(rows.filter((r) => r.kind === 'debit')).toHaveLength(8);
  });
});
