import { NextRequest, NextResponse } from "next/server";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET() {
  const ok = await ensureModuleAccess("guias_ti");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  const data = await prisma.guiaTi.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const ok = await ensureModuleAccess("guias_ti");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      // Upload de arquivo físico
      const formData = await request.formData();
      const nome = (formData.get("nome") as string)?.trim();
      const modulo = (formData.get("modulo") as string)?.trim() || null;
      const fileType = (formData.get("fileType") as string)?.trim();
      const file = formData.get("file") as File | null;

      if (!nome || !fileType || !file) {
        return NextResponse.json({ message: "nome, fileType e file são obrigatórios." }, { status: 400 });
      }

      // Salvar arquivo em public/uploads/guias/
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "guias");
      await mkdir(uploadsDir, { recursive: true });

      const ext = path.extname(file.name) || "";
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      const filePath = path.join(uploadsDir, safeName);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      const fileUrl = `/uploads/guias/${safeName}`;

      const created = await prisma.guiaTi.create({
        data: {
          nome,
          modulo,
          fileType,
          fileUrl,
          fileName: file.name,
          fileSize: file.size,
        },
      });
      return NextResponse.json({ data: created }, { status: 201 });

    } else {
      // Link externo (JSON)
      const { nome, modulo, fileUrl } = await request.json();
      if (!nome?.trim() || !fileUrl?.trim()) {
        return NextResponse.json({ message: "nome e fileUrl são obrigatórios." }, { status: 400 });
      }
      const created = await prisma.guiaTi.create({
        data: {
          nome: nome.trim(),
          modulo: modulo?.trim() || null,
          fileType: "link",
          fileUrl: fileUrl.trim(),
          fileName: null,
          fileSize: null,
        },
      });
      return NextResponse.json({ data: created }, { status: 201 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar guia.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
