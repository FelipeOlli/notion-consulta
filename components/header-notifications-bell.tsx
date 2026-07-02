"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import type { Chip, ChipEmpresa } from "@prisma/client";

type ChipWithEmpresa = Chip & { empresa: ChipEmpresa; lido: boolean };

type CertNotif = {
  id: string;
  expiresAt: string;
  lido: boolean;
  company: { legalName: string };
};

interface ChipsData {
  vencidos: ChipWithEmpresa[];
  proximos: ChipWithEmpresa[];
}

interface CertificadosData {
  vencidos: CertNotif[];
  proximos: CertNotif[];
}

function diffDays(chip: ChipWithEmpresa): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(chip.ultimaRecarga);
  venc.setDate(venc.getDate() + chip.duracaoDias);
  venc.setHours(0, 0, 0, 0);
  return Math.round((venc.getTime() - hoje.getTime()) / 86400000);
}

function diffDaysCert(expiresAt: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(expiresAt);
  venc.setHours(0, 0, 0, 0);
  return Math.round((venc.getTime() - hoje.getTime()) / 86400000);
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function UnreadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function HeaderNotificationsBell() {
  const [data, setData] = useState<ChipsData | null>(null);
  const [certData, setCertData] = useState<CertificadosData | null>(null);
  const [dominioTotal, setDominioTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [chipsRes, dominioRes, certRes] = await Promise.all([
      fetch("/api/admin/chips/notifications"),
      fetch("/api/admin/dominio/notifications"),
      fetch("/api/admin/certificados/notifications"),
    ]);

    if (chipsRes.status === 403) { setUnauthorized(true); return; }
    if (chipsRes.ok) setData(await chipsRes.json());
    if (dominioRes.ok) {
      const json = await dominioRes.json();
      setDominioTotal((json as { total: number }).total ?? 0);
    }
    if (certRes.ok) setCertData(await certRes.json());
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markRead(kind: "chip" | "certificado", id: string) {
    await fetch("/api/admin/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, refId: id }),
    });
    if (kind === "chip") {
      setData((prev) => prev ? {
        vencidos: prev.vencidos.map((c) => c.id === id ? { ...c, lido: true } : c),
        proximos: prev.proximos.map((c) => c.id === id ? { ...c, lido: true } : c),
      } : prev);
    } else {
      setCertData((prev) => prev ? {
        vencidos: prev.vencidos.map((c) => c.id === id ? { ...c, lido: true } : c),
        proximos: prev.proximos.map((c) => c.id === id ? { ...c, lido: true } : c),
      } : prev);
    }
  }

  async function markUnread(kind: "chip" | "certificado", id: string) {
    await fetch("/api/admin/notifications/read", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, refId: id }),
    });
    if (kind === "chip") {
      setData((prev) => prev ? {
        vencidos: prev.vencidos.map((c) => c.id === id ? { ...c, lido: false } : c),
        proximos: prev.proximos.map((c) => c.id === id ? { ...c, lido: false } : c),
      } : prev);
    } else {
      setCertData((prev) => prev ? {
        vencidos: prev.vencidos.map((c) => c.id === id ? { ...c, lido: false } : c),
        proximos: prev.proximos.map((c) => c.id === id ? { ...c, lido: false } : c),
      } : prev);
    }
  }

  async function markDominioRead() {
    await fetch("/api/admin/dominio/notifications", { method: "PATCH" });
    setDominioTotal(0);
  }

  if (unauthorized || !data) return null;

  const certVencidos = certData?.vencidos ?? [];
  const certProximos = certData?.proximos ?? [];

  const total =
    data.vencidos.filter((c) => !c.lido).length +
    data.proximos.filter((c) => !c.lido).length +
    dominioTotal +
    certVencidos.filter((c) => !c.lido).length +
    certProximos.filter((c) => !c.lido).length;

  const hasChips = data.vencidos.length > 0 || data.proximos.length > 0;
  const hasCerts = certVencidos.length > 0 || certProximos.length > 0;
  const hasAny = hasChips || hasCerts || dominioTotal > 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 transition text-[#6b8aaa] hover:text-white"
        style={{ background: "rgba(8,15,26,0.5)", border: "1px solid rgba(29,127,229,0.1)" }}
        title="Notificações"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {total > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-bold"
            style={{ background: "#E3000F", fontSize: "10px", minWidth: "16px", height: "16px", padding: "0 3px" }}
          >
            {total}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50 rounded-xl overflow-hidden"
          style={{ width: "320px", background: "rgba(15,23,42,0.97)", border: "1px solid rgba(29,127,246,0.2)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
        >
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-xs font-semibold text-white/80">Notificações</p>
          </div>

          {!hasAny ? (
            <div className="px-4 py-4">
              <p className="text-xs text-white/40">Nenhuma pendência.</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {/* ── Chips ──────────────────────────────────────── */}
              {hasChips && (
                <div className="px-4 py-1.5" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Chips</p>
                </div>
              )}
              {[...data.proximos, ...data.vencidos]
                .sort((a, b) => diffDays(b) - diffDays(a))
                .map((chip) => {
                const dias = diffDays(chip);
                const vencido = dias < 0;
                return (
                  <div key={chip.id} className="border-b border-white/5 flex items-center" style={{ opacity: chip.lido ? 0.45 : 1 }}>
                    <Link
                      href={`/admin/chips#chip-${chip.id}`}
                      onClick={() => setOpen(false)}
                      className="flex-1 flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors min-w-0"
                    >
                      <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${chip.lido ? "bg-white/20" : vencido ? "bg-red-500" : "bg-yellow-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/85 truncate">{chip.empresa.nome}</p>
                        <p className="text-xs text-white/40">{chip.numero}</p>
                      </div>
                      <span className={`text-xs shrink-0 mt-0.5 ${chip.lido ? "text-white/30" : vencido ? "text-red-400" : "text-yellow-400"}`}>
                        {vencido
                          ? `vencido há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`
                          : dias === 0 ? "vence hoje" : `vence em ${dias} ${dias === 1 ? "dia" : "dias"}`}
                      </span>
                    </Link>
                    {!chip.lido ? (
                      <button
                        title="Marcar como lida"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); markRead("chip", chip.id); }}
                        className="px-3 py-3 text-white/25 hover:text-white/70 transition-colors shrink-0"
                      >
                        <CheckIcon />
                      </button>
                    ) : (
                      <button
                        title="Marcar como não lida"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); markUnread("chip", chip.id); }}
                        className="px-3 py-3 text-white/20 hover:text-blue-400 transition-colors shrink-0"
                      >
                        <UnreadIcon />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* ── Certificados ───────────────────────────────── */}
              {hasCerts && (
                <div className="px-4 py-1.5" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Certificados</p>
                </div>
              )}
              {[...certProximos, ...certVencidos]
                .sort((a, b) => diffDaysCert(b.expiresAt) - diffDaysCert(a.expiresAt))
                .map((cert) => {
                const dias = diffDaysCert(cert.expiresAt);
                const vencido = dias < 0;
                return (
                  <div key={cert.id} className="border-b border-white/5 flex items-center" style={{ opacity: cert.lido ? 0.45 : 1 }}>
                    <Link
                      href={`/admin/certificados#certificado-${cert.id}`}
                      onClick={() => setOpen(false)}
                      className="flex-1 flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors min-w-0"
                    >
                      <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${cert.lido ? "bg-white/20" : vencido ? "bg-red-500" : "bg-yellow-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/85 truncate">{cert.company.legalName}</p>
                        <p className="text-xs text-white/40">Certificado digital</p>
                      </div>
                      <span className={`text-xs shrink-0 mt-0.5 ${cert.lido ? "text-white/30" : vencido ? "text-red-400" : "text-yellow-400"}`}>
                        {vencido
                          ? `vencido há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`
                          : dias === 0 ? "vence hoje" : `vence em ${dias} ${dias === 1 ? "dia" : "dias"}`}
                      </span>
                    </Link>
                    {!cert.lido ? (
                      <button
                        title="Marcar como lida"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); markRead("certificado", cert.id); }}
                        className="px-3 py-3 text-white/25 hover:text-white/70 transition-colors shrink-0"
                      >
                        <CheckIcon />
                      </button>
                    ) : (
                      <button
                        title="Marcar como não lida"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); markUnread("certificado", cert.id); }}
                        className="px-3 py-3 text-white/20 hover:text-blue-400 transition-colors shrink-0"
                      >
                        <UnreadIcon />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Domínio ──────────────────────────────────────── */}
          {dominioTotal > 0 && (
            <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                <p className="text-sm text-white/85">
                  {dominioTotal} resposta{dominioTotal > 1 ? "s" : ""} de SSC
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  title="Marcar como lida"
                  onClick={markDominioRead}
                  className="text-white/25 hover:text-white/70 transition-colors"
                >
                  <CheckIcon />
                </button>
                <Link
                  href="/admin/dominio"
                  onClick={() => setOpen(false)}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Ver →
                </Link>
              </div>
            </div>
          )}

          {/* ── Footer ───────────────────────────────────────── */}
          <div className="px-4 py-3 border-t border-white/5 flex flex-col gap-1.5">
            <Link
              href="/admin/chips"
              onClick={() => setOpen(false)}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Ver todos os chips →
            </Link>
            {certData !== null && (
              <Link
                href="/admin/certificados"
                onClick={() => setOpen(false)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Ver todos os certificados →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
