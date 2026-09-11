"use client";

import { useState, useEffect, useRef } from "react";

type Entry = {
  id: string;
  nome: string;
  anydesk: string;
  senha: string | null;
};

type ModalState = { open: false } | { open: true; mode: "create" } | { open: true; mode: "edit"; entry: Entry };

function Modal({ state, onClose, onSaved }: {
  state: ModalState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState("");
  const [anydesk, setAnydesk] = useState("");
  const [temSenha, setTemSenha] = useState(false);
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nomeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.open) return;
    if (state.mode === "edit") {
      setNome(state.entry.nome);
      setAnydesk(state.entry.anydesk);
      setTemSenha(Boolean(state.entry.senha));
      setSenha(state.entry.senha ?? "");
    } else {
      setNome("");
      setAnydesk("");
      setTemSenha(false);
      setSenha("");
    }
    setError("");
    setTimeout(() => nomeRef.current?.focus(), 50);
  }, [state]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!state.open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const body = { nome, anydesk, senha: temSenha ? senha : null };
    try {
      const res = state.mode === "edit"
        ? await fetch(`/api/admin/anydesk/${state.entry.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/admin/anydesk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

      if (!res.ok) {
        const j = await res.json();
        setError(j.message ?? "Erro desconhecido.");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Falha de rede.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(8,15,26,0.8)",
    border: "1px solid rgba(29,127,229,0.25)",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "white",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "min(440px, 95vw)",
          background: "#0f172a",
          border: "1px solid rgba(29,127,229,0.25)",
          borderRadius: "16px",
          padding: "28px 24px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">
            {state.mode === "edit" ? "Editar AnyDesk" : "Novo AnyDesk"}
          </h2>
          <button onClick={onClose} className="text-[#6b8aaa] hover:text-white transition text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>Nome</label>
            <input
              ref={nomeRef}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João Silva"
              required
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(29,127,229,0.6)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(29,127,229,0.25)")}
            />
          </div>

          {/* AnyDesk ID */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>AnyDesk</label>
            <input
              value={anydesk}
              onChange={(e) => setAnydesk(e.target.value)}
              placeholder="Ex: 123 456 789"
              required
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(29,127,229,0.6)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(29,127,229,0.25)")}
            />
          </div>

          {/* Tem senha? */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={temSenha}
              onChange={(e) => setTemSenha(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "#1d7fe5", cursor: "pointer" }}
            />
            <span className="text-sm" style={{ color: "#94a3b8" }}>Tem senha?</span>
          </label>

          {/* Senha (condicional) */}
          {temSenha && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>Senha</label>
              <input
                type="text"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Senha do AnyDesk"
                required={temSenha}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(29,127,229,0.6)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(29,127,229,0.25)")}
              />
            </div>
          )}

          {error && (
            <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg py-2.5 text-sm font-medium transition"
              style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition"
              style={{ background: loading ? "rgba(29,127,229,0.4)" : "#1d7fe5" }}
            >
              {loading ? "Salvando..." : state.mode === "edit" ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AnydeskDashboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showSenha, setShowSenha] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/anydesk");
      const j = await res.json();
      setEntries(j.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm("Remover esta entrada?")) return;
    setDeletingId(id);
    await fetch(`/api/admin/anydesk/${id}`, { method: "DELETE" });
    setDeletingId(null);
    load();
  }

  function toggleSenha(id: string) {
    setShowSenha((s) => ({ ...s, [id]: !s[id] }));
  }

  const cardBase: React.CSSProperties = {
    background: "rgba(15,23,42,0.8)",
    border: "1px solid rgba(29,127,229,0.15)",
    borderRadius: "14px",
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
    transition: "border-color 0.2s",
  };

  return (
    <>
      {/* Botão + AnyDesk */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">AnyDesk</h2>
        <button
          onClick={() => setModal({ open: true, mode: "create" })}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
          style={{ background: "#1d7fe5", border: "none" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#1a6fd0")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#1d7fe5")}
        >
          + AnyDesk
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-sm" style={{ color: "#64748b" }}>Carregando...</p>
      ) : entries.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <p className="text-sm font-medium" style={{ color: "#64748b" }}>Nenhum AnyDesk cadastrado.</p>
          <p className="text-xs mt-1" style={{ color: "#475569" }}>Clique em "+ AnyDesk" para adicionar.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((e) => (
            <div
              key={e.id}
              style={cardBase}
              onMouseEnter={(el) => (el.currentTarget.style.borderColor = "rgba(29,127,229,0.35)")}
              onMouseLeave={(el) => (el.currentTarget.style.borderColor = "rgba(29,127,229,0.15)")}
            >
              <p className="text-sm font-semibold text-white">{e.nome}</p>
              <p className="text-xs font-mono mt-0.5" style={{ color: "#4da3ff" }}>{e.anydesk}</p>

              {e.senha !== null ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs" style={{ color: "#64748b" }}>Senha:</span>
                  <span className="text-xs font-mono" style={{ color: "#94a3b8" }}>
                    {showSenha[e.id] ? e.senha : "••••••"}
                  </span>
                  <button
                    onClick={() => toggleSenha(e.id)}
                    className="text-xs transition"
                    style={{ color: "#4da3ff" }}
                  >
                    {showSenha[e.id] ? "Ocultar" : "Ver"}
                  </button>
                </div>
              ) : (
                <p className="text-xs mt-1" style={{ color: "#475569" }}>Sem senha</p>
              )}

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setModal({ open: true, mode: "edit", entry: e })}
                  className="flex-1 rounded-md py-1.5 text-xs font-medium transition"
                  style={{ background: "rgba(29,127,229,0.12)", color: "#4da3ff", border: "1px solid rgba(29,127,229,0.2)" }}
                  onMouseEnter={(el) => (el.currentTarget.style.background = "rgba(29,127,229,0.22)")}
                  onMouseLeave={(el) => (el.currentTarget.style.background = "rgba(29,127,229,0.12)")}
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(e.id)}
                  disabled={deletingId === e.id}
                  className="flex-1 rounded-md py-1.5 text-xs font-medium transition"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
                  onMouseEnter={(el) => (el.currentTarget.style.background = "rgba(239,68,68,0.2)")}
                  onMouseLeave={(el) => (el.currentTarget.style.background = "rgba(239,68,68,0.1)")}
                >
                  {deletingId === e.id ? "..." : "Remover"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal state={modal} onClose={() => setModal({ open: false })} onSaved={load} />
    </>
  );
}
