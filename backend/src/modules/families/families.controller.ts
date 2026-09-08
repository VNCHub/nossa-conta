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
import { FamiliesService } from './families.service';
import { CreateFamilyDto, JoinFamilyDto, UpdateFamilyDto } from './dto/families.dto';
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

  @Patch('minha')
  @UseGuards(FamilyGuard)
  rename(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateFamilyDto) {
    return this.families.rename(user.familyId!, user.id, dto.name);
  }

  @Delete('minha')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(FamilyGuard)
  dissolve(@CurrentUser() user: AuthenticatedUser) {
    return this.families.dissolve(user.familyId!, user.id);
  }

  @Post('minha/sair')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(FamilyGuard)
  leave(@CurrentUser() user: AuthenticatedUser) {
    return this.families.leave(user.familyId!, user.id);
  }

  @Delete('minha/membros/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(FamilyGuard)
  removeMember(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.families.removeMember(user.familyId!, user.id, id);
  }
}
