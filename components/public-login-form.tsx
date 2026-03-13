"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function PublicLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.message || "Nao foi possivel entrar.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Falha de conexao. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-100">E-mail</label>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
          className="h-11 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-slate-300"
          placeholder="seu-email@dominio.com"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-100">Senha</label>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          required
          className="h-11 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-slate-300"
          placeholder="Sua senha"
        />
      </div>
      {error ? <p className="text-sm font-medium text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-50 px-4 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Entrando..." : "Entrar e ver links"}
      </button>
    </form>
  );
}

