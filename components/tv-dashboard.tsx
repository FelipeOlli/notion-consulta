"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

type MonitorStatus = "UP" | "DOWN" | "PENDING";

type Monitor = {
  id: string;
  name: string;
  active: boolean;
  lastStatus: MonitorStatus;
  lastDownAt: string | null;
  createdAt: string;
};

type Ticket = {
  id: number;
  nome: string;
  statusNome: string;
  solicitante: string;
  concluido: boolean;
};

type TicketsApiData = {
  configured: boolean;
  tickets?: Ticket[];
};

const STATUS_COLOR: Record<MonitorStatus, string> = {
  UP: "#00cc66",
  DOWN: "#ff453a",
  PENDING: "#6b8aaa",
};

const STATUS_LABEL: Record<MonitorStatus, string> = { UP: "Online", DOWN: "Offline", PENDING: "Aguardando" };

function isConcluido(t: Ticket): boolean {
  const s = t.statusNome.toLowerCase();
  return t.concluido || s.includes("conclu") || s.includes("cancelad");
}

function isPendente(t: Ticket): boolean {
  return t.statusNome.toLowerCase().includes("pendente");
}

function formatUptime(iso: string | null): string {
  const ms = Date.now() - new Date(iso ?? Date.now()).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m ativo`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m ativo`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h ativo`;
}

function DonutStat({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex h-[140px] items-center justify-center text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
        Sem dados
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={140}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={40}
          outerRadius={62}
          paddingAngle={2}
          stroke="none"
          isAnimationActive={false}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TvDashboard() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [ticketsData, setTicketsData] = useState<TicketsApiData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Carga inicial: só GET, rápido — não espera nenhuma checagem de conexão.
  const loadInitial = useCallback(async () => {
    const [monitorsRes, ticketsRes] = await Promise.all([
      fetch("/api/admin/monitors"),
      fetch("/api/admin/tickets-ti"),
    ]);
    if (monitorsRes.ok) {
      const json = await monitorsRes.json();
      setMonitors(json.data ?? []);
    }
    if (ticketsRes.ok) {
      setTicketsData(await ticketsRes.json());
    }
    setLastUpdated(new Date());
  }, []);

  // Atualiza só os tickets (rápido, não depende da checagem de conexões).
  const refreshTickets = useCallback(async () => {
    const res = await fetch("/api/admin/tickets-ti");
    if (res.ok) setTicketsData(await res.json());
    setLastUpdated(new Date());
  }, []);

  // Dispara a checagem real das conexões e aplica o resultado direto no estado local,
  // sem refazer um GET /monitors — mesmo padrão de admin-monitor-dashboard.tsx.
  const refreshMonitors = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/monitors/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) return;
      const json = await res.json();
      const results: { id: string; lastStatus: MonitorStatus; lastPing: number | null; lastChecked: string }[] =
        json.data ?? [];
      if (results.length === 0) return;
      setMonitors((prev) =>
        prev.map((m) => {
          const r = results.find((x) => x.id === m.id);
          if (!r) return m;
          return {
            ...m,
            lastStatus: r.lastStatus,
            // DOWN reinicia a contagem de tempo ativo; UP mantém o lastDownAt anterior.
            lastDownAt: r.lastStatus === "DOWN" ? r.lastChecked : m.lastDownAt,
          };
        })
      );
    } catch {
      // silencioso — próximo tick tenta de novo
    }
  }, []);

  useEffect(() => {
    void loadInitial();
    pollRef.current = setInterval(() => {
      void refreshTickets();
      void refreshMonitors();
    }, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadInitial, refreshTickets, refreshMonitors]);

  useEffect(() => {
    clockRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => {
      if (clockRef.current) clearInterval(clockRef.current);
    };
  }, []);

  const monitoresAtivos = monitors.filter((m) => m.active);
  const upCount = monitoresAtivos.filter((m) => m.lastStatus === "UP").length;
  const downCount = monitoresAtivos.filter((m) => m.lastStatus === "DOWN").length;
  const pendingCount = monitoresAtivos.filter((m) => m.lastStatus === "PENDING").length;

  const tickets = ticketsData?.tickets ?? [];
  const emAberto = tickets.filter((t) => !isConcluido(t) && !isPendente(t)).length;
  const pendentesTickets = tickets.filter((t) => !isConcluido(t) && isPendente(t));
  const concluidos = tickets.filter((t) => isConcluido(t)).length;

  return (
    <main className="relative z-10 min-h-screen p-6 lg:p-10">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="section-label">Operação de TI</p>
            <h1 className="mt-2 text-3xl font-bold text-white lg:text-4xl">Modo TV</h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link
              href="/admin"
              className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition text-[#6b8aaa] hover:text-white"
              style={{ background: "rgba(8,15,26,0.5)", border: "1px solid rgba(29,127,229,0.15)" }}
            >
              Desativar Modo TV
            </Link>
            <p className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
              {now.toLocaleTimeString("pt-BR")}
              {lastUpdated && ` · atualizado às ${lastUpdated.toLocaleTimeString("pt-BR")}`}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Conexões */}
          <div className="glass-card rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-white">Conexões ativas</h2>
              <span className="text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
                {monitoresAtivos.length} monitoradas
              </span>
            </div>

            <DonutStat
              data={[
                { name: "Online", value: upCount, color: STATUS_COLOR.UP },
                { name: "Offline", value: downCount, color: STATUS_COLOR.DOWN },
                { name: "Aguardando", value: pendingCount, color: STATUS_COLOR.PENDING },
              ]}
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {monitoresAtivos.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl p-4"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">{m.name}</p>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: `${STATUS_COLOR[m.lastStatus]}22`,
                        color: STATUS_COLOR[m.lastStatus],
                        border: `1px solid ${STATUS_COLOR[m.lastStatus]}44`,
                      }}
                    >
                      {STATUS_LABEL[m.lastStatus]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
                    {m.lastStatus === "UP" ? formatUptime(m.lastDownAt ?? m.createdAt) : "—"}
                  </p>
                </div>
              ))}
              {monitoresAtivos.length === 0 && (
                <p className="text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
                  Nenhuma conexão ativa monitorada.
                </p>
              )}
            </div>
          </div>

          {/* Tickets */}
          <div className="glass-card rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-white">Chamados TI</h2>
              <span className="text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
                {tickets.length} no total
              </span>
            </div>

            <DonutStat
              data={[
                { name: "Em aberto", value: emAberto, color: "#f59e0b" },
                { name: "Pendente", value: pendentesTickets.length, color: "#ef4444" },
                { name: "Concluído", value: concluidos, color: "#00cc66" },
              ]}
            />

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl p-4 text-center" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <p className="text-3xl font-bold" style={{ color: "#f59e0b" }}>{emAberto}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>Em aberto</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p className="text-3xl font-bold" style={{ color: "#ef4444" }}>{pendentesTickets.length}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>Pendente</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: "rgba(0,204,102,0.08)", border: "1px solid rgba(0,204,102,0.2)" }}>
                <p className="text-3xl font-bold" style={{ color: "#00cc66" }}>{concluidos}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>Concluído</p>
              </div>
            </div>

            {pendentesTickets.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--onity-dark-text-muted)" }}>
                  Pendentes — precisam de atenção
                </p>
                <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                  {pendentesTickets.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-lg px-3 py-2"
                      style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}
                    >
                      <p className="truncate text-sm text-white">{t.nome}</p>
                      {t.solicitante && (
                        <p className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>{t.solicitante}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
