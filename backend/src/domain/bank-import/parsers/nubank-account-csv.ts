import { parse } from 'csv-parse/sync';
import { toCents } from '../../split';
import type { RawTransaction } from '../types';

/** Header: Data,Valor,Identificador,Descrição — one row per movement, signed Valor. */
interface Row {
  Data: string;
  Valor: string;
  Descrição: string;
}

export function parseNubankAccountCsv(buffer: Buffer): RawTransaction[] {
  const rows = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as Row[];

  return rows.map((row) => {
    const cents = toCents(row.Valor);
    return {
      date: brDateToIso(row.Data),
      description: row['Descrição']?.trim() ?? '',
      amountCents: Math.abs(cents),
      kind: cents < 0 ? 'debit' : 'credit',
    };
  });
}

function brDateToIso(date: string): string {
  const [day, month, year] = date.split('/');
  return `${year}-${month}-${day}`;
}
