import { Injectable, NotFoundException } from '@nestjs/common';
import { TipoEntrada as TipoEntradaDb } from '@prisma/client';
import type { EntradaDTO } from '@shared/contratos';
import type { EntradaCalc } from '../../domain/rateio';
import { paraCentavos, paraReais } from '../../domain/rateio';
import { EntradasRepository } from './entradas.repository';
import { AtualizarEntradaDto, CriarEntradaDto } from './dto/entradas.dto';

type EntradaRow = {
  id: string;
  userId: string;
  tipo: TipoEntradaDb;
  descricao: string;
  valor: unknown;
  diaDoMes: number | null;
  data: Date | null;
};

@Injectable()
export class EntradasService {
  constructor(private readonly repo: EntradasRepository) {}

  async listarMinhas(familiaId: string, userId: string): Promise<EntradaDTO[]> {
    const rows = await this.repo.listarDoUsuario(familiaId, userId);
    return rows.map(paraDTO);
  }

  async criar(
    familiaId: string,
    userId: string,
    dto: CriarEntradaDto,
  ): Promise<EntradaDTO> {
    const recorrente = dto.tipo === 'recorrente';
    const row = await this.repo.criar({
      userId,
      tipo: recorrente ? TipoEntradaDb.RECORRENTE : TipoEntradaDb.PONTUAL,
      descricao: dto.descricao.trim(),
      valor: dto.valor,
      diaDoMes: recorrente ? (dto.diaDoMes ?? 1) : null,
      data: recorrente ? null : new Date(`${dto.data}T00:00:00Z`),
    });
    return paraDTO(row as EntradaRow);
  }

  async atualizar(
    familiaId: string,
    userId: string,
    id: string,
    dto: AtualizarEntradaDto,
  ): Promise<EntradaDTO> {
    const atual = await this.exigirPropria(familiaId, userId, id);
    const recorrente = atual.tipo === TipoEntradaDb.RECORRENTE;

    const row = await this.repo.atualizar(id, {
      descricao: dto.descricao?.trim(),
      valor: dto.valor,
      // O tipo não muda depois de criado: trocar recorrente por pontual mudaria
      // retroativamente o rateio de todos os meses já fechados.
      diaDoMes: recorrente ? dto.diaDoMes : undefined,
      data: !recorrente && dto.data ? new Date(`${dto.data}T00:00:00Z`) : undefined,
    });
    return paraDTO(row as EntradaRow);
  }

  async remover(familiaId: string, userId: string, id: string): Promise<void> {
    await this.exigirPropria(familiaId, userId, id);
    await this.repo.remover(id);
  }

  /** Entradas de toda a família, no formato do motor de rateio. */
  async paraCalculo(familiaId: string): Promise<EntradaCalc[]> {
    const rows = await this.repo.listarDaFamilia(familiaId);
    return rows.map((e) => ({
      userId: e.userId,
      tipo: e.tipo === TipoEntradaDb.RECORRENTE ? 'recorrente' : 'pontual',
      valorCentavos: paraCentavos(String(e.valor)),
      data: e.data ? e.data.toISOString().slice(0, 10) : null,
    }));
  }

  private async exigirPropria(familiaId: string, userId: string, id: string) {
    const entrada = await this.repo.buscarDoUsuario(familiaId, userId, id);
    // 404 e não 403: quem não pode ver o registro também não deve descobrir que ele existe.
    if (!entrada) throw new NotFoundException('Entrada não encontrada.');
    return entrada;
  }
}

function paraDTO(e: EntradaRow): EntradaDTO {
  return {
    id: e.id,
    userId: e.userId,
    tipo: e.tipo === TipoEntradaDb.RECORRENTE ? 'recorrente' : 'pontual',
    descricao: e.descricao,
    valor: paraReais(paraCentavos(String(e.valor))),
    diaDoMes: e.diaDoMes,
    data: e.data ? e.data.toISOString().slice(0, 10) : null,
  };
}
