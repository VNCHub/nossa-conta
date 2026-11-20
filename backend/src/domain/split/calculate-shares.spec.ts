import {
  calculateShares,
  incomeForMonth,
  recurringIncome,
  fixedExpenseShare,
} from './calculate-shares';
import type { SplitContext, IncomeCalc, ExpenseCalc, RuleCalc } from './types';

const MONTH = '2026-09';

const incomes: IncomeCalc[] = [
  { userId: 'u1', type: 'fixed', amountCents: 620000 },
  { userId: 'u1', type: 'oneOff', amountCents: 140000, date: '2026-09-18' },
  { userId: 'u2', type: 'fixed', amountCents: 410000 },
  { userId: 'u3', type: 'fixed', amountCents: 330000 },
  { userId: 'u3', type: 'oneOff', amountCents: 85000, date: '2026-08-09' },
];

const expense = (over: Partial<ExpenseCalc> = {}): ExpenseCalc => ({
  id: 'e', userId: 'u1', month: MONTH, category: 'home', expenseType: 'fixed',
  amountCents: 10000, shared: true, participants: ['u1', 'u2'], ruleId: null,
  ...over,
});

const rules: RuleCalc[] = [
  { id: 'r1', type: 'equal' },
  { id: 'r2', type: 'income' },
  { id: 'r3', type: 'surplus' },
  { id: 'r4', type: 'fixed', weights: { u1: 60, u2: 40, u3: 0 } },
  { id: 'r5', type: 'meter', measurements: { '2026-09': { u1: 320, u2: 780, u3: 0 } } },
  { id: 'r6', type: 'meter', measurements: {} },
];

const ctx = (expenses: ExpenseCalc[] = []): SplitContext => ({ rules, incomes, expenses, month: MONTH });
const sum = (o: Record<string, number>) => Object.values(o).reduce((s, v) => s + v, 0);

describe('incomes', () => {
  it('sums recurring every month and one-off only in the month of its date', () => {
    expect(incomeForMonth(incomes, 'u1', MONTH)).toBe(760000);
    expect(incomeForMonth(incomes, 'u3', MONTH)).toBe(330000); // one-off is from August
    expect(incomeForMonth(incomes, 'u3', '2026-08')).toBe(415000);
  });

  it('recurringIncome ignores one-offs', () => {
    expect(recurringIncome(incomes, 'u1', MONTH)).toBe(620000);
  });

  it('a recurring income does not count before its own "since" month', () => {
    const sinceOctober: IncomeCalc[] = [
      { userId: 'u1', type: 'fixed', amountCents: 500000, since: '2026-10' },
    ];
    expect(incomeForMonth(sinceOctober, 'u1', '2026-09')).toBe(0);
    expect(incomeForMonth(sinceOctober, 'u1', '2026-10')).toBe(500000);
    expect(incomeForMonth(sinceOctober, 'u1', '2026-11')).toBe(500000);
    expect(recurringIncome(sinceOctober, 'u1', '2026-09')).toBe(0);
    expect(recurringIncome(sinceOctober, 'u1', '2026-10')).toBe(500000);
  });

  it('a recurring income with an "until" stops counting after that month', () => {
    const endedInAugust: IncomeCalc[] = [
      { userId: 'u1', type: 'fixed', amountCents: 500000, since: '2026-06', until: '2026-08' },
    ];
    expect(incomeForMonth(endedInAugust, 'u1', '2026-07')).toBe(500000);
    expect(incomeForMonth(endedInAugust, 'u1', '2026-08')).toBe(500000);
    expect(incomeForMonth(endedInAugust, 'u1', '2026-09')).toBe(0);
    expect(recurringIncome(endedInAugust, 'u1', '2026-08')).toBe(500000);
    expect(recurringIncome(endedInAugust, 'u1', '2026-09')).toBe(0);
  });

  it('a single-month recurring (since === until) only counts that one month', () => {
    const augustOnly: IncomeCalc[] = [
      { userId: 'u1', type: 'fixed', amountCents: 500000, since: '2026-08', until: '2026-08' },
    ];
    expect(incomeForMonth(augustOnly, 'u1', '2026-07')).toBe(0);
    expect(incomeForMonth(augustOnly, 'u1', '2026-08')).toBe(500000);
    expect(incomeForMonth(augustOnly, 'u1', '2026-09')).toBe(0);
  });
});

