import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseType as ExpenseTypeDb, RecordSource as RecordSourceDb } from '@prisma/client';
import type { ExpenseDTO } from '@shared/contracts';
import type { CategoryId, PaymentMethod, RecordSource } from '@shared/domain';
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
    const date = dto.date ?? isoToday();
    const row = await this.repo.create(
      {
        userId,
        familyId,
        date: new Date(`${date}T00:00:00Z`),
        month: date.slice(0, 7),
        paymentMethod: dto.paymentMethod ?? null,
        category: dto.category ?? null,
        expenseType: toDbExpenseType(dto.expenseType),
        description: dto.description?.trim() ?? '',
        amount: dto.amount ?? null,
        shared: dto.shared ?? false,
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
    const existing = await this.requireOwn(familyId, userId, id);
    const { participants, ruleId } = await this.validateSplit(familyId, dto);
    const date = dto.date ?? existing.date.toISOString().slice(0, 10);

    const row = await this.repo.update(
      id,
      {
        date: new Date(`${date}T00:00:00Z`),
        month: date.slice(0, 7),
        paymentMethod: dto.paymentMethod ?? null,
        category: dto.category ?? null,
        expenseType: toDbExpenseType(dto.expenseType),
        description: dto.description?.trim() ?? '',
        amount: dto.amount ?? null,
        shared: dto.shared ?? false,
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

  /** The family's expenses in the split engine's format — incomplete ones can't be rated yet. */
  async forCalc(familyId: string): Promise<ExpenseCalc[]> {
    const rows = await this.repo.list(familyId);
    return rows.filter(isComplete).map(toCalc);
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
      calc: rows.filter(isComplete).map(toCalc),
      dto: new Map(rows.map((r) => [r.id, toDTO(r)])),
    };
  }

  /**
   * Participants must belong to this family and a chosen rule must belong to
   * this family — without that, someone could push a share onto an outside
   * user or point to another household's rule. Both are optional, though: an
   * expense marked "shared" without them yet is simply incomplete.
   */
  private async validateSplit(familyId: string, dto: CreateExpenseDto) {
    if (!dto.shared) return { participants: [], ruleId: null };

    const participants = dto.participants ?? [];
    if (participants.length) {
      const members = await this.users.listMembers(familyId);
      const familyIds = new Set(members.map((m) => m.id));
      const outsider = participants.find((p) => !familyIds.has(p));
      if (outsider) {
        throw new BadRequestException('Só é possível dividir com membros da família.');
      }
    }

    let ruleId: string | null = null;
    if (dto.ruleId) {
      const rule = await this.rules.find(familyId, dto.ruleId);
      if (!rule) throw new BadRequestException('Regra de rateio não encontrada.');
      ruleId = rule.id;
    }

    return { participants, ruleId };
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

const isoToday = () => new Date().toISOString().slice(0, 10);

const expenseTypeOf = (t: ExpenseTypeDb | null) =>
  t === null
    ? null
    : t === ExpenseTypeDb.FIXED
      ? 'fixed'
      : t === ExpenseTypeDb.OPTIONAL
        ? 'optional'
        : 'oneOff';

const toDbExpenseType = (t: string | null | undefined) =>
  t === 'fixed'
    ? ExpenseTypeDb.FIXED
    : t === 'optional'
      ? ExpenseTypeDb.OPTIONAL
      : t === 'oneOff'
        ? ExpenseTypeDb.ONE_OFF
        : null;

/**
 * Whether every field needed to count this expense in a statement is filled
 * in — surfaced to the UI so an incomplete entry can be flagged and finished.
 */
export function isComplete(e: ExpenseWithShares): boolean {
  if (
    !e.paymentMethod ||
    !e.category ||
    !e.expenseType ||
    !e.description.trim() ||
    e.amount === null ||
    Number(e.amount) <= 0
  ) {
    return false;
  }
  return !e.shared || (!!e.ruleId && e.shares.length > 0);
}

export function toDTO(e: ExpenseWithShares): ExpenseDTO {
  return {
    id: e.id,
    userId: e.userId,
    date: e.date.toISOString().slice(0, 10),
    paymentMethod: e.paymentMethod as PaymentMethod | null,
    category: e.category as CategoryId | null,
    expenseType: expenseTypeOf(e.expenseType),
    description: e.description,
    amount: e.amount === null ? 0 : toReais(toCents(String(e.amount))),
    shared: e.shared,
    participants: e.shares.map((s) => s.userId),
    ruleId: e.ruleId,
    complete: isComplete(e),
    source: recordSourceOf(e.source),
    importedFileId: e.importedFileId,
  };
}

const recordSourceOf = (s: RecordSourceDb): RecordSource =>
  s === RecordSourceDb.IMPORT ? 'import' : 'manual';

/** Only called on rows that already passed {@link isComplete}, so the non-null fields are safe. */
export function toCalc(e: ExpenseWithShares): ExpenseCalc {
  return {
    id: e.id,
    userId: e.userId,
    month: e.month,
    category: e.category!,
    expenseType: expenseTypeOf(e.expenseType)!,
    amountCents: toCents(String(e.amount)),
    shared: e.shared,
    participants: e.shares.map((s) => s.userId),
    ruleId: e.ruleId,
  };
}
