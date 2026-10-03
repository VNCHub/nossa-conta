import type { PaymentMethod } from '@shared/domain';
import { toReais } from '../split';
import { transactionKeyOf } from './fingerprint';
import type {
  BankId,
  ExcludedSeed,
  ExpenseSeed,
  ImportDocumentType,
  IncomeSeed,
  MappedImport,
  RawTransaction,
} from './types';

const MAX_DESCRIPTION_LENGTH = 120;

// These patterns describe facts the bank already states in the memo, not a
// guess — only these are confident enough to prefill paymentMethod.
const DEBIT_CARD_RE = /compra no d[ée]bito/i;
const PIX_SENT_RE = /transfer[êe]ncia enviada.*pix/i;
const BOLETO_RE = /pagamento de boleto/i;
// The transfer that settles the credit card bill: if the same period's
// invoice is also imported, keeping this line would double-count the spend.
const INVOICE_PAYMENT_RE = /pagamento de fatura/i;

/**
 * Debits become a Gasto. Credits (money coming in) are returned apart, as
 * candidates: whether each one is really income is the user's call.
 */
export function mapAccountStatement(transactions: RawTransaction[], bank: BankId): MappedImport {
  const expenses: ExpenseSeed[] = [];
  const credits: IncomeSeed[] = [];
  const excluded: ExcludedSeed[] = [];

  for (const t of transactions) {
    if (t.kind === 'credit') {
      credits.push({
        date: t.date,
        description: truncate(t.description),
        amount: toReais(t.amountCents),
        importKey: transactionKeyOf(bank, 'accountStatement', t),
      });
      continue;
    }
    if (INVOICE_PAYMENT_RE.test(t.description)) {
      excluded.push({
        date: t.date,
        description: truncate(t.description),
        amount: toReais(t.amountCents),
        kind: 'expense',
        reason: 'invoicePayment',
      });
      continue;
    }

    expenses.push({
      date: t.date,
      description: truncate(t.description),
      amount: toReais(t.amountCents),
      paymentMethod: inferAccountPaymentMethod(t.description),
      importKey: transactionKeyOf(bank, 'accountStatement', t),
    });
  }

  return { expenses, incomes: [], credits, excluded };
}

/**
 * Purchases (debit) become a Gasto with a known paymentMethod — it's a
 * credit card invoice, so 'Crédito' is a fact, not an inference. Refunds
 * (credit / "estorno") become a one-off Income instead: the split engine
 * requires amount > 0, so a refund cannot be a negative Gasto.
 */
export function mapInvoice(transactions: RawTransaction[], bank: BankId): MappedImport {
  const expenses: ExpenseSeed[] = [];
  const incomes: IncomeSeed[] = [];

  for (const t of transactions) {
    if (t.kind === 'debit') {
      expenses.push({
        date: t.date,
        description: truncate(t.description),
        amount: toReais(t.amountCents),
        paymentMethod: 'Crédito' as PaymentMethod,
        importKey: transactionKeyOf(bank, 'invoice', t),
      });
    } else {
      // Not every credit line on an invoice is literally an "estorno" (e.g.
      // "Pagamento recebido"), so the label stays generic about what is known
      // for a fact: money came back on the card.
      incomes.push({
        date: t.date,
        description: truncate(`Crédito na fatura: ${t.description}`),
        amount: toReais(t.amountCents),
        importKey: transactionKeyOf(bank, 'invoice', t),
      });
    }
  }

  return { expenses, incomes, credits: [], excluded: [] };
}

export function mapToRecords(
  transactions: RawTransaction[],
  documentType: ImportDocumentType,
  bank: BankId,
): MappedImport {
  return documentType === 'accountStatement'
    ? mapAccountStatement(transactions, bank)
    : mapInvoice(transactions, bank);
}

/** Oldest/newest date across every parsed line, regardless of which ones become records — the file's actual coverage. */
export function periodOf(transactions: RawTransaction[]): { start: string; end: string } | null {
  if (transactions.length === 0) return null;
  const dates = transactions.map((t) => t.date).sort();
  return { start: dates[0], end: dates[dates.length - 1] };
}

function inferAccountPaymentMethod(description: string): PaymentMethod | null {
  if (DEBIT_CARD_RE.test(description)) return 'Débito';
  if (PIX_SENT_RE.test(description)) return 'Pix';
  if (BOLETO_RE.test(description)) return 'Boleto';
  return null;
}

function truncate(description: string): string {
  const trimmed = description.trim();
  return trimmed.length > MAX_DESCRIPTION_LENGTH
    ? `${trimmed.slice(0, MAX_DESCRIPTION_LENGTH - 1)}…`
    : trimmed;
}
