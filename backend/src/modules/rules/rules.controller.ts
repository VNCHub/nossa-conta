import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RulesService } from './rules.service';
import {
  CreateRuleDto,
  SetMeasurementsDto,
  SetWeightsDto,
  RuleMonthQuery,
} from './dto/rules.dto';
import { FamilyGuard } from '../../common/guards/family.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { currentMonth } from '@shared/format';

@Controller('regras')
@UseGuards(FamilyGuard)
export class RulesController {
  constructor(private readonly rules: RulesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.rules.list(user.familyId!);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRuleDto) {
    return this.rules.create(user.familyId!, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rules.remove(user.familyId!, id);
  }

  @Put(':id/pesos')
  setWeights(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetWeightsDto,
  ) {
    return this.rules.setWeights(user.familyId!, id, dto);
  }

  @Put(':id/medicoes')
  setMeasurements(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() q: RuleMonthQuery,
    @Body() dto: SetMeasurementsDto,
  ) {
    return this.rules.setMeasurements(user.familyId!, id, q.mes ?? currentMonth(), dto);
  }
}
