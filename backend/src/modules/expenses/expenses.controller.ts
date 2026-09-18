import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import {
  UpdateExpenseDto,
  CreateExpenseDto,
  ExportExpensesQuery,
  ListExpensesQuery,
} from './dto/expenses.dto';
import { FamilyGuard } from '../../common/guards/family.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

@Controller('gastos')
@UseGuards(FamilyGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() q: ListExpensesQuery) {
    return this.expenses.list(user.familyId!, {
      month: q.mes,
      userId: q.escopo === 'meus' ? user.id : undefined,
    });
  }

  @Get('exportar')
  export(@CurrentUser() user: AuthenticatedUser, @Query() q: ExportExpensesQuery) {
    return this.expenses.export(user.familyId!, {
      userId: q.escopo === 'meus' ? user.id : undefined,
      dateFrom: q.inicio,
      dateTo: q.fim,
    });
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateExpenseDto) {
    return this.expenses.create(user.familyId!, user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expenses.update(user.familyId!, user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.expenses.remove(user.familyId!, user.id, id);
  }
}
