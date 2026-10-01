import { ConflictException, Injectable } from '@nestjs/common';
import { monthLabel } from '@shared/format';
import { MonthLocksRepository } from './month-locks.repository';

/**
 * The freeze that "finalizar meus lançamentos" puts on a member's month.
 *
 * Lives in its own tiny module, apart from the months controller, because the
 * expense, income and import services all depend on it — and the month
 * closing (which needs the statement, built from those same services) must
 * not form a cycle with them.
 */
@Injectable()
export class MonthLocksService {
  constructor(private readonly repo: MonthLocksRepository) {}

  monthsFinalizedBy(familyId: string, userId: string): Promise<string[]> {
    return this.repo.monthsFinalizedBy(familyId, userId);
  }

  /** Rejects a write that would touch any of `months` the member has already finalized. */
  async assertOpen(familyId: string, userId: string, months: string[]): Promise<void> {
    if (!months.length) return;
    const finalized = new Set(await this.repo.monthsFinalizedBy(familyId, userId));
    const locked = [...new Set(months)].filter((m) => finalized.has(m)).sort();
    if (locked.length) throw lockedError(locked);
  }
}

export const lockedError = (months: string[]) =>
  new ConflictException(
    `Você finalizou seus lançamentos de ${months.map(monthLabel).join(', ')}. Reabra no Meu painel para alterar.`,
  );
