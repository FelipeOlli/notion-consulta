import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { allocationDisplayLabel } from "@/lib/financeiro-allocation";

type Params = { params: Promise<{ id: string }> };

function metaStrings(meta: unknown): Record<string, string> {
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const o = meta as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(o)) {
      if (v != null && typeof v !== "object") out[k] = String(v);
    }
    return out;
  }
  return {};
}

function safeFilenamePart(s: string, maxLen: number): string {
  const trimmed = s
    .trim()
    .replace(/[^\p{L}\p{N}\-_.\s]+/gu, "_")
    .replace(/\s+/g, "_")
    .slice(0, maxLen);
  return trimmed || "export";
}

export async function GET(_request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("financeiro");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const { id } = await params;

    const snapshot = await prisma.serviceUserSnapshot.findUnique({
      where: { id },
      include: { server: true },
    });
    if (!snapshot) {
      return NextResponse.json({ message: "Snapshot nao encontrado." }, { status: 404 });
    }

    const lines = await prisma.serviceUserSnapshotLine.findMany({
      where: { snapshotId: id },
      orderBy: { sortOrder: "asc" },
      take: 50_000,
      include: {
        financeiroServerCompany: { select: { id: true, name: true } },
      },
    });

    const competenceLabel = snapshot.competence.toISOString().slice(0, 7);

    const byCompanyMap = new Map<string, number>();
    for (const l of lines) {
      const label = allocationDisplayLabel(l.financeiroServerCompany ?? undefined);
      byCompanyMap.set(label, (byCompanyMap.get(label) ?? 0) + 1);
    }

    const resumoRows = [...byCompanyMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
      .map(([Empresa, Quantidade]) => ({ Empresa, Quantidade }));

    const userRows = lines
      .map((l) => {
        const m = metaStrings(l.meta);
        return {
          Servico: snapshot.server.name,
          Competencia: competenceLabel,
          Empresa_alocada: allocationDisplayLabel(l.financeiroServerCompany ?? undefined),
          Rotulo_importacao: l.companyLabel,
          Nome: l.displayName,
          Email: l.email ?? "",
          Status: l.status ?? "",
          Detalhe: l.detail ?? "",
          Telefone: m.telefone ?? "",
          Dispositivo: m.dispositivo ?? "",
          Ultima_atividade: m.ultimaAtividade ?? "",
          Criado_em: m.criadoEm ?? "",
          Origem_linha: l.lineSource,
        };
      })
      .sort((a, b) => {
        const c = a.Empresa_alocada.localeCompare(b.Empresa_alocada, "pt-BR");
        if (c !== 0) return c;
        return a.Nome.localeCompare(b.Nome, "pt-BR", { sensitivity: "base" });
      });

    const wb = XLSX.utils.book_new();
    const wsUsers = XLSX.utils.json_to_sheet(userRows);
    const wsResumo = XLSX.utils.json_to_sheet(resumoRows);
    XLSX.utils.book_append_sheet(wb, wsUsers, "Usuarios");
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const baseName = `financeiro_${safeFilenamePart(snapshot.server.name, 48)}_${competenceLabel}.xlsx`;

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${baseName}"; filename*=UTF-8''${encodeURIComponent(baseName)}`,
      },
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ message: raw || "Erro ao gerar Excel." }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
