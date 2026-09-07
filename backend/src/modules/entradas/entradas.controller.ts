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
import { EntradasService } from './entradas.service';
import { AtualizarEntradaDto, CriarEntradaDto } from './dto/entradas.dto';
import { FamiliaGuard } from '../../common/guards/familia.guard';
import {
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../common/decorators/usuario-atual.decorator';

@Controller('entradas')
@UseGuards(FamiliaGuard)
export class EntradasController {
  constructor(private readonly entradas: EntradasService) {}

  @Get()
  listar(@UsuarioAtual() user: UsuarioAutenticado) {
    return this.entradas.listarMinhas(user.familiaId!, user.id);
  }

  @Post()
  criar(@UsuarioAtual() user: UsuarioAutenticado, @Body() dto: CriarEntradaDto) {
    return this.entradas.criar(user.familiaId!, user.id, dto);
  }

  @Patch(':id')
  atualizar(
    @UsuarioAtual() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: AtualizarEntradaDto,
  ) {
    return this.entradas.atualizar(user.familiaId!, user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@UsuarioAtual() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.entradas.remover(user.familiaId!, user.id, id);
  }
}
