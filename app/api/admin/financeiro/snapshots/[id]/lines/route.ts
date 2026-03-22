import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess, financeiroMutationGuard } from "@/lib/admin-auth";
import { allocationDisplayLabel, FINANCEIRO_SEM_EMPRESA } from "@/lib/financeiro-allocation";
import { financeiroCompanyForServer } from "@/lib/financeiro-company-line";
import { recalcSnapshotLineAggregates } from "@/lib/financeiro-snapshot-aggregates";
import { logFinanceiroActivity } from "@/lib/financeiro-activity-log";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("financeiro");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const { id } = await params;
    const companyFilter = request.nextUrl.searchParams.get("company")?.trim();

    const snapshot = await prisma.serviceUserSnapshot.findUnique({
      where: { id },
      include: {
        server: true,
        _count: { select: { lines: true } },
      },
    });
    if (!snapshot) {
      return NextResponse.json({ message: "Snapshot nao encontrado." }, { status: 404 });
    }

    const allForAgg = await prisma.serviceUserSnapshotLine.findMany({
      where: { snapshotId: id },
      select: {
        financeiroServerCompany: { select: { name: true } },
      },
    });

    const byCompanyMap = new Map<string, number>();
    for (const row of allForAgg) {
      const label = allocationDisplayLabel(row.financeiroServerCompany ?? undefined);
      byCompanyMap.set(label, (byCompanyMap.get(label) ?? 0) + 1);
    }
    const byCompany = [...byCompanyMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    const companies = byCompany.map((b) => b.label);

    const lineWhere: Prisma.ServiceUserSnapshotLineWhereInput = {
      snapshotId: id,
      ...(companyFilter
        ? companyFilter === FINANCEIRO_SEM_EMPRESA
          ? { financeiroServerCompanyId: null }
          : { financeiroServerCompany: { name: companyFilter } }
        : {}),
    };

    const lines = await prisma.serviceUserSnapshotLine.findMany({
      where: lineWhere,
      orderBy: { sortOrder: "asc" },
      take: 10_000,
      include: {
        financeiroServerCompany: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      data: {
        snapshot: {
          id: snapshot.id,
          serverId: snapshot.serverId,
          serverName: snapshot.server.name,
          competence: snapshot.competence.toISOString(),
          source: snapshot.source,
          lineCount: snapshot._count.lines,
        },
        companies,
        byCompany,
        lines: lines.map((l) => ({
          id: l.id,
          sortOrder: l.sortOrder,
          email: l.email,
          displayName: l.displayName,
          companyLabel: l.companyLabel,
          companyLabelOverride: l.companyLabelOverride,
          financeiroServerCompanyId: l.financeiroServerCompanyId,
          allocatedCompany: l.financeiroServerCompany
            ? { id: l.financeiroServerCompany.id, name: l.financeiroServerCompany.name }
            : null,
          effectiveCompany: allocationDisplayLabel(l.financeiroServerCompany ?? undefined),
          status: l.status,
          detail: l.detail,
          meta: l.meta,
          lineSource: l.lineSource,
        })),
      },
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    if (/does not exist/i.test(raw) && /ServiceUserSnapshotLine/i.test(raw)) {
      return NextResponse.json(
        { message: "Tabela de detalhes ainda nao existe. Aplique migracoes e redeploy." },
        { status: 503 }
      );
    }
    if (/financeiroServerCompanyId|FinanceiroServerCompany/i.test(raw) && /column|relation/i.test(raw)) {
      return NextResponse.json(
        { message: "Migracao de empresas por servico pendente. Aplique migracoes e redeploy." },
        { status: 503 }
      );
    }
    return NextResponse.json({ message: raw || "Erro ao carregar linhas." }, { status: 400 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("financeiro");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });
  const denied = await financeiroMutationGuard();
  if (denied) return denied;

  try {
    const { id: snapshotId } = await params;

    const snapshot = await prisma.serviceUserSnapshot.findUnique({
      where: { id: snapshotId },
    });
    if (!snapshot) {
      return NextResponse.json({ message: "Snapshot nao encontrado." }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "JSON invalido." }, { status: 400 });
    }
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ message: "Corpo JSON invalido." }, { status: 400 });
    }
    const b = body as Record<string, unknown>;

    if (typeof b.displayName !== "string" || b.displayName.trim().length === 0) {
      return NextResponse.json({ message: "displayName e obrigatorio." }, { status: 400 });
    }

    let financeiroServerCompanyId: string | null = null;
    if ("financeiroServerCompanyId" in b) {
      if (b.financeiroServerCompanyId === null) {
        financeiroServerCompanyId = null;
      } else if (typeof b.financeiroServerCompanyId === "string" && b.financeiroServerCompanyId.trim()) {
        const c = await financeiroCompanyForServer(b.financeiroServerCompanyId.trim(), snapshot.serverId);
        if (!c) {
          return NextResponse.json({ message: "Empresa invalida para este servico." }, { status: 400 });
        }
        financeiroServerCompanyId = c.id;
      } else if (typeof b.financeiroServerCompanyId === "string" && !b.financeiroServerCompanyId.trim()) {
        financeiroServerCompanyId = null;
      } else {
        return NextResponse.json({ message: "financeiroServerCompanyId invalido." }, { status: 400 });
      }
    }

    const displayName = b.displayName.trim().slice(0, 500);

    let email: string | null = null;
    if ("email" in b) {
      if (b.email === null) email = null;
      else if (typeof b.email === "string") email = b.email.trim().slice(0, 500) || null;
      else return NextResponse.json({ message: "email invalido." }, { status: 400 });
    }

    let status: string | null = null;
    if ("status" in b) {
      if (b.status === null) status = null;
      else if (typeof b.status === "string") status = b.status.trim().slice(0, 200) || null;
      else return NextResponse.json({ message: "status invalido." }, { status: 400 });
    }

    let detail: string | null = null;
    if ("detail" in b) {
      if (b.detail === null) detail = null;
      else if (typeof b.detail === "string") detail = b.detail.trim().slice(0, 2000) || null;
      else return NextResponse.json({ message: "detail invalido." }, { status: 400 });
    }

    let meta: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;
    if ("meta" in b) {
      if (b.meta === null) meta = Prisma.JsonNull;
      else if (typeof b.meta === "object" && b.meta !== null && !Array.isArray(b.meta)) {
        meta = b.meta as Prisma.InputJsonValue;
      } else {
        return NextResponse.json({ message: "meta deve ser objeto JSON ou null." }, { status: 400 });
      }
    }

    if (snapshot.source === "TIM_CSV") {
      if ("email" in b && b.email !== null && String(b.email).trim() !== "") {
        return NextResponse.json({ message: "Neste servico (CSV) nao envie email na linha manual." }, { status: 400 });
      }
      email = null;
    }

    const agg = await prisma.serviceUserSnapshotLine.aggregate({
      where: { snapshotId },
      _max: { sortOrder: true },
    });
    const sortOrder = (agg._max.sortOrder ?? -1) + 1;

    const created = await prisma.serviceUserSnapshotLine.create({
      data: {
        snapshotId,
        sortOrder,
        displayName,
        companyLabel: "",
        companyLabelOverride: null,
        financeiroServerCompanyId,
        email,
        status,
        detail,
        lineSource: "MANUAL",
        ...(meta !== undefined
          ? { meta: meta === Prisma.JsonNull ? Prisma.JsonNull : meta }
          : {}),
      },
      include: {
        financeiroServerCompany: { select: { id: true, name: true } },
      },
    });

    await recalcSnapshotLineAggregates(snapshotId);

    await logFinanceiroActivity({
      action: "LINE_CREATE",
      metadata: {
        snapshotId,
        lineId: created.id,
        lineSource: created.lineSource,
        hasCompanyAllocation: Boolean(created.financeiroServerCompanyId),
      },
    });

    return NextResponse.json({
      data: {
        id: created.id,
        sortOrder: created.sortOrder,
        email: created.email,
        displayName: created.displayName,
        companyLabel: created.companyLabel,
        companyLabelOverride: created.companyLabelOverride,
        financeiroServerCompanyId: created.financeiroServerCompanyId,
        allocatedCompany: created.financeiroServerCompany,
        effectiveCompany: allocationDisplayLabel(created.financeiroServerCompany ?? undefined),
        status: created.status,
        detail: created.detail,
        meta: created.meta,
        lineSource: created.lineSource,
      },
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ message: raw || "Erro ao criar linha." }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
