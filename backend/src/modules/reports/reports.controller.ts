import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { FamilyGuard } from '../../common/guards/family.guard';
import { MonthQuery } from '../expenses/dto/expenses.dto';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

@Controller('relatorios')
@UseGuards(FamilyGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('consolidado')
  statement(@CurrentUser() user: AuthenticatedUser, @Query() q: MonthQuery) {
    return this.reports.statement(user.familyId!, q.mes);
  }
}
