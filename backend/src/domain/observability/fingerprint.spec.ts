import { computeFingerprint, summarizeTitle } from './fingerprint';

const STACK_A = `TypeError: Cannot read properties of undefined (reading 'id')
    at getUserId (/app/backend/src/modules/users/users.service.ts:42:18)
    at process (/app/backend/src/modules/expenses/expenses.service.ts:87:5)
    at async ExpensesController.create (/app/backend/src/modules/expenses/expenses.controller.ts:41:12)`;

// Same bug, redeployed: every line number shifted by one, but it is still the same break.
const STACK_A_REDEPLOYED = `TypeError: Cannot read properties of undefined (reading 'id')
    at getUserId (/app/backend/src/modules/users/users.service.ts:43:18)
    at process (/app/backend/src/modules/expenses/expenses.service.ts:88:5)
    at async ExpensesController.create (/app/backend/src/modules/expenses/expenses.controller.ts:42:12)`;

const STACK_B = `RangeError: Invalid time value
    at Date.toISOString (<anonymous>)
    at formatDate (/app/frontend/src/shared/format.ts:12:9)`;

describe('computeFingerprint', () => {
  it('groups the same bug across a redeploy that shifted every line number', () => {
    expect(computeFingerprint('backend', 'Cannot read properties of undefined', STACK_A)).toBe(
      computeFingerprint('backend', 'Cannot read properties of undefined', STACK_A_REDEPLOYED),
    );
  });

  it('groups the same bug across occurrences carrying different dynamic ids', () => {
    const a = computeFingerprint(
      'backend',
      "Registro cmtz28qau0000s5vkvydzzk9v não encontrado",
      STACK_A,
    );
    const b = computeFingerprint(
      'backend',
      "Registro cmtza5s660000pc25rijxo0et não encontrado",
      STACK_A,
    );
    expect(a).toBe(b);
  });

  it('keeps genuinely different errors apart', () => {
    expect(computeFingerprint('backend', 'Cannot read properties of undefined', STACK_A)).not.toBe(
      computeFingerprint('backend', 'Invalid time value', STACK_B),
    );
  });

  it('never merges a frontend error with an identical-looking backend one', () => {
    expect(computeFingerprint('frontend', 'Invalid time value', STACK_B)).not.toBe(
      computeFingerprint('backend', 'Invalid time value', STACK_B),
    );
  });
});

describe('summarizeTitle', () => {
  it('keeps a short title untouched', () => {
    expect(summarizeTitle('Invalid time value')).toBe('Invalid time value');
  });

  it('only keeps the first line', () => {
    expect(summarizeTitle('Erro ao salvar\ndetalhe interno irrelevante')).toBe('Erro ao salvar');
  });

  it('truncates a long title with an ellipsis', () => {
    const long = 'x'.repeat(200);
    const result = summarizeTitle(long, 140);
    expect(result.length).toBe(140);
    expect(result.endsWith('…')).toBe(true);
  });
});
