-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('DEFAULT', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" "RoleName" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the two roles this platform knows about today.
INSERT INTO "Role" ("id", "name", "createdAt") VALUES
  ('role-default', 'DEFAULT', CURRENT_TIMESTAMP),
  ('role-admin', 'ADMIN', CURRENT_TIMESTAMP);

-- Bootstrap the platform admin if this is a fresh install (no such user yet).
-- Password is the temporary '123456' — same hash prisma/seed.ts produces for
-- its demo users, computed once with the project's own argon2 dependency.
INSERT INTO "User" ("id", "name", "email", "passwordHash", "color", "createdAt")
SELECT
  'seed-admin-user',
  'Vinicius Carrocine',
  'viniciuscarrocine@gmail.com',
  '$argon2id$v=19$m=65536,t=3,p=4$FFAObQdKpEu3W0NKCzHZpA$DuKwi7/+NwdzvYy63vS5smGrSEHwisafDkIJhsmolCE',
  '#1F5F52',
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "email" = 'viniciuscarrocine@gmail.com');

-- Every user gets the default role, whether they already existed or were just created above.
INSERT INTO "UserRole" ("userId", "roleId", "createdAt")
SELECT "id", 'role-default', CURRENT_TIMESTAMP FROM "User"
ON CONFLICT DO NOTHING;

-- The platform admin additionally gets the admin role, on top of default.
INSERT INTO "UserRole" ("userId", "roleId", "createdAt")
SELECT "id", 'role-admin', CURRENT_TIMESTAMP FROM "User"
WHERE "email" = 'viniciuscarrocine@gmail.com'
ON CONFLICT DO NOTHING;
