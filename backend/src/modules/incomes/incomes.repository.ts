import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Every income read is scoped by family: the familyId parameter is required on
 * each method, so there is no path that returns another family's data by a
 * forgotten filter.
 */
@Injectable()
export class IncomesRepository {
  constructor(private readonly prisma: PrismaService) {}

  listForFamily(familyId: string) {
    return this.prisma.income.findMany({
      where: { user: { familyId } },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    });
  }

  listForUser(familyId: string, userId: string) {
    return this.prisma.income.findMany({
      where: { userId, user: { familyId } },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findForUser(familyId: string, userId: string, id: string) {
    return this.prisma.income.findFirst({
      where: { id, userId, user: { familyId } },
    });
  }

  create(data: Prisma.IncomeUncheckedCreateInput) {
    return this.prisma.income.create({ data });
  }

  update(id: string, data: Prisma.IncomeUncheckedUpdateInput) {
    return this.prisma.income.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.income.delete({ where: { id } });
  }

  /**
   * Earliest month any income represents: a one-off's own `date`, or a
   * recurring income's declared `since`.
   */
  async earliestMonth(familyId: string): Promise<string | null> {
    const groups = await this.prisma.income.groupBy({
      by: ['type'],
      where: { user: { familyId } },
      _min: { since: true, date: true },
    });
    const months = groups
      .map((g) => (g.type === 'RECURRING' ? g._min.since : g._min.date?.toISOString().slice(0, 7)))
      .filter((m): m is string => m != null);
    return months.length ? months.sort()[0] : null;
  }
}
