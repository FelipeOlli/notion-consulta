"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SessionRole } from "@/lib/session";

type Props = { role: SessionRole | null };

export function HeaderActions({ role }: Props) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (role === "master") {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/admin/links"
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:text-white"
        >
          Area master
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:text-white"
        >
          Sair
        </button>
      </div>
    );
  }

  if (role === "viewer") {
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

  return (
    <Link
      href="/admin/login"
      className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:text-white"
    >
      Area master
    </Link>
  );
}
