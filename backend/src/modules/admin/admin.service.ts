import { Injectable } from '@nestjs/common';
import type { AdminOverviewDTO, AdminUserDTO, PaginatedDTO } from '@shared/contracts';
import { AdminRepository } from './admin.repository';

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class AdminService {
  constructor(private readonly admin: AdminRepository) {}

  async overview(): Promise<AdminOverviewDTO> {
    const [totalUsers, totalFamilies, totalExpenses, totalIncomes] = await Promise.all([
      this.admin.countUsers(),
      this.admin.countFamilies(),
      this.admin.countExpenses(),
      this.admin.countIncomes(),
    ]);
    return { totalUsers, totalFamilies, totalExpenses, totalIncomes };
  }

  async listUsers(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<PaginatedDTO<AdminUserDTO>> {
    const skip = (page - 1) * pageSize;
    const { items, total } = await this.admin.listUsers(skip, pageSize);
    return {
      items: items.map((u) => ({
        id: u.id,
        name: u.name,
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      })),
      total,
      page,
      pageSize,
    };
  }
}
