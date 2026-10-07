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

export type GuiaArquivoItem = {
  id: string;
  guiaId: string;
  fileType: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
};

export type GuiaTi = {
  id: string;
  nome: string;
  modulo: string | null;
  fileType: string;
  fileUrl: string;
  fileName: string | null;
  fileSize: number | null;
  observacoes?: string | null;
  tags: GuiaTag[];
  arquivos?: GuiaArquivoItem[];
  createdAt: string;
};

function getRawFileBadgeInfo(fileType?: string | null, fileName?: string | null, fileUrl?: string | null): { label: string; icon: string; bg: string; color: string; border: string } | null {
  if (!fileUrl && !fileType) return null;

  const type = (fileType || "").toLowerCase();
  const ext = fileName ? fileName.split(".").pop()?.toLowerCase() || "" : "";

  if (type === "pdf" || ext === "pdf") {
    return { label: "PDF", icon: "📄", bg: "rgba(239,68,68,0.14)", color: "#fca5a5", border: "rgba(239,68,68,0.3)" };
  }
  if (type === "mp4" || type === "video" || ["mp4", "mkv", "avi", "mov", "webm"].includes(ext)) {
    return { label: "VÍDEO", icon: "🎬", bg: "rgba(168,85,247,0.14)", color: "#d8b4fe", border: "rgba(168,85,247,0.3)" };
  }
  if (type === "mp3" || type === "audio" || ["mp3", "wav", "ogg", "m4a", "aac"].includes(ext)) {
    return { label: "ÁUDIO", icon: "🎙", bg: "rgba(234,179,8,0.14)", color: "#fde047", border: "rgba(234,179,8,0.3)" };
  }
  if (type === "word" || ["doc", "docx"].includes(ext)) {
    return { label: "WORD", icon: "📝", bg: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "rgba(59,130,246,0.3)" };
  }
  if (type === "excel" || ["xls", "xlsx", "csv"].includes(ext)) {
    return { label: "EXCEL", icon: "📊", bg: "rgba(34,197,94,0.14)", color: "#86efac", border: "rgba(34,197,94,0.3)" };
  }
  if (type === "powerpoint" || ["ppt", "pptx"].includes(ext)) {
    return { label: "PPT", icon: "📑", bg: "rgba(249,115,22,0.14)", color: "#fdba74", border: "rgba(249,115,22,0.3)" };
  }
  if (type === "zip" || ["zip", "rar", "7z"].includes(ext)) {
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
  if (type !== "note" && fileUrl) {
    return { label: "ARQUIVO", icon: "📎", bg: "rgba(100,116,139,0.16)", color: "#cbd5e1", border: "rgba(100,116,139,0.25)" };
  }
  return null;
}

function getFileBadgeInfo(g: GuiaTi): { label: string; icon: string; bg: string; color: string; border: string } | null {
  if (g.arquivos && g.arquivos.length > 1) {
    return { label: `${g.arquivos.length} ARQUIVOS`, icon: "📁", bg: "rgba(99,102,241,0.16)", color: "#a5b4fc", border: "rgba(99,102,241,0.35)" };
  }
  if (g.arquivos && g.arquivos.length === 1) {
    return getRawFileBadgeInfo(g.arquivos[0].fileType, g.arquivos[0].fileName, g.arquivos[0].fileUrl);
  }
  return getRawFileBadgeInfo(g.fileType, g.fileName, g.fileUrl);
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

// ─── GuiaDetailModal (Visualização completa com player de vídeo) ─────────────
function isVideoFile(fileType?: string | null, fileName?: string | null, fileUrl?: string | null): boolean {
  const type = (fileType || "").toLowerCase();
  const name = (fileName || fileUrl || "").toLowerCase();
  const ext = name.split("?")[0].split(".").pop() || "";
  return (
    type === "mp4" ||
    type === "video" ||
    ["mp4", "webm", "ogg", "mov", "mkv"].includes(ext)
  );
}

function isAudioFile(fileType?: string | null, fileName?: string | null, fileUrl?: string | null): boolean {
  const type = (fileType || "").toLowerCase();
  const name = (fileName || fileUrl || "").toLowerCase();
  const ext = name.split("?")[0].split(".").pop() || "";
  return (
    type === "mp3" ||
    type === "audio" ||
    ["mp3", "wav", "ogg", "m4a", "aac"].includes(ext)
  );
}

function GuiaDetailModal({ guia, onClose, onDelete }: {
  guia: GuiaTi;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [activeMediaUrl, setActiveMediaUrl] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lista consolidada de todos os arquivos/mídias anexados
  const fileItems: {
    id: string;
    fileUrl: string;
    fileName: string;
    fileSize: number | null;
    fileType: string;
  }[] = [];

  if (guia.arquivos && guia.arquivos.length > 0) {
    guia.arquivos.forEach((a) => {
      fileItems.push({
        id: a.id,
        fileUrl: a.fileUrl,
        fileName: a.fileName,
        fileSize: a.fileSize,
        fileType: a.fileType,
      });
    });
  } else if (guia.fileUrl && guia.fileType !== "link") {
    fileItems.push({
      id: "legacy",
      fileUrl: guia.fileUrl,
      fileName: guia.fileName || "Arquivo da guia",
      fileSize: guia.fileSize,
      fileType: guia.fileType,
    });
  }

  // Primeiro vídeo padrão para abrir no player
  const firstVideo = fileItems.find((f) => isVideoFile(f.fileType, f.fileName, f.fileUrl));
  const currentVideoUrl = activeMediaUrl || firstVideo?.fileUrl || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", animation: "adBackdropIn 0.2s ease forwards" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "min(720px, 96vw)",
          background: "#0b1220",
          border: "1px solid rgba(29,127,229,0.3)",
          borderRadius: "18px",
          padding: "24px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          animation: "adPanelIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#4da3ff]">
                Guia TI
              </span>
              {guia.tags?.map((tag) => (
                <span
                  key={tag.id}
                  className="text-[10px] font-mono rounded px-1.5 py-0.5"
                  style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.35)" }}
                >
                  {tag.nome}
                </span>
              ))}
              {(!guia.tags || guia.tags.length === 0) && guia.modulo && (
                <span
                  className="text-[10px] font-mono rounded px-1.5 py-0.5"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  {guia.modulo}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white break-words">{guia.nome}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#6b8aaa] hover:text-white transition text-2xl leading-none px-1"
          >
            ×
          </button>
        </div>

        {/* Player de Vídeo em destaque caso haja vídeo */}
        {currentVideoUrl && isVideoFile(null, null, currentVideoUrl) && (
          <div
            className="rounded-xl overflow-hidden border"
            style={{
              background: "#020617",
              borderColor: "rgba(168,85,247,0.35)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
            }}
          >
            <div className="px-3 py-2 flex items-center justify-between text-xs" style={{ background: "rgba(168,85,247,0.12)" }}>
              <span className="font-semibold text-[#d8b4fe] flex items-center gap-1.5">
                <span>🎬</span> Player de Vídeo
              </span>
              <a
                href={currentVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#a78bfa] hover:text-white underline"
              >
                Abrir em nova aba ↗
              </a>
            </div>
            <video
              key={currentVideoUrl}
              controls
              autoPlay={false}
              playsInline
              className="w-full max-h-[380px] bg-black"
              style={{ display: "block" }}
            >
              <source src={currentVideoUrl} />
              Seu navegador não suporta a tag de vídeo.
            </video>
          </div>
        )}

        {/* Scrollable info container */}
        <div className="overflow-y-auto space-y-4 pr-1" style={{ maxHeight: "calc(90vh - 200px)" }}>
          {/* Link externo se houver */}
          {guia.fileUrl && (guia.fileType === "link" || guia.fileUrl.startsWith("http")) && (
            <div
              className="p-3.5 rounded-xl flex items-center justify-between gap-3"
              style={{
                background: "rgba(14,165,233,0.08)",
                border: "1px solid rgba(14,165,233,0.25)",
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#38bdf8] mb-0.5">
                  Link / URL da Guia
                </p>
                <a
                  href={guia.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-white hover:text-[#38bdf8] underline truncate block"
                >
                  {guia.fileUrl}
                </a>
              </div>
              <a
                href={guia.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white shrink-0 transition"
                style={{ background: "#0284c7" }}
              >
                Acessar ↗
              </a>
            </div>
          )}

          {/* Observações / Descrição do passo a passo */}
          {guia.observacoes && (
            <div
              className="p-4 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p className="text-[10px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "#94a3b8" }}>
                Instruções e Observações
              </p>
              <p className="text-sm text-[#e2e8f0] whitespace-pre-wrap leading-relaxed">
                {guia.observacoes}
              </p>
            </div>
          )}

          {/* Anexos / Arquivos */}
          {fileItems.length > 0 && (
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider mb-2 text-[#94a3b8] flex items-center justify-between">
                <span>Anexos ({fileItems.length})</span>
                <span className="text-[10px] normal-case text-[#64748b]">Vídeos abrem no player acima</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {fileItems.map((item) => {
                  const badge = getRawFileBadgeInfo(item.fileType, item.fileName, item.fileUrl);
                  const isVideo = isVideoFile(item.fileType, item.fileName, item.fileUrl);
                  const isAudio = isAudioFile(item.fileType, item.fileName, item.fileUrl);
                  const isPlayingThis = currentVideoUrl === item.fileUrl;

                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl flex items-center justify-between gap-2.5 transition"
                      style={{
                        background: isPlayingThis ? "rgba(168,85,247,0.14)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isPlayingThis ? "rgba(168,85,247,0.45)" : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        {badge && (
                          <span
                            className="text-[10px] font-bold rounded px-1.5 py-0.5 shrink-0"
                            style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                          >
                            {badge.icon} {badge.label}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-white truncate" title={item.fileName}>
                            {item.fileName}
                          </p>
                          {item.fileSize && (
                            <p className="text-[10px] font-mono text-[#64748b]">
                              {(item.fileSize / 1024).toFixed(0)} KB
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isVideo && (
                          <button
                            type="button"
                            onClick={() => setActiveMediaUrl(item.fileUrl)}
                            className="px-2 py-1 rounded text-[11px] font-semibold text-white transition cursor-pointer"
                            style={{
                              background: isPlayingThis ? "rgba(168,85,247,0.6)" : "rgba(168,85,247,0.25)",
                              border: "1px solid rgba(168,85,247,0.4)",
                            }}
                            title="Reproduzir vídeo no player"
                          >
                            ▶ Assistir
                          </button>
                        )}
                        {isAudio && !isVideo && (
                          <a
                            href={item.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded text-[11px] font-semibold text-white transition"
                            style={{
                              background: "rgba(234,179,8,0.2)",
                              border: "1px solid rgba(234,179,8,0.4)",
                              color: "#fde047",
                            }}
                          >
                            Ouvir
                          </a>
                        )}
                        <a
                          href={item.fileUrl}
                          download={item.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded text-[11px] text-[#cbd5e1] hover:text-white transition"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.1)",
                          }}
                          title="Baixar ou abrir em nova aba"
                        >
                          ⬇
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer ações */}
        <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <button
            onClick={onDelete}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer"
            style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
          >
            Excluir Guia
          </button>
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition cursor-pointer"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            Fechar
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
  const [files, setFiles] = useState<File[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nomeRef = useRef<HTMLInputElement>(null);
  const newTagRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleAddFiles(newFileList: FileList | null) {
    if (!newFileList) return;
    const added = Array.from(newFileList);
    setFiles((prev) => [...prev, ...added]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRemoveFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setLoading(true);
    setError("");
    try {
      let res: Response;
      if (files.length > 0) {
        const fd = new FormData();
        fd.append("nome", nome.trim());
        fd.append("tagIds", JSON.stringify(selectedTagIds));
        if (linkUrl.trim()) fd.append("linkUrl", linkUrl.trim());
        if (observacoes.trim()) fd.append("observacoes", observacoes.trim());
        files.forEach((f) => fd.append("files", f));
        res = await fetch("/api/admin/guias-ti", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/admin/guias-ti", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: nome.trim(),
            fileUrl: linkUrl.trim(),
            linkUrl: linkUrl.trim(),
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
        width: "min(520px, 95vw)", background: "#0f172a",
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
            <label style={{ ...labelStyle, display: "block", marginBottom: 6 }}>
              URL <span style={{ color: "#475569" }}>(opcional - link web, Google Drive, doc externo, etc.)</span>
            </label>
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://drive.google.com/…"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(29,127,229,0.6)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(29,127,229,0.25)")}
            />
          </div>

          {/* Arquivos (Múltiplos) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label style={labelStyle}>
                Arquivos <span style={{ color: "#475569" }}>(opcional - quantos quiser: vídeo, áudio, PDF, etc.)</span>
              </label>
              {files.length > 0 && (
                <span className="text-[11px] font-mono" style={{ color: "#4ade80" }}>
                  {files.length} {files.length === 1 ? "arquivo selecionado" : "arquivos selecionados"}
                </span>
              )}
            </div>

            <label
              style={{
                display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", gap: 8,
                background: "rgba(8,15,26,0.8)",
                border: "1px dashed rgba(29,127,229,0.35)",
                borderRadius: "8px", padding: "12px 14px", cursor: "pointer",
                color: "#94a3b8", fontSize: "13px", transition: "border-color 0.2s",
              }}
              onMouseEnter={(el) => (el.currentTarget.style.borderColor = "rgba(29,127,229,0.7)")}
              onMouseLeave={(el) => (el.currentTarget.style.borderColor = "rgba(29,127,229,0.35)")}
            >
              <span style={{ fontSize: 16 }}>📎</span>
              <span>Clique para selecionar ou adicionar mais arquivos…</span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="*/*"
                style={{ display: "none" }}
                onChange={(e) => handleAddFiles(e.target.files)}
              />
            </label>

            {/* Lista de arquivos selecionados */}
            {files.length > 0 && (
              <div className="mt-2.5 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {files.map((f, idx) => (
                  <div
                    key={`${f.name}-${idx}`}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                      <span style={{ fontSize: 13 }}>
                        {f.type.startsWith("video/") ? "🎬" : f.type.startsWith("audio/") ? "🎙️" : f.type === "application/pdf" ? "📄" : "📎"}
                      </span>
                      <span className="truncate text-white font-medium">{f.name}</span>
                      <span className="text-[11px] font-mono shrink-0" style={{ color: "#64748b" }}>
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      style={{ color: "#f87171", fontSize: 13, background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
                      title="Remover arquivo"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
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
  const [detailGuia, setDetailGuia] = useState<GuiaTi | null>(null);
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
    if (detailGuia?.id === id) setDetailGuia(null);
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

                    {/* Clique para abrir modal completo com player e todos os dados */}
                    <button
                      type="button"
                      onClick={() => setDetailGuia(g)}
                      className="text-sm font-medium text-white hover:text-[#4da3ff] transition-colors bg-transparent border-0 p-0 cursor-pointer text-left"
                      title="Clique para ver o guia completo, arquivos e player"
                    >
                      {g.nome}
                    </button>

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

      {/* Modal detalhe da guia (com player de vídeo, anotações, links e múltiplos arquivos) */}
      {detailGuia && (
        <GuiaDetailModal
          guia={detailGuia}
          onClose={() => setDetailGuia(null)}
          onDelete={() => handleDeleteGuia(detailGuia.id)}
        />
      )}

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
