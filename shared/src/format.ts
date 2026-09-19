import { MONTH_NAMES } from './domain';

export const brl = (n: number) =>
  (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const pct = (n: number) => `${(n * 100).toFixed(n * 100 >= 10 ? 0 : 1)}%`;

export const monthLabel = (m: string) => {
  const [year, month] = m.split('-');
  return `${MONTH_NAMES[+month - 1]} de ${year}`;
};

/** Compact form for tight spaces (e.g. a badge) — "agosto/2026" instead of "agosto de 2026". */
export const monthLabelCompact = (m: string) => {
  const [year, month] = m.split('-');
  return `${MONTH_NAMES[+month - 1]}/${year}`;
};

export const shiftMonth = (m: string, delta: number) => {
  const [year, month] = m.split('-').map(Number);
  const dt = new Date(year, month - 1 + delta, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** "YYYY-MM" from an ISO date/datetime string — e.g. an account's createdAt. */
export const monthOf = (iso: string) => iso.slice(0, 7);

/**
 * Whether a recurring income counts for `month` — shared by the backend's
 * split engine and the frontend's own totals so they can never drift apart
 * again (see incomeForMonth in domain/split and Income.tsx's own total).
 * `until` absent means still ongoing (open-ended).
 */
export const recurringAppliesToMonth = (
  since: string | null | undefined,
  until: string | null | undefined,
  month: string,
) => (!since || since <= month) && (!until || until >= month);
