-- AlterTable
ALTER TABLE "Income" ADD COLUMN     "since" VARCHAR(7);

-- Backfill: existing recurring incomes never had an explicit start month —
-- their creation month is what the split engine already treated as their
-- lower bound, so this keeps every past statement's math unchanged.
UPDATE "Income" SET "since" = to_char("createdAt", 'YYYY-MM') WHERE "type" = 'RECURRING';
