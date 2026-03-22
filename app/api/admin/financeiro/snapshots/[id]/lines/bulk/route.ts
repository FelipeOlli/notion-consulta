import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess, platformEditorMutationGuard } from "@/lib/admin-auth";
import { financeiroCompanyForServer } from "@/lib/financeiro-company-line";
import { recalcSnapshotLineAggregates } from "@/lib/financeiro-snapshot-aggregates";
import { logFinanceiroActivity } from "@/lib/financeiro-activity-log";

const MAX_BULK = 2000;

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("financeiro");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });
  const denied = await platformEditorMutationGuard();
  if (denied) return denied;

  try {
    const { id: snapshotId } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "JSON invalido." }, { status: 400 });
    }
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ message: "Corpo JSON invalido." }, { status: 400 });
    }
    const b = body as { lineIds?: unknown; financeiroServerCompanyId?: unknown };

    if (!Array.isArray(b.lineIds) || b.lineIds.length === 0) {
      return NextResponse.json({ message: "Envie lineIds: string[] nao vazio." }, { status: 400 });
    }
    const rawIds = b.lineIds.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    const lineIds = [...new Set(rawIds)];
    if (lineIds.length === 0) {
      return NextResponse.json({ message: "Nenhum id de linha valido." }, { status: 400 });
    }
    if (lineIds.length > MAX_BULK) {
      return NextResponse.json({ message: `No maximo ${MAX_BULK} linhas por requisicao.` }, { status: 400 });
    }

    const snapshot = await prisma.serviceUserSnapshot.findUnique({
      where: { id: snapshotId },
      select: { id: true, serverId: true },
    });
    if (!snapshot) {
      return NextResponse.json({ message: "Snapshot nao encontrado." }, { status: 404 });
    }

    let financeiroServerCompanyId: string | null = null;
    if ("financeiroServerCompanyId" in b) {
      if (b.financeiroServerCompanyId === null || b.financeiroServerCompanyId === "") {
        financeiroServerCompanyId = null;
      } else if (typeof b.financeiroServerCompanyId === "string" && b.financeiroServerCompanyId.trim()) {
        const c = await financeiroCompanyForServer(b.financeiroServerCompanyId.trim(), snapshot.serverId);
        if (!c) {
          return NextResponse.json({ message: "Empresa invalida para este servico." }, { status: 400 });
        }
        financeiroServerCompanyId = c.id;
      } else {
        return NextResponse.json({ message: "financeiroServerCompanyId invalido." }, { status: 400 });
      }
    } else {
      return NextResponse.json({ message: "Envie financeiroServerCompanyId (string ou null)." }, { status: 400 });
    }

    const found = await prisma.serviceUserSnapshotLine.findMany({
      where: { snapshotId, id: { in: lineIds } },
      select: { id: true },
    });
    if (found.length !== lineIds.length) {
      return NextResponse.json(
        { message: "Uma ou mais linhas nao pertencem a este snapshot." },
        { status: 400 }
      );
    }

    await prisma.serviceUserSnapshotLine.updateMany({
      where: { snapshotId, id: { in: lineIds } },
      data: { financeiroServerCompanyId },
    });

    await recalcSnapshotLineAggregates(snapshotId);

    await logFinanceiroActivity({
      action: "LINE_BULK_ALLOCATE",
      metadata: {
        snapshotId,
        serverId: snapshot.serverId,
        updatedCount: lineIds.length,
        financeiroServerCompanyId,
      },
    });

    return NextResponse.json({ data: { updated: lineIds.length } });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ message: raw || "Erro na alocacao em massa." }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
