import type { IncomeDTO } from '@shared/contracts';
import { monthLabelShort, recurringAppliesToMonth } from '@shared/format';

/**
 * The day an income lands on in `month` (YYYY-MM-DD). A recurring entry declared
 * for day 31 still has to land somewhere in a 30-day month, so it clamps to the
 * last day instead of spilling into the next one.
 */
export function incomeDateInMonth(item: IncomeDTO, month: string): string {
  if (item.type === 'oneOff') return (item.date ?? '').slice(0, 10);
  const [year, mon] = month.split('-').map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const day = Math.min(Math.max(item.dayOfMonth ?? 1, 1), lastDay);
  return `${month}-${String(day).padStart(2, '0')}`;
}

export type Repeats =
  | { kind: 'yes'; label: string }
  | { kind: 'until'; label: string }
  | { kind: 'no'; label: string }
  | { kind: 'na'; label: string };

/** Whether the entry carries on after `month` — the question the "Repete" column answers. */
export function repeatsAfter(item: IncomeDTO, month: string): Repeats {
  if (item.type === 'oneOff') return { kind: 'na', label: '—' };
  if (!item.until) return { kind: 'yes', label: 'Sim' };
  if (item.until > month) return { kind: 'until', label: `Até ${monthLabelShort(item.until)}` };
  return { kind: 'no', label: 'Não' };
}

/** Entries that count in `month`, in calendar order (description breaks ties). */
export function incomesOfMonth(incomes: IncomeDTO[], month: string) {
  return incomes
    .filter((i) =>
      i.type === 'recurring'
        ? recurringAppliesToMonth(i.since, i.until, month)
        : (i.date ?? '').slice(0, 7) === month,
    )
    .map((item) => ({ item, date: incomeDateInMonth(item, month) }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.item.description.localeCompare(b.item.description, 'pt-BR'));
}
