import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { MonthStatusDTO } from '@shared/contracts';
import { currentMonth } from '@shared/format';
import { MonthLocksRepository } from './month-locks.repository';

@Injectable()
export class MonthsService {
  constructor(private readonly locks: MonthLocksRepository) {}

  async status(familyId: string, month: string): Promise<MonthStatusDTO> {
    const rows = await this.locks.listForMonth(familyId, month);
    return {
      month,
      finalized: Object.fromEntries(rows.map((r) => [r.userId, r.finalizedAt.toISOString()])),
    };
  }

  async finalize(familyId: string, userId: string, month: string): Promise<MonthStatusDTO> {
    // A month that hasn't started can't be "done" — and a stray finalization
    // there would silently freeze entries nobody has made yet.
    if (month > currentMonth()) {
      throw new BadRequestException('Só dá para finalizar um mês que já começou.');
    }
    if (await this.locks.find(familyId, userId, month)) {
      throw new ConflictException('Você já finalizou os lançamentos deste mês.');
    }
    await this.locks.create(familyId, userId, month);
    return this.status(familyId, month);
  }

  async reopen(familyId: string, userId: string, month: string): Promise<MonthStatusDTO> {
    await this.locks.remove(familyId, userId, month);
    return this.status(familyId, month);
  }
}
