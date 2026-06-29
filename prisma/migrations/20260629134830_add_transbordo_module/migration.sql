-- AlterEnum
ALTER TYPE "AppModule" ADD VALUE 'TRANSBORDO';

-- CreateTable
CREATE TABLE "TransbordoBadgeColor" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "hexValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransbordoBadgeColor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransbordoStatusOption" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransbordoStatusOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransbordoTicket" (
    "id" TEXT NOT NULL,
    "franchiseName" TEXT NOT NULL,
    "sistemaOrigem" TEXT,
    "systems" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'T0 - Coleta inicial de dados',
    "statusColorId" INTEGER,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "companies" INTEGER,
    "request" TEXT,
    "ticketTransbordoNo" TEXT,
    "lembrete" TEXT,
    "agendado" TEXT,
    "solicitacao" TEXT,
    "ssc" TEXT,
    "tempoMigracao" TEXT,
    "totalDays" INTEGER,
    "prevDays" INTEGER,
    "workDays" INTEGER,
    "dConcluido" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransbordoTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransbordoComment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransbordoComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransbordoComment_ticketId_idx" ON "TransbordoComment"("ticketId");

-- AddForeignKey
ALTER TABLE "TransbordoTicket" ADD CONSTRAINT "TransbordoTicket_statusColorId_fkey" FOREIGN KEY ("statusColorId") REFERENCES "TransbordoBadgeColor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransbordoComment" ADD CONSTRAINT "TransbordoComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "TransbordoTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
