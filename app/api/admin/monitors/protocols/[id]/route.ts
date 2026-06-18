import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("senha");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  const { id } = await params;

  const record = await prisma.ipMonitorProtocol.findUnique({
    where: { id },
    include: { anexos: true },
  });

  if (!record) return NextResponse.json({ message: "Protocolo não encontrado." }, { status: 404 });

  await prisma.ipMonitorProtocol.delete({ where: { id } });

  for (const anexo of record.anexos) {
    await fs.unlink(path.join(process.cwd(), anexo.filePath)).catch(() => null);
  }

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
