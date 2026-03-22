import { NextRequest, NextResponse } from "next/server";
import type { FinanceiroActivityAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

const ACTIONS: FinanceiroActivityAction[] = [
  "IMPORT_SNAPSHOT",
  "COMPANY_CREATE",
  "COMPANY_RENAME",
  "COMPANY_DELETE",
  "LINE_CREATE",
  "LINE_UPDATE",
  "LINE_DELETE",
  "LINE_BULK_ALLOCATE",
];

function isAction(value: string): value is FinanceiroActivityAction {
  return ACTIONS.includes(value as FinanceiroActivityAction);
}

export async function GET(request: NextRequest) {
  const ok = await ensureModuleAccess("financeiro");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const sp = request.nextUrl.searchParams;
    const limitRaw = Number(sp.get("limit") ?? "50");
    const limit = Math.min(200, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 50));
    const cursor = sp.get("cursor")?.trim() || null;
    const actionFilter = sp.get("action")?.trim() || null;

    const where =
      actionFilter && isAction(actionFilter) ? { action: actionFilter as FinanceiroActivityAction } : {};

    const items = await prisma.financeiroActivityLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        createdAt: true,
        actorEmail: true,
        actorUserId: true,
        action: true,
        metadata: true,
      },
    });

    let nextCursor: string | null = null;
    let page = items;
    if (items.length > limit) {
      page = items.slice(0, limit);
      nextCursor = page[page.length - 1]?.id ?? null;
    }

    return NextResponse.json({
      data: {
        items: page.map((row) => ({
          id: row.id,
          createdAt: row.createdAt.toISOString(),
          actorEmail: row.actorEmail,
          actorUserId: row.actorUserId,
          action: row.action,
          metadata: row.metadata,
        })),
        nextCursor,
      },
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    if (/FinanceiroActivityLog/i.test(raw) && /does not exist|relation/i.test(raw)) {
      return NextResponse.json(
        { message: "Tabela de log ainda nao existe. Aplique migracoes (prisma migrate deploy)." },
        { status: 503 }
      );
    }
    return NextResponse.json({ message: raw || "Erro ao listar log." }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
