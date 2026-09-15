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
    const guia = await prisma.guiaTi.findUnique({ where: { id } });
    if (!guia) return NextResponse.json({ message: "Guia não encontrada." }, { status: 404 });

    // Remover arquivo físico se não for link externo
    if (guia.fileType !== "link" && guia.fileUrl.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", guia.fileUrl);
      await unlink(filePath).catch(() => {/* ignora se já não existe */});
    }

    await prisma.guiaTi.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao remover guia.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
