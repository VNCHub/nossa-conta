import { parseNubankAccountCsv } from './parsers/nubank-account-csv';
import { parseNubankInvoiceCsv } from './parsers/nubank-invoice-csv';
import { parseNubankOfx } from './parsers/nubank-ofx';
import type { BankId, ImportDocumentType, ImportFileFormat, RawTransaction } from './types';

/** Picks the right parser for (bank, documentType, fileFormat) — the only place that needs to grow when a new bank is added. */
export function parseFile(
  buffer: Buffer,
  bank: BankId,
  documentType: ImportDocumentType,
  format: ImportFileFormat,
): RawTransaction[] {
  if (format === 'ofx') return parseNubankOfx(buffer);
  return documentType === 'accountStatement'
    ? parseNubankAccountCsv(buffer)
    : parseNubankInvoiceCsv(buffer);
}
