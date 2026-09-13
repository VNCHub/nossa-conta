-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "importKey" TEXT;

-- AlterTable
ALTER TABLE "ImportedFile" ADD COLUMN     "duplicateTransactionsSkipped" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Income" ADD COLUMN     "importKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Expense_familyId_importKey_key" ON "Expense"("familyId", "importKey");

-- CreateIndex
CREATE UNIQUE INDEX "Income_userId_importKey_key" ON "Income"("userId", "importKey");

