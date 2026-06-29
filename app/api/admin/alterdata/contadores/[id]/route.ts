import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await ensureModuleAccess("alterdata"))) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }
  const body = await req.json();
  const { login, senha } = body;
  const data: Record<string, string> = {};
  if (typeof login === "string" && login.trim()) data.login = login.trim();
  if (typeof senha === "string" && senha.trim()) data.senha = senha.trim();
  const atualizado = await prisma.alterdataClienteContador.update({ where: { id }, data });
  return NextResponse.json(atualizado);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await ensureModuleAccess("alterdata"))) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }
  await prisma.alterdataClienteContador.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
