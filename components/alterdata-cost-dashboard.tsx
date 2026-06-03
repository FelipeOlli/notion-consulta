"use client";

import { useMemo } from "react";
import type { AlterdataCliente, AlterdataClienteStatus } from "@prisma/client";
import {
  BACKOFFICE_UNIT_PRICE,
  FRANQUEADO_UNIT_PRICE,
  formatBRL,
  monthlyCost,
  annualCost,
} from "@/lib/alterdata-pricing";

const STATUS_LABELS: Record<AlterdataClienteStatus, string> = {
  ATIVO: "Ativo",
  EM_ANDAMENTO: "Em Andamento",
  INATIVO: "Inativo",
  INADIMPLENTE: "Inadimplente",
  CONGELADO: "Congelado",
  DISTRATADO: "Distratado",
};

const STATUS_COLORS: Record<AlterdataClienteStatus, string> = {
  ATIVO: "bg-emerald-500",
  EM_ANDAMENTO: "bg-yellow-500",
  INATIVO: "bg-slate-500",
  INADIMPLENTE: "bg-red-500",
  CONGELADO: "bg-blue-500",
  DISTRATADO: "bg-orange-500",
};

const ACTIVE_STATUSES: AlterdataClienteStatus[] = ["ATIVO", "EM_ANDAMENTO", "INADIMPLENTE", "CONGELADO"];
const ALL_STATUSES: AlterdataClienteStatus[] = ["ATIVO", "EM_ANDAMENTO", "INATIVO", "INADIMPLENTE", "CONGELADO", "DISTRATADO"];

interface Props {
  clientes: AlterdataCliente[];
}

export function AlterdataCostDashboard({ clientes }: Props) {
  const stats = useMemo(() => {
    const totalBackoffice = clientes.reduce((s, c) => s + c.acessosBackoffice, 0);
    const totalFranqueado = clientes.reduce((s, c) => s + c.acessosFranqueado, 0);

    const activeBackoffice = clientes
      .filter((c) => ACTIVE_STATUSES.includes(c.status))
      .reduce((s, c) => s + c.acessosBackoffice, 0);

    const byStatus = ALL_STATUSES.map((s) => {
      const acessos = clientes.filter((c) => c.status === s).reduce((sum, c) => sum + c.acessosBackoffice, 0);
      return { status: s, acessos, custo: monthlyCost(acessos) };
    });

    const maxCusto = Math.max(...byStatus.map((b) => b.custo), 1);

    const top5 = [...clientes]
      .filter((c) => c.acessosBackoffice > 0)
      .sort((a, b) => b.acessosBackoffice - a.acessosBackoffice)
      .slice(0, 5);

    return {
      totalBackoffice,
      totalFranqueado,
      activeBackoffice,
      mensalBackoffice: monthlyCost(activeBackoffice),
      anualBackoffice: annualCost(activeBackoffice),
      mensalFranqueado: activeBackoffice > 0 ? totalFranqueado * FRANQUEADO_UNIT_PRICE : 0,
      byStatus,
      maxCusto,
      top5,
    };
  }, [clientes]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="section-label">Custos Operacionais</span>
        <span className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
          Backoffice · R$ {BACKOFFICE_UNIT_PRICE}/acesso/mês
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="glass-card border border-violet-500/30 p-5">
          <p className="text-xs font-medium mb-2" style={{ color: "var(--onity-dark-text-muted)" }}>
            Acessos Backoffice (ativos)
          </p>
          <p className="text-3xl font-bold text-white">{stats.activeBackoffice}</p>
          <p className="text-xs mt-1" style={{ color: "var(--onity-dark-text-muted)" }}>
            {stats.totalBackoffice} no total (todos os status)
          </p>
        </div>

        <div className="glass-card border border-blue-500/30 p-5">
          <p className="text-xs font-medium mb-2" style={{ color: "var(--onity-dark-text-muted)" }}>
            Custo Mensal Estimado
          </p>
          <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
            {formatBRL(stats.mensalBackoffice)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--onity-dark-text-muted)" }}>
            backoffice · status ativos/em andamento/inadimplente/congelado
          </p>
        </div>

        <div className="glass-card border border-violet-500/30 p-5">
          <p className="text-xs font-medium mb-2" style={{ color: "var(--onity-dark-text-muted)" }}>
            Projeção Anual
          </p>
          <p className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            {formatBRL(stats.anualBackoffice)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--onity-dark-text-muted)" }}>
            mensal × 12 meses
          </p>
        </div>
      </div>

      {/* Breakdown + Top 5 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Barras por status */}
        <div className="glass-card p-5 space-y-3">
          <p className="text-xs font-semibold text-white/80">Custo por status</p>
          {stats.byStatus.map(({ status, acessos, custo }) => {
            const pct = stats.maxCusto > 0 ? (custo / stats.maxCusto) * 100 : 0;
            return (
              <div key={status} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--onity-dark-text-muted)" }}>{STATUS_LABELS[status]}</span>
                  <span className="text-white/70">
                    {acessos} {acessos === 1 ? "acesso" : "acessos"} · {formatBRL(custo)}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${STATUS_COLORS[status]} opacity-70 transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Top 5 clientes */}
        <div className="glass-card p-5 space-y-3">
          <p className="text-xs font-semibold text-white/80">Top 5 clientes por acessos backoffice</p>
          {stats.top5.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
              Nenhum cliente com acessos backoffice.
            </p>
          ) : (
            <div className="space-y-2">
              {stats.top5.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold w-4 text-white/30">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">{c.nome}</p>
                    {c.unidade && (
                      <p className="text-xs truncate" style={{ color: "var(--onity-dark-text-muted)" }}>
                        {c.unidade}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-white/90">{formatBRL(monthlyCost(c.acessosBackoffice))}</p>
                    <p className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
                      {c.acessosBackoffice} acessos
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
