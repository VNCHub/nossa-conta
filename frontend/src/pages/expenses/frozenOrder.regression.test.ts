import { describe, expect, it } from 'vitest';
import { compareDefault, rememberCompleteness } from './frozenOrder';

const row = (id: string, date: string, complete: boolean) => ({ id, date, complete });
const order = (frozen: Map<string, boolean>, rows: ReturnType<typeof row>[]) =>
  [...rows].sort((a, b) => compareDefault(frozen, a, b)).map((r) => r.id);

describe('default expense order while editing (#47)', () => {
  it('keeps a row in place when it becomes complete', () => {
    const frozen = new Map<string, boolean>();
    const before = [
      row('a', '2026-11-01', false),
      row('b', '2026-11-02', false),
      row('c', '2026-11-03', true),
    ];
    rememberCompleteness(frozen, before);
    expect(order(frozen, before)).toEqual(['a', 'b', 'c']);

    const after = [row('a', '2026-11-01', true), before[1], before[2]];
    rememberCompleteness(frozen, after);
    expect(order(frozen, after)).toEqual(['a', 'b', 'c']);
  });

  it('places a new row by its own completeness', () => {
    const frozen = new Map<string, boolean>();
    const rows = [row('a', '2026-11-01', true)];
    rememberCompleteness(frozen, rows);
    const next = [...rows, row('n', '2026-11-09', false)];
    rememberCompleteness(frozen, next);
    expect(order(frozen, next)).toEqual(['n', 'a']);
  });
});
