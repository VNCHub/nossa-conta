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
import { RegrasService } from './regras.service';
import {
  CriarRegraDto,
  DefinirMedicoesDto,
  DefinirPesosDto,
  MesRegraQuery,
} from './dto/regras.dto';
import { FamiliaGuard } from '../../common/guards/familia.guard';
import {
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../common/decorators/usuario-atual.decorator';
import { mesAtual } from '@shared/formato';

@Controller('regras')
@UseGuards(FamiliaGuard)
export class RegrasController {
  constructor(private readonly regras: RegrasService) {}

  @Get()
  listar(@UsuarioAtual() user: UsuarioAutenticado) {
    return this.regras.listar(user.familiaId!);
  }

  @Post()
  criar(@UsuarioAtual() user: UsuarioAutenticado, @Body() dto: CriarRegraDto) {
    return this.regras.criar(user.familiaId!, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@UsuarioAtual() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.regras.remover(user.familiaId!, id);
  }

  @Put(':id/pesos')
  definirPesos(
    @UsuarioAtual() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: DefinirPesosDto,
  ) {
    return this.regras.definirPesos(user.familiaId!, id, dto);
  }

  @Put(':id/medicoes')
  definirMedicoes(
    @UsuarioAtual() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Query() q: MesRegraQuery,
    @Body() dto: DefinirMedicoesDto,
  ) {
    return this.regras.definirMedicoes(user.familiaId!, id, q.mes ?? mesAtual(), dto);
  }
}
