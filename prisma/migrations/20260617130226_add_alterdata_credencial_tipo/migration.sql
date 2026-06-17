-- CreateEnum
CREATE TYPE "AlterdataCredencialTipo" AS ENUM ('ECONTADOR', 'NUVEM', 'PACK');

-- DropIndex
DROP INDEX "AlterdataClienteContador_clienteId_idx";

-- AlterTable
ALTER TABLE "AlterdataClienteContador" ADD COLUMN     "tipo" "AlterdataCredencialTipo" NOT NULL DEFAULT 'ECONTADOR';

-- CreateIndex
CREATE INDEX "AlterdataClienteContador_clienteId_tipo_idx" ON "AlterdataClienteContador"("clienteId", "tipo");