describe('fixedExpenseShare', () => {
  const share = (expenses: ExpenseCalc[], user = 'u1') => fixedExpenseShare(ctx(expenses), user);

  it('counts only fixed expenses from the month', () => {
    const expenses = [
      expense({ userId: 'u1', shared: false, expenseType: 'fixed', amountCents: 12900 }),
      expense({ userId: 'u1', shared: false, expenseType: 'oneOff', amountCents: 24900 }),
      expense({ userId: 'u1', shared: false, expenseType: 'fixed', amountCents: 5000, month: '2026-08' }),
    ];
    expect(share(expenses)).toBe(12900);
  });

  it('a non-shared fixed expense weighs entirely on whoever entered it', () => {
    const expenses = [expense({ userId: 'u2', shared: false, amountCents: 30000 })];
    expect(share(expenses, 'u2')).toBe(30000);
    expect(share(expenses, 'u1')).toBe(0);
  });

  it('a fixed expense split onto a single other member weighs on that member, not the one who entered it', () => {
    const expenses = [expense({ userId: 'u1', participants: ['u2'], ruleId: 'r3', amountCents: 300000 })];
    expect(share(expenses, 'u2')).toBe(300000);
    expect(share(expenses, 'u1')).toBe(0);
  });

  it('a fixed expense split onto only the one who entered it still weighs on them', () => {
    const expenses = [expense({ userId: 'u1', participants: ['u1'], ruleId: 'r3', amountCents: 300000 })];
    expect(share(expenses, 'u1')).toBe(300000);
  });

  it('a fixed expense split by a rule that does not depend on the surplus counts each one\'s share', () => {
    const equal = [expense({ participants: ['u1', 'u2', 'u3'], ruleId: 'r1', amountCents: 10000 })];
    // 10000 / 3: the leftover cent goes to one member, and the three shares close the total.
    const shares = ['u1', 'u2', 'u3'].map((u) => share(equal, u));
    expect(shares.sort()).toEqual([3333, 3333, 3334]);

    const fixed = [expense({ participants: ['u1', 'u2'], ruleId: 'r4', amountCents: 100000 })];
    expect(share(fixed, 'u1')).toBe(60000);
    expect(share(fixed, 'u2')).toBe(40000);

    const income = [expense({ participants: ['u1', 'u2'], ruleId: 'r2', amountCents: 103000 })];
    expect(share(income, 'u1')).toBe(62000);
    expect(share(income, 'u2')).toBe(41000);
  });

  it('a fixed expense split among several by the surplus rule itself is left out (circular)', () => {
    const expenses = [expense({ participants: ['u1', 'u2'], ruleId: 'r3', amountCents: 240000 })];
    expect(share(expenses, 'u1')).toBe(0);
    expect(share(expenses, 'u2')).toBe(0);
  });
});

