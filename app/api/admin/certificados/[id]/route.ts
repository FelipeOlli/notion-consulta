import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

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
    const message = error instanceof Error ? error.message : "Nao foi possivel baixar o certificado.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("certificados");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const body = await request.json();
    const { id } = await params;
    const updated = await prisma.digitalCertificate.update({
      where: { id },
      data: {
        companyId: body?.companyId ? String(body.companyId).trim() : undefined,
        certificatePassword: body?.certificatePassword ? String(body.certificatePassword).trim() : undefined,
        expiresAt: body?.expiresAt ? new Date(String(body.expiresAt)) : undefined,
      },
      include: { company: true },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel atualizar certificado.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("certificados");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

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
