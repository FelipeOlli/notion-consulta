import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { ensureModuleAccess } from "@/lib/admin-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  if (!(await ensureModuleAccess("alterdata"))) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }

  const { id } = await params;
  const anexo = await prisma.alterdataObservacaoAnexo.findUnique({ where: { id } });
  if (!anexo) return NextResponse.json({ message: "Anexo não encontrado." }, { status: 404 });

  try {
    const content = await fs.readFile(path.join(process.cwd(), anexo.filePath));
    const isInline = anexo.mimeType.startsWith("image/") || anexo.mimeType.startsWith("video/");
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": anexo.mimeType,
        "Content-Disposition": `${isInline ? "inline" : "attachment"}; filename="${encodeURIComponent(anexo.fileName)}"`,
        "Content-Length": String(content.byteLength),
      },
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
      return NextResponse.json({ message: "Arquivo não encontrado no servidor." }, { status: 404 });
    }
    return NextResponse.json({ message: "Erro ao baixar o anexo." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session || !(await ensureModuleAccess("alterdata"))) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }

  const anexo = await prisma.alterdataObservacaoAnexo.findUnique({
    where: { id },
    include: { observacao: true },
  });
  if (!anexo) return NextResponse.json({ message: "Anexo não encontrado." }, { status: 404 });
  if (anexo.observacao.authorEmail !== session.email) {
    return NextResponse.json({ message: "Só o autor pode excluir." }, { status: 403 });
  }

  await prisma.alterdataObservacaoAnexo.delete({ where: { id } });
  await fs.unlink(path.join(process.cwd(), anexo.filePath)).catch(() => null);

  return new NextResponse(null, { status: 204 });
}

export const dynamic = "force-dynamic";
