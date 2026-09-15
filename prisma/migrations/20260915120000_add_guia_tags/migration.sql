-- CreateTable
CREATE TABLE "GuiaTag" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuiaTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GuiaTagToGuiaTi" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_GuiaTagToGuiaTi_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuiaTag_nome_key" ON "GuiaTag"("nome");

-- CreateIndex
CREATE INDEX "_GuiaTagToGuiaTi_B_index" ON "_GuiaTagToGuiaTi"("B");

-- AddForeignKey
ALTER TABLE "_GuiaTagToGuiaTi" ADD CONSTRAINT "_GuiaTagToGuiaTi_A_fkey" FOREIGN KEY ("A") REFERENCES "GuiaTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GuiaTagToGuiaTi" ADD CONSTRAINT "_GuiaTagToGuiaTi_B_fkey" FOREIGN KEY ("B") REFERENCES "GuiaTi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
