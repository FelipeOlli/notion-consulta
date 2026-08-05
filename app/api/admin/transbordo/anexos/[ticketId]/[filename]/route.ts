import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { ensureModuleAccess } from "@/lib/admin-auth";

type Params = { params: Promise<{ ticketId: string; filename: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  if (!(await ensureModuleAccess("dominio"))) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }

  const { ticketId, filename } = await params;

  const pathPrimary = path.join(process.cwd(), "app", "data", "anexos", "transbordo", ticketId, filename);
  const pathSecondary = path.join(process.cwd(), "data", "anexos", "transbordo", ticketId, filename);

  let content: Buffer | null = null;
  try {
    content = await fs.readFile(pathPrimary);
  } catch {
    try {
      content = await fs.readFile(pathSecondary);
    } catch {
      return NextResponse.json({ message: "Arquivo não encontrado." }, { status: 404 });
    }
  }

  const displayFilename = filename.replace(/^\d+_/, "");
  const isInline = /\.(png|jpe?g|gif|webp|svg|pdf)$/i.test(filename);

  return new NextResponse(new Uint8Array(content), {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `${isInline ? "inline" : "attachment"}; filename="${encodeURIComponent(displayFilename)}"`,
      "Content-Length": String(content.byteLength),
    },
  });
}

export const dynamic = "force-dynamic";
