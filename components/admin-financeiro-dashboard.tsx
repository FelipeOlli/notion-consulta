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
    snapshotId: string;
    competence: string;
    totalUsers: number;
    activeUsers: number | null;
    importedAt: string;
    source: string;
  } | null;
};

type LineRow = {
  id: string;
  sortOrder: number;
  email: string | null;
  displayName: string;
  companyLabel: string;
  status: string | null;
  detail: string | null;
  meta: unknown;
};

type DashboardPayload = {
  labels: string[];
  series: SeriesRow[];
  latestByService: LatestRow[];
  servers: { id: string; name: string }[];
};

async function parseJsonBody(res: Response): Promise<{ message?: string; data?: unknown }> {
  const text = await res.text();
  try {
    return JSON.parse(text) as { message?: string; data?: unknown };
  } catch {
    return {
      message: `Resposta invalida (HTTP ${res.status}). Verifique se o deploy aplicou migracoes e o app esta no ar.`,
    };
  }
}

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

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTitle, setSheetTitle] = useState("");
  const [sheetSource, setSheetSource] = useState<string | null>(null);
  const [sheetSnapshotId, setSheetSnapshotId] = useState<string | null>(null);
  const [sheetCompanies, setSheetCompanies] = useState<string[]>([]);
  const [sheetCompanyFilter, setSheetCompanyFilter] = useState("");
  const [sheetLines, setSheetLines] = useState<LineRow[]>([]);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState("");

  const loadLines = useCallback(async (snapshotId: string, company?: string) => {
    setSheetLoading(true);
    setSheetError("");
    try {
      const q = company ? `?company=${encodeURIComponent(company)}` : "";
      const res = await fetch(`/api/admin/financeiro/snapshots/${snapshotId}/lines${q}`);
      const json = await parseJsonBody(res);
      if (!res.ok) {
        setSheetError(json?.message || "Nao foi possivel carregar a planilha.");
        setSheetLines([]);
        setSheetCompanies([]);
        return;
      }
      const d = json.data as {
        companies: string[];
        lines: LineRow[];
        snapshot: { source: string };
      };
      setSheetCompanies(d.companies);
      setSheetLines(d.lines);
      setSheetSource(d.snapshot.source);
    } catch {
      setSheetError("Falha de conexao.");
      setSheetLines([]);
    } finally {
      setSheetLoading(false);
    }
  }, []);

  async function openSheet(row: LatestRow) {
    if (!row.latest?.snapshotId) return;
    setSheetTitle(row.name);
    setSheetSnapshotId(row.latest.snapshotId);
    setSheetCompanyFilter("");
    setSheetOpen(true);
    setSheetSource(row.latest.source);
    await loadLines(row.latest.snapshotId);
  }

  function closeSheet() {
    setSheetOpen(false);
    setSheetSnapshotId(null);
    setSheetLines([]);
    setSheetCompanies([]);
    setSheetCompanyFilter("");
    setSheetError("");
  }

  async function applyCompanyFilter() {
    if (!sheetSnapshotId) return;
    await loadLines(sheetSnapshotId, sheetCompanyFilter || undefined);
  }

  const load = useCallback(async () => {
    setLoadError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/financeiro/snapshots?months=18");
      const json = await parseJsonBody(res);
      if (!res.ok) {
        setLoadError(json?.message || "Nao foi possivel carregar o dashboard.");
        setData(null);
        return;
      }
      setData(json.data as DashboardPayload);
    } catch {
      setLoadError("Falha de conexao. Verifique rede ou se o servidor respondeu.");
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
      const json = await parseJsonBody(res);
      if (!res.ok) {
        setImportError(json?.message || "Importacao falhou.");
        return;
      }
      const imported = json.data as {
        serverName: string;
        totalUsers: number;
        activeUsers: number | null;
      };
      setImportOk(
        `Importado: ${imported.serverName} — ${imported.totalUsers} usuario(s)` +
          (imported.activeUsers != null ? ` (${imported.activeUsers} ativos no Google).` : ".")
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
              <button
                key={row.key}
                type="button"
                disabled={!row.latest}
                onClick={() => void openSheet(row)}
                className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-left shadow-sm transition hover:border-sky-500/50 hover:bg-slate-900/80 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-slate-800 disabled:hover:bg-slate-950/80"
              >
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
                    <p className="mt-3 text-xs font-medium text-sky-300/90">Clique para ver planilha por empresa</p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Nenhum snapshot ainda. Importe um arquivo.</p>
                )}
              </button>
            ))}
          </section>

          {sheetOpen ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="financeiro-sheet-title"
            >
              <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-2xl border border-slate-700 bg-slate-950 shadow-xl">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 p-4">
                  <div>
                    <h2 id="financeiro-sheet-title" className="text-lg font-semibold text-slate-50">
                      {sheetTitle}
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Categorizacao por empresa: dominio do e-mail (Google) ou departamento (Time Is Money). Reimporte o
                      mes se a planilha estiver vazia (import anterior sem linhas salvas).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeSheet}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
                  >
                    Fechar
                  </button>
                </div>
                <div className="flex flex-wrap items-end gap-3 border-b border-slate-800 p-4">
                  <label className="flex flex-col gap-1 text-sm text-slate-300">
                    Filtrar por empresa
                    <select
                      value={sheetCompanyFilter}
                      onChange={(e) => setSheetCompanyFilter(e.target.value)}
                      className="h-10 min-w-[220px] rounded-lg border border-slate-700 bg-slate-900 px-3 text-slate-100"
                    >
                      <option value="">Todas</option>
                      {sheetCompanies.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => void applyCompanyFilter()}
                    disabled={sheetLoading}
                    className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
                  >
                    Aplicar
                  </button>
                  {sheetLoading ? <span className="text-sm text-slate-500">Carregando...</span> : null}
                </div>
                <div className="min-h-0 flex-1 overflow-auto p-4">
                  {sheetError ? <p className="text-sm text-red-400">{sheetError}</p> : null}
                  {!sheetLoading && !sheetError && sheetLines.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Nenhuma linha neste snapshot. Importe novamente o arquivo deste mes para gravar o detalhamento.
                    </p>
                  ) : null}
                  {sheetLines.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-slate-800">
                      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                        <thead className="sticky top-0 z-10 bg-slate-900">
                          {sheetSource === "TIM_CSV" ? (
                            <tr className="border-b border-slate-700 text-slate-400">
                              <th className="p-2 font-semibold">Empresa (departamento)</th>
                              <th className="p-2 font-semibold">Nome</th>
                              <th className="p-2 font-semibold">Telefone</th>
                              <th className="p-2 font-semibold">Dispositivo</th>
                              <th className="p-2 font-semibold">Ultima atividade</th>
                              <th className="p-2 font-semibold">Criado em</th>
                            </tr>
                          ) : (
                            <tr className="border-b border-slate-700 text-slate-400">
                              <th className="p-2 font-semibold">Empresa (dominio)</th>
                              <th className="p-2 font-semibold">E-mail</th>
                              <th className="p-2 font-semibold">Nome</th>
                              <th className="p-2 font-semibold">Status</th>
                              <th className="p-2 font-semibold">Detalhes</th>
                            </tr>
                          )}
                        </thead>
                        <tbody>
                          {sheetSource === "TIM_CSV"
                            ? sheetLines.map((line) => {
                                const m = (line.meta && typeof line.meta === "object" ? line.meta : {}) as Record<
                                  string,
                                  string
                                >;
                                return (
                                  <tr key={line.id} className="border-b border-slate-800/80 text-slate-200">
                                    <td className="p-2 align-top text-sky-200/90">{line.companyLabel}</td>
                                    <td className="p-2 align-top">{line.displayName}</td>
                                    <td className="p-2 align-top text-slate-400">{m.telefone ?? "—"}</td>
                                    <td className="p-2 align-top text-slate-400">{m.dispositivo ?? "—"}</td>
                                    <td className="p-2 align-top text-slate-400">{m.ultimaAtividade ?? "—"}</td>
                                    <td className="p-2 align-top text-slate-400">{m.criadoEm ?? "—"}</td>
                                  </tr>
                                );
                              })
                            : sheetLines.map((line) => (
                                <tr key={line.id} className="border-b border-slate-800/80 text-slate-200">
                                  <td className="p-2 align-top text-sky-200/90">{line.companyLabel}</td>
                                  <td className="p-2 align-top font-mono text-xs text-slate-300">{line.email ?? "—"}</td>
                                  <td className="p-2 align-top">{line.displayName}</td>
                                  <td className="p-2 align-top text-slate-400">{line.status ?? "—"}</td>
                                  <td className="p-2 align-top text-slate-400">{line.detail ?? "—"}</td>
                                </tr>
                              ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

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
