import { NextRequest, NextResponse } from "next/server";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await ensureModuleAccess("guias_ti");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  const { id } = await params;
  try {
    const guia = await prisma.guiaTi.findUnique({
      where: { id },
      include: { arquivos: true },
    });
    if (!guia) return NextResponse.json({ message: "Guia não encontrada." }, { status: 404 });

    // Remover arquivo legado principal se existir
    if (guia.fileType !== "link" && guia.fileUrl.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", guia.fileUrl);
      await unlink(filePath).catch(() => {/* ignora se já não existe */});
    }

    // Remover todos os arquivos associados
    if (guia.arquivos?.length) {
      for (const arq of guia.arquivos) {
        if (arq.fileUrl.startsWith("/uploads/")) {
          const filePath = path.join(process.cwd(), "public", arq.fileUrl);
          await unlink(filePath).catch(() => {/* ignora se já não existe */});
        }
      }
    }

    await prisma.guiaTi.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao remover guia.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
