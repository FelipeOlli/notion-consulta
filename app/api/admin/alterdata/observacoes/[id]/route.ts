import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Acesso negado." }, { status: 403 });

  const obs = await prisma.alterdataClienteObservacao.findUnique({ where: { id } });
  if (!obs) return NextResponse.json({ message: "Não encontrado." }, { status: 404 });
  if (obs.authorEmail !== session.email) {
    return NextResponse.json({ message: "Só o autor pode editar." }, { status: 403 });
  }

  const { texto } = await req.json();
  if (!texto?.trim()) return NextResponse.json({ message: "Texto obrigatório." }, { status: 400 });

  const updated = await prisma.alterdataClienteObservacao.update({
    where: { id },
    data: { texto: texto.trim(), editedAt: new Date() },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Acesso negado." }, { status: 403 });

  const obs = await prisma.alterdataClienteObservacao.findUnique({
    where: { id },
    include: { anexos: true },
  });
  if (!obs) return NextResponse.json({ message: "Não encontrado." }, { status: 404 });
  if (obs.authorEmail !== session.email) {
    return NextResponse.json({ message: "Só o autor pode excluir." }, { status: 403 });
  }

  await prisma.alterdataClienteObservacao.delete({ where: { id } });

  // Remove arquivos do disco (cascade já removeu os registros)
  for (const anexo of obs.anexos) {
    await fs.unlink(path.join(process.cwd(), anexo.filePath)).catch(() => null);
  }

  return new NextResponse(null, { status: 204 });
}
