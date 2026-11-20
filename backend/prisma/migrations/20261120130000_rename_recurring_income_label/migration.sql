-- Income "recurring" is now called "fixed" in the UI; keep the stored rule
-- descriptions of existing families in sync with the new wording.
UPDATE "SplitRule"
SET "description" = REPLACE(REPLACE("description", 'entrada recorrente', 'entrada fixa'), 'renda recorrente', 'renda fixa')
WHERE "description" LIKE '%recorrente%';
