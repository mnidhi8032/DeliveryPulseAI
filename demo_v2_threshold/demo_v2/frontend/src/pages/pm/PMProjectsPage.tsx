import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { listProjects, createProjectWithPlan } from "../../services/projectService";
import { getSetupAccounts } from "../../services/customerAdminSetupService";
import { listBusinessUnits } from "../../services/businessUnitService";
import { useToast } from "../../contexts/ToastContext";
import { RagBadge as _RagBadge } from "../../components/RagBadge";
import type { Project } from "../../types/project";
import { formatStatus, getStatusBadgeClass } from "../../utils/formatters";
import { PROJECT_TYPES, DELIVERY_MODELS, PROJECT_CATEGORIES, WORK_SIZE_UNITS, METRIC_CATEGORIES, FREQUENCIES, COMPLIANCE_LABEL } from "../../types/qpm";
import type { KpiPlanMetric, QPMCatalogMetric } from "../../types/qpm";
import { getKpiPlan, getCatalog, addPlanMetric, removePlanMetric } from "../../services/qpmService";
import { submitMetricRequest, listMetricRequests } from "../../services/metricApprovalService";
import type { MetricApprovalRequest } from "../../services/metricApprovalService";

export function PMProjectsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<{ id: string; name: string; is_active: boolean; business_unit_id: string }[]>([]);
  const [pmBusinessUnit, setPmBusinessUnit] = useState<{ id: string; name: string } | null>(null);

  // Metrics panel state
  const [metricsPanel, setMetricsPanel] = useState<{ projectId: string; projectName: string } | null>(null);
  const [planMetrics, setPlanMetrics] = useState<KpiPlanMetric[]>([]);
  const [planId, setPlanId] = useState<string>("");
  const [catalogMetrics, setCatalogMetrics] = useState<QPMCatalogMetric[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [addingMetric, setAddingMetric] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  // Tab: "catalog" = add from catalog directly | "custom" = request approval from DE
  const [addTab, setAddTab] = useState<"catalog" | "custom">("catalog");
  const [myRequests, setMyRequests] = useState<MetricApprovalRequest[]>([]);
  const [addForm, setAddForm] = useState({
    catalog_metric_id: "",
    metric_name: "", metric_category: "", formula: "", uom: "",
    intent: "Higher the better", frequency: "Monthly", priority: "O",
    justification: "",  // required for custom metric requests
  });
  const [form, setForm] = useState({
    account_id: "",
    project_code: "",
    project_name: "",
    description: "",
    start_date: "",
    target_end_date: "",
    // Engagement model
    project_type: "",
    delivery_process_model: "",
    project_category: "",
    work_size_unit: "",
  });

  const loadProjects = async () => {
    const projs = await listProjects();
    setProjects(projs.sort((a, b) => a.project_name.localeCompare(b.project_name)));
  };

  const openMetricsPanel = useCallback(async (project: Project) => {
    setMetricsPanel({ projectId: project.id, projectName: project.project_name });
    setMetricsLoading(true);
    setShowAddForm(false);
    setAddTab("catalog");
    try {
      const [plan, catalog, requests] = await Promise.all([
        getKpiPlan(project.id),
        getCatalog(),
        listMetricRequests(),
      ]);
      setPlanId(plan.id);
      setPlanMetrics(plan.metrics.filter(m => m.is_active));
      setCatalogMetrics(catalog);
      // Only show requests for this plan
      setMyRequests(requests.filter(r => r.kpi_plan_id === plan.id));
    } catch {
      toast.error("Failed to load project metrics");
    } finally {
      setMetricsLoading(false);
    }
  }, [toast]);

  const handleRemoveMetric = async (metricId: string) => {
  const metric = planMetrics.find(m => m.id === metricId);
  if (metric?.priority === "M") {
    toast.error("Mandatory metrics cannot be removed.");
    return;
  }
  if (!window.confirm("Remove this metric from the plan?")) return;
  try {
    await removePlanMetric(metricId);
    setPlanMetrics(prev => prev.filter(m => m.id !== metricId));
    toast.success("Metric removed");
  } catch (e: any) {
    toast.error(e.response?.data?.detail || "Failed to remove metric");
  }
};

  const handleAddMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planId) return;
    setAddingMetric(true);
    try {
      if (addTab === "catalog") {
        // Add from catalog directly — no approval needed
        const selectedCatalog = catalogMetrics.find(c => c.id === addForm.catalog_metric_id);
        if (!selectedCatalog) { toast.error("Select a metric from the catalog"); setAddingMetric(false); return; }
        const added = await addPlanMetric(planId, {
          catalog_metric_id: addForm.catalog_metric_id,
          metric_name: selectedCatalog.name,
          metric_category: selectedCatalog.category,
          formula: selectedCatalog.formula || "",
          uom: selectedCatalog.uom || "",
          intent: selectedCatalog.intent || "",
          frequency: selectedCatalog.frequency || "Monthly",
          priority: selectedCatalog.compliance || "O",
          target: selectedCatalog.default_target ?? undefined,
          lsl: selectedCatalog.default_lsl ?? undefined,
          usl: selectedCatalog.default_usl ?? undefined,
        } as any);
        setPlanMetrics(prev => [...prev, added]);
        toast.success(`Added: ${added.metric_name}`);
      } else {
        // Custom metric — submit approval request to DE
        if (!addForm.metric_name.trim()) { toast.error("Metric name is required"); setAddingMetric(false); return; }
        if (!addForm.justification.trim()) { toast.error("Justification is required for custom metrics"); setAddingMetric(false); return; }
        const req = await submitMetricRequest({
          kpi_plan_id: planId,
          metric_name: addForm.metric_name,
          metric_category: addForm.metric_category || undefined,
          formula: addForm.formula || undefined,
          uom: addForm.uom || undefined,
          intent: addForm.intent || undefined,
          frequency: addForm.frequency || undefined,
          priority: addForm.priority || undefined,
          justification: addForm.justification,
        });
        setMyRequests(prev => [req, ...prev]);
        toast.success("Request submitted to Delivery Excellence for approval.");
      }
      setShowAddForm(false);
      setAddForm({ catalog_metric_id: "", metric_name: "", metric_category: "", formula: "", uom: "", intent: "Higher the better", frequency: "Monthly", priority: "O", justification: "" });
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed");
    } finally {
      setAddingMetric(false);
    }
  };

  const selectedCatalogIds = new Set(planMetrics.map(m => m.catalog_metric_id).filter(Boolean));
  const availableCatalog = catalogMetrics.filter(c => !selectedCatalogIds.has(c.id));

  useEffect(() => {
    loadProjects()
      .catch(() => setError("Failed to load projects."))
      .finally(() => setLoading(false));
  }, []);

  // Auto-open create modal when navigated from dashboard with ?create=1
  useEffect(() => {
    if (searchParams.get("create") === "1") {
      handleOpenCreate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenCreate = async () => {
    try {
      const [accts, bus] = await Promise.all([getSetupAccounts(), listBusinessUnits()]);
      const activeAccounts = accts.filter((a: any) => a.is_active);
      setAccounts(activeAccounts);
      
      // Derive PM's BU from their scoped accounts (all returned accounts belong to PM's BU)
      if (activeAccounts.length > 0) {
        const pmBuId = activeAccounts[0].business_unit_id;
        const pmBu = bus.find((b: { id: string; name: string }) => b.id === pmBuId);
        setPmBusinessUnit(pmBu || null);
      } else {
        // Fallback: no accounts yet, try to find BU that has PM assigned
        setPmBusinessUnit(null);
      }
      
      setForm({
        account_id: activeAccounts[0]?.id || "",
        project_code: "", project_name: "",
        description: "", start_date: "", target_end_date: "",
        project_type: "", delivery_process_model: "", project_category: "", work_size_unit: "",
      });
    } catch { toast.error("Failed to load accounts"); return; }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_type || !form.delivery_process_model) {
      toast.error("Project Type and Delivery Model are required.");
      return;
    }
    setSaving(true);
    try {
      const result = await createProjectWithPlan({
        account_id: form.account_id,
        project_code: form.project_code,
        project_name: form.project_name,
        description: form.description || undefined,
        start_date: form.start_date || undefined,
        target_end_date: form.target_end_date || undefined,
        project_type: form.project_type,
        delivery_process_model: form.delivery_process_model,
        project_category: form.project_category || undefined,
        work_size_unit: form.work_size_unit || undefined,
      });
      toast.success(
        `Project created with ${result.mandatory_metrics_added} mandatory metrics auto-selected.`
      );
      setModalOpen(false);
      setLoading(true);
      await loadProjects();
      // Navigate directly to Data Entry
      navigate(`/pm/projects/${result.project_id}/qpm/entry`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create project");
    } finally { setSaving(false); setLoading(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "8px 0" }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ height: 60, borderRadius: 14, background: "#fff", border: "1.5px solid #e8e6ff", boxShadow: "0 2px 12px rgba(108,99,255,0.08)", animation: "pulse 1.5s ease-in-out infinite" }} />
      ))}
    </div>
  );

  if (error) return <p style={{ color: "#dc2626", fontSize: 14 }}>{error}</p>;

  // Stat counts
  const total    = projects.length;
  const redCnt   = projects.filter(p => p.current_rag === "RED" || p.current_rag === "CRITICAL").length;
  const amberCnt = projects.filter(p => p.current_rag === "AMBER").length;
  const greenCnt = projects.filter(p => p.current_rag === "GREEN").length;
  const noScore  = projects.filter(p => !p.current_rag).length;

  const ragBorderColor: Record<string, string> = {
    GREEN: "#22c55e", AMBER: "#f59e0b", RED: "#ef4444", CRITICAL: "#ef4444",
  };
  const ragTextColor: Record<string, string> = {
    GREEN: "#16a34a", AMBER: "#d97706", RED: "#dc2626", CRITICAL: "#dc2626",
  };
  const ragBg: Record<string, string> = {
    GREEN: "#f0fdf4", AMBER: "#fffbeb", RED: "#fff1f2", CRITICAL: "#fff1f2",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, fontFamily: "'Inter',system-ui,sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#6c63ff", textTransform: "uppercase", letterSpacing: "0.14em", margin: "0 0 6px" }}>
            Project Manager
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#1a1a2e", margin: 0, letterSpacing: "-0.02em" }}>
            My Projects
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            Projects you're assigned to as project manager
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 14,
            background: "#6c63ff", color: "#fff", fontSize: 13, fontWeight: 700,
            padding: "11px 22px", border: "none", cursor: "pointer",
            boxShadow: "0 4px 16px rgba(108,99,255,0.35)",
            transition: "background 0.15s, transform 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "#5b52f0")}
          onMouseLeave={e => (e.currentTarget.style.background = "#6c63ff")}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Project
        </button>
      </div>

      {/* ── Stat chips ── */}
      {projects.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {[
            { label: "Total",    value: total,    color: "#6c63ff", bg: "rgba(108,99,255,0.08)"  },
            { label: "Green",    value: greenCnt, color: "#16a34a", bg: "rgba(34,197,94,0.08)"   },
            { label: "Amber",    value: amberCnt, color: "#d97706", bg: "rgba(245,158,11,0.08)"  },
            { label: "Red",      value: redCnt,   color: "#dc2626", bg: "rgba(239,68,68,0.08)"   },
            { label: "No score", value: noScore,  color: "#6b7280", bg: "rgba(107,114,128,0.08)" },
          ].map(s => (
            <div key={s.label} style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              borderRadius: 999, padding: "6px 14px",
              background: s.bg, border: `1.5px solid ${s.color}30`,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block", boxShadow: `0 0 6px ${s.color}60` }} />
              <span style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: s.color, opacity: 0.8 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {projects.length === 0 ? (
        <div style={{
          borderRadius: 20, border: "2px dashed #e8e6ff", background: "#fff",
          padding: "60px 24px", textAlign: "center",
          boxShadow: "0 2px 16px rgba(108,99,255,0.08)",
        }}>
          <div style={{ margin: "0 auto 16px", width: 56, height: 56, borderRadius: 16, background: "rgba(108,99,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#6c63ff" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>No projects yet</p>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 6, marginBottom: 20 }}>Create your first project to get started.</p>
          <button onClick={handleOpenCreate} style={{
            display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 12,
            background: "#6c63ff", color: "#fff", fontSize: 13, fontWeight: 700,
            padding: "11px 22px", border: "none", cursor: "pointer",
            boxShadow: "0 4px 16px rgba(108,99,255,0.35)",
          }}>
            + Create Project
          </button>
        </div>
      ) : (
        /* ── Project cards ── */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {projects.map(p => {
            const rag = p.current_rag;
            const leftColor = rag ? (ragBorderColor[rag] ?? "#e8e6ff") : "#e8e6ff";
            const textColor = rag ? (ragTextColor[rag] ?? "#6b7280") : "#6b7280";
            const chipBg    = rag ? (ragBg[rag] ?? "#f8f7ff") : "#f8f7ff";
            const ragLabel  = rag ? (rag.charAt(0) + rag.slice(1).toLowerCase()) : "No score";

            const statusBg: Record<string,string>    = { ACTIVE:"#f0fdf4", ON_HOLD:"#fffbeb", COMPLETED:"#eff6ff", CANCELLED:"#f9fafb" };
            const statusColor: Record<string,string> = { ACTIVE:"#16a34a", ON_HOLD:"#d97706", COMPLETED:"#2563eb", CANCELLED:"#9ca3af" };
            const statusLabel: Record<string,string> = { ACTIVE:"Active", ON_HOLD:"On Hold", COMPLETED:"Completed", CANCELLED:"Cancelled" };

            const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : null;

            return (
              <div key={p.id} style={{
                borderRadius: 16, background: "#fff",
                border: "1.5px solid #e8e6ff",
                borderLeft: `4px solid ${leftColor}`,
                boxShadow: "0 2px 14px rgba(108,99,255,0.09)",
                overflow: "hidden",
                transition: "transform 0.18s, box-shadow 0.18s",
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 6px 28px rgba(108,99,255,0.16)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ""; el.style.boxShadow = "0 2px 14px rgba(108,99,255,0.09)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", padding: "14px 20px", gap: 0 }}>

                  {/* RAG dot — 28px */}
                  <div style={{ width: 28, flexShrink: 0, display: "flex", alignItems: "center" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: leftColor, display: "inline-block", boxShadow: `0 0 8px ${leftColor}80` }} />
                  </div>

                  {/* Code + Name — 220px */}
                  <div style={{ width: 220, flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: "#6c63ff", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.12em" }}>{p.project_code}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, borderRadius: 999, padding: "1px 7px",
                        color: statusColor[p.status] ?? "#6b7280",
                        background: statusBg[p.status] ?? "#f9fafb",
                      }}>{statusLabel[p.status] ?? p.status}</span>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", margin: 0, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.project_name}</p>
                  </div>

                  {/* Account / BU — 200px */}
                  <div style={{ width: 200, flexShrink: 0, paddingLeft: 20 }}>
                    <p style={{ fontSize: 13, color: "#1a1a2e", fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.account_name}</p>
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.business_unit_name}</p>
                  </div>

                  {/* Dates — 180px */}
                  <div style={{ width: 180, flexShrink: 0, paddingLeft: 20 }}>
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, whiteSpace: "nowrap" }}>
                      {(p.start_date || p.target_end_date)
                        ? `${formatDate(p.start_date) ?? ""}${p.target_end_date ? ` → ${formatDate(p.target_end_date)}` : ""}`
                        : "—"}
                    </p>
                  </div>

                  {/* Health badge — 120px */}
                  <div style={{ width: 120, flexShrink: 0, paddingLeft: 12, display: "flex", alignItems: "center" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 11, fontWeight: 700, borderRadius: 999,
                      padding: "4px 12px", whiteSpace: "nowrap",
                      color: textColor, background: chipBg,
                      border: `1.5px solid ${leftColor}50`,
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: leftColor, display: "inline-block", flexShrink: 0 }} />
                      {ragLabel}
                    </span>
                  </div>

                  {/* Actions — push right */}
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                    <Link to={`/pm/projects/${p.id}/qpm/entry`} style={{ textDecoration: "none" }}>
                      <span style={{
                        display: "inline-block", borderRadius: 10, padding: "7px 16px",
                        fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                        color: "#6c63ff", background: "rgba(108,99,255,0.08)",
                        border: "1.5px solid rgba(108,99,255,0.22)", cursor: "pointer",
                      }}>Data Entry</span>
                    </Link>
                    <button onClick={() => openMetricsPanel(p)} style={{
                      borderRadius: 10, padding: "7px 16px",
                      fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                      color: "#1a1a2e", background: "#f8f7ff",
                      border: "1.5px solid #e8e6ff", cursor: "pointer",
                    }}>Metrics</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(26,26,46,0.45)", padding: 16, backdropFilter: "blur(6px)" }}>
          <div style={{ width: "100%", maxWidth: 560, borderRadius: 24, border: "1.5px solid #e8e6ff", background: "#fff", padding: 28, boxShadow: "0 16px 64px rgba(108,99,255,0.18)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: "1.5px solid #e8e6ff", paddingBottom: 16, marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1a1a2e", margin: 0 }}>Create New Project</h3>
                <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Mandatory metrics will be auto-selected on creation.</p>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", fontSize: 22, color: "#9ca3af", cursor: "pointer", lineHeight: 1 }}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Project Details */}
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, color: "#6c63ff", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 12px" }}>Project Details</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Business Unit</label>
                    <div style={{ borderRadius: 10, border: "1.5px solid #e8e6ff", background: "#f8f7ff", padding: "9px 14px", fontSize: 13, color: "#374151", fontWeight: 500 }}>
                      {pmBusinessUnit ? pmBusinessUnit.name : "No Business Unit assigned"}
                    </div>
                    {!pmBusinessUnit && <p style={{ fontSize: 10, color: "#d97706" }}>Not assigned to any BU. Contact an administrator.</p>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Account / Client *</label>
                    <select required value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}
                      disabled={accounts.length === 0}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50">
                      <option value="">Select Account...</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Project Code *</label>
                      <input type="text" required placeholder="E.g. PROJ-001" value={form.project_code}
                        onChange={e => setForm(f => ({ ...f, project_code: e.target.value }))}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Project Name *</label>
                      <input type="text" required placeholder="E.g. Banking Portal" value={form.project_name}
                        onChange={e => setForm(f => ({ ...f, project_name: e.target.value }))}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Start Date</label>
                      <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Target End Date</label>
                      <input type="date" value={form.target_end_date} onChange={e => setForm(f => ({ ...f, target_end_date: e.target.value }))}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Engagement Model */}
              <div style={{ borderRadius: 14, border: "1.5px solid #d5d0ff", background: "#f8f7ff", padding: 16 }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: "#6c63ff", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 4px" }}>Engagement Model *</p>
                <p style={{ fontSize: 11, color: "#818cf8", margin: "0 0 12px" }}>Mandatory metrics will be auto-selected based on these values.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Project Type *", key: "project_type" as const, opts: PROJECT_TYPES, required: true },
                    { label: "Delivery Model *", key: "delivery_process_model" as const, opts: DELIVERY_MODELS, required: true },
                    { label: "Project Category", key: "project_category" as const, opts: PROJECT_CATEGORIES, required: false },
                    { label: "Work Size Unit", key: "work_size_unit" as const, opts: WORK_SIZE_UNITS, required: false },
                  ].map(f2 => (
                    <div key={f2.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{f2.label}</label>
                      <select required={f2.required} value={form[f2.key]} onChange={e => setForm(f => ({ ...f, [f2.key]: e.target.value }))}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                        <option value="">Select...</option>
                        {f2.opts.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4, borderTop: "1.5px solid #e8e6ff" }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{
                  borderRadius: 10, border: "1.5px solid #e8e6ff", padding: "9px 18px",
                  fontSize: 12, fontWeight: 700, color: "#374151", background: "#fff", cursor: "pointer",
                }}>Cancel</button>
                <button type="submit" disabled={saving} style={{
                  borderRadius: 10, padding: "9px 22px",
                  fontSize: 12, fontWeight: 700, color: "#fff",
                  background: saving ? "#a5b4fc" : "#6c63ff", border: "none", cursor: saving ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 14px rgba(108,99,255,0.35)",
                }}>{saving ? "Creating..." : "Create Project"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Metrics Panel */}
      {metricsPanel && (
        <div style={{ position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(26,26,46,0.45)",padding:16,backdropFilter:"blur(6px)" }}>
          <div style={{ width:"100%",maxWidth:640,borderRadius:24,border:"1.5px solid #e8e6ff",background:"#fff",padding:28,boxShadow:"0 16px 64px rgba(108,99,255,0.18)",maxHeight:"90vh",overflowY:"auto" }}>
            <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",borderBottom:"1.5px solid #e8e6ff",paddingBottom:16,marginBottom:20 }}>
              <div>
                <h3 style={{ fontSize:17,fontWeight:800,color:"#1a1a2e",margin:0 }}>Manage Metrics — {metricsPanel.projectName}</h3>
                <p style={{ fontSize:12,color:"#6b7280",marginTop:4 }}>Mandatory metrics are locked and cannot be removed.</p>
              </div>
              <button onClick={() => setMetricsPanel(null)} style={{ background:"none",border:"none",fontSize:22,color:"#9ca3af",cursor:"pointer",lineHeight:1 }}>&times;</button>
            </div>
            {metricsLoading ? (
              <div style={{ padding:"40px 0",textAlign:"center",color:"#6b7280",fontSize:13 }}>Loading metrics…</div>
            ) : (
              <>
                <div style={{ borderRadius:12,border:"1.5px solid #e8e6ff",overflow:"hidden",marginBottom:16 }}>
                  <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
                    <thead>
                      <tr style={{ background:"#f8f7ff",borderBottom:"1.5px solid #e8e6ff" }}>
                        {["Metric","Category","Frequency","Priority",""].map(h => (
                          <th key={h} style={{ padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:"#6c63ff",textTransform:"uppercase",letterSpacing:"0.08em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {planMetrics.length === 0 ? (
                        <tr><td colSpan={5} style={{ padding:"24px 12px",textAlign:"center",color:"#9ca3af",fontSize:12 }}>No metrics yet.</td></tr>
                      ) : planMetrics.map(m => (
                        <tr key={m.id} style={{ borderBottom:"1px solid #e8e6ff" }}>
                          <td style={{ padding:"10px 12px",fontWeight:600,color:"#1a1a2e" }}>
                            {m.metric_name}
                            {m.is_custom && <span style={{ marginLeft:6,fontSize:9,background:"rgba(108,99,255,0.10)",color:"#6c63ff",borderRadius:4,padding:"1px 5px",fontWeight:700 }}>Custom</span>}
                          </td>
                          <td style={{ padding:"10px 12px",fontSize:12,color:"#6b7280" }}>{m.metric_category || "—"}</td>
                          <td style={{ padding:"10px 12px",fontSize:12,color:"#6b7280" }}>{m.frequency || "—"}</td>
                          <td style={{ padding:"10px 12px" }}>
                            <span style={{ borderRadius:999,padding:"2px 9px",fontSize:10,fontWeight:700,border:"1px solid",
                              color:m.priority==="M"?"#dc2626":"#6b7280",
                              background:m.priority==="M"?"#fff1f2":"#f9fafb",
                              borderColor:m.priority==="M"?"#fca5a5":"#e5e7eb" }}>
                              {COMPLIANCE_LABEL[m.priority || ""] || m.priority || "—"}
                            </span>
                          </td>
                          <td style={{ padding:"10px 12px",textAlign:"right" }}>
                            {m.priority === "M" ? (
                              <span style={{ fontSize:11,color:"#9ca3af",fontWeight:600 }}>Locked</span>
                            ) : (
                              <button onClick={() => handleRemoveMetric(m.id)} style={{ fontSize:12,color:"#ef4444",fontWeight:700,background:"none",border:"none",cursor:"pointer" }}>Remove</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!showAddForm ? (
                  <button onClick={() => setShowAddForm(true)} style={{ borderRadius:10,padding:"9px 18px",fontSize:12,fontWeight:700,color:"#fff",background:"#6c63ff",border:"none",cursor:"pointer",boxShadow:"0 4px 14px rgba(108,99,255,0.30)" }}>
                    + Add Metric
                  </button>
                ) : (
                  <div style={{ borderRadius:14,border:"1.5px solid #e8e6ff",background:"#f8f7ff",padding:16 }}>
                    <div style={{ display:"flex",border:"1.5px solid #e8e6ff",background:"#fff",borderRadius:10,padding:4,gap:4,marginBottom:14 }}>
                      {(["catalog","custom"] as const).map(tab => (
                        <button key={tab} type="button" onClick={() => setAddTab(tab)} style={{ flex:1,padding:"7px 0",fontSize:12,fontWeight:700,borderRadius:8,border:"none",cursor:"pointer",
                          background:addTab===tab?(tab==="catalog"?"#6c63ff":"#9333ea"):"transparent",
                          color:addTab===tab?"#fff":"#6b7280",transition:"background 0.15s" }}>
                          {tab==="catalog" ? "From Catalog" : "Request Custom"}
                        </button>
                      ))}
                    </div>
                    <form onSubmit={handleAddMetric} style={{ display:"flex",flexDirection:"column",gap:12 }}>
                      {addTab === "catalog" ? (
                        <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                          <p style={{ fontSize:11,color:"#6b7280",margin:"0 0 8px" }}>Select from standard catalog — added immediately, no approval needed.</p>
                          <label style={{ fontSize:12,fontWeight:600,color:"#374151" }}>Catalog Metric *</label>
                          <select required value={addForm.catalog_metric_id} onChange={e => setAddForm(f => ({ ...f, catalog_metric_id: e.target.value }))}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                            <option value="">-- Select metric --</option>
                            {availableCatalog.map(c => <option key={c.id} value={c.id}>[{c.compliance || "O"}] {c.name} — {c.category}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                          <div style={{ borderRadius:10,border:"1.5px solid #fcd34d",background:"#fffbeb",padding:"10px 12px",fontSize:11,color:"#92400e",gridColumn:"1/-1" }}>
                            Custom metric requests require Delivery Excellence approval. You'll be notified once reviewed.
                          </div>
                          <div style={{ gridColumn:"1/-1",display:"flex",flexDirection:"column",gap:4 }}>
                            <label style={{ fontSize:12,fontWeight:600,color:"#374151" }}>Metric Name *</label>
                            <input type="text" required value={addForm.metric_name} onChange={e => setAddForm(f => ({ ...f, metric_name: e.target.value }))} placeholder="E.g. Sprint Velocity"
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                          </div>
                          <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                            <label style={{ fontSize:12,fontWeight:600,color:"#374151" }}>Category</label>
                            <select value={addForm.metric_category} onChange={e => setAddForm(f => ({ ...f, metric_category: e.target.value }))}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                              <option value="">Select…</option>
                              {METRIC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                            <label style={{ fontSize:12,fontWeight:600,color:"#374151" }}>UOM</label>
                            <input type="text" value={addForm.uom} onChange={e => setAddForm(f => ({ ...f, uom: e.target.value }))} placeholder="E.g. %"
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                          </div>
                          <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                            <label style={{ fontSize:12,fontWeight:600,color:"#374151" }}>Intent</label>
                            <select value={addForm.intent} onChange={e => setAddForm(f => ({ ...f, intent: e.target.value }))}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                              {["Higher the better","Lower the better","Nominal the best","Within Limits"].map(i => <option key={i} value={i}>{i}</option>)}
                            </select>
                          </div>
                          <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                            <label style={{ fontSize:12,fontWeight:600,color:"#374151" }}>Frequency</label>
                            <select value={addForm.frequency} onChange={e => setAddForm(f => ({ ...f, frequency: e.target.value }))}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                              {FREQUENCIES.map(fr => <option key={fr} value={fr}>{fr}</option>)}
                            </select>
                          </div>
                          <div style={{ gridColumn:"1/-1",display:"flex",flexDirection:"column",gap:4 }}>
                            <label style={{ fontSize:12,fontWeight:600,color:"#374151" }}>Why is this metric needed? *</label>
                            <textarea required value={addForm.justification} onChange={e => setAddForm(f => ({ ...f, justification: e.target.value }))}
                              rows={3} placeholder="Explain why this custom metric is needed..."
                              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                            <p style={{ fontSize:10,color:"#d97706" }}>Will be sent to Delivery Excellence for approval.</p>
                          </div>
                        </div>
                      )}
                      <div style={{ display:"flex",justifyContent:"flex-end",gap:10,paddingTop:4 }}>
                        <button type="button" onClick={() => setShowAddForm(false)} style={{ borderRadius:10,border:"1.5px solid #e8e6ff",padding:"8px 16px",fontSize:12,fontWeight:700,color:"#374151",background:"#fff",cursor:"pointer" }}>Cancel</button>
                        <button type="submit" disabled={addingMetric} style={{ borderRadius:10,padding:"8px 18px",fontSize:12,fontWeight:700,color:"#fff",border:"none",cursor:addingMetric?"not-allowed":"pointer",
                          background:addTab==="catalog"?"#6c63ff":"#9333ea",opacity:addingMetric?0.6:1 }}>
                          {addingMetric ? "Submitting..." : addTab === "catalog" ? "Add to Plan" : "Send to DE"}
                        </button>
                      </div>
                    </form>
                    {addTab === "custom" && myRequests.length > 0 && (
                      <div style={{ marginTop:14,paddingTop:14,borderTop:"1.5px solid #e8e6ff" }}>
                        <p style={{ fontSize:10,fontWeight:700,color:"#6c63ff",textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 10px" }}>My Pending Requests</p>
                        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                          {myRequests.map(r => (
                            <div key={r.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,borderRadius:10,border:"1.5px solid #e8e6ff",background:"#fff",padding:"8px 14px" }}>
                              <span style={{ fontWeight:600,color:"#1a1a2e" }}>{r.metric_name}</span>
                              <span style={{ borderRadius:999,padding:"2px 10px",fontSize:10,fontWeight:700,border:"1px solid",
                                color:r.status==="APPROVED"?"#16a34a":r.status==="REJECTED"?"#dc2626":"#d97706",
                                background:r.status==="APPROVED"?"#f0fdf4":r.status==="REJECTED"?"#fff1f2":"#fffbeb",
                                borderColor:r.status==="APPROVED"?"#86efac":r.status==="REJECTED"?"#fca5a5":"#fcd34d" }}>{r.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
