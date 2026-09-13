-- CreateEnum
CREATE TYPE "BankProvider" AS ENUM ('NUBANK');

-- CreateEnum
CREATE TYPE "ImportDocumentType" AS ENUM ('ACCOUNT_STATEMENT', 'INVOICE');

-- CreateEnum
CREATE TYPE "ImportFileFormat" AS ENUM ('CSV', 'OFX');

-- CreateEnum
CREATE TYPE "RecordSource" AS ENUM ('MANUAL', 'IMPORT');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "importedFileId" TEXT,
ADD COLUMN     "source" "RecordSource" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "Income" ADD COLUMN     "importedFileId" TEXT,
ADD COLUMN     "source" "RecordSource" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "ImportedFile" (
    "id" TEXT NOT NULL,
    "bank" "BankProvider" NOT NULL,
    "documentType" "ImportDocumentType" NOT NULL,
    "fileFormat" "ImportFileFormat" NOT NULL,
    "originalName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "purgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,

    CONSTRAINT "ImportedFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportedFile_familyId_createdAt_idx" ON "ImportedFile"("familyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportedFile_familyId_fingerprint_key" ON "ImportedFile"("familyId", "fingerprint");

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_importedFileId_fkey" FOREIGN KEY ("importedFileId") REFERENCES "ImportedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_importedFileId_fkey" FOREIGN KEY ("importedFileId") REFERENCES "ImportedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedFile" ADD CONSTRAINT "ImportedFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedFile" ADD CONSTRAINT "ImportedFile_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
