/**
 * Split engine — ported from docs/prototipo.jsx:278-319, with cent arithmetic.
 * Pure functions: no database, HTTP or Nest access. That is what lets them be
 * tested exhaustively in milliseconds, which is exactly what you want from the
 * part of the system that decides how much each person pays.
 */
import { recurringAppliesToMonth } from '@shared/format';
import { distributeCents } from './money';
import type { SplitContext, IncomeCalc, ExpenseCalc, RuleCalc } from './types';

/**
 * Recurring counts from its `since` month through its `until` month (open-ended
 * if absent) — it cannot have applied outside that window; one-off only in the
 * month of its date.
 */
export function incomeForMonth(
  incomes: IncomeCalc[],
  userId: string,
  month: string,
): number {
  return incomes
    .filter((i) => i.userId === userId)
    .filter(
      (i) =>
        (i.type === 'fixed' && recurringAppliesToMonth(i.since, i.until, month)) ||
        (i.date ?? '').slice(0, 7) === month,
    )
    .reduce((s, i) => s + i.amountCents, 0);
}

/** Recurring income already in effect for `month` — see {@link incomeForMonth}. */
export function recurringIncome(
  incomes: IncomeCalc[],
  userId: string,
  month: string,
): number {
  return incomes
    .filter(
      (i) => i.userId === userId && i.type === 'fixed' && recurringAppliesToMonth(i.since, i.until, month),
    )
    .reduce((s, i) => s + i.amountCents, 0);
}

/**
 * The part of the month's fixed expenses that `userId` actually bears after the
 * split — the base of the "free surplus" rule. Follows who pays in the end, not
 * who entered the expense: rent entered by one member but split entirely onto
 * another weighs on the other's surplus.
 *
 * The one exclusion is a fixed expense split among several people by the
 * surplus rule itself: its share would enter the calculation that defines the
 * share (circular). Every other split is known without the surplus, so it counts.
 */
export function fixedExpenseShare(
  ctx: SplitContext,
  userId: string,
): number {
  const { expenses, month } = ctx;
  let cents = 0;
  for (const e of expenses) {
    if (e.expenseType !== 'fixed' || e.month !== month) continue;

    const parts = e.shared && e.participants.length ? e.participants : [e.userId];
    if (!parts.includes(userId)) continue;
    if (parts.length === 1) {
      cents += e.amountCents;
      continue;
    }

    const rule = ctx.rules.find((r) => r.id === e.ruleId);
    if (rule?.type === 'surplus') continue;
    // Safe from recursion: with a non-surplus rule calculateShares never looks
    // at expenses. Cents (not the raw fraction) so the deduction matches the
    // exact share the statement charges this member.
    cents += distributeCents(e.amountCents, calculateShares(e, ctx))[userId] ?? 0;
  }
  return cents;
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
  const { rules, incomes, month } = ctx;
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
        parts.map((p) => [p, recurringIncome(incomes, p, month)]),
      );
      break;
    case 'surplus':
      weights = Object.fromEntries(
        parts.map((p) => [
          p,
          Math.max(0, recurringIncome(incomes, p, month) - fixedExpenseShare(ctx, p)),
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
