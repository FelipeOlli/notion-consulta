"use client";

import { useState, useEffect, useCallback, useRef } from "react";

function AutoResizeTextarea({ value, onChange, placeholder, className, onKeyDown, autoFocus }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={3}
      className={className}
      style={{ resize: "none", overflow: "hidden", minHeight: "80px", paddingTop: "12px" }}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      autoFocus={autoFocus}
    />
  );
}

interface Observacao {
  id: string;
  texto: string;
  authorEmail: string;
  editedAt: string | null;
  createdAt: string;
}

const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

interface Props {
  clienteId: string;
  currentEmail: string;
}

export function AlterdataObservacoesList({ clienteId, currentEmail }: Props) {
  const [obs, setObs] = useState<Observacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoTexto, setNovoTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const res = await fetch(`/api/admin/alterdata/clientes/${clienteId}/observacoes`);
    const data = await res.json();
    setObs(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [clienteId]);

  useEffect(() => { carregar(); }, [carregar]);

  async function adicionar() {
    if (!novoTexto.trim()) return;
    setSalvando(true);
    await fetch(`/api/admin/alterdata/clientes/${clienteId}/observacoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: novoTexto }),
    });
    setNovoTexto("");
    await carregar();
    setSalvando(false);
  }

  async function excluir(id: string) {
    setExcluindoId(id);
    await fetch(`/api/admin/alterdata/observacoes/${id}`, { method: "DELETE" });
    await carregar();
    setExcluindoId(null);
  }

  return (
    <div className="flex flex-col space-y-3">
      <p className="text-xs font-semibold text-white/80">Observações</p>

      {/* Form nova observação */}
      <div className="space-y-2">
        <AutoResizeTextarea
          className="ds-input w-full text-sm"
          placeholder="Registrar observação..."
          value={novoTexto}
          onChange={setNovoTexto}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) adicionar(); }}
        />
        <div className="flex justify-end">
          <button
            onClick={adicionar}
            disabled={salvando || !novoTexto.trim()}
            className="text-xs px-3 py-1.5 rounded-lg border border-blue-500/30 text-blue-400 hover:text-blue-300 hover:border-blue-400/50 transition-colors disabled:opacity-40"
          >
            {salvando ? "Salvando..." : "Adicionar"}
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ maxHeight: "340px" }}>
        {loading ? (
          <p className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>Carregando...</p>
        ) : obs.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>Nenhuma observação ainda.</p>
        ) : (
          obs.map((o) => (
            <div key={o.id} className="glass-card p-3 rounded-xl">
              <div className="flex items-start gap-2">
                <p className="flex-1 text-sm text-white/85 whitespace-pre-wrap break-words">{o.texto}</p>
                {o.authorEmail === currentEmail && (
                  <button
                    onClick={() => excluir(o.id)}
                    disabled={excluindoId === o.id}
                    className="shrink-0 text-red-400/50 hover:text-red-400 transition-colors disabled:opacity-40 mt-0.5"
                    title="Excluir observação"
                  >
                    {excluindoId === o.id ? (
                      <span className="text-xs">...</span>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-2 min-w-0">
                <span className="text-xs truncate" style={{ color: "var(--onity-dark-text-muted)" }}>
                  {o.authorEmail}
                </span>
                <span className="text-xs shrink-0" style={{ color: "var(--onity-dark-text-muted)" }}>
                  · {fmt.format(new Date(o.createdAt))}
                </span>
                {o.editedAt && (
                  <span className="text-xs shrink-0 text-white/30 italic">editado</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
