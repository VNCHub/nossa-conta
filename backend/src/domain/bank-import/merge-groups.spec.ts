import { findMergeGroups, installmentOf } from './merge-groups';
import type { ExpenseSeed } from './types';

const seed = (date: string, description: string, amount: number): ExpenseSeed => ({
  date,
  description,
  amount,
  paymentMethod: 'Crédito',
  importKey: `${date}|${description}|${amount}`,
});

describe('installmentOf', () => {
  it('splits the Nubank suffix from the merchant', () => {
    expect(installmentOf('Mp *Mercadolivre - Parcela 2/6')).toEqual({ base: 'Mp *Mercadolivre', number: 2, total: 6 });
  });
  it('returns null when there is no suffix', () => {
    expect(installmentOf('Pag*Steam')).toBeNull();
  });
});

describe('findMergeGroups', () => {
  it('groups same-description expenses of the same month and sums them without float drift', () => {
    const [g] = findMergeGroups([
      seed('2026-07-21', 'Decathlon', 299.99),
      seed('2026-07-21', 'Decathlon', 63.99),
      seed('2026-07-22', 'Outra loja', 10),
    ]);
    expect(g.kind).toBe('sameDescription');
    expect(g.merged).toMatchObject({ description: 'Decathlon', amount: 363.98, date: '2026-07-21' });
    expect(g.members).toHaveLength(2);
  });

  it('does not group the same description across months', () => {
    expect(findMergeGroups([seed('2026-07-23', 'Mp *Melimais', 39.9), seed('2026-08-22', 'Mp *Melimais', 39.9)])).toEqual([]);
  });

  it('groups installments of one purchase in a month even though description and amount differ', () => {
    const [g] = findMergeGroups([
      seed('2026-08-04', 'Mp *Mercadolivre - Parcela 1/6', 32.22),
      seed('2026-08-15', 'Mp *Mercadolivre - Parcela 2/6', 32.17),
    ]);
    expect(g.kind).toBe('installments');
    expect(g.merged).toMatchObject({
      description: 'Mp *Mercadolivre - Parcelas 1 e 2/6',
      amount: 64.39,
      date: '2026-08-15',
    });
  });

  it('keeps installments of different totals apart', () => {
    expect(findMergeGroups([seed('2026-08-04', 'Loja - Parcela 1/6', 10), seed('2026-08-05', 'Loja - Parcela 2/3', 10)])).toEqual([]);
  });

  it('keeps the original description when the same installment appears twice', () => {
    const [g] = findMergeGroups([seed('2026-08-04', 'Loja - Parcela 2/6', 10), seed('2026-08-20', 'Loja - Parcela 2/6', 10.5)]);
    expect(g.merged.description).toBe('Loja - Parcela 2/6');
  });

  it('gives the group an id that does not depend on input order', () => {
    const a = seed('2026-07-21', 'Decathlon', 299.99);
    const b = seed('2026-07-21', 'Decathlon', 63.99);
    expect(findMergeGroups([a, b])[0].id).toBe(findMergeGroups([b, a])[0].id);
  });
});
