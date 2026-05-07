-- CreateEnum
CREATE TYPE "TiTaskStatus" AS ENUM ('TODO', 'DOING', 'DONE');

-- CreateEnum
CREATE TYPE "TiTaskType" AS ENUM ('MANUAL', 'AUTOMACAO', 'DELEGACAO');

-- CreateTable
CREATE TABLE "TiTask" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "responsible" TEXT NOT NULL,
    "status" "TiTaskStatus" NOT NULL DEFAULT 'TODO',
    "taskType" "TiTaskType" NOT NULL DEFAULT 'MANUAL',
    "raciRef" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TiTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TiTask_code_key" ON "TiTask"("code");
