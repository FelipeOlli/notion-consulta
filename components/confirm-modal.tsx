"use client";

import { useEffect } from "react";

interface Props {
  mensagem: string;
  detalhe?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ mensagem, detalhe, onConfirm, onCancel }: Props) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="glass-panel w-full max-w-sm rounded-2xl p-6 space-y-4">
        <p className="text-sm font-semibold text-white">{mensagem}</p>
        {detalhe && (
          <p className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>{detalhe}</p>
        )}
        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="link-muted text-sm px-4 py-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="text-sm px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 hover:border-red-400/50 transition-colors"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
