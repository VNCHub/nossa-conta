import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const COM_PARTICIPANTES = {
  participantes: { select: { userId: true } },
} satisfies Prisma.GastoInclude;

export type GastoComParticipantes = Prisma.GastoGetPayload<{
  include: typeof COM_PARTICIPANTES;
}>;

@Injectable()
export class GastosRepository {
  constructor(private readonly prisma: PrismaService) {}

  listar(familiaId: string, filtros: { mes?: string; userId?: string } = {}) {
    return this.prisma.gasto.findMany({
      where: { familiaId, mes: filtros.mes, userId: filtros.userId },
      include: COM_PARTICIPANTES,
      orderBy: [{ data: 'asc' }, { createdAt: 'asc' }],
    });
  }

  buscar(familiaId: string, id: string) {
    return this.prisma.gasto.findFirst({
      where: { id, familiaId },
      include: COM_PARTICIPANTES,
    });
  }

  criar(data: Prisma.GastoUncheckedCreateInput, participantes: string[]) {
    return this.prisma.gasto.create({
      data: {
        ...data,
        participantes: { create: participantes.map((userId) => ({ userId })) },
      },
      include: COM_PARTICIPANTES,
    });
  }

  /** Troca os participantes por inteiro: é mais simples de acertar que um diff. */
  atualizar(
    id: string,
    data: Prisma.GastoUncheckedUpdateInput,
    participantes: string[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.gastoParticipante.deleteMany({ where: { gastoId: id } });
      return tx.gasto.update({
        where: { id },
        data: {
          ...data,
          participantes: { create: participantes.map((userId) => ({ userId })) },
        },
        include: COM_PARTICIPANTES,
      });
    });
  }

  remover(id: string) {
    return this.prisma.gasto.delete({ where: { id } });
  }
}
