-- Income type "recurring" became "fixed"; renaming the value keeps existing rows intact.
ALTER TYPE "IncomeType" RENAME VALUE 'RECURRING' TO 'FIXED';
