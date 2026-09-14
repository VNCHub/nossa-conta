-- CreateEnum
CREATE TYPE "ErrorSource" AS ENUM ('FRONTEND', 'BACKEND');

-- CreateTable
CREATE TABLE "ErrorIssue" (
    "id" TEXT NOT NULL,
    "source" "ErrorSource" NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ErrorIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stack" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issueId" TEXT NOT NULL,

    CONSTRAINT "ErrorEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ErrorIssue_fingerprint_key" ON "ErrorIssue"("fingerprint");

-- CreateIndex
CREATE INDEX "ErrorIssue_source_lastSeenAt_idx" ON "ErrorIssue"("source", "lastSeenAt");

-- CreateIndex
CREATE INDEX "ErrorEvent_issueId_occurredAt_idx" ON "ErrorEvent"("issueId", "occurredAt");

-- AddForeignKey
ALTER TABLE "ErrorEvent" ADD CONSTRAINT "ErrorEvent_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "ErrorIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
