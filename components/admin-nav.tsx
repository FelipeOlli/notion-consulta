"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { AppModule } from "@/lib/modules";

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
    ? {
        background: "rgba(29,127,229,0.15)",
        border: "1px solid rgba(29,127,229,0.4)",
      }
    : {
        background: "rgba(8,15,26,0.5)",
        border: "1px solid rgba(29,127,229,0.1)",
      };
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
        <Link href="/admin" className={itemClass(pathname === "/admin")} style={itemStyle(pathname === "/admin")}>
          Início
        </Link>
        {can("senha") ? (
          <Link href="/admin/links" className={itemClass(pathname === "/admin/links")} style={itemStyle(pathname === "/admin/links")}>
            Acessos
          </Link>
        ) : null}
        {can("certificados") ? (
          <Link href="/admin/certificados" className={itemClass(pathname === "/admin/certificados")} style={itemStyle(pathname === "/admin/certificados")}>
            Certificados
          </Link>
        ) : null}
        {can("financeiro") ? (
          <Link href="/admin/financeiro" className={itemClass(pathname === "/admin/financeiro")} style={itemStyle(pathname === "/admin/financeiro")}>
            Financeiro
          </Link>
        ) : null}
        {can("usuarios") ? (
          <Link href="/admin/usuarios" className={itemClass(pathname === "/admin/usuarios")} style={itemStyle(pathname === "/admin/usuarios")}>
            E-mails cadastrados
          </Link>
        ) : null}
        {can("cadastro_empresa") ? (
          <Link href="/admin/cadastro-empresa" className={itemClass(pathname === "/admin/cadastro-empresa")} style={itemStyle(pathname === "/admin/cadastro-empresa")}>
            Cadastro de empresa
          </Link>
        ) : null}
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg px-3 py-2 text-sm font-medium transition text-[#6b8aaa] hover:text-[#ff453a]"
        style={{ background: "rgba(8,15,26,0.5)", border: "1px solid rgba(29,127,229,0.1)" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,69,58,0.08)";
          e.currentTarget.style.borderColor = "rgba(255,69,58,0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(8,15,26,0.5)";
          e.currentTarget.style.borderColor = "rgba(29,127,229,0.1)";
        }}
      >
        Sair
      </button>
    </nav>
  );
}
