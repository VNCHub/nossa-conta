import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { TipoRegra } from '@prisma/client';
import { FamiliasRepository } from './familias.repository';
import { UsersRepository } from '../users/users.repository';
import type { FamiliaDTO, MembroDTO } from '@shared/contratos';

/** Sem I, O, 0 e 1: o código é lido em voz alta e digitado por outra pessoa. */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const REGRAS_PADRAO = [
  {
    nome: 'Meio a meio',
    tipo: TipoRegra.IGUAL,
    descricao: 'Divide igualmente entre quem participa.',
  },
  {
    nome: 'Proporcional à renda',
    tipo: TipoRegra.RENDA,
    descricao: 'Cada um paga na proporção da sua entrada recorrente.',
  },
  {
    nome: 'Proporcional à sobra livre',
    tipo: TipoRegra.SOBRA,
    descricao: 'Proporção da renda recorrente menos os gastos fixos individuais.',
  },
];

@Injectable()
export class FamiliasService {
  constructor(
    private readonly familias: FamiliasRepository,
    private readonly users: UsersRepository,
  ) {}

  private sortearCodigo(nome: string) {
    const prefixo =
      nome
        .toUpperCase()
        .normalize('NFD')
        .replace(/[^A-Z]/g, '')
        .slice(0, 4) || 'CASA';
    const sufixo = Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
    return `${prefixo}-${sufixo}`;
  }

  private async codigoUnico(nome: string) {
    for (let tentativa = 0; tentativa < 10; tentativa++) {
      const codigo = this.sortearCodigo(nome);
      if (!(await this.familias.codigoExiste(codigo))) return codigo;
    }
    throw new ConflictException('Não foi possível gerar um código de convite. Tente de novo.');
  }

  async criar(userId: string, nome: string): Promise<FamiliaDTO> {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) throw new BadRequestException('Dê um nome à família.');

    const user = await this.users.buscarPorId(userId);
    if (user?.familiaId) {
      throw new ConflictException('Você já faz parte de uma família.');
    }

    const familia = await this.familias.criarComCriador({
      nome: nomeLimpo,
      codigoConvite: await this.codigoUnico(nomeLimpo),
      criadaPorId: userId,
      regrasPadrao: REGRAS_PADRAO,
    });
    return this.paraDTO(familia);
  }

  async entrarPorCodigo(userId: string, codigo: string): Promise<FamiliaDTO> {
    const user = await this.users.buscarPorId(userId);
    if (user?.familiaId) {
      throw new ConflictException('Você já faz parte de uma família.');
    }

    const familia = await this.familias.buscarPorCodigo(codigo.trim().toUpperCase());
    if (!familia) throw new NotFoundException('Código de convite não encontrado.');

    await this.users.definirFamilia(userId, familia.id);
    return this.paraDTO(familia);
  }

  async minha(familiaId: string): Promise<FamiliaDTO> {
    const familia = await this.familias.buscarPorId(familiaId);
    if (!familia) throw new NotFoundException('Família não encontrada.');
    return this.paraDTO(familia);
  }

  membros(familiaId: string): Promise<MembroDTO[]> {
    return this.users.listarMembros(familiaId);
  }

  private paraDTO(f: {
    id: string;
    nome: string;
    codigoConvite: string;
    criadaPorId: string;
  }): FamiliaDTO {
    return {
      id: f.id,
      nome: f.nome,
      codigoConvite: f.codigoConvite,
      criadaPorId: f.criadaPorId,
    };
  }
}
