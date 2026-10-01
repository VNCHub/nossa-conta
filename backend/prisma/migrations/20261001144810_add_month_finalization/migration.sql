-- CreateTable
CREATE TABLE "MonthFinalization" (
    "id" TEXT NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "finalizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MonthFinalization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthFinalization_familyId_month_idx" ON "MonthFinalization"("familyId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthFinalization_familyId_userId_month_key" ON "MonthFinalization"("familyId", "userId", "month");

-- AddForeignKey
ALTER TABLE "MonthFinalization" ADD CONSTRAINT "MonthFinalization_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthFinalization" ADD CONSTRAINT "MonthFinalization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
