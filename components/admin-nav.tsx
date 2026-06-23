"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { AppModule } from "@/lib/modules";
import { moduleLabels, appModules } from "@/lib/modules";
import { moduleHrefs } from "@/lib/portal-modules";
import { PortalHeader } from "@/components/portal-header";
import { HeaderNotificationsBell } from "@/components/header-notifications-bell";
import { MinhaContaModal } from "@/components/minha-conta-modal";

type Props = {
  modules: AppModule[];
};

function itemClass(active: boolean) {
  return active
    ? "rounded-lg px-3 py-2 text-sm font-medium transition text-white"
    : "rounded-lg px-3 py-2 text-sm font-medium transition text-[#6b8aaa] hover:text-white";
}

function itemStyle(active: boolean): React.CSSProperties {
  return active
    ? { background: "rgba(29,127,229,0.15)", border: "1px solid rgba(29,127,229,0.4)" }
    : { background: "rgba(8,15,26,0.5)", border: "1px solid rgba(29,127,229,0.1)" };
}

export function AdminNav({ modules }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [minhaContaOpen, setMinhaContaOpen] = useState(false);

  const visibleModules = appModules.filter((m) => modules.includes(m));

  // Fechar drawer com Esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <nav className="mb-6 flex items-center justify-between">
        {/* Esquerda: apenas Início */}
        <Link
          href="/admin"
          className={itemClass(pathname === "/admin")}
          style={itemStyle(pathname === "/admin")}
        >
          Início
        </Link>

        {/* Direita: sino sempre visível + PortalHeader (oculto em mobile) + hamburger */}
        <div className="flex items-center gap-2">
          <span className="md:hidden"><HeaderNotificationsBell /></span>
          <PortalHeader />

          <button
            aria-label="Abrir menu"
            onClick={() => setDrawerOpen(true)}
            className={itemClass(false)}
            style={itemStyle(false)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Drawer lateral à direita */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDrawerOpen(false); }}
        >
          <div
            style={{
              width: "min(320px, 100vw)",
              height: "100%",
              background: "#0f172a",
              borderLeft: "1px solid rgba(29,127,229,0.2)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Cabeçalho do drawer */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: "1px solid rgba(29,127,229,0.15)" }}
            >
              <span className="text-sm font-semibold text-white tracking-wide uppercase" style={{ letterSpacing: "0.08em" }}>
                Menu
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-[#6b8aaa] hover:text-white transition text-lg leading-none"
                aria-label="Fechar menu"
              >
                ×
              </button>
            </div>

            {/* Corpo rolável */}
            <div className="flex-1 overflow-y-auto py-3 px-3">

              {/* ── Seção MÓDULOS ─────────────────────────────── */}
              <p className="px-4 pb-1 pt-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.5)" }}>
                Módulos
              </p>

              {/* Início */}
              <Link
                href="/admin"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center px-4 py-2.5 rounded-lg text-sm transition-colors mb-1"
                style={{
                  color: pathname === "/admin" ? "white" : "#94a3b8",
                  background: pathname === "/admin" ? "rgba(29,127,229,0.15)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (pathname !== "/admin") {
                    e.currentTarget.style.color = "white";
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (pathname !== "/admin") {
                    e.currentTarget.style.color = "#94a3b8";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                Início
              </Link>

              {/* Todos os módulos do usuário */}
              {visibleModules.map((m) => {
                const href = moduleHrefs[m];
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={m}
                    href={href}
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center px-4 py-2.5 rounded-lg text-sm transition-colors mb-1"
                    style={{
                      color: active ? "white" : "#94a3b8",
                      background: active ? "rgba(29,127,229,0.15)" : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.color = "white";
                        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.color = "#94a3b8";
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {moduleLabels[m]}
                  </Link>
                );
              })}

              {/* ── Seção CONTA (só mobile, hidden em md+) ─────── */}
              <div className="md:hidden mt-3 pt-3" style={{ borderTop: "1px solid rgba(29,127,229,0.15)" }}>
                <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.5)" }}>
                  Conta
                </p>

                {/* Troca de Senha */}
                <button
                  type="button"
                  onClick={() => { setMinhaContaOpen(true); setDrawerOpen(false); }}
                  className="w-full flex items-center px-4 py-2.5 rounded-lg text-sm transition-colors mb-1 text-left"
                  style={{ color: "#94a3b8" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "white";
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#94a3b8";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  Minha Conta
                </button>

                {/* Sair */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-2.5 rounded-lg text-sm transition-colors mb-1 text-left"
                  style={{ color: "#94a3b8" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "white";
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#94a3b8";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  Sair
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal de troca de senha (aberto pelo item do drawer) */}
      <MinhaContaModal open={minhaContaOpen} onClose={() => setMinhaContaOpen(false)} />
    </>
  );
}
