-- CreateTable
CREATE TABLE "IpMonitorProtocol" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "serviceOrder" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IpMonitorProtocol_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IpMonitorProtocol_monitorId_createdAt_idx" ON "IpMonitorProtocol"("monitorId", "createdAt");

-- AddForeignKey
ALTER TABLE "IpMonitorProtocol" ADD CONSTRAINT "IpMonitorProtocol_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "IpMonitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
