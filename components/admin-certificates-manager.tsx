"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Company = {
  id: string;
  legalName: string;
  document: string | null;
  partnerName: string | null;
};

type Certificate = {
  id: string;
  companyId: string;
  certificatePassword: string;
  expiresAt: string | Date;
  filePath: string;
  fileName: string;
  fileSize: number;
  company: Company;
};

type Props = {
  initialCertificates: Certificate[];
  companies: Company[];
};

export function AdminCertificatesManager({ initialCertificates, companies }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialCertificates);
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [certificatePassword, setCertificatePassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [socio, setSocio] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCompanyId, setEditCompanyId] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => {
      return (
        item.company.legalName.toLowerCase().includes(term) ||
        (item.company.document ?? "").toLowerCase().includes(term) ||
        (item.company.partnerName ?? "").toLowerCase().includes(term)
      );
    });
  }, [items, query]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const form = new FormData();
      form.set("companyId", companyId);
      form.set("certificatePassword", certificatePassword);
      form.set("expiresAt", expiresAt);
      if (socio.trim()) form.set("socio", socio.trim());
      if (file) form.set("file", file);

      const response = await fetch("/api/admin/certificados", {
        method: "POST",
        body: form,
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.message || "Nao foi possivel salvar certificado.");
        return;
      }
      setItems((prev) => [payload.data, ...prev]);
      setCertificatePassword("");
      setExpiresAt("");
      setSocio("");
      setFile(null);
      router.refresh();
    } catch {
      setError("Falha de conexao.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Deseja excluir este certificado?")) return;
    const response = await fetch(`/api/admin/certificados/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.message || "Nao foi possivel excluir.");
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function startEdit(item: Certificate) {
    setEditingId(item.id);
    setEditCompanyId(item.companyId);
    setEditPassword(item.certificatePassword);
    const dt = new Date(item.expiresAt);
    setEditExpiresAt(dt.toISOString().slice(0, 10));
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;
    setEditSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/certificados/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: editCompanyId,
          certificatePassword: editPassword,
          expiresAt: editExpiresAt,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.message || "Nao foi possivel atualizar.");
        return;
      }
      setItems((prev) => prev.map((item) => (item.id === editingId ? payload.data : item)));
      setEditingId(null);
      router.refresh();
    } catch {
      setError("Falha de conexao.");
    } finally {
      setEditSaving(false);
    }
  }

  function downloadCert(id: string) {
    window.open(`/api/admin/certificados/${id}`, "_blank");
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-50">Novo certificado digital</h2>
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
          <select
            value={companyId}
            onChange={(event) => setCompanyId(event.target.value)}
            required
            className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-slate-400"
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.legalName}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            required
            className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-slate-400"
          />
          <input
            type="password"
            value={certificatePassword}
            onChange={(event) => setCertificatePassword(event.target.value)}
            placeholder="Senha do certificado"
            required
            className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-slate-400"
          />
          <input
            value={socio}
            onChange={(event) => setSocio(event.target.value)}
            placeholder="Sócio (opcional)"
            className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-slate-400"
          />
          <input
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            required
            className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-2 file:py-1 file:text-slate-100 md:col-span-2"
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Registrar certificado"}
            </button>
          </div>
          {error && !editingId ? <p className="text-sm font-medium text-red-500 md:col-span-2">{error}</p> : null}
        </form>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-sm sm:p-6">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por empresa, CPF/CNPJ ou socio"
            className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-slate-400"
          />
          <div className="flex items-center text-sm text-slate-300">Total: {filtered.length}</div>
        </div>
        <div className="space-y-3">
          {filtered.map((item) =>
            editingId === item.id ? (
              <article key={item.id} className="rounded-xl border border-sky-500/40 bg-slate-900/90 p-4">
                <form onSubmit={saveEdit} className="grid gap-3 md:grid-cols-2">
                  <select
                    value={editCompanyId}
                    onChange={(event) => setEditCompanyId(event.target.value)}
                    required
                    className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
                  >
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.legalName}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={editExpiresAt}
                    onChange={(event) => setEditExpiresAt(event.target.value)}
                    required
                    className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
                  />
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(event) => setEditPassword(event.target.value)}
                    placeholder="Senha do certificado"
                    required
                    className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 md:col-span-2"
                  />
                  <div className="flex gap-2 md:col-span-2">
                    <button
                      type="submit"
                      disabled={editSaving}
                      className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
                    >
                      {editSaving ? "Salvando..." : "Salvar alterações"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-400"
                    >
                      Cancelar
                    </button>
                  </div>
                  {error && editingId === item.id ? (
                    <p className="text-sm font-medium text-red-500 md:col-span-2">{error}</p>
                  ) : null}
                </form>
              </article>
            ) : (
              <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-50">{item.company.legalName}</h3>
                    {item.company.document ? (
                      <p className="mt-1 text-sm text-slate-300">CPF/CNPJ: {item.company.document}</p>
                    ) : null}
                    <p className="mt-1 text-sm text-slate-300">Socio: {item.company.partnerName || "—"}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      Arquivo: {item.fileName} ({Math.round(item.fileSize / 1024)} KB)
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      Vencimento: {new Date(item.expiresAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => downloadCert(item.id)}
                    className="rounded-lg border border-sky-500/60 px-3 py-1.5 text-sm font-medium text-sky-300 transition hover:border-sky-400 hover:text-sky-200"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => startEdit(item)}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:border-slate-400 hover:text-white"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => remove(item.id)}
                    className="rounded-lg border border-red-500/60 px-3 py-1.5 text-sm font-medium text-red-300 transition hover:border-red-400 hover:text-red-200"
                  >
                    Excluir
                  </button>
                </div>
              </article>
            )
          )}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-300">
              Nenhum certificado cadastrado.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
