import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { getAdminSession } from "@/lib/session";

export async function GET() {
  const ok = await ensureModuleAccess("dominio");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const sscs = await prisma.dominioSsc.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { updates: { where: { visto: false } } } },
    },
  });

  return NextResponse.json(sscs);
}

export async function POST(req: NextRequest) {
  const ok = await ensureModuleAccess("dominio");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const session = await getAdminSession();
  const body = await req.json();
  const numero = (body.numero as string | undefined)?.trim();
  const assunto = (body.assunto as string | undefined)?.trim() || null;

  if (!numero) return NextResponse.json({ message: "Número da SSC é obrigatório." }, { status: 400 });

  const ssc = await prisma.dominioSsc.create({
    data: { numero, assunto, criadoPor: session?.email ?? null },
    include: { _count: { select: { updates: { where: { visto: false } } } } },
  });

  return NextResponse.json(ssc, { status: 201 });
}
