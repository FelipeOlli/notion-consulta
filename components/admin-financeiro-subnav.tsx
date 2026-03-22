"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function linkClass(active: boolean) {
  return [
    "rounded-lg px-3 py-2 text-sm font-medium transition",
    active ? "bg-sky-500/20 text-sky-200" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200",
  ].join(" ");
}

export function AdminFinanceiroSubNav() {
  const pathname = usePathname();
  const dash = pathname === "/admin/financeiro";
  const log = pathname === "/admin/financeiro/log";

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-4" aria-label="Financeiro">
      <Link href="/admin/financeiro" className={linkClass(dash)}>
        Dashboard
      </Link>
      <Link href="/admin/financeiro/log" className={linkClass(log)}>
        Registro de atividades
      </Link>
    </nav>
  );
}
