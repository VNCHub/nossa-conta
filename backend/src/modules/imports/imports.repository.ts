import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const WITH_COUNTS = {
  _count: { select: { expenses: true, incomes: true } },
} satisfies Prisma.ImportedFileInclude;

export type ImportedFileWithCounts = Prisma.ImportedFileGetPayload<{
  include: typeof WITH_COUNTS;
}>;

export interface SaveImportInput {
  file: Prisma.ImportedFileUncheckedCreateInput;
  expenses: Omit<Prisma.ExpenseUncheckedCreateInput, 'importedFileId'>[];
  incomes: Omit<Prisma.IncomeUncheckedCreateInput, 'importedFileId'>[];
}

/**
 * Single point of contact with Prisma for imports — every method takes
 * familyId, same rule as every other repository in the app.
 */
@Injectable()
export class ImportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(familyId: string) {
    return this.prisma.importedFile.findMany({
      where: { familyId },
      include: WITH_COUNTS,
      orderBy: { createdAt: 'desc' },
    });
  }

  findByFingerprint(familyId: string, fingerprint: string) {
    return this.prisma.importedFile.findUnique({
      where: { familyId_fingerprint: { familyId, fingerprint } },
    });
  }

  /**
   * Which of these importKeys were already saved. Expenses are unique per
   * family and incomes per user, so each list is checked against its own scope.
   */
  async findExistingImportKeys(
    familyId: string,
    userId: string,
    keys: { expenseKeys: string[]; incomeKeys: string[] },
  ): Promise<Set<string>> {
    const [expenses, incomes] = await Promise.all([
      this.prisma.expense.findMany({
        where: { familyId, importKey: { in: keys.expenseKeys } },
        select: { importKey: true },
      }),
      this.prisma.income.findMany({
        where: { userId, importKey: { in: keys.incomeKeys } },
        select: { importKey: true },
      }),
    ]);
    return new Set([...expenses, ...incomes].map((r) => r.importKey as string));
  }

  /**
   * One transaction for the whole file: the ImportedFile row and every
   * Expense/Income it produced are created together, or none of them are —
   * a mid-way failure must not leave a half-imported file in the ledger.
   *
   * `skipDuplicates` relies on the `importKey` unique constraint: a
   * transaction already saved by an earlier — possibly different — file is
   * silently skipped instead of raising a conflict, which is what makes a
   * re-exported, overlapping statement safe to import again.
   */
  saveImport(input: SaveImportInput): Promise<ImportedFileWithCounts> {
    return this.prisma.$transaction(async (tx) => {
      const file = await tx.importedFile.create({ data: input.file });

      // The service already counted what it filtered out up front; this adds
      // whatever the database still turned away (a concurrent import).
      let duplicateTransactionsSkipped = input.file.duplicateTransactionsSkipped ?? 0;

      if (input.expenses.length) {
        const { count } = await tx.expense.createMany({
          data: input.expenses.map((e) => ({ ...e, importedFileId: file.id })),
          skipDuplicates: true,
        });
        duplicateTransactionsSkipped += input.expenses.length - count;
      }
      if (input.incomes.length) {
        const { count } = await tx.income.createMany({
          data: input.incomes.map((i) => ({ ...i, importedFileId: file.id })),
          skipDuplicates: true,
        });
        duplicateTransactionsSkipped += input.incomes.length - count;
      }

      return tx.importedFile.update({
        where: { id: file.id },
        data: { duplicateTransactionsSkipped },
        include: WITH_COUNTS,
      });
    });
  }
}
