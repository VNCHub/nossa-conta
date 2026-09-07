-- CreateEnum
CREATE TYPE "TipoEntrada" AS ENUM ('RECORRENTE', 'PONTUAL');

-- CreateEnum
CREATE TYPE "TipoGasto" AS ENUM ('FIXO', 'OPCIONAL');

-- CreateEnum
CREATE TYPE "TipoRegra" AS ENUM ('IGUAL', 'RENDA', 'SOBRA', 'FIXO', 'MEDIDOR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "familiaId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Familia" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigoConvite" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadaPorId" TEXT NOT NULL,

    CONSTRAINT "Familia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrada" (
    "id" TEXT NOT NULL,
    "tipo" "TipoEntrada" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "diaDoMes" INTEGER,
    "data" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Entrada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gasto" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "mes" VARCHAR(7) NOT NULL,
    "pagamento" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "tipoGasto" "TipoGasto" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "dividir" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "regraId" TEXT,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GastoParticipante" (
    "gastoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "GastoParticipante_pkey" PRIMARY KEY ("gastoId","userId")
);

-- CreateTable
CREATE TABLE "RegraRateio" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoRegra" NOT NULL,
    "descricao" TEXT NOT NULL,
    "unidade" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "familiaId" TEXT NOT NULL,

    CONSTRAINT "RegraRateio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegraPeso" (
    "regraId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "percentual" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "RegraPeso_pkey" PRIMARY KEY ("regraId","userId")
);

-- CreateTable
CREATE TABLE "RegraMedicao" (
    "regraId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mes" VARCHAR(7) NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "RegraMedicao_pkey" PRIMARY KEY ("regraId","userId","mes")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_familiaId_idx" ON "User"("familiaId");

-- CreateIndex
CREATE UNIQUE INDEX "Familia_codigoConvite_key" ON "Familia"("codigoConvite");

-- CreateIndex
CREATE INDEX "Entrada_userId_idx" ON "Entrada"("userId");

-- CreateIndex
CREATE INDEX "Gasto_familiaId_mes_idx" ON "Gasto"("familiaId", "mes");

-- CreateIndex
CREATE INDEX "Gasto_userId_mes_idx" ON "Gasto"("userId", "mes");

-- CreateIndex
CREATE INDEX "GastoParticipante_userId_idx" ON "GastoParticipante"("userId");

-- CreateIndex
CREATE INDEX "RegraRateio_familiaId_idx" ON "RegraRateio"("familiaId");

-- CreateIndex
CREATE INDEX "RegraMedicao_regraId_mes_idx" ON "RegraMedicao"("regraId", "mes");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Familia" ADD CONSTRAINT "Familia_criadaPorId_fkey" FOREIGN KEY ("criadaPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrada" ADD CONSTRAINT "Entrada_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_regraId_fkey" FOREIGN KEY ("regraId") REFERENCES "RegraRateio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoParticipante" ADD CONSTRAINT "GastoParticipante_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "Gasto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoParticipante" ADD CONSTRAINT "GastoParticipante_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegraRateio" ADD CONSTRAINT "RegraRateio_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegraPeso" ADD CONSTRAINT "RegraPeso_regraId_fkey" FOREIGN KEY ("regraId") REFERENCES "RegraRateio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegraPeso" ADD CONSTRAINT "RegraPeso_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegraMedicao" ADD CONSTRAINT "RegraMedicao_regraId_fkey" FOREIGN KEY ("regraId") REFERENCES "RegraRateio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegraMedicao" ADD CONSTRAINT "RegraMedicao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
