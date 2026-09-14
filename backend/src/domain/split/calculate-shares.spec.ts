import {
  calculateShares,
  incomeForMonth,
  recurringIncome,
  individualFixedExpenses,
} from './calculate-shares';
import type { SplitContext, IncomeCalc, ExpenseCalc, RuleCalc } from './types';

const MONTH = '2026-09';

const incomes: IncomeCalc[] = [
  { userId: 'u1', type: 'recurring', amountCents: 620000 },
  { userId: 'u1', type: 'oneOff', amountCents: 140000, date: '2026-09-18' },
  { userId: 'u2', type: 'recurring', amountCents: 410000 },
  { userId: 'u3', type: 'recurring', amountCents: 330000 },
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
      { userId: 'u1', type: 'recurring', amountCents: 500000, since: '2026-10' },
    ];
    expect(incomeForMonth(sinceOctober, 'u1', '2026-09')).toBe(0);
    expect(incomeForMonth(sinceOctober, 'u1', '2026-10')).toBe(500000);
    expect(incomeForMonth(sinceOctober, 'u1', '2026-11')).toBe(500000);
    expect(recurringIncome(sinceOctober, 'u1', '2026-09')).toBe(0);
    expect(recurringIncome(sinceOctober, 'u1', '2026-10')).toBe(500000);
  });
});

describe('individualFixedExpenses', () => {
  it('counts only fixed, individual expenses from the month', () => {
    const expenses = [
      expense({ userId: 'u1', shared: false, expenseType: 'fixed', amountCents: 12900 }),
      expense({ userId: 'u1', shared: false, expenseType: 'optional', amountCents: 24900 }),
      expense({ userId: 'u1', shared: true, expenseType: 'fixed', amountCents: 240000 }),
      expense({ userId: 'u1', shared: false, expenseType: 'fixed', amountCents: 5000, month: '2026-08' }),
    ];
    expect(individualFixedExpenses(expenses, 'u1', MONTH)).toBe(12900);
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

  it('surplus: a shared expense does NOT enter the base (avoids a share that depends on itself)', () => {
    const shared = [
      expense({ userId: 'u1', shared: true, expenseType: 'fixed', amountCents: 240000 }),
    ];
    const withNothing = calculateShares(expense({ ruleId: 'r3', participants: ['u1', 'u2'] }), ctx());
    const withShared = calculateShares(
      expense({ ruleId: 'r3', participants: ['u1', 'u2'] }), ctx(shared),
    );
    expect(withShared).toEqual(withNothing);
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
