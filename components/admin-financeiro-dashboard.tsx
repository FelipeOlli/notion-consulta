"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FINANCEIRO_SEM_EMPRESA } from "@/lib/financeiro-allocation";
import { ConfirmModal } from "@/components/confirm-modal";
import type { FinanceiroServiceKey } from "@/lib/financeiro-services";

type SnapshotPoint = {
  totalUsers: number;
  activeUsers: number | null;
  snapshotId: string;
  updatedAt: string;
} | null;

type SeriesRow = {
  key: string;
  name: string;
  serverId: string | null;
  values: SnapshotPoint[];
};

type LatestRow = {
  key: string;
  name: string;
  latest: {
    snapshotId: string;
    competence: string;
    totalUsers: number;
    activeUsers: number | null;
    importedAt: string;
    source: string;
  } | null;
};

type LineRow = {
  id: string;
  sortOrder: number;
  email: string | null;
  displayName: string;
  companyLabel: string;
  companyLabelOverride: string | null;
  financeiroServerCompanyId?: string | null;
  allocatedCompany?: { id: string; name: string } | null;
  effectiveCompany: string;
  status: string | null;
  detail: string | null;
  meta: unknown;
  lineSource?: "IMPORTED" | "MANUAL";
};

type LineEditorState =
  | null
  | {
      mode: "create";
      financeiroServerCompanyId: string;
      displayName: string;
      email: string;
      status: string;
      detail: string;
      telefone: string;
      dispositivo: string;
      ultimaAtividade: string;
      criadoEm: string;
    }
  | {
      mode: "edit";
      lineId: string;
      financeiroServerCompanyId: string;
      displayName: string;
      email: string;
      status: string;
      detail: string;
      telefone: string;
      dispositivo: string;
      ultimaAtividade: string;
      criadoEm: string;
    };

type ByCompanyRow = { label: string; count: number };

type UsersByCompanyLatestBlock = {
  key: string;
  name: string;
  serverId: string | null;
  competence: string | null;
  snapshotId: string | null;
  byCompany: { label: string; count: number }[];
};

type DashboardPayload = {
  labels: string[];
  series: SeriesRow[];
  latestByService: LatestRow[];
  usersByCompanyLatest?: UsersByCompanyLatestBlock[];
  servers: { id: string; name: string }[];
};

async function parseJsonBody(res: Response): Promise<{ message?: string; data?: unknown }> {
  const text = await res.text();
  try {
    return JSON.parse(text) as { message?: string; data?: unknown };
  } catch {
    return {
      message: `Resposta invalida (HTTP ${res.status}). Verifique se o deploy aplicou migracoes e o app esta no ar.`,
    };
  }
}

export type AdminFinanceiroDashboardProps = {
  canEditFinanceiro?: boolean;
  serviceFilter?: FinanceiroServiceKey;
};

const SERVICE_FILTER_TO_FORM: Record<FinanceiroServiceKey, string> = {
  cfCom: "cf-com",
  cfComBr: "cf-com-br",
  timeIsMoney: "time-is-money",
};

