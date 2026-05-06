import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("senha");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { name } = body as { name?: string };

  const group = await prisma.ipMonitorGroup.update({
    where: { id },
    data: { ...(name !== undefined && { name: name.trim() }) },
  });

  return NextResponse.json({ data: group });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("senha");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  const { id } = await params;
  await prisma.ipMonitorGroup.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
