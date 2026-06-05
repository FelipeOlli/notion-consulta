"use client";

import { useState, useCallback } from "react";
import type { Chip, ChipEmpresa, ChipOperadora } from "@prisma/client";
import { ChipOperadoraLogo, OPERADORA_LABELS } from "@/components/chips-operator-logo";

type ChipWithEmpresa = Chip & { empresa: ChipEmpresa };

const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

const OPERADORAS: ChipOperadora[] = ["CLARO", "TIM", "VIVO", "OI"];

function calcVencimento(chip: Chip): Date {
  const d = new Date(chip.ultimaRecarga);
  d.setDate(d.getDate() + chip.duracaoDias);
  return d;
}

function diffDays(vencimento: Date): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const v = new Date(vencimento);
  v.setHours(0, 0, 0, 0);
  return Math.round((v.getTime() - hoje.getTime()) / 86400000);
}

function StatusBadge({ chip }: { chip: Chip }) {
  const venc = calcVencimento(chip);
  const dias = diffDays(venc);

  if (dias < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-red-500/15 text-red-400">
        vencido há {Math.abs(dias)}d
      </span>
    );
  }
  if (dias <= 3) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-500/15 text-yellow-400">
        {dias === 0 ? "vence hoje" : `vence em ${dias}d`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-500/15 text-emerald-400">
      {fmt.format(venc)}
    </span>
  );
}

interface ModalState {
  id?: string;
  numero: string;
  operadora: ChipOperadora;
  empresaId: string;
  ultimaRecarga: string;
  duracaoDias: string;
}

const EMPTY_MODAL: ModalState = {
  numero: "",
  operadora: "CLARO",
  empresaId: "",
  ultimaRecarga: new Date().toISOString().slice(0, 10),
  duracaoDias: "30",
};

interface Props {
  initialChips: ChipWithEmpresa[];
  initialEmpresas: ChipEmpresa[];
}

