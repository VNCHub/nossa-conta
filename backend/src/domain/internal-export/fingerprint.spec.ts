import { expenseKeyOf } from './fingerprint';
import type { InternalExpenseEntry } from './types';

const entry: InternalExpenseEntry = {
  date: '2026-08-03',
  description: 'Mercado',
  amount: 154.9,
  category: 'food',
  expenseType: 'optional',
  paymentMethod: 'Pix',
};

describe('expenseKeyOf', () => {
  it('is stable for the same content, independent of any row id — it must survive re-export from an intermediate environment', () => {
    expect(expenseKeyOf({ ...entry })).toBe(expenseKeyOf({ ...entry }));
  });

  it('changes when the description, amount, date, category, type or payment method differ', () => {
    const base = expenseKeyOf(entry);
    expect(expenseKeyOf({ ...entry, description: 'Farmácia' })).not.toBe(base);
    expect(expenseKeyOf({ ...entry, amount: 154.91 })).not.toBe(base);
    expect(expenseKeyOf({ ...entry, date: '2026-08-04' })).not.toBe(base);
    expect(expenseKeyOf({ ...entry, category: 'home' })).not.toBe(base);
    expect(expenseKeyOf({ ...entry, expenseType: 'fixed' })).not.toBe(base);
    expect(expenseKeyOf({ ...entry, paymentMethod: 'Débito' })).not.toBe(base);
  });

  it('is insensitive to surrounding whitespace in the description', () => {
    expect(expenseKeyOf({ ...entry, description: '  Mercado  ' })).toBe(expenseKeyOf(entry));
  });
});
