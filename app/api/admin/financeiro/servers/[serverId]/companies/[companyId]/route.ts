import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { getFinanceiroEmailServerById } from "@/lib/financeiro-server-guard";

const MAX_NAME = 200;

type Params = { params: Promise<{ serverId: string; companyId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("financeiro");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const { serverId, companyId } = await params;
    const server = await getFinanceiroEmailServerById(serverId);
    if (!server) {
      return NextResponse.json({ message: "Servico nao encontrado ou nao e um servidor financeiro." }, { status: 404 });
    }

    const existing = await prisma.financeiroServerCompany.findFirst({
      where: { id: companyId, serverId },
    });
    if (!existing) {
      return NextResponse.json({ message: "Empresa nao encontrada." }, { status: 404 });
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
      return NextResponse.json({ message: "Nome invalido." }, { status: 400 });
    }

    const updated = await prisma.financeiroServerCompany.update({
      where: { id: companyId },
      data: { name },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    if (raw.includes("Unique constraint") || /Unique constraint/i.test(raw)) {
      return NextResponse.json({ message: "Ja existe uma empresa com este nome neste servico." }, { status: 409 });
    }
    return NextResponse.json({ message: raw || "Erro ao atualizar empresa." }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("financeiro");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const { serverId, companyId } = await params;
    const server = await getFinanceiroEmailServerById(serverId);
    if (!server) {
      return NextResponse.json({ message: "Servico nao encontrado ou nao e um servidor financeiro." }, { status: 404 });
    }

    const existing = await prisma.financeiroServerCompany.findFirst({
      where: { id: companyId, serverId },
    });
    if (!existing) {
      return NextResponse.json({ message: "Empresa nao encontrada." }, { status: 404 });
    }

    await prisma.financeiroServerCompany.delete({ where: { id: companyId } });

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ message: raw || "Erro ao excluir empresa." }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
