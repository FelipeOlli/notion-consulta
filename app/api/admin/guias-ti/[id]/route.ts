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

    function getLocalPath(url: string) {
      if (url.startsWith("/api/admin/guias-ti/files/")) {
        const fname = path.basename(url);
        return path.join(process.cwd(), "public", "uploads", "guias", fname);
      }
      if (url.startsWith("/uploads/")) {
        return path.join(process.cwd(), "public", url);
      }
      return null;
    }

    // Remover arquivo legado principal se existir
    if (guia.fileType !== "link") {
      const p = getLocalPath(guia.fileUrl);
      if (p) await unlink(p).catch(() => {});
    }

    // Remover todos os arquivos associados
    if (guia.arquivos?.length) {
      for (const arq of guia.arquivos) {
        const p = getLocalPath(arq.fileUrl);
        if (p) await unlink(p).catch(() => {});
      }
    }

    await prisma.guiaTi.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao remover guia.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
