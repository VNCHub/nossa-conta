-- Optional and one-off expenses behaved identically; fold the former into the latter.
UPDATE "Expense" SET "expenseType" = 'ONE_OFF' WHERE "expenseType" = 'OPTIONAL';

-- Postgres cannot drop an enum value, so swap in a new type without it.
ALTER TYPE "ExpenseType" RENAME TO "ExpenseType_old";
CREATE TYPE "ExpenseType" AS ENUM ('FIXED', 'ONE_OFF', 'DEBT');
ALTER TABLE "Expense" ALTER COLUMN "expenseType" TYPE "ExpenseType" USING ("expenseType"::text::"ExpenseType");
DROP TYPE "ExpenseType_old";
