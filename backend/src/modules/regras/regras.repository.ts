import { Injectable } from '@nestjs/common';
import { Prisma, TipoRegra } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const COMPLETA = {
  pesos: { select: { userId: true, percentual: true } },
  medicoes: { select: { userId: true, mes: true, valor: true } },
} satisfies Prisma.RegraRateioInclude;

export type RegraCompleta = Prisma.RegraRateioGetPayload<{ include: typeof COMPLETA }>;

@Injectable()
export class RegrasRepository {
  constructor(private readonly prisma: PrismaService) {}

  listar(familiaId: string) {
    return this.prisma.regraRateio.findMany({
      where: { familiaId },
      include: COMPLETA,
      orderBy: { createdAt: 'asc' },
    });
  }

  buscar(familiaId: string, id: string) {
    return this.prisma.regraRateio.findFirst({
      where: { id, familiaId },
      include: COMPLETA,
    });
  }

  contar(familiaId: string) {
    return this.prisma.regraRateio.count({ where: { familiaId } });
  }

  criar(data: Prisma.RegraRateioUncheckedCreateInput) {
    return this.prisma.regraRateio.create({ data, include: COMPLETA });
  }

  remover(id: string) {
    return this.prisma.regraRateio.delete({ where: { id } });
  }

  /** Substitui todos os percentuais da regra de uma vez. */
  definirPesos(regraId: string, pesos: { userId: string; percentual: number }[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.regraPeso.deleteMany({ where: { regraId } });
      if (pesos.length) {
        await tx.regraPeso.createMany({
          data: pesos.map((p) => ({ regraId, ...p })),
        });
      }
      return tx.regraRateio.findUniqueOrThrow({
        where: { id: regraId },
        include: COMPLETA,
      });
    });
  }

  /** Substitui as medições de um mês, preservando os demais meses. */
  definirMedicoes(
    regraId: string,
    mes: string,
    medicoes: { userId: string; valor: number }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.regraMedicao.deleteMany({ where: { regraId, mes } });
      if (medicoes.length) {
        await tx.regraMedicao.createMany({
          data: medicoes.map((m) => ({ regraId, mes, ...m })),
        });
      }
      return tx.regraRateio.findUniqueOrThrow({
        where: { id: regraId },
        include: COMPLETA,
      });
    });
  }

  /**
   * Quantos gastos usam a regra. Mora aqui, e não em GastosRepository, para que
   * o módulo de regras não precise importar o de gastos — que já importa este.
   */
  contarUsos(familiaId: string, regraId: string) {
    return this.prisma.gasto.count({ where: { familiaId, regraId } });
  }

  contarUsosPorRegra(familiaId: string) {
    return this.prisma.gasto.groupBy({
      by: ['regraId'],
      where: { familiaId, regraId: { not: null } },
      _count: { _all: true },
    });
  }

  tipoDe(tipo: string): TipoRegra {
    return tipo.toUpperCase() as TipoRegra;
  }
}
