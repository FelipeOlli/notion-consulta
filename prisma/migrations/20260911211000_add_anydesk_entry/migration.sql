-- CreateTable
CREATE TABLE "AnydeskEntry" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "anydesk" TEXT NOT NULL,
    "senha" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnydeskEntry_pkey" PRIMARY KEY ("id")
);
