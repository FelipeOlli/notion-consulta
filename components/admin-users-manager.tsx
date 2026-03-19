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
      resetForm();
      router.refresh();
    } catch {
      setError("Falha de conexao.");
    } finally {
      setSaving(false);
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

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-50">{editingId ? "Editar usuario" : "Novo usuario"}</h2>
        <p className="mb-4 text-sm text-slate-400">
          O e-mail <span className="font-medium text-slate-200">{lockedPrimaryEmail}</span> e o administrador principal:
          protegido contra edicao e exclusao nesta tela.
        </p>
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
          <input
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            type="email"
            required
            disabled={Boolean(editingId && normalizeEmail(form.email) === locked)}
            placeholder="email@dominio.com"
            className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <input
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            type="password"
            required={!editingId}
            placeholder={editingId ? "Nova senha (opcional)" : "Senha"}
            className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-slate-400"
          />
          <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
              disabled={Boolean(editingId && normalizeEmail(form.email) === locked)}
              className="size-4 rounded border-slate-600 bg-slate-900 disabled:opacity-60"
            />
            Usuario ativo
          </label>
          <div className="md:col-span-2 space-y-2">
            <p className="text-sm font-medium text-slate-200">Modulos permitidos</p>
            <div className="flex flex-wrap gap-2">
              {appModules.map((moduleKey) => (
                <label key={moduleKey} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={form.modules.includes(moduleKey)}
                    onChange={() => toggleModule(moduleKey)}
                    disabled={Boolean(editingId && normalizeEmail(form.email) === locked)}
                    className="size-4 rounded border-slate-600 bg-slate-900 disabled:opacity-60"
                  />
                  <span className="text-sm text-slate-100">{moduleLabels[moduleKey]}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={saving || Boolean(editingId && normalizeEmail(form.email) === locked)}
              className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:opacity-60"
            >
              {saving ? "Salvando..." : editingId ? "Salvar usuario" : "Cadastrar usuario"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            ) : null}
          </div>
          {error ? <p className="md:col-span-2 text-sm font-medium text-red-600">{error}</p> : null}
        </form>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-sm sm:p-6">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar usuario por e-mail"
            className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-slate-400"
          />
          <div className="flex items-center text-sm text-slate-300">Total: {filtered.length}</div>
        </div>
        <div className="space-y-3">
          {filtered.map((user) => (
            <article key={user.id} className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-50">{user.email}</h3>
                  <p className="mt-1 text-sm text-slate-300">
                    Modulos: {user.modules.length > 0 ? user.modules.join(", ") : "nenhum modulo liberado"}
                  </p>
                  {isProtected(user) ? (
                    <p className="mt-2 inline-flex rounded-full bg-amber-950/80 px-3 py-1 text-xs font-semibold text-amber-200">
                      Conta protegida (administrador principal)
                    </p>
                  ) : null}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    user.active ? "bg-emerald-900/60 text-emerald-300" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {user.active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(user)}
                  disabled={isProtected(user)}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-100 transition hover:border-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => deleteUser(user.id)}
                  disabled={isProtected(user)}
                  className="rounded-lg border border-red-500/60 px-3 py-1.5 text-sm font-medium text-red-300 transition hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-300">
              Nenhum usuario cadastrado.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
