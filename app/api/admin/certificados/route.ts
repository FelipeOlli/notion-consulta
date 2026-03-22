import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { certificadosMutationGuard, ensureModuleAccess } from "@/lib/admin-auth";

const certificatesDir = path.join(process.cwd(), "data", "certificados");

async function writeCertificateFile(file: File) {
  await fs.mkdir(certificatesDir, { recursive: true });
  const ext = path.extname(file.name) || ".bin";
  const name = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  const absolutePath = path.join(certificatesDir, name);
  const content = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, content);
  return {
    filePath: path.join("data", "certificados", name),
    fileName: file.name,
    fileSize: content.byteLength,
    mimeType: file.type || "application/octet-stream",
  };
}

export async function GET() {
  const ok = await ensureModuleAccess("certificados");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  const data = await prisma.digitalCertificate.findMany({
    include: { company: true },
    orderBy: { expiresAt: "asc" },
  });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const ok = await ensureModuleAccess("certificados");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });
  const denied = await certificadosMutationGuard();
  if (denied) return denied;

  try {
    const form = await request.formData();
    const companyId = String(form.get("companyId") ?? "").trim();
    const expiresAt = String(form.get("expiresAt") ?? "").trim();
    const certificatePassword = String(form.get("certificatePassword") ?? "").trim();
    const file = form.get("file");

    if (!companyId) return NextResponse.json({ message: "Empresa obrigatoria." }, { status: 400 });
    if (!expiresAt) return NextResponse.json({ message: "Vencimento obrigatorio." }, { status: 400 });
    if (!certificatePassword) return NextResponse.json({ message: "Senha do certificado obrigatoria." }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ message: "Arquivo obrigatorio." }, { status: 400 });

    const socio = String(form.get("socio") ?? "").trim();
    if (socio) {
      await prisma.company.update({
        where: { id: companyId },
        data: { partnerName: socio },
      });
    }

    const savedFile = await writeCertificateFile(file);

    const created = await prisma.digitalCertificate.create({
      data: {
        companyId,
        certificatePassword,
        expiresAt: new Date(expiresAt),
        filePath: savedFile.filePath,
        fileName: savedFile.fileName,
        fileSize: savedFile.fileSize,
        mimeType: savedFile.mimeType,
      },
      include: { company: true },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel registrar certificado.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
