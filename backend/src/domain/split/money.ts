/**
 * Money is always an integer number of cents inside the calculation engine.
 * A float in a split means a cent lost when settling the month — and in an app
 * where three people divide bills, a lost cent is a real complaint.
 */

export const toCents = (reais: number | string): number => {
  const n = typeof reais === 'string' ? Number(reais) : reais;
  if (!n || !Number.isFinite(n)) return 0;

  // Multiplying by 100 misfires: 1.005 * 100 gives 100.49999999999999 and rounds
  // down. Reinterpreting the decimal representation shifts the point without
  // going through the floating-point error. Sign handled separately so that
  // -1.005 and 1.005 round the same way.
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const decimal = `${abs}`;
  const shifted = decimal.includes('e') ? abs * 100 : Number(`${decimal}e2`);
  return sign * Math.round(shifted);
};

export const toReais = (cents: number): number => cents / 100;

/**
 * Splits `totalCents` among participants by fractions that sum to 1.
 *
 * Uses the largest-remainder method: each one takes the floor of their part and
 * the leftover cents go, one by one, to whoever has the largest remainder.
 * Guarantees the returned shares sum to exactly `totalCents` — never a cent more
 * or less, for any combination of amount and number of people.
 */
export function distributeCents(
  totalCents: number,
  fractions: Record<string, number>,
): Record<string, number> {
  const ids = Object.keys(fractions);
  if (ids.length === 0) return {};

  const sign = totalCents < 0 ? -1 : 1;
  const total = Math.abs(totalCents);

  const raw = ids.map((id) => {
    const exact = total * (fractions[id] ?? 0);
    const floorPart = Math.floor(exact);
    return { id, floorPart, remainder: exact - floorPart };
  });

  let leftover = total - raw.reduce((s, r) => s + r.floorPart, 0);

  // Largest remainder first; ties broken by the larger fraction and then by id,
  // so the result is identical on every recompute of the same month.
  raw.sort(
    (a, b) =>
      b.remainder - a.remainder ||
      (fractions[b.id] ?? 0) - (fractions[a.id] ?? 0) ||
      a.id.localeCompare(b.id),
  );

  const out: Record<string, number> = {};
  for (const r of raw) {
    const extra = leftover > 0 ? 1 : 0;
    leftover -= extra;
    out[r.id] = sign * (r.floorPart + extra);
  }
  return out;
}
