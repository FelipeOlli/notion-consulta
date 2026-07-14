"use client";

export function ScrumhubTicketIframeModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Fechar"
        >
          ✕
        </button>
        <iframe src={url} title="ScrumHub — Ticket" className="h-full w-full border-0" allow="clipboard-write" />
      </div>
    </div>
  );
}
