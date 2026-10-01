import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { MonthsService } from './months.service';
import { MonthParam } from './dto/months.dto';
import { FamilyGuard } from '../../common/guards/family.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

@Controller('meses')
@UseGuards(FamilyGuard)
export class MonthsController {
  constructor(private readonly months: MonthsService) {}

  @Get(':mes')
  status(@CurrentUser() user: AuthenticatedUser, @Param() p: MonthParam) {
    return this.months.status(user.familyId!, p.mes);
  }

  /** "Finalizar meus lançamentos" — always the caller's own, never someone else's. */
  @Post(':mes/finalizacao')
  finalize(@CurrentUser() user: AuthenticatedUser, @Param() p: MonthParam) {
    return this.months.finalize(user.familyId!, user.id, p.mes);
  }

  @Delete(':mes/finalizacao')
  reopen(@CurrentUser() user: AuthenticatedUser, @Param() p: MonthParam) {
    return this.months.reopen(user.familyId!, user.id, p.mes);
  }
}
