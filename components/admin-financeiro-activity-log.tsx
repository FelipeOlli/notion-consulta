"use client";

import { useCallback, useEffect, useState } from "react";

type ActivityRow = {
  id: string;
  createdAt: string;
  actorEmail: string;
  actorUserId: string | null;
  action: string;
  metadata: unknown;
};

const ACTION_LABELS: Record<string, string> = {
  IMPORT_SNAPSHOT: "Importação de snapshot",
  COMPANY_CREATE: "Empresa criada (serviço)",
  COMPANY_RENAME: "Empresa renomeada",
  COMPANY_DELETE: "Empresa excluída",
  LINE_CREATE: "Linha criada (manual)",
  LINE_UPDATE: "Linha atualizada",
  LINE_DELETE: "Linha excluída",
  LINE_BULK_ALLOCATE: "Alocação em massa",
};

const ACTION_OPTIONS = Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label }));

async function parseJsonBody(res: Response): Promise<{ message?: string; data?: unknown }> {
  const text = await res.text();
  try {
    return JSON.parse(text) as { message?: string; data?: unknown };
  } catch {
    return { message: `Resposta inválida (HTTP ${res.status}).` };
  }
}

function formatMetadata(meta: unknown): string {
  if (meta == null) return "—";
  try {
    return JSON.stringify(meta, null, 2);
  } catch {
    return String(meta);
  }
}

export function AdminFinanceiroActivityLog() {
  const [items, setItems] = useState<ActivityRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const fetchPage = useCallback(async (cursor: string | null, append: boolean, filter: string) => {
    const params = new URLSearchParams();
    params.set("limit", "50");
    if (cursor) params.set("cursor", cursor);
    if (filter) params.set("action", filter);
    const res = await fetch(`/api/admin/financeiro/activity-log?${params.toString()}`);
    const json = await parseJsonBody(res);
    if (!res.ok) {
      throw new Error(json.message || "Falha ao carregar o registro.");
    }
    const data = json.data as { items: ActivityRow[]; nextCursor: string | null };
    if (append) {
      setItems((prev) => [...prev, ...data.items]);
    } else {
      setItems(data.items);
    }
    setNextCursor(data.nextCursor);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        await fetchPage(null, false, "");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao carregar.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  async function applyFilter() {
    setLoading(true);
    setError("");
    try {
      await fetchPage(null, false, actionFilter);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError("");
    try {
      await fetchPage(nextCursor, true, actionFilter);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar mais.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-50">Histórico</h2>
      <p className="mt-1 text-sm text-slate-400">
        Ações registradas após a implantação deste log. Importações, empresas do serviço, linhas e alocações.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Filtrar por tipo
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-10 min-w-[220px] rounded-lg border border-slate-700 bg-slate-900 px-3 text-slate-100"
          >
            <option value="">Todos</option>
            {ACTION_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void applyFilter()}
          disabled={loading}
          className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
        >
          Aplicar filtro
        </button>
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-red-400">{error}</p> : null}

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Nenhum registro ainda.</p>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="whitespace-nowrap p-2 font-semibold">Data</th>
                  <th className="p-2 font-semibold">Usuário</th>
                  <th className="p-2 font-semibold">Ação</th>
                  <th className="p-2 font-semibold">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-t border-slate-800/90 text-slate-200">
                    <td className="whitespace-nowrap p-2 align-top text-slate-400">
                      {new Date(row.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="p-2 align-top font-mono text-xs text-slate-300">{row.actorEmail}</td>
                    <td className="p-2 align-top text-slate-200">
                      {ACTION_LABELS[row.action] ?? row.action}
                    </td>
                    <td className="p-2 align-top">
                      <pre className="max-h-40 max-w-xl overflow-auto whitespace-pre-wrap break-all rounded bg-slate-900/80 p-2 text-xs text-slate-400">
                        {formatMetadata(row.metadata)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {nextCursor ? (
            <div className="mt-4">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void loadMore()}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              >
                {loadingMore ? "Carregando…" : "Carregar mais"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
