"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { formatBRL as _formatBRL, BACKOFFICE_UNIT_PRICE, FRANQUEADO_UNIT_PRICE } from "@/lib/alterdata-pricing";
import { AlterdataCostDashboard } from "@/components/alterdata-cost-dashboard";
import { AlterdataObservacoesList } from "@/components/alterdata-observacoes-list";
import { AlterdataContadoresList } from "@/components/alterdata-contadores-list";
import { ConfirmModal } from "@/components/confirm-modal";
import type { AlterdataCliente, AlterdataClienteStatus, AlterdataCredencialTipo, AlterdataTelemetria } from "@prisma/client";

type ClienteComCredenciais = AlterdataCliente & { contadores?: { tipo: AlterdataCredencialTipo }[] };

const STATUS_LABELS: Record<AlterdataClienteStatus, string> = {
  ATIVO: "Ativo",
  EM_ANDAMENTO: "Em Andamento",
  INATIVO: "Inativo",
  EM_CANCELAMENTO: "Em cancelamento",
  DISTRATADO: "Distratado",
};

const STATUS_COLORS: Record<AlterdataClienteStatus, string> = {
  ATIVO: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  EM_ANDAMENTO: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  INATIVO: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  EM_CANCELAMENTO: "bg-red-500/20 text-red-400 border-red-500/30",
  DISTRATADO: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const STATUS_DOT: Record<AlterdataClienteStatus, string> = {
  ATIVO: "bg-emerald-400",
  EM_ANDAMENTO: "bg-yellow-400",
  INATIVO: "bg-slate-400",
  EM_CANCELAMENTO: "bg-red-400",
  DISTRATADO: "bg-orange-400",
};

const CARD_ACCENT: Record<AlterdataClienteStatus, string> = {
  ATIVO: "border-emerald-500/40",
  EM_ANDAMENTO: "border-yellow-500/40",
  INATIVO: "border-slate-500/40",
  EM_CANCELAMENTO: "border-red-500/40",
  DISTRATADO: "border-orange-500/40",
};

const ALL_STATUS: AlterdataClienteStatus[] = ["ATIVO", "EM_ANDAMENTO", "INATIVO", "EM_CANCELAMENTO", "DISTRATADO"];

const TELEMETRIA_LABELS: Record<AlterdataTelemetria, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
};

