"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  canEditCertificados?: boolean;
};

const M = "var(--onity-dark-text-muted)";

const cardStyle: React.CSSProperties = {
  background: "rgba(8,15,26,0.7)",
  border: "1px solid rgba(29,127,229,0.15)",
  borderRadius: "16px",
  padding: "20px 24px",
};

function CollapseHeader({
  label,
  open,
  onToggle,
  disabled,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className="flex w-full items-center justify-between text-left transition disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="text-sm font-semibold text-white">{label}</span>
      <span
        className="flex h-7 w-7 items-center justify-center rounded-lg text-lg font-light transition-transform"
        style={{
          background: "rgba(29,127,229,0.12)",
          color: "#1d7fe5",
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
        }}
      >
        +
      </span>
    </button>
  );
}

export function AdminCertificatesManager({
  initialCertificates,
  companies,
  canEditCertificados = true,
}: Props) {
  const readOnly = !canEditCertificados;
  const router = useRouter();

  const [items, setItems] = useState(initialCertificates);
  const [companyOptions, setCompanyOptions] = useState(companies);
  useEffect(() => setCompanyOptions(companies), [companies]);

  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  useEffect(() => {
    if (companyOptions.length && !companyOptions.some((c) => c.id === companyId)) {
      setCompanyId(companyOptions[0].id);
    }
  }, [companyOptions, companyId]);

  // Collapse state
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showCertForm, setShowCertForm] = useState(false);

  // Company form
  const [newCompanyLegalName, setNewCompanyLegalName] = useState("");
  const [newCompanyDocument, setNewCompanyDocument] = useState("");
  const [newCompanyPartner, setNewCompanyPartner] = useState("");
  const [newCompanySaving, setNewCompanySaving] = useState(false);
  const [newCompanyError, setNewCompanyError] = useState("");

  // Certificate form
  const [certificatePassword, setCertificatePassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [socio, setSocio] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // List
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCompanyId, setEditCompanyId] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editSocio, setEditSocio] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (item) =>
        item.company.legalName.toLowerCase().includes(term) ||
        (item.company.document ?? "").toLowerCase().includes(term) ||
        (item.company.partnerName ?? "").toLowerCase().includes(term)
    );
  }, [items, query]);

  async function createCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) return;
    setNewCompanyError("");
    if (!newCompanyLegalName.trim()) { setNewCompanyError("Informe a razao social."); return; }
    setNewCompanySaving(true);
    try {
      const res = await fetch("/api/admin/certificados/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalName: newCompanyLegalName.trim(),
          document: newCompanyDocument.trim() || undefined,
          partnerName: newCompanyPartner.trim() || undefined,
        }),
      });
      const payload = await res.json();
      if (!res.ok) { setNewCompanyError(payload?.message || "Erro ao cadastrar."); return; }
      const row = payload.data as Company;
      setCompanyOptions((prev) => [...prev, row].sort((a, b) => a.legalName.localeCompare(b.legalName, "pt-BR")));
      setCompanyId(row.id);
      setNewCompanyLegalName(""); setNewCompanyDocument(""); setNewCompanyPartner("");
      setShowCompanyForm(false);
      router.refresh();
    } catch { setNewCompanyError("Falha de conexao."); }
    finally { setNewCompanySaving(false); }
  }

  async function submitCert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) { setError("Somente o administrador principal pode registrar certificados."); return; }
    if (!companyOptions.length) { setError("Cadastre pelo menos uma empresa primeiro."); return; }
    setSaving(true); setError("");
    try {
      const fd = new FormData();
      fd.set("companyId", companyId);
      fd.set("certificatePassword", certificatePassword);
      fd.set("expiresAt", expiresAt);
      if (socio.trim()) fd.set("socio", socio.trim());
      if (file) fd.set("file", file);
      const res = await fetch("/api/admin/certificados", { method: "POST", body: fd });
      const payload = await res.json();
      if (!res.ok) { setError(payload?.message || "Erro ao salvar."); return; }
      setItems((prev) => [payload.data, ...prev]);
      setCertificatePassword(""); setExpiresAt(""); setSocio(""); setFile(null);
      setShowCertForm(false);
      router.refresh();
    } catch { setError("Falha de conexao."); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (readOnly) { setError("Somente o administrador principal pode excluir certificados."); return; }
    if (!confirm("Deseja excluir este certificado?")) return;
    const res = await fetch(`/api/admin/certificados/${id}`, { method: "DELETE" });
    if (!res.ok) { const p = await res.json().catch(() => null); setError(p?.message || "Erro ao excluir."); return; }
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function startEdit(item: Certificate) {
    setEditingId(item.id);
    setEditCompanyId(item.companyId);
    setEditPassword(item.certificatePassword);
    setEditSocio(item.company.partnerName ?? "");
    setEditFile(null);
    setEditExpiresAt(new Date(item.expiresAt).toISOString().slice(0, 10));
    setError("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) { setError("Somente o administrador principal pode editar certificados."); return; }
    if (!editingId) return;
    setEditSaving(true); setError("");
    try {
      const fd = new FormData();
      fd.set("companyId", editCompanyId);
      fd.set("certificatePassword", editPassword);
      fd.set("expiresAt", editExpiresAt);
      if (editSocio.trim()) fd.set("socio", editSocio.trim());
      if (editFile) fd.set("file", editFile);
      const res = await fetch(`/api/admin/certificados/${editingId}`, { method: "PATCH", body: fd });
      const payload = await res.json();
      if (!res.ok) { setError(payload?.message || "Erro ao atualizar."); return; }
      setItems((prev) => prev.map((item) => (item.id === editingId ? payload.data : item)));
      setEditingId(null);
      router.refresh();
    } catch { setError("Falha de conexao."); }
    finally { setEditSaving(false); }
  }

  const inCls = "ds-input disabled:opacity-50 disabled:cursor-not-allowed";
  const inSm = "ds-input h-10 disabled:opacity-50 disabled:cursor-not-allowed";
  const btnGhost = { border: "1px solid rgba(29,127,229,0.2)", background: "rgba(8,15,26,0.5)" } as React.CSSProperties;

  return (
    <section className="space-y-4">
      {readOnly ? (
        <div className="rounded-xl p-3 text-sm" style={{ background: "rgba(255,170,0,0.07)", border: "1px solid rgba(255,170,0,0.3)" }}>
          <span className="font-semibold text-[#ffaa00]">Modo leitura — </span>
          <span style={{ color: M }}>Apenas o administrador principal pode incluir, alterar ou remover certificados.</span>
        </div>
      ) : null}

      {/* Ações */}
      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setShowCompanyForm((v) => !v); setShowCertForm(false); }}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition"
            style={showCompanyForm ? { background: "rgba(29,127,229,0.18)", border: "1px solid rgba(29,127,229,0.4)", color: "#fff" } : { ...btnGhost, color: "#6b8aaa" }}
          >
            <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>{showCompanyForm ? "−" : "+"}</span>
            Cadastrar empresa
          </button>
          <button
            type="button"
            onClick={() => { setShowCertForm((v) => !v); setShowCompanyForm(false); }}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition"
            style={showCertForm ? { background: "rgba(29,127,229,0.18)", border: "1px solid rgba(29,127,229,0.4)", color: "#fff" } : { ...btnGhost, color: "#6b8aaa" }}
          >
            <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>{showCertForm ? "−" : "+"}</span>
            Novo certificado digital
          </button>
        </div>
      ) : null}

      {/* Formulário — Cadastrar empresa */}
      {showCompanyForm && !readOnly ? (
        <div style={cardStyle}>
          <p className="mb-4 text-xs font-medium" style={{ color: M }}>CPF/CNPJ deve ser único quando informado.</p>
          <form onSubmit={createCompany} className="grid gap-3 md:grid-cols-2">
            <input value={newCompanyLegalName} onChange={(e) => setNewCompanyLegalName(e.target.value)} placeholder="Razão social *" required className={`${inCls} md:col-span-2`} />
            <input value={newCompanyDocument} onChange={(e) => setNewCompanyDocument(e.target.value)} placeholder="CPF/CNPJ (opcional)" className={inCls} />
            <input value={newCompanyPartner} onChange={(e) => setNewCompanyPartner(e.target.value)} placeholder="Sócio (opcional)" className={inCls} />
            <div className="flex gap-2 md:col-span-2">
              <button type="submit" disabled={newCompanySaving} className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60">
                {newCompanySaving ? "Salvando..." : "Salvar empresa"}
              </button>
              <button type="button" onClick={() => setShowCompanyForm(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={btnGhost}>
                Cancelar
              </button>
            </div>
            {newCompanyError ? <p className="text-sm md:col-span-2" style={{ color: "#ff453a" }}>{newCompanyError}</p> : null}
          </form>
        </div>
      ) : null}

      {/* Formulário — Novo certificado */}
      {showCertForm && !readOnly ? (
        <div style={cardStyle}>
          <form onSubmit={submitCert} className="grid gap-3 md:grid-cols-2">
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} required disabled={companyOptions.length === 0} className={inCls}>
              {companyOptions.length === 0
                ? <option value="">Nenhuma empresa cadastrada</option>
                : companyOptions.map((c) => <option key={c.id} value={c.id} style={{ background: "#0d1829" }}>{c.legalName}</option>)
              }
            </select>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} required className={inCls} />
            <input type="password" value={certificatePassword} onChange={(e) => setCertificatePassword(e.target.value)} placeholder="Senha do certificado" required className={inCls} />
            <input value={socio} onChange={(e) => setSocio(e.target.value)} placeholder="Sócio (opcional)" className={inCls} />
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required className="ds-input h-auto py-2.5 file:mr-3 file:rounded-md file:border-0 file:bg-[rgba(29,127,229,0.15)] file:px-3 file:py-1.5 file:text-sm file:text-white md:col-span-2" />
            <div className="flex gap-2 md:col-span-2">
              <button type="submit" disabled={saving} className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60">
                {saving ? "Salvando..." : "Registrar certificado"}
              </button>
              <button type="button" onClick={() => setShowCertForm(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={btnGhost}>
                Cancelar
              </button>
            </div>
            {error && !editingId ? <p className="text-sm md:col-span-2" style={{ color: "#ff453a" }}>{error}</p> : null}
          </form>
        </div>
      ) : null}

      {/* Lista */}
      <div style={cardStyle}>
        <div className="mb-4 flex items-center gap-3">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar empresa, CPF/CNPJ ou sócio..." className="ds-input flex-1" />
          <span className="shrink-0 text-sm" style={{ color: M }}>{filtered.length} registro{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl py-10 text-center text-sm" style={{ border: "1px dashed rgba(29,127,229,0.18)", color: M }}>
            Nenhum certificado encontrado.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) =>
              editingId === item.id ? (
                <article key={item.id} className="rounded-xl p-4" style={{ background: "rgba(29,127,229,0.07)", border: "1px solid rgba(29,127,229,0.3)" }}>
                  <p className="mb-3 text-xs font-semibold" style={{ color: "#1d7fe5" }}>EDITANDO — {item.company.legalName}</p>
                  <form onSubmit={saveEdit} className="grid gap-3 md:grid-cols-2">
                    <select value={editCompanyId} onChange={(e) => setEditCompanyId(e.target.value)} required className={inSm}>
                      {companyOptions.map((c) => <option key={c.id} value={c.id} style={{ background: "#0d1829" }}>{c.legalName}</option>)}
                    </select>
                    <input type="date" value={editExpiresAt} onChange={(e) => setEditExpiresAt(e.target.value)} required className={inSm} />
                    <input type="text" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Senha do certificado" required className={inSm} />
                    <input value={editSocio} onChange={(e) => setEditSocio(e.target.value)} placeholder="Sócio (opcional)" className={inSm} />
                    <input type="file" onChange={(e) => setEditFile(e.target.files?.[0] ?? null)} className="ds-input h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-[rgba(29,127,229,0.15)] file:px-2 file:py-1 file:text-sm file:text-white md:col-span-2" />
                    <div className="flex gap-2 md:col-span-2">
                      <button type="submit" disabled={editSaving} className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60">
                        {editSaving ? "Salvando..." : "Salvar alterações"}
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={btnGhost}>
                        Cancelar
                      </button>
                    </div>
                    {error ? <p className="text-sm md:col-span-2" style={{ color: "#ff453a" }}>{error}</p> : null}
                  </form>
                </article>
              ) : (
                <article key={item.id} className="rounded-xl p-4" style={{ background: "rgba(3,8,15,0.5)", border: "1px solid rgba(29,127,229,0.1)" }}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white">{item.company.legalName}</h3>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: M }}>
                        {item.company.document ? <span>CPF/CNPJ: {item.company.document}</span> : null}
                        {item.company.partnerName ? <span>Sócio: {item.company.partnerName}</span> : null}
                        <span>Vencimento: {new Date(item.expiresAt).toLocaleDateString("pt-BR")}</span>
                        <span>Arquivo: {item.fileName} ({Math.round(item.fileSize / 1024)} KB)</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button type="button" onClick={() => window.open(`/api/admin/certificados/${item.id}`, "_blank")} className="rounded-md px-3 py-1.5 text-xs font-medium transition" style={{ border: "1px solid rgba(29,127,229,0.4)", color: "#1d7fe5", background: "rgba(8,15,26,0.5)" }}>
                        Download
                      </button>
                      {!readOnly ? (
                        <>
                          <button type="button" onClick={() => startEdit(item)} className="rounded-md px-3 py-1.5 text-xs font-medium text-white transition" style={btnGhost}>
                            Editar
                          </button>
                          <button type="button" onClick={() => remove(item.id)} className="rounded-md px-3 py-1.5 text-xs font-medium transition" style={{ border: "1px solid rgba(255,69,58,0.35)", color: "#ff453a", background: "rgba(8,15,26,0.5)" }}>
                            Excluir
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}
