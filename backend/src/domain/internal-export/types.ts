import type { CategoryId, ExpenseType, PaymentMethod } from '@shared/domain';

/** One gasto as it travels inside a "Exportar dados" file — mirrors ExportedExpenseDTO, kept independent on purpose (see ExpenseSeed in domain/bank-import). */
export interface InternalExpenseEntry {
  date: string;
  description: string;
  amount: number;
  category: CategoryId | null;
  expenseType: ExpenseType | null;
  paymentMethod: PaymentMethod | null;
}

export const SUPPORTED_EXPORT_VERSION = 1;
