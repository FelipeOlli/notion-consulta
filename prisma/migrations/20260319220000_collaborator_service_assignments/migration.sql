-- AlterTable
ALTER TABLE "Collaborator" ADD COLUMN "workEmail" TEXT;

-- AlterTable
ALTER TABLE "EmailServer" ADD COLUMN "requiresCollaboratorEmail" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "CollaboratorServerAssignment" (
    "id" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollaboratorServerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CollaboratorServerAssignment_collaboratorId_serverId_key" ON "CollaboratorServerAssignment"("collaboratorId", "serverId");

-- AddForeignKey
ALTER TABLE "CollaboratorServerAssignment" ADD CONSTRAINT "CollaboratorServerAssignment_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollaboratorServerAssignment" ADD CONSTRAINT "CollaboratorServerAssignment_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "EmailServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ajuste heurístico: Time Is Money não exige e-mail do colaborador
UPDATE "EmailServer" SET "requiresCollaboratorEmail" = false WHERE LOWER(name) LIKE '%time%money%';
