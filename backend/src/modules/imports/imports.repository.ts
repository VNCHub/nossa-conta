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

      let duplicateTransactionsSkipped = 0;

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
