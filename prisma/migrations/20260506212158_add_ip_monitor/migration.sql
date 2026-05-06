-- CreateEnum
CREATE TYPE "IpMonitorType" AS ENUM ('HTTP', 'TCP');

-- CreateEnum
CREATE TYPE "IpMonitorStatus" AS ENUM ('PENDING', 'UP', 'DOWN');

-- CreateTable
CREATE TABLE "IpMonitorGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IpMonitorGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IpMonitor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER,
    "type" "IpMonitorType" NOT NULL DEFAULT 'HTTP',
    "groupId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "interval" INTEGER NOT NULL DEFAULT 60,
    "lastStatus" "IpMonitorStatus" NOT NULL DEFAULT 'PENDING',
    "lastChecked" TIMESTAMP(3),
    "lastPing" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IpMonitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IpMonitorEvent" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "status" "IpMonitorStatus" NOT NULL,
    "ping" INTEGER,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IpMonitorEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IpMonitor_groupId_idx" ON "IpMonitor"("groupId");

-- CreateIndex
CREATE INDEX "IpMonitorEvent_monitorId_createdAt_idx" ON "IpMonitorEvent"("monitorId", "createdAt");

-- AddForeignKey
ALTER TABLE "IpMonitor" ADD CONSTRAINT "IpMonitor_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "IpMonitorGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IpMonitorEvent" ADD CONSTRAINT "IpMonitorEvent_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "IpMonitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
