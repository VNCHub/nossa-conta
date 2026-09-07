/**
 * Split engine — ported from docs/prototipo.jsx:278-319, with cent arithmetic.
 * Pure functions: no database, HTTP or Nest access. That is what lets them be
 * tested exhaustively in milliseconds, which is exactly what you want from the
 * part of the system that decides how much each person pays.
 */
import type { SplitContext, IncomeCalc, ExpenseCalc, RuleCalc } from './types';

/** Recurring counts every month; one-off only in the month of its date. */
export function incomeForMonth(
  incomes: IncomeCalc[],
  userId: string,
  month: string,
): number {
  return incomes
    .filter((i) => i.userId === userId)
    .filter((i) => i.type === 'recurring' || (i.date ?? '').slice(0, 7) === month)
    .reduce((s, i) => s + i.amountCents, 0);
}

export function recurringIncome(incomes: IncomeCalc[], userId: string): number {
  return incomes
    .filter((i) => i.userId === userId && i.type === 'recurring')
    .reduce((s, i) => s + i.amountCents, 0);
}

/**
 * Individual fixed expenses (not shared) of the month — the base of the
 * "free surplus" rule.
 *
 * Shared expenses are left out on purpose: including them would create a
 * circular dependency, because the share would enter the calculation that
 * defines the share.
 */
export function individualFixedExpenses(
  expenses: ExpenseCalc[],
  userId: string,
  month: string,
): number {
  return expenses
    .filter(
      (e) =>
        e.userId === userId && !e.shared && e.expenseType === 'fixed' && e.month === month,
    )
    .reduce((s, e) => s + e.amountCents, 0);
}

/**
 * Each participant's fraction of an expense, according to the chosen rule.
 * Fractions always sum to 1. With no rule, or no data for the month, it falls
 * back to equal parts.
 */
export function calculateShares(
  expense: Pick<ExpenseCalc, 'participants' | 'userId' | 'ruleId'>,
  ctx: SplitContext,
): Record<string, number> {
  const { rules, incomes, expenses, month } = ctx;
  const parts = expense.participants.length ? expense.participants : [expense.userId];
  const equal = (): Record<string, number> =>
    Object.fromEntries(parts.map((p) => [p, 1 / parts.length]));

  const rule: RuleCalc | undefined = rules.find((r) => r.id === expense.ruleId);
  if (!rule || rule.type === 'equal') return equal();

  let weights: Record<string, number> = {};
  switch (rule.type) {
    case 'fixed':
      weights = Object.fromEntries(parts.map((p) => [p, rule.weights?.[p] ?? 0]));
      break;
    case 'income':
      weights = Object.fromEntries(
        parts.map((p) => [p, recurringIncome(incomes, p)]),
      );
      break;
    case 'surplus':
      weights = Object.fromEntries(
        parts.map((p) => [
          p,
          Math.max(0, recurringIncome(incomes, p) - individualFixedExpenses(expenses, p, month)),
        ]),
      );
      break;
    case 'meter':
      weights = Object.fromEntries(
        parts.map((p) => [p, rule.measurements?.[month]?.[p] ?? 0]),
      );
      break;
  }

  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  if (!total) return equal();
  return Object.fromEntries(parts.map((p) => [p, weights[p] / total]));
}
