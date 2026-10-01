import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MonthStatusDTO } from '@shared/contracts';
import { currentMonth, monthLabel, monthLabelShort } from '@shared/format';
import { UsersRepository } from '../users/users.repository';
import { ReportsService } from '../reports/reports.service';
import { MonthLocksRepository } from './month-locks.repository';
import { MonthClosingsRepository } from './month-closings.repository';

@Injectable()
export class MonthsService {
  constructor(
    private readonly locks: MonthLocksRepository,
    private readonly closings: MonthClosingsRepository,
    private readonly users: UsersRepository,
    private readonly reports: ReportsService,
  ) {}

  async status(familyId: string, month: string): Promise<MonthStatusDTO> {
    const [rows, closing] = await Promise.all([
      this.locks.listForMonth(familyId, month),
      this.closings.find(familyId, month),
    ]);
    return {
      month,
      finalized: Object.fromEntries(rows.map((r) => [r.userId, r.finalizedAt.toISOString()])),
      closed: closing && {
        closedAt: closing.closedAt.toISOString(),
        closedById: closing.closedById,
        generatedCount: closing.generatedCount,
        debtIds: closing.debts.map((d) => d.id),
      },
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
    // The closing turned this month's numbers into debts; changing them
    // underneath would leave those debts describing a settlement that no
    // longer exists.
    if (await this.closings.find(familyId, month)) {
      throw new ConflictException(
        `O acerto de ${monthLabel(month)} já foi fechado. Para reabrir seus lançamentos, reabra antes o mês no Painel da família.`,
      );
    }
    await this.locks.remove(familyId, userId, month);
    return this.status(familyId, month);
  }

  /** Any member can close, once every current member has finalized. */
  async close(familyId: string, userId: string, month: string): Promise<MonthStatusDTO> {
    if (await this.closings.find(familyId, month)) {
      throw new ConflictException('O acerto deste mês já foi fechado.');
    }
    const [members, finalized] = await Promise.all([
      this.users.listMembers(familyId),
      this.locks.listForMonth(familyId, month),
    ]);
    const done = new Set(finalized.map((f) => f.userId));
    const missing = members.filter((m) => !done.has(m.id));
    if (missing.length) {
      throw new ConflictException(
        `Ainda falta finalizar: ${missing.map((m) => m.name).join(', ')}.`,
      );
    }

    const { transfers } = await this.reports.statement(familyId, month);
    const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
    await this.closings.create(
      familyId,
      month,
      userId,
      transfers.map((t) => ({
        fromUserId: t.from,
        toUserId: t.to,
        amount: t.amount.toFixed(2),
        description: `Acerto ${monthLabelShort(month)}`,
        date: today,
      })),
    );
    return this.status(familyId, month);
  }

  /**
   * Undoes the closing: deletes whichever of its debts still exist — some may
   * already have been deleted by hand, which is fine — and lets members reopen
   * their own entries again. Payments made on those debts stay.
   */
  async reopenClosing(familyId: string, month: string): Promise<MonthStatusDTO> {
    const closing = await this.closings.find(familyId, month);
    if (!closing) throw new NotFoundException('O acerto deste mês não está fechado.');
    await this.closings.remove(familyId, closing.id);
    return this.status(familyId, month);
  }
}
