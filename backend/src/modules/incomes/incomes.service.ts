import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IncomeType as IncomeTypeDb, RecordSource as RecordSourceDb } from '@prisma/client';
import type { IncomeDTO } from '@shared/contracts';
import type { RecordSource } from '@shared/domain';
import { currentMonth } from '@shared/format';
import type { IncomeCalc } from '../../domain/split';
import { incomeForMonth, toCents, toReais } from '../../domain/split';
import { MonthLocksService, lockedError } from '../months/month-locks.service';
import { IncomesRepository } from './incomes.repository';
import { UpdateIncomeDto, CreateIncomeDto } from './dto/incomes.dto';

type IncomeRow = {
  id: string;
  userId: string;
  type: IncomeTypeDb;
  description: string;
  amount: unknown;
  dayOfMonth: number | null;
  since: string | null;
  until: string | null;
  date: Date | null;
  source: RecordSourceDb;
  importedFileId: string | null;
  debtPaymentId: string | null;
};

@Injectable()
export class IncomesService {
  constructor(
    private readonly repo: IncomesRepository,
    private readonly locks: MonthLocksService,
  ) {}

  async listMine(familyId: string, userId: string): Promise<IncomeDTO[]> {
    const rows = await this.repo.listForUser(familyId, userId);
    return rows.map(toDTO);
  }

  async create(
    familyId: string,
    userId: string,
    dto: CreateIncomeDto,
  ): Promise<IncomeDTO> {
    const recurring = dto.type === 'recurring';
    const since = recurring ? (dto.since ?? currentMonth()) : null;
    const until = recurring ? (dto.until ?? null) : null;
    if (since && until && until < since) {
      throw new BadRequestException('O mês final não pode ser antes do mês inicial.');
    }

    await this.assertLockedMonthsUntouched(familyId, userId, null, {
      type: recurring ? 'recurring' : 'oneOff',
      amount: dto.amount,
      since,
      until,
      date: recurring ? null : (dto.date ?? null),
    });

    const row = await this.repo.create({
      userId,
      type: recurring ? IncomeTypeDb.RECURRING : IncomeTypeDb.ONE_OFF,
      description: dto.description.trim(),
      amount: dto.amount,
      dayOfMonth: recurring ? (dto.dayOfMonth ?? 1) : null,
      since,
      until,
      date: recurring ? null : new Date(`${dto.date}T00:00:00Z`),
    });
    return toDTO(row as IncomeRow);
  }

  async update(
    familyId: string,
    userId: string,
    id: string,
    dto: UpdateIncomeDto,
  ): Promise<IncomeDTO> {
    const current = await this.requireOwn(familyId, userId, id);
    assertNotDebtReceipt(current);
    const recurring = current.type === IncomeTypeDb.RECURRING;

    // Two ways to drop just one month without a gap in the middle: end the
    // recurrence here (`until` moves back, keeping everything before) when
    // there is history before this month, or skip it (`since` moves forward,
    // keeping everything after) when this is the first month it ever counted.
    // Either one landing past the other side leaves no month at all — the
    // caller should remove the entry entirely instead.
    //
    // `?? current.x` would be wrong here: an explicit `null` (reopening a
    // previously ended recurrence) is a real, different value from "omitted"
    // — falling back to `current.x` for either one would validate against a
    // final state that isn't the one actually about to be written below.
    const nextSince = dto.since !== undefined ? dto.since : current.since;
    const nextUntil = dto.until !== undefined ? dto.until : current.until;
    if (recurring && nextSince && nextUntil && nextUntil < nextSince) {
      throw new BadRequestException(
        'Isso não deixaria nenhum mês em que essa entrada valeria — remova a entrada inteira em vez de encerrá-la.',
      );
    }

    await this.assertLockedMonthsUntouched(familyId, userId, shapeOf(current), {
      type: recurring ? 'recurring' : 'oneOff',
      amount: dto.amount ?? Number(current.amount),
      since: nextSince,
      until: nextUntil,
      date: recurring ? null : (dto.date ?? shapeOf(current).date),
    });

    const row = await this.repo.update(id, {
      description: dto.description?.trim(),
      amount: dto.amount,
      // The type does not change after creation: swapping recurring for one-off
      // would retroactively change the split of every closed month.
      dayOfMonth: recurring ? dto.dayOfMonth : undefined,
      since: recurring ? dto.since : undefined,
      until: recurring ? dto.until : undefined,
      date: !recurring && dto.date ? new Date(`${dto.date}T00:00:00Z`) : undefined,
    });
    return toDTO(row as IncomeRow);
  }

