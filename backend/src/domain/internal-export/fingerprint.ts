import { createHash } from 'node:crypto';
import type { InternalExpenseEntry } from './types';

/**
 * Identifies one gasto across different export files — same purpose as
 * transactionKeyOf in domain/bank-import, and deliberately not based on the
 * source's own row id: that id is only stable for one direct hop. Re-export
 * from an intermediate environment (A → B → C) mints a new id in B, so the
 * same original gasto arriving at C by two different paths (A → C direct and
 * A → B → C) would carry two different ids there — content does not change
 * between hops, so it is what dedup has to be built on.
 */
export const expenseKeyOf = (e: InternalExpenseEntry): string =>
  createHash('sha256')
    .update(
      [e.date, e.description.trim(), e.amount.toFixed(2), e.category, e.expenseType, e.paymentMethod].join('|'),
    )
    .digest('hex');
