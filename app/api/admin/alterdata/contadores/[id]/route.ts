import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await ensureModuleAccess("alterdata"))) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }
  await prisma.alterdataClienteContador.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