export function AdminFinanceiroDashboard({ canEditFinanceiro = true, serviceFilter }: AdminFinanceiroDashboardProps) {
  const readOnlyFinanceiro = !canEditFinanceiro;
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const [competence, setCompetence] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });
  const [serviceKey, setServiceKey] = useState(
    serviceFilter ? SERVICE_FILTER_TO_FORM[serviceFilter] : "cf-com"
  );
  const [file, setFile] = useState<File | null>(null);
  const [importError, setImportError] = useState("");
  const [importOk, setImportOk] = useState("");
  const [importing, setImporting] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTitle, setSheetTitle] = useState("");
  const [sheetSource, setSheetSource] = useState<string | null>(null);
  const [sheetSnapshotId, setSheetSnapshotId] = useState<string | null>(null);
  const [sheetCompanies, setSheetCompanies] = useState<string[]>([]);
  const [sheetCompanyFilter, setSheetCompanyFilter] = useState("");
  const [sheetLines, setSheetLines] = useState<LineRow[]>([]);
  const [sheetByCompany, setSheetByCompany] = useState<ByCompanyRow[]>([]);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState("");
  const [lineEditor, setLineEditor] = useState<LineEditorState>(null);
  const [editorSaving, setEditorSaving] = useState(false);
  const [sheetServerId, setSheetServerId] = useState<string | null>(null);
  const [serverCatalog, setServerCatalog] = useState<{ id: string; name: string }[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companyUiError, setCompanyUiError] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [patchingLineId, setPatchingLineId] = useState<string | null>(null);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(() => new Set());
  const [bulkCompanyId, setBulkCompanyId] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [clearingServiceKey, setClearingServiceKey] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<{ acao: () => void; mensagem: string; detalhe?: string } | null>(null);
  const lineEditorPanelRef = useRef<HTMLDivElement>(null);
  const sheetScrollRef = useRef<HTMLDivElement>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
  const dashboardRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoadError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/financeiro/snapshots?months=18");
      const json = await parseJsonBody(res);
      if (!res.ok) {
        setLoadError(json?.message || "Nao foi possivel carregar o dashboard.");
        setData(null);
        return;
      }
      setData(json.data as DashboardPayload);
    } catch {
      setLoadError("Falha de conexao. Verifique rede ou se o servidor respondeu.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const scheduleDashboardRefresh = useCallback(() => {
    if (dashboardRefreshTimerRef.current) clearTimeout(dashboardRefreshTimerRef.current);
    dashboardRefreshTimerRef.current = setTimeout(() => {
      dashboardRefreshTimerRef.current = null;
      void load();
    }, 750);
  }, [load]);

  useEffect(() => {
    return () => {
      if (dashboardRefreshTimerRef.current) clearTimeout(dashboardRefreshTimerRef.current);
    };
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadLines = useCallback(
    async (
      snapshotId: string,
      company?: string,
      opts?: { silent?: boolean; preserveLineEditor?: boolean }
    ) => {
      const silent = opts?.silent ?? false;
      const preserveLineEditor = opts?.preserveLineEditor ?? false;
      const scrollEl = sheetScrollRef.current;
      const prevScrollTop = silent && scrollEl ? scrollEl.scrollTop : null;

      if (!silent) setSheetLoading(true);
      setSheetError("");
      try {
        const q = company ? `?company=${encodeURIComponent(company)}` : "";
        const res = await fetch(`/api/admin/financeiro/snapshots/${snapshotId}/lines${q}`);
        const json = await parseJsonBody(res);
        if (!res.ok) {
          setSheetError(json?.message || "Nao foi possivel carregar a planilha.");
          setSheetLines([]);
          setSheetCompanies([]);
          setSheetByCompany([]);
          setSheetServerId(null);
          setServerCatalog([]);
          return;
        }
        const d = json.data as {
          companies: string[];
          byCompany?: ByCompanyRow[];
          lines: LineRow[];
          snapshot: { source: string; serverId?: string };
        };
        setSheetCompanies(d.companies);
        setSheetByCompany(
          Array.isArray(d.byCompany)
            ? d.byCompany
            : d.companies.map((label) => ({
                label,
                count: d.lines.filter((l) => (l.effectiveCompany ?? l.companyLabel) === label).length,
              }))
        );
        setSheetLines(d.lines);
        setSheetSource(d.snapshot.source);
        if (!preserveLineEditor) setLineEditor(null);

        const sid = d.snapshot.serverId ?? null;
        setSheetServerId(sid);
        if (sid) {
          setCompaniesLoading(true);
          setCompanyUiError("");
          try {
            const cr = await fetch(`/api/admin/financeiro/servers/${sid}/companies`);
            const cj = await parseJsonBody(cr);
            if (cr.ok) {
              const payload = cj.data as { companies: { id: string; name: string }[] };
              setServerCatalog(payload.companies ?? []);
            } else {
              setCompanyUiError(cj.message || "Falha ao carregar empresas.");
              setServerCatalog([]);
            }
          } catch {
            setCompanyUiError("Falha de conexao (empresas).");
            setServerCatalog([]);
          } finally {
            setCompaniesLoading(false);
          }
        } else {
          setServerCatalog([]);
        }
      } catch {
        setSheetError("Falha de conexao.");
        setSheetLines([]);
        setSheetCompanies([]);
        setSheetByCompany([]);
        setSheetServerId(null);
        setServerCatalog([]);
      } finally {
        if (!silent) setSheetLoading(false);
        if (silent && prevScrollTop !== null && sheetScrollRef.current) {
          const y = prevScrollTop;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (sheetScrollRef.current) sheetScrollRef.current.scrollTop = y;
            });
          });
        }
      }
    },
    []
  );

  async function openSheet(row: LatestRow) {
    if (!row.latest?.snapshotId) return;
    setSheetTitle(row.name);
    setSheetSnapshotId(row.latest.snapshotId);
    setSheetCompanyFilter("");
    setSelectedLineIds(new Set());
    setBulkCompanyId("");
    setLineEditor(null);
    setSheetOpen(true);
    setSheetSource(row.latest.source);
    await loadLines(row.latest.snapshotId);
  }

  function closeSheet() {
    setSheetOpen(false);
    setSheetSnapshotId(null);
    setSheetLines([]);
    setSheetCompanies([]);
    setSheetByCompany([]);
    setSheetCompanyFilter("");
    setSheetError("");
    setLineEditor(null);
    setEditorSaving(false);
    setSheetServerId(null);
    setServerCatalog([]);
    setCompanyUiError("");
    setNewCompanyName("");
    setPatchingLineId(null);
    setSelectedLineIds(new Set());
    setBulkCompanyId("");
    setBulkSaving(false);
  }

  async function addServerCompany() {
    if (!sheetServerId || !newCompanyName.trim()) return;
    setCompanyUiError("");
    try {
      const res = await fetch(`/api/admin/financeiro/servers/${sheetServerId}/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCompanyName.trim() }),
      });
      const json = await parseJsonBody(res);
      if (!res.ok) {
        setCompanyUiError(json?.message || "Nao foi possivel criar a empresa.");
        return;
      }
      setNewCompanyName("");
      const cr = await fetch(`/api/admin/financeiro/servers/${sheetServerId}/companies`);
      const cj = await parseJsonBody(cr);
      if (cr.ok) {
        const payload = cj.data as { companies: { id: string; name: string }[] };
        setServerCatalog(payload.companies ?? []);
      }
      await load();
    } catch {
      setCompanyUiError("Falha de conexao.");
    }
  }

  async function renameServerCompany(c: { id: string; name: string }) {
    if (!sheetServerId) return;
    const name = window.prompt("Novo nome da empresa:", c.name);
    if (name == null) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setCompanyUiError("");
    try {
      const res = await fetch(`/api/admin/financeiro/servers/${sheetServerId}/companies/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = await parseJsonBody(res);
      if (!res.ok) {
        setCompanyUiError(json?.message || "Nao foi possivel renomear.");
        return;
      }
      const cr = await fetch(`/api/admin/financeiro/servers/${sheetServerId}/companies`);
      const cj = await parseJsonBody(cr);
      if (cr.ok) {
        const payload = cj.data as { companies: { id: string; name: string }[] };
        setServerCatalog(payload.companies ?? []);
      }
      if (sheetSnapshotId) await loadLines(sheetSnapshotId, sheetCompanyFilter || undefined);
      await load();
    } catch {
      setCompanyUiError("Falha de conexao.");
    }
  }

  async function deleteServerCompany(companyId: string) {
    if (!sheetServerId) return;
    setCompanyUiError("");
    try {
      const res = await fetch(`/api/admin/financeiro/servers/${sheetServerId}/companies/${companyId}`, {
        method: "DELETE",
      });
      const json = await parseJsonBody(res);
      if (!res.ok) {
        setCompanyUiError(json?.message || "Nao foi possivel excluir.");
        return;
      }
      const cr = await fetch(`/api/admin/financeiro/servers/${sheetServerId}/companies`);
      const cj = await parseJsonBody(cr);
      if (cr.ok) {
        const payload = cj.data as { companies: { id: string; name: string }[] };
        setServerCatalog(payload.companies ?? []);
      }
      if (sheetSnapshotId) await loadLines(sheetSnapshotId, sheetCompanyFilter || undefined);
      await load();
    } catch {
      setCompanyUiError("Falha de conexao.");
    }
  }

  async function patchLineAllocation(lineId: string, companyId: string | null) {
    if (!sheetSnapshotId) return;
    setPatchingLineId(lineId);
    setSheetError("");
    try {
      const res = await fetch(`/api/admin/financeiro/snapshots/${sheetSnapshotId}/lines/${lineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financeiroServerCompanyId: companyId }),
      });
      const json = await parseJsonBody(res);
      if (!res.ok) {
        setSheetError(json?.message || "Nao foi possivel alocar empresa.");
        return;
      }
      await loadLines(sheetSnapshotId, sheetCompanyFilter || undefined, {
        silent: true,
        preserveLineEditor: true,
      });
      scheduleDashboardRefresh();
    } catch {
      setSheetError("Falha de conexao ao alocar.");
    } finally {
      setPatchingLineId(null);
    }
  }

  async function applyBulkCompanyAllocation() {
    if (!sheetSnapshotId || selectedLineIds.size === 0) return;
    setBulkSaving(true);
    setSheetError("");
    try {
      const companyId = bulkCompanyId.trim() || null;
      const res = await fetch(`/api/admin/financeiro/snapshots/${sheetSnapshotId}/lines/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineIds: [...selectedLineIds],
          financeiroServerCompanyId: companyId,
        }),
      });
      const json = await parseJsonBody(res);
      if (!res.ok) {
        setSheetError(json?.message || "Falha na alocacao em massa.");
        return;
      }
      setSelectedLineIds(new Set());
      await loadLines(sheetSnapshotId, sheetCompanyFilter || undefined, {
        silent: true,
        preserveLineEditor: true,
      });
      scheduleDashboardRefresh();
    } catch {
      setSheetError("Falha de conexao.");
    } finally {
      setBulkSaving(false);
    }
  }

  const sheetCompanyChartMax = useMemo(() => {
    if (sheetByCompany.length === 0) return 1;
    return Math.max(...sheetByCompany.map((b) => b.count), 1);
  }, [sheetByCompany]);

  const visibleLineIds = useMemo(() => sheetLines.map((l) => l.id), [sheetLines]);
  const selectedInViewCount = useMemo(
    () => visibleLineIds.filter((id) => selectedLineIds.has(id)).length,
    [visibleLineIds, selectedLineIds]
  );
  const allVisibleSelected = visibleLineIds.length > 0 && selectedInViewCount === visibleLineIds.length;
  const someVisibleSelected = selectedInViewCount > 0 && !allVisibleSelected;

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (el) el.indeterminate = someVisibleSelected;
  }, [someVisibleSelected, allVisibleSelected]);

  function toggleSelectAll(checked: boolean) {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        for (const id of visibleLineIds) next.add(id);
      } else {
        for (const id of visibleLineIds) next.delete(id);
      }
      return next;
    });
  }

  function toggleLineSelected(lineId: string, checked: boolean) {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(lineId);
      else next.delete(lineId);
      return next;
    });
  }

  function timMetaFromLine(line: LineRow): Record<string, string> {
    const m = (line.meta && typeof line.meta === "object" ? line.meta : {}) as Record<string, string>;
    return {
      telefone: m.telefone ?? "",
      dispositivo: m.dispositivo ?? "",
      ultimaAtividade: m.ultimaAtividade ?? "",
      criadoEm: m.criadoEm ?? "",
    };
  }

  function openLineEditorCreate() {
    setLineEditor({
      mode: "create",
      financeiroServerCompanyId: "",
      displayName: "",
      email: "",
      status: "Active",
      detail: "",
      telefone: "",
      dispositivo: "",
      ultimaAtividade: "",
      criadoEm: "",
    });
  }

  function openLineEditorEdit(line: LineRow) {
    const tim = timMetaFromLine(line);
    const next: Extract<LineEditorState, { mode: "edit" }> = {
      mode: "edit",
      lineId: line.id,
      financeiroServerCompanyId: line.financeiroServerCompanyId ?? "",
      displayName: line.displayName,
      email: line.email ?? "",
      status: line.status ?? "",
      detail: line.detail ?? "",
      telefone: tim.telefone,
      dispositivo: tim.dispositivo,
      ultimaAtividade: tim.ultimaAtividade,
      criadoEm: tim.criadoEm,
    };
    setLineEditor(next);
  }

  function closeLineEditor() {
    setLineEditor(null);
  }

  async function submitLineEditor() {
    if (!sheetSnapshotId || !lineEditor) return;
    setSheetError("");
    const isTim = sheetSource === "TIM_CSV";
    const displayName = lineEditor.displayName.trim();
    if (!displayName) {
      setSheetError("Nome e obrigatorio.");
      return;
    }

    const financeiroServerCompanyId = lineEditor.financeiroServerCompanyId.trim() || null;

    setEditorSaving(true);
    try {
      if (lineEditor.mode === "create") {
        const body: Record<string, unknown> = {
          displayName,
          financeiroServerCompanyId,
        };
        if (!isTim) {
          body.email = lineEditor.email.trim() || null;
          body.status = lineEditor.status.trim() || null;
          body.detail = lineEditor.detail.trim() || null;
        } else {
          body.meta = {
            telefone: lineEditor.telefone.trim() || "",
            dispositivo: lineEditor.dispositivo.trim() || "",
            ultimaAtividade: lineEditor.ultimaAtividade.trim() || "",
            criadoEm: lineEditor.criadoEm.trim() || "",
          };
        }
        const res = await fetch(`/api/admin/financeiro/snapshots/${sheetSnapshotId}/lines`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await parseJsonBody(res);
        if (!res.ok) {
          setSheetError(json?.message || "Nao foi possivel criar a linha.");
          return;
        }
        setLineEditor(null);
        await loadLines(sheetSnapshotId, sheetCompanyFilter || undefined);
        await load();
        return;
      }

      const body: Record<string, unknown> = {
        displayName,
        financeiroServerCompanyId,
      };
      if (!isTim) {
        body.email = lineEditor.email.trim() || null;
        body.status = lineEditor.status.trim() || null;
        body.detail = lineEditor.detail.trim() || null;
      } else {
        body.meta = {
          telefone: lineEditor.telefone.trim() || "",
          dispositivo: lineEditor.dispositivo.trim() || "",
          ultimaAtividade: lineEditor.ultimaAtividade.trim() || "",
          criadoEm: lineEditor.criadoEm.trim() || "",
        };
      }
      const res = await fetch(
        `/api/admin/financeiro/snapshots/${sheetSnapshotId}/lines/${lineEditor.lineId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const json = await parseJsonBody(res);
      if (!res.ok) {
        setSheetError(json?.message || "Nao foi possivel salvar.");
        return;
      }
      setLineEditor(null);
      await loadLines(sheetSnapshotId, sheetCompanyFilter || undefined);
      await load();
    } catch {
      setSheetError("Falha de conexao ao salvar.");
    } finally {
      setEditorSaving(false);
    }
  }

  async function deleteLineFromEditor() {
    if (!sheetSnapshotId || !lineEditor || lineEditor.mode !== "edit") return;
    setEditorSaving(true);
    setSheetError("");
    try {
      const res = await fetch(
        `/api/admin/financeiro/snapshots/${sheetSnapshotId}/lines/${lineEditor.lineId}`,
        { method: "DELETE" }
      );
      const json = await parseJsonBody(res);
      if (!res.ok) {
        setSheetError(json?.message || "Nao foi possivel excluir.");
        return;
      }
      setLineEditor(null);
      await loadLines(sheetSnapshotId, sheetCompanyFilter || undefined);
      await load();
    } catch {
      setSheetError("Falha de conexao ao excluir.");
    } finally {
      setEditorSaving(false);
    }
  }

  async function applyCompanyFilter() {
    if (!sheetSnapshotId) return;
    setSelectedLineIds(new Set());
    await loadLines(sheetSnapshotId, sheetCompanyFilter || undefined);
  }

  async function exportSheetToExcel() {
    if (!sheetSnapshotId) return;
    setExportingExcel(true);
    setSheetError("");
    try {
      const res = await fetch(`/api/admin/financeiro/snapshots/${sheetSnapshotId}/export-excel`);
      if (!res.ok) {
        const text = await res.text();
        try {
          const j = JSON.parse(text) as { message?: string };
          setSheetError(j.message || "Nao foi possivel gerar o Excel.");
        } catch {
          setSheetError("Nao foi possivel gerar o Excel.");
        }
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      let filename = "financeiro_export.xlsx";
      const star = cd?.match(/filename\*=UTF-8''([^;\s]+)/i);
      const quoted = cd?.match(/filename="([^"]+)"/i);
      if (star?.[1]) {
        try {
          filename = decodeURIComponent(star[1]);
        } catch {
          filename = star[1];
        }
      } else if (quoted?.[1]) {
        filename = quoted[1];
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setSheetError("Falha de conexao ao exportar.");
    } finally {
      setExportingExcel(false);
    }
  }

  /** Ao abrir criar/editar linha no modal, rolar até o painel e focar o primeiro campo (evita sensação de botão quebrado). */
  useEffect(() => {
    if (!sheetOpen || !lineEditor) return;
    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      const panel = lineEditorPanelRef.current;
      if (!panel || cancelled) return;
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
      requestAnimationFrame(() => {
        if (cancelled) return;
        const focusable = panel.querySelector<HTMLElement>(
          "select:not([disabled]), input:not([disabled]), textarea:not([disabled])"
        );
        focusable?.focus({ preventScroll: true });
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [lineEditor, sheetOpen]);

  const maxTotal = useMemo(() => {
    if (!data) return 1;
    let m = 1;
    for (const s of data.series) {
      for (const v of s.values) {
        if (v && v.totalUsers > m) m = v.totalUsers;
      }
    }
    return m;
  }, [data]);


  async function clearServiceData(serviceKey: string, serviceName: string) {
    const confirmed = window.confirm(
      `Tem certeza que deseja apagar TODOS os snapshots de "${serviceName}"?\n\nEsta acao nao pode ser desfeita.`
    );
    if (!confirmed) return;
    setClearingServiceKey(serviceKey);
    try {
      const res = await fetch(`/api/admin/financeiro/snapshots?serviceKey=${encodeURIComponent(serviceKey)}`, {
        method: "DELETE",
      });
      const json = await parseJsonBody(res);
      if (!res.ok) {
        alert(json?.message || "Nao foi possivel limpar os dados.");
        return;
      }
      await load();
    } catch {
      alert("Falha de conexao ao limpar dados.");
    } finally {
      setClearingServiceKey(null);
    }
  }

  async function onImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnlyFinanceiro) {
      setImportError("Somente o administrador principal pode importar dados.");
      return;
    }
    setImportError("");
    setImportOk("");
    if (!file) {
      setImportError("Selecione um arquivo.");
      return;
    }
    setImporting(true);
    try {
      const form = new FormData();
      form.set("serviceKey", serviceKey);
      form.set("competence", competence);
      form.set("file", file);
      const res = await fetch("/api/admin/financeiro/import", { method: "POST", body: form });
      const json = await parseJsonBody(res);
      if (!res.ok) {
        setImportError(json?.message || "Importacao falhou.");
        return;
      }
      const imported = json.data as {
        serverName: string;
        totalUsers: number;
        activeUsers: number | null;
      };
      setImportOk(
        `Importado: ${imported.serverName} — ${imported.totalUsers} usuario(s)` +
          (imported.activeUsers != null ? ` (${imported.activeUsers} ativos no Google).` : ".")
      );
      setFile(null);
      setShowImport(false);
      await load();
    } catch {
      setImportError("Falha de conexao.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-8">
      {readOnlyFinanceiro ? (
        <div className="rounded-2xl border border-[rgba(255,170,0,0.3)]/50 bg-[rgba(255,170,0,0.07)]/35 p-4 text-sm text-[#ffaa00]">
          <p className="font-semibold text-amber-50">Financeiro em modo somente leitura</p>
          <p className="mt-1 text-[#ffaa00]/90">
            Apenas o administrador principal pode importar arquivos, cadastrar ou renomear empresas do servico, criar ou
            editar linhas e alocar empresas. Voce pode visualizar o dashboard e abrir a planilha para consulta.
          </p>
        </div>
      ) : null}
      {!readOnlyFinanceiro && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowImport((v) => !v)}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold transition"
            style={
              showImport
                ? { background: "rgba(29,127,229,0.2)", border: "1px solid rgba(29,127,229,0.5)", color: "#4da3ff" }
                : { background: "rgba(29,127,229,0.1)", border: "1px solid rgba(29,127,229,0.3)", color: "#1d7fe5" }
            }
          >
            {showImport ? "✕ Fechar importacao" : "Importar dados mensais"}
          </button>
        </div>
      )}

      {showImport && !readOnlyFinanceiro && (
        <section className="rounded-2xl border border-[rgba(29,127,229,0.15)] bg-[rgba(8,15,26,0.7)] p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-white">Importar dados mensais</h2>
          <p className="mt-1 text-sm text-[#6b8aaa]">
            Envie o export do Google Workspace (CSV) para CF .COM e .COM.BR, ou o CSV de colaboradores do Time Is
            Money. Baixe a planilha modelo se precisar do layout exato. A competencia define o mes do snapshot
            (substitui se ja existir).
          </p>
          <form onSubmit={onImport} className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm text-[#6b8aaa]">
              Competencia (mes)
              <input
                type="month"
                value={competence}
                onChange={(e) => setCompetence(e.target.value)}
                className="h-11 rounded-xl border border-[rgba(29,127,229,0.18)] bg-[rgba(8,15,26,0.7)] px-3 text-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-[#6b8aaa]">
              Servico
              <select
                value={serviceKey}
                disabled={!!serviceFilter}
                onChange={(e) => setServiceKey(e.target.value)}
                className="h-11 rounded-xl border border-[rgba(29,127,229,0.18)] bg-[rgba(8,15,26,0.7)] px-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="cf-com">CFCONTABILIDADE.COM (Google)</option>
                <option value="cf-com-br">CFCONTABILIDADE.COM.BR (Google)</option>
                <option value="time-is-money">Time Is Money (CSV)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-[#6b8aaa] md:col-span-2 lg:col-span-2">
              Arquivo
              <input
                type="file"
                accept={serviceKey === "time-is-money" ? ".csv,text/csv" : ".csv,.json,text/csv,application/json"}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="h-11 rounded-xl border border-[rgba(29,127,229,0.18)] bg-[rgba(8,15,26,0.7)] px-3 py-2 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-[rgba(29,127,229,0.08)] file:px-2 file:py-1"
              />
              <a
                href={
                  serviceKey === "time-is-money"
                    ? "/templates/time-is-money-template.csv"
                    : "/templates/google-workspace-template.csv"
                }
                download
                className="link-accent mt-1 w-fit text-xs"
              >
                ↓ Baixar planilha modelo
              </a>
            </label>
            <div className="md:col-span-2 lg:col-span-4">
              <button
                type="submit"
                disabled={importing}
                className="rounded-xl bg-[#1d7fe5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4da3ff] disabled:opacity-60"
              >
                {importing ? "Importando..." : "Importar snapshot"}
              </button>
            </div>
            {importError ? <p className="text-sm font-medium text-[#ff453a] md:col-span-2 lg:col-span-4">{importError}</p> : null}
            {importOk ? <p className="text-sm font-medium text-emerald-400 md:col-span-2 lg:col-span-4">{importOk}</p> : null}
          </form>
        </section>
      )}

      {loading ? (
        <p className="text-sm text-[#6b8aaa]">Carregando dashboard...</p>
      ) : loadError ? (
        <p className="text-sm font-medium text-[#ff453a]">{loadError}</p>
      ) : data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            {(serviceFilter
              ? data.latestByService.filter((r) => r.key === serviceFilter)
              : data.latestByService
            ).map((row) => (
              <div
                key={row.key}
                className="metric-card rounded-2xl border border-[rgba(29,127,229,0.15)] bg-[rgba(8,15,26,0.7)] p-4 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[#1d7fe5]">{row.name}</p>
                {row.latest ? (
                  <>
                    <p className="mt-2 text-3xl font-heading font-bold text-white">{row.latest.totalUsers}</p>
                    <p className="text-sm text-[#6b8aaa]">usuarios no mes {row.latest.competence}</p>
                    {row.latest.activeUsers != null ? (
                      <p className="mt-1 text-sm text-[#6b8aaa]">Ativos (Google): {row.latest.activeUsers}</p>
                    ) : (
                      <p className="mt-1 text-sm text-[#6b8aaa]">Total de colaboradores (CSV)</p>
                    )}
                    <p className="mt-2 text-xs text-[#6b8aaa]">
                      Importado em {new Date(row.latest.importedAt).toLocaleString("pt-BR")}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-[#6b8aaa]">Nenhum snapshot ainda. Importe um arquivo.</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!row.latest}
                    onClick={() => void openSheet(row)}
                    className="rounded-lg border border-[rgba(29,127,229,0.3)] bg-[rgba(29,127,229,0.08)] px-3 py-1.5 text-xs font-medium text-[#4da3ff] transition hover:bg-[rgba(29,127,229,0.15)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Ver planilha
                  </button>
                  {!readOnlyFinanceiro && row.latest && (
                    <button
                      type="button"
                      disabled={clearingServiceKey === row.key}
                      onClick={() => void clearServiceData(row.key, row.name)}
                      className="rounded-lg border border-[rgba(255,69,58,0.35)] bg-[rgba(255,69,58,0.06)] px-3 py-1.5 text-xs font-medium text-[#ff453a] transition hover:bg-[rgba(255,69,58,0.12)] disabled:opacity-50"
                    >
                      {clearingServiceKey === row.key ? "Limpando..." : "Limpar dados"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </section>


          {sheetOpen ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="financeiro-sheet-title"
              onClick={(e) => { if (e.target === e.currentTarget) closeSheet(); }}
            >
              <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-2xl border border-[rgba(29,127,229,0.18)] bg-[rgba(3,8,15,0.9)] shadow-xl">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgba(29,127,229,0.15)] p-4">
                  <div>
                    <h2 id="financeiro-sheet-title" className="text-lg font-semibold text-white">
                      {sheetTitle}
                    </h2>
                    <p className="mt-1 text-sm text-[#6b8aaa]">
                      Cadastre <strong className="text-[#6b8aaa]">empresas deste servico</strong> abaixo e aloque cada
                      usuario pelo menu na coluna de empresa. Linhas <strong className="text-[#6b8aaa]">Manual</strong>{" "}
                      sao mantidas ao reimportar; linhas do arquivo sao substituidas a cada import (sem alocacao ate voce
                      definir).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeSheet}
                    className="rounded-lg border border-[rgba(29,127,229,0.2)] px-3 py-1.5 text-sm text-white hover:bg-[rgba(29,127,229,0.12)]"
                  >
                    Fechar
                  </button>
                </div>
                <div className="flex flex-wrap items-end gap-3 border-b border-[rgba(29,127,229,0.15)] p-4">
                  <label className="flex flex-col gap-1 text-sm text-[#6b8aaa]">
                    Filtrar por empresa
                    <select
                      value={sheetCompanyFilter}
                      onChange={(e) => setSheetCompanyFilter(e.target.value)}
                      className="h-10 min-w-[220px] rounded-lg border border-[rgba(29,127,229,0.18)] bg-[rgba(8,15,26,0.7)] px-3 text-white"
                    >
                      <option value="">Todas</option>
                      {sheetCompanies.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => void applyCompanyFilter()}
                    disabled={sheetLoading}
                    className="h-10 rounded-lg bg-[#1d7fe5] px-4 text-sm font-medium text-white hover:bg-[#4da3ff] disabled:opacity-60"
                  >
                    Aplicar
                  </button>
                  {sheetLoading ? <span className="text-sm text-[#6b8aaa]">Carregando...</span> : null}
                  <button
                    type="button"
                    onClick={openLineEditorCreate}
                    disabled={readOnlyFinanceiro || sheetLoading}
                    className="h-10 rounded-lg border border-[rgba(0,204,102,0.4)] bg-[rgba(0,204,102,0.08)] px-4 text-sm font-medium text-[#00cc66] hover:bg-[rgba(0,204,102,0.12)]/50 disabled:opacity-50"
                  >
                    Nova linha
                  </button>
                  <button
                    type="button"
                    onClick={() => void exportSheetToExcel()}
                    disabled={sheetLoading || !sheetSnapshotId || exportingExcel}
                    title="Exporta todos os usuarios deste snapshot (nao apenas o filtro da tela), com aba Resumo por empresa."
                    className="h-10 rounded-lg border border-[rgba(29,127,229,0.2)] bg-[rgba(29,127,229,0.08)]/80 px-4 text-sm font-medium text-white hover:bg-[rgba(29,127,229,0.12)] disabled:opacity-50"
                  >
                    {exportingExcel ? "Gerando Excel..." : "Exportar Excel"}
                  </button>
                </div>
                {sheetLines.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-3 border-b border-[rgba(29,127,229,0.15)] bg-[rgba(3,8,15,0.5)] px-4 py-2.5 text-sm">
                    <span className="text-[#6b8aaa]">
                      <strong className="text-white">{selectedLineIds.size}</strong> selecionado(s)
                    </span>
                    <label className="flex flex-wrap items-center gap-2 text-[#6b8aaa]">
                      <span className="shrink-0">Empresa (em massa)</span>
                      <select
                        value={bulkCompanyId}
                        onChange={(e) => setBulkCompanyId(e.target.value)}
                        disabled={readOnlyFinanceiro || bulkSaving || companiesLoading}
                        className="h-9 min-w-[200px] rounded-lg border border-[rgba(29,127,229,0.2)] bg-[rgba(3,8,15,0.9)] px-2 text-white"
                      >
                        <option value="">{FINANCEIRO_SEM_EMPRESA}</option>
                        {serverCatalog.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={
                        readOnlyFinanceiro ||
                        selectedLineIds.size === 0 ||
                        bulkSaving ||
                        companiesLoading
                      }
                      onClick={() => void applyBulkCompanyAllocation()}
                      className="h-9 rounded-lg bg-violet-600 px-4 font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                    >
                      {bulkSaving ? "Aplicando..." : "Aplicar a selecionados"}
                    </button>
                    <button
                      type="button"
                      disabled={readOnlyFinanceiro || selectedLineIds.size === 0}
                      onClick={() => setSelectedLineIds(new Set())}
                      className="h-9 rounded-lg border border-[rgba(29,127,229,0.2)] px-3 text-[#6b8aaa] hover:bg-[rgba(29,127,229,0.12)] disabled:opacity-50"
                    >
                      Limpar selecao
                    </button>
                  </div>
                ) : null}
                <div ref={sheetScrollRef} className="min-h-0 flex-1 overflow-auto p-4">
                  {sheetError ? <p className="text-sm text-[#ff453a]">{sheetError}</p> : null}
                  {sheetServerId && !readOnlyFinanceiro ? (
                    <div className="mb-6 flex flex-wrap items-end gap-2">
                      {companyUiError ? <p className="w-full text-xs text-[#ff453a]">{companyUiError}</p> : null}
                      <input
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addServerCompany(); } }}
                        className="h-10 min-w-[200px] flex-1 rounded-lg border border-[rgba(29,127,229,0.2)] bg-[rgba(3,8,15,0.9)] px-3 text-sm text-white placeholder-[#6b8aaa]"
                        placeholder="Nome da nova empresa"
                        disabled={companiesLoading}
                      />
                      <button
                        type="button"
                        onClick={() => void addServerCompany()}
                        disabled={companiesLoading || !newCompanyName.trim()}
                        className="h-10 rounded-lg bg-[rgba(0,204,102,0.7)] px-4 text-sm font-medium text-white hover:bg-[rgba(0,204,102,0.9)] disabled:opacity-50"
                      >
                        + Nova empresa
                      </button>
                    </div>
                  ) : null}
                  {!sheetLoading && !sheetError && sheetByCompany.length > 0 ? (
                    <div className="mb-6 rounded-xl border border-[rgba(29,127,229,0.15)] bg-[rgba(8,15,26,0.7)]/50 p-4">
                      <h3 className="text-sm font-semibold text-white">Colaboradores por empresa</h3>
                      <p className="mt-0.5 text-xs text-[#6b8aaa]">
                        Contagem pela empresa alocada na planilha ({FINANCEIRO_SEM_EMPRESA} = sem selecao).
                      </p>
                      <div className="mt-4 max-h-52 space-y-2.5 overflow-y-auto pr-1">
                        {sheetByCompany.map(({ label, count }) => {
                          const pct = Math.round((count / sheetCompanyChartMax) * 100);
                          return (
                            <div key={label}>
                              <div className="mb-0.5 flex justify-between text-xs text-[#6b8aaa]">
                                <span className="truncate pr-2" title={label}>
                                  {label}
                                </span>
                                <span className="shrink-0 font-medium text-[#6b8aaa]">{count}</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-[rgba(29,127,229,0.08)]">
                                <div
                                  className="h-full rounded-full bg-emerald-500/85"
                                  style={{ width: `${Math.max(pct, 2)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  {lineEditor ? (
                    <div
                      ref={lineEditorPanelRef}
                      id="financeiro-line-editor-panel"
                      className="mb-6 scroll-mt-4 rounded-xl border border-[rgba(29,127,229,0.3)] bg-[rgba(8,15,26,0.7)]/70 p-4"
                    >
                      <h3 className="text-sm font-semibold text-white">
                        {lineEditor.mode === "create" ? "Nova linha" : "Editar linha"}
                      </h3>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1 text-xs text-[#6b8aaa]">
                          Empresa alocada
                          <select
                            value={lineEditor.financeiroServerCompanyId}
                            onChange={(e) =>
                              setLineEditor((p) =>
                                p ? { ...p, financeiroServerCompanyId: e.target.value } : p
                              )
                            }
                            className="rounded-lg border border-[rgba(29,127,229,0.2)] bg-[rgba(3,8,15,0.9)] px-3 py-2 text-sm text-white"
                            disabled={readOnlyFinanceiro || editorSaving}
                          >
                            <option value="">{FINANCEIRO_SEM_EMPRESA}</option>
                            {serverCatalog.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-[#6b8aaa]">
                          Nome
                          <input
                            value={lineEditor.displayName}
                            onChange={(e) =>
                              setLineEditor((p) => (p ? { ...p, displayName: e.target.value } : p))
                            }
                            className="rounded-lg border border-[rgba(29,127,229,0.2)] bg-[rgba(3,8,15,0.9)] px-3 py-2 text-sm text-white"
                            disabled={readOnlyFinanceiro || editorSaving}
                          />
                        </label>
                        {sheetSource !== "TIM_CSV" ? (
                          <>
                            <label className="flex flex-col gap-1 text-xs text-[#6b8aaa]">
                              E-mail
                              <input
                                value={lineEditor.email}
                                onChange={(e) =>
                                  setLineEditor((p) => (p ? { ...p, email: e.target.value } : p))
                                }
                                className="rounded-lg border border-[rgba(29,127,229,0.2)] bg-[rgba(3,8,15,0.9)] px-3 py-2 font-mono text-sm text-white"
                                disabled={readOnlyFinanceiro || editorSaving}
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-xs text-[#6b8aaa]">
                              Status
                              <input
                                value={lineEditor.status}
                                onChange={(e) =>
                                  setLineEditor((p) => (p ? { ...p, status: e.target.value } : p))
                                }
                                className="rounded-lg border border-[rgba(29,127,229,0.2)] bg-[rgba(3,8,15,0.9)] px-3 py-2 text-sm text-white"
                                disabled={readOnlyFinanceiro || editorSaving}
                              />
                            </label>
                            <label className="sm:col-span-2 flex flex-col gap-1 text-xs text-[#6b8aaa]">
                              Detalhes
                              <input
                                value={lineEditor.detail}
                                onChange={(e) =>
                                  setLineEditor((p) => (p ? { ...p, detail: e.target.value } : p))
                                }
                                className="rounded-lg border border-[rgba(29,127,229,0.2)] bg-[rgba(3,8,15,0.9)] px-3 py-2 text-sm text-white"
                                disabled={readOnlyFinanceiro || editorSaving}
                              />
                            </label>
                          </>
                        ) : (
                          <>
                            <label className="flex flex-col gap-1 text-xs text-[#6b8aaa]">
                              Telefone
                              <input
                                value={lineEditor.telefone}
                                onChange={(e) =>
                                  setLineEditor((p) => (p ? { ...p, telefone: e.target.value } : p))
                                }
                                className="rounded-lg border border-[rgba(29,127,229,0.2)] bg-[rgba(3,8,15,0.9)] px-3 py-2 text-sm text-white"
                                disabled={readOnlyFinanceiro || editorSaving}
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-xs text-[#6b8aaa]">
                              Dispositivo
                              <input
                                value={lineEditor.dispositivo}
                                onChange={(e) =>
                                  setLineEditor((p) => (p ? { ...p, dispositivo: e.target.value } : p))
                                }
                                className="rounded-lg border border-[rgba(29,127,229,0.2)] bg-[rgba(3,8,15,0.9)] px-3 py-2 text-sm text-white"
                                disabled={readOnlyFinanceiro || editorSaving}
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-xs text-[#6b8aaa]">
                              Ultima atividade
                              <input
                                value={lineEditor.ultimaAtividade}
                                onChange={(e) =>
                                  setLineEditor((p) => (p ? { ...p, ultimaAtividade: e.target.value } : p))
                                }
                                className="rounded-lg border border-[rgba(29,127,229,0.2)] bg-[rgba(3,8,15,0.9)] px-3 py-2 text-sm text-white"
                                disabled={readOnlyFinanceiro || editorSaving}
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-xs text-[#6b8aaa]">
                              Criado em
                              <input
                                value={lineEditor.criadoEm}
                                onChange={(e) =>
                                  setLineEditor((p) => (p ? { ...p, criadoEm: e.target.value } : p))
                                }
                                className="rounded-lg border border-[rgba(29,127,229,0.2)] bg-[rgba(3,8,15,0.9)] px-3 py-2 text-sm text-white"
                                disabled={readOnlyFinanceiro || editorSaving}
                              />
                            </label>
                          </>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={readOnlyFinanceiro || editorSaving}
                          onClick={() => void submitLineEditor()}
                          className="rounded-lg bg-[#1d7fe5] px-4 py-2 text-sm font-medium text-white hover:bg-[#4da3ff] disabled:opacity-50"
                        >
                          {editorSaving ? "Salvando..." : "Salvar"}
                        </button>
                        <button
                          type="button"
                          disabled={readOnlyFinanceiro || editorSaving}
                          onClick={closeLineEditor}
                          className="rounded-lg border border-[rgba(29,127,229,0.2)] px-4 py-2 text-sm text-white hover:bg-[rgba(29,127,229,0.12)]"
                        >
                          Cancelar
                        </button>
                        {lineEditor.mode === "edit" ? (
                          <button
                            type="button"
                            disabled={readOnlyFinanceiro || editorSaving}
                            onClick={() => setConfirmar({ acao: () => void deleteLineFromEditor(), mensagem: "Excluir esta linha do snapshot?" })}
                            className="rounded-lg border border-red-800/80 bg-red-950/40 px-4 py-2 text-sm text-red-200 hover:bg-red-950/70 disabled:opacity-50"
                          >
                            Excluir linha
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {!sheetLoading && !sheetError && sheetLines.length === 0 ? (
                    <p className="text-sm text-[#6b8aaa]">
                      Nenhuma linha neste snapshot. Importe o arquivo deste mes ou use <strong className="text-[#6b8aaa]">Nova linha</strong> para cadastrar manualmente.
                    </p>
                  ) : null}
                  {sheetLines.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-[rgba(29,127,229,0.15)]">
                      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                        <thead className="sticky top-0 z-10 bg-[rgba(8,15,26,0.7)]">
                          {sheetSource === "TIM_CSV" ? (
                            <tr className="border-b border-[rgba(29,127,229,0.18)] text-[#6b8aaa]">
                              <th className="w-11 p-2">
                                <input
                                  ref={selectAllCheckboxRef}
                                  type="checkbox"
                                  checked={allVisibleSelected}
                                  onChange={(e) => toggleSelectAll(e.target.checked)}
                                  disabled={readOnlyFinanceiro || bulkSaving || sheetLoading}
                                  aria-label="Selecionar todas as linhas visiveis"
                                  className="h-4 w-4 accent-violet-500"
                                />
                              </th>
                              <th className="min-w-[200px] p-2 font-semibold">Empresa alocada</th>
                              <th className="p-2 font-semibold">Nome</th>
                              <th className="p-2 font-semibold">Telefone</th>
                              <th className="p-2 font-semibold">Dispositivo</th>
                              <th className="p-2 font-semibold">Ultima atividade</th>
                              <th className="p-2 font-semibold">Criado em</th>
                              <th className="w-44 p-2 font-semibold">Acoes</th>
                            </tr>
                          ) : (
                            <tr className="border-b border-[rgba(29,127,229,0.18)] text-[#6b8aaa]">
                              <th className="w-11 p-2">
                                <input
                                  ref={selectAllCheckboxRef}
                                  type="checkbox"
                                  checked={allVisibleSelected}
                                  onChange={(e) => toggleSelectAll(e.target.checked)}
                                  disabled={readOnlyFinanceiro || bulkSaving || sheetLoading}
                                  aria-label="Selecionar todas as linhas visiveis"
                                  className="h-4 w-4 accent-violet-500"
                                />
                              </th>
                              <th className="min-w-[200px] p-2 font-semibold">Empresa alocada</th>
                              <th className="p-2 font-semibold">E-mail</th>
                              <th className="p-2 font-semibold">Nome</th>
                              <th className="p-2 font-semibold">Status</th>
                              <th className="p-2 font-semibold">Detalhes</th>
                              <th className="w-44 p-2 font-semibold">Acoes</th>
                            </tr>
                          )}
                        </thead>
                        <tbody>
                          {sheetSource === "TIM_CSV"
                            ? sheetLines.map((line) => {
                                const m = (line.meta && typeof line.meta === "object" ? line.meta : {}) as Record<
                                  string,
                                  string
                                >;
                                return (
                                  <tr key={line.id} className="border-b border-[rgba(29,127,229,0.15)]/80 text-white">
                                    <td className="p-2 align-top">
                                      <input
                                        type="checkbox"
                                        checked={selectedLineIds.has(line.id)}
                                        onChange={(e) => toggleLineSelected(line.id, e.target.checked)}
                                        disabled={
                                          readOnlyFinanceiro ||
                                          bulkSaving ||
                                          sheetLoading ||
                                          patchingLineId === line.id
                                        }
                                        aria-label={`Selecionar ${line.displayName}`}
                                        className="mt-1 h-4 w-4 accent-violet-500"
                                      />
                                    </td>
                                    <td className="p-2 align-top">
                                      <div className="flex flex-col gap-2">
                                        <select
                                          value={line.financeiroServerCompanyId ?? ""}
                                          disabled={
                                            readOnlyFinanceiro ||
                                            patchingLineId === line.id ||
                                            companiesLoading
                                          }
                                          onChange={(e) => {
                                            const v = e.target.value;
                                            void patchLineAllocation(line.id, v === "" ? null : v);
                                          }}
                                          className="max-w-[240px] rounded border border-[rgba(29,127,229,0.2)] bg-[rgba(3,8,15,0.9)] px-2 py-1.5 text-sm text-white"
                                        >
                                          <option value="">{FINANCEIRO_SEM_EMPRESA}</option>
                                          {serverCatalog.map((c) => (
                                            <option key={c.id} value={c.id}>
                                              {c.name}
                                            </option>
                                          ))}
                                        </select>
                                        {line.lineSource === "MANUAL" ? (
                                          <span className="w-fit rounded bg-[rgba(255,170,0,0.07)]/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#ffaa00]/90">
                                            Manual
                                          </span>
                                        ) : null}
                                      </div>
                                    </td>
                                    <td className="p-2 align-top">{line.displayName}</td>
                                    <td className="p-2 align-top text-[#6b8aaa]">{m.telefone ?? "—"}</td>
                                    <td className="p-2 align-top text-[#6b8aaa]">{m.dispositivo ?? "—"}</td>
                                    <td className="p-2 align-top text-[#6b8aaa]">{m.ultimaAtividade ?? "—"}</td>
                                    <td className="p-2 align-top text-[#6b8aaa]">{m.criadoEm ?? "—"}</td>
                                    <td className="p-2 align-top">
                                      <button
                                        type="button"
                                        onClick={() => openLineEditorEdit(line)}
                                        disabled={readOnlyFinanceiro}
                                        className="rounded border border-[rgba(29,127,229,0.2)] px-2 py-1 text-xs text-[#4da3ff] hover:bg-[rgba(29,127,229,0.12)] disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        Editar
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            : sheetLines.map((line) => {
                                return (
                                  <tr key={line.id} className="border-b border-[rgba(29,127,229,0.15)]/80 text-white">
                                    <td className="p-2 align-top">
                                      <input
                                        type="checkbox"
                                        checked={selectedLineIds.has(line.id)}
                                        onChange={(e) => toggleLineSelected(line.id, e.target.checked)}
                                        disabled={
                                          readOnlyFinanceiro ||
                                          bulkSaving ||
                                          sheetLoading ||
                                          patchingLineId === line.id
                                        }
                                        aria-label={`Selecionar ${line.displayName}`}
                                        className="mt-1 h-4 w-4 accent-violet-500"
                                      />
                                    </td>
                                    <td className="p-2 align-top">
                                      <div className="flex flex-col gap-2">
                                        <select
                                          value={line.financeiroServerCompanyId ?? ""}
                                          disabled={
                                            readOnlyFinanceiro ||
                                            patchingLineId === line.id ||
                                            companiesLoading
                                          }
                                          onChange={(e) => {
                                            const v = e.target.value;
                                            void patchLineAllocation(line.id, v === "" ? null : v);
                                          }}
                                          className="max-w-[240px] rounded border border-[rgba(29,127,229,0.2)] bg-[rgba(3,8,15,0.9)] px-2 py-1.5 text-sm text-white"
                                        >
                                          <option value="">{FINANCEIRO_SEM_EMPRESA}</option>
                                          {serverCatalog.map((c) => (
                                            <option key={c.id} value={c.id}>
                                              {c.name}
                                            </option>
                                          ))}
                                        </select>
                                        {line.lineSource === "MANUAL" ? (
                                          <span className="w-fit rounded bg-[rgba(255,170,0,0.07)]/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#ffaa00]/90">
                                            Manual
                                          </span>
                                        ) : null}
                                      </div>
                                    </td>
                                    <td className="p-2 align-top font-mono text-xs text-[#6b8aaa]">{line.email ?? "—"}</td>
                                    <td className="p-2 align-top">{line.displayName}</td>
                                    <td className="p-2 align-top text-[#6b8aaa]">{line.status ?? "—"}</td>
                                    <td className="p-2 align-top text-[#6b8aaa]">{line.detail ?? "—"}</td>
                                    <td className="p-2 align-top">
                                      <button
                                        type="button"
                                        onClick={() => openLineEditorEdit(line)}
                                        disabled={readOnlyFinanceiro}
                                        className="rounded border border-[rgba(29,127,229,0.2)] px-2 py-1 text-xs text-[#4da3ff] hover:bg-[rgba(29,127,229,0.12)] disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        Editar
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

        </>
      ) : null}
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
