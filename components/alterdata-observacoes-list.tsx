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
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editTexto, setEditTexto] = useState("");
  const [salvandoEdit, setSalvandoEdit] = useState(false);
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

  async function salvarEdicao(id: string) {
    if (!editTexto.trim()) return;
    setSalvandoEdit(true);
    await fetch(`/api/admin/alterdata/observacoes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: editTexto }),
    });
    setEditandoId(null);
    await carregar();
    setSalvandoEdit(false);
  }

  async function excluir(id: string) {
    setExcluindoId(id);
    await fetch(`/api/admin/alterdata/observacoes/${id}`, { method: "DELETE" });
    await carregar();
    setExcluindoId(null);
  }

  function iniciarEdicao(o: Observacao) {
    setEditandoId(o.id);
    setEditTexto(o.texto);
  }

  return (
    <div className="flex flex-col h-full space-y-3">
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
            <div key={o.id} className="glass-card p-3 space-y-2 rounded-xl">
              {editandoId === o.id ? (
                <div className="space-y-2">
                  <AutoResizeTextarea
                    className="ds-input w-full text-sm"
                    value={editTexto}
                    onChange={setEditTexto}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setEditandoId(null)}
                      className="text-xs px-2 py-1 rounded text-white/50 hover:text-white/80 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => salvarEdicao(o.id)}
                      disabled={salvandoEdit || !editTexto.trim()}
                      className="text-xs px-3 py-1 rounded-lg border border-blue-500/30 text-blue-400 hover:text-blue-300 disabled:opacity-40 transition-colors"
                    >
                      {salvandoEdit ? "..." : "Salvar"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/85 whitespace-pre-wrap break-words">{o.texto}</p>
              )}

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
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

                {o.authorEmail === currentEmail && editandoId !== o.id && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => iniciarEdicao(o)}
                      className="text-xs text-blue-400/70 hover:text-blue-400 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => excluir(o.id)}
                      disabled={excluindoId === o.id}
                      className="text-xs text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-40"
                    >
                      {excluindoId === o.id ? "..." : "Excluir"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
