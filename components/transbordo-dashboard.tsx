"use client";

import { useState, useRef } from "react";
import { ConfirmModal } from "@/components/confirm-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BadgeColor {
  id: number;
  label: string;
  hexValue: string;
  createdAt: string;
}

interface StatusOption {
  id: number;
  label: string;
  value: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

interface Comment {
  id: string;
  ticketId: string;
  content: string;
  attachments: { url: string; size: number; filename: string; mimetype: string }[] | null;
  createdAt: string;
}

interface Ticket {
  id: string;
  franchiseName: string;
  sistemaOrigem: string | null;
  systems: string[];
  status: string;
  statusColorId: number | null;
  statusColor: BadgeColor | null;
  progress: number;
  companies: number | null;
  request: string | null;
  ticketTransbordoNo: string | null;
  lembrete: string | null;
  agendado: string | null;
  solicitacao: string | null;
  ssc: string | null;
  tempoMigracao: string | null;
  totalDays: number | null;
  prevDays: number | null;
  workDays: number | null;
  dConcluido: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { comments: number };
}

interface SistemaOrigemOption {
  id: number;
  label: string;
  createdAt: string;
}

interface Props {
  initialTickets: Ticket[];
  initialBadgeColors: BadgeColor[];
  initialStatusOptions: StatusOption[];
  initialSistemaOrigemOptions: SistemaOrigemOption[];
  isMaster: boolean;
}

const SYSTEMS = ["Domínio", "Alterdata"];

const MUTED = "var(--onity-dark-text-muted)";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TransbordoDashboard({
  initialTickets,
  initialBadgeColors,
  initialStatusOptions,
  initialSistemaOrigemOptions,
  isMaster,
}: Props) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [badgeColors, setBadgeColors] = useState<BadgeColor[]>(initialBadgeColors);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>(initialStatusOptions);
  const [sistemaOrigemOptions, setSistemaOrigemOptions] = useState<SistemaOrigemOption[]>(initialSistemaOrigemOptions);

  // form ticket
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [saving, setSaving] = useState(false);

  // detail drawer
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [sendingComment, setSendingComment] = useState(false);

  // config panel (master)
  const [configOpen, setConfigOpen] = useState(false);
  const [colorForm, setColorForm] = useState(false);
  const [newColor, setNewColor] = useState({ label: "", hexValue: "#3b82f6" });
  const [statusForm, setStatusForm] = useState(false);
  const [newStatus, setNewStatus] = useState({ label: "", value: "", sortOrder: "0" });
  const [origemForm, setOrigemForm] = useState(false);
  const [newOrigem, setNewOrigem] = useState({ label: "" });

  // confirm delete
  const [deleteTicket, setDeleteTicket] = useState<Ticket | null>(null);
  const [deleteComment, setDeleteComment] = useState<Comment | null>(null);
  const [deleteColor, setDeleteColor] = useState<BadgeColor | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<StatusOption | null>(null);
  const [deleteOrigem, setDeleteOrigem] = useState<SistemaOrigemOption | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // form fields
  const emptyForm = {
    franchiseName: "",
    sistemaOrigem: "",
    systems: [] as string[],
    status: "",
    statusColorId: "" as string,
    progress: "0",
    companies: "",
    request: "",
    ticketTransbordoNo: "",
    lembrete: "",
    agendado: "",
    solicitacao: "",
    ssc: "",
    tempoMigracao: "",
    totalDays: "",
    prevDays: "",
    workDays: "",
    dConcluido: "",
  };
  const [form, setForm] = useState(emptyForm);

