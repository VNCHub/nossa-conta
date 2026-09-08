import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { RuleType } from '@prisma/client';
import { FamiliesRepository } from './families.repository';
import { UsersRepository } from '../users/users.repository';
import type { FamilyDTO, MemberDTO } from '@shared/contracts';
import { currentMonth } from '@shared/format';

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

  async rename(familyId: string, userId: string, name: string): Promise<FamilyDTO> {
    await this.requireCreator(familyId, userId);
    const cleanName = name.trim();
    if (!cleanName) throw new BadRequestException('Dê um nome à família.');
    return this.toDTO(await this.families.updateName(familyId, cleanName));
  }

  async removeMember(familyId: string, userId: string, memberId: string): Promise<void> {
    await this.requireCreator(familyId, userId);
    if (memberId === userId) {
      throw new BadRequestException(
        'Você criou a família. Para sair, use "Sair da família" ou desfaça a família.',
      );
    }
    const removed = await this.families.removeMember(familyId, memberId, currentMonth());
    if (!removed) throw new NotFoundException('Membro não encontrado nesta família.');
  }

  async dissolve(familyId: string, userId: string): Promise<void> {
    await this.requireCreator(familyId, userId);
    await this.families.deleteFamily(familyId);
  }

  async leave(familyId: string, userId: string): Promise<void> {
    const family = await this.requireFamily(familyId);

    // Whoever created the family owns a reference every other member relies on.
    // Before they leave it moves to the oldest remaining member; if there is
    // nobody left, leaving is the same as dissolving.
    if (family.createdById === userId) {
      const members = await this.users.listMembers(familyId);
      const heir = members.find((m) => m.id !== userId);
      if (!heir) {
        await this.families.deleteFamily(familyId);
        return;
      }
      await this.families.transferOwnership(familyId, heir.id);
    }

    const left = await this.families.removeMember(familyId, userId, currentMonth());
    if (!left) throw new NotFoundException('Você não faz parte desta família.');
  }

  private async requireFamily(familyId: string) {
    const family = await this.families.findById(familyId);
    if (!family) throw new NotFoundException('Família não encontrada.');
    return family;
  }

  private async requireCreator(familyId: string, userId: string) {
    const family = await this.requireFamily(familyId);
    if (family.createdById !== userId) {
      throw new ForbiddenException('Só quem criou a família pode fazer isso.');
    }
    return family;
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
