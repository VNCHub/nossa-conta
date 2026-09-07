import { Injectable } from '@nestjs/common';
import { Prisma, RuleType } from '@prisma/client';
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

  update(id: string, data: Prisma.FamilyUpdateInput) {
    return this.prisma.family.update({ where: { id }, data });
  }
}
