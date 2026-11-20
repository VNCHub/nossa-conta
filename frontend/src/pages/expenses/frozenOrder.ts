import type { ExpenseDTO } from '@shared';

type Row = Pick<ExpenseDTO, 'id' | 'complete' | 'date'>;

// Completing a row mid-edit would otherwise move it out of the pending block
// under the user's cursor. The first-seen `complete` value of each row is kept
// for ordering, so rows only change group when the page is reloaded.
export function rememberCompleteness(frozen: Map<string, boolean>, rows: Row[]) {
  for (const r of rows) if (!frozen.has(r.id)) frozen.set(r.id, r.complete);
}

export function compareDefault(frozen: Map<string, boolean>, a: Row, b: Row) {
  const ca = frozen.get(a.id) ?? a.complete;
  const cb = frozen.get(b.id) ?? b.complete;
  if (ca !== cb) return ca ? 1 : -1;
  return a.date.localeCompare(b.date);
}
