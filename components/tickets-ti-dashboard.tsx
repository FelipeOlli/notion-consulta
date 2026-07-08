"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type StatusItem = {
  nome: string;
  cor: string;
  count: number;
};

type Totais = {
  total: number;
  concluidos: number;
  naoConcluidos: number;
};

type Ticket = {
  id: number;
  nome: string;
  statusNome: string;
  statusCor: string;
  solicitante: string;
  prioridade: string;
  createdAt: string;
};

type ApiData = {
  configured: boolean;
  status?: StatusItem[];
  totais?: Totais;
  tickets?: Ticket[];
};

const PRIORIDADE_LABEL: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const PRIORIDADE_COLOR: Record<string, string> = {
  baixa: "#6b8aaa",
  media: "#f59e0b",
  alta: "#f97316",
  urgente: "#ef4444",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function TicketsTiDashboard({ variant = "home" }: { variant?: "home" | "full" }) {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [notifGranted, setNotifGranted] = useState(false);
  const maxIdRef = useRef<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFirst = useRef(true);

  const fireNotif = useCallback((id: number, nome: string, solicitante: string) => {
    if (!notifGranted) return;
    new Notification("🎫 Novo chamado aberto", {
      body: `${nome}${solicitante ? ` — ${solicitante}` : ""}`,
      tag: `ticket-ti-${id}`,
    });
  }, [notifGranted]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tickets-ti");
      if (!res.ok) return;
      const json: ApiData = await res.json();
      setData(json);
      setLastUpdated(new Date());

      if (json.tickets && json.tickets.length > 0) {
        const maxId = Math.max(...json.tickets.map((t) => t.id));
        if (isFirst.current) {
          maxIdRef.current = maxId;
          isFirst.current = false;
        } else {
          const novos = json.tickets.filter(
            (t) => maxIdRef.current !== null && t.id > maxIdRef.current
          );
          novos.forEach((t) => fireNotif(t.id, t.nome, t.solicitante));
          if (novos.length > 0) maxIdRef.current = maxId;
        }
      } else if (isFirst.current) {
        isFirst.current = false;
      }
    } catch {
      // falha silenciosa no poll
    } finally {
      setLoading(false);
    }
  }, [fireNotif]);

  // Pedir permissão de notificação
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      setNotifGranted(true);
    } else if (Notification.permission !== "denied") {
      void Notification.requestPermission().then((p) => {
        if (p === "granted") setNotifGranted(true);
      });
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    void load();
  }, [load]);

  // Poll a cada 30s
  useEffect(() => {
    pollRef.current = setInterval(() => {
      void load();
    }, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <p className="text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
          Carregando tickets TI…
        </p>
      </div>
    );
  }

  if (!data || !data.configured) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <p className="section-label mb-1">Tickets TI</p>
        <p className="text-sm text-yellow-400">
          Configure as variáveis de ambiente{" "}
          <code className="font-mono text-xs">SCRUMHUB_API_URL</code>,{" "}
          <code className="font-mono text-xs">SCRUMHUB_API_KEY</code> e{" "}
          <code className="font-mono text-xs">SCRUMHUB_PROJETO_ID</code> para ativar este módulo.
        </p>
      </div>
    );
  }

  const { status = [], totais, tickets = [] } = data;
  const maxCount = Math.max(...status.map((s) => s.count), 1);
  const recentTickets = variant === "home" ? tickets.slice(0, 5) : tickets.slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-label">Tickets TI</p>
          <h2 className="mt-1 text-lg font-bold text-white">Acompanhamento de Chamados</h2>
        </div>
        {lastUpdated && (
          <p className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
            Atualizado às {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        )}
      </div>

      {/* Cards de métricas */}
      {totais && (
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{totais.total}</p>
            <p className="mt-1 text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
              Total
            </p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: "#00cc66" }}>
              {totais.concluidos}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
              Concluídos
            </p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: "#f59e0b" }}>
              {totais.naoConcluidos}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
              Em aberto
            </p>
          </div>
        </div>
      )}

      {/* Gráfico por status — barras CSS */}
      {status.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <p className="mb-4 text-sm font-semibold text-white">Chamados por status</p>
          <div className="space-y-3">
            {status.map((s) => {
              const pct = Math.round((s.count / maxCount) * 100);
              return (
                <div key={s.nome}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ background: s.cor }}
                      />
                      <span
                        className="truncate text-xs"
                        style={{ color: "var(--onity-dark-text-muted)" }}
                      >
                        {s.nome}
                      </span>
                    </div>
                    <span className="flex-shrink-0 text-xs font-semibold text-white">
                      {s.count}
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: s.cor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de tickets recentes */}
      {recentTickets.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <p className="mb-4 text-sm font-semibold text-white">
            {variant === "home" ? "Últimos chamados" : "Chamados abertos"}
          </p>
          <div className="space-y-3">
            {recentTickets.map((t) => {
              const pLower = (t.prioridade ?? "").toLowerCase();
              const prioColor = PRIORIDADE_COLOR[pLower] ?? "#6b8aaa";
              const prioLabel = PRIORIDADE_LABEL[pLower] ?? t.prioridade;
              return (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-3 rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{t.nome}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {t.solicitante && (
                        <span className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
                          {t.solicitante}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
                        {formatDate(t.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: `${t.statusCor}22`,
                        color: t.statusCor,
                        border: `1px solid ${t.statusCor}44`,
                      }}
                    >
                      {t.statusNome}
                    </span>
                    {prioLabel && (
                      <span
                        className="text-xs"
                        style={{ color: prioColor }}
                      >
                        {prioLabel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {status.length === 0 && recentTickets.length === 0 && (
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Nenhum chamado encontrado no projeto.
          </p>
        </div>
      )}
    </div>
  );
}
