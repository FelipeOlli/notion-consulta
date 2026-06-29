"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { DominioSsc, DominioSscUpdate } from "@prisma/client";
import { ConfirmModal } from "@/components/confirm-modal";

type SscWithCount = DominioSsc & { _count: { updates: number } };
type UpdateRow = DominioSscUpdate;

interface Props {
  initialSscs: SscWithCount[];
}

export function DominioDashboard({ initialSscs }: Props) {
  const [sscs, setSscs] = useState<SscWithCount[]>(initialSscs);
  const [formOpen, setFormOpen] = useState(false);
  const [numero, setNumero] = useState("");
  const [assunto, setAssunto] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [drawerSscId, setDrawerSscId] = useState<string | null>(null);
  const [updates, setUpdates] = useState<UpdateRow[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [confirmar, setConfirmar] = useState<{ acao: () => void; mensagem: string; detalhe?: string } | null>(null);
  const prevCountRef = useRef<Record<string, number>>({});

  const loadSscs = useCallback(async () => {
    const res = await fetch("/api/admin/dominio");
    if (!res.ok) return;
    const data: SscWithCount[] = await res.json();

    data.forEach((ssc) => {
      const prev = prevCountRef.current[ssc.id];
      if (prev !== undefined && ssc._count.updates > prev) {
        if (Notification.permission === "granted") {
          new Notification(`SSC ${ssc.numero}`, {
            body: `Nova resposta recebida${ssc.assunto ? `: ${ssc.assunto}` : ""}`,
            tag: `dominio-ssc-${ssc.id}`,
          });
        }
      }
      prevCountRef.current[ssc.id] = ssc._count.updates;
    });

    setSscs(data);
  }, []);

  useEffect(() => {
    initialSscs.forEach((s) => {
      prevCountRef.current[s.id] = s._count.updates;
    });
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
    const interval = setInterval(() => void loadSscs(), 60_000);
    return () => clearInterval(interval);
  }, [initialSscs, loadSscs]);

  async function createSsc() {
    if (!numero.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/dominio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero: numero.trim(), assunto: assunto.trim() }),
    });
    if (res.ok) {
      const nova: SscWithCount = await res.json();
      prevCountRef.current[nova.id] = nova._count.updates;
      setSscs((prev) => [nova, ...prev]);
      setNumero("");
      setAssunto("");
      setFormOpen(false);
    }
    setSaving(false);
  }

  async function toggleStatus(ssc: SscWithCount) {
    const novoStatus = ssc.status === "ABERTA" ? "RESOLVIDA" : "ABERTA";
    const res = await fetch(`/api/admin/dominio/${ssc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    });
    if (res.ok) {
      const updated: SscWithCount = await res.json();
      setSscs((prev) => prev.map((s) => (s.id === ssc.id ? updated : s)));
    }
  }

  async function deleteSsc(id: string) {
    const res = await fetch(`/api/admin/dominio/${id}`, { method: "DELETE" });
    if (res.ok) setSscs((prev) => prev.filter((s) => s.id !== id));
  }

  async function checkNow(sscId?: string) {
    setChecking(true);
    await fetch("/api/admin/dominio/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sscId ? { sscId } : {}),
    });
    await loadSscs();
    setChecking(false);
  }

  async function openDrawer(sscId: string) {
    setDrawerSscId(sscId);
    setLoadingUpdates(true);
    const res = await fetch(`/api/admin/dominio/${sscId}/updates`);
    if (res.ok) {
      const data: UpdateRow[] = await res.json();
      setUpdates(data);
    }
    setLoadingUpdates(false);
    await fetch(`/api/admin/dominio/${sscId}/updates`, { method: "PATCH" });
    setSscs((prev) => prev.map((s) => (s.id === sscId ? { ...s, _count: { updates: 0 } } : s)));
    prevCountRef.current[sscId] = 0;
  }

  function closeDrawer() {
    setDrawerSscId(null);
    setUpdates([]);
  }

  const drawerSsc = sscs.find((s) => s.id === drawerSscId);

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="btn-primary text-sm"
        >
          {formOpen ? "Cancelar" : "+ Nova SSC"}
        </button>
        <button
          onClick={() => void checkNow()}
          disabled={checking}
          className="rounded-lg px-4 py-2 text-sm font-medium transition"
          style={{
            background: "rgba(139,92,246,0.15)",
            border: "1px solid rgba(139,92,246,0.3)",
            color: checking ? "#6b8aaa" : "#a78bfa",
          }}
        >
          {checking ? "Verificando..." : "Verificar emails agora"}
        </button>
      </div>

      {/* Form colapsável */}
      {formOpen && (
        <div className="glass-card rounded-xl p-5 mb-6">
          <p className="text-sm font-semibold text-white mb-4">Cadastrar nova SSC</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-white/50 mb-1">Número da SSC *</label>
              <input
                className="ds-input w-full"
                placeholder="Ex: 123456"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Assunto (opcional)</label>
              <input
                className="ds-input w-full"
                placeholder="Descrição resumida"
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => void createSsc()}
              disabled={saving || !numero.trim()}
              className="btn-primary text-sm"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de SSCs */}
      {sscs.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Nenhuma SSC cadastrada ainda.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sscs.map((ssc) => (
            <div key={ssc.id} className="glass-card rounded-xl p-5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-base font-bold text-white">#{ssc.numero}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: ssc.status === "ABERTA" ? "rgba(59,130,246,0.15)" : "rgba(34,197,94,0.1)",
                        color: ssc.status === "ABERTA" ? "#60a5fa" : "#4ade80",
                        border: `1px solid ${ssc.status === "ABERTA" ? "rgba(59,130,246,0.3)" : "rgba(34,197,94,0.2)"}`,
                      }}
                    >
                      {ssc.status === "ABERTA" ? "Aberta" : "Resolvida"}
                    </span>
                    {ssc._count.updates > 0 && (
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-bold"
                        style={{ background: "#E3000F", color: "#fff" }}
                      >
                        {ssc._count.updates} nova{ssc._count.updates > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {ssc.assunto && (
                    <p className="mt-1 text-sm truncate" style={{ color: "var(--onity-dark-text-muted)" }}>
                      {ssc.assunto}
                    </p>
                  )}
                  <p className="mt-1 text-xs" style={{ color: "#4a6a8a" }}>
                    Cadastrado em {new Date(ssc.createdAt).toLocaleDateString("pt-BR")}
                    {ssc.lastCheckedAt && (
                      <> · verificado {new Date(ssc.lastCheckedAt).toLocaleString("pt-BR")}</>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => void openDrawer(ssc.id)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium transition"
                    style={{
                      background: "rgba(29,127,229,0.1)",
                      border: "1px solid rgba(29,127,229,0.2)",
                      color: "#4da3ff",
                    }}
                  >
                    Histórico
                  </button>
                  <button
                    onClick={() => void checkNow(ssc.id)}
                    disabled={checking}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium transition"
                    style={{
                      background: "rgba(139,92,246,0.1)",
                      border: "1px solid rgba(139,92,246,0.2)",
                      color: "#a78bfa",
                    }}
                  >
                    Verificar
                  </button>
                  <button
                    onClick={() => void toggleStatus(ssc)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium transition"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#6b8aaa",
                    }}
                  >
                    {ssc.status === "ABERTA" ? "Resolver" : "Reabrir"}
                  </button>
                  <button
                    onClick={() => setConfirmar({ acao: () => void deleteSsc(ssc.id), mensagem: `Excluir a SSC "${ssc.numero}"?`, detalhe: "Esta ação remove todo o histórico de atualizações." })}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium transition"
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.15)",
                      color: "#f87171",
                    }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawer de histórico */}
      {drawerSscId && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeDrawer(); }}
        >
          <div
            className="flex flex-col h-full overflow-hidden"
            style={{
              width: "min(520px, 100vw)",
              background: "#0f172a",
              borderLeft: "1px solid rgba(29,127,229,0.15)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div>
                <p className="text-xs text-white/40 font-mono">SSC #{drawerSsc?.numero}</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {drawerSsc?.assunto || "Histórico de respostas"}
                </p>
              </div>
              <button
                onClick={closeDrawer}
                className="text-white/40 hover:text-white transition text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loadingUpdates ? (
                <p className="text-sm text-white/30 text-center mt-8">Carregando...</p>
              ) : updates.length === 0 ? (
                <div className="text-center mt-8">
                  <p className="text-sm text-white/30">Nenhuma resposta encontrada no email.</p>
                  <p className="text-xs text-white/20 mt-1">
                    Clique em &quot;Verificar&quot; para buscar agora.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {updates.map((u) => (
                    <div
                      key={u.id}
                      className="rounded-xl p-4"
                      style={{
                        background: "rgba(30,41,59,0.6)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white/85 truncate">
                          {u.assunto || "(sem assunto)"}
                        </p>
                        <span className="text-xs text-white/30 shrink-0">
                          {u.receivedAt
                            ? new Date(u.receivedAt).toLocaleString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </span>
                      </div>
                      {u.remetente && (
                        <p className="text-xs mt-1" style={{ color: "#4da3ff" }}>
                          {u.remetente}
                        </p>
                      )}
                      {u.snippet && (
                        <p
                          className="text-xs mt-2 leading-relaxed line-clamp-3"
                          style={{ color: "var(--onity-dark-text-muted)" }}
                        >
                          {u.snippet}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {confirmar && (
        <ConfirmModal
          mensagem={confirmar.mensagem}
          detalhe={confirmar.detalhe}
          onConfirm={() => { confirmar.acao(); setConfirmar(null); }}
          onCancel={() => setConfirmar(null)}
        />
      )}
    </div>
  );
}
