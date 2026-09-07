import { settle, buildStatement } from './build-statement';
import type { IncomeCalc, ExpenseCalc, RuleCalc } from './types';

const MONTH = '2026-09';
const members = [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }];

const e = (
  userId: string, expenseType: 'fixed' | 'optional', category: string,
  amountCents: number, shared: boolean, participants: string[], ruleId: string | null,
  month = MONTH,
): ExpenseCalc => ({
  id: `e${Math.random()}`, userId, month, category, expenseType,
  amountCents, shared, participants, ruleId,
});

const rules: RuleCalc[] = [
  { id: 'r1', type: 'equal' },
  { id: 'r2', type: 'income' },
  { id: 'r4', type: 'fixed', weights: { u1: 60, u2: 40, u3: 0 } },
  { id: 'r5', type: 'meter', measurements: { '2026-09': { u1: 320, u2: 780, u3: 0 } } },
];

const incomes: IncomeCalc[] = [
  { userId: 'u1', type: 'recurring', amountCents: 620000 },
  { userId: 'u1', type: 'oneOff', amountCents: 140000, date: '2026-09-18' },
  { userId: 'u2', type: 'recurring', amountCents: 410000 },
  { userId: 'u2', type: 'recurring', amountCents: 70000 },
  { userId: 'u3', type: 'recurring', amountCents: 330000 },
];

describe('buildStatement — worked examples', () => {
  it('R$ 100 paid by u1 and split half and half: u2 owes R$ 50', () => {
    const r = buildStatement({
      members: members.slice(0, 2), incomes: [], rules, month: MONTH,
      expenses: [e('u1', 'fixed', 'home', 10000, true, ['u1', 'u2'], 'r1')],
    });
    expect(r.byUser.u1.paidCents).toBe(10000);
    expect(r.byUser.u1.shareCents).toBe(5000);
    expect(r.byUser.u2.shareCents).toBe(5000);
    expect(r.transfers).toEqual([{ from: 'u2', to: 'u1', amountCents: 5000 }]);
  });

  it('R$ 100 split three ways: shares close 10000 cents and the settlement zeroes out', () => {
    const r = buildStatement({
      members, incomes: [], rules, month: MONTH,
      expenses: [e('u1', 'fixed', 'home', 10000, true, ['u1', 'u2', 'u3'], 'r1')],
    });
    const shares = Object.values(r.byUser).map((u) => u.shareCents).sort();
    expect(shares).toEqual([3333, 3333, 3334]);
    expect(shares.reduce((s, v) => s + v, 0)).toBe(10000);
    expect(r.transfers).toEqual([
      { from: 'u2', to: 'u1', amountCents: 3333 },
      { from: 'u3', to: 'u1', amountCents: 3333 },
    ]);
  });

  it('an individual expense generates no settlement and goes only to the share of whoever paid', () => {
    const r = buildStatement({
      members, incomes: [], rules, month: MONTH,
      expenses: [e('u3', 'optional', 'games', 24900, false, [], null)],
    });
    expect(r.byUser.u3.shareCents).toBe(24900);
    expect(r.byUser.u3.optionalCents).toBe(24900);
    expect(r.byUser.u1.shareCents).toBe(0);
    expect(r.transfers).toEqual([]);
  });

  it('only the expenses of the queried month enter the statement', () => {
    const r = buildStatement({
      members, incomes: [], rules, month: MONTH,
      expenses: [
        e('u1', 'fixed', 'home', 10000, false, [], null),
        e('u1', 'fixed', 'home', 99900, false, [], null, '2026-08'),
      ],
    });
    expect(r.monthTotalCents).toBe(10000);
    expect(r.lines).toHaveLength(1);
  });

  it('a participant who left the family does not break the statement', () => {
    const r = buildStatement({
      members: members.slice(0, 2), incomes: [], rules, month: MONTH,
      expenses: [e('u1', 'fixed', 'home', 30000, true, ['u1', 'u2', 'u3'], 'r1')],
    });
    // u3's share exists on the line, but does not count in balance or summary.
    expect(r.lines[0].shareCents.u3).toBe(10000);
    expect(r.byUser.u3).toBeUndefined();
    expect(r.balanceCents.u3).toBeUndefined();
    expect(r.transfers).toEqual([{ from: 'u2', to: 'u1', amountCents: 10000 }]);
  });
});

