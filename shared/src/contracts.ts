/**
 * API v1 contract — the same shape produced by the backend and consumed by the front.
 * Money values travel as a number in reais (already converted from cents).
 */
import type { CategoryId, PaymentMethod, IncomeType, ExpenseType, RuleType } from './domain';

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
}

export interface ExpenseDTO {
  id: string;
  userId: string;
  date: string;
  paymentMethod: PaymentMethod;
  category: CategoryId;
  expenseType: ExpenseType;
  description: string;
  amount: number;
  shared: boolean;
  participants: string[];
  ruleId: string | null;
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
