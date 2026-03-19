"use client";

import { useRouter } from "next/navigation";

export function PortalHeader() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:text-white"
    >
      Sair
    </button>
  );
}
