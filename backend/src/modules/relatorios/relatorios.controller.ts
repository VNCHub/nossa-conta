import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RelatoriosService } from './relatorios.service';
import { FamiliaGuard } from '../../common/guards/familia.guard';
import { MesQuery } from '../gastos/dto/gastos.dto';
import {
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../common/decorators/usuario-atual.decorator';

@Controller('relatorios')
@UseGuards(FamiliaGuard)
export class RelatoriosController {
  constructor(private readonly relatorios: RelatoriosService) {}

  @Get('consolidado')
  consolidado(@UsuarioAtual() user: UsuarioAutenticado, @Query() q: MesQuery) {
    return this.relatorios.consolidado(user.familiaId!, q.mes);
  }
}
