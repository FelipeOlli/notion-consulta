import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { ensureModuleAccess } from "@/lib/admin-auth";

const ANEXOS_DIR = path.join(process.cwd(), "data", "anexos");
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_PREFIXES = ["image/", "video/"];
const ALLOWED_MIME_EXACT = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function isMimeAllowed(mime: string): boolean {
  if (ALLOWED_MIME_EXACT.includes(mime)) return true;
  return ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p));
}

async function saveFile(file: File): Promise<{ filePath: string; fileName: string; fileSize: number; mimeType: string }> {
  await fs.mkdir(ANEXOS_DIR, { recursive: true });
  const ext = path.extname(file.name) || ".bin";
  const name = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  const absolutePath = path.join(ANEXOS_DIR, name);
  const content = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, content);
  return {
    filePath: path.join("data", "anexos", name),
    fileName: file.name,
    fileSize: content.byteLength,
    mimeType: file.type || "application/octet-stream",
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await ensureModuleAccess("alterdata"))) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }
  const obs = await prisma.alterdataClienteObservacao.findMany({
    where: { clienteId: id },
    orderBy: { createdAt: "desc" },
    include: { anexos: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json(obs);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session || !(await ensureModuleAccess("alterdata"))) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }

  const form = await req.formData();
  const texto = String(form.get("texto") ?? "").trim();
  const files = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);

  if (!texto && files.length === 0) {
    return NextResponse.json({ message: "Informe um texto ou ao menos um arquivo." }, { status: 400 });
  }

  // Validar arquivos
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: `Arquivo "${file.name}" excede o limite de 50MB.` }, { status: 400 });
    }
    if (!isMimeAllowed(file.type)) {
      return NextResponse.json(
        { message: `Tipo de arquivo não permitido: ${file.type || "desconhecido"}` },
        { status: 400 }
      );
    }
  }

  // Gravar arquivos no disco
  const savedFiles = await Promise.all(files.map(saveFile));

  const obs = await prisma.alterdataClienteObservacao.create({
    data: {
      clienteId: id,
      texto,
      authorEmail: session.email,
      anexos: {
        create: savedFiles,
      },
    },
    include: { anexos: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json(obs, { status: 201 });
}

export const dynamic = "force-dynamic";
