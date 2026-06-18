import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("senha");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  const { id } = await params;
  const anexo = await prisma.ipMonitorProtocolAnexo.findUnique({ where: { id } });
  if (!anexo) return NextResponse.json({ message: "Anexo não encontrado." }, { status: 404 });

  try {
    const content = await fs.readFile(path.join(process.cwd(), anexo.filePath));
    const isInline =
      anexo.mimeType.startsWith("image/") ||
      anexo.mimeType.startsWith("video/") ||
      anexo.mimeType.startsWith("audio/");
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

export async function DELETE(_request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("senha");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  const { id } = await params;
  const anexo = await prisma.ipMonitorProtocolAnexo.findUnique({ where: { id } });
  if (!anexo) return NextResponse.json({ message: "Anexo não encontrado." }, { status: 404 });

  await prisma.ipMonitorProtocolAnexo.delete({ where: { id } });
  await fs.unlink(path.join(process.cwd(), anexo.filePath)).catch(() => null);

  return new NextResponse(null, { status: 204 });
}

export const dynamic = "force-dynamic";
