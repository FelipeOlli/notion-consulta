-- CreateEnum
CREATE TYPE "AlterdataClienteStatus" AS ENUM ('ATIVO', 'INATIVO', 'INADIMPLENTE', 'CONGELADO', 'DISTRATADO');

-- AlterEnum
ALTER TYPE "AppModule" ADD VALUE 'ALTERDATA';

-- CreateTable
CREATE TABLE "AlterdataCliente" (
    "id" TEXT NOT NULL,
    "codPessoa" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "status" "AlterdataClienteStatus" NOT NULL DEFAULT 'ATIVO',
    "qtdLicencas" INTEGER NOT NULL DEFAULT 1,
    "qtdUsuarios" INTEGER NOT NULL DEFAULT 0,
    "licencasOciosas" INTEGER NOT NULL DEFAULT 0,
    "acessosFranqueado" INTEGER NOT NULL DEFAULT 0,
    "acessosBackoffice" INTEGER NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlterdataCliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlterdataCliente_codPessoa_key" ON "AlterdataCliente"("codPessoa");

-- CreateIndex
CREATE INDEX "AlterdataCliente_status_idx" ON "AlterdataCliente"("status");
