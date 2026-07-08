"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  concluido: boolean;
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

function TicketRow({ t }: { t: Ticket }) {
  const pLower = (t.prioridade ?? "").toLowerCase();
  const prioColor = PRIORIDADE_COLOR[pLower] ?? "#6b8aaa";
  const prioLabel = PRIORIDADE_LABEL[pLower] ?? t.prioridade;

  return (
    <div
      className="flex items-start justify-between gap-3 rounded-xl p-3"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
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
          <span className="text-xs" style={{ color: prioColor }}>
            {prioLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export function TicketsTiDashboard({ variant = "home" }: { variant?: "home" | "full" }) {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [notifGranted, setNotifGranted] = useState(false);
  const [mes, setMes] = useState<string>("all");
  const maxIdRef = useRef<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFirst = useRef(true);

  const fireNotif = useCallback(
    (id: number, nome: string, solicitante: string) => {
      if (!notifGranted) return;
      new Notification("🎫 Novo chamado aberto", {
        body: `${nome}${solicitante ? ` — ${solicitante}` : ""}`,
        tag: `ticket-ti-${id}`,
      });
    },
    [notifGranted]
  );

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

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    pollRef.current = setInterval(() => {
      void load();
    }, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  // Meses disponíveis derivados dos tickets
  const mesesDisponiveis = useMemo(() => {
    const tickets = data?.tickets ?? [];
    const mesSet = new Set<string>();
    tickets.forEach((t) => {
      const d = new Date(t.createdAt);
      if (!isNaN(d.getTime())) {
        mesSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }
    });
    return Array.from(mesSet).sort((a, b) => b.localeCompare(a));
  }, [data?.tickets]);

  // Métricas filtradas por mês (só home)
  const metricasMes = useMemo(() => {
    const tickets = data?.tickets ?? [];
    const filtrados =
      mes === "all"
        ? tickets
        : tickets.filter((t) => {
            const d = new Date(t.createdAt);
            if (isNaN(d.getTime())) return false;
            const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            return chave === mes;
          });
    return {
      emAberto: filtrados.filter((t) => !t.concluido).length,
      concluidos: filtrados.filter((t) => t.concluido).length,
      total: filtrados.length,
    };
  }, [data?.tickets, mes]);

  function labelMes(chave: string): string {
    const [ano, m] = chave.split("-");
    const d = new Date(Number(ano), Number(m) - 1, 1);
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }

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

  // ── Cabeçalho compartilhado ──────────────────────────────────────────────
  const header = (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="section-label">Tickets TI</p>
        <h2 className="mt-1 text-lg font-bold text-white">Acompanhamento de Chamados</h2>
      </div>
      {lastUpdated && (
        <p className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
          Atualizado às{" "}
          {lastUpdated.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </p>
      )}
    </div>
  );

  // ── HOME ─────────────────────────────────────────────────────────────────
  if (variant === "home") {
    const abertos = tickets.filter((t) => !t.concluido);

    return (
      <div className="space-y-6">
        {header}

        {/* Filtro de mês + métricas */}
        <div className="glass-card rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">Chamados por período</p>
            <select
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium focus:outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#e2e8f0",
              }}
            >
              <option value="all">Todos os meses</option>
              {mesesDisponiveis.map((m) => (
                <option key={m} value={m}>
                  {labelMes(m)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl p-4 text-center" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <p className="text-2xl font-bold" style={{ color: "#f59e0b" }}>
                {metricasMes.emAberto}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
                Em aberto
              </p>
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: "rgba(0,204,102,0.08)", border: "1px solid rgba(0,204,102,0.2)" }}>
              <p className="text-2xl font-bold" style={{ color: "#00cc66" }}>
                {metricasMes.concluidos}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
                Concluídos
              </p>
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="text-2xl font-bold text-white">{metricasMes.total}</p>
              <p className="mt-1 text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
                Total
              </p>
            </div>
          </div>
        </div>

        {/* Lista de chamados em aberto com scroll */}
        <div className="glass-card rounded-2xl p-5">
          <p className="mb-4 text-sm font-semibold text-white">
            Chamados em aberto{" "}
            <span
              className="ml-1 rounded-full px-2 py-0.5 text-xs"
              style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}
            >
              {abertos.length}
            </span>
          </p>

          {abertos.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
              Nenhum chamado em aberto.
            </p>
          ) : (
            <div className="max-h-[420px] overflow-y-auto pr-1 space-y-3">
              {abertos.map((t) => (
                <TicketRow key={t.id} t={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── FULL (página /admin/tickets-ti) — mantém layout original ────────────
  const maxCount = Math.max(...status.map((s) => s.count), 1);
  const recentTickets = tickets.slice(0, 20);

  return (
    <div className="space-y-6">
      {header}

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

      {/* Gráfico por status */}
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

      {/* Lista de tickets */}
      {recentTickets.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <p className="mb-4 text-sm font-semibold text-white">Chamados</p>
          <div className="space-y-3">
            {recentTickets.map((t) => (
              <TicketRow key={t.id} t={t} />
            ))}
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
