import { Injectable, NotFoundException } from '@nestjs/common';
import { IncomeType as IncomeTypeDb, RecordSource as RecordSourceDb } from '@prisma/client';
import type { IncomeDTO } from '@shared/contracts';
import type { RecordSource } from '@shared/domain';
import type { IncomeCalc } from '../../domain/split';
import { toCents, toReais } from '../../domain/split';
import { IncomesRepository } from './incomes.repository';
import { UpdateIncomeDto, CreateIncomeDto } from './dto/incomes.dto';

type IncomeRow = {
  id: string;
  userId: string;
  type: IncomeTypeDb;
  description: string;
  amount: unknown;
  dayOfMonth: number | null;
  date: Date | null;
  source: RecordSourceDb;
  importedFileId: string | null;
};

@Injectable()
export class IncomesService {
  constructor(private readonly repo: IncomesRepository) {}

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
    const row = await this.repo.create({
      userId,
      type: recurring ? IncomeTypeDb.RECURRING : IncomeTypeDb.ONE_OFF,
      description: dto.description.trim(),
      amount: dto.amount,
      dayOfMonth: recurring ? (dto.dayOfMonth ?? 1) : null,
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
    const recurring = current.type === IncomeTypeDb.RECURRING;

    const row = await this.repo.update(id, {
      description: dto.description?.trim(),
      amount: dto.amount,
      // The type does not change after creation: swapping recurring for one-off
      // would retroactively change the split of every closed month.
      dayOfMonth: recurring ? dto.dayOfMonth : undefined,
      date: !recurring && dto.date ? new Date(`${dto.date}T00:00:00Z`) : undefined,
    });
    return toDTO(row as IncomeRow);
  }

  async remove(familyId: string, userId: string, id: string): Promise<void> {
    await this.requireOwn(familyId, userId, id);
    await this.repo.remove(id);
  }

  /** The whole family's incomes, in the split engine's format. */
  async forCalc(familyId: string): Promise<IncomeCalc[]> {
    const rows = await this.repo.listForFamily(familyId);
    return rows.map((i) => ({
      userId: i.userId,
      type: i.type === IncomeTypeDb.RECURRING ? 'recurring' : 'oneOff',
      amountCents: toCents(String(i.amount)),
      date: i.date ? i.date.toISOString().slice(0, 10) : null,
    }));
  }

  private async requireOwn(familyId: string, userId: string, id: string) {
    const income = await this.repo.findForUser(familyId, userId, id);
    // 404, not 403: whoever cannot see the record should not learn it exists.
    if (!income) throw new NotFoundException('Entrada não encontrada.');
    return income;
  }
}

function toDTO(i: IncomeRow): IncomeDTO {
  return {
    id: i.id,
    userId: i.userId,
    type: i.type === IncomeTypeDb.RECURRING ? 'recurring' : 'oneOff',
    description: i.description,
    amount: toReais(toCents(String(i.amount))),
    dayOfMonth: i.dayOfMonth,
    date: i.date ? i.date.toISOString().slice(0, 10) : null,
    source: i.source === RecordSourceDb.IMPORT ? 'import' : 'manual',
    importedFileId: i.importedFileId,
  };
}
