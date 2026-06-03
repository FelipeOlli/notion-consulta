import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await ensureModuleAccess("alterdata"))) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }
  const contadores = await prisma.alterdataClienteContador.findMany({
    where: { clienteId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(contadores);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await ensureModuleAccess("alterdata"))) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }
  const { login, senha } = await req.json();
  if (!login?.trim() || !senha?.trim()) {
    return NextResponse.json({ message: "Login e senha obrigatórios." }, { status: 400 });
  }
  const contador = await prisma.alterdataClienteContador.create({
    data: { clienteId: id, login: login.trim(), senha: senha.trim() },
  });
  return NextResponse.json(contador, { status: 201 });
}
