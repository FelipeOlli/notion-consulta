-- CreateTable
CREATE TABLE "TicketTiPendenteAlerta" (
    "id" TEXT NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "solicitante" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "statusNome" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketTiPendenteAlerta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketTiPendenteAlerta_ticketId_key" ON "TicketTiPendenteAlerta"("ticketId");
