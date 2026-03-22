import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess, platformEditorMutationGuard } from "@/lib/admin-auth";
import {
  competenceFromYearMonth,
  parseGoogleWorkspaceUsersJsonRows,
  parseTimeIsMoneyCollaboratorsCsvRows,
} from "@/lib/financeiro-import";
import { ensureFinanceiroEmailServer } from "@/lib/financeiro-ensure-server";
import { recalcSnapshotLineAggregates } from "@/lib/financeiro-snapshot-aggregates";
import { serviceKeyFromForm } from "@/lib/financeiro-services";
import { logFinanceiroActivity } from "@/lib/financeiro-activity-log";

export async function POST(request: NextRequest) {
  const ok = await ensureModuleAccess("financeiro");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });
  const denied = await platformEditorMutationGuard();
  if (denied) return denied;

  try {
    const form = await request.formData();
    const serviceKeyRaw = String(form.get("serviceKey") ?? "").trim();
    const competenceRaw = String(form.get("competence") ?? "").trim();
    const file = form.get("file");

    const serviceKey = serviceKeyFromForm(serviceKeyRaw);
    if (!serviceKey) {
      return NextResponse.json(
        { message: "Servico invalido. Use: cf-com | cf-com-br | time-is-money." },
        { status: 400 }
      );
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ message: "Arquivo obrigatorio." }, { status: 400 });
    }

    const competence = competenceFromYearMonth(competenceRaw);
    const server = await ensureFinanceiroEmailServer(serviceKey);

    const text = await file.text();
    let totalUsers: number;
    let activeUsers: number | null;
    let source: "GOOGLE_JSON" | "TIM_CSV";
    type LineInput = {
      sortOrder: number;
      email: string | null;
      displayName: string;
      companyLabel: string;
      status: string | null;
      detail: string | null;
      meta: Record<string, string> | null;
    };
    let lineInputs: LineInput[];

    if (serviceKey === "timeIsMoney") {
      const parsed = parseTimeIsMoneyCollaboratorsCsvRows(text);
      totalUsers = parsed.totalUsers;
      activeUsers = null;
      source = "TIM_CSV";
      lineInputs = parsed.rows.map((r, i) => ({
        sortOrder: i,
        email: null,
        displayName: r.displayName,
        companyLabel: "",
        status: null,
        detail: r.detail || null,
        meta: r.meta,
      }));
    } else {
      const parsed = parseGoogleWorkspaceUsersJsonRows(text);
      totalUsers = parsed.totalUsers;
      activeUsers = parsed.activeUsers;
      source = "GOOGLE_JSON";
      lineInputs = parsed.rows.map((r, i) => ({
        sortOrder: i,
        email: r.email || null,
        displayName: r.displayName,
        companyLabel: "",
        status: r.status || null,
        detail: r.detail || null,
        meta: null,
      }));
    }

    const snapshot = await prisma.$transaction(async (tx) => {
      const snap = await tx.serviceUserSnapshot.upsert({
        where: {
          serverId_competence: { serverId: server.id, competence },
        },
        create: {
          serverId: server.id,
          competence,
          totalUsers,
          activeUsers,
          source,
          fileName: file.name || null,
        },
        update: {
          totalUsers,
          activeUsers,
          source,
          fileName: file.name || null,
        },
        include: { server: true },
      });

      await tx.serviceUserSnapshotLine.deleteMany({
        where: { snapshotId: snap.id, lineSource: "IMPORTED" },
      });

      const manualAgg = await tx.serviceUserSnapshotLine.aggregate({
        where: { snapshotId: snap.id, lineSource: "MANUAL" },
        _max: { sortOrder: true },
      });
      const sortBase = (manualAgg._max.sortOrder ?? -1) + 1;

      const chunk = 500;
      for (let i = 0; i < lineInputs.length; i += chunk) {
        const part = lineInputs.slice(i, i + chunk);
        await tx.serviceUserSnapshotLine.createMany({
          data: part.map((row, j) => ({
            snapshotId: snap.id,
            sortOrder: sortBase + i + j,
            email: row.email,
            displayName: row.displayName,
            companyLabel: row.companyLabel,
            companyLabelOverride: null,
            financeiroServerCompanyId: null,
            status: row.status,
            detail: row.detail,
            meta: row.meta ?? undefined,
            lineSource: "IMPORTED",
          })),
        });
      }

      await recalcSnapshotLineAggregates(snap.id, tx as typeof prisma);

      return snap;
    });

    await logFinanceiroActivity({
      action: "IMPORT_SNAPSHOT",
      metadata: {
        snapshotId: snapshot.id,
        serverId: snapshot.serverId,
        serverName: snapshot.server.name,
        competence: snapshot.competence.toISOString(),
        serviceKey: serviceKeyRaw,
        totalUsers: snapshot.totalUsers,
        activeUsers: snapshot.activeUsers,
        source: snapshot.source,
        fileName: snapshot.fileName,
      },
    });

    return NextResponse.json({
      data: {
        id: snapshot.id,
        serverId: snapshot.serverId,
        serverName: snapshot.server.name,
        competence: snapshot.competence.toISOString(),
        totalUsers: snapshot.totalUsers,
        activeUsers: snapshot.activeUsers,
        source: snapshot.source,
        fileName: snapshot.fileName,
        createdAt: snapshot.createdAt.toISOString(),
      },
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    if (/does not exist/i.test(raw) && /ServiceUserSnapshot|ServiceUserSnapshotLine|relation/i.test(raw)) {
      return NextResponse.json(
        {
          message:
            "Tabelas do banco ainda nao foram criadas. Redeploy o app (Dockerfile aplica prisma migrate deploy na subida) ou rode manualmente: npx prisma migrate deploy",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ message: raw || "Nao foi possivel importar." }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
