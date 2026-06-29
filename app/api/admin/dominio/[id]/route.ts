import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ok = await ensureModuleAccess("dominio");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.assunto !== undefined) data.assunto = body.assunto || null;
  if (body.status !== undefined) data.status = body.status;

  const ssc = await prisma.dominioSsc.update({
    where: { id },
    data,
    include: { _count: { select: { updates: { where: { visto: false } } } } },
  });

  return NextResponse.json(ssc);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ok = await ensureModuleAccess("dominio");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const { id } = await params;
  await prisma.dominioSsc.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
