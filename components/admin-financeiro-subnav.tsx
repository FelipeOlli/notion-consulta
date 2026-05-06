"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function linkClass(active: boolean) {
  return [
    "rounded-lg px-3 py-2 text-sm font-medium transition",
    active ? "text-white" : "text-[#6b8aaa] hover:text-white",
  ].join(" ");
}

function linkStyle(active: boolean): React.CSSProperties {
  return active
    ? { background: "rgba(29,127,229,0.15)", border: "1px solid rgba(29,127,229,0.3)" }
    : { background: "transparent", border: "1px solid transparent" };
}

export function AdminFinanceiroSubNav() {
  const pathname = usePathname();
  const dash = pathname === "/admin/financeiro";
  const log = pathname === "/admin/financeiro/log";

  return (
    <nav
      className="mb-6 flex flex-wrap gap-2 pb-4"
      style={{ borderBottom: "1px solid rgba(29,127,229,0.12)" }}
      aria-label="Financeiro"
    >
      <Link href="/admin/financeiro" className={linkClass(dash)} style={linkStyle(dash)}>
        Dashboard
      </Link>
      <Link href="/admin/financeiro/log" className={linkClass(log)} style={linkStyle(log)}>
        Registro de atividades
      </Link>
    </nav>
  );
}
