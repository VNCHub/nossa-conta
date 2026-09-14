import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  countUsers() {
    return this.prisma.user.count();
  }

  countFamilies() {
    return this.prisma.family.count();
  }

  countExpenses() {
    return this.prisma.expense.count();
  }

  countIncomes() {
    return this.prisma.income.count();
  }

  async listUsers(skip: number, take: number) {
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        select: { id: true, name: true, lastLoginAt: true },
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      this.countUsers(),
    ]);
    return { items, total };
  }
}
