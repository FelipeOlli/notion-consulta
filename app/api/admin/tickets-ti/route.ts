import { NextResponse } from "next/server";
import { ensureModuleAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type ScrumHubStatus = {
  status_id: number;
  status_nome: string;
  status_cor: string;
  count: number;
};

type ScrumHubTotais = {
  total_tickets_pai: number;
  tickets_concluidos: number;
  tickets_nao_concluidos: number;
};

type ScrumHubTicket = {
  id: number;
  nome: string;
  status_nome: string;
  status_cor: string;
  nome_solicitante: string | null;
  prioridade: string | null;
  created_at: string;
};

export async function GET() {
  const ok = await ensureModuleAccess("tickets_ti");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const apiUrl = process.env.SCRUMHUB_API_URL;
  const apiKey = process.env.SCRUMHUB_API_KEY;
  const projetoId = process.env.SCRUMHUB_PROJETO_ID;

  if (!apiUrl || !apiKey || !projetoId) {
    return NextResponse.json({ configured: false });
  }

  const headers = {
    "X-API-Key": apiKey,
    "Content-Type": "application/json",
  };

  try {
    const [statsRes, allRes] = await Promise.all([
      fetch(`${apiUrl}/tickets-pai/projeto/${projetoId}/stats`, {
        headers,
        cache: "no-store",
      }),
      fetch(`${apiUrl}/tickets-pai/projeto/${projetoId}/all?aprovado=1`, {
        headers,
        cache: "no-store",
      }),
    ]);

    if (!statsRes.ok || !allRes.ok) {
      return NextResponse.json(
        { message: "Falha ao consultar o ScrumHub." },
        { status: 502 }
      );
    }

    const [statsJson, allJson] = await Promise.all([statsRes.json(), allRes.json()]);

    const statusData: ScrumHubStatus[] = statsJson?.data?.status ?? [];
    const totais: ScrumHubTotais = statsJson?.data?.totais ?? {
      total_tickets_pai: 0,
      tickets_concluidos: 0,
      tickets_nao_concluidos: 0,
    };
    const allTickets: ScrumHubTicket[] = allJson?.data ?? [];

    return NextResponse.json({
      configured: true,
      status: statusData.map((s) => ({
        nome: s.status_nome,
        cor: s.status_cor || "#3b82f6",
        count: Number(s.count),
      })),
      totais: {
        total: Number(totais.total_tickets_pai),
        concluidos: Number(totais.tickets_concluidos),
        naoConcluidos: Number(totais.tickets_nao_concluidos),
      },
      tickets: allTickets.map((t) => ({
        id: t.id,
        nome: t.nome,
        statusNome: t.status_nome ?? "",
        statusCor: t.status_cor || "#3b82f6",
        solicitante: t.nome_solicitante ?? "",
        prioridade: t.prioridade ?? "",
        createdAt: t.created_at,
      })),
    });
  } catch {
    return NextResponse.json(
      { message: "Erro ao conectar ao ScrumHub." },
      { status: 502 }
    );
  }
}
