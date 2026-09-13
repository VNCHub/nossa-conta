import { createHash } from 'node:crypto';
import type { BankId, ImportDocumentType, RawTransaction } from './types';

/** Content hash used to reject a file already imported by the same family. */
export const fingerprintOf = (buffer: Buffer): string =>
  createHash('sha256').update(buffer).digest('hex');

/**
 * Identifies one transaction across different files: a bank statement can be
 * re-exported (wider date range, a fixed detail) with a different byte
 * content — and so a different file fingerprint — while still containing
 * transactions already imported earlier. This key lets those be recognized
 * and skipped individually instead of relying on the whole file being new.
 *
 * Built only from what the bank itself states (never a bank-issued id: Nubank's
 * own invoice OFX reuses one FITID across a purchase and its refund, so it
 * cannot be trusted as unique) — date, kind, amount and description are
 * already enough to tell those two apart.
 */
export const transactionKeyOf = (
  bank: BankId,
  documentType: ImportDocumentType,
  t: Pick<RawTransaction, 'date' | 'kind' | 'amountCents' | 'description'>,
): string =>
  createHash('sha256')
    .update([bank, documentType, t.kind, t.date, t.amountCents, t.description.trim()].join('|'))
    .digest('hex');
