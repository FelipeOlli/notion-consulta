"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import type { AppModule } from "@/lib/modules";
import { moduleLabels, appModules } from "@/lib/modules";
import { moduleHrefs } from "@/lib/portal-modules";
import { PortalHeader } from "@/components/portal-header";

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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const visibleModules = appModules.filter((m) => modules.includes(m));

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav className="mb-6 flex items-center gap-3">
      {/* Esquerda: Início + Módulos */}
      <div className="flex items-center gap-2 flex-1">
        <Link
          href="/admin"
          className={itemClass(pathname === "/admin")}
          style={itemStyle(pathname === "/admin")}
        >
          Início
        </Link>

        {visibleModules.length > 0 && (
          <div ref={ref} className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className={itemClass(open)}
              style={itemStyle(open)}
            >
              Módulos ▾
            </button>

            {open && (
              <div
                className="absolute left-0 top-full mt-2 z-50 rounded-xl overflow-hidden"
                style={{
                  minWidth: "220px",
                  background: "rgba(15,23,42,0.97)",
                  border: "1px solid rgba(29,127,229,0.2)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
              >
                {visibleModules.map((m) => {
                  const href = moduleHrefs[m];
                  const active = pathname.startsWith(href);
                  return (
                    <Link
                      key={m}
                      href={href}
                      onClick={() => setOpen(false)}
                      className="flex items-center px-4 py-2.5 text-sm transition-colors"
                      style={{
                        color: active ? "white" : "#94a3b8",
                        background: active ? "rgba(29,127,229,0.15)" : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) e.currentTarget.style.color = "white";
                        if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      }}
                      onMouseLeave={(e) => {
                        if (!active) e.currentTarget.style.color = "#94a3b8";
                        if (!active) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {moduleLabels[m]}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Direita: sino + Sair */}
      <PortalHeader />
    </nav>
  );
}
