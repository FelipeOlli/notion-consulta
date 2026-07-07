"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { IungoRamal, IungoStatus } from "@prisma/client";
import { ConfirmModal } from "@/components/confirm-modal";

const EMPTY_FORM = {
  ramal: "",
  status: "ATIVO" as IungoStatus,
  login: "",
  senha: "",
  numero: "",
  funcionarios: [] as string[],
};

type Form = typeof EMPTY_FORM;

export function IungoDashboard({ isMaster }: { isMaster: boolean }) {
  const [ramais, setRamais] = useState<IungoRamal[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<IungoStatus | "TODOS">("TODOS");
  const [filtroVinculo, setFiltroVinculo] = useState<"TODOS" | "LIVRES" | "OCUPADOS">("TODOS");
  const [busca, setBusca] = useState("");
  const [sortField, setSortField] = useState<"RAMAL" | "STATUS" | "FUNCIONARIO">("RAMAL");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (field: "RAMAL" | "STATUS" | "FUNCIONARIO") => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // Form (criação / edição)
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<IungoRamal | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const skipAutoSave = useRef(false);

  // Input de funcionário a adicionar
  const [novoFuncionario, setNovoFuncionario] = useState("");

  // Delete
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<IungoRamal | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/iungo/ramais");
      if (res.ok) setRamais(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Auto-save na edição
  useEffect(() => {
    if (!editando) return;
    if (skipAutoSave.current) {
      skipAutoSave.current = false;
      return;
    }
    if (!form.ramal.trim() || !form.login.trim() || !form.senha.trim()) return;

    setAutoSaveStatus("saving");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/iungo/ramais/${editando.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        const atualizado: IungoRamal = await res.json();
        setRamais((prev) => prev.map((r) => (r.id === atualizado.id ? atualizado : r)));
        setEditando(atualizado);
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 2000);
      } catch {
        setAutoSaveStatus("error");
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [form, editando]);

  const abrirNovo = () => {
    setEditando(null);
    setForm(EMPTY_FORM);
    setNovoFuncionario("");
    setErro(null);
    setFormAberto(true);
  };

  const abrirEdicao = (ramal: IungoRamal) => {
    skipAutoSave.current = true;
    setEditando(ramal);
    setForm({
      ramal: ramal.ramal,
      status: ramal.status,
      login: ramal.login,
      senha: ramal.senha,
      numero: ramal.numero ?? "",
      funcionarios: ramal.funcionarios as string[],
    });
    setNovoFuncionario("");
    setErro(null);
    setAutoSaveStatus("idle");
    setFormAberto(true);
  };

  const fecharForm = () => {
    setFormAberto(false);
    setEditando(null);
    setForm(EMPTY_FORM);
    setNovoFuncionario("");
    setErro(null);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ramal.trim() || !form.login.trim() || !form.senha.trim()) {
      setErro("Ramal, login e senha são obrigatórios.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/iungo/ramais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Erro ao criar ramal.");
      }
      const novo: IungoRamal = await res.json();
      setRamais((prev) => [...prev, novo].sort((a, b) => a.ramal.localeCompare(b.ramal)));
      fecharForm();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar ramal.");
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (id: string) => {
    setExcluindo(id);
    try {
      await fetch(`/api/admin/iungo/ramais/${id}`, { method: "DELETE" });
      setRamais((prev) => prev.filter((r) => r.id !== id));
      if (editando?.id === id) fecharForm();
    } finally {
      setExcluindo(null);
      setConfirmar(null);
    }
  };

  const adicionarFuncionario = () => {
    const nome = novoFuncionario.trim();
    if (!nome || form.funcionarios.includes(nome)) return;
    setForm((f) => ({ ...f, funcionarios: [...f.funcionarios, nome] }));
    setNovoFuncionario("");
  };

  const removerFuncionario = (nome: string) => {
    setForm((f) => ({ ...f, funcionarios: f.funcionarios.filter((n) => n !== nome) }));
  };

  // Filtros aplicados
  const ramaisfiltrados = ramais.filter((r) => {
    if (filtroStatus !== "TODOS" && r.status !== filtroStatus) return false;
    const nFuncionarios = (r.funcionarios as string[]).length;
    if (filtroVinculo === "LIVRES" && nFuncionarios > 0) return false;
    if (filtroVinculo === "OCUPADOS" && nFuncionarios === 0) return false;
    if (busca) {
      const q = busca.toLowerCase();
      const funcionariosStr = (r.funcionarios as string[]).join(" ").toLowerCase();
      if (
        !r.ramal.toLowerCase().includes(q) &&
        !r.login.toLowerCase().includes(q) &&
        !(r.numero ?? "").toLowerCase().includes(q) &&
        !funcionariosStr.includes(q)
      )
        return false;
    }
    return true;
  }).sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortField === "STATUS") {
      if (a.status !== b.status) return (a.status === "ATIVO" ? -1 : 1) * dir;
      return a.ramal.localeCompare(b.ramal, undefined, { numeric: true });
    }
    if (sortField === "FUNCIONARIO") {
      const fa = (a.funcionarios as string[])[0] ?? "";
      const fb = (b.funcionarios as string[])[0] ?? "";
      // Sem funcionário sempre ao final, independente da direção
      if (!fa && !fb) return a.ramal.localeCompare(b.ramal, undefined, { numeric: true });
      if (!fa) return 1;
      if (!fb) return -1;
      return fa.localeCompare(fb, "pt-BR") * dir;
    }
    // RAMAL (default)
    return a.ramal.localeCompare(b.ramal, undefined, { numeric: true }) * dir;
  });

  return (
    <div className="space-y-6">
      {/* Barra de controles */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar ramal, login, número ou funcionário…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="ds-input w-full max-w-xs"
        />

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as IungoStatus | "TODOS")}
          className="ds-input"
        >
          <option value="TODOS">Todos os status</option>
          <option value="ATIVO">Ativo</option>
          <option value="INATIVO">Inativo</option>
        </select>

        <select
          value={filtroVinculo}
          onChange={(e) => setFiltroVinculo(e.target.value as "TODOS" | "LIVRES" | "OCUPADOS")}
          className="ds-input"
        >
          <option value="TODOS">Todos os ramais</option>
          <option value="LIVRES">Livres (sem funcionário)</option>
          <option value="OCUPADOS">Ocupados</option>
        </select>

        <button
          onClick={formAberto && !editando ? fecharForm : abrirNovo}
          className="btn-primary ml-auto"
        >
          {formAberto && !editando ? "Cancelar" : "+ Novo ramal"}
        </button>
      </div>

      {/* Formulário de criação / edição */}
      {formAberto && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">
              {editando ? `Editar ramal ${editando.ramal}` : "Novo ramal"}
            </h2>
            {editando && (
              <div className="text-xs">
                {autoSaveStatus === "saving" && (
                  <span style={{ color: "var(--onity-dark-text-muted)" }}>Salvando…</span>
                )}
                {autoSaveStatus === "saved" && (
                  <span className="text-emerald-400">✓ Salvo</span>
                )}
                {autoSaveStatus === "error" && (
                  <span className="text-red-400">Erro ao salvar</span>
                )}
              </div>
            )}
          </div>

          <form onSubmit={editando ? (e) => e.preventDefault() : salvar} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--onity-dark-text-muted)" }}>
                  Ramal *
                </label>
                <input
                  className="ds-input w-full"
                  value={form.ramal}
                  onChange={(e) => setForm((f) => ({ ...f, ramal: e.target.value }))}
                  placeholder="201"
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--onity-dark-text-muted)" }}>
                  Status
                </label>
                <select
                  className="ds-input w-full"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as IungoStatus }))}
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--onity-dark-text-muted)" }}>
                  Número
                </label>
                <input
                  className="ds-input w-full"
                  value={form.numero}
                  onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
                  placeholder="(21) 2038-3351"
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--onity-dark-text-muted)" }}>
                  Login *
                </label>
                <input
                  className="ds-input w-full"
                  value={form.login}
                  onChange={(e) => setForm((f) => ({ ...f, login: e.target.value }))}
                  placeholder="cfrj.mobi.201"
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--onity-dark-text-muted)" }}>
                  Senha *
                </label>
                <input
                  className="ds-input w-full"
                  value={form.senha}
                  onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                  placeholder="Iungo@2024"
                />
              </div>
            </div>

            {/* Funcionários */}
            <div>
              <label className="block text-xs mb-2" style={{ color: "var(--onity-dark-text-muted)" }}>
                Funcionários
              </label>
              <div className="flex gap-2">
                <input
                  className="ds-input flex-1"
                  value={novoFuncionario}
                  onChange={(e) => setNovoFuncionario(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionarFuncionario(); } }}
                  placeholder="Nome do funcionário"
                />
                <button
                  type="button"
                  onClick={adicionarFuncionario}
                  className="btn-primary px-3 py-1.5 text-sm"
                >
                  Adicionar
                </button>
              </div>
              {form.funcionarios.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.funcionarios.map((nome) => (
                    <span
                      key={nome}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white"
                      style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)" }}
                    >
                      {nome}
                      <button
                        type="button"
                        onClick={() => removerFuncionario(nome)}
                        className="ml-1 opacity-70 hover:opacity-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {erro && <p className="text-red-400 text-sm">{erro}</p>}

            <div className="flex gap-3">
              {!editando && (
                <button type="submit" disabled={salvando} className="btn-primary">
                  {salvando ? "Criando…" : "Criar ramal"}
                </button>
              )}
              <button type="button" onClick={fecharForm} className="link-muted text-sm">
                {editando ? "Fechar" : "Cancelar"}
              </button>
              {editando && isMaster && (
                <button
                  type="button"
                  onClick={() => setConfirmar(editando)}
                  className="ml-auto text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  Excluir ramal
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Tabela */}
      <div className="glass-card rounded-2xl overflow-x-auto">
        {loading ? (
          <p className="p-6 text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Carregando…
          </p>
        ) : ramaisfiltrados.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Nenhum ramal encontrado.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b"
                style={{ borderColor: "rgba(148,163,184,0.15)", color: "var(--onity-dark-text-muted)" }}
              >
                {(
                  [
                    { field: "RAMAL", label: "Ramal" },
                    { field: "STATUS", label: "Status" },
                  ] as const
                ).map(({ field, label }) => {
                  const active = sortField === field;
                  return (
                    <th key={field} className="px-4 py-3 text-left font-medium">
                      <button
                        onClick={() => toggleSort(field)}
                        className="inline-flex items-center gap-1 hover:text-white transition-colors"
                        style={{ color: active ? "#fff" : "var(--onity-dark-text-muted)" }}
                      >
                        {label}
                        <span className="text-[10px] opacity-60">
                          {active ? (sortDir === "asc" ? "▲" : "▼") : "⇕"}
                        </span>
                      </button>
                    </th>
                  );
                })}
                <th className="px-4 py-3 text-left font-medium">Login</th>
                <th className="px-4 py-3 text-left font-medium">Senha</th>
                <th className="px-4 py-3 text-left font-medium">Número</th>
                <th className="px-4 py-3 text-left font-medium">
                  {(() => {
                    const active = sortField === "FUNCIONARIO";
                    return (
                      <button
                        onClick={() => toggleSort("FUNCIONARIO")}
                        className="inline-flex items-center gap-1 hover:text-white transition-colors"
                        style={{ color: active ? "#fff" : "var(--onity-dark-text-muted)" }}
                      >
                        Funcionários
                        <span className="text-[10px] opacity-60">
                          {active ? (sortDir === "asc" ? "▲" : "▼") : "⇕"}
                        </span>
                      </button>
                    );
                  })()}
                </th>
                <th className="px-4 py-3 text-left font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {ramaisfiltrados.map((r) => (
                <tr
                  key={r.id}
                  className="border-b transition-colors"
                  style={{ borderColor: "rgba(148,163,184,0.08)" }}
                >
                  <td className="px-4 py-3 font-mono font-semibold text-white">{r.ramal}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={
                        r.status === "ATIVO"
                          ? { background: "rgba(34,197,94,0.15)", color: "#4ade80" }
                          : { background: "rgba(239,68,68,0.15)", color: "#f87171" }
                      }
                    >
                      {r.status === "ATIVO" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
                    {r.login}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
                    {r.senha}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
                    {r.numero ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(r.funcionarios as string[]).length === 0 ? (
                        <span style={{ color: "var(--onity-dark-text-muted)" }}>—</span>
                      ) : (
                        (r.funcionarios as string[]).map((nome) => (
                          <span
                            key={nome}
                            className="inline-block rounded-full px-2 py-0.5 text-xs text-white"
                            style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.35)" }}
                          >
                            {nome}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => (formAberto && editando?.id === r.id ? fecharForm() : abrirEdicao(r))}
                      className="link-accent text-xs"
                    >
                      {formAberto && editando?.id === r.id ? "Fechar" : "Editar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmar && (
        <ConfirmModal
          mensagem={`Excluir ramal ${confirmar.ramal}?`}
          detalhe="Essa ação não pode ser desfeita."
          onConfirm={() => excluir(confirmar.id)}
          onCancel={() => setConfirmar(null)}
        />
      )}
    </div>
  );
}
