-- CreateEnum
CREATE TYPE "DebtOrigin" AS ENUM ('MANUAL', 'MONTH_CLOSING');

-- AlterEnum
ALTER TYPE "ExpenseType" ADD VALUE 'DEBT';

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "debtId" TEXT;

-- AlterTable
ALTER TABLE "Income" ADD COLUMN     "debtPaymentId" TEXT;

-- CreateTable
CREATE TABLE "MonthClosing" (
    "id" TEXT NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "familyId" TEXT NOT NULL,
    "closedById" TEXT NOT NULL,

    CONSTRAINT "MonthClosing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debt" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "origin" "DebtOrigin" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "familyId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "closingId" TEXT,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthClosing_familyId_month_key" ON "MonthClosing"("familyId", "month");

-- CreateIndex
CREATE INDEX "Debt_familyId_idx" ON "Debt"("familyId");

-- CreateIndex
CREATE INDEX "Debt_closingId_idx" ON "Debt"("closingId");

-- CreateIndex
CREATE UNIQUE INDEX "Income_debtPaymentId_key" ON "Income"("debtPaymentId");

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_debtPaymentId_fkey" FOREIGN KEY ("debtPaymentId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthClosing" ADD CONSTRAINT "MonthClosing_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthClosing" ADD CONSTRAINT "MonthClosing_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_closingId_fkey" FOREIGN KEY ("closingId") REFERENCES "MonthClosing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

