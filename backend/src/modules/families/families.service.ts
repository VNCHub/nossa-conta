import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { RuleType } from '@prisma/client';
import { FamiliesRepository } from './families.repository';
import { UsersRepository } from '../users/users.repository';
import type { FamilyDTO, MemberDTO } from '@shared/contracts';

/** No I, O, 0 or 1: the code is read aloud and typed by another person. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const DEFAULT_RULES = [
  {
    name: 'Meio a meio',
    type: RuleType.EQUAL,
    description: 'Divide igualmente entre quem participa.',
  },
  {
    name: 'Proporcional à renda',
    type: RuleType.INCOME,
    description: 'Cada um paga na proporção da sua entrada recorrente.',
  },
  {
    name: 'Proporcional à sobra livre',
    type: RuleType.SURPLUS,
    description: 'Proporção da renda recorrente menos os gastos fixos individuais.',
  },
];

@Injectable()
export class FamiliesService {
  constructor(
    private readonly families: FamiliesRepository,
    private readonly users: UsersRepository,
  ) {}

  private randomCode(name: string) {
    const prefix =
      name
        .toUpperCase()
        .normalize('NFD')
        .replace(/[^A-Z]/g, '')
        .slice(0, 4) || 'CASA';
    const suffix = Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
    return `${prefix}-${suffix}`;
  }

  private async uniqueCode(name: string) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = this.randomCode(name);
      if (!(await this.families.codeExists(code))) return code;
    }
    throw new ConflictException('Não foi possível gerar um código de convite. Tente de novo.');
  }

  async create(userId: string, name: string): Promise<FamilyDTO> {
    const cleanName = name.trim();
    if (!cleanName) throw new BadRequestException('Dê um nome à família.');

    const user = await this.users.findById(userId);
    if (user?.familyId) {
      throw new ConflictException('Você já faz parte de uma família.');
    }

    const family = await this.families.createWithCreator({
      name: cleanName,
      inviteCode: await this.uniqueCode(cleanName),
      createdById: userId,
      defaultRules: DEFAULT_RULES,
    });
    return this.toDTO(family);
  }

  async joinByCode(userId: string, code: string): Promise<FamilyDTO> {
    const user = await this.users.findById(userId);
    if (user?.familyId) {
      throw new ConflictException('Você já faz parte de uma família.');
    }

    const family = await this.families.findByCode(code.trim().toUpperCase());
    if (!family) throw new NotFoundException('Código de convite não encontrado.');

    await this.users.setFamily(userId, family.id);
    return this.toDTO(family);
  }

  async mine(familyId: string): Promise<FamilyDTO> {
    const family = await this.families.findById(familyId);
    if (!family) throw new NotFoundException('Família não encontrada.');
    return this.toDTO(family);
  }

  members(familyId: string): Promise<MemberDTO[]> {
    return this.users.listMembers(familyId);
  }

  private toDTO(f: {
    id: string;
    name: string;
    inviteCode: string;
    createdById: string;
  }): FamilyDTO {
    return {
      id: f.id,
      name: f.name,
      inviteCode: f.inviteCode,
      createdById: f.createdById,
    };
  }
}
