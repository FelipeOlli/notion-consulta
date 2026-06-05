-- CreateEnum
CREATE TYPE "ChipOperadora" AS ENUM ('CLARO', 'TIM', 'VIVO', 'OI');

-- AlterEnum
ALTER TYPE "AppModule" ADD VALUE 'CHIPS';

-- CreateTable
CREATE TABLE "ChipEmpresa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChipEmpresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chip" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "operadora" "ChipOperadora" NOT NULL,
    "empresaId" TEXT NOT NULL,
    "ultimaRecarga" TIMESTAMP(3) NOT NULL,
    "duracaoDias" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChipEmpresa_nome_key" ON "ChipEmpresa"("nome");

-- CreateIndex
CREATE INDEX "Chip_empresaId_idx" ON "Chip"("empresaId");

-- CreateIndex
CREATE INDEX "Chip_ultimaRecarga_idx" ON "Chip"("ultimaRecarga");

-- AddForeignKey
ALTER TABLE "Chip" ADD CONSTRAINT "Chip_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "ChipEmpresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
