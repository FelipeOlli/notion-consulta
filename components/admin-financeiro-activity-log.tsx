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

  const muted = "var(--onity-dark-text-muted)";

  return (
    <section
      className="rounded-2xl p-5 sm:p-6"
      style={{ background: "rgba(8,15,26,0.7)", border: "1px solid rgba(29,127,229,0.15)" }}
    >
      <h2 className="text-lg font-semibold text-white">Histórico</h2>
      <p className="mt-1 text-sm" style={{ color: muted }}>
        Ações registradas após a implantação deste log. Importações, empresas do serviço, linhas e alocações.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-white">
          Filtrar por tipo
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="ds-input h-10 min-w-[220px]"
            style={{ cursor: "pointer" }}
          >
            <option value="" style={{ background: "#0d1829" }}>Todos</option>
            {ACTION_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value} style={{ background: "#0d1829" }}>{label}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void applyFilter()}
          disabled={loading}
          className="btn-primary h-10 rounded-lg px-4 text-sm font-medium disabled:opacity-60"
        >
          Aplicar filtro
        </button>
      </div>

      {error ? <p className="mt-4 text-sm font-medium" style={{ color: "#ff453a" }}>{error}</p> : null}

      {loading ? (
        <p className="mt-6 text-sm" style={{ color: muted }}>Carregando…</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm" style={{ color: muted }}>Nenhum registro ainda.</p>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto rounded-lg" style={{ border: "1px solid rgba(29,127,229,0.12)" }}>
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead style={{ background: "rgba(3,8,15,0.6)", color: "var(--onity-dark-text-muted)" }}>
                <tr>
                  <th className="whitespace-nowrap p-2 font-semibold">Data</th>
                  <th className="p-2 font-semibold">Usuário</th>
                  <th className="p-2 font-semibold">Ação</th>
                  <th className="p-2 font-semibold">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="text-white" style={{ borderTop: "1px solid rgba(29,127,229,0.08)" }}>
                    <td className="whitespace-nowrap p-2 align-top" style={{ color: muted }}>
                      {new Date(row.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="p-2 align-top font-mono text-xs" style={{ color: muted }}>{row.actorEmail}</td>
                    <td className="p-2 align-top text-white">{ACTION_LABELS[row.action] ?? row.action}</td>
                    <td className="p-2 align-top">
                      <pre className="max-h-40 max-w-xl overflow-auto whitespace-pre-wrap break-all rounded p-2 text-xs" style={{ background: "rgba(3,8,15,0.6)", color: muted }}>
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
                className="rounded-lg px-4 py-2 text-sm text-white transition disabled:opacity-50"
                style={{ border: "1px solid rgba(29,127,229,0.2)", background: "rgba(8,15,26,0.5)" }}
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
