import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

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

    const where = {
      snapshotId: id,
      ...(companyFilter ? { companyLabel: companyFilter } : {}),
    };

    const [lines, companies] = await Promise.all([
      prisma.serviceUserSnapshotLine.findMany({
        where,
        orderBy: [{ companyLabel: "asc" }, { sortOrder: "asc" }],
        take: 10_000,
      }),
      prisma.serviceUserSnapshotLine.findMany({
        where: { snapshotId: id },
        select: { companyLabel: true },
        distinct: ["companyLabel"],
        orderBy: { companyLabel: "asc" },
      }),
    ]);

    return NextResponse.json({
      data: {
        snapshot: {
          id: snapshot.id,
          serverName: snapshot.server.name,
          competence: snapshot.competence.toISOString(),
          source: snapshot.source,
          lineCount: snapshot._count.lines,
        },
        companies: companies.map((c) => c.companyLabel),
        lines: lines.map((l) => ({
          id: l.id,
          sortOrder: l.sortOrder,
          email: l.email,
          displayName: l.displayName,
          companyLabel: l.companyLabel,
          status: l.status,
          detail: l.detail,
          meta: l.meta,
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
    return NextResponse.json({ message: raw || "Erro ao carregar linhas." }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
