import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const WITH_SHARES = {
  shares: { select: { userId: true } },
} satisfies Prisma.ExpenseInclude;

export type ExpenseWithShares = Prisma.ExpenseGetPayload<{
  include: typeof WITH_SHARES;
}>;

@Injectable()
export class ExpensesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(familyId: string, filters: { month?: string; userId?: string } = {}) {
    return this.prisma.expense.findMany({
      where: { familyId, month: filters.month, userId: filters.userId },
      include: WITH_SHARES,
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /** Same as `list`, but filtered by a day-level date range instead of a whole month — only "Exportar dados" needs that. */
  listForExport(
    familyId: string,
    filters: { userId?: string; dateFrom?: string; dateTo?: string } = {},
  ) {
    return this.prisma.expense.findMany({
      where: {
        familyId,
        userId: filters.userId,
        date: {
          gte: filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00Z`) : undefined,
          lte: filters.dateTo ? new Date(`${filters.dateTo}T23:59:59Z`) : undefined,
        },
      },
      include: WITH_SHARES,
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
  }

  find(familyId: string, id: string) {
    return this.prisma.expense.findFirst({
      where: { id, familyId },
      include: WITH_SHARES,
    });
  }

  create(data: Prisma.ExpenseUncheckedCreateInput, participants: string[]) {
    return this.prisma.expense.create({
      data: {
        ...data,
        shares: { create: participants.map((userId) => ({ userId })) },
      },
      include: WITH_SHARES,
    });
  }

  /** Replaces the participants wholesale: simpler to get right than a diff. */
  update(
    id: string,
    data: Prisma.ExpenseUncheckedUpdateInput,
    participants: string[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.expenseShare.deleteMany({ where: { expenseId: id } });
      return tx.expense.update({
        where: { id },
        data: {
          ...data,
          shares: { create: participants.map((userId) => ({ userId })) },
        },
        include: WITH_SHARES,
      });
    });
  }

  remove(id: string) {
    return this.prisma.expense.delete({ where: { id } });
  }

  async earliestMonth(familyId: string): Promise<string | null> {
    const { _min } = await this.prisma.expense.aggregate({
      where: { familyId },
      _min: { month: true },
    });
    return _min.month;
  }
}
