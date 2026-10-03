import type { PaymentMethod } from '@shared/domain';

export type ImportDocumentType = 'accountStatement' | 'invoice';
export type ImportFileFormat = 'csv' | 'ofx';
export type BankId = 'nubank';

/** One line extracted from a statement, before any business rule is applied. */
export interface RawTransaction {
  /** YYYY-MM-DD */
  date: string;
  description: string;
  /** always a positive magnitude — sign lives in `kind` */
  amountCents: number;
  kind: 'debit' | 'credit';
}

export interface ExpenseSeed {
  date: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod | null;
  /** dedup key — lets a re-imported, still-incomplete statement skip transactions an earlier file already brought in */
  importKey: string;
}

export interface IncomeSeed {
  date: string;
  description: string;
  amount: number;
  importKey: string;
}

/** A line the mapper dropped on purpose — kept so the import report can say why instead of losing it silently. */
export interface ExcludedSeed {
  date: string;
  description: string;
  amount: number;
  kind: 'expense' | 'income';
  reason: 'invoicePayment';
}

export interface MappedImport {
  expenses: ExpenseSeed[];
  /** invoice refunds — always imported, no decision to make */
  incomes: IncomeSeed[];
  /** account-statement credits (Pix and transfers received) — only imported when the user accepts them */
  credits: IncomeSeed[];
  excluded: ExcludedSeed[];
}
