import { describe, expect, it, afterEach, vi } from 'vitest';
import { brl, pct, monthLabel, monthLabelCompact, shiftMonth, currentMonth, recurringAppliesToMonth } from '@shared/format';

// toLocaleString separates thousands with a non-breaking space; normalize it.
const norm = (s: string) => s.replace(/ | /g, ' ');

describe('brl', () => {
  it('formats a number as Brazilian currency', () => {
    expect(norm(brl(1234.5))).toBe('R$ 1.234,50');
  });

  it('always shows two decimal places', () => {
    expect(norm(brl(10))).toBe('R$ 10,00');
  });

  it('treats 0, NaN and undefined as zero', () => {
    expect(norm(brl(0))).toBe('R$ 0,00');
    expect(norm(brl(NaN))).toBe('R$ 0,00');
    expect(norm(brl(undefined as unknown as number))).toBe('R$ 0,00');
  });

  it('keeps the sign of a negative value', () => {
    expect(norm(brl(-50))).toBe('-R$ 50,00');
  });
});

describe('pct', () => {
  it('shows one decimal place below 10%', () => {
    expect(pct(0.05)).toBe('5.0%');
    expect(pct(0)).toBe('0.0%');
  });

  it('drops the decimals at 10% or above', () => {
    expect(pct(0.1)).toBe('10%');
    expect(pct(0.128)).toBe('13%');
    expect(pct(1)).toBe('100%');
  });
});

describe('monthLabel', () => {
  it('spells the month in Portuguese', () => {
    expect(monthLabel('2026-09')).toBe('setembro de 2026');
    expect(monthLabel('2026-01')).toBe('janeiro de 2026');
    expect(monthLabel('2025-12')).toBe('dezembro de 2025');
  });
});

describe('monthLabelCompact', () => {
  it('spells the month with a slash instead of "de"', () => {
    expect(monthLabelCompact('2026-09')).toBe('setembro/2026');
    expect(monthLabelCompact('2026-01')).toBe('janeiro/2026');
  });
});

describe('shiftMonth', () => {
  it('moves forward and backward within a year', () => {
    expect(shiftMonth('2026-09', 1)).toBe('2026-10');
    expect(shiftMonth('2026-09', -1)).toBe('2026-08');
  });

  it('crosses the year boundary in both directions', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('returns the same month for a delta of 0', () => {
    expect(shiftMonth('2026-09', 0)).toBe('2026-09');
  });

  it('pads the month to two digits', () => {
    expect(shiftMonth('2026-10', -1)).toBe('2026-09');
  });
});

describe('currentMonth', () => {
  afterEach(() => vi.useRealTimers());

  it('returns the running month as YYYY-MM', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15));
    expect(currentMonth()).toBe('2026-03');
  });
});

describe('recurringAppliesToMonth', () => {
  it('counts the declared month and every month after it, when open-ended', () => {
    expect(recurringAppliesToMonth('2026-08', null, '2026-08')).toBe(true);
    expect(recurringAppliesToMonth('2026-08', null, '2026-09')).toBe(true);
  });

  it('does not count a month before the declared one', () => {
    expect(recurringAppliesToMonth('2026-09', null, '2026-08')).toBe(false);
  });

  it('does not count a month after "until"', () => {
    expect(recurringAppliesToMonth('2026-06', '2026-08', '2026-08')).toBe(true);
    expect(recurringAppliesToMonth('2026-06', '2026-08', '2026-09')).toBe(false);
  });

  it('a single-month recurring has since === until', () => {
    expect(recurringAppliesToMonth('2026-08', '2026-08', '2026-08')).toBe(true);
    expect(recurringAppliesToMonth('2026-08', '2026-08', '2026-07')).toBe(false);
    expect(recurringAppliesToMonth('2026-08', '2026-08', '2026-09')).toBe(false);
  });

  it('treats a missing since/until as no bound on that side', () => {
    expect(recurringAppliesToMonth(null, null, '2020-01')).toBe(true);
    expect(recurringAppliesToMonth(undefined, undefined, '2020-01')).toBe(true);
  });
});
