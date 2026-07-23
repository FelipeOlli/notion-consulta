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

interface Props {
  initialTickets: Ticket[];
  initialBadgeColors: BadgeColor[];
  initialStatusOptions: StatusOption[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialSistemaOrigemOptions?: any[];
  isMaster: boolean;
}

const SYSTEMS = ["Domínio", "Alterdata"];

const MUTED = "var(--onity-dark-text-muted)";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function calculateTotalDays(createdAtIso: string) {
  if (!createdAtIso) return 1;
  const created = new Date(createdAtIso);
  const today = new Date();
  const d1 = new Date(created.getFullYear(), created.getMonth(), created.getDate());
  const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = d2.getTime() - d1.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, days);
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

  // form ticket
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [saving, setSaving] = useState(false);

  // detail drawer
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [drawerTab, setDrawerTab] = useState<"detalhes" | "comentarios">("detalhes");
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

  // confirm delete
  const [deleteTicket, setDeleteTicket] = useState<Ticket | null>(null);
  const [deleteComment, setDeleteComment] = useState<Comment | null>(null);
  const [deleteColor, setDeleteColor] = useState<BadgeColor | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<StatusOption | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // form fields
  const emptyForm = {
    franchiseName: "",
    sistemaOrigem: "",
    status: "T0 - Coleta inicial de dados",
    statusColorId: "" as string,
    companies: "",
    lembrete: "",
    agendado: "",
    solicitacao: "",
    ssc: "",
    tempoMigracao: "",
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
      status: t.status,
      statusColorId: t.statusColorId ? String(t.statusColorId) : "",
      companies: t.companies ? String(t.companies) : "",
      lembrete: t.lembrete ? t.lembrete.substring(0, 10) : "",
      agendado: t.agendado ? t.agendado.substring(0, 10) : "",
      solicitacao: t.solicitacao ?? "",
      ssc: t.ssc ?? "",
      tempoMigracao: t.tempoMigracao ?? "",
      dConcluido: t.dConcluido ? t.dConcluido.substring(0, 10) : "",
    });
    setEditing(t);
    setFormOpen(true);
  }

  async function saveTicket() {
    if (!form.franchiseName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        franchiseName: form.franchiseName.trim(),
        sistemaOrigem: form.sistemaOrigem || null,
        status: form.status,
        statusColorId: form.statusColorId || null,
        companies: form.companies ? Number(form.companies) : null,
        lembrete: form.lembrete || null,
        agendado: form.agendado || null,
        solicitacao: form.solicitacao || null,
        ssc: form.ssc || null,
        tempoMigracao: form.tempoMigracao || null,
        dConcluido: form.status === "Transbordo concluído" ? (form.dConcluido || null) : null,
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
  async function openTicket(t: Ticket, tab: "detalhes" | "comentarios" = "detalhes") {
    setSelected(t);
    setDrawerTab(tab);
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

      {/* ── Modal Pop-up Novo/Editar Ticket ── */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setFormOpen(false);
              setEditing(null);
            }
          }}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200"
            style={{
              background: "#0f172a",
              border: "1px solid rgba(255,255,255,.12)",
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-semibold text-white">
                {editing ? "Editar Ticket" : "Novo Ticket"}
              </h3>
              <button
                className="text-white/60 hover:text-white text-xl leading-none transition-colors px-1"
                onClick={() => {
                  setFormOpen(false);
                  setEditing(null);
                }}
                title="Fechar"
              >
                ×
              </button>
            </div>

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
                  {SYSTEMS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: MUTED }}>
                  Status
                </label>
                <input
                  className="ds-input w-full"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  placeholder="ex: T0 - Coleta inicial de dados"
                  list="status-options-list"
                />
                <datalist id="status-options-list">
                  {statusOptions.filter((s) => s.isActive).map((s) => (
                    <option key={s.id} value={s.label} />
                  ))}
                </datalist>
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
                  type="date"
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
                  type="date"
                  className="ds-input w-full"
                  value={form.agendado}
                  onChange={(e) => setForm((f) => ({ ...f, agendado: e.target.value }))}
                />
              </div>

              {form.status === "Transbordo concluído" && (
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
              )}
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

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
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
        </div>
      )}

      {/* ── Config panel (master only) ── */}
      {isMaster && configOpen && (
        <div className="glass-card rounded-xl p-5 mb-6 space-y-5">
          <h3 className="text-sm font-semibold text-white">Configurações do módulo</h3>

          {/* Badge Colors */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: MUTED }}>
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
              <div className="glass-card rounded-lg p-3 mb-3 flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: MUTED }}>
                    Label
                  </label>
                  <input
                    className="ds-input text-sm"
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
                    className="h-9 w-14 rounded cursor-pointer border-0 bg-transparent"
                    value={newColor.hexValue}
                    onChange={(e) => setNewColor((c) => ({ ...c, hexValue: e.target.value }))}
                  />
                </div>
                <button
                  className="btn-primary text-xs px-3 py-2"
                  onClick={createColor}
                  disabled={!newColor.label.trim()}
                >
                  Criar
                </button>
                <button
                  className="link-muted text-xs px-3 py-2"
                  onClick={() => setColorForm(false)}
                >
                  Cancelar
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
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
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: MUTED }}>
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
              <div className="glass-card rounded-lg p-3 mb-3 flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: MUTED }}>
                    Label
                  </label>
                  <input
                    className="ds-input text-sm"
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
                    className="ds-input text-sm"
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
                    className="ds-input text-sm w-20"
                    value={newStatus.sortOrder}
                    onChange={(e) => setNewStatus((s) => ({ ...s, sortOrder: e.target.value }))}
                  />
                </div>
                <button
                  className="btn-primary text-xs px-3 py-2"
                  onClick={createStatusOption}
                  disabled={!newStatus.label.trim()}
                >
                  Criar
                </button>
                <button
                  className="link-muted text-xs px-3 py-2"
                  onClick={() => setStatusForm(false)}
                >
                  Cancelar
                </button>
              </div>
            )}

            <div className="space-y-1">
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
                      {t.companies != null && <span>{t.companies} empresa{t.companies !== 1 ? "s" : ""}</span>}
                      {t.ssc && <span>SSC: {t.ssc}</span>}
                      <span>Total de dias: {calculateTotalDays(t.createdAt)}</span>
                      <span>{formatDate(t.createdAt)}</span>
                    </div>
                  </div>

                  {/* ações */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="text-xs link-muted"
                      onClick={() => openTicket(t, "comentarios")}
                    >
                      {t._count.comments > 0 ? `${t._count.comments} comentário${t._count.comments !== 1 ? "s" : ""}` : "Comentários"}
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
            <div className="p-5 border-b border-white/10 space-y-3">
              <div className="flex items-start justify-between gap-4">
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

              {/* Abas */}
              <div className="flex border-b border-white/10 gap-4 text-xs font-medium pt-1">
                <button
                  className={`pb-2 transition-colors relative ${
                    drawerTab === "detalhes" ? "text-blue-400 border-b-2 border-blue-400 font-semibold" : "text-white/60 hover:text-white"
                  }`}
                  onClick={() => setDrawerTab("detalhes")}
                >
                  Detalhes
                </button>
                <button
                  className={`pb-2 transition-colors relative ${
                    drawerTab === "comentarios" ? "text-blue-400 border-b-2 border-blue-400 font-semibold" : "text-white/60 hover:text-white"
                  }`}
                  onClick={() => setDrawerTab("comentarios")}
                >
                  Comentários ({selected._count.comments})
                </button>
              </div>
            </div>

            {/* Conteúdo da aba Detalhes */}
            {drawerTab === "detalhes" && (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                  {[
                    ["Sistema origem", selected.sistemaOrigem],
                    ["Empresas", selected.companies],
                    ["SSC", selected.ssc],
                    ["Tempo de migração", selected.tempoMigracao],
                    ["Total de dias", `${calculateTotalDays(selected.createdAt)} dias`],
                    ["Lembrete", formatDate(selected.lembrete)],
                    ["Agendado", formatDate(selected.agendado)],
                    ["Data de conclusão", formatDate(selected.dConcluido)],
                    ["Criado em", formatDate(selected.createdAt)],
                  ]
                    .filter(([, v]) => v != null && v !== "" && v !== "—")
                    .map(([k, v]) => (
                      <div key={String(k)}>
                        <span style={{ color: MUTED }}>{k}: </span>
                        <span className="text-white/80">{String(v)}</span>
                      </div>
                    ))}
                </div>

                {selected.solicitacao && (
                  <div className="pt-2 border-t border-white/10">
                    <span className="text-xs font-medium" style={{ color: MUTED }}>
                      Solicitação:
                    </span>
                    <p className="text-xs text-white/80 mt-1 whitespace-pre-wrap">
                      {selected.solicitacao}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo da aba Comentários */}
            {drawerTab === "comentarios" && (
              <>
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
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
              </>
            )}
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
    </>
  );
}
