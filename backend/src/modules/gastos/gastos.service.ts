import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TipoGasto as TipoGastoDb } from '@prisma/client';
import type { GastoDTO } from '@shared/contratos';
import type { CategoriaId, Pagamento } from '@shared/dominio';
import type { GastoCalc } from '../../domain/rateio';
import { paraCentavos, paraReais } from '../../domain/rateio';
import { GastosRepository, type GastoComParticipantes } from './gastos.repository';
import { AtualizarGastoDto, CriarGastoDto } from './dto/gastos.dto';
import { UsersRepository } from '../users/users.repository';
import { RegrasRepository } from '../regras/regras.repository';

@Injectable()
export class GastosService {
  constructor(
    private readonly repo: GastosRepository,
    private readonly users: UsersRepository,
    private readonly regras: RegrasRepository,
  ) {}

  async listar(
    familiaId: string,
    filtros: { mes?: string; userId?: string },
  ): Promise<GastoDTO[]> {
    const rows = await this.repo.listar(familiaId, filtros);
    return rows.map(paraDTO);
  }

  async criar(
    familiaId: string,
    userId: string,
    dto: CriarGastoDto,
  ): Promise<GastoDTO> {
    const { participantes, regraId } = await this.validarRateio(familiaId, dto);
    const row = await this.repo.criar(
      {
        userId,
        familiaId,
        data: new Date(`${dto.data}T00:00:00Z`),
        mes: dto.data.slice(0, 7),
        pagamento: dto.pagamento,
        categoria: dto.categoria,
        tipoGasto: dto.tipoGasto === 'fixo' ? TipoGastoDb.FIXO : TipoGastoDb.OPCIONAL,
        descricao: dto.descricao.trim(),
        valor: dto.valor,
        dividir: dto.dividir,
        regraId,
      },
      participantes,
    );
    return paraDTO(row);
  }

  async atualizar(
    familiaId: string,
    userId: string,
    id: string,
    dto: AtualizarGastoDto,
  ): Promise<GastoDTO> {
    await this.exigirProprio(familiaId, userId, id);
    const { participantes, regraId } = await this.validarRateio(familiaId, dto);

    const row = await this.repo.atualizar(
      id,
      {
        data: new Date(`${dto.data}T00:00:00Z`),
        mes: dto.data.slice(0, 7),
        pagamento: dto.pagamento,
        categoria: dto.categoria,
        tipoGasto: dto.tipoGasto === 'fixo' ? TipoGastoDb.FIXO : TipoGastoDb.OPCIONAL,
        descricao: dto.descricao.trim(),
        valor: dto.valor,
        dividir: dto.dividir,
        regraId,
      },
      participantes,
    );
    return paraDTO(row);
  }

  async remover(familiaId: string, userId: string, id: string): Promise<void> {
    await this.exigirProprio(familiaId, userId, id);
    await this.repo.remover(id);
  }

  /** Gastos da família no formato do motor de rateio. */
  async paraCalculo(familiaId: string): Promise<GastoCalc[]> {
    const rows = await this.repo.listar(familiaId);
    return rows.map(paraCalc);
  }

  /**
   * As duas visões da mesma linha em uma só consulta: `calc` alimenta o motor de
   * rateio (centavos, sem texto) e `dto` devolve o gasto completo ao relatório.
   */
  async paraRelatorio(
    familiaId: string,
  ): Promise<{ calc: GastoCalc[]; dto: Map<string, GastoDTO> }> {
    const rows = await this.repo.listar(familiaId);
    return {
      calc: rows.map(paraCalc),
      dto: new Map(rows.map((r) => [r.id, paraDTO(r)])),
    };
  }

  /**
   * Um gasto dividido só é aceito com participantes que estão nesta família e
   * uma regra que pertence a esta família. Sem isso, alguém poderia empurrar
   * cota para um usuário de fora ou apontar para a regra de outra casa.
   */
  private async validarRateio(familiaId: string, dto: CriarGastoDto) {
    if (!dto.dividir) return { participantes: [], regraId: null };

    if (!dto.participantes?.length) {
      throw new BadRequestException('Escolha com quem o gasto será dividido.');
    }

    const membros = await this.users.listarMembros(familiaId);
    const idsDaFamilia = new Set(membros.map((m) => m.id));
    const forasteiro = dto.participantes.find((p) => !idsDaFamilia.has(p));
    if (forasteiro) {
      throw new BadRequestException('Só é possível dividir com membros da família.');
    }

    const regra = await this.regras.buscar(familiaId, dto.regraId);
    if (!regra) throw new BadRequestException('Regra de rateio não encontrada.');

    return { participantes: dto.participantes, regraId: regra.id };
  }

  private async exigirProprio(familiaId: string, userId: string, id: string) {
    const gasto = await this.repo.buscar(familiaId, id);
    if (!gasto) throw new NotFoundException('Gasto não encontrado.');
    // Quem lançou é quem edita: o gasto é a declaração de que aquela pessoa pagou.
    if (gasto.userId !== userId) {
      throw new BadRequestException('Só quem lançou o gasto pode alterá-lo.');
    }
    return gasto;
  }
}

const tipoGastoDe = (t: TipoGastoDb) => (t === TipoGastoDb.FIXO ? 'fixo' : 'opcional');

export function paraDTO(g: GastoComParticipantes): GastoDTO {
  return {
    id: g.id,
    userId: g.userId,
    data: g.data.toISOString().slice(0, 10),
    pagamento: g.pagamento as Pagamento,
    categoria: g.categoria as CategoriaId,
    tipoGasto: tipoGastoDe(g.tipoGasto),
    descricao: g.descricao,
    valor: paraReais(paraCentavos(String(g.valor))),
    dividir: g.dividir,
    participantes: g.participantes.map((p) => p.userId),
    regraId: g.regraId,
  };
}

export function paraCalc(g: GastoComParticipantes): GastoCalc {
  return {
    id: g.id,
    userId: g.userId,
    mes: g.mes,
    categoria: g.categoria,
    tipoGasto: tipoGastoDe(g.tipoGasto),
    valorCentavos: paraCentavos(String(g.valor)),
    dividir: g.dividir,
    participantes: g.participantes.map((p) => p.userId),
    regraId: g.regraId,
  };
}
