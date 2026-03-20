-- CreateEnum
CREATE TYPE "SnapshotImportSource" AS ENUM ('GOOGLE_JSON', 'TIM_CSV');

-- CreateTable
CREATE TABLE "ServiceUserSnapshot" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "competence" TIMESTAMP(3) NOT NULL,
    "totalUsers" INTEGER NOT NULL,
    "activeUsers" INTEGER,
    "source" "SnapshotImportSource" NOT NULL,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceUserSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceUserSnapshot_serverId_competence_key" ON "ServiceUserSnapshot"("serverId", "competence");

-- AddForeignKey
ALTER TABLE "ServiceUserSnapshot" ADD CONSTRAINT "ServiceUserSnapshot_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "EmailServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
