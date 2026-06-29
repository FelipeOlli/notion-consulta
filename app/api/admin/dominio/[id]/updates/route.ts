import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ok = await ensureModuleAccess("dominio");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const { id } = await params;
  const updates = await prisma.dominioSscUpdate.findMany({
    where: { sscId: id },
    orderBy: { receivedAt: "desc" },
  });

  return NextResponse.json(updates);
}

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ok = await ensureModuleAccess("dominio");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const { id } = await params;
  await prisma.dominioSscUpdate.updateMany({
    where: { sscId: id, visto: false },
    data: { visto: true },
  });

  return NextResponse.json({ ok: true });
}
