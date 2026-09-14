import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PaginationQuery } from './dto/admin.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('administracao')
@UseGuards(RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('resumo')
  overview() {
    return this.admin.overview();
  }

  @Get('usuarios')
  users(@Query() q: PaginationQuery) {
    return this.admin.listUsers(q.page, q.pageSize);
  }
}
