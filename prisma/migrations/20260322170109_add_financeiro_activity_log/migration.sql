-- CreateEnum
CREATE TYPE "FinanceiroActivityAction" AS ENUM ('IMPORT_SNAPSHOT', 'COMPANY_CREATE', 'COMPANY_RENAME', 'COMPANY_DELETE', 'LINE_CREATE', 'LINE_UPDATE', 'LINE_DELETE', 'LINE_BULK_ALLOCATE');

-- CreateTable
CREATE TABLE "FinanceiroActivityLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorEmail" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "FinanceiroActivityAction" NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "FinanceiroActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinanceiroActivityLog_createdAt_idx" ON "FinanceiroActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "FinanceiroActivityLog_action_createdAt_idx" ON "FinanceiroActivityLog"("action", "createdAt");

-- RenameIndex
ALTER INDEX "ServiceUserSnapshotLine_snapshotId_financeiroServerCompanyId_id" RENAME TO "ServiceUserSnapshotLine_snapshotId_financeiroServerCompanyI_idx";
