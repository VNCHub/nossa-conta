import { Injectable } from '@nestjs/common';
import { Prisma, RuleType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const FULL = {
  weights: { select: { userId: true, percent: true } },
  measurements: { select: { userId: true, month: true, amount: true } },
} satisfies Prisma.SplitRuleInclude;

export type FullRule = Prisma.SplitRuleGetPayload<{ include: typeof FULL }>;

@Injectable()
export class RulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(familyId: string) {
    return this.prisma.splitRule.findMany({
      where: { familyId },
      include: FULL,
      orderBy: { createdAt: 'asc' },
    });
  }

  find(familyId: string, id: string) {
    return this.prisma.splitRule.findFirst({
      where: { id, familyId },
      include: FULL,
    });
  }

  count(familyId: string) {
    return this.prisma.splitRule.count({ where: { familyId } });
  }

  create(data: Prisma.SplitRuleUncheckedCreateInput) {
    return this.prisma.splitRule.create({ data, include: FULL });
  }

  remove(id: string) {
    return this.prisma.splitRule.delete({ where: { id } });
  }

  /** Replaces all of the rule's percentages at once. */
  setWeights(ruleId: string, weights: { userId: string; percent: number }[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.ruleWeight.deleteMany({ where: { ruleId } });
      if (weights.length) {
        await tx.ruleWeight.createMany({
          data: weights.map((w) => ({ ruleId, ...w })),
        });
      }
      return tx.splitRule.findUniqueOrThrow({
        where: { id: ruleId },
        include: FULL,
      });
    });
  }

  /** Replaces one month's measurements, keeping the other months. */
  setMeasurements(
    ruleId: string,
    month: string,
    measurements: { userId: string; amount: number }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.ruleMeasurement.deleteMany({ where: { ruleId, month } });
      if (measurements.length) {
        await tx.ruleMeasurement.createMany({
          data: measurements.map((m) => ({ ruleId, month, ...m })),
        });
      }
      return tx.splitRule.findUniqueOrThrow({
        where: { id: ruleId },
        include: FULL,
      });
    });
  }

  /**
   * How many expenses use the rule. Lives here, not in ExpensesRepository, so
   * the rules module does not have to import the expenses one — which already
   * imports this.
   */
  countUses(familyId: string, ruleId: string) {
    return this.prisma.expense.count({ where: { familyId, ruleId } });
  }

  countUsesByRule(familyId: string) {
    return this.prisma.expense.groupBy({
      by: ['ruleId'],
      where: { familyId, ruleId: { not: null } },
      _count: { _all: true },
    });
  }

  typeOf(type: string): RuleType {
    return type.toUpperCase() as RuleType;
  }
}
