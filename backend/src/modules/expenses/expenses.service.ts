import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseType as ExpenseTypeDb } from '@prisma/client';
import type { ExpenseDTO } from '@shared/contracts';
import type { CategoryId, PaymentMethod } from '@shared/domain';
import type { ExpenseCalc } from '../../domain/split';
import { toCents, toReais } from '../../domain/split';
import { ExpensesRepository, type ExpenseWithShares } from './expenses.repository';
import { UpdateExpenseDto, CreateExpenseDto } from './dto/expenses.dto';
import { UsersRepository } from '../users/users.repository';
import { RulesRepository } from '../rules/rules.repository';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly repo: ExpensesRepository,
    private readonly users: UsersRepository,
    private readonly rules: RulesRepository,
  ) {}

  async list(
    familyId: string,
    filters: { month?: string; userId?: string },
  ): Promise<ExpenseDTO[]> {
    const rows = await this.repo.list(familyId, filters);
    return rows.map(toDTO);
  }

  async create(
    familyId: string,
    userId: string,
    dto: CreateExpenseDto,
  ): Promise<ExpenseDTO> {
    const { participants, ruleId } = await this.validateSplit(familyId, dto);
    const row = await this.repo.create(
      {
        userId,
        familyId,
        date: new Date(`${dto.date}T00:00:00Z`),
        month: dto.date.slice(0, 7),
        paymentMethod: dto.paymentMethod,
        category: dto.category,
        expenseType: dto.expenseType === 'fixed' ? ExpenseTypeDb.FIXED : ExpenseTypeDb.OPTIONAL,
        description: dto.description.trim(),
        amount: dto.amount,
        shared: dto.shared,
        ruleId,
      },
      participants,
    );
    return toDTO(row);
  }

  async update(
    familyId: string,
    userId: string,
    id: string,
    dto: UpdateExpenseDto,
  ): Promise<ExpenseDTO> {
    await this.requireOwn(familyId, userId, id);
    const { participants, ruleId } = await this.validateSplit(familyId, dto);

    const row = await this.repo.update(
      id,
      {
        date: new Date(`${dto.date}T00:00:00Z`),
        month: dto.date.slice(0, 7),
        paymentMethod: dto.paymentMethod,
        category: dto.category,
        expenseType: dto.expenseType === 'fixed' ? ExpenseTypeDb.FIXED : ExpenseTypeDb.OPTIONAL,
        description: dto.description.trim(),
        amount: dto.amount,
        shared: dto.shared,
        ruleId,
      },
      participants,
    );
    return toDTO(row);
  }

  async remove(familyId: string, userId: string, id: string): Promise<void> {
    await this.requireOwn(familyId, userId, id);
    await this.repo.remove(id);
  }

  /** The family's expenses in the split engine's format. */
  async forCalc(familyId: string): Promise<ExpenseCalc[]> {
    const rows = await this.repo.list(familyId);
    return rows.map(toCalc);
  }

  /**
   * Both views of the same row in a single query: `calc` feeds the split engine
   * (cents, no text) and `dto` returns the full expense to the statement.
   */
  async forStatement(
    familyId: string,
  ): Promise<{ calc: ExpenseCalc[]; dto: Map<string, ExpenseDTO> }> {
    const rows = await this.repo.list(familyId);
    return {
      calc: rows.map(toCalc),
      dto: new Map(rows.map((r) => [r.id, toDTO(r)])),
    };
  }

  /**
   * A shared expense is only accepted with participants who belong to this
   * family and a rule that belongs to this family. Without that, someone could
   * push a share onto an outside user or point to another household's rule.
   */
  private async validateSplit(familyId: string, dto: CreateExpenseDto) {
    if (!dto.shared) return { participants: [], ruleId: null };

    if (!dto.participants?.length) {
      throw new BadRequestException('Escolha com quem o gasto será dividido.');
    }

    const members = await this.users.listMembers(familyId);
    const familyIds = new Set(members.map((m) => m.id));
    const outsider = dto.participants.find((p) => !familyIds.has(p));
    if (outsider) {
      throw new BadRequestException('Só é possível dividir com membros da família.');
    }

    const rule = await this.rules.find(familyId, dto.ruleId);
    if (!rule) throw new BadRequestException('Regra de rateio não encontrada.');

    return { participants: dto.participants, ruleId: rule.id };
  }

  private async requireOwn(familyId: string, userId: string, id: string) {
    const expense = await this.repo.find(familyId, id);
    if (!expense) throw new NotFoundException('Gasto não encontrado.');
    // Whoever logged it is who edits it: the expense is the statement that that
    // person paid.
    if (expense.userId !== userId) {
      throw new BadRequestException('Só quem lançou o gasto pode alterá-lo.');
    }
    return expense;
  }
}

const expenseTypeOf = (t: ExpenseTypeDb) => (t === ExpenseTypeDb.FIXED ? 'fixed' : 'optional');

export function toDTO(e: ExpenseWithShares): ExpenseDTO {
  return {
    id: e.id,
    userId: e.userId,
    date: e.date.toISOString().slice(0, 10),
    paymentMethod: e.paymentMethod as PaymentMethod,
    category: e.category as CategoryId,
    expenseType: expenseTypeOf(e.expenseType),
    description: e.description,
    amount: toReais(toCents(String(e.amount))),
    shared: e.shared,
    participants: e.shares.map((s) => s.userId),
    ruleId: e.ruleId,
  };
}

export function toCalc(e: ExpenseWithShares): ExpenseCalc {
  return {
    id: e.id,
    userId: e.userId,
    month: e.month,
    category: e.category,
    expenseType: expenseTypeOf(e.expenseType),
    amountCents: toCents(String(e.amount)),
    shared: e.shared,
    participants: e.shares.map((s) => s.userId),
    ruleId: e.ruleId,
  };
}
