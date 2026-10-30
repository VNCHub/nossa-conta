import { CATEGORY_IDS, EXPENSE_TYPES, PAYMENT_METHODS } from '@shared/domain';
import { SUPPORTED_EXPORT_VERSION, type InternalExpenseEntry } from './types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LEGACY_OPTIONAL = 'optional';

/**
 * Validates and extracts the gastos from a file produced by this app's own
 * "Exportar dados" — throws with a user-facing reason on anything that
 * doesn't match, same contract as parseFile in domain/bank-import.
 */
export function parseInternalExport(buffer: Buffer): InternalExpenseEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(buffer.toString('utf8'));
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }

  if (!isPlainObject(parsed) || !Array.isArray(parsed.expenses)) {
    throw new Error('Arquivo não é uma exportação da Nossa Conta reconhecida.');
  }
  if (parsed.version !== SUPPORTED_EXPORT_VERSION) {
    throw new Error('Versão de exportação não suportada — exporte de novo.');
  }

  return parsed.expenses.map((raw, i) => {
    if (!isValidEntry(raw)) {
      throw new Error(`Gasto inválido na posição ${i + 1} do arquivo.`);
    }
    // Before the types were unified, files carried "optional"; it is a one-off
    // now, and normalising here keeps the dedup key equal to the migrated rows'.
    return (raw.expenseType as string | null) === LEGACY_OPTIONAL ? { ...raw, expenseType: 'oneOff' } : raw;
  });
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isValidEntry(v: unknown): v is InternalExpenseEntry {
  if (!isPlainObject(v)) return false;
  return (
    typeof v.date === 'string' &&
    DATE_RE.test(v.date) &&
    typeof v.description === 'string' &&
    typeof v.amount === 'number' &&
    Number.isFinite(v.amount) &&
    v.amount > 0 &&
    (v.category === null || (CATEGORY_IDS as readonly string[]).includes(v.category as string)) &&
    (v.expenseType === null || [...EXPENSE_TYPES, LEGACY_OPTIONAL].includes(v.expenseType as string)) &&
    (v.paymentMethod === null || (PAYMENT_METHODS as readonly string[]).includes(v.paymentMethod as string))
  );
}
