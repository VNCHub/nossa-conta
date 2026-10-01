import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const WITH_PAYMENTS = {
  payments: {
    select: { id: true, date: true, amount: true, description: true },
    orderBy: { date: 'asc' },
  },
  closing: { select: { month: true } },
} satisfies Prisma.DebtInclude;

export type DebtWithPayments = Prisma.DebtGetPayload<{ include: typeof WITH_PAYMENTS }>;

/** Debts are always read within a family — familyId is required on every method. */
@Injectable()
export class DebtsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(familyId: string) {
    return this.prisma.debt.findMany({
      where: { familyId },
      include: WITH_PAYMENTS,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  find(familyId: string, id: string) {
    return this.prisma.debt.findFirst({ where: { id, familyId }, include: WITH_PAYMENTS });
  }

  create(data: Prisma.DebtUncheckedCreateInput) {
    return this.prisma.debt.create({ data, include: WITH_PAYMENTS });
  }

  remove(familyId: string, id: string) {
    return this.prisma.debt.deleteMany({ where: { id, familyId } });
  }

  /**
   * The payer's DEBT expense and the receiver's income, written together. The
   * remaining balance is re-read inside the same serializable transaction, so
   * two payments racing each other can't both fit under it.
   */
  pay(
    familyId: string,
    debtId: string,
    payment: {
      amount: string;
      date: Date;
      month: string;
      description: string;
      receiptDescription: string;
      paymentMethod: string | null;
    },
  ): Promise<'paid' | 'over' | 'gone'> {
    return this.prisma.$transaction(
      async (tx) => {
        const debt = await tx.debt.findFirst({ where: { id: debtId, familyId } });
        if (!debt) return 'gone';
        const { _sum } = await tx.expense.aggregate({ where: { debtId }, _sum: { amount: true } });
        const remaining = new Prisma.Decimal(debt.amount).minus(_sum.amount ?? 0);
        if (new Prisma.Decimal(payment.amount).greaterThan(remaining)) return 'over';

        const expense = await tx.expense.create({
          data: {
            familyId,
            userId: debt.fromUserId,
            debtId,
            expenseType: 'DEBT',
            date: payment.date,
            month: payment.month,
            amount: payment.amount,
            description: payment.description,
            paymentMethod: payment.paymentMethod,
            shared: false,
          },
        });
        await tx.income.create({
          data: {
            userId: debt.toUserId,
            type: 'ONE_OFF',
            date: payment.date,
            amount: payment.amount,
            description: payment.receiptDescription,
            debtPaymentId: expense.id,
          },
        });
        return 'paid';
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
