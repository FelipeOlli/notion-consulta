"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { AppModule } from "@/lib/modules";

type Props = {
  modules: AppModule[];
};

function itemClass(active: boolean) {
  return [
    "rounded-lg border px-3 py-2 text-sm font-medium transition",
    active
      ? "border-sky-400/70 bg-sky-500/10 text-sky-200"
      : "border-slate-700 text-slate-100 hover:border-slate-400 hover:text-white",
  ].join(" ");
}

export function AdminNav({ modules }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const can = (moduleKey: AppModule) => modules.includes(moduleKey);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        <Link href="/admin" className={itemClass(pathname === "/admin")}>
          Início
        </Link>
        {can("senha") ? (
          <Link href="/admin/links" className={itemClass(pathname === "/admin/links")}>
            Acessos
          </Link>
        ) : null}
        {can("certificados") ? (
          <Link href="/admin/certificados" className={itemClass(pathname === "/admin/certificados")}>
            Certificados
          </Link>
        ) : null}
        {can("financeiro") ? (
          <Link href="/admin/financeiro" className={itemClass(pathname === "/admin/financeiro")}>
            Financeiro
          </Link>
        ) : null}
        {can("usuarios") ? (
          <Link href="/admin/usuarios" className={itemClass(pathname === "/admin/usuarios")}>
            E-mails cadastrados
          </Link>
        ) : null}
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-red-400/80 hover:bg-red-950/40 hover:text-red-200"
      >
        Sair
      </button>
    </nav>
  );
}
