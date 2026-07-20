"use client";

import { useCallback, useEffect, useState } from "react";

type DayEntry = {
  date: string;
  activeTime: number;
  idleTime: number;
  dailyCost: number;
  actionK: number;
  actionL: number;
};

type TeamMember = {
  clientId: string;
  fullName: string;
  email: string | null;
  online: boolean;
  lastActivity: string | null;
  machineName: string | null;
  publicIP: string | null;
  city: string | null;
  region: string | null;
  latestDay: { date: string; activeTime: number; idleTime: number; dailyCost: number } | null;
  totals: { activeTime: number; idleTime: number; dailyCost: number };
  days: DayEntry[];
};

type ApiData = {
  configured: boolean;
  team?: TeamMember[];
};

type AvailableClient = {
  clientId: string;
  fullName: string;
  email: string | null;
  monitored: boolean;
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h${String(m).padStart(2, "0")}`;
}

function formatCost(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatSince(iso: string | null): string {
  if (!iso) return "sem registro";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

function formatDateShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function MemberCard({ member }: { member: TeamMember }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
          style={{ background: member.online ? "#00cc66" : "#6b8aaa" }}
        />
        <p className="truncate text-sm font-semibold text-white">{member.fullName}</p>
      </div>
      <p className="mt-1 text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
        {member.online ? "online" : "offline"} · visto {formatSince(member.lastActivity)}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
          <p className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>Ativo</p>
          <p className="mt-0.5 text-sm font-semibold text-white">
            {member.latestDay ? formatDuration(member.latestDay.activeTime) : "—"}
          </p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
          <p className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>Ocioso</p>
          <p className="mt-0.5 text-sm font-semibold text-white">
            {member.latestDay ? formatDuration(member.latestDay.idleTime) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
        <p className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
          Custo {member.latestDay ? `(${formatDateShort(member.latestDay.date)})` : ""}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-white">
          {member.latestDay ? formatCost(member.latestDay.dailyCost) : "—"}
        </p>
      </div>

      {member.machineName && (
        <p className="mt-3 truncate text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
          {member.machineName}
          {member.city ? ` · ${member.city}${member.region ? `/${member.region}` : ""}` : ""}
        </p>
      )}
    </div>
  );
}

function TeamManager({ onChanged }: { onChanged: () => void }) {
  const [clients, setClients] = useState<AvailableClient[] | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/time-is-money/team");
      if (!res.ok) return;
      const json = await res.json();
      setClients(json.clients ?? []);
    } catch {
      // falha silenciosa
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(client: AvailableClient) {
    setBusyId(client.clientId);
    try {
      if (client.monitored) {
        await fetch(`/api/admin/time-is-money/team?clientId=${encodeURIComponent(client.clientId)}`, {
          method: "DELETE",
        });
      } else {
        await fetch("/api/admin/time-is-money/team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: client.clientId, fullName: client.fullName, email: client.email }),
        });
      }
      await load();
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  const filtered = (clients ?? []).filter((c) =>
    c.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="glass-card rounded-2xl p-5">
      <p className="mb-3 text-sm font-semibold text-white">Gerenciar equipe monitorada</p>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar colaborador…"
        className="ds-input mb-3 w-full"
      />
      {clients === null ? (
        <p className="text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>Carregando…</p>
      ) : (
        <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
          {filtered.map((c) => (
            <button
              key={c.clientId}
              type="button"
              disabled={busyId === c.clientId}
              onClick={() => toggle(c)}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors"
              style={{
                background: c.monitored ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.03)",
                border: c.monitored ? "1px solid rgba(59,130,246,0.3)" : "1px solid rgba(255,255,255,0.06)",
                opacity: busyId === c.clientId ? 0.5 : 1,
              }}
            >
              <span className="truncate text-sm text-white">{c.fullName}</span>
              <span className="flex-shrink-0 text-xs font-medium" style={{ color: c.monitored ? "#4da3ff" : "var(--onity-dark-text-muted)" }}>
                {c.monitored ? "monitorado ✓" : "adicionar"}
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>Nenhum colaborador encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}

function MemberDailyTable({ member }: { member: TeamMember }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <p className="mb-3 text-sm font-semibold text-white">{member.fullName}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
              <th className="pb-2 pr-4 font-medium">Dia</th>
              <th className="pb-2 pr-4 font-medium">Ativo</th>
              <th className="pb-2 pr-4 font-medium">Ocioso</th>
              <th className="pb-2 pr-4 font-medium">Teclas</th>
              <th className="pb-2 font-medium">Custo</th>
            </tr>
          </thead>
          <tbody>
            {member.days.map((d) => (
              <tr key={d.date} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <td className="py-2 pr-4 text-slate-300">{formatDateShort(d.date)}</td>
                <td className="py-2 pr-4 text-white">{formatDuration(d.activeTime)}</td>
                <td className="py-2 pr-4 text-white">{formatDuration(d.idleTime)}</td>
                <td className="py-2 pr-4 text-slate-300">{d.actionK}</td>
                <td className="py-2 text-white">{formatCost(d.dailyCost)}</td>
              </tr>
            ))}
            {member.days.length === 0 && (
              <tr>
                <td colSpan={5} className="py-3 text-center text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
                  Sem dados no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TimeIsMoneyDashboard({
  variant = "home",
  isMaster = false,
}: {
  variant?: "home" | "full";
  isMaster?: boolean;
}) {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/time-is-money");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setErrorStatus(res.status);
        setErrorDetail(body?.detail ?? null);
        return;
      }
      const json: ApiData = await res.json();
      setData(json);
      setErrorStatus(null);
      setErrorDetail(null);
      setLastUpdated(new Date());
    } catch {
      setErrorStatus(-1);
      setErrorDetail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 30_000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <p className="text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>Carregando Time is Money…</p>
      </div>
    );
  }

  // Sem dados carregados ainda (primeira carga falhou) — distingue a causa em vez de
  // sempre culpar as env vars, que podem estar corretas (ver detalhe no card).
  if (!data) {
    if (errorStatus === 403) {
      return (
        <div className="glass-card rounded-2xl p-6">
          <p className="section-label mb-1">Time is Money</p>
          <p className="text-sm text-yellow-400">Sem permissão para acessar este módulo.</p>
        </div>
      );
    }
    if (errorStatus !== null) {
      return (
        <div className="glass-card rounded-2xl p-6">
          <p className="section-label mb-1">Time is Money</p>
          <p className="text-sm text-yellow-400">
            Não foi possível conectar à API do Time is Money (status {errorStatus === -1 ? "de rede" : errorStatus}).
            Verifique se o servidor tem acesso de saída a{" "}
            <code className="font-mono text-xs">tim-api-prod2.prod.timeismoney.tec.br</code> e se a{" "}
            <code className="font-mono text-xs">TIM_API_KEY</code> é válida.
          </p>
          {errorDetail && (
            <p className="mt-2 font-mono text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
              {errorDetail}
            </p>
          )}
        </div>
      );
    }
    return (
      <div className="glass-card rounded-2xl p-6">
        <p className="section-label mb-1">Time is Money</p>
        <p className="text-sm text-yellow-400">Nenhum dado retornado pela API.</p>
      </div>
    );
  }

  if (!data.configured) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <p className="section-label mb-1">Time is Money</p>
        <p className="text-sm text-yellow-400">
          Configure as variáveis de ambiente{" "}
          <code className="font-mono text-xs">TIM_API_URL</code> e{" "}
          <code className="font-mono text-xs">TIM_API_KEY</code> para ativar este módulo.
        </p>
      </div>
    );
  }

  const team = data.team ?? [];

  const header = (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="section-label">Time is Money</p>
        <h2 className="mt-1 text-lg font-bold text-white">Monitoramento da equipe</h2>
      </div>
      {lastUpdated && (
        <p className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
          Atualizado às{" "}
          {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      )}
    </div>
  );

  if (team.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Nenhum colaborador monitorado ainda.
          </p>
        </div>
        {variant === "full" && isMaster && <TeamManager onChanged={load} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {team.map((m) => (
          <MemberCard key={m.clientId} member={m} />
        ))}
      </div>

      {variant === "full" && (
        <>
          <div className="space-y-4">
            {team.map((m) => (
              <MemberDailyTable key={m.clientId} member={m} />
            ))}
          </div>

          {isMaster && <TeamManager onChanged={load} />}
        </>
      )}
    </div>
  );
}
