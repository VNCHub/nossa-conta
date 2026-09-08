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
}
