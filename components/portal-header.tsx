"use client";

import { useRouter } from "next/navigation";
import { HeaderNotificationsBell } from "@/components/header-notifications-bell";

export function PortalHeader() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <HeaderNotificationsBell />
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg px-4 py-2 text-sm font-medium transition text-[#6b8aaa] hover:text-white"
        style={{
          background: "rgba(8,15,26,0.5)",
          border: "1px solid rgba(29,127,229,0.15)",
        }}
      >
        Sair
      </button>
    </div>
  );
}
