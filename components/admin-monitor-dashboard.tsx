"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmModal } from "@/components/confirm-modal";

type MonitorStatus = "UP" | "DOWN" | "PENDING";

type Monitor = {
  id: string;
  name: string;
  host: string;
  port: number | null;
  type: "HTTP" | "TCP" | "PING";
  active: boolean;
  interval: number;
  lastStatus: MonitorStatus;
  lastChecked: string | null;
  lastPing: number | null;
  lastDownAt: string | null;
};

type MonitorEvent = {
  id: string;
  status: MonitorStatus;
  ping: number | null;
  message: string | null;
  createdAt: string;
};

type Protocol = {
  id: string;
  protocol: string;
  serviceOrder: string;
  observacao: string | null;
  createdAt: string;
};

type FormState = {
  name: string;
  host: string;
  port: string;
  type: "HTTP" | "TCP" | "PING";
  interval: string;
};

const emptyForm: FormState = { name: "", host: "", port: "", type: "HTTP", interval: "60" };

const STATUS_COLOR: Record<MonitorStatus, React.CSSProperties> = {
  UP: { background: "rgba(0,204,102,0.12)", color: "#00cc66", border: "1px solid rgba(0,204,102,0.3)" },
  DOWN: { background: "rgba(255,69,58,0.12)", color: "#ff453a", border: "1px solid rgba(255,69,58,0.35)" },
  PENDING: { background: "rgba(107,138,170,0.1)", color: "#6b8aaa", border: "1px solid rgba(107,138,170,0.2)" },
};

const STATUS_DOT: Record<MonitorStatus, string> = {
  UP: "#00cc66",
  DOWN: "#ff453a",
  PENDING: "#6b8aaa",
};

const STATUS_LABEL: Record<MonitorStatus, string> = { UP: "Online", DOWN: "Offline", PENDING: "Aguardando" };

function dot(status: MonitorStatus) {
  return (
    <span
      className="inline-block size-2.5 rounded-full shrink-0"
      style={{ background: STATUS_DOT[status], boxShadow: status === "UP" ? `0 0 6px ${STATUS_DOT[status]}` : undefined }}
    />
  );
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function ago(iso: string | null) {
  if (!iso) return "—";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 5) return "agora";
  if (diff < 60) return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
  return `${Math.floor(diff / 3600)}h atrás`;
}

