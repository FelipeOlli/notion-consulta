"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { formatBRL as _formatBRL, BACKOFFICE_UNIT_PRICE, FRANQUEADO_UNIT_PRICE } from "@/lib/alterdata-pricing";
import { AlterdataCostDashboard } from "@/components/alterdata-cost-dashboard";
import { AlterdataObservacoesList } from "@/components/alterdata-observacoes-list";
import { AlterdataContadoresList } from "@/components/alterdata-contadores-list";
import { ConfirmModal } from "@/components/confirm-modal";
import type { AlterdataCliente, AlterdataClienteStatus, AlterdataTelemetria } from "@prisma/client";

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

const TELEMETRIA_LABELS: Record<AlterdataTelemetria, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
};

const TELEMETRIA_COLORS: Record<AlterdataTelemetria, string> = {
  ATIVO: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  INATIVO: "bg-red-500/20 text-red-400 border-red-500/30",
};

const TELEMETRIA_DOT: Record<AlterdataTelemetria, string> = {
  ATIVO: "bg-emerald-400",
  INATIVO: "bg-red-400",
};

const formatBRL = _formatBRL;

function maskCNPJ(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

const EMPTY_FORM = {
  codPessoa: "",
  nome: "",
  unidade: "",
  status: "ATIVO" as AlterdataClienteStatus,
  telemetria: null as AlterdataTelemetria | null,
  cnpj: "",
  qtdLicencas: 1,
  acessosFranqueado: 0,
  acessosBackoffice: 0,
  observacao: "",
};

interface Props {
  isMaster: boolean;
  currentEmail: string;
}

export function AlterdataDashboard({ isMaster, currentEmail }: Props) {
  const [clientes, setClientes] = useState<AlterdataCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<AlterdataClienteStatus | "TODOS">("TODOS");
  const [filtroTelemetria, setFiltroTelemetria] = useState<AlterdataTelemetria | "TODOS">("TODOS");
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

  const [sincronizando, setSincronizando] = useState(false);
  const [syncResultado, setSyncResultado] = useState<{
    ok: boolean;
    inserted?: number;
    updated?: number;
    unchanged?: number;
    changes?: { codPessoa: string; nome: string; diffs: string[] }[];
    errors?: string[];
    message?: string;
  } | null>(null);
  const [syncDetalhesAbertos, setSyncDetalhesAbertos] = useState(false);

  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<{ acao: () => void; mensagem: string } | null>(null);

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
    const matchTelemetria = filtroTelemetria === "TODOS" || c.telemetria === filtroTelemetria;
    const buscaLower = busca.toLowerCase();
    const matchBusca = busca === "" || c.nome.toLowerCase().includes(buscaLower) || c.codPessoa.includes(busca) || (c.unidade ?? "").toLowerCase().includes(buscaLower);
    return matchStatus && matchTelemetria && matchBusca;
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
      cnpj: c.cnpj ? maskCNPJ(c.cnpj) : "",
      status: c.status,
      telemetria: c.telemetria ?? null,
      qtdLicencas: c.qtdLicencas,
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
        cnpj: form.cnpj.replace(/\D/g, "") || null,
        qtdLicencas: Number(form.qtdLicencas),
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

  async function sincronizar() {
    setSincronizando(true);
    setSyncResultado(null);
    setSyncDetalhesAbertos(false);
    const res = await fetch("/api/admin/alterdata/clientes/sync", { method: "POST" });
    const data = await res.json();
    setSyncResultado(data);
    if (data.ok) await carregar();
    setSincronizando(false);
  }

  return (
    <div className="space-y-8">
      {/* Dashboard de custos */}
      <AlterdataCostDashboard clientes={clientes} />

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
          {(filtroStatus !== "TODOS" || filtroTelemetria !== "TODOS") && (
            <button
              onClick={() => { setFiltroStatus("TODOS"); setFiltroTelemetria("TODOS"); }}
              className="shrink-0 text-sm px-3 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors"
            >
              × Limpar filtros
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>Telemetria:</span>
          {(["TODOS", "ATIVO", "INATIVO"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFiltroTelemetria(t)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                filtroTelemetria === t
                  ? t === "ATIVO"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : t === "INATIVO"
                    ? "bg-red-500/20 text-red-400 border-red-500/40"
                    : "bg-white/10 text-white border-white/20"
                  : "border-white/10 text-white/50 hover:text-white hover:border-white/20"
              }`}
            >
              {t === "TODOS" ? "Todos" : t === "ATIVO" ? "Ativo" : "Inativo"}
            </button>
          ))}
        </div>
        {isMaster && (
          <div className="flex items-center justify-end gap-2">
            <a
              href="/api/admin/alterdata/clientes/template"
              className="text-sm px-3 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors whitespace-nowrap"
            >
              Baixar template
            </a>
            <a
              href="/api/admin/alterdata/clientes/export"
              className="text-sm px-3 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors whitespace-nowrap"
            >
              Exportar xlsx
            </a>
            <button
              onClick={sincronizar}
              disabled={sincronizando}
              className="text-sm px-3 py-2 rounded-lg border border-purple-500/30 text-purple-400 hover:text-purple-300 hover:border-purple-400/50 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {sincronizando ? "Sincronizando..." : "↻ Sincronizar Sheets"}
            </button>
            <button
              onClick={() => { setImportAberto(true); setImportResultado(null); }}
              className="text-sm px-3 py-2 rounded-lg border border-blue-500/30 text-blue-400 hover:text-blue-300 hover:border-blue-400/50 transition-colors whitespace-nowrap"
            >
              Importar xlsx
            </button>
            <button
              onClick={abrirNovo}
              className="text-sm px-3 py-2 rounded-lg border border-blue-500/30 text-blue-400 hover:text-blue-300 hover:border-blue-400/50 transition-colors whitespace-nowrap"
            >
              + Novo cliente
            </button>
          </div>
        )}
      </div>

      {/* Totalizador filtrado */}
      <p className="text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
        {clientesFiltrados.length} de {clientes.length} clientes
        {filtroStatus !== "TODOS" && ` · status: ${STATUS_LABELS[filtroStatus]}`}
        {filtroTelemetria !== "TODOS" && ` · telemetria: ${TELEMETRIA_LABELS[filtroTelemetria]}`}
      </p>

      {/* Resultado da sincronização */}
      {syncResultado && (
        <div className={`glass-card p-4 rounded-xl text-sm space-y-2 border ${syncResultado.ok ? "border-purple-500/20" : "border-red-500/20"}`}>
          <div className="flex items-center justify-between gap-2">
            {syncResultado.ok ? (
              <p className="text-purple-300 font-medium">
                ✓ Sync concluído · {syncResultado.inserted} inseridos · {syncResultado.updated} atualizados · {syncResultado.unchanged} inalterados
              </p>
            ) : (
              <p className="text-red-400 font-medium">✗ Erro no sync: {syncResultado.message}</p>
            )}
            <div className="flex items-center gap-2 shrink-0">
              {syncResultado.ok && (syncResultado.changes?.length ?? 0) > 0 && (
                <button
                  onClick={() => setSyncDetalhesAbertos((v) => !v)}
                  className="text-xs text-white/50 hover:text-white/80 transition-colors"
                >
                  {syncDetalhesAbertos ? "▲ ocultar" : `▼ ${syncResultado.changes?.length} alterações`}
                </button>
              )}
              <button
                onClick={() => setSyncResultado(null)}
                className="text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {syncDetalhesAbertos && syncResultado.changes && syncResultado.changes.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto pt-1 border-t border-white/5">
              {syncResultado.changes.map((c) => (
                <div key={c.codPessoa} className="text-xs text-white/60">
                  <span className="text-white/80">{c.nome}</span>
                  {" — "}
                  {c.diffs.join(" · ")}
                </div>
              ))}
            </div>
          )}

          {syncResultado.ok && (syncResultado.errors?.length ?? 0) > 0 && (
            <p className="text-xs text-amber-400">{syncResultado.errors?.length} linhas ignoradas por dados ausentes.</p>
          )}
        </div>
      )}

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
                  <th className="px-4 py-3 text-xs font-medium" style={{ color: "var(--onity-dark-text-muted)" }}>Telemetria</th>
                  <th className="px-4 py-3 text-xs font-medium text-center" style={{ color: "var(--onity-dark-text-muted)" }}>Licenças</th>
                  <th className="px-4 py-3 text-xs font-medium text-center" style={{ color: "var(--onity-dark-text-muted)" }}>Ac. Franqueado</th>
                  <th className="px-4 py-3 text-xs font-medium text-center" style={{ color: "var(--onity-dark-text-muted)" }}>Ac. Backoffice</th>
                  <th className="px-4 py-3 text-xs font-medium text-center" style={{ color: "var(--onity-dark-text-muted)" }}>V. Franqueado</th>
                  <th className="px-4 py-3 text-xs font-medium text-center" style={{ color: "var(--onity-dark-text-muted)" }}>V. Backoffice</th>
                  {isMaster && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clientesFiltrados.map((c) => (
                  <tr key={c.id} onClick={() => abrirEditar(c)} className="hover:bg-white/5 transition-colors cursor-pointer">
                    <td className="px-4 py-3 text-white/50 font-mono text-xs">{c.codPessoa}</td>
                    <td className="px-4 py-3 text-white font-medium max-w-[260px] truncate">{c.nome}</td>
                    <td className="px-4 py-3 text-white/60 text-xs max-w-[160px] truncate">{c.unidade ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[c.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[c.status]}`} />
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.telemetria ? (
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${TELEMETRIA_COLORS[c.telemetria]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${TELEMETRIA_DOT[c.telemetria]}`} />
                          {TELEMETRIA_LABELS[c.telemetria]}
                        </span>
                      ) : (
                        <span className="text-xs text-white/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-white/70">{c.qtdLicencas}</td>
                    <td className="px-4 py-3 text-center text-white/70">{c.acessosFranqueado}</td>
                    <td className="px-4 py-3 text-center text-white/70">{c.acessosBackoffice}</td>
                    <td className="px-4 py-3 text-center text-white/70">{formatBRL(c.acessosFranqueado * FRANQUEADO_UNIT_PRICE)}</td>
                    <td className="px-4 py-3 text-center text-white/70">{formatBRL(c.acessosBackoffice * BACKOFFICE_UNIT_PRICE)}</td>
                    {isMaster && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end items-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); abrirEditar(c); }}
                            className="text-blue-400/60 hover:text-blue-400 transition-colors"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmar({ acao: () => excluir(c.id), mensagem: `Excluir o cliente "${c.nome}"?` }); }}
                            disabled={excluindo === c.id}
                            className="text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-50"
                            title="Excluir"
                          >
                            {excluindo === c.id ? (
                              <span className="text-xs">...</span>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            )}
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
          <div className="glass-panel w-full max-w-4xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-5">
              {editando ? "Editar cliente" : "Novo cliente"}
            </h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
            {/* Coluna esquerda — campos do cliente */}
            <form onSubmit={salvar} className="space-y-4 m-0">
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
                <label className="block text-xs mb-1" style={{ color: "var(--onity-dark-text-muted)" }}>Telemetria</label>
                <select
                  className="ds-input w-full"
                  value={form.telemetria ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, telemetria: (e.target.value || null) as AlterdataTelemetria | null }))}
                >
                  <option value="">— sem dados —</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </select>
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

              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--onity-dark-text-muted)" }}>CNPJ</label>
                <input
                  className="ds-input w-full"
                  value={form.cnpj}
                  onChange={(e) => setForm((f) => ({ ...f, cnpj: maskCNPJ(e.target.value) }))}
                  maxLength={18}
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--onity-dark-text-muted)" }}>Licenças</label>
                  <input type="number" min={0} className="ds-input w-full" value={form.qtdLicencas}
                    onChange={(e) => setForm((f) => ({ ...f, qtdLicencas: Number(e.target.value) }))} />
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

              {/* Credenciais — só para clientes já existentes */}
              {editando && (
                <div className="border-t border-white/10 pt-4 space-y-5">
                  <AlterdataContadoresList clienteId={editando.id} tipo="NUVEM" titulo="Alterdata Nuvem" />
                  <AlterdataContadoresList clienteId={editando.id} tipo="PACK" titulo="Alterdata Pack" />
                  <AlterdataContadoresList clienteId={editando.id} tipo="ECONTADOR" titulo="eContador" />
                </div>
              )}

              {erro && <p className="text-sm text-red-400">{erro}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={fecharForm} className="link-muted text-sm px-4 py-2">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando} className="text-sm px-3 py-2 rounded-lg border border-blue-500/30 text-blue-400 hover:text-blue-300 hover:border-blue-400/50 transition-colors disabled:opacity-50">
                  {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar cliente"}
                </button>
              </div>
            </form>

            {/* Coluna direita — observações */}
            <div className="border-t border-white/10 pt-4 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
              {editando ? (
                <AlterdataObservacoesList clienteId={editando.id} currentEmail={currentEmail} />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-xs text-center" style={{ color: "var(--onity-dark-text-muted)" }}>
                    Salve o cliente para registrar<br />observações e credenciais.
                  </p>
                </div>
              )}
            </div>
            </div>
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
                className="text-sm px-3 py-2 rounded-lg border border-blue-500/30 text-blue-400 hover:text-blue-300 hover:border-blue-400/50 transition-colors disabled:opacity-50"
              >
                {importando ? "Importando..." : "Importar"}
              </button>
            </div>
          </div>
        </div>
      )}
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
