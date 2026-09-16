import { NextRequest, NextResponse } from "next/server";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/** Infere fileType a partir do MIME e extensão do arquivo. */
function inferFileType(mime: string, filename: string): string {
  const ext = path.extname(filename).toLowerCase();

  // PDF
  if (mime === "application/pdf" || ext === ".pdf") return "pdf";

  // Áudio / MP3
  if (mime.startsWith("audio/") || ext === ".mp3" || ext === ".wav" || ext === ".ogg" || ext === ".m4a" || ext === ".aac") return "mp3";

  // Vídeo / MP4
  if (mime.startsWith("video/") || ext === ".mp4" || ext === ".mkv" || ext === ".avi" || ext === ".mov" || ext === ".webm") return "mp4";

  // Documentos Word
  if (
    mime.includes("word") ||
    mime === "application/msword" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === ".doc" || ext === ".docx"
  ) return "word";

  // Planilhas Excel
  if (
    mime.includes("excel") ||
    mime.includes("spreadsheet") ||
    ext === ".xls" || ext === ".xlsx" || ext === ".csv"
  ) return "excel";

  // Apresentações PowerPoint
  if (
    mime.includes("powerpoint") ||
    mime.includes("presentation") ||
    ext === ".ppt" || ext === ".pptx"
  ) return "powerpoint";

  // Arquivos compactados
  if (ext === ".zip" || ext === ".rar" || ext === ".7z" || ext === ".tar" || ext === ".gz") return "zip";

  // Imagens
  if (mime.startsWith("image/") || ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".gif" || ext === ".webp") return "image";

  // Texto puro
  if (mime.startsWith("text/") || ext === ".txt" || ext === ".md") return "txt";

  return "file";
}

export async function GET() {
  const ok = await ensureModuleAccess("guias_ti");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  const data = await prisma.guiaTi.findMany({
    orderBy: { createdAt: "desc" },
    include: { tags: true },
  });
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
      const file = formData.get("file") as File | null;
      const observacoes = ((formData.get("observacoes") as string) || "").trim() || null;
      const tagIdsRaw = (formData.get("tagIds") as string) ?? "[]";
      let tagIds: string[] = [];
      try { tagIds = JSON.parse(tagIdsRaw); } catch { tagIds = []; }

      if (!nome) {
        return NextResponse.json({ message: "O nome da guia é obrigatório." }, { status: 400 });
      }

      let fileUrl = "";
      let fileType = "note";
      let fileName: string | null = null;
      let fileSize: number | null = null;

      if (file && file.size > 0) {
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "guias");
        await mkdir(uploadsDir, { recursive: true });

        const ext = path.extname(file.name) || "";
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        const filePath = path.join(uploadsDir, safeName);
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);

        fileUrl = `/uploads/guias/${safeName}`;
        fileType = inferFileType(file.type, file.name);
        fileName = file.name;
        fileSize = file.size;
      }

      const created = await prisma.guiaTi.create({
        data: {
          nome,
          modulo: null,
          fileType,
          fileUrl,
          fileName,
          fileSize,
          observacoes,
          tags: tagIds.length > 0 ? { connect: tagIds.map((id) => ({ id })) } : undefined,
        },
        include: { tags: true },
      });
      return NextResponse.json({ data: created }, { status: 201 });

    } else {
      // JSON (Link externo e/ou texto)
      const { nome, fileUrl, observacoes, tagIds } = await request.json();
      if (!nome?.trim()) {
        return NextResponse.json({ message: "O nome da guia é obrigatório." }, { status: 400 });
      }
      const ids: string[] = Array.isArray(tagIds) ? tagIds : [];
      const obs = typeof observacoes === "string" && observacoes.trim() ? observacoes.trim() : null;
      const url = typeof fileUrl === "string" && fileUrl.trim() ? fileUrl.trim() : "";
      const fileType = url ? "link" : "note";

      const created = await prisma.guiaTi.create({
        data: {
          nome: nome.trim(),
          modulo: null,
          fileType,
          fileUrl: url,
          fileName: null,
          fileSize: null,
          observacoes: obs,
          tags: ids.length > 0 ? { connect: ids.map((id) => ({ id })) } : undefined,
        },
        include: { tags: true },
      });
      return NextResponse.json({ data: created }, { status: 201 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar guia.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
