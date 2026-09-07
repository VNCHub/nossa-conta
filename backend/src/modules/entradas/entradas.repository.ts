import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Toda leitura de entrada é escopada por família: o parâmetro familiaId é
 * obrigatório em cada método, então não existe caminho que devolva dado de
 * outra família por esquecimento de filtro.
 */
@Injectable()
export class EntradasRepository {
  constructor(private readonly prisma: PrismaService) {}

  listarDaFamilia(familiaId: string) {
    return this.prisma.entrada.findMany({
      where: { user: { familiaId } },
      orderBy: [{ tipo: 'asc' }, { createdAt: 'asc' }],
    });
  }

  listarDoUsuario(familiaId: string, userId: string) {
    return this.prisma.entrada.findMany({
      where: { userId, user: { familiaId } },
      orderBy: [{ tipo: 'asc' }, { createdAt: 'asc' }],
    });
  }

  buscarDoUsuario(familiaId: string, userId: string, id: string) {
    return this.prisma.entrada.findFirst({
      where: { id, userId, user: { familiaId } },
    });
  }

  criar(data: Prisma.EntradaUncheckedCreateInput) {
    return this.prisma.entrada.create({ data });
  }

  atualizar(id: string, data: Prisma.EntradaUncheckedUpdateInput) {
    return this.prisma.entrada.update({ where: { id }, data });
  }

  remover(id: string) {
    return this.prisma.entrada.delete({ where: { id } });
  }
}
