import { NextRequest, NextResponse } from "next/server";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ok = await ensureModuleAccess("guias_ti");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  const data = await prisma.guiaTag.findMany({ orderBy: { nome: "asc" } });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const ok = await ensureModuleAccess("guias_ti");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  try {
    const { nome } = await request.json();
    if (!nome?.trim()) {
      return NextResponse.json({ message: "nome é obrigatório." }, { status: 400 });
    }
    const created = await prisma.guiaTag.create({ data: { nome: nome.trim() } });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar tag.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
