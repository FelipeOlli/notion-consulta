-- AlterEnum
ALTER TYPE "AppModule" ADD VALUE 'TIME_IS_MONEY';

-- CreateTable
CREATE TABLE "TimMonitoredClient" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimMonitoredClient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimMonitoredClient_clientId_key" ON "TimMonitoredClient"("clientId");
