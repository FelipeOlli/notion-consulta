"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { appModules, moduleLabels, type AppModule } from "@/lib/modules";

type AdminUser = {
  id: string;
  email: string;
  active: boolean;
  modules: string[];
};

type Props = {
  initialUsers: AdminUser[];
  /** E-mail protegido na API e na UI (não editar / não excluir). */
  lockedPrimaryEmail: string;
};

type FormState = {
  email: string;
  password: string;
  active: boolean;
  modules: AppModule[];
};

const defaultForm: FormState = {
  email: "",
  password: "",
  active: true,
  modules: ["senha"],
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function AdminUsersManager({ initialUsers, lockedPrimaryEmail }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter((item) => item.email.toLowerCase().includes(term));
  }, [query, users]);

  function resetForm() {
    setEditingId(null);
    setForm(defaultForm);
    setError("");
    setShowForm(false);
  }

  const locked = normalizeEmail(lockedPrimaryEmail);

  function isProtected(user: AdminUser) {
    return normalizeEmail(user.email) === locked;
  }

  function startEdit(user: AdminUser) {
    if (isProtected(user)) return;
    setEditingId(user.id);
    setForm({
      email: user.email,
      password: "",
      active: user.active,
      modules: user.modules.filter((item): item is AppModule => appModules.includes(item as AppModule)),
    });
    setShowForm(true);
  }

  function toggleModule(moduleKey: AppModule) {
    setForm((prev) => {
      const has = prev.modules.includes(moduleKey);
      if (has) return { ...prev, modules: prev.modules.filter((item) => item !== moduleKey) };
      return { ...prev, modules: [...prev.modules, moduleKey] };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    if (!editingId && normalizeEmail(form.email) === locked) {
      setError("Este e-mail e reservado ao administrador principal. Use outro e-mail.");
      setSaving(false);
      return;
    }

    try {
      const endpoint = editingId ? `/api/admin/users/${editingId}` : "/api/admin/users";
      const method = editingId ? "PATCH" : "POST";
      const payload: Record<string, unknown> = {
        email: form.email,
        active: form.active,
        modules: form.modules,
      };
      if (form.password) payload.password = form.password;
      if (!editingId) payload.password = form.password;

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.message || "Nao foi possivel salvar usuario.");
        return;
      }

      if (editingId) {
        setUsers((prev) => prev.map((item) => (item.id === editingId ? data.data : item)));
      } else {
        setUsers((prev) => [data.data, ...prev]);
      }
      setEditingId(null);
      setForm(defaultForm);
      setError("");
      setShowForm(false);
      router.refresh();
    } catch {
      setError("Falha de conexao.");
    } finally {
      setSaving(false);
    }
  }

  const [blockingId, setBlockingId] = useState<string | null>(null);

  async function toggleBlock(user: AdminUser) {
    if (isProtected(user)) return;
    const action = user.active ? "bloquear" : "desbloquear";
    if (!window.confirm(`Deseja ${action} o usuario "${user.email}"?`)) return;
    setBlockingId(user.id);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.message || `Nao foi possivel ${action} usuario.`);
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, active: !user.active } : u)));
    } catch {
      setError("Falha de conexao.");
    } finally {
      setBlockingId(null);
    }
  }

  async function deleteUser(id: string) {
    const target = users.find((u) => u.id === id);
    if (target && isProtected(target)) return;
    if (!window.confirm("Deseja excluir este usuario?")) return;
    const response = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.message || "Nao foi possivel excluir.");
      return;
    }
    setUsers((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) resetForm();
  }

  const cardStyle: React.CSSProperties = {
    background: "rgba(8,15,26,0.7)",
    border: "1px solid rgba(29,127,229,0.15)",
    borderRadius: "16px",
    padding: "20px 24px",
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
          Admin principal: <span className="font-medium text-white">{lockedPrimaryEmail}</span> — protegido contra edicao/exclusao.
        </p>
        <button
          type="button"
          onClick={() => {
            if (showForm && !editingId) {
              resetForm();
            } else if (!showForm) {
              setEditingId(null);
              setForm(defaultForm);
              setError("");
              setShowForm(true);
            }
          }}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold transition"
          style={
            showForm && !editingId
              ? { background: "rgba(29,127,229,0.2)", border: "1px solid rgba(29,127,229,0.5)", color: "#4da3ff" }
              : { background: "rgba(29,127,229,0.1)", border: "1px solid rgba(29,127,229,0.3)", color: "#1d7fe5" }
          }
        >
          {showForm && !editingId ? "✕ Cancelar" : "+ Novo usuario"}
        </button>
      </div>

      {(showForm || editingId) && (
        <div style={cardStyle}>
          <h2 className="mb-4 text-lg font-semibold text-white">{editingId ? "Editar usuario" : "Novo usuario"}</h2>
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            <input
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              type="email"
              required
              disabled={Boolean(editingId && normalizeEmail(form.email) === locked)}
              placeholder="email@dominio.com"
              className="ds-input disabled:cursor-not-allowed disabled:opacity-60"
            />
            <input
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              type="password"
              required={!editingId}
              placeholder={editingId ? "Nova senha (opcional)" : "Senha"}
              className="ds-input"
            />
            <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
                disabled={Boolean(editingId && normalizeEmail(form.email) === locked)}
                className="size-4 rounded accent-[#1d7fe5] disabled:opacity-60"
              />
              Usuario ativo
            </label>
            <div className="md:col-span-2 space-y-2">
              <p className="text-sm font-medium text-white">Modulos permitidos</p>
              <div className="flex flex-wrap gap-2">
                {appModules.map((moduleKey) => (
                  <label
                    key={moduleKey}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer"
                    style={{ border: "1px solid rgba(29,127,229,0.2)", background: "rgba(8,15,26,0.5)" }}
                  >
                    <input
                      type="checkbox"
                      checked={form.modules.includes(moduleKey)}
                      onChange={() => toggleModule(moduleKey)}
                      disabled={Boolean(editingId && normalizeEmail(form.email) === locked)}
                      className="size-4 rounded accent-[#1d7fe5] disabled:opacity-60"
                    />
                    <span className="text-sm text-white">{moduleLabels[moduleKey]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={saving || Boolean(editingId && normalizeEmail(form.email) === locked)}
                className="btn-primary rounded-xl px-5 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {saving ? "Salvando..." : editingId ? "Salvar usuario" : "Cadastrar usuario"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition"
                style={{ border: "1px solid rgba(29,127,229,0.2)", background: "rgba(8,15,26,0.5)" }}
              >
                Cancelar
              </button>
            </div>
            {error ? (
              <p className="md:col-span-2 text-sm font-medium" style={{ color: "#ff453a" }}>
                {error}
              </p>
            ) : null}
          </form>
        </div>
      )}

      <div style={cardStyle}>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar usuario por e-mail"
            className="ds-input"
          />
          <div className="flex items-center text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Total: {filtered.length}
          </div>
        </div>
        <div className="space-y-3">
          {filtered.map((user) => (
            <article
              key={user.id}
              className="rounded-xl p-4"
              style={{ background: "rgba(3,8,15,0.5)", border: "1px solid rgba(29,127,229,0.1)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-white">{user.email}</h3>
                  <p className="mt-1 text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
                    Modulos: {user.modules.length > 0 ? user.modules.join(", ") : "nenhum modulo liberado"}
                  </p>
                  {isProtected(user) ? (
                    <p
                      className="mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ background: "rgba(255,170,0,0.1)", color: "#ffaa00", border: "1px solid rgba(255,170,0,0.25)" }}
                    >
                      Conta protegida (administrador principal)
                    </p>
                  ) : null}
                </div>
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={
                    user.active
                      ? { background: "rgba(0,204,102,0.12)", color: "#00cc66", border: "1px solid rgba(0,204,102,0.25)" }
                      : { background: "rgba(255,69,58,0.1)", color: "#ff453a", border: "1px solid rgba(255,69,58,0.3)" }
                  }
                >
                  {user.active ? "Ativo" : "Bloqueado"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(user)}
                  disabled={isProtected(user)}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ border: "1px solid rgba(29,127,229,0.2)", background: "rgba(8,15,26,0.5)" }}
                >
                  Editar
                </button>
                {!isProtected(user) && (
                  <button
                    type="button"
                    onClick={() => void toggleBlock(user)}
                    disabled={blockingId === user.id}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
                    style={
                      user.active
                        ? { border: "1px solid rgba(255,170,0,0.4)", color: "#ffaa00", background: "rgba(255,170,0,0.07)" }
                        : { border: "1px solid rgba(0,204,102,0.35)", color: "#00cc66", background: "rgba(0,204,102,0.07)" }
                    }
                  >
                    {blockingId === user.id ? "Aguarde..." : user.active ? "Bloquear" : "Desbloquear"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteUser(user.id)}
                  disabled={isProtected(user)}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ border: "1px solid rgba(255,69,58,0.35)", color: "#ff453a", background: "rgba(8,15,26,0.5)" }}
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
          {filtered.length === 0 ? (
            <div
              className="rounded-xl p-8 text-center text-sm"
              style={{ border: "1px dashed rgba(29,127,229,0.18)", color: "var(--onity-dark-text-muted)" }}
            >
              Nenhum usuario cadastrado.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
