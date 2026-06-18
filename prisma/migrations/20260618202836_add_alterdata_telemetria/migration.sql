-- CreateEnum
CREATE TYPE "AlterdataTelemetria" AS ENUM ('ATIVO', 'INATIVO');

-- AlterTable
ALTER TABLE "AlterdataCliente" ADD COLUMN     "telemetria" "AlterdataTelemetria";
