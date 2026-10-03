import { createHash } from 'node:crypto';
import { toCents, toReais } from '../split';
import type { ExpenseSeed } from './types';

// Nubank appends " - Parcela N/M" to the merchant name, so two installments of
// one purchase never share a description (and their amounts can differ by a
// few cents) — the suffix has to be peeled off before comparing.
const INSTALLMENT_RE = /^(.*?)\s*-\s*parcela\s+(\d+)\/(\d+)\s*$/i;

export type MergeGroupKind = 'sameDescription' | 'installments';

export interface MergeGroup {
  /** stable across analysis and import: derived from the members' importKeys */
  id: string;
  kind: MergeGroupKind;
  /** merchant name without the installment suffix */
  title: string;
  /** YYYY-MM */
  month: string;
  members: ExpenseSeed[];
  merged: ExpenseSeed;
}

const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
const hashOf = (keys: string[]) =>
  createHash('sha256').update([...keys].sort().join('|')).digest('hex');

export function installmentOf(description: string): { base: string; number: number; total: number } | null {
  const m = INSTALLMENT_RE.exec(description.trim());
  return m ? { base: m[1].trim(), number: Number(m[2]), total: Number(m[3]) } : null;
}

/**
 * Expenses that look like the same spending showing up more than once in one
 * month: same description, or installments of the same purchase (same
 * merchant, same installment total). Different months never group — a monthly
 * subscription is not a duplicate of itself. Nothing is merged here; the user
 * decides group by group.
 */
export function findMergeGroups(expenses: ExpenseSeed[]): MergeGroup[] {
  const buckets = new Map<string, { kind: MergeGroupKind; title: string; items: ExpenseSeed[] }>();

  for (const e of expenses) {
    const inst = installmentOf(e.description);
    const month = e.date.slice(0, 7);
    const kind: MergeGroupKind = inst ? 'installments' : 'sameDescription';
    const title = inst ? inst.base : e.description.trim();
    const key = `${kind}|${month}|${normalize(title)}|${inst?.total ?? ''}`;
    const bucket = buckets.get(key) ?? { kind, title, items: [] };
    bucket.items.push(e);
    buckets.set(key, bucket);
  }

  return [...buckets.values()]
    .filter((b) => b.items.length > 1)
    .map((b) => {
      const members = [...b.items].sort((a, c) => a.date.localeCompare(c.date));
      const keys = members.map((m) => m.importKey);
      return {
        id: hashOf(keys).slice(0, 16),
        kind: b.kind,
        title: b.title,
        month: members[0].date.slice(0, 7),
        members,
        merged: mergeSeed(b.kind, b.title, members),
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month) || a.title.localeCompare(b.title));
}

/** One expense standing for the whole group: amounts add up, the date is the latest one. */
function mergeSeed(kind: MergeGroupKind, title: string, members: ExpenseSeed[]): ExpenseSeed {
  const methods = new Set(members.map((m) => m.paymentMethod));
  return {
    date: members[members.length - 1].date,
    description: kind === 'installments' ? installmentsLabel(title, members) : members[0].description,
    amount: toReais(members.reduce((sum, m) => sum + toCents(m.amount), 0)),
    paymentMethod: methods.size === 1 ? members[0].paymentMethod : null,
    importKey: `merge:${hashOf(members.map((m) => m.importKey))}`,
  };
}

function installmentsLabel(base: string, members: ExpenseSeed[]): string {
  const parsed = members.map((m) => installmentOf(m.description)!);
  const numbers = [...new Set(parsed.map((p) => p.number))].sort((a, b) => a - b);
  // The very same installment charged twice: nothing to relabel.
  if (numbers.length === 1) return members[0].description;
  const list =
    numbers.length === 2
      ? `${numbers[0]} e ${numbers[1]}`
      : `${numbers.slice(0, -1).join(', ')} e ${numbers[numbers.length - 1]}`;
  return `${base} - Parcelas ${list}/${parsed[0].total}`;
}
