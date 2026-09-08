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
  UseGuards,
} from '@nestjs/common';
import { IncomesService } from './incomes.service';
import { UpdateIncomeDto, CreateIncomeDto } from './dto/incomes.dto';
import { FamilyGuard } from '../../common/guards/family.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

@Controller('entradas')
@UseGuards(FamilyGuard)
export class IncomesController {
  constructor(private readonly incomes: IncomesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.incomes.listMine(user.familyId!, user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateIncomeDto) {
    return this.incomes.create(user.familyId!, user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateIncomeDto,
  ) {
    return this.incomes.update(user.familyId!, user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.incomes.remove(user.familyId!, user.id, id);
  }
}
