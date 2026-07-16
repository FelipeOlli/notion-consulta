import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await ensureModuleAccess("iungo"))) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { ramal, status, login, senha, numero, funcionarios, backupSincronizado } = body;

  const data: Record<string, unknown> = {};
  if (ramal !== undefined) data.ramal = String(ramal).trim();
  if (status !== undefined) data.status = status;
  if (login !== undefined) data.login = String(login).trim();
  if (senha !== undefined) data.senha = String(senha).trim();
  if (numero !== undefined) data.numero = numero ? String(numero).trim() : null;
  if (funcionarios !== undefined) data.funcionarios = Array.isArray(funcionarios) ? funcionarios.map(String) : [];
  if (backupSincronizado !== undefined) data.backupSincronizado = Boolean(backupSincronizado);

  const atualizado = await prisma.iungoRamal.update({
    where: { id },
    data,
  });

  return NextResponse.json(atualizado);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await ensureModuleAccess("iungo"))) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  await prisma.iungoRamal.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
