import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess, platformEditorMutationGuard } from "@/lib/admin-auth";
import { getFinanceiroEmailServerById } from "@/lib/financeiro-server-guard";
import { logFinanceiroActivity } from "@/lib/financeiro-activity-log";

const MAX_NAME = 200;

type Params = { params: Promise<{ serverId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("financeiro");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const { serverId } = await params;
    const server = await getFinanceiroEmailServerById(serverId);
    if (!server) {
      return NextResponse.json({ message: "Servico nao encontrado ou nao e um servidor financeiro." }, { status: 404 });
    }

    const companies = await prisma.financeiroServerCompany.findMany({
      where: { serverId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({
      data: {
        server: { id: server.id, name: server.name },
        companies,
      },
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    if (/FinanceiroServerCompany/i.test(raw) && /does not exist|relation/i.test(raw)) {
      return NextResponse.json(
        { message: "Tabela FinanceiroServerCompany ausente. Aplique migracoes." },
        { status: 503 }
      );
    }
    return NextResponse.json({ message: raw || "Erro ao listar empresas." }, { status: 400 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("financeiro");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });
  const denied = await platformEditorMutationGuard();
  if (denied) return denied;

  try {
    const { serverId } = await params;
    const server = await getFinanceiroEmailServerById(serverId);
    if (!server) {
      return NextResponse.json({ message: "Servico nao encontrado ou nao e um servidor financeiro." }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "JSON invalido." }, { status: 400 });
    }
    if (typeof body !== "object" || body === null || typeof (body as { name?: unknown }).name !== "string") {
      return NextResponse.json({ message: "Envie { name: string }." }, { status: 400 });
    }
    const name = (body as { name: string }).name.trim().slice(0, MAX_NAME);
    if (!name) {
      return NextResponse.json({ message: "Nome da empresa invalido." }, { status: 400 });
    }

    const created = await prisma.financeiroServerCompany.create({
      data: { serverId, name },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });

    await logFinanceiroActivity({
      action: "COMPANY_CREATE",
      metadata: {
        serverId,
        serverName: server.name,
        companyId: created.id,
        companyName: created.name,
      },
    });

    return NextResponse.json({ data: created });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    if (raw.includes("Unique constraint") || /Unique constraint/i.test(raw)) {
      return NextResponse.json({ message: "Ja existe uma empresa com este nome neste servico." }, { status: 409 });
    }
    return NextResponse.json({ message: raw || "Erro ao criar empresa." }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
