"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function PublicLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errorIsWait, setErrorIsWait] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setErrorIsWait(false);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setErrorIsWait(response.status === 503);
        setError(payload?.message || "Nao foi possivel entrar.");
        return;
      }

      if (payload.role === "master") {
        router.push("/admin");
        router.refresh();
        return;
      }

      const modules = Array.isArray(payload?.modules) ? payload.modules : [];
      if (modules.length > 0) {
        router.push("/admin");
        router.refresh();
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
        <label className="mb-1.5 block text-sm font-medium text-white">E-mail</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          className="ds-input"
          placeholder="seu-email@dominio.com"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-white">Senha</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          className="ds-input"
          placeholder="Sua senha"
        />
      </div>
      {error ? (
        <p className="text-sm font-medium" style={{ color: errorIsWait ? "#ffaa00" : "#ff453a" }}>
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