describe('buildStatement — invariants over a full month', () => {
  const expenses = [
    e('u1', 'fixed', 'home', 240000, true, ['u1', 'u2', 'u3'], 'r2'),
    e('u1', 'fixed', 'home', 28500, true, ['u1', 'u2', 'u3'], 'r1'),
    e('u2', 'fixed', 'home', 12990, true, ['u1', 'u2', 'u3'], 'r1'),
    e('u2', 'fixed', 'food', 94000, true, ['u1', 'u2', 'u3'], 'r1'),
    e('u1', 'fixed', 'car', 89000, true, ['u1', 'u2'], 'r4'),
    e('u2', 'fixed', 'car', 32000, true, ['u1', 'u2'], 'r5'),
    e('u1', 'optional', 'subscriptions', 5590, true, ['u1', 'u2', 'u3'], 'r1'),
    e('u3', 'fixed', 'pets', 21000, true, ['u1', 'u2', 'u3'], 'r1'),
    e('u1', 'optional', 'games', 24900, false, [], null),
    e('u2', 'optional', 'outing', 31000, true, ['u1', 'u2'], 'r1'),
    e('u3', 'optional', 'food', 8750, false, [], null),
    e('u1', 'fixed', 'subscriptions', 12900, false, [], null),
  ];
  const r = buildStatement({ members, incomes, expenses, rules, month: MONTH });

  it('the sum of an expense\'s shares is exactly the expense amount', () => {
    for (const line of r.lines) {
      const shareSum = Object.values(line.shareCents).reduce((s, v) => s + v, 0);
      expect(shareSum).toBe(line.amountCents);
    }
  });

  it('the sum of all shares is the month total — no cent created or lost', () => {
    const totalShares = Object.values(r.byUser).reduce((s, u) => s + u.shareCents, 0);
    expect(totalShares).toBe(r.monthTotalCents);
    expect(r.monthTotalCents).toBe(expenses.reduce((s, x) => s + x.amountCents, 0));
  });

  it('what left the pocket minus the share is exactly each person\'s balance', () => {
    for (const u of members) {
      const { paidCents, shareCents } = r.byUser[u.id];
      expect(r.balanceCents[u.id]).toBe(paidCents - shareCents);
    }
  });

  it('the balances sum to zero: what some owe is what the others are owed', () => {
    expect(Object.values(r.balanceCents).reduce((s, v) => s + v, 0)).toBe(0);
  });

  it('fixed + optional reconstructs the share, and the categories too', () => {
    for (const u of members) {
      const d = r.byUser[u.id];
      expect(d.fixedCents + d.optionalCents).toBe(d.shareCents);
      const perCategory = Object.values(d.categoryCents).reduce((s, v) => s + v, 0);
      expect(perCategory).toBe(d.shareCents);
    }
  });

  it('the transfers settle everyone and do not exceed n-1', () => {
    const effect: Record<string, number> = { u1: 0, u2: 0, u3: 0 };
    for (const t of r.transfers) {
      effect[t.from] += t.amountCents;
      effect[t.to] -= t.amountCents;
      expect(t.amountCents).toBeGreaterThan(0);
    }
    for (const u of members) expect(r.balanceCents[u.id] + effect[u.id]).toBe(0);
    expect(r.transfers.length).toBeLessThanOrEqual(members.length - 1);
  });

  it('the month income sums recurring + one-off of the same month', () => {
    expect(r.byUser.u1.incomeCents).toBe(760000);
    expect(r.byUser.u2.incomeCents).toBe(480000);
    expect(r.byUser.u3.incomeCents).toBe(330000);
  });
});

describe('settle', () => {
  it('generates no transfer when nobody owes anything', () => {
    expect(settle({ u1: 0, u2: 0 })).toEqual([]);
  });

  it('settles one debtor against several creditors', () => {
    expect(settle({ u1: -10000, u2: 6000, u3: 4000 })).toEqual([
      { from: 'u1', to: 'u2', amountCents: 6000 },
      { from: 'u1', to: 'u3', amountCents: 4000 },
    ]);
  });
});
