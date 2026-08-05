"use client";

import { useState, useRef, useEffect } from "react";
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
  colorId?: number | null;
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

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
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
  const [isClosingForm, setIsClosingForm] = useState(false);
  const [modalTab, setModalTab] = useState<"dados" | "comentarios">("dados");
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [saving, setSaving] = useState(false);

  function handleCloseForm() {
    setIsClosingForm(true);
    setTimeout(() => {
      setFormOpen(false);
      setEditing(null);
      setIsClosingForm(false);
    }, 240);
  }

  // detail drawer & comments
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [isClosingModal, setIsClosingModal] = useState(false);

  function handleCloseModal() {
    setIsClosingModal(true);
    setTimeout(() => {
      setSelected(null);
      setIsClosingModal(false);
    }, 240);
  }
  const [drawerTab, setDrawerTab] = useState<"detalhes" | "comentarios">("detalhes");
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [sendingComment, setSendingComment] = useState(false);

  // inline editing no modal de detalhes
  const [editingInlineField, setEditingInlineField] = useState<"ssc" | "companies" | "solicitacao" | "lembrete" | "agendado" | null>(null);
  const [inlineValue, setInlineValue] = useState<string>("");
  const [showSistemaOrigemSelect, setShowSistemaOrigemSelect] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sistemaOrigemOptions, setSistemaOrigemOptions] = useState<any[]>(initialSistemaOrigemOptions ?? []);
  const [statusDropdownTicketId, setStatusDropdownTicketId] = useState<string | null>(null);
  const [listTab, setListTab] = useState<"andamento" | "recentes" | "concluidos">("andamento");

  useEffect(() => {
    fetch("/api/admin/transbordo/sistema-origem-options")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setSistemaOrigemOptions(data))
      .catch(() => {});
  }, []);

  async function changeStatusInline(ticketId: string, newStatus: string, colorId?: number | null) {
    const targetColor = colorId ? badgeColors.find((c) => c.id === colorId) : null;
    
    const now = new Date().toISOString();
    // Optimistic UI Update
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          status: newStatus,
          statusColorId: colorId !== undefined ? colorId : t.statusColorId,
          ...(targetColor ? { statusColor: targetColor } : {}),
          updatedAt: now,
        };
      })
    );
    setStatusDropdownTicketId(null);

    try {
      const payload: Record<string, any> = { status: newStatus };
      if (colorId !== undefined) {
        payload.statusColorId = colorId;
      }
      const res = await fetch(`/api/admin/transbordo/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated: Ticket = await res.json();
        setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        if (selected?.id === updated.id) {
          setSelected(updated);
        }
      }
    } catch {
      // Rollback se falhar
      fetch("/api/admin/transbordo")
        .then((r) => r.json())
        .then((data) => setTickets(data));
    }
  }

  async function updateSingleField(field: string, value: any) {
    if (!selected) return;
    try {
      const res = await fetch(`/api/admin/transbordo/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        const updated: Ticket = await res.json();
        setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setSelected(updated);
      }
    } catch {
      // ignore
    } finally {
      setEditingInlineField(null);
      setShowSistemaOrigemSelect(false);
    }
  }

  // config panel (master)
  const [configOpen, setConfigOpen] = useState(false);
  const [isClosingConfigModal, setIsClosingConfigModal] = useState(false);

  function handleCloseConfigModal() {
    setIsClosingConfigModal(true);
    setTimeout(() => {
      setConfigOpen(false);
      setIsClosingConfigModal(false);
    }, 240);
  }
  const [colorForm, setColorForm] = useState(false);
  const [showDeleteColorIcons, setShowDeleteColorIcons] = useState(false);
  const [newColor, setNewColor] = useState({ label: "", hexValue: "#3b82f6" });
  const [statusForm, setStatusForm] = useState(false);
  const [showDeleteStatusIcons, setShowDeleteStatusIcons] = useState(false);
  const [newStatus, setNewStatus] = useState({ label: "", colorId: "" });

  const [sistemaOrigemForm, setSistemaOrigemForm] = useState(false);
  const [showDeleteSistemaOrigemIcons, setShowDeleteSistemaOrigemIcons] = useState(false);
  const [newSistemaOrigem, setNewSistemaOrigem] = useState({ label: "" });

  // confirm delete
  const [deleteTicket, setDeleteTicket] = useState<Ticket | null>(null);
  const [deleteComment, setDeleteComment] = useState<Comment | null>(null);
  const [deleteColor, setDeleteColor] = useState<BadgeColor | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<StatusOption | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deleteSistemaOrigem, setDeleteSistemaOrigem] = useState<any | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const modalFileRef = useRef<HTMLInputElement>(null);

  // form fields
  const emptyForm = {
    franchiseName: "",
    sistemaOrigem: "",
    status: "T0 - Coleta de dados",
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
    setModalTab("dados");
    setComments([]);
    setCommentText("");
    setCommentFiles([]);
    setFormOpen(true);
  }

  async function openEdit(t: Ticket, initialTab: "dados" | "comentarios" = "dados") {
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
    setModalTab(initialTab);
    setCommentText("");
    setCommentFiles([]);
    setFormOpen(true);

    setLoadingComments(true);
    try {
      const res = await fetch(`/api/admin/transbordo/${t.id}/comments`);
      const data: Comment[] = await res.json();
      setComments(data);
    } finally {
      setLoadingComments(false);
    }
  }

  async function saveTicket() {
    if (!form.franchiseName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        franchiseName: form.franchiseName.trim(),
        sistemaOrigem: form.sistemaOrigem || null,
        status: form.status,
        statusColorId: form.statusColorId ? Number(form.statusColorId) : null,
        companies: form.companies ? Number(form.companies) : null,
        lembrete: form.lembrete || null,
        agendado: form.agendado || null,
        solicitacao: form.solicitacao || null,
        ssc: form.ssc || null,
        tempoMigracao: form.tempoMigracao || null,
        dConcluido: form.status === "Transbordo concluído" ? (form.dConcluido || null) : null,
      };

      let targetTicketId = editing?.id;

      if (editing) {
        // Optimistic UI para edição
        setTickets((prev) =>
          prev.map((t) => (t.id === editing.id ? ({ ...t, ...payload } as Ticket) : t))
        );
        handleCloseForm();
        fetch(`/api/admin/transbordo/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
          .then((r) => r.json())
          .then((updated: Ticket) => {
            setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            if (selected?.id === updated.id) setSelected(updated);
          });
      } else {
        // Criação rápida: fecha modal imediatamente ao receber resposta do backend
        const res = await fetch("/api/admin/transbordo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const created: Ticket = await res.json();
        targetTicketId = created.id;
        setTickets((prev) => [created, ...prev]);
        handleCloseForm();
      }

      // Enviar comentário com anexos se preenchido no formulário de criação/edição
      if (targetTicketId && (commentText.trim() || commentFiles.length > 0)) {
        let resC: Response;
        if (commentFiles.length > 0) {
          const fd = new FormData();
          fd.append("content", commentText.trim() || "Anexo adicionado");
          commentFiles.forEach((f) => fd.append("attachments", f));
          resC = await fetch(`/api/admin/transbordo/${targetTicketId}/comments`, {
            method: "POST",
            body: fd,
          });
        } else {
          resC = await fetch(`/api/admin/transbordo/${targetTicketId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: commentText.trim() }),
          });
        }
        const createdComment: Comment = await resC.json();
        setComments((prev) => [...prev, createdComment]);
        const now = new Date().toISOString();
        setTickets((prev) =>
          prev.map((t) =>
            t.id === targetTicketId
              ? { ...t, updatedAt: now, _count: { comments: t._count.comments + 1 } }
              : t
          )
        );
      }

      setFormOpen(false);
      setEditing(null);
      setCommentText("");
      setCommentFiles([]);
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
      const now = new Date().toISOString();
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selected.id
            ? { ...t, updatedAt: now, _count: { comments: t._count.comments + 1 } }
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
    const res = await fetch(`/api/admin/transbordo/comments/${deleteComment.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    const remaining = comments.filter((c) => c.id !== deleteComment.id);
    setComments(remaining);
    if (selected) {
      const fallbackDate = remaining.length > 0 ? remaining[remaining.length - 1].createdAt : selected.createdAt;
      const newUpdatedAt = data.newUpdatedAt ?? fallbackDate;
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selected.id
            ? { ...t, updatedAt: newUpdatedAt, _count: { comments: Math.max(0, t._count.comments - 1) } }
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
      body: JSON.stringify({ label: newStatus.label.trim(), colorId: newStatus.colorId ? Number(newStatus.colorId) : null }),
    });
    if (res.ok) {
      const opt: StatusOption = await res.json();
      setStatusOptions((prev) => [...prev, opt]);
      setNewStatus({ label: "", colorId: "" });
      setStatusForm(false);
    }
  }

  async function confirmDeleteStatus() {
    if (!deleteStatus) return;
    await fetch(`/api/admin/transbordo/status-options/${deleteStatus.id}`, { method: "DELETE" });
    setStatusOptions((prev) => prev.filter((s) => s.id !== deleteStatus.id));
    setDeleteStatus(null);
  }

  // sistema origem options
  async function createSistemaOrigem() {
    if (!newSistemaOrigem.label.trim()) return;
    const res = await fetch("/api/admin/transbordo/sistema-origem-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newSistemaOrigem.label.trim() }),
    });
    if (res.ok) {
      const opt = await res.json();
      setSistemaOrigemOptions((prev) => [...prev, opt].sort((a, b) => a.label.localeCompare(b.label)));
      setNewSistemaOrigem({ label: "" });
      setSistemaOrigemForm(false);
    }
  }

  async function confirmDeleteSistemaOrigem() {
    if (!deleteSistemaOrigem) return;
    await fetch(`/api/admin/transbordo/sistema-origem-options/${deleteSistemaOrigem.id}`, { method: "DELETE" });
    setSistemaOrigemOptions((prev) => prev.filter((s) => s.id !== deleteSistemaOrigem.id));
    setDeleteSistemaOrigem(null);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const filteredTickets = tickets
    .filter((t) => {
      if (listTab === "concluidos") {
        return t.status === "Transbordo concluído";
      }
      if (listTab === "andamento") {
        return t.status !== "Transbordo concluído";
      }
      return true; // "recentes" mostra todos ordenados por última alteração
    })
    .sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary text-sm px-5 py-2 rounded-lg" onClick={openCreate}>
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
        </div>

        {/* Abas Em Andamento / Recentes / Concluídos */}
        <div className="flex items-center gap-1 rounded-xl p-1 bg-white/5 border border-white/10">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              listTab === "andamento"
                ? "bg-blue-600 text-white shadow-md font-semibold"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
            onClick={() => setListTab("andamento")}
          >
            Em Andamento ({tickets.filter((t) => t.status !== "Transbordo concluído").length})
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              listTab === "recentes"
                ? "bg-violet-600 text-white shadow-md font-semibold"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
            onClick={() => setListTab("recentes")}
          >
            Recentes ({tickets.length})
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              listTab === "concluidos"
                ? "bg-emerald-600 text-white shadow-md font-semibold"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
            onClick={() => setListTab("concluidos")}
          >
            Concluídos ({tickets.filter((t) => t.status === "Transbordo concluído").length})
          </button>
        </div>
      </div>

      {/* ── Modal Pop-up Novo/Editar Ticket ── */}
      {formOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm ${
            isClosingForm ? "animate-modal-overlay-out" : "animate-modal-overlay"
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseForm();
            }
          }}
        >
          <div
            className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-4 shadow-2xl ${
              isClosingForm ? "animate-modal-content-out" : "animate-modal-content"
            }`}
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
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-red-500/40 text-red-400 hover:border-red-500 hover:bg-red-500/10 hover:text-red-300 text-xl font-bold transition-all leading-none shrink-0"
                onClick={handleCloseForm}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Formulário Unificado (Sem Abas) */}
            <div className="space-y-4">
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
                      <option key={s.id || s.label} value={s.label}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {editing && (
                  <div>
                    <label className="block text-xs mb-1" style={{ color: MUTED }}>
                      Status
                    </label>
                    <input
                      className="ds-input w-full"
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      placeholder="ex: T0 - Coleta de dados"
                      list="status-options-list"
                    />
                    <datalist id="status-options-list">
                      {statusOptions.filter((s) => s.isActive).map((s) => (
                        <option key={s.id} value={s.label} />
                      ))}
                    </datalist>
                  </div>
                )}

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

              {/* Seção de Comentários e Anexos */}
              <div className="border-t border-white/10 pt-3 space-y-3">
                <label className="block text-xs font-semibold text-white">
                  {editing ? "Comentários e Anexos" : "Adicionar Comentário / Anexar Documentos"}
                </label>

                {editing && (
                  <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                    {loadingComments && (
                      <p className="text-xs" style={{ color: MUTED }}>Carregando comentários…</p>
                    )}
                    {!loadingComments && comments.length === 0 && (
                      <p className="text-xs" style={{ color: MUTED }}>Nenhum comentário cadastrado ainda.</p>
                    )}
                    {comments.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-lg p-3 space-y-1 text-xs"
                        style={{ background: "rgba(255,255,255,.04)" }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-white/80 whitespace-pre-wrap flex-1">{c.content}</p>
                          <button
                            type="button"
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
                )}

                <textarea
                  className="ds-input w-full text-xs"
                  rows={2}
                  placeholder="Escreva um comentário ou observação para este ticket…"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/80 hover:text-white hover:border-white/30 transition-colors"
                      onClick={() => modalFileRef.current?.click()}
                    >
                      📎 Anexar Documento(s)
                    </button>
                    <input
                      ref={modalFileRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => setCommentFiles(Array.from(e.target.files ?? []))}
                    />
                  </div>
                </div>

                {commentFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {commentFiles.map((f, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px]"
                        style={{ background: "rgba(59,130,246,.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,.3)" }}
                      >
                        {f.name}
                        <button
                          type="button"
                          className="text-red-400 hover:text-red-300 font-bold ml-1"
                          onClick={() => setCommentFiles((files) => files.filter((_, i) => i !== idx))}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                className="text-xs font-medium text-slate-300 border border-white/20 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all"
                onClick={handleCloseForm}
              >
                Cancelar
              </button>
              <button
                className="btn-primary text-xs px-5 py-2 rounded-xl font-semibold transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                onClick={saveTicket}
                disabled={saving || !form.franchiseName.trim()}
              >
                {saving ? "Salvando…" : editing ? "Salvar alterações" : "Criar ticket"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Configurações (master only) ── */}
      {isMaster && configOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm ${
            isClosingConfigModal ? "animate-modal-overlay-out" : "animate-modal-overlay"
          }`}
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseConfigModal(); }}
        >
          <div
            className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-6 shadow-2xl ${
              isClosingConfigModal ? "animate-modal-content-out" : "animate-modal-content"
            }`}
            style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,.1)" }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-semibold text-white">Configurações do módulo</h3>
              <button
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-red-500/40 text-red-400 hover:border-red-500 hover:bg-red-500/10 hover:text-red-300 text-xl font-bold transition-all leading-none shrink-0"
                onClick={handleCloseConfigModal}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Badge Colors */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: MUTED }}>
                  Cores de badge
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-all border ${
                      showDeleteColorIcons
                        ? "text-red-400 border-red-500/60 bg-red-500/20 hover:bg-red-500/30"
                        : "text-red-400 border-red-500/40 bg-red-500/10 hover:bg-red-500/20 hover:border-red-400"
                    }`}
                    onClick={() => setShowDeleteColorIcons((v) => !v)}
                  >
                    {showDeleteColorIcons ? "Concluir" : "Excluir cor"}
                  </button>
                  <button
                    className="text-xs font-medium text-blue-400 border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-400 px-2.5 py-1 rounded-lg transition-all"
                    onClick={() => setColorForm((v) => !v)}
                  >
                    + Nova cor
                  </button>
                </div>
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
                    className="btn-primary text-xs px-3 py-2 rounded-lg"
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
                    {showDeleteColorIcons && (
                      <button
                        className="ml-1 opacity-80 hover:opacity-100 transition-opacity text-red-400 font-bold"
                        onClick={() => setDeleteColor(c)}
                        title="Excluir"
                      >
                        ×
                      </button>
                    )}
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
                <div className="flex items-center gap-2">
                  <button
                    className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-all border ${
                      showDeleteStatusIcons
                        ? "text-red-400 border-red-500/60 bg-red-500/20 hover:bg-red-500/30"
                        : "text-red-400 border-red-500/40 bg-red-500/10 hover:bg-red-500/20 hover:border-red-400"
                    }`}
                    onClick={() => setShowDeleteStatusIcons((v) => !v)}
                  >
                    {showDeleteStatusIcons ? "Concluir" : "Excluir status"}
                  </button>
                  <button
                    className="text-xs font-medium text-blue-400 border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-400 px-2.5 py-1 rounded-lg transition-all"
                    onClick={() => setStatusForm((v) => !v)}
                  >
                    + Novo status
                  </button>
                </div>
              </div>

              {statusForm && (
                <div className="glass-card rounded-lg p-3 mb-3 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: MUTED }}>
                      Nome do status
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
                      Cor da tag
                    </label>
                    <select
                      className="ds-input text-sm"
                      value={newStatus.colorId}
                      onChange={(e) => setNewStatus((s) => ({ ...s, colorId: e.target.value }))}
                    >
                      <option value="">— Selecionar cor —</option>
                      {badgeColors.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label} ({c.hexValue})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="btn-primary text-xs px-3 py-2 rounded-lg"
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

              <div className="flex flex-wrap gap-2">
                {statusOptions.map((s) => {
                  // busca cor associada no badgeColors se houver
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const matchedColor = badgeColors.find((c) => c.id === (s as any).colorId);
                  const hex = matchedColor?.hexValue ?? "#3b82f6";
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
                      style={{ background: hex + "22", color: hex, border: `1px solid ${hex}44` }}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ background: hex }}
                      />
                      {s.label}
                      {showDeleteStatusIcons && (
                        <button
                          className="ml-1 opacity-80 hover:opacity-100 transition-opacity text-red-400 font-bold"
                          onClick={() => setDeleteStatus(s)}
                          title="Excluir"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
                {statusOptions.length === 0 && (
                  <span className="text-xs" style={{ color: MUTED }}>
                    Nenhuma opção cadastrada.
                  </span>
                )}
              </div>
            </div>

            {/* Sistemas Origem Options */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: MUTED }}>
                  Sistemas origem disponíveis
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-all border ${
                      showDeleteSistemaOrigemIcons
                        ? "text-red-400 border-red-500/60 bg-red-500/20 hover:bg-red-500/30"
                        : "text-red-400 border-red-500/40 bg-red-500/10 hover:bg-red-500/20 hover:border-red-400"
                    }`}
                    onClick={() => setShowDeleteSistemaOrigemIcons((v) => !v)}
                  >
                    {showDeleteSistemaOrigemIcons ? "Concluir" : "Excluir sistema"}
                  </button>
                  <button
                    className="text-xs font-medium text-blue-400 border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-400 px-2.5 py-1 rounded-lg transition-all"
                    onClick={() => setSistemaOrigemForm((v) => !v)}
                  >
                    + Novo Sistema
                  </button>
                </div>
              </div>

              {sistemaOrigemForm && (
                <div className="glass-card rounded-lg p-3 mb-3 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: MUTED }}>
                      Nome do Sistema
                    </label>
                    <input
                      className="ds-input text-sm"
                      value={newSistemaOrigem.label}
                      onChange={(e) => setNewSistemaOrigem({ label: e.target.value })}
                      placeholder="ex: Alterdata / Domínio"
                    />
                  </div>
                  <button
                    className="btn-primary text-xs px-3 py-2 rounded-lg"
                    onClick={createSistemaOrigem}
                    disabled={!newSistemaOrigem.label.trim()}
                  >
                    Criar
                  </button>
                  <button
                    className="link-muted text-xs px-3 py-2"
                    onClick={() => setSistemaOrigemForm(false)}
                  >
                    Cancelar
                  </button>
                </div>
              )}

              <div className="space-y-1">
                {sistemaOrigemOptions.map((so) => (
                  <div
                    key={so.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
                    style={{ background: "rgba(255,255,255,.04)" }}
                  >
                    <span className="text-white/80">{so.label}</span>
                    {showDeleteSistemaOrigemIcons && (
                      <button
                        className="opacity-80 hover:opacity-100 transition-opacity text-red-400 font-medium"
                        onClick={() => setDeleteSistemaOrigem(so)}
                        title="Excluir"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                ))}
                {sistemaOrigemOptions.length === 0 && (
                  <span className="text-xs" style={{ color: MUTED }}>
                    Nenhum sistema origem cadastrado.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabela de tickets ── */}
      {filteredTickets.length === 0 ? (
        <div
          className="rounded-xl border border-white/10 p-10 text-center text-sm"
          style={{ color: MUTED }}
        >
          {listTab === "concluidos"
            ? "Nenhum ticket concluído encontrado."
            : listTab === "recentes"
            ? "Nenhum ticket com atividade recente."
            : "Nenhum ticket em andamento. Clique em \"+ Novo Ticket\" para começar."}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((t) => {
            // resolve a cor: t.statusColor ou pela cor associada ao status
            const statusOpt = statusOptions.find((so) => so.label === t.status);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const matchedColor = t.statusColor ?? badgeColors.find((c) => c.id === (statusOpt as any)?.colorId);
            const isDropdownOpen = statusDropdownTicketId === t.id;
            return (
              <div
                key={t.id}
                className={`glass-card rounded-xl p-4 cursor-pointer hover:border-white/20 transition-all ${
                  isDropdownOpen ? "relative z-30" : "relative z-0"
                }`}
                onClick={() => openTicket(t)}
              >
                <div className="flex flex-wrap items-start gap-3">
                  {/* info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white truncate max-w-[260px]">
                        {t.franchiseName}
                      </span>
                      {/* badge de status interativa */}
                      <div className="relative">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium hover:brightness-125 transition-all cursor-pointer"
                          style={
                            matchedColor
                              ? {
                                  background: matchedColor.hexValue + "22",
                                  color: matchedColor.hexValue,
                                  border: `1px solid ${matchedColor.hexValue}44`,
                                }
                              : {
                                  background: "rgba(148,163,184,.15)",
                                  color: "#94a3b8",
                                  border: "1px solid rgba(148,163,184,.2)",
                                }
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatusDropdownTicketId((prev) => (prev === t.id ? null : t.id));
                          }}
                          title="Clique para alterar status"
                        >
                          <span>{t.status}</span>
                          <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {isDropdownOpen && (
                          <div
                            className="absolute left-0 top-full mt-1.5 z-50 min-w-[200px] rounded-xl p-1.5 shadow-2xl space-y-1 backdrop-blur-md"
                            style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,.15)" }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseLeave={() => setStatusDropdownTicketId(null)}
                          >
                            {statusOptions
                              .filter((so) => so.isActive)
                              .map((so) => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const c = badgeColors.find((bc) => bc.id === (so as any).colorId);
                                const hex = c?.hexValue ?? "#3b82f6";
                                const isSelected = t.status === so.label;
                                return (
                                  <button
                                    key={so.id}
                                    type="button"
                                    className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left transition-all ${
                                      isSelected ? "bg-white/10 font-semibold" : "hover:bg-white/5"
                                    }`}
                                    onClick={() => void changeStatusInline(t.id, so.label, (so as any).colorId)}
                                  >
                                    <span
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{ background: hex }}
                                    />
                                    <span className="text-white/90 truncate">{so.label}</span>
                                    {isSelected && <span className="ml-auto text-emerald-400 font-bold">✓</span>}
                                  </button>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* meta */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: MUTED }}>
                      {t.sistemaOrigem && <span>Origem: {t.sistemaOrigem}</span>}
                      {t.companies != null && <span>{t.companies} empresa{t.companies !== 1 ? "s" : ""}</span>}
                      {t.ssc && <span>SSC: {t.ssc}</span>}
                      <span>Total de dias: {calculateTotalDays(t.createdAt)}</span>
                      {listTab === "recentes" && (
                        <span className="text-violet-400 font-medium">
                          Modificado: {formatDateTime(t.updatedAt || t.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lembrete & Agendado no canto direito */}
                  <div className="flex flex-col items-end justify-center text-xs shrink-0 self-center gap-0.5" style={{ color: MUTED }}>
                    <div>
                      <span>Lembrete: </span>
                      <span className="text-white/90 font-medium">{formatDate(t.lembrete)}</span>
                    </div>
                    <div>
                      <span>Agendado: </span>
                      <span className="text-white/90 font-medium">{formatDate(t.agendado)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal de detalhes / comentários ── */}
      {selected && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm ${
            isClosingModal ? "animate-modal-overlay-out" : "animate-modal-overlay"
          }`}
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}
        >
          <div
            className={`w-full max-w-2xl flex flex-col overflow-hidden rounded-2xl shadow-2xl ${
              isClosingModal ? "animate-modal-content-out" : "animate-modal-content"
            }`}
            style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,.1)", maxHeight: "90vh" }}
          >
            {/* header drawer */}
            <div className="p-5 border-b border-white/10 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white truncate">
                  {selected.franchiseName}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                  {selected.status}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center justify-center w-8 h-8 rounded-lg border border-red-500/40 text-red-400 hover:border-red-500 hover:bg-red-500/10 hover:text-red-300 text-xl font-bold transition-all leading-none shrink-0"
                  onClick={handleCloseModal}
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Conteúdo rolável */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Informações da Migração */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Informações da Migração
                </h3>

                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                  {/* Sistema Origem com Lápis/Dropdown */}
                  <div className="relative">
                    <span style={{ color: MUTED }}>Sistema origem: </span>
                    <span className="text-white/80">{selected.sistemaOrigem || "—"}</span>
                    <button
                      type="button"
                      className="ml-1.5 p-1 inline-flex items-center text-slate-300 hover:text-white transition-all rounded border border-white/20 bg-white/5 hover:bg-white/10"
                      onClick={() => {
                        setShowSistemaOrigemSelect((v) => !v);
                        setEditingInlineField(null);
                      }}
                      title="Alterar Sistema Origem"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {showSistemaOrigemSelect && (
                      <div className="absolute left-0 top-full mt-1 z-30 w-48 rounded-xl p-2 shadow-2xl border border-white/10 bg-slate-900 space-y-1">
                        <p className="text-[10px] uppercase font-semibold text-slate-400 px-2 py-1">Selecionar Sistema</p>
                        {sistemaOrigemOptions.length === 0 && (
                          <p className="text-xs px-2 py-1 text-slate-400">Nenhum sistema configurado</p>
                        )}
                        {sistemaOrigemOptions.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            className="w-full text-left px-2 py-1 text-xs rounded hover:bg-white/10 text-white transition-colors"
                            onClick={() => updateSingleField("sistemaOrigem", opt.label)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Empresas com Lápis/Input Inline */}
                  <div>
                    <span style={{ color: MUTED }}>Empresas: </span>
                    {editingInlineField === "companies" ? (
                      <input
                        type="number"
                        className="ds-input w-24 px-2 py-0.5 text-xs ml-1"
                        value={inlineValue}
                        onChange={(e) => setInlineValue(e.target.value)}
                        onBlur={() => setEditingInlineField(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void updateSingleField("companies", inlineValue ? Number(inlineValue) : null);
                          } else if (e.key === "Escape") {
                            setEditingInlineField(null);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <>
                        <span className="text-white/80">{selected.companies ?? "—"}</span>
                        <button
                          type="button"
                          className="ml-1.5 p-1 inline-flex items-center text-slate-300 hover:text-white transition-all rounded border border-white/20 bg-white/5 hover:bg-white/10"
                          onClick={() => {
                            setEditingInlineField("companies");
                            setInlineValue(selected.companies ? String(selected.companies) : "");
                            setShowSistemaOrigemSelect(false);
                          }}
                          title="Editar Empresas"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>

                  {/* SSC com Lápis/Input Inline */}
                  <div>
                    <span style={{ color: MUTED }}>SSC: </span>
                    {editingInlineField === "ssc" ? (
                      <input
                        type="text"
                        className="ds-input w-28 px-2 py-0.5 text-xs ml-1"
                        value={inlineValue}
                        onChange={(e) => setInlineValue(e.target.value)}
                        onBlur={() => setEditingInlineField(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void updateSingleField("ssc", inlineValue || null);
                          } else if (e.key === "Escape") {
                            setEditingInlineField(null);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <>
                        <span className="text-white/80">{selected.ssc || "—"}</span>
                        <button
                          type="button"
                          className="ml-1.5 p-1 inline-flex items-center text-slate-300 hover:text-white transition-all rounded border border-white/20 bg-white/5 hover:bg-white/10"
                          onClick={() => {
                            setEditingInlineField("ssc");
                            setInlineValue(selected.ssc ?? "");
                            setShowSistemaOrigemSelect(false);
                          }}
                          title="Editar SSC"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Lembrete com Lápis/Input Date Inline */}
                  <div>
                    <span style={{ color: MUTED }}>Lembrete: </span>
                    {editingInlineField === "lembrete" ? (
                      <div className="inline-flex items-center gap-1.5 mt-0.5">
                        <input
                          type="date"
                          className="ds-input px-2 py-0.5 text-xs"
                          value={inlineValue}
                          onChange={(e) => setInlineValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void updateSingleField("lembrete", inlineValue || null);
                            } else if (e.key === "Escape") {
                              setEditingInlineField(null);
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="p-1 inline-flex items-center justify-center rounded border border-emerald-500/50 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 hover:border-emerald-400 transition-all text-xs font-bold leading-none"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            void updateSingleField("lembrete", inlineValue || null);
                          }}
                          title="Salvar Lembrete"
                        >
                          ✓
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-white/80">{formatDate(selected.lembrete)}</span>
                        <button
                          type="button"
                          className="ml-1.5 p-1 inline-flex items-center text-slate-300 hover:text-white transition-all rounded border border-white/20 bg-white/5 hover:bg-white/10"
                          onClick={() => {
                            setEditingInlineField("lembrete");
                            setInlineValue(selected.lembrete ? selected.lembrete.substring(0, 10) : "");
                            setShowSistemaOrigemSelect(false);
                          }}
                          title="Editar Lembrete"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Agendado com Lápis/Input Date Inline */}
                  <div>
                    <span style={{ color: MUTED }}>Agendado: </span>
                    {editingInlineField === "agendado" ? (
                      <div className="inline-flex items-center gap-1.5 mt-0.5">
                        <input
                          type="date"
                          className="ds-input px-2 py-0.5 text-xs"
                          value={inlineValue}
                          onChange={(e) => setInlineValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void updateSingleField("agendado", inlineValue || null);
                            } else if (e.key === "Escape") {
                              setEditingInlineField(null);
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="p-1 inline-flex items-center justify-center rounded border border-emerald-500/50 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 hover:border-emerald-400 transition-all text-xs font-bold leading-none"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            void updateSingleField("agendado", inlineValue || null);
                          }}
                          title="Salvar Agendado"
                        >
                          ✓
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-white/80">{formatDate(selected.agendado)}</span>
                        <button
                          type="button"
                          className="ml-1.5 p-1 inline-flex items-center text-slate-300 hover:text-white transition-all rounded border border-white/20 bg-white/5 hover:bg-white/10"
                          onClick={() => {
                            setEditingInlineField("agendado");
                            setInlineValue(selected.agendado ? selected.agendado.substring(0, 10) : "");
                            setShowSistemaOrigemSelect(false);
                          }}
                          title="Editar Agendado"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Outros campos de apenas leitura */}
                  {[
                    ["Tempo de migração", selected.tempoMigracao],
                    ["Total de dias", `${calculateTotalDays(selected.createdAt)} dias`],
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

                {/* Solicitação com Lápis/Textarea Inline */}
                <div className="pt-2 border-t border-white/10">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium" style={{ color: MUTED }}>
                      Solicitação:
                    </span>
                    {editingInlineField !== "solicitacao" && (
                      <button
                        type="button"
                        className="p-1 inline-flex items-center text-slate-300 hover:text-white transition-all rounded border border-white/20 bg-white/5 hover:bg-white/10"
                        onClick={() => {
                          setEditingInlineField("solicitacao");
                          setInlineValue(selected.solicitacao ?? "");
                          setShowSistemaOrigemSelect(false);
                        }}
                        title="Editar Solicitação"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {editingInlineField === "solicitacao" ? (
                    <div className="mt-1">
                      <textarea
                        className="ds-input w-full text-xs p-2"
                        rows={3}
                        value={inlineValue}
                        onChange={(e) => setInlineValue(e.target.value)}
                        onBlur={() => setEditingInlineField(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void updateSingleField("solicitacao", inlineValue || null);
                          } else if (e.key === "Escape") {
                            setEditingInlineField(null);
                          }
                        }}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-white/80 mt-1 whitespace-pre-wrap">
                      {selected.solicitacao || "—"}
                    </p>
                  )}
                </div>
              </div>

              {/* Mostruário de Comentários */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Comentários ({comments.length})
                </h3>

                {loadingComments && (
                  <p className="text-xs" style={{ color: MUTED }}>
                    Carregando…
                  </p>
                )}

                {!loadingComments && comments.length === 0 && (
                  <p className="text-xs" style={{ color: MUTED }}>
                    Nenhum comentário registrado.
                  </p>
                )}

                <div className="space-y-3">
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg p-3 space-y-1.5 text-xs"
                      style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}
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
                              download={a.filename}
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
              </div>
            </div>

            {/* Adicionar comentário no rodapé */}
            <div
              className="p-4 border-t border-white/10 space-y-2 shrink-0"
              style={{ background: "rgba(15,23,42,.95)" }}
            >
              <textarea
                className="ds-input w-full text-sm"
                rows={2}
                placeholder="Adicionar comentário…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!sendingComment && commentText.trim()) {
                      void sendComment();
                    }
                  }
                }}
              />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 rounded-lg px-3 py-1.5 border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/25 hover:text-white transition-all"
                    onClick={() => fileRef.current?.click()}
                  >
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span>Anexar</span>
                  </button>
                  {commentFiles.length > 0 && (
                    <span className="text-xs font-medium text-slate-400">
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
                  className="btn-primary text-xs px-5 py-2 rounded-lg font-semibold transition-all shadow-md"
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
      {deleteSistemaOrigem && (
        <ConfirmModal
          mensagem={`Excluir sistema origem "${deleteSistemaOrigem.label}"?`}
          onConfirm={confirmDeleteSistemaOrigem}
          onCancel={() => setDeleteSistemaOrigem(null)}
        />
      )}
    </>
  );
}
