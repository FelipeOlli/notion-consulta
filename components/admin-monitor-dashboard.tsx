"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
    if (!window.confirm(`Excluir o monitor "${name}"?`)) return;
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
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {monitors.map((m) => (
            <div
              key={m.id}
              className="flex flex-col gap-2 rounded-xl px-4 py-3 transition-opacity"
              style={{ background: "rgba(3,8,15,0.5)", border: "1px solid rgba(29,127,229,0.1)", opacity: m.active ? 1 : 0.5 }}
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-1 shrink-0">{dot(m.lastStatus)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{m.name}</p>
                  <p className="text-xs text-[#6b8aaa] truncate">{m.host}{m.port ? `:${m.port}` : ""}</p>
                </div>
                <span style={STATUS_COLOR[m.lastStatus]} className="rounded-full px-3 py-1 text-xs font-bold shrink-0 tracking-wide">
                  {STATUS_LABEL[m.lastStatus]}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#6b8aaa]">
                <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase" style={{ background: "rgba(29,127,229,0.06)", border: "1px solid rgba(29,127,229,0.12)" }}>{m.type}</span>
                {m.lastPing !== null && <span>{m.lastPing}ms</span>}
                <span>{ago(m.lastChecked)}</span>
              </div>

              <div className="flex items-center gap-1.5 pt-1 border-t" style={{ borderColor: "rgba(29,127,229,0.08)" }}>
                <button
                  type="button"
                  onClick={() => void checkOne(m.id)}
                  disabled={checkingId === m.id || !m.active}
                  title="Verificar agora"
                  className="rounded-lg px-2 py-1 text-xs font-medium text-[#4da3ff] transition hover:bg-[rgba(29,127,229,0.1)] disabled:opacity-40"
                  style={{ border: "1px solid rgba(29,127,229,0.2)" }}
                >
                  {checkingId === m.id ? "..." : "↻"}
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(m)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-white transition hover:bg-[rgba(29,127,229,0.1)]"
                  style={{ border: "1px solid rgba(29,127,229,0.2)" }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void toggleActive(m)}
                  className="rounded-lg px-2 py-1 text-xs font-medium transition"
                  style={m.active
                    ? { border: "1px solid rgba(255,170,0,0.4)", color: "#ffaa00", background: "rgba(255,170,0,0.06)" }
                    : { border: "1px solid rgba(0,204,102,0.35)", color: "#00cc66", background: "rgba(0,204,102,0.06)" }}
                >
                  {m.active ? "Pausar" : "Ativar"}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteMonitor(m.id, m.name)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-[#ff453a] transition hover:bg-[rgba(255,69,58,0.08)]"
                  style={{ border: "1px solid rgba(255,69,58,0.25)" }}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
