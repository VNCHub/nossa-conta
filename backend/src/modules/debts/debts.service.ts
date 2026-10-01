import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DebtDTO } from '@shared/contracts';
import { toCents, toReais } from '../../domain/split';
import { UsersRepository } from '../users/users.repository';
import { DebtsRepository, type DebtWithPayments } from './debts.repository';
import { CreateDebtDto, PayDebtDto } from './dto/debts.dto';

@Injectable()
export class DebtsService {
  constructor(
    private readonly repo: DebtsRepository,
    private readonly users: UsersRepository,
  ) {}

  async list(familyId: string): Promise<DebtDTO[]> {
    const rows = await this.repo.list(familyId);
    return rows.map(toDTO);
  }

  async create(familyId: string, dto: CreateDebtDto): Promise<DebtDTO> {
    if (dto.fromUserId === dto.toUserId) {
      throw new BadRequestException('Quem paga e quem recebe precisam ser pessoas diferentes.');
    }
    const members = new Set((await this.users.listMembers(familyId)).map((m) => m.id));
    if (!members.has(dto.fromUserId) || !members.has(dto.toUserId)) {
      throw new BadRequestException('A dívida precisa ser entre membros da família.');
    }
    const row = await this.repo.create({
      familyId,
      fromUserId: dto.fromUserId,
      toUserId: dto.toUserId,
      amount: dto.amount,
      description: dto.description.trim(),
      date: new Date(`${dto.date}T00:00:00Z`),
      origin: 'MANUAL',
    });
    return toDTO(row);
  }

  /**
   * Only the two people in it. Payments already made stay as they are — an
   * expense for one, an income for the other — because that money did move.
   */
  async remove(familyId: string, userId: string, id: string): Promise<void> {
    const debt = await this.require(familyId, id);
    if (debt.fromUserId !== userId && debt.toUserId !== userId) {
      throw new ForbiddenException('Só quem deve ou quem recebe pode excluir esta dívida.');
    }
    await this.repo.remove(familyId, id);
  }

  async pay(familyId: string, userId: string, id: string, dto: PayDebtDto): Promise<DebtDTO> {
    const debt = await this.require(familyId, id);
    if (debt.fromUserId !== userId) {
      throw new ForbiddenException('Só quem deve pode registrar o pagamento.');
    }
    const month = dto.date.slice(0, 7);
    // No finalized-month check, for payer or receiver: a DEBT expense is kept
    // out of the split, so paying in a frozen month changes no one's quota.

    const members = await this.users.listMembers(familyId);
    const nameOf = (uid: string) => members.find((m) => m.id === uid)?.name ?? 'alguém';
    const result = await this.repo.pay(familyId, id, {
      amount: toReais(toCents(String(dto.amount))).toFixed(2),
      date: new Date(`${dto.date}T00:00:00Z`),
      month,
      description: dto.description?.trim() || `Pagamento para ${nameOf(debt.toUserId)} · ${debt.description}`,
      receiptDescription: `Recebido de ${nameOf(debt.fromUserId)} · ${debt.description}`,
      paymentMethod: dto.paymentMethod ?? null,
    });
    if (result === 'gone') throw new NotFoundException('Dívida não encontrada.');
    if (result === 'over') {
      const left = toReais(remainingCents(await this.require(familyId, id)));
      throw new ConflictException(
        `O pagamento não pode passar do que falta (${left.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).`,
      );
    }
    return toDTO(await this.require(familyId, id));
  }

  private async require(familyId: string, id: string) {
    const debt = await this.repo.find(familyId, id);
    // 404, not 403: another family's debt is not acknowledged to exist.
    if (!debt) throw new NotFoundException('Dívida não encontrada.');
    return debt;
  }
}

const paidCents = (d: DebtWithPayments) =>
  d.payments.reduce((s, p) => s + toCents(String(p.amount ?? 0)), 0);
const remainingCents = (d: DebtWithPayments) => toCents(String(d.amount)) - paidCents(d);

function toDTO(d: DebtWithPayments): DebtDTO {
  return {
    id: d.id,
    fromUserId: d.fromUserId,
    toUserId: d.toUserId,
    amount: toReais(toCents(String(d.amount))),
    paid: toReais(paidCents(d)),
    remaining: toReais(remainingCents(d)),
    description: d.description,
    date: d.date.toISOString().slice(0, 10),
    origin: d.origin === 'MONTH_CLOSING' ? 'monthClosing' : 'manual',
    closingMonth: d.closing?.month ?? null,
    payments: d.payments.map((p) => ({
      expenseId: p.id,
      date: p.date.toISOString().slice(0, 10),
      amount: toReais(toCents(String(p.amount ?? 0))),
      description: p.description,
    })),
  };
}
