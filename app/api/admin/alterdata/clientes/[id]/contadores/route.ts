import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { AlterdataCredencialTipo } from "@prisma/client";

const TIPOS_VALIDOS = Object.values(AlterdataCredencialTipo);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await ensureModuleAccess("alterdata"))) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }
  const tipoParam = req.nextUrl.searchParams.get("tipo") ?? "ECONTADOR";
  if (!TIPOS_VALIDOS.includes(tipoParam as AlterdataCredencialTipo)) {
    return NextResponse.json({ message: "Tipo inválido." }, { status: 400 });
  }
  const tipo = tipoParam as AlterdataCredencialTipo;
  const contadores = await prisma.alterdataClienteContador.findMany({
    where: { clienteId: id, tipo },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(contadores);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await ensureModuleAccess("alterdata"))) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }
  const { login, senha, tipo: tipoBody } = await req.json();
  if (!login?.trim() || !senha?.trim()) {
    return NextResponse.json({ message: "Login e senha obrigatórios." }, { status: 400 });
  }
  const tipoFinal = tipoBody ?? "ECONTADOR";
  if (!TIPOS_VALIDOS.includes(tipoFinal as AlterdataCredencialTipo)) {
    return NextResponse.json({ message: "Tipo inválido." }, { status: 400 });
  }
  const contador = await prisma.alterdataClienteContador.create({
    data: { clienteId: id, tipo: tipoFinal as AlterdataCredencialTipo, login: login.trim(), senha: senha.trim() },
  });
  return NextResponse.json(contador, { status: 201 });
}
