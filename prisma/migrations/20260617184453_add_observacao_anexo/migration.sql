-- CreateTable
CREATE TABLE "AlterdataObservacaoAnexo" (
    "id" TEXT NOT NULL,
    "observacaoId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlterdataObservacaoAnexo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlterdataObservacaoAnexo_observacaoId_idx" ON "AlterdataObservacaoAnexo"("observacaoId");

-- AddForeignKey
ALTER TABLE "AlterdataObservacaoAnexo" ADD CONSTRAINT "AlterdataObservacaoAnexo_observacaoId_fkey" FOREIGN KEY ("observacaoId") REFERENCES "AlterdataClienteObservacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
