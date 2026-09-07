import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RuleType as RuleTypeDb } from '@prisma/client';
import { DEFAULT_RULE_DESCRIPTION, type RuleType } from '@shared/domain';
import type { RuleDTO } from '@shared/contracts';
import type { RuleCalc } from '../../domain/split';
import { RulesRepository, type FullRule } from './rules.repository';
import { UsersRepository } from '../users/users.repository';
import {
  CreateRuleDto,
  SetMeasurementsDto,
  SetWeightsDto,
} from './dto/rules.dto';

@Injectable()
export class RulesService {
  constructor(
    private readonly repo: RulesRepository,
    private readonly users: UsersRepository,
  ) {}

  async list(familyId: string): Promise<RuleDTO[]> {
    const [rules, uses] = await Promise.all([
      this.repo.list(familyId),
      this.repo.countUsesByRule(familyId),
    ]);
    const byRule = new Map(uses.map((u) => [u.ruleId, u._count._all]));
    return rules.map((r) => toDTO(r, byRule.get(r.id) ?? 0));
  }

  async create(familyId: string, dto: CreateRuleDto): Promise<RuleDTO> {
    const row = await this.repo.create({
      familyId,
      name: dto.name.trim(),
      type: dto.type.toUpperCase() as RuleTypeDb,
      description:
        dto.type === 'meter'
          ? `Todo mês cada um lança seu ${dto.unit}; o sistema converte em percentual.`
          : DEFAULT_RULE_DESCRIPTION[dto.type],
      unit: dto.type === 'meter' ? dto.unit!.trim() : null,
    });
    return toDTO(row, 0);
  }

  async remove(familyId: string, id: string): Promise<void> {
    await this.require(familyId, id);

    // Deleting a rule in use would reopen the split of already-settled months:
    // the expenses would fall back to equal division and past balances would
    // change on their own.
    const inUse = await this.repo.countUses(familyId, id);
    if (inUse > 0) {
      throw new ConflictException(
        `Esta regra está em ${inUse} gasto(s). Troque a regra desses gastos antes de excluí-la.`,
      );
    }
    if ((await this.repo.count(familyId)) <= 1) {
      throw new ConflictException('A família precisa de ao menos uma regra de rateio.');
    }
    await this.repo.remove(id);
  }

  async setWeights(
    familyId: string,
    id: string,
    dto: SetWeightsDto,
  ): Promise<RuleDTO> {
    const rule = await this.require(familyId, id);
    if (rule.type !== RuleTypeDb.FIXED) {
      throw new BadRequestException('Só regras de percentual fixo aceitam pesos.');
    }
    await this.requireMembers(
      familyId,
      dto.weights.map((w) => w.userId),
    );

    const row = await this.repo.setWeights(id, dto.weights);
    return toDTO(row, await this.repo.countUses(familyId, id));
  }

  async setMeasurements(
    familyId: string,
    id: string,
    month: string,
    dto: SetMeasurementsDto,
  ): Promise<RuleDTO> {
    const rule = await this.require(familyId, id);
    if (rule.type !== RuleTypeDb.METER) {
      throw new BadRequestException('Só regras de medidor aceitam medições.');
    }
    await this.requireMembers(
      familyId,
      dto.measurements.map((m) => m.userId),
    );

    const row = await this.repo.setMeasurements(id, month, dto.measurements);
    return toDTO(row, await this.repo.countUses(familyId, id));
  }

  /** The family's rules in the split engine's format. */
  async forCalc(familyId: string): Promise<RuleCalc[]> {
    const rules = await this.repo.list(familyId);
    return rules.map(toCalc);
  }

  private async require(familyId: string, id: string) {
    const rule = await this.repo.find(familyId, id);
    if (!rule) throw new NotFoundException('Regra de rateio não encontrada.');
    return rule;
  }

  private async requireMembers(familyId: string, userIds: string[]) {
    const members = await this.users.listMembers(familyId);
    const ids = new Set(members.map((m) => m.id));
    if (userIds.some((u) => !ids.has(u))) {
      throw new BadRequestException('Só membros da família entram no rateio.');
    }
  }
}

const typeOf = (t: RuleTypeDb): RuleType => t.toLowerCase() as RuleType;

export function toDTO(r: FullRule, inUse: number): RuleDTO {
  const dto: RuleDTO = {
    id: r.id,
    name: r.name,
    type: typeOf(r.type),
    description: r.description,
    unit: r.unit,
    inUse,
  };
  if (r.type === RuleTypeDb.FIXED) {
    dto.weights = Object.fromEntries(r.weights.map((w) => [w.userId, Number(w.percent)]));
  }
  if (r.type === RuleTypeDb.METER) {
    const measurements: Record<string, Record<string, number>> = {};
    for (const m of r.measurements) {
      (measurements[m.month] ??= {})[m.userId] = Number(m.amount);
    }
    dto.measurements = measurements;
  }
  return dto;
}

export function toCalc(r: FullRule): RuleCalc {
  const calc: RuleCalc = { id: r.id, type: typeOf(r.type) };
  if (r.type === RuleTypeDb.FIXED) {
    calc.weights = Object.fromEntries(r.weights.map((w) => [w.userId, Number(w.percent)]));
  }
  if (r.type === RuleTypeDb.METER) {
    const measurements: Record<string, Record<string, number>> = {};
    for (const m of r.measurements) {
      (measurements[m.month] ??= {})[m.userId] = Number(m.amount);
    }
    calc.measurements = measurements;
  }
  return calc;
}
