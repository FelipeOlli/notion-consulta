-- CreateTable
CREATE TABLE "ServiceUserSnapshotLine" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "email" TEXT,
    "displayName" TEXT NOT NULL,
    "companyLabel" TEXT NOT NULL,
    "status" TEXT,
    "detail" TEXT,
    "meta" JSONB,

    CONSTRAINT "ServiceUserSnapshotLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceUserSnapshotLine_snapshotId_idx" ON "ServiceUserSnapshotLine"("snapshotId");

-- CreateIndex
CREATE INDEX "ServiceUserSnapshotLine_snapshotId_companyLabel_idx" ON "ServiceUserSnapshotLine"("snapshotId", "companyLabel");

-- AddForeignKey
ALTER TABLE "ServiceUserSnapshotLine" ADD CONSTRAINT "ServiceUserSnapshotLine_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ServiceUserSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
