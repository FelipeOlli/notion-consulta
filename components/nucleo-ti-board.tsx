"use client";

import { useState, useCallback } from "react";

// ─── Tipos ──────────────────────────────────────────────────────────────────
export type TiTask = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  responsible: string;
  status: "TODO" | "DOING" | "DONE";
  taskType: "MANUAL" | "AUTOMACAO" | "DELEGACAO";
  raciRef: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  initialTasks: TiTask[];
  isMaster: boolean;
};

// ─── Dados RACI estáticos ────────────────────────────────────────────────────
type Person = "felipe" | "andre" | "gabriel" | "pedro";
type BadgeModel = "Solo" | "Dupla" | "Turnos";

type RaciRow = {
  id: string;
  title: string;
  sub: string;
  owners: Person[];
  support: Person[];
  model: BadgeModel;
  auto: boolean;
};

const RACI: RaciRow[] = [
  { id: "01", title: "Cobrança de domínio · Registro.br", sub: "Renovações e notificações de vencimento", owners: ["felipe"], support: [], model: "Solo", auto: true },
  { id: "02", title: "Criação de domínio", sub: "Registro e configuração de novos domínios", owners: ["gabriel"], support: ["andre"], model: "Dupla", auto: false },
  { id: "03", title: "Domínio / Alterdata / Fortes", sub: "Sistemas contábeis principais", owners: ["andre"], support: [], model: "Solo", auto: false },
  { id: "04", title: "Transbordo Alterdata", sub: "Migração de dados Alterdata", owners: ["andre"], support: ["felipe"], model: "Dupla", auto: true },
  { id: "05", title: "Transbordo Domínio", sub: "Migração de dados Domínio", owners: ["andre"], support: ["felipe"], model: "Dupla", auto: true },
  { id: "06", title: "Atendimento", sub: "Manhã André · Tarde Gabriel", owners: ["andre", "gabriel"], support: ["pedro"], model: "Turnos", auto: false },
  { id: "07", title: "Ticket", sub: "Gestão da fila e SLA", owners: ["gabriel"], support: ["andre"], model: "Dupla", auto: false },
  { id: "08", title: "Cadastro de empresa", sub: "Onboarding de novas empresas", owners: ["pedro"], support: ["gabriel"], model: "Dupla", auto: false },
  { id: "09", title: "Servidor de email · cPanel", sub: "DNS, MX, quotas, segurança", owners: ["gabriel"], support: [], model: "Solo", auto: false },
  { id: "10", title: "SIEG", sub: "Plataforma fiscal", owners: ["andre"], support: [], model: "Solo", auto: false },
  { id: "11", title: "Certificado digital", sub: "Gestão e renovação", owners: ["felipe"], support: [], model: "Solo", auto: true },
  { id: "12", title: "COAD", sub: "Plataforma fiscal/legislativa", owners: ["andre"], support: [], model: "Solo", auto: false },
  { id: "13", title: "Google Workspace", sub: "Email corporativo, identidade", owners: ["gabriel"], support: [], model: "Solo", auto: false },
  { id: "14", title: "Hostinger", sub: "Hospedagem e infra", owners: ["gabriel"], support: [], model: "Solo", auto: false },
  { id: "15", title: "Time is Money", sub: "Ponto eletrônico", owners: ["andre"], support: [], model: "Solo", auto: false },
  { id: "16", title: "Manutenção / Onboarding máquinas", sub: "Setup de PC e software", owners: ["felipe", "andre"], support: ["pedro"], model: "Dupla", auto: false },
  { id: "17", title: "Internet", sub: "Conectividade e provedores", owners: ["andre"], support: ["pedro"], model: "Dupla", auto: false },
];

