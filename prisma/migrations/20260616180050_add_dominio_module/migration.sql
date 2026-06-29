-- CreateEnum
CREATE TYPE "DominioSscStatus" AS ENUM ('ABERTA', 'RESOLVIDA');

-- AlterEnum
ALTER TYPE "AppModule" ADD VALUE 'DOMINIO';

-- CreateTable
CREATE TABLE "DominioSsc" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "assunto" TEXT,
    "status" "DominioSscStatus" NOT NULL DEFAULT 'ABERTA',
    "criadoPor" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DominioSsc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DominioSscUpdate" (
    "id" TEXT NOT NULL,
    "sscId" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "remetente" TEXT,
    "assunto" TEXT,
    "snippet" TEXT,
    "receivedAt" TIMESTAMP(3),
    "visto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DominioSscUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DominioSsc_numero_key" ON "DominioSsc"("numero");

-- CreateIndex
CREATE INDEX "DominioSsc_status_idx" ON "DominioSsc"("status");

-- CreateIndex
CREATE INDEX "DominioSscUpdate_sscId_createdAt_idx" ON "DominioSscUpdate"("sscId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DominioSscUpdate_sscId_gmailMessageId_key" ON "DominioSscUpdate"("sscId", "gmailMessageId");

-- AddForeignKey
ALTER TABLE "DominioSscUpdate" ADD CONSTRAINT "DominioSscUpdate_sscId_fkey" FOREIGN KEY ("sscId") REFERENCES "DominioSsc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
