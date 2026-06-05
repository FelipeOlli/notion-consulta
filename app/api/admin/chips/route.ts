import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { ensureModuleAccess } from "@/lib/admin-auth";

export async function GET() {
  const ok = await ensureModuleAccess("chips");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const chips = await prisma.chip.findMany({
    include: { empresa: true },
    orderBy: { empresa: { nome: "asc" } },
  });

  return NextResponse.json(chips);
}

export async function POST(req: NextRequest) {
  const ok = await ensureModuleAccess("chips");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const body = await req.json();
  const { numero, operadora, empresaId, ultimaRecarga, duracaoDias } = body;

  if (!numero || !operadora || !empresaId || !ultimaRecarga || !duracaoDias) {
    return NextResponse.json({ message: "Campos obrigatórios faltando." }, { status: 400 });
  }

  const chip = await prisma.chip.create({
    data: {
      numero,
      operadora,
      empresaId,
      ultimaRecarga: new Date(ultimaRecarga),
      duracaoDias: Number(duracaoDias),
    },
    include: { empresa: true },
  });

  return NextResponse.json(chip, { status: 201 });
}
