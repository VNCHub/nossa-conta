import { distributeCents, toCents, toReais } from './money';

const sum = (o: Record<string, number>) => Object.values(o).reduce((s, v) => s + v, 0);

describe('toCents', () => {
  it('converts reais to an integer number of cents', () => {
    expect(toCents(129.9)).toBe(12990);
    expect(toCents('0.1')).toBe(10);
    expect(toCents(0)).toBe(0);
  });

  it('does not lose a cent to the binary representation of floats', () => {
    // 1.005 * 100 gives 100.49999... as a float; Math.round protects against it.
    expect(toCents(1.005)).toBe(101);
    expect(toCents(8.7)).toBe(870);
    expect(toReais(12990)).toBe(129.9);
  });
});

describe('distributeCents', () => {
  it('closes exactly the total for R$ 100.00 split three ways', () => {
    const shares = distributeCents(10000, { a: 1 / 3, b: 1 / 3, c: 1 / 3 });
    expect(sum(shares)).toBe(10000);
    expect(Object.values(shares).sort()).toEqual([3333, 3333, 3334]);
  });

  it('closes the total for any amount between 1 and 2000 cents, across 2 to 5 people', () => {
    for (let people = 2; people <= 5; people++) {
      const fractions = Object.fromEntries(
        Array.from({ length: people }, (_, i) => [`u${i}`, 1 / people]),
      );
      for (let total = 1; total <= 2000; total++) {
        expect(sum(distributeCents(total, fractions))).toBe(total);
      }
    }
  });

  it('closes the total with irregular fractions', () => {
    const shares = distributeCents(28590, { a: 0.4137, b: 0.2931, c: 0.2932 });
    expect(sum(shares)).toBe(28590);
  });

  it('gives the leftover cent to whoever has the largest remainder', () => {
    const shares = distributeCents(10, { a: 0.5, b: 0.25, c: 0.25 });
    expect(shares).toEqual({ a: 5, b: 3, c: 2 });
    expect(sum(shares)).toBe(10);
  });

  it('is deterministic: the same month recomputed gives the same result', () => {
    const fractions = { zeca: 1 / 3, ana: 1 / 3, bia: 1 / 3 };
    const first = distributeCents(10000, fractions);
    for (let i = 0; i < 20; i++) {
      expect(distributeCents(10000, fractions)).toEqual(first);
    }
  });

  it('returns an empty object with no participants', () => {
    expect(distributeCents(1000, {})).toEqual({});
  });
});
