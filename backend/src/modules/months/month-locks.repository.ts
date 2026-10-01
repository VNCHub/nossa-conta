import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Finalizations are always read within a family — familyId is required on every method. */
@Injectable()
export class MonthLocksRepository {
  constructor(private readonly prisma: PrismaService) {}

  listForMonth(familyId: string, month: string) {
    return this.prisma.monthFinalization.findMany({
      where: { familyId, month },
      select: { userId: true, finalizedAt: true },
    });
  }

  /** Every month this member has finalized — small by nature (at most one row per month). */
  async monthsFinalizedBy(familyId: string, userId: string): Promise<string[]> {
    const rows = await this.prisma.monthFinalization.findMany({
      where: { familyId, userId },
      select: { month: true },
    });
    return rows.map((r) => r.month);
  }

  find(familyId: string, userId: string, month: string) {
    return this.prisma.monthFinalization.findUnique({
      where: { familyId_userId_month: { familyId, userId, month } },
    });
  }

  create(familyId: string, userId: string, month: string) {
    return this.prisma.monthFinalization.create({ data: { familyId, userId, month } });
  }

  remove(familyId: string, userId: string, month: string) {
    return this.prisma.monthFinalization.deleteMany({ where: { familyId, userId, month } });
  }
}
