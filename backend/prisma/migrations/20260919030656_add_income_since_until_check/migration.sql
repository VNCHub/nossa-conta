-- Backstop against `since > until` ever being persisted — not just a
-- validation-layer concern: two concurrent PATCH requests to the same
-- income, each individually valid against a stale read, could otherwise
-- combine into an invalid range that no application code re-checks after
-- the fact. A Postgres CHECK makes that combination physically impossible,
-- regardless of how the row got there.
ALTER TABLE "Income" ADD CONSTRAINT "income_since_until_valid"
  CHECK ("since" IS NULL OR "until" IS NULL OR "since" <= "until");