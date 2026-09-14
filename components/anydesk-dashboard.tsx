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
    if (!state.open) return;
    const isEdit = state.mode === "edit";
    const editId = state.mode === "edit" ? state.entry.id : undefined;
    setLoading(true);
    setError("");
    const body = { nome, anydesk, senha: temSenha ? senha : null };
    try {
      const url = isEdit ? `/api/admin/anydesk/${editId}` : "/api/admin/anydesk";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

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
      style={{
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        animation: "adBackdropIn 0.2s ease forwards",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes adBackdropIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes adPanelIn { from { opacity: 0; transform: translateY(20px) scale(0.95) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
      <div
        style={{
          width: "min(440px, 95vw)",
          background: "#0f172a",
          border: "1px solid rgba(29,127,229,0.25)",
          borderRadius: "16px",
          padding: "28px 24px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          animation: "adPanelIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards",
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
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>AnyDesk ID</label>
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

// ─── Modal de detalhes ────────────────────────────────────────────────────────
function DetailModal({ entry, onClose, onEdit, onDelete }: {
  entry: Entry;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedSenha, setCopiedSenha] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copy(text: string, which: "id" | "senha") {
    await navigator.clipboard.writeText(text);
    if (which === "id") {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1800);
    } else {
      setCopiedSenha(true);
      setTimeout(() => setCopiedSenha(false), 1800);
    }
  }

  async function handleDelete() {
    if (!confirm(`Remover "${entry.nome}"?`)) return;
    setDeleting(true);
    onDelete();
  }

  const rowStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(29,127,229,0.12)",
    borderRadius: "10px",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  };

  function CopyBtn({ copied, onClick }: { copied: boolean; onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        style={{
          background: copied ? "rgba(74,222,128,0.15)" : "rgba(29,127,229,0.12)",
          color: copied ? "#4ade80" : "#4da3ff",
          border: `1px solid ${copied ? "rgba(74,222,128,0.3)" : "rgba(29,127,229,0.2)"}`,
          borderRadius: "6px",
          padding: "4px 10px",
          fontSize: "11px",
          fontFamily: "monospace",
          cursor: "pointer",
          transition: "all 0.2s",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {copied ? "✓ Copiado" : "Copiar"}
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        animation: "adBackdropIn 0.2s ease forwards",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "min(420px, 95vw)",
          background: "#0f172a",
          border: "1px solid rgba(29,127,229,0.25)",
          borderRadius: "16px",
          padding: "28px 24px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          animation: "adPanelIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: "#4da3ff" }}>AnyDesk</p>
            <h2 className="text-xl font-semibold text-white">{entry.nome}</h2>
          </div>
          <button onClick={onClose} className="text-[#6b8aaa] hover:text-white transition text-xl leading-none mt-0.5">×</button>
        </div>

        {/* ID */}
        <div className="mb-3" style={rowStyle}>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider mb-0.5" style={{ color: "#475569" }}>ID</p>
            <p className="text-sm font-mono font-semibold" style={{ color: "#4da3ff" }}>{entry.anydesk}</p>
          </div>
          <CopyBtn copied={copiedId} onClick={() => copy(entry.anydesk, "id")} />
        </div>

        {/* Senha */}
        {entry.senha !== null ? (
          <div className="mb-6" style={rowStyle}>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider mb-0.5" style={{ color: "#475569" }}>Senha</p>
              <p className="text-sm font-mono font-semibold" style={{ color: "#94a3b8" }}>
                {showSenha ? entry.senha : "••••••••"}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setShowSenha((s) => !s)}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "#64748b",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  cursor: "pointer",
                }}
              >
                {showSenha ? "Ocultar" : "Ver"}
              </button>
              <CopyBtn copied={copiedSenha} onClick={() => copy(entry.senha!, "senha")} />
            </div>
          </div>
        ) : (
          <p className="mb-6 text-xs" style={{ color: "#475569" }}>Sem senha cadastrada.</p>
        )}

        {/* Ações */}
        <div className="flex gap-2 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <button
            onClick={onEdit}
            className="flex-1 rounded-lg py-2 text-xs font-medium transition"
            style={{ background: "rgba(29,127,229,0.12)", color: "#4da3ff", border: "1px solid rgba(29,127,229,0.2)" }}
            onMouseEnter={(el) => (el.currentTarget.style.background = "rgba(29,127,229,0.22)")}
            onMouseLeave={(el) => (el.currentTarget.style.background = "rgba(29,127,229,0.12)")}
          >
            Editar
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 rounded-lg py-2 text-xs font-medium transition"
            style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
            onMouseEnter={(el) => (el.currentTarget.style.background = "rgba(239,68,68,0.2)")}
            onMouseLeave={(el) => (el.currentTarget.style.background = "rgba(239,68,68,0.1)")}
          >
            {deleting ? "..." : "Remover"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────
export function AnydeskDashboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<ModalState>({ open: false });
  const [detailEntry, setDetailEntry] = useState<Entry | null>(null);

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
    await fetch(`/api/admin/anydesk/${id}`, { method: "DELETE" });
    setDetailEntry(null);
    load();
  }

  return (
    <>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">AnyDesk</h2>
        <button
          onClick={() => setEditModal({ open: true, mode: "create" })}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
          style={{ background: "#1d7fe5", border: "none" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#1a6fd0")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#1d7fe5")}
        >
          + AnyDesk
        </button>
      </div>

      {/* Container — sempre visível */}
      <div className="glass-card rounded-2xl p-5" style={{ minHeight: "96px" }}>
        {loading ? (
          <p className="text-sm" style={{ color: "#64748b" }}>Carregando...</p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6">
            <p className="text-sm font-medium" style={{ color: "#64748b" }}>Nenhum AnyDesk cadastrado.</p>
            <p className="text-xs mt-1" style={{ color: "#475569" }}>Clique em &quot;+ AnyDesk&quot; para adicionar.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {entries.map((e) => (
              <button
                key={e.id}
                onClick={() => setDetailEntry(e)}
                style={{
                  background: "rgba(29,127,229,0.08)",
                  border: "1px solid rgba(29,127,229,0.2)",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.18s",
                }}
                onMouseEnter={(el) => {
                  el.currentTarget.style.background = "rgba(29,127,229,0.18)";
                  el.currentTarget.style.borderColor = "rgba(29,127,229,0.4)";
                }}
                onMouseLeave={(el) => {
                  el.currentTarget.style.background = "rgba(29,127,229,0.08)";
                  el.currentTarget.style.borderColor = "rgba(29,127,229,0.2)";
                }}
              >
                {e.nome}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal de detalhes */}
      {detailEntry && (
        <DetailModal
          entry={detailEntry}
          onClose={() => setDetailEntry(null)}
          onEdit={() => {
            setEditModal({ open: true, mode: "edit", entry: detailEntry });
            setDetailEntry(null);
          }}
          onDelete={() => handleDelete(detailEntry.id)}
        />
      )}

      {/* Modal de criação/edição */}
      <Modal
        state={editModal}
        onClose={() => setEditModal({ open: false })}
        onSaved={load}
      />
    </>
  );
}
