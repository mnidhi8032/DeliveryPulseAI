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
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-1/3 rounded bg-slate-200" />
      <div className="h-64 rounded-xl bg-slate-200" />
    </div>
  );

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  // Stat chip counts
  const total   = projects.length;
  const redCnt  = projects.filter(p => p.current_rag === "RED").length;
  const amberCnt= projects.filter(p => p.current_rag === "AMBER").length;
  const noScore = projects.filter(p => !p.current_rag).length;

  // RAG left-border colour per row
  const ragBorder: Record<string, string> = {
    GREEN: "border-l-emerald-500",
    AMBER: "border-l-amber-400",
    RED:   "border-l-rose-600",
  };

  return (
    <div className="space-y-5 text-slate-800">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Your projects</h1>
          <p className="text-sm text-slate-500 mt-0.5">Projects you're assigned to as project manager</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2.5 shadow-sm transition-colors cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create project
        </button>
      </div>

      {/* ── Stat chips ── */}
      {projects.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Total",    value: total,    dot: "bg-slate-400",   badge: "bg-slate-100 text-slate-700 border-slate-200" },
            { label: "Red",      value: redCnt,   dot: "bg-rose-500",    badge: "bg-rose-50 text-rose-700 border-rose-200" },
            { label: "Amber",    value: amberCnt, dot: "bg-amber-500",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
            { label: "No score", value: noScore,  dot: "bg-slate-300",   badge: "bg-slate-50 text-slate-500 border-slate-200" },
          ].map(s => (
            <div key={s.label} className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 ${s.badge}`}>
              <span className={`h-2 w-2 rounded-full shrink-0 ${s.dot}`} />
              <span className="text-sm font-bold">{s.value}</span>
              <span className="text-xs font-medium">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center bg-white">
          <p className="text-sm font-semibold text-slate-500">No projects yet</p>
          <button onClick={handleOpenCreate}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer">
            + Create Project
          </button>
        </div>
      ) : (
        /* ── Project table ── */
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="pl-5 pr-3 py-3 w-4" /> {/* coloured left border column */}
                <th className="px-3 py-3">Code</th>
                <th className="px-3 py-3">Project</th>
                <th className="px-3 py-3">Account</th>
                <th className="px-3 py-3">Business Unit</th>
                <th className="px-3 py-3">Health</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map(p => {
                const rag = p.current_rag;
                const lb = rag ? (ragBorder[rag] ?? "border-l-slate-200") : "border-l-slate-100";

                // Health badge styles
                const healthBadge = rag === "RED"
                  ? "bg-rose-100 text-rose-700 border border-rose-300"
                  : rag === "AMBER"
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : rag === "GREEN"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-slate-100 text-slate-500 border border-slate-200";

                const healthDot = rag === "RED"
                  ? "bg-rose-500"
                  : rag === "AMBER"
                  ? "bg-amber-500"
                  : rag === "GREEN"
                  ? "bg-emerald-500"
                  : "bg-slate-400";

                return (
                  <tr
                    key={p.id}
                    className={`border-l-4 ${lb} hover:bg-slate-50/60 transition-colors group`}
                  >
                    {/* spacer for the border visual alignment */}
                    <td className="pl-1 pr-3 py-3" />
                    <td className="px-3 py-3 font-mono text-[11px] font-bold text-slate-400 whitespace-nowrap">
                      {p.project_code}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-bold text-slate-900 text-sm leading-snug">{p.project_name}</p>
                      {p.project_manager_name && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{p.project_manager_name}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-500 text-xs whitespace-nowrap">{p.account_name}</td>
                    <td className="px-3 py-3 text-slate-500 text-xs">{p.business_unit_name}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${healthBadge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${healthDot}`} />
                        {rag ? (rag.charAt(0) + rag.slice(1).toLowerCase()) : "No score"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-block px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${getStatusBadgeClass(p.status)}`}>
                        {formatStatus(p.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                        <Link
                          to={`/pm/projects/${p.id}/qpm/entry`}
                          className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-colors whitespace-nowrap"
                        >
                          Data Entry
                        </Link>
                        <button
                          onClick={() => openMetricsPanel(p)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Metrics
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Project Modal with Engagement Model */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create New Project</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fill project details and engagement model. Mandatory metrics will be auto-selected on creation.
                </p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer text-lg leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Project Details */}
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Project Details</p>
                <div className="space-y-3">
                  {/* Business Unit - Display Only (Read-only) */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-700">Business Unit</label>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 font-medium">
                      {pmBusinessUnit ? pmBusinessUnit.name : "No Business Unit assigned"}
                    </div>
                    {!pmBusinessUnit && (
                      <p className="text-[10px] text-amber-600">You are not assigned to any Business Unit. Please contact an administrator.</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-700">Account / Client *</label>
                    <select required value={form.account_id}
                      onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}
                      disabled={accounts.length === 0}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-50">
                      <option value="">Select Account...</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    {accounts.length === 0 && (
                      <p className="text-[10px] text-amber-600">No accounts found in your Business Unit.</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-700">Project Code *</label>
                      <input type="text" required placeholder="E.g. PROJ-001" value={form.project_code}
                        onChange={e => setForm(f => ({ ...f, project_code: e.target.value }))}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-700">Project Name *</label>
                      <input type="text" required placeholder="E.g. Banking Portal" value={form.project_name}
                        onChange={e => setForm(f => ({ ...f, project_name: e.target.value }))}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-700">Start Date</label>
                      <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-700">Target End Date</label>
                      <input type="date" value={form.target_end_date} onChange={e => setForm(f => ({ ...f, target_end_date: e.target.value }))}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Engagement Model */}
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-3">
                <div>
                  <p className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Engagement Model *</p>
                  <p className="text-[10px] text-indigo-600 mt-0.5">
                    Mandatory metrics will be auto-selected based on these values.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-700">Project Type *</label>
                    <select required value={form.project_type} onChange={e => setForm(f => ({ ...f, project_type: e.target.value }))}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
                      <option value="">Select...</option>
                      {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-700">Delivery Model *</label>
                    <select required value={form.delivery_process_model} onChange={e => setForm(f => ({ ...f, delivery_process_model: e.target.value }))}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
                      <option value="">Select...</option>
                      {DELIVERY_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-700">Project Category</label>
                    <select value={form.project_category} onChange={e => setForm(f => ({ ...f, project_category: e.target.value }))}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
                      <option value="">Select...</option>
                      {PROJECT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-700">Work Size Unit</label>
                    <select value={form.work_size_unit} onChange={e => setForm(f => ({ ...f, work_size_unit: e.target.value }))}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
                      <option value="">Select...</option>
                      {WORK_SIZE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-1 border-t border-slate-100">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
                  {saving ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Metrics Panel */}
      {metricsPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Manage Metrics — {metricsPanel.projectName}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mandatory metrics are locked and cannot be removed from the plan.
                </p>
              </div>
              <button onClick={() => setMetricsPanel(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer text-lg leading-none">&times;</button>
            </div>

            {metricsLoading ? (
              <div className="py-10 text-center text-sm text-slate-400">Loading metrics…</div>
            ) : (
              <>
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 font-semibold uppercase tracking-wide">
                      <tr>
                        <th className="px-3 py-2 text-left">Metric</th>
                        <th className="px-3 py-2 text-left">Category</th>
                        <th className="px-3 py-2 text-left">Frequency</th>
                        <th className="px-3 py-2 text-left">Priority</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {planMetrics.length === 0 ? (
                        <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400 text-xs">No metrics yet.</td></tr>
                      ) : planMetrics.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-semibold text-slate-800">
                            {m.metric_name}
                            {m.is_custom && <span className="ml-1.5 text-[9px] bg-purple-50 text-purple-700 border border-purple-200 rounded px-1 font-bold">Custom</span>}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-500">{m.metric_category || "—"}</td>
                          <td className="px-3 py-2 text-xs text-slate-500">{m.frequency || "—"}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${m.priority === "M" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                              {COMPLIANCE_LABEL[m.priority || ""] || m.priority || "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            {m.priority === "M" ? (
                              <span className="text-[10px] text-slate-400 font-semibold">Locked</span>
                            ) : (
                              <button onClick={() => handleRemoveMetric(m.id)}
                                className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer">
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!showAddForm ? (
                  <button onClick={() => setShowAddForm(true)}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer">
                    + Add Metric
                  </button>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                    {/* Tabs: Catalog (direct) vs Custom (request approval) */}
                    <div className="flex border border-slate-200 bg-white p-1 rounded-lg gap-1 mb-1">
                      <button type="button" onClick={() => setAddTab("catalog")}
                        className={`flex-1 py-1.5 text-xs font-bold rounded transition ${addTab === "catalog" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"}`}>
                        From Catalog
                      </button>
                      <button type="button" onClick={() => setAddTab("custom")}
                        className={`flex-1 py-1.5 text-xs font-bold rounded transition ${addTab === "custom" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700"}`}>
                        Request Custom Metric
                      </button>
                    </div>

                    <form onSubmit={handleAddMetric} className="space-y-3">
                      {addTab === "catalog" ? (
                        <>
                          <p className="text-[10px] text-slate-500">Select a metric from the standard catalog. It will be added to your plan immediately — no approval needed.</p>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-700">Catalog Metric *</label>
                            <select required value={addForm.catalog_metric_id}
                              onChange={e => setAddForm(f => ({ ...f, catalog_metric_id: e.target.value }))}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
                              <option value="">-- Select metric --</option>
                              {availableCatalog.map(c => (
                                <option key={c.id} value={c.id}>
                                  [{c.compliance || "O"}] {c.name} — {c.category}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-800">
                            Custom metric requests require approval from Delivery Excellence before being added to your plan. You will be notified once reviewed.
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1 col-span-2">
                              <label className="text-xs font-semibold text-slate-700">Metric Name *</label>
                              <input type="text" required value={addForm.metric_name}
                                onChange={e => setAddForm(f => ({ ...f, metric_name: e.target.value }))}
                                placeholder="E.g. Sprint Velocity"
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-semibold text-slate-700">Category</label>
                              <select value={addForm.metric_category}
                                onChange={e => setAddForm(f => ({ ...f, metric_category: e.target.value }))}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
                                <option value="">Select…</option>
                                {METRIC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-semibold text-slate-700">UOM</label>
                              <input type="text" value={addForm.uom}
                                onChange={e => setAddForm(f => ({ ...f, uom: e.target.value }))}
                                placeholder="E.g. %"
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-semibold text-slate-700">Intent</label>
                              <select value={addForm.intent}
                                onChange={e => setAddForm(f => ({ ...f, intent: e.target.value }))}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
                                {["Higher the better","Lower the better","Nominal the best","Within Limits"].map(i => <option key={i} value={i}>{i}</option>)}
                              </select>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-semibold text-slate-700">Frequency</label>
                              <select value={addForm.frequency}
                                onChange={e => setAddForm(f => ({ ...f, frequency: e.target.value }))}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
                                {FREQUENCIES.map(fr => <option key={fr} value={fr}>{fr}</option>)}
                              </select>
                            </div>
                            <div className="flex flex-col gap-1 col-span-2">
                              <label className="text-xs font-semibold text-slate-700">Formula / Description</label>
                              <textarea value={addForm.formula}
                                onChange={e => setAddForm(f => ({ ...f, formula: e.target.value }))}
                                rows={2} placeholder="How is this metric calculated?"
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                            </div>
                            <div className="flex flex-col gap-1 col-span-2">
                              <label className="text-xs font-semibold text-slate-700">
                                Why do you need this metric? <span className="text-red-500">*</span>
                              </label>
                              <textarea required value={addForm.justification}
                                onChange={e => setAddForm(f => ({ ...f, justification: e.target.value }))}
                                rows={3} placeholder="Explain why this custom metric is needed for your project and why it's not in the standard catalog..."
                                className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400" />
                              <p className="text-[9px] text-amber-700">This reason will be sent to Delivery Excellence for approval.</p>
                            </div>
                          </div>
                        </>
                      )}

                      <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={() => setShowAddForm(false)}
                          className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
                          Cancel
                        </button>
                        <button type="submit" disabled={addingMetric}
                          className={`rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50 cursor-pointer ${addTab === "catalog" ? "bg-slate-900 hover:bg-slate-800" : "bg-indigo-600 hover:bg-indigo-700"}`}>
                          {addingMetric ? "Submitting..." : addTab === "catalog" ? "Add to Plan" : "Send Request to DE"}
                        </button>
                      </div>
                    </form>

                    {/* Pending requests status */}
                    {addTab === "custom" && myRequests.length > 0 && (
                      <div className="mt-3 border-t border-slate-200 pt-3">
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">My Pending Requests</p>
                        <div className="space-y-1.5">
                          {myRequests.map(r => (
                            <div key={r.id} className="flex items-center justify-between text-xs rounded-lg border border-slate-100 bg-white px-3 py-2">
                              <span className="font-semibold text-slate-700 truncate max-w-[200px]">{r.metric_name}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border shrink-0 ${
                                r.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                r.status === "REJECTED" ? "bg-rose-50 text-rose-700 border-rose-200" :
                                "bg-amber-50 text-amber-700 border-amber-200"
                              }`}>{r.status}</span>
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
