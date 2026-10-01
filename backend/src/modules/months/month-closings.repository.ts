import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Closings are always read within a family — familyId is required on every method. */
@Injectable()
export class MonthClosingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  find(familyId: string, month: string) {
    return this.prisma.monthClosing.findUnique({
      where: { familyId_month: { familyId, month } },
      include: { debts: { select: { id: true } } },
    });
  }

  /** The closing and one debt per settlement transfer, all or nothing. */
  create(
    familyId: string,
    month: string,
    closedById: string,
    debts: { fromUserId: string; toUserId: string; amount: string; description: string; date: Date }[],
  ) {
    return this.prisma.monthClosing.create({
      data: {
        familyId,
        month,
        closedById,
        generatedCount: debts.length,
        debts: { create: debts.map((d) => ({ ...d, familyId, origin: 'MONTH_CLOSING' as const })) },
      },
    });
  }

  /**
   * Deletes the debts the closing generated that still exist, then the closing.
   * Their payments survive: the expense's debtId is SetNull.
   */
  remove(familyId: string, closingId: string) {
    return this.prisma.$transaction([
      this.prisma.debt.deleteMany({ where: { familyId, closingId } }),
      this.prisma.monthClosing.deleteMany({ where: { familyId, id: closingId } }),
    ]);
  }
}
