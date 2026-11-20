import { describe, expect, it } from 'vitest';
import type { IncomeDTO } from '@shared/contracts';
import { incomeDateInMonth, incomesOfMonth, repeatsAfter } from './incomeRows';

const base: IncomeDTO = {
  id: 'x',
  userId: 'u',
  type: 'fixed',
  description: 'Salário',
  amount: 1000,
  dayOfMonth: 5,
  since: '2026-01',
  until: null,
  date: null,
  source: 'manual',
  importedFileId: null,
  debtPaymentId: null,
};
const recurring = (o: Partial<IncomeDTO> = {}): IncomeDTO => ({ ...base, ...o });
const oneOff = (o: Partial<IncomeDTO> = {}): IncomeDTO => ({
  ...base, type: 'oneOff', dayOfMonth: null, since: null, date: '2026-11-12', ...o,
});

describe('incomeDateInMonth', () => {
  it('places a recurring entry on its day within the viewed month', () => {
    expect(incomeDateInMonth(recurring(), '2026-11')).toBe('2026-11-05');
  });

  it('clamps a day past the end of the month to its last day', () => {
    expect(incomeDateInMonth(recurring({ dayOfMonth: 31 }), '2026-11')).toBe('2026-11-30');
    expect(incomeDateInMonth(recurring({ dayOfMonth: 31 }), '2027-02')).toBe('2027-02-28');
  });

  it('uses the one-off date as is', () => {
    expect(incomeDateInMonth(oneOff(), '2026-11')).toBe('2026-11-12');
  });
});

describe('repeatsAfter', () => {
  it('says "Sim" for a recurring entry with no end', () => {
    expect(repeatsAfter(recurring(), '2026-11')).toEqual({ kind: 'yes', label: 'Sim' });
  });

  it('names the last month when it ends after the viewed one', () => {
    expect(repeatsAfter(recurring({ until: '2027-03' }), '2026-11')).toEqual({ kind: 'until', label: 'Até Mar/2027' });
  });

  it('says "Não" when it ends in the viewed month', () => {
    expect(repeatsAfter(recurring({ since: '2026-11', until: '2026-11' }), '2026-11')).toEqual({ kind: 'no', label: 'Não' });
  });

  it('shows a dash for one-offs', () => {
    expect(repeatsAfter(oneOff(), '2026-11')).toEqual({ kind: 'na', label: '—' });
  });
});

describe('incomesOfMonth', () => {
  it('merges both kinds of the month in date order and leaves the rest out', () => {
    const rows = incomesOfMonth(
      [
        oneOff({ id: 'freela', description: 'Freela', date: '2026-11-12' }),
        recurring({ id: 'aluguel', description: 'Aluguel', dayOfMonth: 10 }),
        recurring({ id: 'salario' }),
        recurring({ id: 'futuro', since: '2026-12' }),
        recurring({ id: 'encerrada', until: '2026-10' }),
        oneOff({ id: 'outubro', date: '2026-10-30' }),
      ],
      '2026-11',
    );
    expect(rows.map((r) => r.item.id)).toEqual(['salario', 'aluguel', 'freela']);
  });
});