describe('calculateShares — the 5 split bases', () => {
  it('equal: equal parts among participants', () => {
    const s = calculateShares(expense({ ruleId: 'r1', participants: ['u1', 'u2', 'u3'] }), ctx());
    expect(s).toEqual({ u1: 1 / 3, u2: 1 / 3, u3: 1 / 3 });
  });

  it('income: proportional to recurring income, ignoring the one-off', () => {
    const s = calculateShares(expense({ ruleId: 'r2', participants: ['u1', 'u2'] }), ctx());
    expect(s.u1).toBeCloseTo(620000 / 1030000, 10);
    expect(s.u2).toBeCloseTo(410000 / 1030000, 10);
    expect(sum(s)).toBeCloseTo(1, 10);
  });

  it('surplus: recurring income minus the individual fixed expenses of the month', () => {
    const expenses = [
      expense({ userId: 'u1', shared: false, expenseType: 'fixed', amountCents: 120000 }),
      expense({ userId: 'u2', shared: false, expenseType: 'fixed', amountCents: 10000 }),
    ];
    const s = calculateShares(expense({ ruleId: 'r3', participants: ['u1', 'u2'] }), ctx(expenses));
    expect(s.u1).toBeCloseTo(500000 / 900000, 10);
    expect(s.u2).toBeCloseTo(400000 / 900000, 10);
  });

  it('surplus: a fixed expense split among several by the surplus rule does NOT enter the base (avoids a share that depends on itself)', () => {
    const shared = [
      expense({ userId: 'u1', shared: true, expenseType: 'fixed', amountCents: 240000, ruleId: 'r3' }),
    ];
    const withNothing = calculateShares(expense({ ruleId: 'r3', participants: ['u1', 'u2'] }), ctx());
    const withShared = calculateShares(
      expense({ ruleId: 'r3', participants: ['u1', 'u2'] }), ctx(shared),
    );
    expect(withShared).toEqual(withNothing);
  });

  it('surplus: a fixed expense entered by u1 but split only onto u2 lowers u2\'s surplus', () => {
    const rent = [expense({ userId: 'u1', participants: ['u2'], ruleId: 'r3', amountCents: 300000 })];
    const enteredByU2 = [expense({ userId: 'u2', shared: false, amountCents: 300000 })];
    const s = calculateShares(expense({ ruleId: 'r3', participants: ['u1', 'u2'] }), ctx(rent));
    // u1 620000, u2 410000 − 300000 = 110000.
    expect(s.u1).toBeCloseTo(620000 / 730000, 10);
    expect(s.u2).toBeCloseTo(110000 / 730000, 10);
    // Same result as if u2 had entered the rent themself: who entered it doesn't matter.
    expect(s).toEqual(calculateShares(expense({ ruleId: 'r3', participants: ['u1', 'u2'] }), ctx(enteredByU2)));
  });

  it('surplus: never produces a negative weight when the fixed part exceeds income', () => {
    const expenses = [
      expense({ userId: 'u1', shared: false, expenseType: 'fixed', amountCents: 900000 }),
    ];
    const s = calculateShares(expense({ ruleId: 'r3', participants: ['u1', 'u2'] }), ctx(expenses));
    expect(s.u1).toBe(0);
    expect(s.u2).toBe(1);
  });

  it('fixed: uses the agreed percentages, normalized among participants', () => {
    const s = calculateShares(expense({ ruleId: 'r4', participants: ['u1', 'u2'] }), ctx());
    expect(s.u1).toBeCloseTo(0.6, 10);
    expect(s.u2).toBeCloseTo(0.4, 10);
  });

  it('fixed: renormalizes when one of the agreed shares falls outside the expense', () => {
    // u1=60 and u3=0 participate; sum 60 → u1 takes everything.
    const s = calculateShares(expense({ ruleId: 'r4', participants: ['u1', 'u3'] }), ctx());
    expect(s).toEqual({ u1: 1, u3: 0 });
  });

  it('meter: converts the month measurement into a percentage', () => {
    const s = calculateShares(expense({ ruleId: 'r5', participants: ['u1', 'u2'] }), ctx());
    expect(s.u1).toBeCloseTo(320 / 1100, 10);
    expect(s.u2).toBeCloseTo(780 / 1100, 10);
  });

  it('meter: with no measurement for the month, falls back to equal parts', () => {
    const s = calculateShares(expense({ ruleId: 'r6', participants: ['u1', 'u2'] }), ctx());
    expect(s).toEqual({ u1: 0.5, u2: 0.5 });
  });

  it('a nonexistent rule falls back to equal parts', () => {
    const s = calculateShares(expense({ ruleId: 'does-not-exist', participants: ['u1', 'u2'] }), ctx());
    expect(s).toEqual({ u1: 0.5, u2: 0.5 });
  });

  it('with no participants, the whole share belongs to whoever paid', () => {
    const s = calculateShares(expense({ ruleId: 'r1', participants: [] }), ctx());
    expect(s).toEqual({ u1: 1 });
  });

  it('every split base returns fractions that sum to 1', () => {
    for (const r of rules) {
      const s = calculateShares(expense({ ruleId: r.id, participants: ['u1', 'u2', 'u3'] }), ctx());
      expect(sum(s)).toBeCloseTo(1, 10);
    }
  });
});
