import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess, platformEditorMutationGuard } from "@/lib/admin-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("certificados");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const { id } = await params;
    const cert = await prisma.digitalCertificate.findUnique({ where: { id } });
    if (!cert) return NextResponse.json({ message: "Certificado nao encontrado." }, { status: 404 });

    const absolutePath = path.join(process.cwd(), cert.filePath);
    const content = await fs.readFile(absolutePath);

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": cert.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(cert.fileName)}"`,
        "Content-Length": String(content.byteLength),
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return NextResponse.json(
        {
          message:
            "Arquivo do certificado nao foi encontrado no servidor. Faca upload novamente para restaurar o download.",
        },
        { status: 404 }
      );
    }
    const message = error instanceof Error ? error.message : "Nao foi possivel baixar o certificado.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("certificados");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });
  const denied = await platformEditorMutationGuard();
  if (denied) return denied;

  try {
    const { id } = await params;
    const current = await prisma.digitalCertificate.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ message: "Certificado nao encontrado." }, { status: 404 });

    const form = await request.formData();
    const companyId = String(form.get("companyId") ?? "").trim();
    const certificatePassword = String(form.get("certificatePassword") ?? "").trim();
    const expiresAt = String(form.get("expiresAt") ?? "").trim();
    const socio = String(form.get("socio") ?? "").trim();
    const file = form.get("file");

    if (!companyId) return NextResponse.json({ message: "Empresa obrigatoria." }, { status: 400 });
    if (!certificatePassword) return NextResponse.json({ message: "Senha do certificado obrigatoria." }, { status: 400 });
    if (!expiresAt) return NextResponse.json({ message: "Vencimento obrigatorio." }, { status: 400 });

    let nextFilePath = current.filePath;
    let nextFileName = current.fileName;
    let nextFileSize = current.fileSize;
    let nextMimeType = current.mimeType;

    if (file instanceof File) {
      const dir = path.join(process.cwd(), "data", "certificados");
      await fs.mkdir(dir, { recursive: true });
      const ext = path.extname(file.name) || ".bin";
      const name = `${Date.now()}-${crypto.randomUUID()}${ext}`;
      const absolutePath = path.join(dir, name);
      const content = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(absolutePath, content);

      nextFilePath = path.join("data", "certificados", name);
      nextFileName = file.name;
      nextFileSize = content.byteLength;
      nextMimeType = file.type || "application/octet-stream";
    }

    await prisma.company.update({
      where: { id: companyId },
      data: { partnerName: socio || null },
    });

    const updated = await prisma.digitalCertificate.update({
      where: { id },
      data: {
        companyId,
        certificatePassword,
        expiresAt: new Date(expiresAt),
        filePath: nextFilePath,
        fileName: nextFileName,
        fileSize: nextFileSize,
        mimeType: nextMimeType,
      },
      include: { company: true },
    });

    if (file instanceof File && current.filePath !== nextFilePath) {
      const oldAbsolutePath = path.join(process.cwd(), current.filePath);
      await fs.unlink(oldAbsolutePath).catch(() => null);
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel atualizar certificado.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("certificados");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });
  const denied = await platformEditorMutationGuard();
  if (denied) return denied;

  try {
    const { id } = await params;
    const current = await prisma.digitalCertificate.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ message: "Certificado nao encontrado." }, { status: 404 });
    await prisma.digitalCertificate.delete({ where: { id } });
    const fileAbsolutePath = path.join(process.cwd(), current.filePath);
    await fs.unlink(fileAbsolutePath).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel excluir certificado.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