  function openCreate() {
    setForm(emptyForm);
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(t: Ticket) {
    setForm({
      franchiseName: t.franchiseName,
      sistemaOrigem: t.sistemaOrigem ?? "",
      systems: t.systems,
      status: t.status,
      statusColorId: t.statusColorId ? String(t.statusColorId) : "",
      progress: String(t.progress),
      companies: t.companies ? String(t.companies) : "",
      request: t.request ?? "",
      ticketTransbordoNo: t.ticketTransbordoNo ?? "",
      lembrete: t.lembrete ?? "",
      agendado: t.agendado ?? "",
      solicitacao: t.solicitacao ?? "",
      ssc: t.ssc ?? "",
      tempoMigracao: t.tempoMigracao ?? "",
      totalDays: t.totalDays ? String(t.totalDays) : "",
      prevDays: t.prevDays ? String(t.prevDays) : "",
      workDays: t.workDays ? String(t.workDays) : "",
      dConcluido: t.dConcluido ? t.dConcluido.substring(0, 10) : "",
    });
    setEditing(t);
    setFormOpen(true);
  }

  function toggleSystem(sys: string) {
    setForm((f) => ({
      ...f,
      systems: f.systems.includes(sys)
        ? f.systems.filter((s) => s !== sys)
        : [...f.systems, sys],
    }));
  }

  async function saveTicket() {
    if (!form.franchiseName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        franchiseName: form.franchiseName.trim(),
        sistemaOrigem: form.sistemaOrigem || null,
        systems: form.systems,
        status: form.status,
        statusColorId: form.statusColorId || null,
        progress: form.progress ? Number(form.progress) : 0,
        companies: form.companies ? Number(form.companies) : null,
        request: form.request || null,
        ticketTransbordoNo: form.ticketTransbordoNo || null,
        lembrete: form.lembrete || null,
        agendado: form.agendado || null,
        solicitacao: form.solicitacao || null,
        ssc: form.ssc || null,
        tempoMigracao: form.tempoMigracao || null,
        totalDays: form.totalDays ? Number(form.totalDays) : null,
        prevDays: form.prevDays ? Number(form.prevDays) : null,
        workDays: form.workDays ? Number(form.workDays) : null,
        dConcluido: form.dConcluido || null,
      };

      if (editing) {
        const res = await fetch(`/api/admin/transbordo/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const updated: Ticket = await res.json();
        setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        if (selected?.id === updated.id) setSelected(updated);
      } else {
        const res = await fetch("/api/admin/transbordo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const created: Ticket = await res.json();
        setTickets((prev) => [created, ...prev]);
      }
      setFormOpen(false);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteTicket() {
    if (!deleteTicket) return;
    await fetch(`/api/admin/transbordo/${deleteTicket.id}`, { method: "DELETE" });
    setTickets((prev) => prev.filter((t) => t.id !== deleteTicket.id));
    if (selected?.id === deleteTicket.id) setSelected(null);
    setDeleteTicket(null);
  }

  // drawer
  async function openTicket(t: Ticket) {
    setSelected(t);
    setComments([]);
    setCommentText("");
    setCommentFiles([]);
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/admin/transbordo/${t.id}/comments`);
      const data: Comment[] = await res.json();
      setComments(data);
    } finally {
      setLoadingComments(false);
    }
  }

  async function sendComment() {
    if (!selected || !commentText.trim()) return;
    setSendingComment(true);
    try {
      let res: Response;
      if (commentFiles.length > 0) {
        const fd = new FormData();
        fd.append("content", commentText);
        commentFiles.forEach((f) => fd.append("attachments", f));
        res = await fetch(`/api/admin/transbordo/${selected.id}/comments`, {
          method: "POST",
          body: fd,
        });
      } else {
        res = await fetch(`/api/admin/transbordo/${selected.id}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: commentText }),
        });
      }
      const comment: Comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selected.id
            ? { ...t, _count: { comments: t._count.comments + 1 } }
            : t
        )
      );
      setCommentText("");
      setCommentFiles([]);
    } finally {
      setSendingComment(false);
    }
  }

  async function confirmDeleteComment() {
    if (!deleteComment) return;
    await fetch(`/api/admin/transbordo/comments/${deleteComment.id}`, { method: "DELETE" });
    setComments((prev) => prev.filter((c) => c.id !== deleteComment.id));
    if (selected) {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selected.id
            ? { ...t, _count: { comments: Math.max(0, t._count.comments - 1) } }
            : t
        )
      );
    }
    setDeleteComment(null);
  }

  // badge colors
  async function createColor() {
    if (!newColor.label.trim()) return;
    const res = await fetch("/api/admin/transbordo/badge-colors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newColor),
    });
    const color: BadgeColor = await res.json();
    setBadgeColors((prev) => [...prev, color].sort((a, b) => a.label.localeCompare(b.label)));
    setNewColor({ label: "", hexValue: "#3b82f6" });
    setColorForm(false);
  }

  async function confirmDeleteColor() {
    if (!deleteColor) return;
    await fetch(`/api/admin/transbordo/badge-colors/${deleteColor.id}`, { method: "DELETE" });
    setBadgeColors((prev) => prev.filter((c) => c.id !== deleteColor.id));
    setDeleteColor(null);
  }

  // status options
  async function createStatusOption() {
    if (!newStatus.label.trim()) return;
    const res = await fetch("/api/admin/transbordo/status-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newStatus, sortOrder: Number(newStatus.sortOrder) }),
    });
    const opt: StatusOption = await res.json();
    setStatusOptions((prev) => [...prev, opt].sort((a, b) => a.sortOrder - b.sortOrder));
    setNewStatus({ label: "", value: "", sortOrder: "0" });
    setStatusForm(false);
  }

  async function confirmDeleteStatus() {
    if (!deleteStatus) return;
    await fetch(`/api/admin/transbordo/status-options/${deleteStatus.id}`, { method: "DELETE" });
    setStatusOptions((prev) => prev.filter((s) => s.id !== deleteStatus.id));
    setDeleteStatus(null);
  }

  // sistema origem options
  async function createOrigemOption() {
    if (!newOrigem.label.trim()) return;
    const res = await fetch("/api/admin/transbordo/sistema-origem-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newOrigem),
    });
    const opt: SistemaOrigemOption = await res.json();
    setSistemaOrigemOptions((prev) => [...prev, opt].sort((a, b) => a.label.localeCompare(b.label)));
    setNewOrigem({ label: "" });
    setOrigemForm(false);
  }

  async function confirmDeleteOrigem() {
    if (!deleteOrigem) return;
    await fetch(`/api/admin/transbordo/sistema-origem-options/${deleteOrigem.id}`, { method: "DELETE" });
    setSistemaOrigemOptions((prev) => prev.filter((s) => s.id !== deleteOrigem.id));
    setDeleteOrigem(null);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button className="btn-primary text-sm px-5 py-2" onClick={openCreate}>
          + Novo Ticket
        </button>
        {isMaster && (
          <button
            className="text-sm px-4 py-2 rounded-lg border transition-colors"
            style={{
              borderColor: "rgba(139,92,246,.3)",
              color: "#8b5cf6",
              background: "rgba(139,92,246,.08)",
            }}
            onClick={() => setConfigOpen((v) => !v)}
          >
            Configurações
          </button>
        )}
        <span className="ml-auto text-xs" style={{ color: MUTED }}>
          {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Formulário colapsável ── */}
      {formOpen && (
        <div className="glass-card rounded-xl p-5 mb-6 space-y-4">
          <h3 className="text-sm font-semibold text-white">
            {editing ? "Editar Ticket" : "Novo Ticket"}
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs mb-1" style={{ color: MUTED }}>
                Franquia *
              </label>
              <input
                className="ds-input w-full"
                value={form.franchiseName}
                onChange={(e) => setForm((f) => ({ ...f, franchiseName: e.target.value }))}
                placeholder="Nome da franquia"
              />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: MUTED }}>
                Sistema de Origem
              </label>
              <select
                className="ds-input w-full"
                value={form.sistemaOrigem}
                onChange={(e) => setForm((f) => ({ ...f, sistemaOrigem: e.target.value }))}
              >
                <option value="">— selecionar —</option>
                {sistemaOrigemOptions.map((s) => (
                  <option key={s.id} value={s.label}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: MUTED }}>
                Sistemas envolvidos
              </label>
              <div className="flex flex-wrap gap-3">
                {sistemaOrigemOptions.map((s) => (
                  <label key={s.id} className="flex items-center gap-1.5 cursor-pointer text-sm text-white/80">
                    <input
                      type="checkbox"
                      checked={form.systems.includes(s.label)}
                      onChange={() => toggleSystem(s.label)}
                      className="accent-blue-500"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: MUTED }}>
                Status
              </label>
              <select
                className="ds-input w-full"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="">— selecionar —</option>
                {statusOptions.filter((s) => s.isActive).map((s) => (
                  <option key={s.id} value={s.label}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: MUTED }}>
                Cor do badge
              </label>
              <select
                className="ds-input w-full"
                value={form.statusColorId}
                onChange={(e) => setForm((f) => ({ ...f, statusColorId: e.target.value }))}
              >
                <option value="">— nenhuma —</option>
                {badgeColors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} ({c.hexValue})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: MUTED }}>
                Progresso (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                className="ds-input w-full"
                value={form.progress}
                onChange={(e) => setForm((f) => ({ ...f, progress: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: MUTED }}>
                Nº Empresas
              </label>
              <input
                type="number"
                className="ds-input w-full"
                value={form.companies}
                onChange={(e) => setForm((f) => ({ ...f, companies: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: MUTED }}>
                Nº Ticket Transbordo
              </label>
              <input
                className="ds-input w-full"
                value={form.ticketTransbordoNo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ticketTransbordoNo: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: MUTED }}>
                SSC
              </label>
              <input
                className="ds-input w-full"
                value={form.ssc}
                onChange={(e) => setForm((f) => ({ ...f, ssc: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: MUTED }}>
                Tempo de Migração
              </label>
              <input
                className="ds-input w-full"
                value={form.tempoMigracao}
                onChange={(e) => setForm((f) => ({ ...f, tempoMigracao: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: MUTED }}>
                Lembrete
              </label>
              <input
                className="ds-input w-full"
                value={form.lembrete}
                onChange={(e) => setForm((f) => ({ ...f, lembrete: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: MUTED }}>
                Agendado
              </label>
              <input
                className="ds-input w-full"
                value={form.agendado}
                onChange={(e) => setForm((f) => ({ ...f, agendado: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: MUTED }}>
                Total de Dias
              </label>
              <input
                type="number"
                className="ds-input w-full"
                value={form.totalDays}
                onChange={(e) => setForm((f) => ({ ...f, totalDays: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: MUTED }}>
                Dias Previstos
              </label>
              <input
                type="number"
                className="ds-input w-full"
                value={form.prevDays}
                onChange={(e) => setForm((f) => ({ ...f, prevDays: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: MUTED }}>
                Dias Úteis
              </label>
              <input
                type="number"
                className="ds-input w-full"
                value={form.workDays}
                onChange={(e) => setForm((f) => ({ ...f, workDays: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: MUTED }}>
                Data de Conclusão
              </label>
              <input
                type="date"
                className="ds-input w-full"
                value={form.dConcluido}
                onChange={(e) => setForm((f) => ({ ...f, dConcluido: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: MUTED }}>
              Solicitação
            </label>
            <textarea
              className="ds-input w-full"
              rows={2}
              value={form.solicitacao}
              onChange={(e) => setForm((f) => ({ ...f, solicitacao: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: MUTED }}>
              Pedido / Request
            </label>
            <textarea
              className="ds-input w-full"
              rows={2}
              value={form.request}
              onChange={(e) => setForm((f) => ({ ...f, request: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              className="link-muted text-sm px-4 py-2"
              onClick={() => { setFormOpen(false); setEditing(null); }}
            >
              Cancelar
            </button>
            <button
              className="btn-primary text-sm px-5 py-2"
              onClick={saveTicket}
              disabled={saving || !form.franchiseName.trim()}
            >
              {saving ? "Salvando…" : editing ? "Salvar alterações" : "Criar ticket"}
            </button>
          </div>
        </div>
      )}

      {/* ── Config modal (master only) ── */}
      {isMaster && configOpen && (
        <div
          className="fixed inset-0 z-[50] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfigOpen(false);
          }}
        >
          <div className="glass-panel w-full max-w-5xl rounded-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <h3 className="text-lg font-semibold text-white">Configurações do módulo</h3>
              <button
                className="text-white/60 hover:text-white text-2xl font-semibold leading-none"
                onClick={() => setConfigOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto py-2 flex-1 pr-1">
              {/* Badge Colors */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                    Cores de badge
                  </span>
                  <button
                    className="text-xs link-accent"
                    onClick={() => setColorForm((v) => !v)}
                  >
                    + Nova cor
                  </button>
                </div>

                {colorForm && (
                  <div className="glass-card rounded-lg p-3 space-y-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: MUTED }}>
                        Label
                      </label>
                      <input
                        className="ds-input text-sm w-full"
                        value={newColor.label}
                        onChange={(e) => setNewColor((c) => ({ ...c, label: e.target.value }))}
                        placeholder="ex: Verde"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: MUTED }}>
                        Cor
                      </label>
                      <input
                        type="color"
                        className="h-9 w-full rounded cursor-pointer border-0 bg-transparent"
                        value={newColor.hexValue}
                        onChange={(e) => setNewColor((c) => ({ ...c, hexValue: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn-primary text-xs px-3 py-2 flex-1"
                        onClick={createColor}
                        disabled={!newColor.label.trim()}
                      >
                        Criar
                      </button>
                      <button
                        className="link-muted text-xs px-3 py-2 border border-white/10 rounded-lg"
                        onClick={() => setColorForm(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 max-h-[250px] overflow-y-auto pr-1">
                  {badgeColors.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
                      style={{ background: c.hexValue + "22", color: c.hexValue, border: `1px solid ${c.hexValue}44` }}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ background: c.hexValue }}
                      />
                      {c.label}
                      <button
                        className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
                        onClick={() => setDeleteColor(c)}
                        title="Excluir"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {badgeColors.length === 0 && (
                    <span className="text-xs" style={{ color: MUTED }}>
                      Nenhuma cor cadastrada.
                    </span>
                  )}
                </div>
              </div>

              {/* Status Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                    Opções de status
                  </span>
                  <button
                    className="text-xs link-accent"
                    onClick={() => setStatusForm((v) => !v)}
                  >
                    + Nova opção
                  </button>
                </div>

                {statusForm && (
                  <div className="glass-card rounded-lg p-3 space-y-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: MUTED }}>
                        Label
                      </label>
                      <input
                        className="ds-input text-sm w-full"
                        value={newStatus.label}
                        onChange={(e) => setNewStatus((s) => ({ ...s, label: e.target.value }))}
                        placeholder="ex: T1 - Em análise"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: MUTED }}>
                        Valor (opcional)
                      </label>
                      <input
                        className="ds-input text-sm w-full"
                        value={newStatus.value}
                        onChange={(e) => setNewStatus((s) => ({ ...s, value: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: MUTED }}>
                        Ordem
                      </label>
                      <input
                        type="number"
                        className="ds-input text-sm w-full"
                        value={newStatus.sortOrder}
                        onChange={(e) => setNewStatus((s) => ({ ...s, sortOrder: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn-primary text-xs px-3 py-2 flex-1"
                        onClick={createStatusOption}
                        disabled={!newStatus.label.trim()}
                      >
                        Criar
                      </button>
                      <button
                        className="link-muted text-xs px-3 py-2 border border-white/10 rounded-lg"
                        onClick={() => setStatusForm(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
                  {statusOptions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
                      style={{ background: "rgba(255,255,255,.04)" }}
                    >
                      <span className="text-white/80">{s.label}</span>
                      <button
                        className="opacity-60 hover:opacity-100 transition-opacity text-red-400"
                        onClick={() => setDeleteStatus(s)}
                        title="Excluir"
                      >
                        Excluir
                      </button>
                    </div>
                  ))}
                  {statusOptions.length === 0 && (
                    <span className="text-xs" style={{ color: MUTED }}>
                      Nenhuma opção cadastrada.
                    </span>
                  )}
                </div>
              </div>

              {/* Sistemas de Origem */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                    Sistemas de Origem
                  </span>
                  <button
                    className="text-xs link-accent"
                    onClick={() => setOrigemForm((v) => !v)}
                  >
                    + Novo sistema
                  </button>
                </div>

                {origemForm && (
                  <div className="glass-card rounded-lg p-3 space-y-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: MUTED }}>
                        Nome
                      </label>
                      <input
                        className="ds-input text-sm w-full"
                        value={newOrigem.label}
                        onChange={(e) => setNewOrigem({ label: e.target.value })}
                        placeholder="ex: Domínio"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn-primary text-xs px-3 py-2 flex-1"
                        onClick={createOrigemOption}
                        disabled={!newOrigem.label.trim()}
                      >
                        Criar
                      </button>
                      <button
                        className="link-muted text-xs px-3 py-2 border border-white/10 rounded-lg"
                        onClick={() => setOrigemForm(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
                  {sistemaOrigemOptions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
                      style={{ background: "rgba(255,255,255,.04)" }}
                    >
                      <span className="text-white/80">{s.label}</span>
                      <button
                        className="opacity-60 hover:opacity-100 transition-opacity text-red-400"
                        onClick={() => setDeleteOrigem(s)}
                        title="Excluir"
                      >
                        Excluir
                      </button>
                    </div>
                  ))}
                  {sistemaOrigemOptions.length === 0 && (
                    <span className="text-xs" style={{ color: MUTED }}>
                      Nenhum sistema cadastrado.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10 shrink-0">
              <button
                className="btn-primary text-sm px-5 py-2"
                onClick={() => setConfigOpen(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabela de tickets ── */}
      {tickets.length === 0 ? (
        <div
          className="rounded-xl border border-white/10 p-10 text-center text-sm"
          style={{ color: MUTED }}
        >
          Nenhum ticket cadastrado. Clique em &quot;+ Novo Ticket&quot; para começar.
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => {
            const color = t.statusColor;
            return (
              <div key={t.id} className="glass-card rounded-xl p-4">
                <div className="flex flex-wrap items-start gap-3">
                  {/* info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <button
                        className="text-sm font-semibold text-white hover:text-blue-400 transition-colors text-left truncate max-w-[260px]"
                        onClick={() => openTicket(t)}
                      >
                        {t.franchiseName}
                      </button>
                      {/* badge de status */}
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={
                          color
                            ? {
                                background: color.hexValue + "22",
                                color: color.hexValue,
                                border: `1px solid ${color.hexValue}44`,
                              }
                            : {
                                background: "rgba(148,163,184,.15)",
                                color: "#94a3b8",
                                border: "1px solid rgba(148,163,184,.2)",
                              }
                        }
                      >
                        {t.status}
                      </span>
                    </div>

                    {/* meta */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: MUTED }}>
                      {t.sistemaOrigem && <span>Origem: {t.sistemaOrigem}</span>}
                      {t.systems.length > 0 && (
                        <span>Sistemas: {t.systems.join(", ")}</span>
                      )}
                      {t.companies != null && <span>{t.companies} empresa{t.companies !== 1 ? "s" : ""}</span>}
                      {t.ssc && <span>SSC: {t.ssc}</span>}
                      {t.ticketTransbordoNo && <span>Ticket: {t.ticketTransbordoNo}</span>}
                      <span>{formatDate(t.createdAt)}</span>
                    </div>

                    {/* barra de progresso */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.08)" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${t.progress}%`,
                            background: "linear-gradient(90deg,#3b82f6,#8b5cf6)",
                          }}
                        />
                      </div>
                      <span className="text-xs tabular-nums" style={{ color: MUTED }}>
                        {t.progress}%
                      </span>
                    </div>
                  </div>

                  {/* ações */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="text-xs link-muted"
                      onClick={() => openTicket(t)}
                    >
                      {t._count.comments > 0 ? `${t._count.comments} comentário${t._count.comments !== 1 ? "s" : ""}` : "Detalhes"}
                    </button>
                    <button
                      className="text-xs link-accent"
                      onClick={() => openEdit(t)}
                    >
                      Editar
                    </button>
                    <button
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      onClick={() => setDeleteTicket(t)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Drawer de detalhes / comentários ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
        >
          <div
            className="w-full max-w-lg flex flex-col overflow-hidden"
            style={{ background: "#0f172a", borderLeft: "1px solid rgba(255,255,255,.08)" }}
          >
            {/* header drawer */}
            <div className="flex items-start justify-between gap-4 p-5 border-b border-white/10">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white truncate">
                  {selected.franchiseName}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                  {selected.status}
                </p>
              </div>
              <button
                className="link-muted text-lg leading-none shrink-0"
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            </div>

            {/* metadados */}
            <div className="p-5 border-b border-white/10">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                {[
                  ["Sistema origem", selected.sistemaOrigem],
                  ["Sistemas", selected.systems.join(", ") || null],
                  ["Progresso", `${selected.progress}%`],
                  ["Empresas", selected.companies],
                  ["SSC", selected.ssc],
                  ["Ticket Transbordo", selected.ticketTransbordoNo],
                  ["Tempo de migração", selected.tempoMigracao],
                  ["Total de dias", selected.totalDays],
                  ["Dias previstos", selected.prevDays],
                  ["Dias úteis", selected.workDays],
                  ["Lembrete", selected.lembrete],
                  ["Agendado", selected.agendado],
                  ["Conclusão", formatDate(selected.dConcluido)],
                  ["Criado em", formatDate(selected.createdAt)],
                ]
                  .filter(([, v]) => v != null && v !== "")
                  .map(([k, v]) => (
                    <div key={String(k)}>
                      <span style={{ color: MUTED }}>{k}: </span>
                      <span className="text-white/80">{String(v)}</span>
                    </div>
                  ))}
              </div>

              {selected.solicitacao && (
                <div className="mt-3">
                  <span className="text-xs" style={{ color: MUTED }}>
                    Solicitação:
                  </span>
                  <p className="text-xs text-white/80 mt-0.5 whitespace-pre-wrap">
                    {selected.solicitacao}
                  </p>
                </div>
              )}

              {selected.request && (
                <div className="mt-2">
                  <span className="text-xs" style={{ color: MUTED }}>
                    Request:
                  </span>
                  <p className="text-xs text-white/80 mt-0.5 whitespace-pre-wrap">
                    {selected.request}
                  </p>
                </div>
              )}
            </div>

            {/* comentários */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <p className="text-xs font-medium" style={{ color: MUTED }}>
                Comentários
              </p>

              {loadingComments && (
                <p className="text-xs" style={{ color: MUTED }}>
                  Carregando…
                </p>
              )}

              {!loadingComments && comments.length === 0 && (
                <p className="text-xs" style={{ color: MUTED }}>
                  Nenhum comentário ainda.
                </p>
              )}

              {comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg p-3 space-y-1.5 text-xs"
                  style={{ background: "rgba(255,255,255,.04)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-white/80 whitespace-pre-wrap flex-1">{c.content}</p>
                    <button
                      className="text-red-400/60 hover:text-red-400 transition-colors shrink-0"
                      onClick={() => setDeleteComment(c)}
                      title="Excluir comentário"
                    >
                      ×
                    </button>
                  </div>
                  {c.attachments && c.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {c.attachments.map((a, i) => (
                        <a
                          key={i}
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link-accent text-xs underline"
                        >
                          {a.filename}
                        </a>
                      ))}
                    </div>
                  )}
                  <p style={{ color: MUTED }}>{formatDate(c.createdAt)}</p>
                </div>
              ))}
            </div>

            {/* nova mensagem */}
            <div
              className="p-4 border-t border-white/10 space-y-2"
              style={{ background: "rgba(15,23,42,.8)" }}
            >
              <textarea
                className="ds-input w-full text-sm"
                rows={2}
                placeholder="Adicionar comentário…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    className="text-xs link-muted"
                    onClick={() => fileRef.current?.click()}
                  >
                    Anexar
                  </button>
                  {commentFiles.length > 0 && (
                    <span className="text-xs" style={{ color: MUTED }}>
                      {commentFiles.length} arquivo{commentFiles.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => setCommentFiles(Array.from(e.target.files ?? []))}
                  />
                </div>
                <button
                  className="btn-primary text-xs px-4 py-2"
                  onClick={sendComment}
                  disabled={sendingComment || !commentText.trim()}
                >
                  {sendingComment ? "Enviando…" : "Enviar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modais de confirmação ── */}
      {deleteTicket && (
        <ConfirmModal
          mensagem={`Excluir ticket "${deleteTicket.franchiseName}"?`}
          detalhe="Todos os comentários e anexos serão removidos permanentemente."
          onConfirm={confirmDeleteTicket}
          onCancel={() => setDeleteTicket(null)}
        />
      )}
      {deleteComment && (
        <ConfirmModal
          mensagem="Excluir este comentário?"
          onConfirm={confirmDeleteComment}
          onCancel={() => setDeleteComment(null)}
        />
      )}
      {deleteColor && (
        <ConfirmModal
          mensagem={`Excluir cor "${deleteColor.label}"?`}
          onConfirm={confirmDeleteColor}
          onCancel={() => setDeleteColor(null)}
        />
      )}
      {deleteStatus && (
        <ConfirmModal
          mensagem={`Excluir opção de status "${deleteStatus.label}"?`}
          onConfirm={confirmDeleteStatus}
          onCancel={() => setDeleteStatus(null)}
        />
      )}
      {deleteOrigem && (
        <ConfirmModal
          mensagem={`Excluir sistema de origem "${deleteOrigem.label}"?`}
          onConfirm={confirmDeleteOrigem}
          onCancel={() => setDeleteOrigem(null)}
        />
      )}
    </>
  );
}
