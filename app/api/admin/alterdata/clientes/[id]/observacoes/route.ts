import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { ensureModuleAccess } from "@/lib/admin-auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await ensureModuleAccess("alterdata"))) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }
  const obs = await prisma.alterdataClienteObservacao.findMany({
    where: { clienteId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(obs);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session || !(await ensureModuleAccess("alterdata"))) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }
  const { texto } = await req.json();
  if (!texto?.trim()) {
    return NextResponse.json({ message: "Texto obrigatório." }, { status: 400 });
  }
  const obs = await prisma.alterdataClienteObservacao.create({
    data: { clienteId: id, texto: texto.trim(), authorEmail: session.email },
  });
  return NextResponse.json(obs, { status: 201 });
}