const CRED_LABELS: Record<AlterdataCredencialTipo, string> = {
  NUVEM: "Nuvem",
  PACK: "Pack",
  ECONTADOR: "eContador",
  PASSAPORTE: "Passaporte",
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

function maskCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

const EMPTY_FORM = {
  codPessoa: "",
  nome: "",
  unidade: "",
  status: "ATIVO" as AlterdataClienteStatus,
  telemetria: null as AlterdataTelemetria | null,
  cnpj: "",
  cpf: "",
  qtdLicencas: 1,
  acessosFranqueado: 0,
  acessosBackoffice: 0,
  acessoLiberado: false,
  observacao: "",
};

interface Props {
  isMaster: boolean;
  currentEmail: string;
  notebookLmUrl?: string;
}

export function AlterdataDashboard({ isMaster, currentEmail, notebookLmUrl }: Props) {
  const [clientes, setClientes] = useState<ClienteComCredenciais[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<AlterdataClienteStatus | "TODOS">("TODOS");
  const [filtroTelemetria, setFiltroTelemetria] = useState<AlterdataTelemetria | "TODOS">("TODOS");
  const [filtroCredenciais, setFiltroCredenciais] = useState<AlterdataCredencialTipo[]>([]);
  const toggleCredencial = (t: AlterdataCredencialTipo) =>
    setFiltroCredenciais((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  const [filtroAcesso, setFiltroAcesso] = useState<"TODOS" | "SIM" | "NAO">("TODOS");
  const [busca, setBusca] = useState("");
  const [filtrosMobileAbertos, setFiltrosMobileAbertos] = useState(false);
  const [acoesMobileAbertas, setAcoesMobileAbertas] = useState(false);
  const filtrosAtivos =
    (filtroStatus !== "TODOS" ? 1 : 0) +
    (filtroTelemetria !== "TODOS" ? 1 : 0) +
    (filtroCredenciais.length > 0 ? 1 : 0) +
    (filtroAcesso !== "TODOS" ? 1 : 0);

  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<AlterdataCliente | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const skipAutoSave = useRef(false);
  const dirtyRef = useRef(false);
  const subDirtyRef = useRef<Record<string, boolean>>({});

  const marcarSubDirty = useCallback((key: string) => (dirty: boolean) => {
    subDirtyRef.current[key] = dirty;
  }, []);

  const [importAberto, setImportAberto] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [importResultado, setImportResultado] = useState<{ inserted: number; updated: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [oauthStatus, setOauthStatus] = useState<{ connected: boolean; email?: string } | null>(null);
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

  // Status da conexão OAuth (Google) e feedback do redirect de callback — só master.
  useEffect(() => {
    if (!isMaster) return;

    const params = new URLSearchParams(window.location.search);
    const oauth = params.get("oauth");
    if (oauth === "success") {
      window.history.replaceState({}, "", window.location.pathname);
    } else if (oauth === "error") {
      alert(params.get("message") ?? "Erro ao conectar com o Google.");
      window.history.replaceState({}, "", window.location.pathname);
    }

    fetch("/api/admin/alterdata/oauth/status")
      .then((res) => res.json())
      .then((data) => setOauthStatus(data))
      .catch(() => setOauthStatus(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMaster]);

  const contagens = ALL_STATUS.reduce<Record<AlterdataClienteStatus, number>>((acc, s) => {
    acc[s] = clientes.filter((c) => c.status === s).length;
    return acc;
  }, {} as Record<AlterdataClienteStatus, number>);

  const clientesFiltrados = clientes.filter((c) => {
    const matchStatus = filtroStatus === "TODOS" || c.status === filtroStatus;
    const matchTelemetria = filtroTelemetria === "TODOS" || c.telemetria === filtroTelemetria;
    const matchCredencial = filtroCredenciais.length === 0 ||
      filtroCredenciais.every((t) => c.contadores?.some((cr) => cr.tipo === t) ?? false);
    const matchAcesso = filtroAcesso === "TODOS" || (filtroAcesso === "SIM" ? c.acessoLiberado : !c.acessoLiberado);
    const buscaLower = busca.toLowerCase();
    const matchBusca = busca === "" || c.nome.toLowerCase().includes(buscaLower) || c.codPessoa.includes(busca) || (c.unidade ?? "").toLowerCase().includes(buscaLower);
    return matchStatus && matchTelemetria && matchCredencial && matchAcesso && matchBusca;
  });

  function abrirNovo() {
    setEditando(null);
    setAutoSaveStatus("idle");
    skipAutoSave.current = true;
    setForm(EMPTY_FORM);
    setErro("");
    setFormAberto(true);
  }

  function abrirEditar(c: AlterdataCliente) {
    setEditando(c);
    setAutoSaveStatus("idle");
    skipAutoSave.current = true;
    setForm({
      codPessoa: c.codPessoa,
      nome: c.nome,
      unidade: c.unidade ?? "",
      cnpj: c.cnpj ? maskCNPJ(c.cnpj) : "",
      cpf: c.cpf ? maskCPF(c.cpf) : "",
      status: c.status,
      telemetria: c.telemetria ?? null,
      qtdLicencas: c.qtdLicencas,
      acessosFranqueado: c.acessosFranqueado,
      acessosBackoffice: c.acessosBackoffice,
      acessoLiberado: c.acessoLiberado,
      observacao: c.observacao ?? "",
    });
    setErro("");
    setFormAberto(true);
  }

  // Persiste a edição atual no backend; retorna true se ok
  async function persistirEdicao(clienteId: string, snapshot: typeof form) {
    setAutoSaveStatus("saving");
    setErro("");
    const res = await fetch(`/api/admin/alterdata/clientes/${clienteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codPessoa: snapshot.codPessoa,
        nome: snapshot.nome,
        unidade: snapshot.unidade || null,
        cnpj: snapshot.cnpj.replace(/\D/g, "") || null,
        cpf: snapshot.cpf.replace(/\D/g, "") || null,
        status: snapshot.status,
        telemetria: snapshot.telemetria,
        qtdLicencas: Number(snapshot.qtdLicencas),
        acessosFranqueado: Number(snapshot.acessosFranqueado),
        acessosBackoffice: Number(snapshot.acessosBackoffice),
        acessoLiberado: snapshot.acessoLiberado,
      }),
    });
    if (res.ok) {
      const atualizado = await res.json();
      setClientes((prev) =>
        prev.map((c) => c.id === clienteId ? { ...c, ...atualizado } : c)
      );
      dirtyRef.current = false;
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
      return true;
    } else {
      const d = await res.json();
      setErro(d.message ?? "Erro ao salvar.");
      setAutoSaveStatus("error");
      return false;
    }
  }

  function resetForm() {
    setFormAberto(false);
    setEditando(null);
    setForm(EMPTY_FORM);
    setErro("");
    setAutoSaveStatus("idle");
    dirtyRef.current = false;
    subDirtyRef.current = {};
  }

  async function fecharForm() {
    // Flush do auto-save pendente — evita perder dados digitados antes dos 700ms
    if (editando && dirtyRef.current && form.codPessoa.trim() && form.nome.trim()) {
      await persistirEdicao(editando.id, form);
    }
    // Avisa se há inputs não salvos nos sub-formulários (credenciais/observações)
    if (Object.values(subDirtyRef.current).some(Boolean)) {
      setConfirmar({
        mensagem: "Há alterações não salvas em credenciais ou observações que serão descartadas. Fechar mesmo assim?",
        acao: resetForm,
      });
      return;
    }
    resetForm();
  }

  // Auto-save com debounce — só na edição de clientes existentes
  useEffect(() => {
    if (!editando) return;
    if (skipAutoSave.current) { skipAutoSave.current = false; return; }
    if (!form.codPessoa.trim() || !form.nome.trim()) return;

    dirtyRef.current = true;
    const timer = setTimeout(() => persistirEdicao(editando.id, form), 700);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, editando?.id]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    // Edição é tratada pelo auto-save; aqui só criação de novo cliente
    if (editando) return;

    setSalvando(true);
    setErro("");

    const res = await fetch("/api/admin/alterdata/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        cnpj: form.cnpj.replace(/\D/g, "") || null,
        cpf: form.cpf.replace(/\D/g, "") || null,
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
    try {
      const res = await fetch("/api/admin/alterdata/clientes/sync", { method: "POST" });
      const data = await res.json();
      setSyncResultado(data);
      if (data.ok) await carregar();
    } catch {
      setSyncResultado({ ok: false, message: "Erro de conexão ao sincronizar. Tente novamente." });
    } finally {
      setSincronizando(false);
    }
  }

  type AcaoSecundaria = {
    key: string;
    label: string;
    href?: string;
    external?: boolean;
    onClick?: () => void;
    disabled?: boolean;
    className: string;
  };

  const acoesSecundarias: AcaoSecundaria[] = [];
  if (notebookLmUrl) {
    acoesSecundarias.push({
      key: "notebooklm",
      label: "🧠 Consultor IA",
      href: notebookLmUrl,
      external: true,
      className: "border-purple-500/30 text-purple-400 hover:text-purple-300 hover:border-purple-400/50",
    });
  }
  if (isMaster) {
    acoesSecundarias.push(
      {
        key: "template",
        label: "Baixar template",
        href: "/api/admin/alterdata/clientes/template",
        className: "border-white/10 text-white/60 hover:text-white hover:border-white/20",
      },
      {
        key: "export",
        label: "Exportar xlsx",
        href: "/api/admin/alterdata/clientes/export",
        className: "border-white/10 text-white/60 hover:text-white hover:border-white/20",
      },
      {
        key: "sync",
        label: sincronizando ? "Sincronizando..." : "↻ Sincronizar Sheets",
        onClick: sincronizar,
        disabled: sincronizando,
        className: "border-purple-500/30 text-purple-400 hover:text-purple-300 hover:border-purple-400/50",
      },
      {
        key: "google-oauth",
        label: oauthStatus?.connected
          ? `✅ ${oauthStatus.email ?? "Google conectado"} (reconectar)`
          : "🔗 Conectar Google",
        href: "/api/admin/alterdata/oauth/start",
        className: oauthStatus?.connected
          ? "border-emerald-500/30 text-emerald-400 hover:text-emerald-300 hover:border-emerald-400/50"
          : "border-white/10 text-white/60 hover:text-white hover:border-white/20",
      },
      {
        key: "import",
        label: "Importar xlsx",
        onClick: () => { setImportAberto(true); setImportResultado(null); },
        className: "border-blue-500/30 text-blue-400 hover:text-blue-300 hover:border-blue-400/50",
      }
    );
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
          {(filtroStatus !== "TODOS" || filtroTelemetria !== "TODOS" || filtroCredenciais.length > 0 || filtroAcesso !== "TODOS") && (
            <button
              onClick={() => { setFiltroStatus("TODOS"); setFiltroTelemetria("TODOS"); setFiltroCredenciais([]); setFiltroAcesso("TODOS"); }}
              className="shrink-0 text-sm px-3 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors"
            >
              × Limpar filtros
            </button>
          )}
        </div>
        {/* Controles compactos — só mobile */}
        <div className="flex flex-wrap items-center gap-2 sm:hidden">
          <button
            onClick={() => setFiltrosMobileAbertos((v) => !v)}
            className={`text-sm px-3 py-2 rounded-lg border transition-colors whitespace-nowrap ${
              filtrosAtivos > 0
                ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                : "border-white/10 text-white/60 hover:text-white hover:border-white/20"
            }`}
          >
            ☷ Filtros{filtrosAtivos > 0 ? ` (${filtrosAtivos})` : ""}
          </button>
          {acoesSecundarias.length > 0 && (
            <button
              onClick={() => setAcoesMobileAbertas((v) => !v)}
              className="text-sm px-3 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors whitespace-nowrap"
            >
              ⋯ Ações
            </button>
          )}
          <button
            onClick={abrirNovo}
            className="text-sm px-3 py-2 rounded-lg border border-blue-500/30 text-blue-400 hover:text-blue-300 hover:border-blue-400/50 transition-colors whitespace-nowrap"
          >
            + Novo cliente
          </button>
        </div>

        {/* Menu de ações — só mobile, expansível */}
        {acoesMobileAbertas && (
          <div className="flex flex-col gap-2 sm:hidden">
            {acoesSecundarias.map((a) =>
              a.href ? (
                <a
                  key={a.key}
                  href={a.href}
                  target={a.external ? "_blank" : undefined}
                  rel={a.external ? "noopener noreferrer" : undefined}
                  onClick={() => setAcoesMobileAbertas(false)}
                  className={`text-sm px-3 py-2 rounded-lg border text-center transition-colors ${a.className}`}
                >
                  {a.label}
                </a>
              ) : (
                <button
                  key={a.key}
                  onClick={() => { a.onClick?.(); setAcoesMobileAbertas(false); }}
                  disabled={a.disabled}
                  className={`text-sm px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 ${a.className}`}
                >
                  {a.label}
                </button>
              )
            )}
          </div>
        )}

        {/* Filtros — colapsáveis no mobile, sempre visíveis a partir de sm */}
        <div className={`${filtrosMobileAbertos ? "flex" : "hidden"} sm:flex flex-col gap-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs shrink-0" style={{ color: "var(--onity-dark-text-muted)" }}>Telemetria:</span>
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs shrink-0" style={{ color: "var(--onity-dark-text-muted)" }}>Credencial:</span>
          <button
            onClick={() => setFiltroCredenciais([])}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              filtroCredenciais.length === 0
                ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                : "border-white/10 text-white/50 hover:text-white hover:border-white/20"
            }`}
          >
            Todos
          </button>
          {(["NUVEM", "PACK", "ECONTADOR", "PASSAPORTE"] as const).map((t) => (
            <button
              key={t}
              onClick={() => toggleCredencial(t)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                filtroCredenciais.includes(t)
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                  : "border-white/10 text-white/50 hover:text-white hover:border-white/20"
              }`}
            >
              {CRED_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs shrink-0" style={{ color: "var(--onity-dark-text-muted)" }}>Acesso liberado:</span>
          {(["TODOS", "SIM", "NAO"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFiltroAcesso(v)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                filtroAcesso === v
                  ? v === "SIM"
                    ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                    : v === "NAO"
                    ? "bg-slate-500/20 text-slate-400 border-slate-500/40"
                    : "bg-white/10 text-white border-white/20"
                  : "border-white/10 text-white/50 hover:text-white hover:border-white/20"
              }`}
            >
              {v === "TODOS" ? "Todos" : v === "SIM" ? "Liberado" : "Não liberado"}
            </button>
          ))}
        </div>
        </div>

        {/* Barra de ações — só a partir de sm (mobile usa os controles compactos acima) */}
        <div className="hidden sm:flex flex-wrap items-center gap-2 sm:justify-end">
          {acoesSecundarias.map((a) =>
            a.href ? (
              <a
                key={a.key}
                href={a.href}
                target={a.external ? "_blank" : undefined}
                rel={a.external ? "noopener noreferrer" : undefined}
                className={`text-sm px-3 py-2 rounded-lg border transition-colors whitespace-nowrap ${a.className}`}
              >
                {a.label}
              </a>
            ) : (
              <button
                key={a.key}
                onClick={a.onClick}
                disabled={a.disabled}
                className={`text-sm px-3 py-2 rounded-lg border transition-colors whitespace-nowrap disabled:opacity-50 ${a.className}`}
              >
                {a.label}
              </button>
            )
          )}
          <button
            onClick={abrirNovo}
            className="text-sm px-3 py-2 rounded-lg border border-blue-500/30 text-blue-400 hover:text-blue-300 hover:border-blue-400/50 transition-colors whitespace-nowrap"
          >
            + Novo cliente
          </button>
        </div>
      </div>

      {/* Totalizador filtrado */}
      <p className="text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
        {clientesFiltrados.length} de {clientes.length} clientes
        {filtroStatus !== "TODOS" && ` · status: ${STATUS_LABELS[filtroStatus]}`}
        {filtroTelemetria !== "TODOS" && ` · telemetria: ${TELEMETRIA_LABELS[filtroTelemetria]}`}
        {filtroCredenciais.length > 0 && ` · credenciais: ${filtroCredenciais.map((t) => CRED_LABELS[t]).join(" + ")}`}
        {filtroAcesso !== "TODOS" && ` · acesso: ${filtroAcesso === "SIM" ? "liberado" : "não liberado"}`}
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
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clientesFiltrados.map((c) => (
                  <tr key={c.id} onClick={() => abrirEditar(c)} className="hover:bg-white/5 transition-colors cursor-pointer">
                    <td className="px-4 py-3 text-white/50 font-mono text-xs">{c.codPessoa}</td>
                    <td className="px-4 py-3 text-white font-medium">
                      <div className="flex items-center gap-1.5 max-w-[260px]">
                        <span className="truncate min-w-0">{c.nome}</span>
                        {c.acessoLiberado && (
                          <svg className="shrink-0 w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor" aria-label="Acesso liberado">
                            <title>Acesso liberado</title>
                            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.06-1.06L10.94 12.69l-1.69-1.69a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l4.06-4.124z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </td>
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
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end items-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); abrirEditar(c); }}
                          className="text-blue-400/60 hover:text-blue-400 transition-colors"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        {isMaster && (
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
                        )}
                      </div>
                    </td>
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
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">
                {editando ? "Editar cliente" : "Novo cliente"}
              </h2>
              {editando && (
                <div className="text-xs">
                  {autoSaveStatus === "saving" && (
                    <span style={{ color: "var(--onity-dark-text-muted)" }}>Salvando…</span>
                  )}
                  {autoSaveStatus === "saved" && (
                    <span className="text-emerald-400">✓ Salvo</span>
                  )}
                </div>
              )}
            </div>
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

              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--onity-dark-text-muted)" }}>CPF</label>
                <input
                  className="ds-input w-full"
                  value={form.cpf}
                  onChange={(e) => setForm((f) => ({ ...f, cpf: maskCPF(e.target.value) }))}
                  maxLength={14}
                  placeholder="000.000.000-00"
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

              {/* Toggle acesso liberado */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.acessoLiberado}
                    onChange={(e) => setForm((f) => ({ ...f, acessoLiberado: e.target.checked }))}
                  />
                  <div className={`w-9 h-5 rounded-full transition-colors ${form.acessoLiberado ? "bg-blue-500" : "bg-white/15"}`} />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.acessoLiberado ? "translate-x-4" : "translate-x-0"}`} />
                </div>
                <span className="text-xs" style={{ color: form.acessoLiberado ? "#3b82f6" : "var(--onity-dark-text-muted)" }}>
                  Acesso total liberado
                </span>
              </label>

              {/* Credenciais — só para clientes já existentes */}
              {editando && (
                <div className="border-t border-white/10 pt-4 space-y-5">
                  <AlterdataContadoresList clienteId={editando.id} tipo="NUVEM" titulo="Alterdata Nuvem" onDirtyChange={marcarSubDirty("NUVEM")} />
                  <AlterdataContadoresList clienteId={editando.id} tipo="PACK" titulo="Alterdata Pack" onDirtyChange={marcarSubDirty("PACK")} />
                  <AlterdataContadoresList clienteId={editando.id} tipo="ECONTADOR" titulo="eContador" onDirtyChange={marcarSubDirty("ECONTADOR")} />
                  <AlterdataContadoresList clienteId={editando.id} tipo="PASSAPORTE" titulo="Passaporte" onDirtyChange={marcarSubDirty("PASSAPORTE")} />
                </div>
              )}

              {erro && <p className="text-sm text-red-400">{erro}</p>}

              <div className="flex items-center justify-end gap-3 pt-2">
                {editando ? (
                  <>
                    <button type="button" onClick={fecharForm} className="link-muted text-sm px-4 py-2">
                      Fechar
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={fecharForm} className="link-muted text-sm px-4 py-2">
                      Cancelar
                    </button>
                    <button type="submit" disabled={salvando} className="text-sm px-3 py-2 rounded-lg border border-blue-500/30 text-blue-400 hover:text-blue-300 hover:border-blue-400/50 transition-colors disabled:opacity-50">
                      {salvando ? "Salvando..." : "Criar cliente"}
                    </button>
                  </>
                )}
              </div>
            </form>

            {/* Coluna direita — observações */}
            <div className="border-t border-white/10 pt-4 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
              {editando ? (
                <AlterdataObservacoesList clienteId={editando.id} currentEmail={currentEmail} onDirtyChange={marcarSubDirty("obs")} />
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
