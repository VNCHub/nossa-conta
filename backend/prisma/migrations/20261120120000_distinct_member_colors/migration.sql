-- Data-only migration: give members of the same family distinct avatar colors.
-- The oldest member keeps their color; later ones holding a repeated color get
-- the least-used palette color of their family (same rule as pickMemberColor).
-- Keep the palette in sync with MEMBER_COLORS at the time of this migration.
DO $$
DECLARE
  palette text[] := ARRAY['#1F5F52','#B8452F','#7A5AA6','#3D6A8F','#C97B2B','#4E9A8A','#5A6EA8','#8A8F87'];
  dup record;
  chosen text;
BEGIN
  FOR dup IN
    SELECT id, "familyId" FROM (
      SELECT id, "familyId",
             row_number() OVER (PARTITION BY "familyId", upper(color) ORDER BY "createdAt", id) AS rn
      FROM "User"
      WHERE "familyId" IS NOT NULL
    ) t
    WHERE rn > 1
    ORDER BY "familyId", id
  LOOP
    SELECT p INTO chosen
    FROM unnest(palette) WITH ORDINALITY AS pal(p, ord)
    ORDER BY
      (SELECT count(*) FROM "User" u
        WHERE u."familyId" = dup."familyId" AND upper(u.color) = upper(pal.p)),
      pal.ord
    LIMIT 1;

    UPDATE "User" SET color = chosen WHERE id = dup.id;
  END LOOP;
END $$;
