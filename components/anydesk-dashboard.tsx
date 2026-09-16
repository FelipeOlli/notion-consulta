"use client";

import { useState, useEffect, useRef } from "react";

type Entry = {
  id: string;
  nome: string;
  anydesk: string;
  senha: string | null;
  observacoes?: string | null;
};

type GuiaTag = {
  id: string;
  nome: string;
};

type GuiaTi = {
  id: string;
  nome: string;
  modulo: string | null;
  fileType: string;
  fileUrl: string;
  fileName: string | null;
  fileSize: number | null;
  observacoes?: string | null;
  tags: GuiaTag[];
  createdAt: string;
};

function getFileBadgeInfo(g: GuiaTi): { label: string; icon: string; bg: string; color: string; border: string } | null {
  if (!g.fileUrl) return null;

  const type = (g.fileType || "").toLowerCase();
  const ext = g.fileName ? g.fileName.split(".").pop()?.toLowerCase() || "" : "";

  if (type === "pdf" || ext === "pdf") {
    return { label: "PDF", icon: "📄", bg: "rgba(239,68,68,0.14)", color: "#fca5a5", border: "rgba(239,68,68,0.3)" };
  }
  if (type === "mp4" || type === "video" || ext === "mp4" || ext === "mkv" || ext === "avi" || ext === "mov" || ext === "webm") {
    return { label: "MP4", icon: "🎬", bg: "rgba(168,85,247,0.14)", color: "#d8b4fe", border: "rgba(168,85,247,0.3)" };
  }
  if (type === "mp3" || type === "audio" || ext === "mp3" || ext === "wav" || ext === "ogg" || ext === "m4a" || ext === "aac") {
    return { label: "MP3", icon: "🎙", bg: "rgba(234,179,8,0.14)", color: "#fde047", border: "rgba(234,179,8,0.3)" };
  }
  if (type === "word" || ext === "doc" || ext === "docx") {
    return { label: "WORD", icon: "📝", bg: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "rgba(59,130,246,0.3)" };
  }
  if (type === "excel" || ext === "xls" || ext === "xlsx" || ext === "csv") {
    return { label: "EXCEL", icon: "📊", bg: "rgba(34,197,94,0.14)", color: "#86efac", border: "rgba(34,197,94,0.3)" };
  }
  if (type === "powerpoint" || ext === "ppt" || ext === "pptx") {
    return { label: "PPT", icon: "📑", bg: "rgba(249,115,22,0.14)", color: "#fdba74", border: "rgba(249,115,22,0.3)" };
  }
  if (type === "zip" || ext === "zip" || ext === "rar" || ext === "7z") {
    return { label: "ZIP", icon: "🗜", bg: "rgba(217,70,239,0.14)", color: "#f0abfc", border: "rgba(217,70,239,0.3)" };
  }
  if (type === "image" || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
    return { label: ext ? ext.toUpperCase() : "IMG", icon: "🖼", bg: "rgba(20,184,166,0.14)", color: "#5eead4", border: "rgba(20,184,166,0.3)" };
  }
  if (type === "link") {
    return { label: "LINK", icon: "🔗", bg: "rgba(14,165,233,0.14)", color: "#7dd3fc", border: "rgba(14,165,233,0.3)" };
  }
  if (ext) {
    return { label: ext.toUpperCase(), icon: "📎", bg: "rgba(100,116,139,0.16)", color: "#cbd5e1", border: "rgba(100,116,139,0.25)" };
  }
  if (type !== "note") {
    return { label: "ARQUIVO", icon: "📎", bg: "rgba(100,116,139,0.16)", color: "#cbd5e1", border: "rgba(100,116,139,0.25)" };
  }
  return null;
}

type ModalState = { open: false } | { open: true; mode: "create" } | { open: true; mode: "edit"; entry: Entry };

