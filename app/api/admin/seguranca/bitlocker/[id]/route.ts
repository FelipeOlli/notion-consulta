import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ok = await ensureModuleAccess("seguranca");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const { id } = await params;

  await prisma.bitLockerEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
