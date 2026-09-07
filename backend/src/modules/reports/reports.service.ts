import { Injectable } from '@nestjs/common';
import type { StatementDTO, UserSummary } from '@shared/contracts';
import { buildStatement, toReais } from '../../domain/split';
import { IncomesService } from '../incomes/incomes.service';
import { ExpensesService } from '../expenses/expenses.service';
import { RulesService } from '../rules/rules.service';
import { UsersRepository } from '../users/users.repository';

/**
 * Bridge between the database and the split engine.
 *
 * The calculation runs on the server on purpose: it is the single source of
 * truth for all members, and nobody can change their own share by tampering
 * with the client.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly users: UsersRepository,
    private readonly incomes: IncomesService,
    private readonly expenses: ExpensesService,
    private readonly rules: RulesService,
  ) {}

  async statement(familyId: string, month: string): Promise<StatementDTO> {
    const [members, incomes, expenses, rules] = await Promise.all([
      this.users.listMembers(familyId),
      this.incomes.forCalc(familyId),
      this.expenses.forStatement(familyId),
      this.rules.forCalc(familyId),
    ]);

    const calc = buildStatement({
      members,
      incomes,
      expenses: expenses.calc,
      rules,
      month,
    });

    return {
      month: calc.month,
      monthTotal: toReais(calc.monthTotalCents),
      lines: calc.lines.map((l) => ({
        ...expenses.dto.get(l.id)!,
        shares: l.shares,
      })),
      byUser: Object.fromEntries(
        Object.entries(calc.byUser).map(([id, u]): [string, UserSummary] => [
          id,
          {
            paid: toReais(u.paidCents),
            share: toReais(u.shareCents),
            fixed: toReais(u.fixedCents),
            optional: toReais(u.optionalCents),
            income: toReais(u.incomeCents),
            categories: Object.fromEntries(
              Object.entries(u.categoryCents).map(([c, v]) => [c, toReais(v)]),
            ),
          },
        ]),
      ),
      balance: Object.fromEntries(
        Object.entries(calc.balanceCents).map(([id, v]) => [id, toReais(v)]),
      ),
      transfers: calc.transfers.map((t) => ({
        from: t.from,
        to: t.to,
        amount: toReais(t.amountCents),
      })),
    };
  }
}
