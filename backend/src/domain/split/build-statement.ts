/**
 * Monthly statement — ported from docs/prototipo.jsx:321-369, in cents.
 */
import { calculateShares, incomeForMonth } from './calculate-shares';
import { distributeCents } from './money';
import type {
  StatementCalc,
  SplitContext,
  IncomeCalc,
  ExpenseCalc,
  StatementLineCalc,
  RuleCalc,
  UserSummaryCalc,
  TransferCalc,
} from './types';

const emptySummary = (incomeCents: number): UserSummaryCalc => ({
  paidCents: 0,
  shareCents: 0,
  fixedCents: 0,
  optionalCents: 0,
  oneOffCents: 0,
  incomeCents,
  categoryCents: {},
  debtPaidCents: 0,
  debtReceivedCents: 0,
});

export function buildStatement(input: {
  members: { id: string }[];
  incomes: IncomeCalc[];
  expenses: ExpenseCalc[];
  rules: RuleCalc[];
  month: string;
}): StatementCalc {
  const { members, rules, month } = input;
  // Debt payments are members settling with each other, not the household
  // spending or earning: counting them would let a repaid loan raise someone's
  // income weight, or show the family "spending" money that only changed hands.
  // They are set aside before anything else sees them.
  const expenses = input.expenses.filter((e) => e.expenseType !== 'debt');
  const incomes = input.incomes.filter((i) => !i.debtReceipt);
  const forMonth = expenses.filter((e) => e.month === month);
  const ctx: SplitContext = { rules, incomes, expenses, month };

  const byUser: Record<string, UserSummaryCalc> = Object.fromEntries(
    members.map((u) => [u.id, emptySummary(incomeForMonth(incomes, u.id, month))]),
  );
  const balanceCents: Record<string, number> = Object.fromEntries(
    members.map((u) => [u.id, 0]),
  );

  const lines: StatementLineCalc[] = forMonth.map((e) => {
    const shares = e.shared ? calculateShares(e, ctx) : { [e.userId]: 1 };
    const shareCents = distributeCents(e.amountCents, shares);

    if (byUser[e.userId]) byUser[e.userId].paidCents += e.amountCents;

    for (const [participant, amount] of Object.entries(shareCents)) {
      const target = byUser[participant];
      // A participant who left the family stays on the historical expense, but
      // no longer enters the statement or the month's settlement.
      if (!target) continue;

      target.shareCents += amount;
      if (e.expenseType === 'fixed') target.fixedCents += amount;
      else if (e.expenseType === 'optional') target.optionalCents += amount;
      else target.oneOffCents += amount;
      target.categoryCents[e.category] =
        (target.categoryCents[e.category] ?? 0) + amount;

      if (participant !== e.userId) {
        balanceCents[participant] -= amount;
        balanceCents[e.userId] = (balanceCents[e.userId] ?? 0) + amount;
      }
    }

    return { ...e, shares, shareCents };
  });

  for (const e of input.expenses) {
    if (e.expenseType === 'debt' && e.month === month && byUser[e.userId]) {
      byUser[e.userId].debtPaidCents += e.amountCents;
    }
  }
  for (const i of input.incomes) {
    if (i.debtReceipt && byUser[i.userId]) {
      byUser[i.userId].debtReceivedCents += incomeForMonth([i], i.userId, month);
    }
  }

  return {
    month,
    lines,
    byUser,
    balanceCents,
    transfers: settle(balanceCents),
    monthTotalCents: forMonth.reduce((s, e) => s + e.amountCents, 0),
  };
}

/**
 * The month's settlement: match the biggest debtor with the biggest creditor
 * until everyone is zeroed. Greedy, so it does not guarantee the theoretical
 * minimum number of transfers — but for a family of 2 to 5 people it produces
 * the minimum in practice, and it is predictable to explain to whoever pays.
 */
export function settle(balance: Record<string, number>): TransferCalc[] {
  const debtors = Object.entries(balance)
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ id, v: -v }))
    .sort((a, b) => b.v - a.v || a.id.localeCompare(b.id));
  const creditors = Object.entries(balance)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ id, v }))
    .sort((a, b) => b.v - a.v || a.id.localeCompare(b.id));

  const transfers: TransferCalc[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amountCents = Math.min(debtors[i].v, creditors[j].v);
    if (amountCents > 0) {
      transfers.push({
        from: debtors[i].id,
        to: creditors[j].id,
        amountCents,
      });
    }
    debtors[i].v -= amountCents;
    creditors[j].v -= amountCents;
    if (debtors[i].v === 0) i++;
    if (creditors[j].v === 0) j++;
  }
  return transfers;
}
