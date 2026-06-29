import { NextResponse } from "next/server";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = [
  "image/",
  "video/",
  "audio/",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats",
  "application/vnd.ms-",
  "text/",
];

function isMimetypeAllowed(mime: string) {
  return ALLOWED_TYPES.some((t) => mime.startsWith(t));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await ensureModuleAccess("transbordo");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const { id } = await params;

  const comments = await prisma.transbordoComment.findMany({
    where: { ticketId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await ensureModuleAccess("transbordo");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const { id: ticketId } = await params;

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const content = (formData.get("content") as string) ?? "";
    const files = formData.getAll("attachments") as File[];

    const attachments: { url: string; size: number; filename: string; mimetype: string }[] = [];

    for (const file of files) {
      if (!isMimetypeAllowed(file.type)) {
        return NextResponse.json({ message: `Tipo não permitido: ${file.type}` }, { status: 400 });
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ message: "Arquivo maior que 50 MB." }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const subdir = path.join(process.cwd(), "app", "data", "anexos", "transbordo", ticketId);
      await mkdir(subdir, { recursive: true });
      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      await writeFile(path.join(subdir, safeName), buffer);

      attachments.push({
        url: `/api/admin/transbordo/anexos/${ticketId}/${safeName}`,
        size: file.size,
        filename: file.name,
        mimetype: file.type,
      });
    }

    const comment = await prisma.transbordoComment.create({
      data: { ticketId, content, attachments: attachments.length ? attachments : undefined },
    });

    return NextResponse.json(comment, { status: 201 });
  }

  // JSON simples (sem anexo)
  const body = await req.json();
  const comment = await prisma.transbordoComment.create({
    data: { ticketId, content: body.content ?? "" },
  });

  return NextResponse.json(comment, { status: 201 });
}
