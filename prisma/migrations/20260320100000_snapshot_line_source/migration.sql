-- CreateEnum
CREATE TYPE "SnapshotLineSource" AS ENUM ('IMPORTED', 'MANUAL');

-- AlterTable
ALTER TABLE "ServiceUserSnapshotLine" ADD COLUMN "lineSource" "SnapshotLineSource" NOT NULL DEFAULT 'IMPORTED';
