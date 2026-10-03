import { parse } from 'csv-parse/sync';
import { toCents } from '../../split';
import type { RawTransaction } from '../types';

/** Header: date,title,amount — opposite sign convention from the account CSV: positive = purchase (debit), negative = refund (credit). */
interface Row {
  date: string;
  title: string;
  amount: string;
}

export function parseNubankInvoiceCsv(buffer: Buffer): RawTransaction[] {
  const rows = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as Row[];

  return rows.map((row) => {
    const cents = toCents(normalizeAmount(row.amount));
    return {
      date: row.date,
      description: row.title?.trim() ?? '',
      amountCents: Math.abs(cents),
      kind: cents < 0 ? 'credit' : 'debit',
    };
  });
}

/**
 * "- 244,65" / "39,92" / "1.146,46" — Brazilian format: comma decimal, dot as
 * thousands separator, refunds carrying a spaced minus sign. Throws on
 * anything else: toCents turns an unreadable value into 0, which would import
 * a purchase as a R$ 0,00 expense without anyone noticing.
 */
function normalizeAmount(raw: string): string {
  const normalized = raw.trim().replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`Valor inválido na fatura: "${raw}"`);
  }
  return normalized;
}
