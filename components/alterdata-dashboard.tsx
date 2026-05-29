"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { AlterdataCliente, AlterdataClienteStatus } from "@prisma/client";

const STATUS_LABELS: Record<AlterdataClienteStatus, string> = {
  ATIVO: "Ativo",
  EM_ANDAMENTO: "Em Andamento",
  INATIVO: "Inativo",
  INADIMPLENTE: "Inadimplente",
  CONGELADO: "Congelado",
  DISTRATADO: "Distratado",
};

const STATUS_COLORS: Record<AlterdataClienteStatus, string> = {
  ATIVO: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  EM_ANDAMENTO: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  INATIVO: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  INADIMPLENTE: "bg-red-500/20 text-red-400 border-red-500/30",
  CONGELADO: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  DISTRATADO: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const STATUS_DOT: Record<AlterdataClienteStatus, string> = {
  ATIVO: "bg-emerald-400",
  EM_ANDAMENTO: "bg-yellow-400",
  INATIVO: "bg-slate-400",
  INADIMPLENTE: "bg-red-400",
  CONGELADO: "bg-blue-400",
  DISTRATADO: "bg-orange-400",
};

const CARD_ACCENT: Record<AlterdataClienteStatus, string> = {
  ATIVO: "border-emerald-500/40",
  EM_ANDAMENTO: "border-yellow-500/40",
  INATIVO: "border-slate-500/40",
  INADIMPLENTE: "border-red-500/40",
  CONGELADO: "border-blue-500/40",
  DISTRATADO: "border-orange-500/40",
};

const ALL_STATUS: AlterdataClienteStatus[] = ["ATIVO", "EM_ANDAMENTO", "INATIVO", "INADIMPLENTE", "CONGELADO", "DISTRATADO"];

const EMPTY_FORM = {
  codPessoa: "",
  nome: "",
  unidade: "",
  status: "ATIVO" as AlterdataClienteStatus,
  qtdLicencas: 1,
  qtdUsuarios: 0,
  licencasOciosas: 0,
  acessosFranqueado: 0,
  acessosBackoffice: 0,
  observacao: "",
};

interface Props {
  isMaster: boolean;
}

export function AlterdataDashboard({ isMaster }: Props) {
  const [clientes, setClientes] = useState<AlterdataCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<AlterdataClienteStatus | "TODOS">("TODOS");
  const [busca, setBusca] = useState("");

  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<AlterdataCliente | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [importAberto, setImportAberto] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [importResultado, setImportResultado] = useState<{ inserted: number; updated: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [excluindo, setExcluindo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/alterdata/clientes");
    const data = await res.json();
    setClientes(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const contagens = ALL_STATUS.reduce<Record<AlterdataClienteStatus, number>>((acc, s) => {
    acc[s] = clientes.filter((c) => c.status === s).length;
    return acc;
  }, {} as Record<AlterdataClienteStatus, number>);

  const clientesFiltrados = clientes.filter((c) => {
    const matchStatus = filtroStatus === "TODOS" || c.status === filtroStatus;
    const buscaLower = busca.toLowerCase();
    const matchBusca = busca === "" || c.nome.toLowerCase().includes(buscaLower) || c.codPessoa.includes(busca) || (c.unidade ?? "").toLowerCase().includes(buscaLower);
    return matchStatus && matchBusca;
  });

  function abrirNovo() {
    setEditando(null);
    setForm(EMPTY_FORM);
    setErro("");
    setFormAberto(true);
  }

  function abrirEditar(c: AlterdataCliente) {
    setEditando(c);
    setForm({
      codPessoa: c.codPessoa,
      nome: c.nome,
      unidade: c.unidade ?? "",
      status: c.status,
      qtdLicencas: c.qtdLicencas,
      qtdUsuarios: c.qtdUsuarios,
      licencasOciosas: c.licencasOciosas,
      acessosFranqueado: c.acessosFranqueado,
      acessosBackoffice: c.acessosBackoffice,
      observacao: c.observacao ?? "",
    });
    setErro("");
    setFormAberto(true);
  }

  function fecharForm() {
    setFormAberto(false);
    setEditando(null);
    setForm(EMPTY_FORM);
    setErro("");
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");

    const url = editando
      ? `/api/admin/alterdata/clientes/${editando.id}`
      : "/api/admin/alterdata/clientes";
    const method = editando ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        qtdLicencas: Number(form.qtdLicencas),
        qtdUsuarios: Number(form.qtdUsuarios),
        licencasOciosas: Number(form.licencasOciosas),
        acessosFranqueado: Number(form.acessosFranqueado),
        acessosBackoffice: Number(form.acessosBackoffice),
        observacao: form.observacao || null,
      }),
    });

    if (res.ok) {
      await carregar();
      fecharForm();
    } else {
      const d = await res.json();
      setErro(d.message ?? "Erro ao salvar.");
    }
    setSalvando(false);
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este cliente?")) return;
    setExcluindo(id);
    await fetch(`/api/admin/alterdata/clientes/${id}`, { method: "DELETE" });
    await carregar();
    setExcluindo(null);
  }

  async function importar() {
    if (!importFile) return;
    setImportando(true);
    setImportResultado(null);
    const fd = new FormData();
    fd.append("file", importFile);
    const res = await fetch("/api/admin/alterdata/clientes/import", { method: "POST", body: fd });
    const data = await res.json();
    setImportResultado(data);
    await carregar();
    setImportando(false);
    setImportFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-8">
      {/* Cards de status */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {ALL_STATUS.map((s) => (
          <button
            key={s}
            onClick={() => setFiltroStatus(filtroStatus === s ? "TODOS" : s)}
            className={`glass-card border p-4 text-left transition-all ${CARD_ACCENT[s]} ${filtroStatus === s ? "ring-2 ring-white/20" : "opacity-80 hover:opacity-100"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
              <span className="text-xs font-medium" style={{ color: "var(--onity-dark-text-muted)" }}>
                {STATUS_LABELS[s]}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">{contagens[s]}</p>
            <p className="text-xs mt-1" style={{ color: "var(--onity-dark-text-muted)" }}>
              {contagens[s] === 1 ? "cliente" : "clientes"}
            </p>
          </button>
        ))}
      </div>

      {/* Barra de ações */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Buscar por nome ou código..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="ds-input flex-1"
          />
          {filtroStatus !== "TODOS" && (
            <button
              onClick={() => setFiltroStatus("TODOS")}
              className="shrink-0 text-sm px-3 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors"
            >
              × Limpar filtro
            </button>
          )}
        </div>
        {isMaster && (
          <div className="flex items-center justify-end gap-2">
            <a
              href="/api/admin/alterdata/clientes/template"
              className="text-sm px-3 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors whitespace-nowrap"
            >
              Baixar template
            </a>
            <button
              onClick={() => { setImportAberto(true); setImportResultado(null); }}
              className="text-sm px-3 py-2 rounded-lg border border-blue-500/30 text-blue-400 hover:text-blue-300 hover:border-blue-400/50 transition-colors whitespace-nowrap"
            >
              Importar xlsx
            </button>
            <button onClick={abrirNovo} className="btn-primary text-sm whitespace-nowrap">
              + Novo cliente
            </button>
          </div>
        )}
      </div>

      {/* Totalizador filtrado */}
      <p className="text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
        {clientesFiltrados.length} de {clientes.length} clientes
        {filtroStatus !== "TODOS" && ` · filtro: ${STATUS_LABELS[filtroStatus]}`}
      </p>

      {/* Tabela */}
      {loading ? (
        <p className="text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>Carregando...</p>
      ) : clientesFiltrados.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-white/60">Nenhum cliente encontrado.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="px-4 py-3 text-xs font-medium" style={{ color: "var(--onity-dark-text-muted)" }}>Código</th>
                  <th className="px-4 py-3 text-xs font-medium" style={{ color: "var(--onity-dark-text-muted)" }}>Nome</th>
                  <th className="px-4 py-3 text-xs font-medium" style={{ color: "var(--onity-dark-text-muted)" }}>Unidade</th>
                  <th className="px-4 py-3 text-xs font-medium" style={{ color: "var(--onity-dark-text-muted)" }}>Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-center" style={{ color: "var(--onity-dark-text-muted)" }}>Licenças</th>
                  <th className="px-4 py-3 text-xs font-medium text-center" style={{ color: "var(--onity-dark-text-muted)" }}>Usuários</th>
                  <th className="px-4 py-3 text-xs font-medium text-center" style={{ color: "var(--onity-dark-text-muted)" }}>Ociosas</th>
                  <th className="px-4 py-3 text-xs font-medium" style={{ color: "var(--onity-dark-text-muted)" }}>Observação</th>
                  {isMaster && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clientesFiltrados.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white/50 font-mono text-xs">{c.codPessoa}</td>
                    <td className="px-4 py-3 text-white font-medium max-w-[260px] truncate">{c.nome}</td>
                    <td className="px-4 py-3 text-white/60 text-xs max-w-[160px] truncate">{c.unidade ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[c.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[c.status]}`} />
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-white/70">{c.qtdLicencas}</td>
                    <td className="px-4 py-3 text-center text-white/70">{c.qtdUsuarios}</td>
                    <td className="px-4 py-3 text-center">
                      {c.licencasOciosas > 0 ? (
                        <span className="text-amber-400">{c.licencasOciosas}</span>
                      ) : (
                        <span className="text-white/30">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/50 text-xs max-w-[200px] truncate">
                      {c.observacao ?? "—"}
                    </td>
                    {isMaster && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => abrirEditar(c)}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => excluir(c.id)}
                            disabled={excluindo === c.id}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                          >
                            {excluindo === c.id ? "..." : "Excluir"}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de formulário */}
      {formAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) fecharForm(); }}
        >
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-bold text-white">
              {editando ? "Editar cliente" : "Novo cliente"}
            </h2>
            <form onSubmit={salvar} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--onity-dark-text-muted)" }}>Código*</label>
                  <input
                    className="ds-input w-full"
                    value={form.codPessoa}
                    onChange={(e) => setForm((f) => ({ ...f, codPessoa: e.target.value }))}
                    required
                    placeholder="874796"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--onity-dark-text-muted)" }}>Status</label>
                  <select
                    className="ds-input w-full"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as AlterdataClienteStatus }))}
                  >
                    {ALL_STATUS.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--onity-dark-text-muted)" }}>Nome*</label>
                <input
                  className="ds-input w-full"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  required
                  placeholder="RAZÃO SOCIAL LTDA"
                />
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--onity-dark-text-muted)" }}>Unidade</label>
                <input
                  className="ds-input w-full"
                  value={form.unidade}
                  onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))}
                  placeholder="CF EXEMPLO"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--onity-dark-text-muted)" }}>Licenças</label>
                  <input type="number" min={0} className="ds-input w-full" value={form.qtdLicencas}
                    onChange={(e) => setForm((f) => ({ ...f, qtdLicencas: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--onity-dark-text-muted)" }}>Usuários</label>
                  <input type="number" min={0} className="ds-input w-full" value={form.qtdUsuarios}
                    onChange={(e) => setForm((f) => ({ ...f, qtdUsuarios: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--onity-dark-text-muted)" }}>Ociosas</label>
                  <input type="number" min={0} className="ds-input w-full" value={form.licencasOciosas}
                    onChange={(e) => setForm((f) => ({ ...f, licencasOciosas: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--onity-dark-text-muted)" }}>Ac. Franqueado</label>
                  <input type="number" min={0} className="ds-input w-full" value={form.acessosFranqueado}
                    onChange={(e) => setForm((f) => ({ ...f, acessosFranqueado: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--onity-dark-text-muted)" }}>Ac. Backoffice</label>
                  <input type="number" min={0} className="ds-input w-full" value={form.acessosBackoffice}
                    onChange={(e) => setForm((f) => ({ ...f, acessosBackoffice: Number(e.target.value) }))} />
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--onity-dark-text-muted)" }}>Observação</label>
                <input
                  className="ds-input w-full"
                  value={form.observacao}
                  onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>

              {erro && <p className="text-sm text-red-400">{erro}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={fecharForm} className="link-muted text-sm px-4 py-2">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando} className="btn-primary text-sm disabled:opacity-50">
                  {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de importação */}
      {importAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setImportAberto(false); }}
        >
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-bold text-white">Importar clientes (xlsx)</h2>
            <p className="text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
              Clientes existentes (mesmo código) serão atualizados. Novos serão inseridos.
              Use o template para garantir o formato correto.
            </p>
            <a
              href="/api/admin/alterdata/clientes/template"
              className="link-accent text-sm"
            >
              Baixar template xlsx
            </a>

            <div>
              <label className="block text-xs mb-2" style={{ color: "var(--onity-dark-text-muted)" }}>
                Arquivo xlsx
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="ds-input w-full text-sm"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {importResultado && (
              <div className="glass-card p-3 rounded-lg text-sm space-y-1">
                <p className="text-emerald-400">✓ {importResultado.inserted} inseridos · {importResultado.updated} atualizados</p>
                {importResultado.errors.length > 0 && (
                  <div>
                    <p className="text-amber-400">{importResultado.errors.length} avisos:</p>
                    {importResultado.errors.slice(0, 5).map((err, i) => (
                      <p key={i} className="text-xs text-white/50">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setImportAberto(false)} className="link-muted text-sm px-4 py-2">
                Fechar
              </button>
              <button
                onClick={importar}
                disabled={!importFile || importando}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {importando ? "Importando..." : "Importar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
