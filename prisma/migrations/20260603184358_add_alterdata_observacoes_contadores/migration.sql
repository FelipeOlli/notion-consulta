-- CreateTable
CREATE TABLE "AlterdataClienteObservacao" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlterdataClienteObservacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlterdataClienteContador" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlterdataClienteContador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlterdataClienteObservacao_clienteId_createdAt_idx" ON "AlterdataClienteObservacao"("clienteId", "createdAt");

-- CreateIndex
CREATE INDEX "AlterdataClienteContador_clienteId_idx" ON "AlterdataClienteContador"("clienteId");

-- AddForeignKey
ALTER TABLE "AlterdataClienteObservacao" ADD CONSTRAINT "AlterdataClienteObservacao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "AlterdataCliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlterdataClienteContador" ADD CONSTRAINT "AlterdataClienteContador_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "AlterdataCliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
