import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { FamiliasService } from './familias.service';
import { CriarFamiliaDto, EntrarFamiliaDto } from './dto/familias.dto';
import {
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../common/decorators/usuario-atual.decorator';
import { FamiliaGuard } from '../../common/guards/familia.guard';

@Controller('familias')
export class FamiliasController {
  constructor(private readonly familias: FamiliasService) {}

  @Post()
  criar(@UsuarioAtual() user: UsuarioAutenticado, @Body() dto: CriarFamiliaDto) {
    return this.familias.criar(user.id, dto.nome);
  }

  @Post('entrar')
  entrar(@UsuarioAtual() user: UsuarioAutenticado, @Body() dto: EntrarFamiliaDto) {
    return this.familias.entrarPorCodigo(user.id, dto.codigo);
  }

  @Get('minha')
  @UseGuards(FamiliaGuard)
  minha(@UsuarioAtual() user: UsuarioAutenticado) {
    return this.familias.minha(user.familiaId!);
  }

  @Get('minha/membros')
  @UseGuards(FamiliaGuard)
  membros(@UsuarioAtual() user: UsuarioAutenticado) {
    return this.familias.membros(user.familiaId!);
  }
}
