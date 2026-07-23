"use client";

import { useState } from "react";
import { DominioDashboard } from "@/components/dominio-dashboard";
import { TransbordoDashboard } from "@/components/transbordo-dashboard";
import type { DominioSsc } from "@prisma/client";

type SscWithCount = DominioSsc & { _count: { updates: number } };

interface BadgeColor {
  id: number;
  label: string;
  hexValue: string;
  createdAt: string;
}

interface StatusOption {
  id: number;
  label: string;
  value: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

interface Ticket {
  id: string;
  franchiseName: string;
  sistemaOrigem: string | null;
  systems: string[];
  status: string;
  statusColorId: number | null;
  statusColor: BadgeColor | null;
  progress: number;
  companies: number | null;
  request: string | null;
  ticketTransbordoNo: string | null;
  lembrete: string | null;
  agendado: string | null;
  solicitacao: string | null;
  ssc: string | null;
  tempoMigracao: string | null;
  totalDays: number | null;
  prevDays: number | null;
  workDays: number | null;
  dConcluido: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { comments: number };
}

interface SistemaOrigemOption {
  id: number;
  label: string;
  createdAt: string;
}

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialSscs: any[];
  initialTickets: Ticket[];
  initialBadgeColors: BadgeColor[];
  initialStatusOptions: StatusOption[];
  initialSistemaOrigemOptions: SistemaOrigemOption[];
  isMaster: boolean;
}

const TABS = [
  { key: "ssc", label: "SSC" },
  { key: "transbordo", label: "Transbordo" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export function DominioTabs({
  initialSscs,
  initialTickets,
  initialBadgeColors,
  initialStatusOptions,
  initialSistemaOrigemOptions,
  isMaster,
}: Props) {
  const [tab, setTab] = useState<Tab>("ssc");

  return (
    <>
      {/* ── Tab bar ── */}
      <div
        className="flex gap-1 mb-6 p-1 rounded-xl"
        style={{ background: "rgba(255,255,255,.04)", width: "fit-content" }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={
              tab === t.key
                ? {
                    background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
                    color: "#fff",
                  }
                : {
                    color: "var(--onity-dark-text-muted)",
                  }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {tab === "ssc" && (
        <DominioDashboard initialSscs={initialSscs as SscWithCount[]} />
      )}
      {tab === "transbordo" && (
        <TransbordoDashboard
          initialTickets={initialTickets}
          initialBadgeColors={initialBadgeColors}
          initialStatusOptions={initialStatusOptions}
          initialSistemaOrigemOptions={initialSistemaOrigemOptions}
          isMaster={isMaster}
        />
      )}
    </>
  );
}
