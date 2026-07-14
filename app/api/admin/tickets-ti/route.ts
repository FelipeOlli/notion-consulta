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
  descricao: string | null;
  status_nome: string;
  status_cor: string;
  nome_solicitante: string | null;
  prioridade: string | null;
  created_at: string;
  prazo: string | null;
  concluido: number | boolean;
  responsavel_nome: string | null;
  tipo_nome: string | null;
  projeto_nome: string | null;
};

function gerarSlug(nome: string): string {
  return (nome ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

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
    const [statsRes, allRes, externosRes] = await Promise.all([
      fetch(`${apiUrl}/tickets-pai/projeto/${projetoId}/stats`, {
        headers,
        cache: "no-store",
      }),
      fetch(`${apiUrl}/tickets-pai/projeto/${projetoId}/all?aprovado=1`, {
        headers,
        cache: "no-store",
      }),
      // Tickets Externos: pedidos ainda não aprovados, ficam fora de aprovado=1
      fetch(`${apiUrl}/tickets-pai/projeto/${projetoId}/all?aprovado=0`, {
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

    const [statsJson, allJson, externosJson] = await Promise.all([
      statsRes.json(),
      allRes.json(),
      externosRes.ok ? externosRes.json() : Promise.resolve({ data: [] }),
    ]);

    const statusData: ScrumHubStatus[] = statsJson?.data?.status ?? [];
    const totais: ScrumHubTotais = statsJson?.data?.totais ?? {
      total_tickets_pai: 0,
      tickets_concluidos: 0,
      tickets_nao_concluidos: 0,
    };
    const allTickets: ScrumHubTicket[] = [
      ...(allJson?.data ?? []),
      ...(externosJson?.data ?? []),
    ];

    // URL base do frontend ScrumHub (mesmo algoritmo do backend)
    const frontendBase = (apiUrl ?? "https://scrumhub.vercel.app")
      .replace(/\/$/, "");

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
      tickets: allTickets.map((t) => {
        const ticketSlug = `${gerarSlug(t.nome)}-${t.id}`;
        const projetoSlug = gerarSlug(t.projeto_nome ?? "");
        const url = `${frontendBase}/ticket/${ticketSlug}?slug=${projetoSlug}`;
        return {
          id: t.id,
          nome: t.nome,
          descricao: t.descricao ?? "",
          statusNome: t.status_nome ?? "",
          statusCor: t.status_cor || "#3b82f6",
          solicitante: t.nome_solicitante ?? "",
          prioridade: t.prioridade ?? "",
          createdAt: t.created_at,
          prazo: t.prazo ?? null,
          concluido: Boolean(t.concluido),
          responsavel: t.responsavel_nome ?? "",
          tipo: t.tipo_nome ?? "",
          url,
        };
      }),
    });
  } catch {
    return NextResponse.json(
      { message: "Erro ao conectar ao ScrumHub." },
      { status: 502 }
    );
  }
}
