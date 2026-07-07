-- CreateEnum
CREATE TYPE "IungoStatus" AS ENUM ('ATIVO', 'INATIVO');

-- AlterEnum
ALTER TYPE "AppModule" ADD VALUE 'IUNGO';

-- CreateTable
CREATE TABLE "IungoRamal" (
    "id" TEXT NOT NULL,
    "ramal" TEXT NOT NULL,
    "status" "IungoStatus" NOT NULL DEFAULT 'ATIVO',
    "login" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "numero" TEXT,
    "funcionarios" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IungoRamal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IungoRamal_ramal_key" ON "IungoRamal"("ramal");

-- CreateIndex
CREATE INDEX "IungoRamal_status_idx" ON "IungoRamal"("status");
