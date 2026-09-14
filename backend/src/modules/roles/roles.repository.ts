import { Injectable } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { AppRole } from '@shared/domain';
import { PrismaService } from '../../prisma/prisma.service';

const DTO_NAME: Record<RoleName, AppRole> = {
  [RoleName.DEFAULT]: 'default',
  [RoleName.ADMIN]: 'admin',
};

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async namesFor(userId: string): Promise<AppRole[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      select: { role: { select: { name: true } } },
    });
    return rows.map((r) => DTO_NAME[r.role.name]);
  }

  /** Every account gets this on creation — the baseline, unprivileged role. */
  async assignDefault(userId: string): Promise<void> {
    const role = await this.prisma.role.findUniqueOrThrow({
      where: { name: RoleName.DEFAULT },
    });
    await this.prisma.userRole.create({ data: { userId, roleId: role.id } });
  }
}
