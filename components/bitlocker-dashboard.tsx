"use client";

import { useState, useCallback } from "react";
import type { BitLockerEntry } from "@prisma/client";
import { ConfirmModal } from "@/components/confirm-modal";

interface ModalState {
  nomeDispositivo: string;
  deviceId: string;
  codigoBitLocker: string;
}

const EMPTY_MODAL: ModalState = {
  nomeDispositivo: "",
  deviceId: "",
  codigoBitLocker: "",
};

interface Props {
  initialEntries: BitLockerEntry[];
}

export function BitLockerDashboard({ initialEntries }: Props) {
  const [entries, setEntries] = useState<BitLockerEntry[]>(initialEntries);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BitLockerEntry | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const abrirModal = () => {
    setErro(null);
    setModal({ ...EMPTY_MODAL });
  };

  const fecharModal = () => {
    setModal(null);
    setErro(null);
  };

  const salvar = useCallback(async () => {
    if (!modal) return;
    if (!modal.nomeDispositivo.trim() || !modal.deviceId.trim() || !modal.codigoBitLocker.trim()) {
      setErro("Todos os campos são obrigatórios.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/seguranca/bitlocker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modal),
      });
      if (!res.ok) {
        const data = await res.json();
        setErro(data.message ?? "Erro ao salvar.");
        return;
      }
      const novo: BitLockerEntry = await res.json();
      setEntries((prev) => [novo, ...prev]);
      fecharModal();
    } catch {
      setErro("Erro de conexão.");
    } finally {
      setSalvando(false);
    }
  }, [modal]);

  const excluir = useCallback(async (entry: BitLockerEntry) => {
    setExcluindo(entry.id);
    try {
      await fetch(`/api/admin/seguranca/bitlocker/${entry.id}`, { method: "DELETE" });
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    } finally {
      setExcluindo(null);
      setConfirmDelete(null);
    }
  }, []);

  const copiar = (texto: string, id: string) => {
    navigator.clipboard.writeText(texto).catch(() => {});
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

  return (
    <div>
      {/* Header row */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">BitLocker</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--onity-dark-text-muted)" }}>
            Códigos de recuperação BitLocker dos dispositivos da empresa.
          </p>
        </div>
        <button
          onClick={abrirModal}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all active:scale-95"
          style={{ background: "rgba(29,127,229,0.18)", border: "1px solid rgba(29,127,229,0.35)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(29,127,229,0.28)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(29,127,229,0.18)")}
        >
          <span className="text-base leading-none">+</span>
          BitLocker
        </button>
      </div>

      {/* Lista */}
      {entries.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ border: "1px dashed rgba(29,127,229,0.2)", background: "rgba(8,15,26,0.4)" }}
        >
          <p className="text-base" style={{ color: "var(--onity-dark-text-muted)" }}>
            Nenhum registro BitLocker cadastrado.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <article
              key={entry.id}
              className="glass-card rounded-2xl p-5"
              style={{ border: "1px solid rgba(29,127,229,0.12)" }}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{
                        background: "rgba(29,127,229,0.12)",
                        color: "#1d7fe5",
                        border: "1px solid rgba(29,127,229,0.2)",
                      }}
                    >
                      💻 {entry.nomeDispositivo}
                    </span>
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        color: "var(--onity-dark-text-muted)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      ID: {entry.deviceId}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <code
                      className="rounded-lg px-3 py-1.5 text-sm font-mono tracking-widest"
                      style={{
                        background: "rgba(8,15,26,0.6)",
                        border: "1px solid rgba(29,127,229,0.15)",
                        color: "#4da3ff",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {entry.codigoBitLocker}
                    </code>
                    <button
                      onClick={() => copiar(entry.codigoBitLocker, entry.id)}
                      className="text-xs font-medium transition-colors px-2 py-1 rounded"
                      style={{
                        color: copiadoId === entry.id ? "#34d399" : "var(--onity-dark-text-muted)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {copiadoId === entry.id ? "✓ Copiado" : "Copiar"}
                    </button>
                  </div>

                  <p className="mt-2 text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
                    Adicionado em {fmt.format(new Date(entry.createdAt))}
                  </p>
                </div>

                <button
                  onClick={() => setConfirmDelete(entry)}
                  disabled={excluindo === entry.id}
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "#f87171",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.18)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                >
                  {excluindo === entry.id ? "Removendo..." : "Remover"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal de adição */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) fecharModal(); }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-7"
            style={{
              background: "rgba(8,15,26,0.95)",
              border: "1px solid rgba(29,127,229,0.2)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            }}
          >
            <div className="mb-5">
              <p className="section-label">Segurança</p>
              <h3 className="mt-1 text-lg font-bold text-white">Novo registro BitLocker</h3>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--onity-dark-text-muted)" }}>
                  Nome do dispositivo
                </label>
                <input
                  className="ds-input w-full"
                  placeholder="Ex.: NOTEBOOK-CF-001"
                  value={modal.nomeDispositivo}
                  onChange={(e) => setModal((m) => m && { ...m, nomeDispositivo: e.target.value })}
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--onity-dark-text-muted)" }}>
                  ID do dispositivo
                </label>
                <input
                  className="ds-input w-full"
                  placeholder="Ex.: A1B2C3D4-E5F6-..."
                  value={modal.deviceId}
                  onChange={(e) => setModal((m) => m && { ...m, deviceId: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--onity-dark-text-muted)" }}>
                  Código de recuperação BitLocker
                </label>
                <input
                  className="ds-input w-full font-mono tracking-wider"
                  placeholder="000000-000000-000000-..."
                  value={modal.codigoBitLocker}
                  onChange={(e) => setModal((m) => m && { ...m, codigoBitLocker: e.target.value })}
                />
              </div>

              {erro && (
                <p className="rounded-lg px-3 py-2 text-sm text-red-400" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {erro}
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={fecharModal}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{ color: "var(--onity-dark-text-muted)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition-all active:scale-95"
                style={{ background: salvando ? "rgba(29,127,229,0.4)" : "#1d7fe5" }}
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <ConfirmModal
          mensagem={`Remover "${confirmDelete.nomeDispositivo}"?`}
          detalhe="Esta ação não pode ser desfeita."
          onConfirm={() => excluir(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
