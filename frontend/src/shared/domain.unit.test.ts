import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  CATEGORY_IDS,
  categoryOf,
  DEFAULT_RULE_DESCRIPTION,
  MONTH_REGEX,
  RULE_TYPES,
} from '@shared/domain';

describe('categoryOf', () => {
  it('returns the matching category', () => {
    expect(categoryOf('food')).toMatchObject({ id: 'food', name: 'Comida' });
  });

  it('falls back to "other" for an unknown id', () => {
    expect(categoryOf('does-not-exist')).toBe(CATEGORIES[CATEGORIES.length - 1]);
    expect(categoryOf('does-not-exist').id).toBe('other');
  });

  it('resolves every declared id', () => {
    for (const id of CATEGORY_IDS) {
      expect(categoryOf(id).id).toBe(id);
    }
  });
});

describe('MONTH_REGEX', () => {
  it('accepts a valid YYYY-MM', () => {
    expect(MONTH_REGEX.test('2026-09')).toBe(true);
    expect(MONTH_REGEX.test('2026-01')).toBe(true);
    expect(MONTH_REGEX.test('2026-12')).toBe(true);
  });

  it('rejects an out-of-range or malformed month', () => {
    expect(MONTH_REGEX.test('2026-00')).toBe(false);
    expect(MONTH_REGEX.test('2026-13')).toBe(false);
    expect(MONTH_REGEX.test('2026-9')).toBe(false);
    expect(MONTH_REGEX.test('26-09')).toBe(false);
    expect(MONTH_REGEX.test('')).toBe(false);
  });
});

describe('rule metadata', () => {
  it('has a default description for every rule type', () => {
    for (const type of RULE_TYPES) {
      expect(DEFAULT_RULE_DESCRIPTION[type]).toBeTruthy();
    }
  });
});
