import { NextRequest, NextResponse } from "next/server";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ok = await ensureModuleAccess("guias_ti");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  const data = await prisma.anydeskEntry.findMany({ orderBy: { nome: "asc" } });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const ok = await ensureModuleAccess("guias_ti");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  try {
    const { nome, anydesk, senha } = await request.json();
    if (!nome?.trim() || !anydesk?.trim()) {
      return NextResponse.json({ message: "Nome e Anydesk são obrigatórios." }, { status: 400 });
    }
    const created = await prisma.anydeskEntry.create({
      data: { nome: nome.trim(), anydesk: anydesk.trim(), senha: senha?.trim() || null },
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar entrada.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
