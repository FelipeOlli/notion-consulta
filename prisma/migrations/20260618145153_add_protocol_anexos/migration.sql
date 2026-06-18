-- CreateTable
CREATE TABLE "IpMonitorProtocolAnexo" (
    "id" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IpMonitorProtocolAnexo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IpMonitorProtocolAnexo_protocolId_idx" ON "IpMonitorProtocolAnexo"("protocolId");

-- AddForeignKey
ALTER TABLE "IpMonitorProtocolAnexo" ADD CONSTRAINT "IpMonitorProtocolAnexo_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "IpMonitorProtocol"("id") ON DELETE CASCADE ON UPDATE CASCADE;
