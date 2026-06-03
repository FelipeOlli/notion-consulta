"use client";

import { useState, useEffect, useCallback } from "react";

interface Contador {
  id: string;
  login: string;
  senha: string;
}

interface Props {
  clienteId: string;
}

export function AlterdataContadoresList({ clienteId }: Props) {
  const [contadores, setContadores] = useState<Contador[]>([]);
  const [loading, setLoading] = useState(true);
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [visiveis, setVisiveis] = useState<Record<string, boolean>>({});
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const res = await fetch(`/api/admin/alterdata/clientes/${clienteId}/contadores`);
    const data = await res.json();
    setContadores(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [clienteId]);

  useEffect(() => { carregar(); }, [carregar]);

  async function adicionar() {
    if (!login.trim() || !senha.trim()) return;
    setSalvando(true);
    await fetch(`/api/admin/alterdata/clientes/${clienteId}/contadores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, senha }),
    });
    setLogin("");
    setSenha("");
    await carregar();
    setSalvando(false);
  }

  async function excluir(id: string) {
    setExcluindo(id);
    await fetch(`/api/admin/alterdata/contadores/${id}`, { method: "DELETE" });
    await carregar();
    setExcluindo(null);
  }

  async function copiar(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiado(id);
    setTimeout(() => setCopiado(null), 1500);
  }

  function toggleVisivel(id: string) {
    setVisiveis((v) => ({ ...v, [id]: !v[id] }));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-white/80">Contador</p>

      {/* Form adicionar */}
      <div className="grid grid-cols-2 gap-2">
        <input
          className="ds-input text-sm"
          placeholder="Login"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
        />
        <input
          className="ds-input text-sm"
          placeholder="Senha"
          type="text"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <button
          onClick={adicionar}
          disabled={salvando || !login.trim() || !senha.trim()}
          className="text-xs px-3 py-1.5 rounded-lg border border-blue-500/30 text-blue-400 hover:text-blue-300 hover:border-blue-400/50 transition-colors disabled:opacity-40"
        >
          {salvando ? "Salvando..." : "+ Adicionar"}
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>Carregando...</p>
      ) : contadores.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>Nenhum contador cadastrado.</p>
      ) : (
        <div className="space-y-1.5">
          {contadores.map((c) => (
            <div key={c.id} className="glass-card flex items-center gap-2 px-3 py-2 rounded-xl">
              <div className="flex-1 min-w-0 grid grid-cols-2 gap-2 text-sm">
                <div className="min-w-0">
                  <span className="text-xs block mb-0.5" style={{ color: "var(--onity-dark-text-muted)" }}>Login</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/80 truncate text-xs font-mono">{c.login}</span>
                    <button
                      onClick={() => copiar(c.login, `login-${c.id}`)}
                      className="text-white/30 hover:text-white/70 transition-colors shrink-0"
                      title="Copiar login"
                    >
                      {copiado === `login-${c.id}` ? (
                        <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="min-w-0">
                  <span className="text-xs block mb-0.5" style={{ color: "var(--onity-dark-text-muted)" }}>Senha</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/80 text-xs font-mono truncate">
                      {visiveis[c.id] ? c.senha : "••••••••"}
                    </span>
                    <button
                      onClick={() => toggleVisivel(c.id)}
                      className="text-white/30 hover:text-white/70 transition-colors shrink-0"
                      title={visiveis[c.id] ? "Ocultar" : "Mostrar"}
                    >
                      {visiveis[c.id] ? (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                    <button
                      onClick={() => copiar(c.senha, `senha-${c.id}`)}
                      className="text-white/30 hover:text-white/70 transition-colors shrink-0"
                      title="Copiar senha"
                    >
                      {copiado === `senha-${c.id}` ? (
                        <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => excluir(c.id)}
                disabled={excluindo === c.id}
                className="text-red-400/60 hover:text-red-400 transition-colors shrink-0 disabled:opacity-40"
                title="Excluir"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
