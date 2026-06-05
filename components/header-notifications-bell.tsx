"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import type { Chip, ChipEmpresa } from "@prisma/client";

type ChipWithEmpresa = Chip & { empresa: ChipEmpresa };

interface NotificationsData {
  vencidos: ChipWithEmpresa[];
  proximos: ChipWithEmpresa[];
}

function diffDays(chip: ChipWithEmpresa): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(chip.ultimaRecarga);
  venc.setDate(venc.getDate() + chip.duracaoDias);
  venc.setHours(0, 0, 0, 0);
  return Math.round((venc.getTime() - hoje.getTime()) / 86400000);
}

export function HeaderNotificationsBell() {
  const [data, setData] = useState<NotificationsData | null>(null);
  const [open, setOpen] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/chips/notifications");
    if (res.status === 403) { setUnauthorized(true); return; }
    if (!res.ok) return;
    const json = await res.json();
    setData(json);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (unauthorized || !data) return null;

  const total = data.vencidos.length + data.proximos.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 transition text-[#6b8aaa] hover:text-white"
        style={{ background: "rgba(8,15,26,0.5)", border: "1px solid rgba(29,127,229,0.1)" }}
        title="Notificações de recarga"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {total > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-bold"
            style={{
              background: "#E3000F",
              fontSize: "10px",
              minWidth: "16px",
              height: "16px",
              padding: "0 3px",
            }}
          >
            {total}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50 rounded-xl overflow-hidden"
          style={{
            width: "320px",
            background: "rgba(15,23,42,0.97)",
            border: "1px solid rgba(29,127,229,0.2)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-xs font-semibold text-white/80">Recargas de chips</p>
          </div>
          {total === 0 ? (
            <div className="px-4 py-4">
              <p className="text-xs text-white/40">Nenhuma recarga pendente.</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {data.vencidos.map((chip) => {
                const dias = diffDays(chip);
                return (
                  <div key={chip.id} className="px-4 py-3 border-b border-white/5 flex items-start gap-3">
                    <span className="mt-0.5 w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/85 truncate">{chip.empresa.nome}</p>
                      <p className="text-xs text-white/40">{chip.numero}</p>
                    </div>
                    <span className="text-xs text-red-400 shrink-0 mt-0.5">
                      vencido há {Math.abs(dias)} {Math.abs(dias) === 1 ? "dia" : "dias"}
                    </span>
                  </div>
                );
              })}
              {data.proximos.map((chip) => {
                const dias = diffDays(chip);
                return (
                  <div key={chip.id} className="px-4 py-3 border-b border-white/5 flex items-start gap-3">
                    <span className="mt-0.5 w-2 h-2 rounded-full bg-yellow-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/85 truncate">{chip.empresa.nome}</p>
                      <p className="text-xs text-white/40">{chip.numero}</p>
                    </div>
                    <span className="text-xs text-yellow-400 shrink-0 mt-0.5">
                      {dias === 0 ? "vence hoje" : `vence em ${dias} ${dias === 1 ? "dia" : "dias"}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="px-4 py-3 border-t border-white/5">
            <Link
              href="/admin/chips"
              onClick={() => setOpen(false)}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Ver todos os chips →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
