"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import type { AppModule } from "@/lib/modules";
import { moduleLabels, appModules } from "@/lib/modules";
import { moduleHrefs } from "@/lib/portal-modules";
import { PortalHeader } from "@/components/portal-header";

type Props = {
  modules: AppModule[];
};

const GAP = 8; // px entre itens
const MORE_BTN_W = 88; // largura reservada para o botão "Mais ▾"
const INICIO_W = 80; // largura aproximada do botão "Início"

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
  const [visibleCount, setVisibleCount] = useState<number>(999);
  const [open, setOpen] = useState(false);

  const navRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  // refs para medir largura de cada link do hidden container
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const dropRef = useRef<HTMLDivElement>(null);

  const visibleModules = appModules.filter((m) => modules.includes(m));

  const recalc = useCallback(() => {
    if (!navRef.current || !rightRef.current) return;

    const totalWidth = navRef.current.offsetWidth;
    const rightWidth = rightRef.current.offsetWidth;
    // espaço disponível para lado esquerdo (Início + módulos + "Mais ▾")
    const available = totalWidth - rightWidth - GAP * 2;
    // desconta Início + gap
    let used = INICIO_W + GAP;

    let count = 0;
    for (let i = 0; i < visibleModules.length; i++) {
      const el = itemRefs.current[i];
      if (!el) continue;
      const w = el.offsetWidth;
      // verifica se este item + possível "Mais ▾" cabe
      const needsMore = i < visibleModules.length - 1;
      const needed = used + w + GAP + (needsMore ? MORE_BTN_W + GAP : 0);
      if (needed > available) break;
      used += w + GAP;
      count++;
    }

    setVisibleCount(count);
  }, [visibleModules]);

  useEffect(() => {
    if (!navRef.current) return;
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [recalc]);

  // fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const overflowModules = visibleModules.slice(visibleCount);
  const hasOverflow = overflowModules.length > 0;
  const overflowActive = overflowModules.some((m) => pathname.startsWith(moduleHrefs[m]));

  return (
    <nav ref={navRef} className="mb-6 flex items-center gap-2" style={{ position: "relative" }}>
      {/* Lado esquerdo */}
      <div ref={leftRef} className="flex items-center gap-2 flex-1 overflow-hidden">
        {/* Início sempre visível */}
        <Link
          href="/admin"
          className={itemClass(pathname === "/admin")}
          style={itemStyle(pathname === "/admin")}
        >
          Início
        </Link>

        {/* Módulos visíveis */}
        {visibleModules.slice(0, visibleCount).map((m) => {
          const href = moduleHrefs[m];
          const active = pathname.startsWith(href);
          return (
            <Link key={m} href={href} className={itemClass(active)} style={itemStyle(active)}>
              {moduleLabels[m]}
            </Link>
          );
        })}

        {/* Botão "Mais ▾" com overflow */}
        {hasOverflow && (
          <div ref={dropRef} className="relative shrink-0">
            <button
              onClick={() => setOpen((v) => !v)}
              className={itemClass(open || overflowActive)}
              style={itemStyle(open || overflowActive)}
            >
              Mais ▾
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
                {overflowModules.map((m) => {
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
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lado direito: sino + Sair */}
      <div ref={rightRef} className="shrink-0">
        <PortalHeader />
      </div>

      {/* Container hidden para medir larguras */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          visibility: "hidden",
          pointerEvents: "none",
          display: "flex",
          gap: `${GAP}px`,
          top: 0,
          left: 0,
        }}
      >
        {visibleModules.map((m, i) => (
          <a
            key={m}
            ref={(el) => { itemRefs.current[i] = el; }}
            className={itemClass(false)}
            style={itemStyle(false)}
          >
            {moduleLabels[m]}
          </a>
        ))}
      </div>
    </nav>
  );
}
