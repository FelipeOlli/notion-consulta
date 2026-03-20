"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type SnapshotPoint = {
  totalUsers: number;
  activeUsers: number | null;
  snapshotId: string;
  updatedAt: string;
} | null;

type SeriesRow = {
  key: string;
  name: string;
  serverId: string | null;
  values: SnapshotPoint[];
};

type LatestRow = {
  key: string;
  name: string;
  latest: {
    competence: string;
    totalUsers: number;
    activeUsers: number | null;
    importedAt: string;
  } | null;
};

type DashboardPayload = {
  labels: string[];
  series: SeriesRow[];
  latestByService: LatestRow[];
  servers: { id: string; name: string }[];
};

export function AdminFinanceiroDashboard() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const [competence, setCompetence] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });
  const [serviceKey, setServiceKey] = useState("cf-com");
  const [file, setFile] = useState<File | null>(null);
  const [importError, setImportError] = useState("");
  const [importOk, setImportOk] = useState("");
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoadError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/financeiro/snapshots?months=18");
      const json = await res.json();
      if (!res.ok) {
        setLoadError(json?.message || "Nao foi possivel carregar o dashboard.");
        setData(null);
        return;
      }
      setData(json.data as DashboardPayload);
    } catch {
      setLoadError("Falha de conexao.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const maxTotal = useMemo(() => {
    if (!data) return 1;
    let m = 1;
    for (const s of data.series) {
      for (const v of s.values) {
        if (v && v.totalUsers > m) m = v.totalUsers;
      }
    }
    return m;
  }, [data]);

  async function onImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImportError("");
    setImportOk("");
    if (!file) {
      setImportError("Selecione um arquivo.");
      return;
    }
    setImporting(true);
    try {
      const form = new FormData();
      form.set("serviceKey", serviceKey);
      form.set("competence", competence);
      form.set("file", file);
      const res = await fetch("/api/admin/financeiro/import", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setImportError(json?.message || "Importacao falhou.");
        return;
      }
      setImportOk(
        `Importado: ${json.data.serverName} — ${json.data.totalUsers} usuario(s)` +
          (json.data.activeUsers != null ? ` (${json.data.activeUsers} ativos no Google).` : ".")
      );
      setFile(null);
      await load();
    } catch {
      setImportError("Falha de conexao.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-50">Importar dados mensais</h2>
        <p className="mt-1 text-sm text-slate-400">
          Envie o export do Google Workspace (JSON) para CF .COM e .COM.BR, ou o CSV de colaboradores do Time Is
          Money. A competencia define o mes do snapshot (substitui se ja existir).
        </p>
        <form onSubmit={onImport} className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Competencia (mes)
            <input
              type="month"
              value={competence}
              onChange={(e) => setCompetence(e.target.value)}
              className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Servico
            <select
              value={serviceKey}
              onChange={(e) => setServiceKey(e.target.value)}
              className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-slate-100"
            >
              <option value="cf-com">CFCONTABILIDADE.COM (JSON Google)</option>
              <option value="cf-com-br">CFCONTABILIDADE.COM.BR (JSON Google)</option>
              <option value="time-is-money">Time Is Money (CSV)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-300 md:col-span-2 lg:col-span-2">
            Arquivo
            <input
              type="file"
              accept={serviceKey === "time-is-money" ? ".csv,text/csv" : ".json,application/json"}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-2 file:py-1"
            />
          </label>
          <div className="md:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={importing}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
            >
              {importing ? "Importando..." : "Importar snapshot"}
            </button>
          </div>
          {importError ? <p className="text-sm font-medium text-red-400 md:col-span-2 lg:col-span-4">{importError}</p> : null}
          {importOk ? <p className="text-sm font-medium text-emerald-400 md:col-span-2 lg:col-span-4">{importOk}</p> : null}
        </form>
      </section>

      {loading ? (
        <p className="text-sm text-slate-400">Carregando dashboard...</p>
      ) : loadError ? (
        <p className="text-sm font-medium text-red-400">{loadError}</p>
      ) : data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            {data.latestByService.map((row) => (
              <div key={row.key} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-400">{row.name}</p>
                {row.latest ? (
                  <>
                    <p className="mt-2 text-3xl font-bold text-slate-50">{row.latest.totalUsers}</p>
                    <p className="text-sm text-slate-400">usuarios no mes {row.latest.competence}</p>
                    {row.latest.activeUsers != null ? (
                      <p className="mt-1 text-sm text-slate-300">Ativos (Google): {row.latest.activeUsers}</p>
                    ) : (
                      <p className="mt-1 text-sm text-slate-500">Total de colaboradores (CSV)</p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      Importado em {new Date(row.latest.importedAt).toLocaleString("pt-BR")}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Nenhum snapshot ainda. Importe um arquivo.</p>
                )}
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-slate-50">Usuarios por servico ao longo do tempo</h2>
            <p className="mt-1 text-sm text-slate-400">Barras proporcionais ao maior valor exibido no periodo.</p>
            <div className="mt-6 space-y-6">
              {data.labels.map((label, idx) => {
                const hasAny = data.series.some((s) => s.values[idx]);
                if (!hasAny) return null;
                return (
                  <div key={label}>
                    <p className="mb-2 text-sm font-medium text-slate-300">{label}</p>
                    <div className="space-y-2">
                      {data.series.map((s) => {
                        const v = s.values[idx];
                        if (!v) return null;
                        const pct = Math.round((v.totalUsers / maxTotal) * 100);
                        return (
                          <div key={s.key}>
                            <div className="mb-0.5 flex justify-between text-xs text-slate-400">
                              <span>{s.name}</span>
                              <span>
                                {v.totalUsers}
                                {v.activeUsers != null ? ` (${v.activeUsers} ativos)` : ""}
                              </span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-sky-500/90"
                                style={{ width: `${Math.max(pct, 2)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
