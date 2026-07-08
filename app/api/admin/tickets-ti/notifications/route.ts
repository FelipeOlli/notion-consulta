import { NextResponse } from "next/server";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const KIND = "ticket_ti";
const JANELA_DIAS = 30;

type ScrumHubTicket = {
  id: number;
  nome: string;
  descricao: string | null;
  nome_solicitante: string | null;
  created_at: string;
  prazo: string | null;
  concluido: number | boolean;
  status_nome: string | null;
  status_cor: string | null;
  prioridade: string | null;
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
    return NextResponse.json({ tickets: [] });
  }

  try {
    const res = await fetch(
      `${apiUrl}/tickets-pai/projeto/${projetoId}/all?aprovado=1`,
      { headers: { "X-API-Key": apiKey }, cache: "no-store" }
    );
    if (!res.ok) return NextResponse.json({ tickets: [] });

    const json = await res.json();
    const todos: ScrumHubTicket[] = json?.data ?? [];

    // Apenas tickets dos últimos JANELA_DIAS dias e não concluídos
    const corte = new Date();
    corte.setDate(corte.getDate() - JANELA_DIAS);
    const recentes = todos.filter((t) => {
      if (Boolean(t.concluido)) return false;
      if ((t.status_nome ?? "").toLowerCase().includes("conclu")) return false;
      return new Date(t.created_at) >= corte;
    });

    // Cruzar com NotificationRead
    const ids = recentes.map((t) => String(t.id));
    const lidos = await prisma.notificationRead.findMany({
      where: { kind: KIND, refId: { in: ids } },
      select: { refId: true },
    });
    const lidosSet = new Set(lidos.map((r) => r.refId));

    const frontendBase = apiUrl.replace(/\/$/, "");

    return NextResponse.json({
      tickets: recentes.map((t) => {
        const ticketSlug = `${gerarSlug(t.nome)}-${t.id}`;
        const projetoSlug = gerarSlug(t.projeto_nome ?? "");
        return {
          id: t.id,
          nome: t.nome,
          descricao: t.descricao ?? "",
          solicitante: t.nome_solicitante ?? "",
          responsavel: t.responsavel_nome ?? "",
          statusNome: t.status_nome ?? "",
          statusCor: t.status_cor || "#3b82f6",
          prioridade: t.prioridade ?? "",
          tipo: t.tipo_nome ?? "",
          createdAt: t.created_at,
          prazo: t.prazo ?? null,
          lido: lidosSet.has(String(t.id)),
          url: `${frontendBase}/ticket/${ticketSlug}?slug=${projetoSlug}`,
        };
      }),
    });
  } catch {
    return NextResponse.json({ tickets: [] });
  }
}

export async function POST(req: Request) {
  const ok = await ensureModuleAccess("tickets_ti");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const { refId } = (await req.json()) as { refId: string };
  if (!refId) return NextResponse.json({ message: "refId obrigatório." }, { status: 400 });

  await prisma.notificationRead.upsert({
    where: { kind_refId: { kind: KIND, refId } },
    create: { kind: KIND, refId },
    update: {},
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const ok = await ensureModuleAccess("tickets_ti");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const { refId } = (await req.json()) as { refId: string };
  if (!refId) return NextResponse.json({ message: "refId obrigatório." }, { status: 400 });

  await prisma.notificationRead.deleteMany({ where: { kind: KIND, refId } });
  return NextResponse.json({ ok: true });
}
