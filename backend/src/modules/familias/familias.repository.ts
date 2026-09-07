import { Injectable } from '@nestjs/common';
import { Prisma, TipoRegra } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FamiliasRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarPorId(id: string) {
    return this.prisma.familia.findUnique({ where: { id } });
  }

  buscarPorCodigo(codigo: string) {
    return this.prisma.familia.findUnique({ where: { codigoConvite: codigo } });
  }

  codigoExiste(codigo: string) {
    return this.prisma.familia
      .count({ where: { codigoConvite: codigo } })
      .then((n) => n > 0);
  }

  /**
   * Cria a família, vincula o criador e já deixa as regras de rateio que não
   * exigem configuração — sem elas o formulário de gasto abriria sem opção de
   * divisão. Tudo numa transação: família sem regra nenhuma é estado inválido.
   */
  criarComCriador(input: {
    nome: string;
    codigoConvite: string;
    criadaPorId: string;
    regrasPadrao: { nome: string; tipo: TipoRegra; descricao: string }[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const familia = await tx.familia.create({
        data: {
          nome: input.nome,
          codigoConvite: input.codigoConvite,
          criadaPorId: input.criadaPorId,
          regras: { create: input.regrasPadrao },
        },
      });
      await tx.user.update({
        where: { id: input.criadaPorId },
        data: { familiaId: familia.id },
      });
      return familia;
    });
  }

  atualizar(id: string, data: Prisma.FamiliaUpdateInput) {
    return this.prisma.familia.update({ where: { id }, data });
  }
}
