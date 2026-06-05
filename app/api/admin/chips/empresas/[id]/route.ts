import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ok = await ensureModuleAccess("chips");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const { id } = await params;

  const count = await prisma.chip.count({ where: { empresaId: id } });
  if (count > 0) {
    return NextResponse.json(
      { message: "Empresa possui chips vinculados. Remova os chips antes de excluir." },
      { status: 409 }
    );
  }

  await prisma.chipEmpresa.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
