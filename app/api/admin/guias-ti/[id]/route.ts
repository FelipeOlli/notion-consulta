import { NextRequest, NextResponse } from "next/server";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import { resolveGuiaFile, guiaFilenameFromUrl } from "@/lib/guias-storage";

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

    async function removeFile(url: string) {
      const name = guiaFilenameFromUrl(url);
      if (!name) return;
      const p = await resolveGuiaFile(name);
      if (p) await unlink(p).catch(() => {});
    }

    // Remover arquivo legado principal e todos os anexos
    if (guia.fileType !== "link") await removeFile(guia.fileUrl);
    for (const arq of guia.arquivos ?? []) await removeFile(arq.fileUrl);

    await prisma.guiaTi.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao remover guia.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