  async remove(familyId: string, userId: string, id: string): Promise<void> {
    const current = await this.requireOwn(familyId, userId, id);
    assertNotDebtReceipt(current);
    await this.assertLockedMonthsUntouched(familyId, userId, shapeOf(current), null);
    await this.repo.remove(id);
  }

  /**
   * An income can span many months, so "is it in a finalized month" is the
   * wrong question for a recurring one: a salary running since January must
   * still be endable in October with September finalized. What matters is
   * whether any finalized month would count a different amount afterwards.
   * A one-off is simpler and stricter — any edit to it, description included,
   * waits until its month is reopened, same as an expense.
   */
  private async assertLockedMonthsUntouched(
    familyId: string,
    userId: string,
    before: IncomeShape | null,
    after: IncomeShape | null,
  ): Promise<void> {
    const finalized = await this.locks.monthsFinalizedBy(familyId, userId);
    if (!finalized.length) return;

    const oneOffMonths = [before, after]
      .filter((i): i is IncomeShape => i?.type === 'oneOff')
      .map((i) => (i.date ?? '').slice(0, 7));
    const amountIn = (i: IncomeShape | null, month: string) =>
      i ? incomeForMonth([calcOf(userId, i)], userId, month) : 0;

    const locked = finalized.filter(
      (m) => oneOffMonths.includes(m) || amountIn(before, m) !== amountIn(after, m),
    );
    if (locked.length) throw lockedError(locked.sort());
  }

  /** The whole family's incomes, in the split engine's format. */
  async forCalc(familyId: string): Promise<IncomeCalc[]> {
    const rows = await this.repo.listForFamily(familyId);
    return rows.map((i) => ({
      userId: i.userId,
      type: i.type === IncomeTypeDb.RECURRING ? 'recurring' : 'oneOff',
      amountCents: toCents(String(i.amount)),
      date: i.date ? i.date.toISOString().slice(0, 10) : null,
      since: i.since,
      until: i.until,
      debtReceipt: i.debtPaymentId !== null,
    }));
  }

  /** Earliest month with any income for the family — recurring counts from its declared `since`. */
  earliestMonth(familyId: string): Promise<string | null> {
    return this.repo.earliestMonth(familyId);
  }

  private async requireOwn(familyId: string, userId: string, id: string) {
    const income = await this.repo.findForUser(familyId, userId, id);
    // 404, not 403: whoever cannot see the record should not learn it exists.
    if (!income) throw new NotFoundException('Entrada não encontrada.');
    return income;
  }
}

/** The fields that decide how much an income counts in each month. */
type IncomeShape = {
  type: 'recurring' | 'oneOff';
  amount: number;
  since: string | null;
  until: string | null;
  /** YYYY-MM-DD */
  date: string | null;
};

const shapeOf = (i: IncomeRow): IncomeShape => ({
  type: i.type === IncomeTypeDb.RECURRING ? 'recurring' : 'oneOff',
  amount: Number(i.amount),
  since: i.since,
  until: i.until,
  date: i.date ? i.date.toISOString().slice(0, 10) : null,
});

const calcOf = (userId: string, i: IncomeShape): IncomeCalc => ({
  userId,
  type: i.type,
  amountCents: toCents(String(i.amount)),
  date: i.date,
  since: i.since,
  until: i.until,
});

function toDTO(i: IncomeRow): IncomeDTO {
  return {
    id: i.id,
    userId: i.userId,
    type: i.type === IncomeTypeDb.RECURRING ? 'recurring' : 'oneOff',
    description: i.description,
    amount: toReais(toCents(String(i.amount))),
    dayOfMonth: i.dayOfMonth,
    since: i.since,
    until: i.until,
    date: i.date ? i.date.toISOString().slice(0, 10) : null,
    source: i.source === RecordSourceDb.IMPORT ? 'import' : 'manual',
    importedFileId: i.importedFileId,
    debtPaymentId: i.debtPaymentId,
  };
}

/** Its counterpart is the payer's expense — only undoing that payment removes it. */
function assertNotDebtReceipt(i: { debtPaymentId: string | null }) {
  if (i.debtPaymentId) {
    throw new BadRequestException(
      'Esta entrada é o recebimento de uma dívida. Ela só muda se quem pagou excluir o pagamento.',
    );
  }
}
