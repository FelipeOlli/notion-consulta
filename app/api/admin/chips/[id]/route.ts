import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ok = await ensureModuleAccess("chips");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.numero !== undefined) data.numero = body.numero;
  if (body.operadora !== undefined) data.operadora = body.operadora;
  if (body.empresaId !== undefined) data.empresaId = body.empresaId;
  if (body.duracaoDias !== undefined) data.duracaoDias = Number(body.duracaoDias);
  if (body.ultimaRecarga !== undefined) data.ultimaRecarga = new Date(body.ultimaRecarga);
  if (body.recarregarAgora) data.ultimaRecarga = new Date();

  const chip = await prisma.chip.update({
    where: { id },
    data,
    include: { empresa: true },
  });

  return NextResponse.json(chip);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ok = await ensureModuleAccess("chips");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const { id } = await params;
  await prisma.chip.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
