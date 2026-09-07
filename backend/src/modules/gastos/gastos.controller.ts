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
import { GastosService } from './gastos.service';
import {
  AtualizarGastoDto,
  CriarGastoDto,
  ListarGastosQuery,
} from './dto/gastos.dto';
import { FamiliaGuard } from '../../common/guards/familia.guard';
import {
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../common/decorators/usuario-atual.decorator';

@Controller('gastos')
@UseGuards(FamiliaGuard)
export class GastosController {
  constructor(private readonly gastos: GastosService) {}

  @Get()
  listar(@UsuarioAtual() user: UsuarioAutenticado, @Query() q: ListarGastosQuery) {
    return this.gastos.listar(user.familiaId!, {
      mes: q.mes,
      userId: q.escopo === 'meus' ? user.id : undefined,
    });
  }

  @Post()
  criar(@UsuarioAtual() user: UsuarioAutenticado, @Body() dto: CriarGastoDto) {
    return this.gastos.criar(user.familiaId!, user.id, dto);
  }

  @Patch(':id')
  atualizar(
    @UsuarioAtual() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: AtualizarGastoDto,
  ) {
    return this.gastos.atualizar(user.familiaId!, user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@UsuarioAtual() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.gastos.remover(user.familiaId!, user.id, id);
  }
}