function Modal({ state, onClose, onSaved }: {
  state: ModalState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState("");
  const [anydesk, setAnydesk] = useState("");
  const [senha, setSenha] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nomeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.open) return;
    if (state.mode === "edit") {
      setNome(state.entry.nome);
      setAnydesk(state.entry.anydesk);
      setSenha(state.entry.senha ?? "");
      setObservacoes(state.entry.observacoes ?? "");
    } else {
      setNome("");
      setAnydesk("");
      setSenha("");
      setObservacoes("");
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
    const body = {
      nome,
      anydesk,
      senha: senha.trim() || null,
      observacoes: observacoes.trim() || null,
    };
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
          maxHeight: "90vh",
          overflowY: "auto",
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

          {/* Senha (sempre à mostra) */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>Senha</label>
            <input
              type="text"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Senha do AnyDesk"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(29,127,229,0.6)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(29,127,229,0.25)")}
            />
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>
              Observações <span style={{ color: "#475569" }}>(opcional)</span>
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações ou informações adicionais..."
              rows={3}
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: "75px",
                lineHeight: "1.4",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(29,127,229,0.6)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(29,127,229,0.25)")}
            />
          </div>

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

  async function copyToClipboard(val: string) {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(val);
      return;
    }
    const textArea = document.createElement("textarea");
    textArea.value = val;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
    } finally {
      document.body.removeChild(textArea);
    }
  }

  async function copy(text: string, which: "id" | "senha") {
    const secondary = which === "id" ? entry.senha : entry.anydesk;

    try {
      if (secondary) {
        await copyToClipboard(secondary);
        await new Promise((r) => setTimeout(r, 100));
      }

      await copyToClipboard(text);

      if (which === "id") {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 1800);
      } else {
        setCopiedSenha(true);
        setTimeout(() => setCopiedSenha(false), 1800);
      }
    } catch (err) {
      console.error("Falha ao copiar:", err);
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
      <style>{`
        @keyframes adBackdropIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes adPanelIn { from { opacity: 0; transform: translateY(20px) scale(0.95) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
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
        {entry.senha ? (
          <div className="mb-3" style={rowStyle}>
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
          <p className="mb-3 text-xs" style={{ color: "#475569" }}>Sem senha cadastrada.</p>
        )}

        {/* Observações */}
        {entry.observacoes && (
          <div
            className="mb-6 rounded-lg p-3"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: "#475569" }}>
              Observações
            </p>
            <p className="text-xs text-[#cbd5e1] whitespace-pre-wrap leading-relaxed">
              {entry.observacoes}
            </p>
          </div>
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

// ─── GuiaModal ───────────────────────────────────────────────────────────────
function GuiaModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [nome, setNome] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tags, setTags] = useState<GuiaTag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [showNewTag, setShowNewTag] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nomeRef = useRef<HTMLInputElement>(null);
  const newTagRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => nomeRef.current?.focus(), 50);
    fetch("/api/admin/guias-ti/tags")
      .then((r) => r.json())
      .then((j) => setTags(j.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  async function handleCreateTag() {
    const n = newTagName.trim();
    if (!n) return;
    setCreatingTag(true);
    try {
      const res = await fetch("/api/admin/guias-ti/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: n }),
      });
      if (!res.ok) return;
      const { data } = await res.json();
      setTags((prev) => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
      setSelectedTagIds((prev) => [...prev, data.id]);
      setNewTagName("");
      setShowNewTag(false);
    } finally {
      setCreatingTag(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    if (file && linkUrl.trim()) {
      setError("Escolha apenas um: URL ou arquivo.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      let res: Response;
      if (file) {
        const fd = new FormData();
        fd.append("nome", nome.trim());
        fd.append("tagIds", JSON.stringify(selectedTagIds));
        fd.append("file", file);
        if (observacoes.trim()) fd.append("observacoes", observacoes.trim());
        res = await fetch("/api/admin/guias-ti", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/admin/guias-ti", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: nome.trim(),
            fileUrl: linkUrl.trim(),
            observacoes: observacoes.trim() || undefined,
            tagIds: selectedTagIds,
          }),
        });
      }
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
    width: "100%", background: "rgba(8,15,26,0.8)",
    border: "1px solid rgba(29,127,229,0.25)", borderRadius: "8px",
    padding: "10px 14px", color: "white", fontSize: "14px", outline: "none",
  };
  const labelStyle: React.CSSProperties = { color: "#94a3b8", fontSize: "11px", fontWeight: 500 };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", animation: "adBackdropIn 0.2s ease forwards" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes adBackdropIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes adPanelIn { from { opacity: 0; transform: translateY(20px) scale(0.95) } to { opacity: 1; transform: translateY(0) scale(1) } }
        .guia-tag-chip { transition: background 0.15s, border-color 0.15s, color 0.15s; }
      `}</style>
      <div style={{
        width: "min(480px, 95vw)", background: "#0f172a",
        border: "1px solid rgba(29,127,229,0.25)", borderRadius: "16px",
        padding: "28px 24px", boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        animation: "adPanelIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Nova Guia</h2>
          <button onClick={onClose} className="text-[#6b8aaa] hover:text-white transition text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nome */}
          <div>
            <label style={{ ...labelStyle, display: "block", marginBottom: 6 }}>Nome do passo a passo *</label>
            <input ref={nomeRef} value={nome} onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Como configurar o Alterdata" required style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(29,127,229,0.6)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(29,127,229,0.25)")} />
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label style={labelStyle}>Módulo / Plataforma <span style={{ color: "#475569" }}>(opcional)</span></label>
              <button
                type="button"
                onClick={() => { setShowNewTag((s) => !s); setTimeout(() => newTagRef.current?.focus(), 60); }}
                style={{
                  fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "6px",
                  background: showNewTag ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.1)",
                  color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)", cursor: "pointer",
                }}
              >
                + Nova TAG
              </button>
            </div>

            {/* Inline new tag input */}
            {showNewTag && (
              <div className="flex gap-2 mb-2">
                <input
                  ref={newTagRef}
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateTag(); } }}
                  placeholder="Nome da nova tag…"
                  style={{ ...inputStyle, flex: 1, padding: "7px 12px", fontSize: "13px" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(29,127,229,0.25)")}
                />
                <button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={creatingTag || !newTagName.trim()}
                  style={{
                    padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                    background: "rgba(139,92,246,0.25)", color: "#a78bfa",
                    border: "1px solid rgba(139,92,246,0.4)", cursor: "pointer", whiteSpace: "nowrap",
                    opacity: creatingTag || !newTagName.trim() ? 0.5 : 1,
                  }}
                >
                  {creatingTag ? "…" : "Criar"}
                </button>
              </div>
            )}

            {/* Tag chips */}
            {tags.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#475569" }}>Nenhuma tag cadastrada. Crie uma com &quot;+ Nova TAG&quot;.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className="guia-tag-chip"
                      style={{
                        padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 500,
                        cursor: "pointer",
                        background: selected ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${selected ? "rgba(139,92,246,0.6)" : "rgba(255,255,255,0.1)"}`,
                        color: selected ? "#c4b5fd" : "#64748b",
                      }}
                    >
                      {selected && <span style={{ marginRight: 4 }}>✓</span>}
                      {tag.nome}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* URL */}
          <div>
            <label style={{ ...labelStyle, display: "block", marginBottom: 6 }}>URL <span style={{ color: "#475569" }}>(opcional)</span></label>
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://drive.google.com/…"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(29,127,229,0.6)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(29,127,229,0.25)")}
            />
          </div>

          {/* Arquivo */}
          <div>
            <label style={{ ...labelStyle, display: "block", marginBottom: 6 }}>Arquivo <span style={{ color: "#475569" }}>(opcional - PDF, vídeo, áudio, etc.)</span></label>
            <label
              style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(8,15,26,0.8)",
                border: `1px solid ${file ? "rgba(74,222,128,0.35)" : "rgba(29,127,229,0.25)"}`,
                borderRadius: "8px", padding: "10px 14px", cursor: "pointer",
                color: file ? "#4ade80" : "#475569", fontSize: "13px",
              }}
            >
              <span style={{ fontSize: 16 }}>{file ? "📎" : "⬆️"}</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {file ? `${file.name} (${(file.size / 1024).toFixed(0)} KB)` : "Clique para selecionar um arquivo…"}
              </span>
              {file && (
                <button type="button" onClick={(e) => { e.preventDefault(); setFile(null); }}
                  style={{ color: "#f87171", fontSize: 13, lineHeight: 1, background: "none", border: "none", cursor: "pointer" }}>✕</button>
              )}
              <input type="file" accept="*/*" style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          {/* Observações */}
          <div>
            <label style={{ ...labelStyle, display: "block", marginBottom: 6 }}>
              Observações <span style={{ color: "#475569" }}>(opcional)</span>
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Digite aqui as observações, detalhes ou notas sobre a guia..."
              rows={3}
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: "75px",
                lineHeight: "1.4",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(29,127,229,0.6)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(29,127,229,0.25)")}
            />
          </div>

          {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg py-2.5 text-sm font-medium"
              style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white"
              style={{ background: loading ? "rgba(29,127,229,0.4)" : "#1d7fe5" }}>
              {loading ? "Salvando..." : "Criar guia"}
            </button>
          </div>
        </form>
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

  // Guias state
  const [guias, setGuias] = useState<GuiaTi[]>([]);
  const [guiasLoading, setGuiasLoading] = useState(true);
  const [showGuiaModal, setShowGuiaModal] = useState(false);
  const [deletingGuiaId, setDeletingGuiaId] = useState<string | null>(null);

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

  async function loadGuias() {
    setGuiasLoading(true);
    try {
      const res = await fetch("/api/admin/guias-ti");
      const j = await res.json();
      setGuias(j.data ?? []);
    } finally {
      setGuiasLoading(false);
    }
  }

  useEffect(() => { loadGuias(); }, []);

  async function handleDeleteGuia(id: string) {
    if (!confirm("Remover esta guia?")) return;
    setDeletingGuiaId(id);
    await fetch(`/api/admin/guias-ti/${id}`, { method: "DELETE" });
    setDeletingGuiaId(null);
    loadGuias();
  }

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
                {e.observacoes && (
                  <span
                    style={{
                      fontSize: "11px",
                      opacity: 0.7,
                      marginLeft: "6px",
                    }}
                    title="Possui observações"
                  >
                    💬
                  </span>
                )}
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

      {/* ─── Seção Guias ─────────────────────────────────────── */}
      <div className="mt-10">
        {/* Header Guias */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Guias</h2>
          <button
            onClick={() => setShowGuiaModal(true)}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
            style={{ background: "#1d7fe5", border: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1a6fd0")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#1d7fe5")}
          >
            + Guia
          </button>
        </div>

        {/* Container Guias — sempre visível */}
        <div className="glass-card rounded-2xl p-5" style={{ minHeight: "96px" }}>
          {guiasLoading ? (
            <p className="text-sm" style={{ color: "#64748b" }}>Carregando...</p>
          ) : guias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6">
              <p className="text-sm font-medium" style={{ color: "#64748b" }}>Nenhuma guia cadastrada.</p>
              <p className="text-xs mt-1" style={{ color: "#475569" }}>Clique em &quot;+ Guia&quot; para adicionar.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {guias.map((g) => {
                const fileBadge = getFileBadgeInfo(g);
                return (
                  <div key={g.id} className="group relative flex items-center gap-2 rounded-lg"
                    style={{ background: "rgba(29,127,229,0.08)", border: "1px solid rgba(29,127,229,0.2)", padding: "8px 14px" }}>
                    {/* Badge do tipo de arquivo / link */}
                    {fileBadge ? (
                      <span
                        className="flex items-center gap-1 text-[10px] font-bold rounded px-1.5 py-0.5"
                        style={{
                          background: fileBadge.bg,
                          color: fileBadge.color,
                          border: `1px solid ${fileBadge.border}`,
                          letterSpacing: "0.5px",
                        }}
                        title={g.fileName ? `Arquivo: ${g.fileName}` : fileBadge.label}
                      >
                        <span style={{ fontSize: "11px" }}>{fileBadge.icon}</span>
                        {fileBadge.label}
                      </span>
                    ) : (
                      <span className="text-sm" style={{ color: "#94a3b8" }} title="Nota sem arquivo">
                        📝
                      </span>
                    )}

                    {/* Nome clicável ou estático com título */}
                    {g.fileUrl ? (
                      <a href={g.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-medium text-white hover:text-[#4da3ff] transition-colors"
                        title={g.observacoes ? `Observações:\n${g.observacoes}` : undefined}>
                        {g.nome}
                      </a>
                    ) : (
                      <span className="text-sm font-medium text-white"
                        title={g.observacoes ? `Observações:\n${g.observacoes}` : undefined}>
                        {g.nome}
                      </span>
                    )}

                    {/* Ícone de nota se houver observações */}
                    {g.observacoes && (
                      <span title={g.observacoes} style={{ cursor: "help", fontSize: "11px", color: "#e2e8f0", opacity: 0.75 }}>
                        💬
                      </span>
                    )}
                  {/* Tags novas (roxo) */}
                  {g.tags?.map((tag) => (
                    <span key={tag.id} className="text-[10px] font-mono rounded px-1.5 py-0.5"
                      style={{ background: "rgba(139,92,246,0.18)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }}>
                      {tag.nome}
                    </span>
                  ))}
                  {/* Módulo legado (cinza) */}
                  {(!g.tags || g.tags.length === 0) && g.modulo && (
                    <span className="text-[10px] font-mono rounded px-1.5 py-0.5"
                      style={{ background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}>
                      {g.modulo}
                    </span>
                  )}
                  {/* Botão remover */}
                  <button
                    onClick={() => handleDeleteGuia(g.id)}
                    disabled={deletingGuiaId === g.id}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    style={{ color: "#f87171" }}
                    title="Remover"
                  >
                    {deletingGuiaId === g.id ? "…" : "✕"}
                  </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal nova guia */}
      {showGuiaModal && (
        <GuiaModal
          onClose={() => setShowGuiaModal(false)}
          onSaved={loadGuias}
        />
      )}
    </>
  );
}
