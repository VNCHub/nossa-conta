import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TipoRegra as TipoRegraDb } from '@prisma/client';
import { DESCRICAO_PADRAO_REGRA, type TipoRegra } from '@shared/dominio';
import type { RegraDTO } from '@shared/contratos';
import type { RegraCalc } from '../../domain/rateio';
import { RegrasRepository, type RegraCompleta } from './regras.repository';
import { UsersRepository } from '../users/users.repository';
import {
  CriarRegraDto,
  DefinirMedicoesDto,
  DefinirPesosDto,
} from './dto/regras.dto';

@Injectable()
export class RegrasService {
  constructor(
    private readonly repo: RegrasRepository,
    private readonly users: UsersRepository,
  ) {}

  async listar(familiaId: string): Promise<RegraDTO[]> {
    const [regras, usos] = await Promise.all([
      this.repo.listar(familiaId),
      this.repo.contarUsosPorRegra(familiaId),
    ]);
    const porRegra = new Map(usos.map((u) => [u.regraId, u._count._all]));
    return regras.map((r) => paraDTO(r, porRegra.get(r.id) ?? 0));
  }

  async criar(familiaId: string, dto: CriarRegraDto): Promise<RegraDTO> {
    const row = await this.repo.criar({
      familiaId,
      nome: dto.nome.trim(),
      tipo: dto.tipo.toUpperCase() as TipoRegraDb,
      descricao:
        dto.tipo === 'medidor'
          ? `Todo mês cada um lança seu ${dto.unidade}; o sistema converte em percentual.`
          : DESCRICAO_PADRAO_REGRA[dto.tipo],
      unidade: dto.tipo === 'medidor' ? dto.unidade!.trim() : null,
    });
    return paraDTO(row, 0);
  }

  async remover(familiaId: string, id: string): Promise<void> {
    await this.exigir(familiaId, id);

    // Excluir uma regra em uso reabriria o rateio de meses já acertados: os
    // gastos cairiam para divisão igual e os saldos do passado mudariam sozinhos.
    const emUso = await this.repo.contarUsos(familiaId, id);
    if (emUso > 0) {
      throw new ConflictException(
        `Esta regra está em ${emUso} gasto(s). Troque a regra desses gastos antes de excluí-la.`,
      );
    }
    if ((await this.repo.contar(familiaId)) <= 1) {
      throw new ConflictException('A família precisa de ao menos uma regra de rateio.');
    }
    await this.repo.remover(id);
  }

  async definirPesos(
    familiaId: string,
    id: string,
    dto: DefinirPesosDto,
  ): Promise<RegraDTO> {
    const regra = await this.exigir(familiaId, id);
    if (regra.tipo !== TipoRegraDb.FIXO) {
      throw new BadRequestException('Só regras de percentual fixo aceitam pesos.');
    }
    await this.exigirMembros(
      familiaId,
      dto.pesos.map((p) => p.userId),
    );

    const row = await this.repo.definirPesos(id, dto.pesos);
    return paraDTO(row, await this.repo.contarUsos(familiaId, id));
  }

  async definirMedicoes(
    familiaId: string,
    id: string,
    mes: string,
    dto: DefinirMedicoesDto,
  ): Promise<RegraDTO> {
    const regra = await this.exigir(familiaId, id);
    if (regra.tipo !== TipoRegraDb.MEDIDOR) {
      throw new BadRequestException('Só regras de medidor aceitam medições.');
    }
    await this.exigirMembros(
      familiaId,
      dto.medicoes.map((m) => m.userId),
    );

    const row = await this.repo.definirMedicoes(id, mes, dto.medicoes);
    return paraDTO(row, await this.repo.contarUsos(familiaId, id));
  }

  /** Regras da família no formato do motor de rateio. */
  async paraCalculo(familiaId: string): Promise<RegraCalc[]> {
    const regras = await this.repo.listar(familiaId);
    return regras.map(paraCalc);
  }

  private async exigir(familiaId: string, id: string) {
    const regra = await this.repo.buscar(familiaId, id);
    if (!regra) throw new NotFoundException('Regra de rateio não encontrada.');
    return regra;
  }

  private async exigirMembros(familiaId: string, userIds: string[]) {
    const membros = await this.users.listarMembros(familiaId);
    const ids = new Set(membros.map((m) => m.id));
    if (userIds.some((u) => !ids.has(u))) {
      throw new BadRequestException('Só membros da família entram no rateio.');
    }
  }
}

const tipoDe = (t: TipoRegraDb): TipoRegra => t.toLowerCase() as TipoRegra;

export function paraDTO(r: RegraCompleta, emUso: number): RegraDTO {
  const dto: RegraDTO = {
    id: r.id,
    nome: r.nome,
    tipo: tipoDe(r.tipo),
    descricao: r.descricao,
    unidade: r.unidade,
    emUso,
  };
  if (r.tipo === TipoRegraDb.FIXO) {
    dto.pesos = Object.fromEntries(r.pesos.map((p) => [p.userId, Number(p.percentual)]));
  }
  if (r.tipo === TipoRegraDb.MEDIDOR) {
    const medicoes: Record<string, Record<string, number>> = {};
    for (const m of r.medicoes) {
      (medicoes[m.mes] ??= {})[m.userId] = Number(m.valor);
    }
    dto.medicoes = medicoes;
  }
  return dto;
}

export function paraCalc(r: RegraCompleta): RegraCalc {
  const calc: RegraCalc = { id: r.id, tipo: tipoDe(r.tipo) };
  if (r.tipo === TipoRegraDb.FIXO) {
    calc.pesos = Object.fromEntries(r.pesos.map((p) => [p.userId, Number(p.percentual)]));
  }
  if (r.tipo === TipoRegraDb.MEDIDOR) {
    const medicoes: Record<string, Record<string, number>> = {};
    for (const m of r.medicoes) {
      (medicoes[m.mes] ??= {})[m.userId] = Number(m.valor);
    }
    calc.medicoes = medicoes;
  }
  return calc;
}
