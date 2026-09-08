import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { FamiliesService } from './families.service';
import { CreateFamilyDto, JoinFamilyDto } from './dto/families.dto';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { FamilyGuard } from '../../common/guards/family.guard';

@Controller('familias')
export class FamiliesController {
  constructor(private readonly families: FamiliesService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFamilyDto) {
    return this.families.create(user.id, dto.name);
  }

  @Post('entrar')
  join(@CurrentUser() user: AuthenticatedUser, @Body() dto: JoinFamilyDto) {
    return this.families.joinByCode(user.id, dto.code);
  }

  @Get('minha')
  @UseGuards(FamilyGuard)
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.families.mine(user.familyId!);
  }

  @Get('minha/membros')
  @UseGuards(FamilyGuard)
  members(@CurrentUser() user: AuthenticatedUser) {
    return this.families.members(user.familyId!);
  }
}
