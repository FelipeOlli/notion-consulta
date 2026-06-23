"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HeaderNotificationsBell } from "@/components/header-notifications-bell";
import { MinhaContaModal } from "@/components/minha-conta-modal";

export function PortalHeader() {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  function handleOpenModal() {
    setDropdownOpen(false);
    setModalOpen(true);
  }

  return (
    <>
      <div className="hidden md:flex items-center gap-3">
        <HeaderNotificationsBell />

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={dropdownOpen}
            onClick={() => setDropdownOpen((v) => !v)}
            className="rounded-lg px-4 py-2 text-sm font-medium transition text-[#6b8aaa] hover:text-white"
            style={{
              background: "rgba(8,15,26,0.5)",
              border: "1px solid rgba(29,127,229,0.15)",
            }}
          >
            Minha Conta
          </button>

          {dropdownOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-1 w-44 rounded-xl py-1 z-40"
              style={{
                background: "var(--onity-dark-surface)",
                border: "1px solid rgba(59,130,246,0.2)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleOpenModal}
                className="w-full text-left px-4 py-2 text-sm transition text-[#6b8aaa] hover:text-white hover:bg-white/5"
              >
                Troca de Senha
              </button>
            </div>
          )}
        </div>

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

      <MinhaContaModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
