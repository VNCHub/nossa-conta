import { Injectable } from '@nestjs/common';
import { RuleType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FamiliesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.family.findUnique({ where: { id } });
  }

  findByCode(code: string) {
    return this.prisma.family.findUnique({ where: { inviteCode: code } });
  }

  codeExists(code: string) {
    return this.prisma.family
      .count({ where: { inviteCode: code } })
      .then((n) => n > 0);
  }

  /**
   * Creates the family, links the creator and seeds the split rules that need
   * no configuration — without them the expense form would open with no split
   * option. All in one transaction: a family with no rule is an invalid state.
   */
  createWithCreator(input: {
    name: string;
    inviteCode: string;
    createdById: string;
    defaultRules: { name: string; type: RuleType; description: string }[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const family = await tx.family.create({
        data: {
          name: input.name,
          inviteCode: input.inviteCode,
          createdById: input.createdById,
          rules: { create: input.defaultRules },
        },
      });
      await tx.user.update({
        where: { id: input.createdById },
        data: { familyId: family.id },
      });
      return family;
    });
  }

  updateName(familyId: string, name: string) {
    return this.prisma.family.update({ where: { id: familyId }, data: { name } });
  }

  transferOwnership(familyId: string, newOwnerId: string) {
    return this.prisma.family.update({
      where: { id: familyId },
      data: { createdBy: { connect: { id: newOwnerId } } },
    });
  }

  /**
   * Detaches one member and pulls them out of every split from `fromMonth` on,
   * leaving closed months frozen. Scoped by familyId: a userId from another
   * family matches nothing and returns 0, which the service turns into a 404.
   *
   * - On shared expenses others paid, the member simply stops being a
   *   participant — the engine then re-splits the amount among whoever remains.
   * - The shared expenses the member paid become individual: nobody settles them.
   * - Their meter measurements from `fromMonth` on are cleared.
   *
   * Agreed FIXED percentages (RuleWeight, no month) are left untouched: the
   * member is already out of every future participant list, and deleting them
   * would re-split closed months.
   */
  removeMember(familyId: string, userId: string, fromMonth: string): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const detached = await tx.user.updateMany({
        where: { id: userId, familyId },
        data: { familyId: null },
      });
      if (!detached.count) return 0;

      const futureShared = await tx.expense.findMany({
        where: { familyId, shared: true, month: { gte: fromMonth } },
        select: { id: true, userId: true },
      });
      const paidByMember = futureShared.filter((e) => e.userId === userId).map((e) => e.id);
      const paidByOthers = futureShared.filter((e) => e.userId !== userId).map((e) => e.id);

      if (paidByOthers.length) {
        await tx.expenseShare.deleteMany({
          where: { userId, expenseId: { in: paidByOthers } },
        });
      }
      if (paidByMember.length) {
        await tx.expenseShare.deleteMany({ where: { expenseId: { in: paidByMember } } });
        await tx.expense.updateMany({
          where: { id: { in: paidByMember } },
          data: { shared: false },
        });
      }

      const rules = await tx.splitRule.findMany({
        where: { familyId },
        select: { id: true },
      });
      if (rules.length) {
        await tx.ruleMeasurement.deleteMany({
          where: { userId, month: { gte: fromMonth }, ruleId: { in: rules.map((r) => r.id) } },
        });
      }

      return detached.count;
    });
  }

  /**
   * Deletes the family. Cascade drops its expenses, expense shares and split
   * rules; the members that remain are detached (familyId → null).
   */
  deleteFamily(familyId: string) {
    return this.prisma.family.delete({ where: { id: familyId } });
  }
}
