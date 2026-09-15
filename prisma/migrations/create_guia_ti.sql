CREATE TABLE IF NOT EXISTS "GuiaTi" (
  "id"        TEXT NOT NULL,
  "nome"      TEXT NOT NULL,
  "modulo"    TEXT,
  "fileType"  TEXT NOT NULL,
  "fileUrl"   TEXT NOT NULL,
  "fileName"  TEXT,
  "fileSize"  INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GuiaTi_pkey" PRIMARY KEY ("id")
);
