import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { allocationDisplayLabel } from "@/lib/financeiro-allocation";
import { financeiroCompanyForServer } from "@/lib/financeiro-company-line";
import { companyOverrideForEffective, MAX_COMPANY_LABEL_LEN } from "@/lib/financeiro-effective-company";
import { recalcSnapshotLineAggregates } from "@/lib/financeiro-snapshot-aggregates";

type Params = { params: Promise<{ id: string; lineId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("financeiro");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const { id: snapshotId, lineId } = await params;

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

    const allowed = [
      "displayName",
      "email",
      "companyLabel",
      "effectiveCompany",
      "companyLabelOverride",
      "financeiroServerCompanyId",
      "status",
      "detail",
      "meta",
    ] as const;
    const hasAny = allowed.some((k) => k in b);
    if (!hasAny) {
      return NextResponse.json(
        {
          message:
            "Envie ao menos um campo: displayName, email, companyLabel, effectiveCompany, companyLabelOverride, financeiroServerCompanyId, status, detail, meta.",
        },
        { status: 400 }
      );
    }

    const line = await prisma.serviceUserSnapshotLine.findFirst({
      where: { id: lineId, snapshotId },
    });
    if (!line) {
      return NextResponse.json({ message: "Linha nao encontrada." }, { status: 404 });
    }

    const snapshot = await prisma.serviceUserSnapshot.findUniqueOrThrow({
      where: { id: snapshotId },
      select: { serverId: true },
    });

    const data: Prisma.ServiceUserSnapshotLineUpdateInput = {};

    if ("displayName" in b) {
      if (typeof b.displayName !== "string" || b.displayName.trim().length === 0) {
        return NextResponse.json({ message: "displayName invalido." }, { status: 400 });
      }
      data.displayName = b.displayName.trim().slice(0, 500);
    }

    if ("email" in b) {
      if (b.email === null) {
        data.email = null;
      } else if (typeof b.email === "string") {
        data.email = b.email.trim().slice(0, 500) || null;
      } else {
        return NextResponse.json({ message: "email deve ser string ou null." }, { status: 400 });
      }
    }

    if ("status" in b) {
      if (b.status === null) data.status = null;
      else if (typeof b.status === "string") data.status = b.status.trim().slice(0, 200) || null;
      else return NextResponse.json({ message: "status invalido." }, { status: 400 });
    }

    if ("detail" in b) {
      if (b.detail === null) data.detail = null;
      else if (typeof b.detail === "string") data.detail = b.detail.trim().slice(0, 2000) || null;
      else return NextResponse.json({ message: "detail invalido." }, { status: 400 });
    }

    if ("meta" in b) {
      if (b.meta === null) {
        data.meta = Prisma.JsonNull;
      } else if (typeof b.meta === "object" && b.meta !== null && !Array.isArray(b.meta)) {
        data.meta = b.meta as Prisma.InputJsonValue;
      } else {
        return NextResponse.json({ message: "meta deve ser objeto JSON ou null." }, { status: 400 });
      }
    }

    if ("financeiroServerCompanyId" in b) {
      const raw = b.financeiroServerCompanyId;
      if (raw === null) {
        data.financeiroServerCompany = { disconnect: true };
      } else if (typeof raw === "string" && raw.trim()) {
        const c = await financeiroCompanyForServer(raw.trim(), snapshot.serverId);
        if (!c) {
          return NextResponse.json({ message: "Empresa invalida para este servico." }, { status: 400 });
        }
        data.financeiroServerCompany = { connect: { id: c.id } };
      } else if (typeof raw === "string" && !raw.trim()) {
        data.financeiroServerCompany = { disconnect: true };
      } else {
        return NextResponse.json({ message: "financeiroServerCompanyId deve ser string, string vazia ou null." }, { status: 400 });
      }
    }

    let nextCompanyLabel = line.companyLabel;
    if ("companyLabel" in b) {
      if (typeof b.companyLabel !== "string") {
        return NextResponse.json({ message: "companyLabel invalido." }, { status: 400 });
      }
      nextCompanyLabel = b.companyLabel.trim().slice(0, MAX_COMPANY_LABEL_LEN);
      data.companyLabel = nextCompanyLabel;
    }

    const usesEffective = "effectiveCompany" in b && typeof b.effectiveCompany === "string";
    if (usesEffective) {
      data.companyLabelOverride = companyOverrideForEffective(nextCompanyLabel, b.effectiveCompany as string);
    } else if ("companyLabelOverride" in b) {
      const rawOv = b.companyLabelOverride;
      if (rawOv === null) {
        data.companyLabelOverride = null;
      } else if (typeof rawOv === "string") {
        const t = rawOv.trim();
        const normalized =
          t.length === 0 || t === nextCompanyLabel.trim() ? null : t.slice(0, MAX_COMPANY_LABEL_LEN);
        data.companyLabelOverride = normalized;
      } else {
        return NextResponse.json({ message: "companyLabelOverride deve ser string ou null." }, { status: 400 });
      }
    }

    await prisma.serviceUserSnapshotLine.update({
      where: { id: lineId },
      data,
    });

    await recalcSnapshotLineAggregates(snapshotId);

    const updated = await prisma.serviceUserSnapshotLine.findUniqueOrThrow({
      where: { id: lineId },
      include: { financeiroServerCompany: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      data: {
        id: lineId,
        displayName: updated.displayName,
        email: updated.email,
        companyLabel: updated.companyLabel,
        companyLabelOverride: updated.companyLabelOverride,
        financeiroServerCompanyId: updated.financeiroServerCompanyId,
        allocatedCompany: updated.financeiroServerCompany,
        effectiveCompany: allocationDisplayLabel(updated.financeiroServerCompany ?? undefined),
        status: updated.status,
        detail: updated.detail,
        meta: updated.meta,
        lineSource: updated.lineSource,
      },
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ message: raw || "Erro ao atualizar linha." }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("financeiro");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const { id: snapshotId, lineId } = await params;

    const line = await prisma.serviceUserSnapshotLine.findFirst({
      where: { id: lineId, snapshotId },
    });
    if (!line) {
      return NextResponse.json({ message: "Linha nao encontrada." }, { status: 404 });
    }

    await prisma.serviceUserSnapshotLine.delete({ where: { id: lineId } });
    await recalcSnapshotLineAggregates(snapshotId);

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ message: raw || "Erro ao excluir linha." }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
