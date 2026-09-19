import type { IncomeType, ExpenseType, RuleType } from '@shared/domain';

/** A member's incomes, already converted to cents. */
export interface IncomeCalc {
  userId: string;
  type: IncomeType;
  amountCents: number;
  /** YYYY-MM-DD — only present on a one-off income */
  date?: string | null;
  /**
   * YYYY-MM a recurring income starts counting from — declared explicitly
   * when it's entered, not derived from when the row was created. Absent
   * means no lower bound (a one-off income does not need one: `date` already
   * pins it to a single month).
   */
  since?: string | null;
  /** YYYY-MM a recurring income stops counting after — absent means still ongoing. */
  until?: string | null;
}

export interface ExpenseCalc {
  id: string;
  userId: string;
  /** YYYY-MM period */
  month: string;
  category: string;
  expenseType: ExpenseType;
  amountCents: number;
  shared: boolean;
  participants: string[];
  ruleId: string | null;
}

export interface RuleCalc {
  id: string;
  type: RuleType;
  /** type = fixed — agreed percentage per member */
  weights?: Record<string, number>;
  /** type = meter — { 'YYYY-MM': { userId: measurement } } */
  measurements?: Record<string, Record<string, number>>;
}

export interface SplitContext {
  rules: RuleCalc[];
  incomes: IncomeCalc[];
  expenses: ExpenseCalc[];
  month: string;
}

export interface UserSummaryCalc {
  paidCents: number;
  shareCents: number;
  fixedCents: number;
  optionalCents: number;
  oneOffCents: number;
  incomeCents: number;
  categoryCents: Record<string, number>;
}

export interface TransferCalc {
  from: string;
  to: string;
  amountCents: number;
}

export interface StatementLineCalc extends ExpenseCalc {
  /** each participant's fraction (sums to 1) */
  shares: Record<string, number>;
  /** each participant's exact amount in cents (sum = amountCents) */
  shareCents: Record<string, number>;
}

export interface StatementCalc {
  month: string;
  lines: StatementLineCalc[];
  byUser: Record<string, UserSummaryCalc>;
  balanceCents: Record<string, number>;
  transfers: TransferCalc[];
  monthTotalCents: number;
}
