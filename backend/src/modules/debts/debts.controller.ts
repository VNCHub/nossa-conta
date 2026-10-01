import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DebtsService } from './debts.service';
import { CreateDebtDto, PayDebtDto } from './dto/debts.dto';
import { FamilyGuard } from '../../common/guards/family.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

@Controller('dividas')
@UseGuards(FamilyGuard)
export class DebtsController {
  constructor(private readonly debts: DebtsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.debts.list(user.familyId!);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDebtDto) {
    return this.debts.create(user.familyId!, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.debts.remove(user.familyId!, user.id, id);
  }

  /** Undoing a payment is deleting its expense: DELETE /gastos/:id. */
  @Post(':id/pagamentos')
  pay(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: PayDebtDto,
  ) {
    return this.debts.pay(user.familyId!, user.id, id, dto);
  }
}