export function ChipsDashboard({ initialChips, initialEmpresas }: Props) {
  const [chips, setChips] = useState<ChipWithEmpresa[]>(initialChips);
  const [empresas, setEmpresas] = useState<ChipEmpresa[]>(initialEmpresas);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [recarregando, setRecarregando] = useState<string | null>(null);
  const [novaEmpresa, setNovaEmpresa] = useState("");
  const [adicionandoEmpresa, setAdicionandoEmpresa] = useState(false);
  const [excluindoEmpresa, setExcluindoEmpresa] = useState<string | null>(null);
  const [erroEmpresa, setErroEmpresa] = useState("");
  const [gerenciarEmpresas, setGerenciarEmpresas] = useState(false);

  const reloadChips = useCallback(async () => {
    const res = await fetch("/api/admin/chips");
    const data = await res.json();
    setChips(Array.isArray(data) ? data : []);
  }, []);

  const reloadEmpresas = useCallback(async () => {
    const res = await fetch("/api/admin/chips/empresas");
    const data = await res.json();
    setEmpresas(Array.isArray(data) ? data : []);
  }, []);

  function abrirNovo() {
    setModal({ ...EMPTY_MODAL, empresaId: empresas[0]?.id ?? "" });
  }

  function abrirEditar(c: ChipWithEmpresa) {
    setModal({
      id: c.id,
      numero: c.numero,
      operadora: c.operadora,
      empresaId: c.empresaId,
      ultimaRecarga: new Date(c.ultimaRecarga).toISOString().slice(0, 10),
      duracaoDias: String(c.duracaoDias),
    });
  }

  async function salvar() {
    if (!modal) return;
    setSalvando(true);
    const body = {
      numero: modal.numero,
      operadora: modal.operadora,
      empresaId: modal.empresaId,
      ultimaRecarga: modal.ultimaRecarga,
      duracaoDias: Number(modal.duracaoDias),
    };
    if (modal.id) {
      await fetch(`/api/admin/chips/${modal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/admin/chips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    await reloadChips();
    setModal(null);
    setSalvando(false);
  }

  async function excluir(id: string) {
    setExcluindo(id);
    await fetch(`/api/admin/chips/${id}`, { method: "DELETE" });
    await reloadChips();
    setExcluindo(null);
  }

  async function recarregar(id: string) {
    setRecarregando(id);
    await fetch(`/api/admin/chips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recarregarAgora: true }),
    });
    await reloadChips();
    setRecarregando(null);
  }

  async function adicionarEmpresa() {
    if (!novaEmpresa.trim()) return;
    setAdicionandoEmpresa(true);
    setErroEmpresa("");
    const res = await fetch("/api/admin/chips/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novaEmpresa }),
    });
    if (!res.ok) {
      setErroEmpresa("Erro ao adicionar empresa.");
    } else {
      setNovaEmpresa("");
      await reloadEmpresas();
    }
    setAdicionandoEmpresa(false);
  }

  async function excluirEmpresa(id: string) {
    setExcluindoEmpresa(id);
    const res = await fetch(`/api/admin/chips/empresas/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.message ?? "Erro ao excluir empresa.");
    } else {
      await reloadEmpresas();
    }
    setExcluindoEmpresa(null);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <span className="section-label">Chips de Telefone</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGerenciarEmpresas((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white/80 transition-colors"
          >
            Empresas
          </button>
          <button onClick={abrirNovo} className="btn-primary text-sm px-4 py-2">
            + Novo chip
          </button>
        </div>
      </div>

      {/* Gerenciar empresas */}
      {gerenciarEmpresas && (
        <div className="glass-card p-4 space-y-3">
          <p className="text-xs font-semibold text-white/80">Gerenciar empresas</p>
          <div className="flex gap-2">
            <input
              className="ds-input flex-1 text-sm"
              placeholder="Nome da empresa"
              value={novaEmpresa}
              onChange={(e) => setNovaEmpresa(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") adicionarEmpresa(); }}
            />
            <button
              onClick={adicionarEmpresa}
              disabled={adicionandoEmpresa || !novaEmpresa.trim()}
              className="text-xs px-3 py-1.5 rounded-lg border border-blue-500/30 text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-40"
            >
              {adicionandoEmpresa ? "..." : "+ Adicionar"}
            </button>
          </div>
          {erroEmpresa && <p className="text-xs text-red-400">{erroEmpresa}</p>}
          <div className="space-y-1.5">
            {empresas.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5">
                <span className="text-sm text-white/80">{e.nome}</span>
                <button
                  onClick={() => excluirEmpresa(e.id)}
                  disabled={excluindoEmpresa === e.id}
                  className="text-red-400/50 hover:text-red-400 transition-colors disabled:opacity-40"
                  title="Excluir empresa"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            {empresas.length === 0 && (
              <p className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>Nenhuma empresa cadastrada.</p>
            )}
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="glass-card overflow-hidden">
        {chips.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
              Nenhum chip cadastrado. Clique em "+ Novo chip" para começar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/40">Empresa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/40">Número</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/40">Operadora</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/40">Última recarga</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/40">Próxima recarga</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-white/40">Ações</th>
                </tr>
              </thead>
              <tbody>
                {chips.map((c) => (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-white/80 text-sm">{c.empresa.nome}</td>
                    <td className="px-4 py-3 text-white/70 font-mono text-sm">{c.numero}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ChipOperadoraLogo operadora={c.operadora} size={22} />
                        <span className="text-xs text-white/60">{OPERADORA_LABELS[c.operadora]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/50 text-xs">{fmt.format(new Date(c.ultimaRecarga))}</td>
                    <td className="px-4 py-3">
                      <StatusBadge chip={c} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => recarregar(c.id)}
                          disabled={recarregando === c.id}
                          className="text-xs px-2 py-1 rounded border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 hover:border-emerald-400/50 transition-colors disabled:opacity-40"
                          title="Recarregar agora"
                        >
                          {recarregando === c.id ? "..." : "Recarregar"}
                        </button>
                        <button
                          onClick={() => abrirEditar(c)}
                          className="text-white/30 hover:text-white/70 transition-colors"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => excluir(c.id)}
                          disabled={excluindo === c.id}
                          className="text-red-400/50 hover:text-red-400 transition-colors disabled:opacity-40"
                          title="Excluir"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ background: "var(--onity-dark-surface)", border: "1px solid rgba(59,130,246,0.2)" }}
          >
            <p className="text-base font-semibold text-white">{modal.id ? "Editar chip" : "Novo chip"}</p>

            <div className="space-y-3">
              {/* Empresa */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--onity-dark-text-muted)" }}>Empresa</label>
                <select
                  className="ds-input w-full text-sm"
                  value={modal.empresaId}
                  onChange={(e) => setModal((m) => m ? { ...m, empresaId: e.target.value } : m)}
                >
                  <option value="">Selecione...</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.nome}</option>
                  ))}
                </select>
                {empresas.length === 0 && (
                  <p className="text-xs text-yellow-400 mt-1">Cadastre uma empresa primeiro usando o botão "Empresas".</p>
                )}
              </div>

              {/* Número */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--onity-dark-text-muted)" }}>Número</label>
                <input
                  className="ds-input w-full text-sm"
                  placeholder="(11) 99999-9999"
                  value={modal.numero}
                  onChange={(e) => setModal((m) => m ? { ...m, numero: e.target.value } : m)}
                />
              </div>

              {/* Operadora */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--onity-dark-text-muted)" }}>Operadora</label>
                <select
                  className="ds-input w-full text-sm"
                  value={modal.operadora}
                  onChange={(e) => setModal((m) => m ? { ...m, operadora: e.target.value as ChipOperadora } : m)}
                >
                  {OPERADORAS.map((op) => (
                    <option key={op} value={op}>{OPERADORA_LABELS[op]}</option>
                  ))}
                </select>
              </div>

              {/* Duração + Última recarga */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "var(--onity-dark-text-muted)" }}>Duração (dias)</label>
                  <input
                    type="number"
                    min={1}
                    className="ds-input w-full text-sm"
                    value={modal.duracaoDias}
                    onChange={(e) => setModal((m) => m ? { ...m, duracaoDias: e.target.value } : m)}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "var(--onity-dark-text-muted)" }}>Última recarga</label>
                  <input
                    type="date"
                    className="ds-input w-full text-sm"
                    value={modal.ultimaRecarga}
                    onChange={(e) => setModal((m) => m ? { ...m, ultimaRecarga: e.target.value } : m)}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setModal(null)}
                className="text-sm px-4 py-2 rounded-lg text-white/50 hover:text-white/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando || !modal.numero.trim() || !modal.empresaId || !modal.duracaoDias}
                className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
