import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

export async function GET() {
  const ok = await ensureModuleAccess("chips");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const empresas = await prisma.chipEmpresa.findMany({ orderBy: { nome: "asc" } });
  return NextResponse.json(empresas);
}

export async function POST(req: NextRequest) {
  const ok = await ensureModuleAccess("chips");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const { nome } = await req.json();
  if (!nome?.trim()) return NextResponse.json({ message: "Nome obrigatório." }, { status: 400 });

  const empresa = await prisma.chipEmpresa.create({ data: { nome: nome.trim() } });
  return NextResponse.json(empresa, { status: 201 });
}
