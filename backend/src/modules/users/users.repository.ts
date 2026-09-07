import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarPorId(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  buscarPorEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  criar(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  /** Membros de uma família — sempre escopado, nunca lista global de usuários. */
  listarMembros(familiaId: string) {
    return this.prisma.user.findMany({
      where: { familiaId },
      select: { id: true, nome: true, email: true, cor: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  contarNaFamilia(familiaId: string) {
    return this.prisma.user.count({ where: { familiaId } });
  }

  definirFamilia(userId: string, familiaId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { familiaId } });
  }
}