export function AdminMonitorDashboard() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);

  const [historyMonitor, setHistoryMonitor] = useState<Monitor | null>(null);
  const [historyEvents, setHistoryEvents] = useState<MonitorEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [protocolMonitor, setProtocolMonitor] = useState<Monitor | null>(null);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [protocolsLoading, setProtocolsLoading] = useState(false);
  const [protocolForm, setProtocolForm] = useState({ protocol: "", serviceOrder: "", observacao: "" });
  const [protocolSaving, setProtocolSaving] = useState(false);
  const [protocolError, setProtocolError] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exportMonitorId, setExportMonitorId] = useState("");
  const [exportingExcel, setExportingExcel] = useState(false);
  const [confirmar, setConfirmar] = useState<{ acao: () => void; mensagem: string } | null>(null);

  const prevStatusRef = useRef<Record<string, MonitorStatus>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/monitors");
      const json = await res.json();
      setMonitors(json.data ?? []);
    } catch {
      setError("Falha ao carregar monitores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function requestNotifPermission() {
    if (!("Notification" in window)) return;
    void Notification.requestPermission().then((p) => setNotifGranted(p === "granted"));
  }

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "granted") setNotifGranted(true);
  }, []);

  function fireNotif(name: string, status: MonitorStatus) {
    if (!notifGranted || !("Notification" in window)) return;
    const icon = status === "UP" ? "✅" : "🔴";
    new Notification(`${icon} ${name}`, {
      body: status === "UP" ? "Voltou online" : "Ficou offline",
      tag: `monitor-${name}`,
    });
  }

  function applyCheckResults(results: { id: string; lastStatus: MonitorStatus; lastPing: number | null; lastChecked: string }[]) {
    setMonitors((prev) =>
      prev.map((m) => {
        const r = results.find((x) => x.id === m.id);
        if (!r) return m;
        const oldStatus = prevStatusRef.current[m.id];
        if (oldStatus && oldStatus !== "PENDING" && oldStatus !== r.lastStatus) {
          fireNotif(m.name, r.lastStatus);
        }
        prevStatusRef.current[m.id] = r.lastStatus;
        return { ...m, lastStatus: r.lastStatus, lastPing: r.lastPing, lastChecked: r.lastChecked };
      })
    );
  }

  async function checkOne(id: string) {
    setCheckingId(id);
    try {
      const res = await fetch("/api/admin/monitors/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.data) applyCheckResults(json.data);
    } finally {
      setCheckingId(null);
    }
  }

  async function checkAll() {
    setCheckingAll(true);
    try {
      const res = await fetch("/api/admin/monitors/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const json = await res.json();
      if (json.data) applyCheckResults(json.data);
    } finally {
      setCheckingAll(false);
    }
  }

  useEffect(() => {
    pollRef.current = setInterval(() => { void checkAll(); }, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEdit(m: Monitor) {
    setEditingId(m.id);
    setForm({ name: m.name, host: m.host, port: m.port ? String(m.port) : "", type: m.type as FormState["type"], interval: String(m.interval) });
    setFormError("");
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setShowForm(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.host.trim()) { setFormError("Nome e host obrigatorios."); return; }
    setSaving(true);
    setFormError("");
    try {
      const body = {
        name: form.name.trim(),
        host: form.host.trim(),
        port: form.port ? Number(form.port) : null,
        type: form.type,
        interval: Number(form.interval) || 60,
      };
      const res = await fetch(
        editingId ? `/api/admin/monitors/${editingId}` : "/api/admin/monitors",
        { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      const json = await res.json();
      if (!res.ok) { setFormError(json.message || "Erro ao salvar."); return; }
      if (editingId) {
        setMonitors((prev) => prev.map((m) => (m.id === editingId ? json.data : m)));
      } else {
        setMonitors((prev) => [...prev, json.data]);
      }
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function deleteMonitor(id: string, name: string) {
    await fetch(`/api/admin/monitors/${id}`, { method: "DELETE" });
    setMonitors((prev) => prev.filter((m) => m.id !== id));
  }

  async function toggleActive(m: Monitor) {
    const res = await fetch(`/api/admin/monitors/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !m.active }),
    });
    const json = await res.json();
    if (res.ok) setMonitors((prev) => prev.map((x) => (x.id === m.id ? { ...x, active: json.data.active } : x)));
  }

  async function openHistory(m: Monitor) {
    setHistoryMonitor(m);
    setHistoryEvents([]);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/monitors/${m.id}/events?limit=50`);
      const json = await res.json();
      setHistoryEvents(json.data ?? []);
    } finally {
      setHistoryLoading(false);
    }
  }

  function closeHistory() {
    setHistoryMonitor(null);
    setHistoryEvents([]);
  }

  async function openProtocols(m: Monitor) {
    setProtocolMonitor(m);
    setProtocols([]);
    setProtocolForm({ protocol: "", serviceOrder: "", observacao: "" });
    setProtocolError("");
    setProtocolsLoading(true);
    try {
      const res = await fetch(`/api/admin/monitors/${m.id}/protocols`);
      const json = await res.json();
      setProtocols(json.data ?? []);
    } finally {
      setProtocolsLoading(false);
    }
  }

  function closeProtocols() {
    setProtocolMonitor(null);
    setProtocols([]);
    setProtocolError("");
  }

  async function submitProtocol(e: React.FormEvent) {
    e.preventDefault();
    if (!protocolMonitor) return;
    if (!protocolForm.protocol.trim()) {
      setProtocolError("Número do protocolo é obrigatório.");
      return;
    }
    setProtocolSaving(true);
    setProtocolError("");
    try {
      const res = await fetch(`/api/admin/monitors/${protocolMonitor.id}/protocols`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(protocolForm),
      });
      const json = await res.json();
      if (!res.ok) { setProtocolError(json.message || "Erro ao registrar."); return; }
      setProtocols((prev) => [json.data, ...prev]);
      setProtocolForm({ protocol: "", serviceOrder: "", observacao: "" });
    } finally {
      setProtocolSaving(false);
    }
  }

  async function deleteProtocol(id: string) {
    await fetch(`/api/admin/monitors/protocols/${id}`, { method: "DELETE" });
    setProtocols((prev) => prev.filter((p) => p.id !== id));
  }

  async function exportProtocols() {
    setExportingExcel(true);
    try {
      const params = new URLSearchParams();
      if (exportMonitorId) params.set("monitorId", exportMonitorId);
      if (exportFrom) params.set("from", exportFrom);
      if (exportTo) params.set("to", exportTo);
      const res = await fetch(`/api/admin/monitors/protocols/export?${params.toString()}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      let filename = "protocolos_atendimento.xlsx";
      const star = cd?.match(/filename\*=UTF-8''([^;\s]+)/i);
      const quoted = cd?.match(/filename="([^"]+)"/i);
      if (star?.[1]) { try { filename = decodeURIComponent(star[1]); } catch { filename = star[1]; } }
      else if (quoted?.[1]) { filename = quoted[1]; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setExportOpen(false);
    } finally {
      setExportingExcel(false);
    }
  }

  function calcDowntime(events: MonitorEvent[], downEvent: MonitorEvent): string {
    const downTime = new Date(downEvent.createdAt).getTime();
    const nextUp = events.find(
      (e) => e.status === "UP" && new Date(e.createdAt).getTime() > downTime
    );
    if (!nextUp) return "em aberto";
    const diff = Math.floor((new Date(nextUp.createdAt).getTime() - downTime) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
    return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  }

  const upCount = monitors.filter((m) => m.lastStatus === "UP").length;
  const downCount = monitors.filter((m) => m.lastStatus === "DOWN").length;

  const cardStyle: React.CSSProperties = {
    background: "rgba(8,15,26,0.7)",
    border: "1px solid rgba(29,127,229,0.15)",
    borderRadius: "16px",
    padding: "20px 24px",
  };

  if (loading) return <p className="text-sm text-[#6b8aaa]">Carregando monitores...</p>;
  if (error) return <p className="text-sm text-[#ff453a]">{error}</p>;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Monitoramento</p>
          <h2 className="mt-0.5 text-xl font-bold text-white">Status de conexões</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {monitors.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl px-4 py-2 text-sm" style={{ background: "rgba(8,15,26,0.6)", border: "1px solid rgba(29,127,229,0.12)" }}>
              <span className="flex items-center gap-1.5 font-medium text-[#00cc66]">
                <span className="inline-block size-2 rounded-full bg-[#00cc66]" /> {upCount} online
              </span>
              {downCount > 0 && (
                <span className="flex items-center gap-1.5 font-medium text-[#ff453a]">
                  <span className="inline-block size-2 rounded-full bg-[#ff453a]" /> {downCount} offline
                </span>
              )}
            </div>
          )}
          {!notifGranted && "Notification" in window && (
            <button
              type="button"
              onClick={requestNotifPermission}
              className="rounded-xl px-4 py-2 text-sm font-medium transition"
              style={{ background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.3)", color: "#ffaa00" }}
            >
              🔔 Ativar notificações
            </button>
          )}
          <button
            type="button"
            onClick={() => void checkAll()}
            disabled={checkingAll}
            className="rounded-xl px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
            style={{ background: "rgba(29,127,229,0.1)", border: "1px solid rgba(29,127,229,0.3)" }}
          >
            {checkingAll ? "Verificando..." : "↻ Verificar todos"}
          </button>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="rounded-xl px-4 py-2 text-sm font-medium transition"
            style={{ background: "rgba(0,204,102,0.07)", border: "1px solid rgba(0,204,102,0.25)", color: "#00cc66" }}
          >
            ↓ Exportar protocolos
          </button>
          <button
            type="button"
            onClick={() => { if (showForm && !editingId) { resetForm(); } else { setEditingId(null); setForm(emptyForm); setFormError(""); setShowForm(true); } }}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold transition"
            style={showForm && !editingId
              ? { background: "rgba(29,127,229,0.2)", border: "1px solid rgba(29,127,229,0.5)", color: "#4da3ff" }
              : { background: "rgba(29,127,229,0.1)", border: "1px solid rgba(29,127,229,0.3)", color: "#1d7fe5" }}
          >
            {showForm && !editingId ? "✕ Cancelar" : "+ Novo monitor"}
          </button>
        </div>
      </div>

      {(showForm || editingId) && (
        <div style={cardStyle}>
          <h3 className="mb-4 text-base font-semibold text-white">{editingId ? "Editar monitor" : "Novo monitor"}</h3>
          <form onSubmit={(e) => void onSubmit(e)} className="grid gap-3 sm:grid-cols-2">
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nome (ex: Vivo Franquia)" required className="ds-input" />
            <input value={form.host} onChange={(e) => setForm((p) => ({ ...p, host: e.target.value }))} placeholder="IP ou URL (ex: 189.20.77.90)" required className="ds-input" />
            <div className="flex gap-2">
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as FormState["type"], port: "" }))}
                className="ds-input flex-1"
              >
                <option value="HTTP">HTTP/HTTPS</option>
                <option value="TCP">TCP (porta)</option>
                <option value="PING">Ping (ICMP)</option>
              </select>
              {form.type === "TCP" && (
                <input
                  value={form.port}
                  onChange={(e) => setForm((p) => ({ ...p, port: e.target.value }))}
                  placeholder="Porta"
                  type="number"
                  min="1"
                  max="65535"
                  className="ds-input w-28"
                />
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-[#6b8aaa]">
              Intervalo (seg)
              <input
                value={form.interval}
                onChange={(e) => setForm((p) => ({ ...p, interval: e.target.value }))}
                type="number"
                min="10"
                max="3600"
                className="ds-input w-24"
              />
            </label>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary rounded-xl px-5 py-2 text-sm font-semibold disabled:opacity-60">
                {saving ? "Salvando..." : editingId ? "Salvar" : "Cadastrar"}
              </button>
              <button type="button" onClick={resetForm} className="rounded-xl px-4 py-2 text-sm font-medium text-white transition" style={{ border: "1px solid rgba(29,127,229,0.2)", background: "rgba(8,15,26,0.5)" }}>
                Cancelar
              </button>
            </div>
            {formError && <p className="sm:col-span-2 text-sm text-[#ff453a]">{formError}</p>}
          </form>
        </div>
      )}

      {monitors.length === 0 ? (
        <div className="rounded-xl p-10 text-center text-sm" style={{ border: "1px dashed rgba(29,127,229,0.18)", color: "var(--onity-dark-text-muted)" }}>
          Nenhum monitor cadastrado. Clique em &quot;+ Novo monitor&quot; para começar.
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          {monitors.map((m) => {
            const isExpanded = expandedId === m.id;
            return (
              <div
                key={m.id}
                className="glass-card rounded-2xl flex flex-col transition-opacity"
                style={{ opacity: m.active ? 1 : 0.45 }}
              >
                {/* Cabeçalho clicável */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  className="flex items-center justify-between gap-2 p-4 w-full text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {dot(m.lastStatus)}
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-white truncate block">{m.name}</span>
                      {(() => {
                        const days = daysSince(m.lastDownAt);
                        if (days === null) return (
                          <span className="text-[10px]" style={{ color: "var(--onity-dark-text-muted)" }}>sem quedas registradas</span>
                        );
                        if (days === 0) return (
                          <span className="text-[10px] text-[#ff453a]">queda hoje</span>
                        );
                        return (
                          <span className="text-[10px] text-[#00cc66]">{days}d sem quedas</span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide"
                      style={STATUS_COLOR[m.lastStatus]}
                    >
                      {STATUS_LABEL[m.lastStatus]}
                    </span>
                    <span className="text-[9px]" style={{ color: "var(--onity-dark-text-muted)" }}>
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                </button>

                {/* Detalhes expandíveis */}
                {isExpanded && (
                  <div className="flex flex-col gap-3 px-4 pb-4 border-t" style={{ borderColor: "rgba(29,127,229,0.1)" }}>
                    <div className="space-y-0.5 pt-3">
                      <p className="text-xs truncate" style={{ color: "var(--onity-dark-text-muted)" }}>
                        {m.host}{m.port ? `:${m.port}` : ""}
                      </p>
                      <p className="text-xs" style={{ color: "var(--onity-dark-text-muted)" }}>
                        {m.type}{m.lastPing !== null ? ` · ${m.lastPing}ms` : ""}{m.lastChecked ? ` · ${ago(m.lastChecked)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => void checkOne(m.id)}
                        disabled={checkingId === m.id || !m.active}
                        title="Verificar agora"
                        className="rounded-lg px-2.5 py-1 text-xs font-medium text-[#4da3ff] transition hover:bg-[rgba(29,127,229,0.12)] disabled:opacity-40"
                        style={{ background: "rgba(29,127,229,0.07)", border: "1px solid rgba(29,127,229,0.18)" }}
                      >
                        {checkingId === m.id ? "…" : "↻"}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(m)}
                        className="rounded-lg px-2.5 py-1 text-xs font-medium text-white transition hover:bg-[rgba(29,127,229,0.12)]"
                        style={{ background: "rgba(29,127,229,0.07)", border: "1px solid rgba(29,127,229,0.18)" }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void openHistory(m)}
                        className="rounded-lg px-2.5 py-1 text-xs font-medium transition hover:bg-[rgba(107,138,170,0.12)]"
                        style={{ background: "rgba(107,138,170,0.07)", border: "1px solid rgba(107,138,170,0.2)", color: "#6b8aaa" }}
                      >
                        Log
                      </button>
                      <button
                        type="button"
                        onClick={() => void openProtocols(m)}
                        className="rounded-lg px-2.5 py-1 text-xs font-medium transition hover:bg-[rgba(29,127,229,0.12)]"
                        style={{ background: "rgba(29,127,229,0.07)", border: "1px solid rgba(29,127,229,0.18)", color: "#4da3ff" }}
                      >
                        Protocolo
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleActive(m)}
                        className="rounded-lg px-2.5 py-1 text-xs font-medium transition"
                        style={m.active
                          ? { background: "rgba(255,170,0,0.07)", border: "1px solid rgba(255,170,0,0.25)", color: "#ffaa00" }
                          : { background: "rgba(0,204,102,0.07)", border: "1px solid rgba(0,204,102,0.25)", color: "#00cc66" }}
                      >
                        {m.active ? "Pausar" : "Ativar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmar({ acao: () => void deleteMonitor(m.id, m.name), mensagem: `Excluir o monitor "${m.name}"?` })}
                        className="rounded-lg px-2.5 py-1 text-xs font-medium text-[#ff453a] transition hover:bg-[rgba(255,69,58,0.1)]"
                        style={{ background: "rgba(255,69,58,0.05)", border: "1px solid rgba(255,69,58,0.2)" }}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {protocolMonitor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(3,8,15,0.75)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeProtocols(); }}
        >
          <div
            className="glass-panel w-full max-w-lg rounded-2xl p-6 flex flex-col gap-4"
            style={{ maxHeight: "80vh", border: "1px solid rgba(29,127,229,0.2)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-label">Protocolos de atendimento</p>
                <h3 className="mt-0.5 text-base font-bold text-white">{protocolMonitor.name}</h3>
              </div>
              <button
                type="button"
                onClick={closeProtocols}
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-[#6b8aaa] transition hover:bg-[rgba(107,138,170,0.12)]"
                style={{ border: "1px solid rgba(107,138,170,0.2)" }}
              >
                ✕ Fechar
              </button>
            </div>

            <form onSubmit={(e) => void submitProtocol(e)} className="grid gap-2 sm:grid-cols-2">
              <input
                value={protocolForm.protocol}
                onChange={(e) => setProtocolForm((p) => ({ ...p, protocol: e.target.value }))}
                placeholder="Número do protocolo"
                className="ds-input"
              />
              <input
                value={protocolForm.serviceOrder}
                onChange={(e) => setProtocolForm((p) => ({ ...p, serviceOrder: e.target.value }))}
                placeholder="Ordem de serviço"
                className="ds-input"
              />
              <textarea
                value={protocolForm.observacao}
                onChange={(e) => setProtocolForm((p) => ({ ...p, observacao: e.target.value }))}
                placeholder="Observações (opcional)"
                rows={3}
                className="ds-input sm:col-span-2"
                style={{ resize: "none", height: "auto", minHeight: "76px", paddingTop: "10px", paddingBottom: "10px" }}
              />
              <div className="sm:col-span-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={protocolSaving}
                  className="btn-primary rounded-xl px-5 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  {protocolSaving ? "Registrando..." : "Registrar"}
                </button>
                {protocolError && <p className="text-sm text-[#ff453a]">{protocolError}</p>}
              </div>
            </form>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {protocolsLoading ? (
                <p className="text-sm text-[#6b8aaa]">Carregando...</p>
              ) : protocols.length === 0 ? (
                <p className="text-sm text-[#6b8aaa]">Nenhum protocolo registrado ainda.</p>
              ) : (
                protocols.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-xs"
                    style={{ background: "rgba(29,127,229,0.06)", border: "1px solid rgba(29,127,229,0.15)" }}
                  >
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="font-semibold text-white">Protocolo: {p.protocol}</p>
                      {p.serviceOrder && <p style={{ color: "var(--onity-dark-text-muted)" }}>OS: {p.serviceOrder}</p>}
                      {p.observacao && (
                        <p className="whitespace-pre-wrap" style={{ color: "var(--onity-dark-text-muted)" }}>
                          {p.observacao}
                        </p>
                      )}
                      <p style={{ color: "var(--onity-dark-text-muted)" }}>
                        {new Date(p.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmar({ acao: () => void deleteProtocol(p.id), mensagem: "Excluir este protocolo?" })}
                      className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-[#ff453a] transition hover:bg-[rgba(255,69,58,0.1)]"
                      style={{ border: "1px solid rgba(255,69,58,0.2)" }}
                    >
                      Excluir
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {exportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(3,8,15,0.75)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setExportOpen(false); setExportMonitorId(""); } }}
        >
          <div
            className="glass-panel w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
            style={{ border: "1px solid rgba(29,127,229,0.2)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-label">Exportar protocolos</p>
                <h3 className="mt-0.5 text-base font-bold text-white">Período (opcional)</h3>
              </div>
              <button
                type="button"
                onClick={() => { setExportOpen(false); setExportMonitorId(""); }}
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-[#94a3b8] transition hover:bg-[rgba(148,163,184,0.12)]"
                style={{ border: "1px solid rgba(148,163,184,0.2)" }}
              >
                ✕
              </button>
            </div>
            <div className="grid gap-3">
              <label className="flex flex-col gap-1 text-xs text-[#94a3b8]">
                Conexão
                <select
                  value={exportMonitorId}
                  onChange={(e) => setExportMonitorId(e.target.value)}
                  className="ds-input"
                >
                  <option value="">Todas as conexões</option>
                  {monitors.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-[#94a3b8]">
                De
                <input
                  type="date"
                  value={exportFrom}
                  onChange={(e) => setExportFrom(e.target.value)}
                  className="ds-input"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[#94a3b8]">
                Até
                <input
                  type="date"
                  value={exportTo}
                  onChange={(e) => setExportTo(e.target.value)}
                  className="ds-input"
                />
              </label>
              <button
                type="button"
                onClick={() => void exportProtocols()}
                disabled={exportingExcel}
                className="btn-primary rounded-xl px-5 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {exportingExcel ? "Gerando..." : "↓ Baixar Excel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyMonitor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(3,8,15,0.75)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeHistory(); }}
        >
          <div
            className="glass-panel w-full max-w-lg rounded-2xl p-6 flex flex-col gap-4"
            style={{ maxHeight: "80vh", border: "1px solid rgba(29,127,229,0.2)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-label">Log de quedas</p>
                <h3 className="mt-0.5 text-base font-bold text-white">{historyMonitor.name}</h3>
              </div>
              <button
                type="button"
                onClick={closeHistory}
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-[#6b8aaa] transition hover:bg-[rgba(107,138,170,0.12)]"
                style={{ border: "1px solid rgba(107,138,170,0.2)" }}
              >
                ✕ Fechar
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {historyLoading ? (
                <p className="text-sm text-[#6b8aaa]">Carregando...</p>
              ) : historyEvents.length === 0 ? (
                <p className="text-sm text-[#6b8aaa]">Nenhum evento registrado ainda.</p>
              ) : (
                <>
                  {(() => {
                    const recent = historyEvents.slice(0, 6);
                    const downs = recent.filter((e) => e.status === "DOWN").length;
                    const ups = recent.filter((e) => e.status === "UP").length;
                    return downs >= 3 || ups >= 3 ? (
                      <div
                        className="rounded-xl px-3 py-2.5 text-xs font-medium"
                        style={{ background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.3)", color: "#ffaa00" }}
                      >
                        ⚠ Registro pausado — múltiplas oscilações detectadas. Voltará a registrar quando a conexão estabilizar.
                      </div>
                    ) : null;
                  })()}
                {historyEvents.map((ev) => {
                  const downtime = ev.status === "DOWN" ? calcDowntime(
                    [...historyEvents].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
                    ev
                  ) : null;
                  return (
                    <div
                      key={ev.id}
                      className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-xs"
                      style={{
                        background: ev.status === "DOWN" ? "rgba(255,69,58,0.07)" : "rgba(0,204,102,0.06)",
                        border: ev.status === "DOWN" ? "1px solid rgba(255,69,58,0.2)" : "1px solid rgba(0,204,102,0.18)",
                      }}
                    >
                      <span className="mt-0.5 shrink-0">{dot(ev.status)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-semibold" style={{ color: ev.status === "DOWN" ? "#ff453a" : "#00cc66" }}>
                            {STATUS_LABEL[ev.status]}
                          </span>
                          <span style={{ color: "var(--onity-dark-text-muted)" }}>
                            {new Date(ev.createdAt).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        {ev.message && (
                          <p className="mt-0.5 truncate" style={{ color: "var(--onity-dark-text-muted)" }}>
                            {ev.message}
                          </p>
                        )}
                        {ev.status === "UP" && ev.ping !== null && (
                          <p className="mt-0.5" style={{ color: "var(--onity-dark-text-muted)" }}>{ev.ping}ms</p>
                        )}
                        {downtime && (
                          <p className="mt-0.5 font-medium" style={{ color: "#ffaa00" }}>
                            Duração: {downtime}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {confirmar && (
        <ConfirmModal
          mensagem={confirmar.mensagem}
          onConfirm={() => { confirmar.acao(); setConfirmar(null); }}
          onCancel={() => setConfirmar(null)}
        />
      )}
    </section>
  );
}
