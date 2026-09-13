/**
 * API v1 contract — the same shape produced by the backend and consumed by the front.
 * Money values travel as a number in reais (already converted from cents).
 */
import type {
  CategoryId,
  PaymentMethod,
  IncomeType,
  ExpenseType,
  RuleType,
  BankId,
  ImportDocumentType,
  ImportFileFormat,
  RecordSource,
} from './domain';

export interface MemberDTO {
  id: string;
  name: string;
  email: string;
  color: string;
}

export interface FamilyDTO {
  id: string;
  name: string;
  inviteCode: string;
  createdById: string;
}

export interface IncomeDTO {
  id: string;
  userId: string;
  type: IncomeType;
  description: string;
  amount: number;
  /** present when type = recurring */
  dayOfMonth?: number | null;
  /** present when type = oneOff (YYYY-MM-DD) */
  date?: string | null;
  source: RecordSource;
  importedFileId: string | null;
}

export interface ExpenseDTO {
  id: string;
  userId: string;
  date: string;
  paymentMethod: PaymentMethod | null;
  category: CategoryId | null;
  expenseType: ExpenseType | null;
  description: string;
  amount: number;
  shared: boolean;
  participants: string[];
  ruleId: string | null;
  /** false when a required field is still missing — needs action before it counts anywhere */
  complete: boolean;
  source: RecordSource;
  importedFileId: string | null;
}

export interface RuleDTO {
  id: string;
  name: string;
  type: RuleType;
  description: string;
  unit?: string | null;
  /** type = fixed: agreed percentage per member */
  weights?: Record<string, number>;
  /** type = meter: { 'YYYY-MM': { userId: value } } */
  measurements?: Record<string, Record<string, number>>;
  /** how many expenses already use this rule (blocks deletion) */
  inUse?: number;
}

/** Expense plus each participant's percentage in the queried month. */
export interface StatementLine extends ExpenseDTO {
  shares: Record<string, number>;
}

export interface UserSummary {
  paid: number;
  share: number;
  fixed: number;
  optional: number;
  oneOff: number;
  income: number;
  categories: Record<string, number>;
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

/** Output of GET /relatorios/consolidado — the monthly statement for a family. */
export interface StatementDTO {
  month: string;
  lines: StatementLine[];
  byUser: Record<string, UserSummary>;
  balance: Record<string, number>;
  transfers: Transfer[];
  monthTotal: number;
}

export interface SessionDTO {
  accessToken: string;
  user: MemberDTO & { familyId: string | null };
}

/** One row of the import history — GET /gastos/importacoes. */
export interface ImportedFileDTO {
  id: string;
  bank: BankId;
  documentType: ImportDocumentType;
  fileFormat: ImportFileFormat;
  originalName: string;
  sizeBytes: number;
  /** YYYY-MM-DD — oldest/newest transaction found in the file */
  periodStart: string;
  periodEnd: string;
  expensesCount: number;
  /** refunds on an invoice, imported as a one-off Income instead of a Gasto */
  incomesCount: number;
  /** transactions in this file that matched one already saved by an earlier import — a re-exported, overlapping statement is expected to have some */
  duplicateTransactionsSkipped: number;
  importedBy: string;
  createdAt: string;
  expiresAt: string;
}

/** One entry per uploaded file — response of POST /gastos/importacoes. */
export interface ImportResultDTO {
  fileName: string;
  status: 'success' | 'error';
  /** user-facing reason, present when status = 'error' */
  message?: string;
  file?: ImportedFileDTO;
}