// ─── Constantes visuais ──────────────────────────────────────────────────────
const PERSONS: { key: Person; label: string; color: string; bg: string; role: string }[] = [
  { key: "felipe", label: "Felipe", color: "#d4b25a", bg: "rgba(212,178,90,0.13)", role: "Coord. TI" },
  { key: "andre", label: "André", color: "#60a5fa", bg: "rgba(96,165,250,0.12)", role: "Analista TI" },
  { key: "gabriel", label: "Gabriel", color: "#c084fc", bg: "rgba(192,132,252,0.12)", role: "Analista TI · #02" },
  { key: "pedro", label: "Pedro", color: "#4ade80", bg: "rgba(74,222,128,0.10)", role: "Estagiário · 8h–15h" },
];

const STATUS_CONFIG = {
  TODO: { label: "A fazer", color: "#8a93a8", bg: "rgba(138,147,168,0.12)" },
  DOING: { label: "Em andamento", color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
  DONE: { label: "Concluído", color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
};

const TYPE_CONFIG = {
  MANUAL: { label: "Manual", color: "#8a93a8", bg: "rgba(138,147,168,0.12)" },
  AUTOMACAO: { label: "Automação", color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  DELEGACAO: { label: "Delegação", color: "#c084fc", bg: "rgba(192,132,252,0.12)" },
};

const C = {
  surface: "#161a23",
  surface2: "#1c212d",
  bg2: "#11141b",
  border: "#232936",
  borderLight: "#2d3445",
  text: "#ecedf2",
  muted: "#8a93a8",
  dim: "#555d72",
  gold: "#d4b25a",
  green: "#4ade80",
  orange: "#fb923c",
  blue: "#60a5fa",
  red: "#f87171",
};

function getPerson(key: string) {
  return PERSONS.find((p) => p.key === key) ?? PERSONS[1];
}

// ─── Mini-componentes ────────────────────────────────────────────────────────
function PersonPill({ person }: { person: string }) {
  const p = getPerson(person);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium"
      style={{ background: p.bg, color: p.color }}>
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
      {p.label}
    </span>
  );
}

function StatusBadge({ status }: { status: TiTask["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className="rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: TiTask["taskType"] }) {
  const cfg = TYPE_CONFIG[type];
  return (
    <span className="rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

// ─── Modal de edição ─────────────────────────────────────────────────────────
function TaskModal({
  task,
  onClose,
  onUpdate,
  onDelete,
  isMaster,
}: {
  task: TiTask;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<TiTask>) => void;
  onDelete: (id: string) => void;
  isMaster: boolean;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [responsible, setResponsible] = useState(task.responsible);
  const [status, setStatus] = useState(task.status);
  const [taskType, setTaskType] = useState(task.taskType);
  const [raciRef, setRaciRef] = useState(task.raciRef ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const raciRow = RACI.find((r) => r.id === raciRef) ?? null;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/ti-tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: description || null, responsible, status, taskType, raciRef: raciRef || null }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      onUpdate(task.id, data);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Excluir "${task.title}"?`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/ti-tasks/${task.id}`, { method: "DELETE" });
      onDelete(task.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: C.bg2,
    border: `1px solid ${C.border}`,
    color: C.text,
    borderRadius: 4,
    padding: "8px 12px",
    fontSize: 13,
    width: "100%",
    outline: "none",
  };

  const selectStyle: React.CSSProperties = { ...inputStyle };
  const labelStyle: React.CSSProperties = { fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 2, color: C.muted, marginBottom: 6, display: "block" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex w-full max-w-xl flex-col gap-5 overflow-y-auto rounded-lg p-6"
        style={{ background: C.surface, border: `1px solid ${C.borderLight}`, maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="font-mono text-[10px]" style={{ color: C.dim }}>{task.code}</span>
            <h2 className="mt-0.5 text-lg font-medium" style={{ color: C.text }}>{task.title}</h2>
          </div>
          <button onClick={onClose} style={{ color: C.dim, fontSize: 20, lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>

        {/* Título */}
        <div>
          <label style={labelStyle}>Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        </div>

        {/* Descrição */}
        <div>
          <label style={labelStyle}>Descrição (opcional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            style={{ ...inputStyle, minHeight: 64, resize: "vertical" }} />
        </div>

        {/* Responsável */}
        <div>
          <label style={labelStyle}>Responsável</label>
          <select value={responsible} onChange={(e) => setResponsible(e.target.value)} style={selectStyle}>
            {PERSONS.map((p) => (
              <option key={p.key} value={p.key}>{p.label} — {p.role}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label style={labelStyle}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as TiTask["status"])} style={selectStyle}>
            <option value="TODO">A fazer</option>
            <option value="DOING">Em andamento</option>
            <option value="DONE">Concluído</option>
          </select>
        </div>

        {/* Tipo */}
        <div>
          <label style={labelStyle}>Tipo da tarefa</label>
          <select value={taskType} onChange={(e) => setTaskType(e.target.value as TiTask["taskType"])} style={selectStyle}>
            <option value="MANUAL">Manual — execução humana direta</option>
            <option value="AUTOMACAO">Automação — candidata ou já automatizada</option>
            <option value="DELEGACAO">Delegação — transferida para outro responsável</option>
          </select>
        </div>

        {/* Processo RACI */}
        <div>
          <label style={labelStyle}>Processo RACI relacionado (opcional)</label>
          <select value={raciRef} onChange={(e) => setRaciRef(e.target.value)} style={selectStyle}>
            <option value="">— Nenhum —</option>
            {RACI.map((r) => (
              <option key={r.id} value={r.id}>{r.id} · {r.title}</option>
            ))}
          </select>
        </div>

        {/* Card RACI inline */}
        {raciRow && (
          <div className="rounded p-4" style={{ background: C.bg2, border: `1px solid ${C.border}` }}>
            <div className="mb-2 font-mono text-[9px] uppercase tracking-widest" style={{ color: C.gold }}>
              Matriz RACI · Processo {raciRow.id}
            </div>
            <div className="mb-1 font-medium" style={{ color: C.text }}>{raciRow.title}</div>
            <div className="mb-3 font-mono text-[11px]" style={{ color: C.dim }}>{raciRow.sub}</div>
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div>
                <div className="mb-1 font-mono text-[9px] uppercase tracking-wider" style={{ color: C.dim }}>Dono (R)</div>
                <div className="flex flex-wrap gap-1">
                  {raciRow.owners.map((p) => <PersonPill key={p} person={p} />)}
                </div>
              </div>
              <div>
                <div className="mb-1 font-mono text-[9px] uppercase tracking-wider" style={{ color: C.dim }}>Apoio (C)</div>
                {raciRow.support.length > 0
                  ? <div className="flex flex-wrap gap-1">{raciRow.support.map((p) => <PersonPill key={p} person={p} />)}</div>
                  : <span style={{ color: C.dim }}>—</span>
                }
              </div>
              <div>
                <div className="mb-1 font-mono text-[9px] uppercase tracking-wider" style={{ color: C.dim }}>Modelo</div>
                <span className="rounded px-2 py-0.5 font-mono text-[10px]"
                  style={{ background: "rgba(251,146,60,0.12)", color: "#fb923c" }}>
                  {raciRow.model}
                </span>
              </div>
              <div>
                <div className="mb-1 font-mono text-[9px] uppercase tracking-wider" style={{ color: C.dim }}>Automação</div>
                {raciRow.auto
                  ? <span className="rounded px-2 py-0.5 font-mono text-[10px]" style={{ background: "rgba(74,222,128,0.12)", color: C.green }}>AUTO</span>
                  : <span style={{ color: C.dim }}>—</span>
                }
              </div>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: C.border }}>
          {isMaster ? (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded px-3 py-2 text-xs font-mono transition-colors"
              style={{ background: "rgba(248,113,113,0.1)", color: C.red, border: `1px solid rgba(248,113,113,0.3)` }}
            >
              {deleting ? "Excluindo…" : "Excluir tarefa"}
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded px-4 py-2 text-xs font-mono"
              style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}` }}>
              Cancelar
            </button>
            <button onClick={save} disabled={saving || !title.trim()}
              className="rounded px-4 py-2 text-xs font-mono font-medium transition-opacity"
              style={{ background: C.gold, color: "#0a0c10", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de nova tarefa ────────────────────────────────────────────────────
function NewTaskModal({ onClose, onCreate }: { onClose: () => void; onCreate: (task: TiTask) => void }) {
  const [title, setTitle] = useState("");
  const [responsible, setResponsible] = useState<Person>("andre");
  const [taskType, setTaskType] = useState<TiTask["taskType"]>("MANUAL");
  const [raciRef, setRaciRef] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ti-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, responsible, taskType, raciRef: raciRef || null, description: description || null }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      onCreate(data);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: C.bg2, border: `1px solid ${C.border}`, color: C.text,
    borderRadius: 4, padding: "8px 12px", fontSize: 13, width: "100%", outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 2,
    color: C.muted, marginBottom: 6, display: "block",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex w-full max-w-lg flex-col gap-5 rounded-lg p-6"
        style={{ background: C.surface, border: `1px solid ${C.borderLight}` }}>
        <div>
          <h2 className="text-lg font-medium" style={{ color: C.text }}>Nova tarefa</h2>
          <p className="mt-1 text-xs" style={{ color: C.muted }}>O código será gerado automaticamente.</p>
        </div>

        <div>
          <label style={labelStyle}>Título *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} placeholder="Descreva a tarefa…" autoFocus />
        </div>

        <div>
          <label style={labelStyle}>Descrição (opcional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>Responsável</label>
            <select value={responsible} onChange={(e) => setResponsible(e.target.value as Person)} style={inputStyle}>
              {PERSONS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tipo</label>
            <select value={taskType} onChange={(e) => setTaskType(e.target.value as TiTask["taskType"])} style={inputStyle}>
              <option value="MANUAL">Manual</option>
              <option value="AUTOMACAO">Automação</option>
              <option value="DELEGACAO">Delegação</option>
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Processo RACI relacionado (opcional)</label>
          <select value={raciRef} onChange={(e) => setRaciRef(e.target.value)} style={inputStyle}>
            <option value="">— Nenhum —</option>
            {RACI.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.title}</option>)}
          </select>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4" style={{ borderColor: C.border }}>
          <button onClick={onClose} className="rounded px-4 py-2 text-xs font-mono"
            style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}` }}>
            Cancelar
          </button>
          <button onClick={save} disabled={saving || !title.trim()}
            className="rounded px-4 py-2 text-xs font-mono font-medium"
            style={{ background: C.gold, color: "#0a0c10", opacity: saving || !title.trim() ? 0.5 : 1 }}>
            {saving ? "Criando…" : "Criar tarefa"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card de tarefa ──────────────────────────────────────────────────────────
function TaskCard({ task, onClick }: { task: TiTask; onClick: () => void }) {
  const raciRow = task.raciRef ? RACI.find((r) => r.id === task.raciRef) : null;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded p-3 transition-all"
      style={{
        background: C.bg2,
        borderLeft: `3px solid ${getPerson(task.responsible).color}`,
        marginBottom: 8,
      }}
    >
      <div className="mb-1 font-mono text-[10px]" style={{ color: C.dim }}>{task.code}</div>
      <div className="mb-2 text-sm leading-snug font-medium group-hover:text-white transition-colors" style={{ color: C.text }}>
        {task.title}
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        <PersonPill person={task.responsible} />
        <TypeBadge type={task.taskType} />
        {raciRow && (
          <span className="rounded px-1.5 py-0.5 font-mono text-[9px]"
            style={{ background: "rgba(212,178,90,0.1)", color: C.gold, border: `1px solid rgba(212,178,90,0.2)` }}>
            RACI {raciRow.id}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Board principal ─────────────────────────────────────────────────────────
export function NucleoTiBoard({ initialTasks, isMaster }: Props) {
  const [tasks, setTasks] = useState<TiTask[]>(initialTasks);
  const [selectedTask, setSelectedTask] = useState<TiTask | null>(null);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [showNewModal, setShowNewModal] = useState(false);
  const [personFilter, setPersonFilter] = useState<string>("all");

  const updateTask = useCallback((id: string, patch: Partial<TiTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addTask = useCallback((task: TiTask) => {
    setTasks((prev) => [...prev, task]);
  }, []);

  // Quick status cycle on status badge click (inside table)
  async function cycleStatus(task: TiTask, e: React.MouseEvent) {
    e.stopPropagation();
    const next = task.status === "TODO" ? "DOING" : task.status === "DOING" ? "DONE" : "TODO";
    updateTask(task.id, { status: next });
    await fetch(`/api/admin/ti-tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
  }

  const filtered = personFilter === "all" ? tasks : tasks.filter((t) => t.responsible === personFilter);

  const btnClass = (active: boolean) =>
    `px-4 py-2 rounded text-xs font-mono tracking-wide border transition-colors ${
      active ? "border-[#d4b25a] text-[#0a0c10]" : "border-[#232936] text-[#8a93a8] hover:text-white hover:border-[#2d3445]"
    }`;

  // ── Carga por pessoa ──────────────────────────────────────────────────────
  const PersonLoadSection = (
    <section className="mb-14">
      <div className="mb-2 flex items-baseline gap-4">
        <span className="font-mono text-xs" style={{ color: C.gold, letterSpacing: 2 }}>03</span>
        <h2 style={{ fontFamily: "serif", fontWeight: 400, fontSize: 26, color: C.text }}>Carga por pessoa</h2>
        <span className="flex-1" style={{ height: 1, background: C.border }} />
      </div>
      <p className="mb-7 max-w-2xl text-sm leading-relaxed" style={{ color: C.muted }}>
        Tarefas ativas (a fazer + em andamento) por colaborador. Clique em uma tarefa para editar ou migrar.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PERSONS.map((person) => {
          const mine = tasks.filter((t) => t.responsible === person.key);
          const active = mine.filter((t) => t.status !== "DONE");
          const done = mine.filter((t) => t.status === "DONE");
          return (
            <div key={person.key} className="relative overflow-hidden rounded p-5"
              style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <span className="absolute bottom-0 left-0 top-0 w-0.5" style={{ background: person.color }} />
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div style={{ fontFamily: "serif", fontSize: 20, fontWeight: 400, color: C.text }}>{person.label}</div>
                  <div className="font-mono text-[10px] uppercase tracking-wide" style={{ color: C.muted }}>{person.role}</div>
                </div>
                <div style={{ fontFamily: "serif", fontSize: 32, fontWeight: 300, color: person.color, lineHeight: 1 }}>
                  {active.length}
                </div>
              </div>
              <div className="mb-1 flex gap-2 font-mono text-[10px]" style={{ color: C.dim }}>
                <span>Ativas: <strong style={{ color: person.color }}>{active.length}</strong></span>
                <span>·</span>
                <span>Concluídas: <strong style={{ color: C.green }}>{done.length}</strong></span>
              </div>
              {mine.length === 0 ? (
                <p className="mt-3 text-xs italic" style={{ color: C.dim }}>Nenhuma tarefa atribuída.</p>
              ) : (
                <ul className="mt-3 list-none">
                  {mine.map((t) => (
                    <li key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className="flex cursor-pointer items-start gap-2 border-b py-2 text-xs last:border-b-0 transition-colors hover:opacity-80"
                      style={{ borderColor: C.border, color: t.status === "DONE" ? C.dim : C.text }}>
                      <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{ background: STATUS_CONFIG[t.status].color }} />
                      <span className={t.status === "DONE" ? "line-through" : ""}>{t.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );

  // ── Backlog kanban ────────────────────────────────────────────────────────
  const KanbanView = (
    <div className="grid gap-4 md:grid-cols-3">
      {(["TODO", "DOING", "DONE"] as const).map((status) => {
        const items = filtered.filter((t) => t.status === status);
        return (
          <div key={status} className="rounded" style={{ background: C.surface, border: `1px solid ${C.border}`, padding: 16, minHeight: 200 }}>
            <div className="mb-4 flex items-center justify-between border-b pb-3" style={{ borderColor: C.border }}>
              <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: STATUS_CONFIG[status].color }}>
                {STATUS_CONFIG[status].label}
              </span>
              <span className="font-mono text-[11px]" style={{ color: C.dim }}>{items.length}</span>
            </div>
            {items.map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
            ))}
          </div>
        );
      })}
    </div>
  );

  // ── Backlog tabela ────────────────────────────────────────────────────────
  const TableView = (
    <div className="overflow-hidden rounded" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr style={{ background: C.bg2, borderBottom: `1px solid ${C.border}` }}>
              {["ID", "Tarefa", "Responsável", "Tipo", "Status", "RACI"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((task, i) => {
              const raciRow = task.raciRef ? RACI.find((r) => r.id === task.raciRef) : null;
              return (
                <tr key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="cursor-pointer transition-colors hover:bg-[#1c212d]"
                  style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <td className="px-4 py-3 font-mono text-[11px]" style={{ color: C.dim }}>{task.code}</td>
                  <td className="px-4 py-3 font-medium max-w-xs" style={{ color: C.text }}>{task.title}</td>
                  <td className="px-4 py-3"><PersonPill person={task.responsible} /></td>
                  <td className="px-4 py-3"><TypeBadge type={task.taskType} /></td>
                  <td className="px-4 py-3">
                    <button onClick={(e) => cycleStatus(task, e)} title="Clique para avançar o status">
                      <StatusBadge status={task.status} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {raciRow ? (
                      <span className="font-mono text-[11px]" style={{ color: C.gold }}>
                        {raciRow.id} · {raciRow.title.length > 20 ? raciRow.title.slice(0, 20) + "…" : raciRow.title}
                      </span>
                    ) : (
                      <span style={{ color: C.dim }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── Backlog section ───────────────────────────────────────────────────────
  const BacklogSection = (
    <section className="mb-14">
      <div className="mb-2 flex items-baseline gap-4">
        <span className="font-mono text-xs" style={{ color: C.gold, letterSpacing: 2 }}>05</span>
        <h2 style={{ fontFamily: "serif", fontWeight: 400, fontSize: 26, color: C.text }}>Backlog de tarefas</h2>
        <span className="flex-1" style={{ height: 1, background: C.border }} />
      </div>
      <p className="mb-5 max-w-2xl text-sm leading-relaxed" style={{ color: C.muted }}>
        Clique em qualquer card para editar, migrar responsável, alterar status ou vincular ao processo RACI.
        Na tabela, clique no status para avançar rapidamente.
      </p>

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {/* View toggle */}
          <div className="flex gap-1">
            <button className={btnClass(view === "kanban")} onClick={() => setView("kanban")}
              style={{ background: view === "kanban" ? C.gold : "transparent" }}>
              ◫ Kanban
            </button>
            <button className={btnClass(view === "table")} onClick={() => setView("table")}
              style={{ background: view === "table" ? C.gold : "transparent" }}>
              ⊞ Tabela
            </button>
          </div>

          {/* Filtro por pessoa */}
          <select
            value={personFilter}
            onChange={(e) => setPersonFilter(e.target.value)}
            className="rounded border px-3 py-2 text-xs font-mono"
            style={{ background: C.bg2, border: `1px solid ${C.border}`, color: C.text, outline: "none" }}
          >
            <option value="all">Todos</option>
            {PERSONS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>

        {isMaster && (
          <button
            onClick={() => setShowNewModal(true)}
            className="rounded px-4 py-2 text-xs font-mono font-medium"
            style={{ background: "rgba(212,178,90,0.15)", color: C.gold, border: `1px solid rgba(212,178,90,0.3)` }}
          >
            + Nova tarefa
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded py-16 text-center" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <p className="font-mono text-sm" style={{ color: C.dim }}>Nenhuma tarefa encontrada.</p>
        </div>
      ) : view === "kanban" ? KanbanView : TableView}
    </section>
  );

  return (
    <div>
      {PersonLoadSection}
      {BacklogSection}

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          isMaster={isMaster}
        />
      )}

      {showNewModal && (
        <NewTaskModal
          onClose={() => setShowNewModal(false)}
          onCreate={addTask}
        />
      )}
    </div>
  );
}
