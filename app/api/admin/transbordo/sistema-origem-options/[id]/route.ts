import { NextResponse } from "next/server";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { getAdminSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await ensureModuleAccess("dominio");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const session = await getAdminSession();
  if (session?.role !== "master")
    return NextResponse.json({ message: "Apenas master pode excluir opções." }, { status: 403 });

  const { id } = await params;
  await prisma.transbordoSistemaOrigemOption.delete({ where: { id: Number(id) } });

  return NextResponse.json({ ok: true });
}
