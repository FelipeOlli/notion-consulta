"use client";

import { useState, useEffect, useCallback } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function MinhaContaModal({ open, onClose }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClose = useCallback(() => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(handleClose, 1500);
    return () => clearTimeout(timer);
  }, [success, handleClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("A confirmação da nova senha não confere.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Erro ao atualizar senha.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{ background: "var(--onity-dark-surface)", border: "1px solid rgba(59,130,246,0.2)" }}
      >
        <h2 className="text-base font-semibold text-white">Troca de Senha</h2>

        {success ? (
          <p className="text-sm text-green-400">Senha atualizada com sucesso!</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="current-password" className="block text-xs mb-1.5" style={{ color: "var(--onity-dark-text-muted)" }}>
                Senha atual
              </label>
              <input
                id="current-password"
                type="password"
                className="ds-input w-full text-sm"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div>
              <label htmlFor="new-password" className="block text-xs mb-1.5" style={{ color: "var(--onity-dark-text-muted)" }}>
                Nova senha
              </label>
              <input
                id="new-password"
                type="password"
                className="ds-input w-full text-sm"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-xs mb-1.5" style={{ color: "var(--onity-dark-text-muted)" }}>
                Confirmar nova senha
              </label>
              <input
                id="confirm-password"
                type="password"
                className="ds-input w-full text-sm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg px-4 py-2 text-sm font-medium transition text-[#6b8aaa] hover:text-white"
                style={{ background: "rgba(8,15,26,0.5)", border: "1px solid rgba(29,127,229,0.15)" }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary text-sm px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {loading ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
