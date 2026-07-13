"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ConfirmModal } from "@/components/confirm-modal";

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

interface Anexo {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

interface Observacao {
  id: string;
  texto: string;
  authorEmail: string;
  editedAt: string | null;
  createdAt: string;
  anexos: Anexo[];
}

const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AnexoPreview({ anexo, canDelete, onDelete }: { anexo: Anexo; canDelete: boolean; onDelete: () => void }) {
  const url = `/api/admin/alterdata/observacoes/anexos/${anexo.id}`;
  const isImage = anexo.mimeType.startsWith("image/");
  const isVideo = anexo.mimeType.startsWith("video/");
  const isAudio = anexo.mimeType.startsWith("audio/");

  if (isImage) {
    return (
      <div className="relative group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={anexo.fileName}
          className="rounded-lg object-cover cursor-pointer"
          style={{ height: "80px", maxWidth: "120px", border: "1px solid rgba(255,255,255,0.08)" }}
          onClick={() => window.open(url, "_blank")}
        />
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="absolute top-1 right-1 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(239,68,68,0.8)" }}
            title="Excluir anexo"
          >
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="relative group" style={{ maxWidth: "240px" }}>
        <video
          src={url}
          controls
          className="rounded-lg"
          style={{ maxHeight: "120px", border: "1px solid rgba(255,255,255,0.08)" }}
        />
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="absolute top-1 right-1 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(239,68,68,0.8)" }}
            title="Excluir anexo"
          >
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className="relative group" style={{ maxWidth: "260px" }}>
        <audio
          src={url}
          controls
          className="rounded-lg w-full"
          style={{ height: "40px" }}
        />
        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--onity-dark-text-muted)" }}>
          {anexo.fileName}
        </p>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="absolute top-1 right-1 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(239,68,68,0.8)" }}
            title="Excluir anexo"
          >
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  // Documento genérico
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
      style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
    >
      <svg className="w-4 h-4 shrink-0" style={{ color: "#60a5fa" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      <div className="min-w-0">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs text-blue-400 hover:text-blue-300 truncate transition-colors"
          style={{ maxWidth: "140px" }}
        >
          {anexo.fileName}
        </a>
        <span className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
          {formatBytes(anexo.fileSize)}
        </span>
      </div>
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 text-red-400/50 hover:text-red-400 transition-colors ml-1"
          title="Excluir anexo"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
}

interface Props {
  clienteId: string;
  currentEmail: string;
  onDirtyChange?: (dirty: boolean) => void;
}

export function AlterdataObservacoesList({ clienteId, currentEmail, onDirtyChange }: Props) {
  const [obs, setObs] = useState<Observacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoTexto, setNovoTexto] = useState("");
  const [novoArquivos, setNovoArquivos] = useState<File[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<{ acao: () => void; mensagem: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [textoEdicao, setTextoEdicao] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // Notifica o pai quando há texto ou arquivos não salvos (dirty)
  useEffect(() => {
    onDirtyChange?.(novoTexto.trim() !== "" || novoArquivos.length > 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novoTexto, novoArquivos]);

  // Ao desmontar, garante que o pai saiba que não há mais dirty
  useEffect(() => {
    return () => { onDirtyChange?.(false); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const carregar = useCallback(async () => {
    const res = await fetch(`/api/admin/alterdata/clientes/${clienteId}/observacoes`);
    const data = await res.json();
    setObs(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [clienteId]);

  useEffect(() => { carregar(); }, [carregar]);

  function addFiles(files: FileList | null) {
    if (!files) return;
    setNovoArquivos((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const novos = Array.from(files).filter((f) => !existingNames.has(f.name));
      return [...prev, ...novos];
    });
  }

  function removeFile(name: string) {
    setNovoArquivos((prev) => prev.filter((f) => f.name !== name));
  }

  async function adicionar() {
    if (!novoTexto.trim() && novoArquivos.length === 0) return;
    setSalvando(true);
    const fd = new FormData();
    fd.append("texto", novoTexto);
    novoArquivos.forEach((f) => fd.append("file", f));
    const res = await fetch(`/api/admin/alterdata/clientes/${clienteId}/observacoes`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Erro ao salvar." }));
      alert(err.message ?? "Erro ao salvar.");
    } else {
      setNovoTexto("");
      setNovoArquivos([]);
      await carregar();
    }
    setSalvando(false);
  }

  async function excluir(id: string) {
    setExcluindoId(id);
    await fetch(`/api/admin/alterdata/observacoes/${id}`, { method: "DELETE" });
    await carregar();
    setExcluindoId(null);
  }

  async function excluirAnexo(anexoId: string) {
    await fetch(`/api/admin/alterdata/observacoes/anexos/${anexoId}`, { method: "DELETE" });
    await carregar();
  }

  function iniciarEdicao(o: Observacao) {
    setEditandoId(o.id);
    setTextoEdicao(o.texto);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setTextoEdicao("");
  }

  async function salvarEdicao(id: string) {
    if (!textoEdicao.trim()) return;
    setSalvandoEdicao(true);
    const res = await fetch(`/api/admin/alterdata/observacoes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: textoEdicao }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Erro ao salvar." }));
      alert(err.message ?? "Erro ao salvar.");
    } else {
      setEditandoId(null);
      setTextoEdicao("");
      await carregar();
    }
    setSalvandoEdicao(false);
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

        {/* Arquivos selecionados */}
        {novoArquivos.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {novoArquivos.map((f) => (
              <div
                key={f.name}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs"
                style={{ border: "1px solid rgba(59,130,246,0.25)", background: "rgba(59,130,246,0.08)", color: "#93c5fd" }}
              >
                <span className="max-w-[120px] truncate">{f.name}</span>
                <span className="text-white/30">({formatBytes(f.size)})</span>
                <button
                  type="button"
                  onClick={() => removeFile(f.name)}
                  className="text-white/40 hover:text-red-400 transition-colors ml-0.5"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: "rgba(139,92,246,0.3)", color: "#a78bfa" }}
          >
            📎 Anexar
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
            onClick={(e) => { (e.currentTarget as HTMLInputElement).value = ""; }}
          />
          <button
            type="button"
            onClick={adicionar}
            disabled={salvando || (!novoTexto.trim() && novoArquivos.length === 0)}
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
              {editandoId === o.id ? (
                <div className="space-y-2">
                  <AutoResizeTextarea
                    className="ds-input w-full text-sm"
                    value={textoEdicao}
                    onChange={setTextoEdicao}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) salvarEdicao(o.id);
                      if (e.key === "Escape") cancelarEdicao();
                    }}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelarEdicao}
                      className="text-xs px-3 py-1.5 rounded-lg link-muted"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => salvarEdicao(o.id)}
                      disabled={salvandoEdicao || !textoEdicao.trim()}
                      className="text-xs px-3 py-1.5 rounded-lg border border-blue-500/30 text-blue-400 hover:text-blue-300 hover:border-blue-400/50 transition-colors disabled:opacity-40"
                    >
                      {salvandoEdicao ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  {o.texto && (
                    <p className="flex-1 text-sm text-white/85 whitespace-pre-wrap break-words">{o.texto}</p>
                  )}
                  {o.authorEmail === currentEmail && (
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      <button
                        type="button"
                        onClick={() => iniciarEdicao(o)}
                        className="text-white/40 hover:text-white transition-colors"
                        title="Editar observação"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmar({ acao: () => excluir(o.id), mensagem: "Excluir esta observação?" })}
                        disabled={excluindoId === o.id}
                        className="text-red-400/50 hover:text-red-400 transition-colors disabled:opacity-40"
                        title="Excluir observação"
                      >
                        {excluindoId === o.id ? (
                          <span className="text-xs">...</span>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Anexos da observação */}
              {o.anexos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {o.anexos.map((a) => (
                    <AnexoPreview
                      key={a.id}
                      anexo={a}
                      canDelete={o.authorEmail === currentEmail}
                      onDelete={() => setConfirmar({
                        acao: () => excluirAnexo(a.id),
                        mensagem: `Excluir o arquivo "${a.fileName}"?`,
                      })}
                    />
                  ))}
                </div>
              )}

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

      {confirmar && (
        <ConfirmModal
          mensagem={confirmar.mensagem}
          onConfirm={() => { confirmar.acao(); setConfirmar(null); }}
          onCancel={() => setConfirmar(null)}
        />
      )}
    </div>
  );
}
