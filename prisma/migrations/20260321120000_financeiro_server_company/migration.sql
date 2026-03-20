-- CreateTable
CREATE TABLE "FinanceiroServerCompany" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceiroServerCompany_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceiroServerCompany_serverId_name_key" ON "FinanceiroServerCompany"("serverId", "name");

-- CreateIndex
CREATE INDEX "FinanceiroServerCompany_serverId_idx" ON "FinanceiroServerCompany"("serverId");

-- AddForeignKey
ALTER TABLE "FinanceiroServerCompany" ADD CONSTRAINT "FinanceiroServerCompany_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "EmailServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ServiceUserSnapshotLine" ADD COLUMN "financeiroServerCompanyId" TEXT;

-- CreateIndex
CREATE INDEX "ServiceUserSnapshotLine_snapshotId_financeiroServerCompanyId_idx" ON "ServiceUserSnapshotLine"("snapshotId", "financeiroServerCompanyId");

-- AddForeignKey
ALTER TABLE "ServiceUserSnapshotLine" ADD CONSTRAINT "ServiceUserSnapshotLine_financeiroServerCompanyId_fkey" FOREIGN KEY ("financeiroServerCompanyId") REFERENCES "FinanceiroServerCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Limpar rótulos legados de empresa nas linhas (alocação passa pelo catálogo)
UPDATE "ServiceUserSnapshotLine" SET "companyLabel" = '', "companyLabelOverride" = NULL;
