import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { MAX_FILE_SIZE, isMimeAllowed, saveFile } from "@/lib/anexos";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("senha");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  const { id } = await params;

  const protocols = await prisma.ipMonitorProtocol.findMany({
    where: { monitorId: id },
    orderBy: { createdAt: "desc" },
    include: { anexos: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({ data: protocols });
}

export async function POST(request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("senha");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const { id } = await params;
    const form = await request.formData();

    const protocol = String(form.get("protocol") ?? "").trim();
    const serviceOrder = String(form.get("serviceOrder") ?? "").trim();
    const observacao = String(form.get("observacao") ?? "").trim() || null;
    const files = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);

    if (!protocol) {
      return NextResponse.json({ message: "Número do protocolo é obrigatório." }, { status: 400 });
    }

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

    const savedFiles = await Promise.all(files.map(saveFile));

    const record = await prisma.ipMonitorProtocol.create({
      data: {
        monitorId: id,
        protocol,
        serviceOrder,
        observacao,
        anexos: { create: savedFiles },
      },
      include: { anexos: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao registrar protocolo.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
