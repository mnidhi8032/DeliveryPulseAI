/**
 * Sheet 1 — KPI Plan
 * PM sets project engagement model, then selects metrics from the 83-metric catalog.
 * Mandatory metrics are auto-highlighted. Custom metrics can be added.
 */
import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { getProject } from "../../services/projectService";
import {
  getCatalog, getKpiPlan, updateKpiPlanConfig,
  addPlanMetric, removePlanMetric,
} from "../../services/qpmService";
import { submitMetricRequest, listMetricRequests } from "../../services/metricApprovalService";
import type { MetricApprovalRequest } from "../../services/metricApprovalService";
import type { Project } from "../../types/project";
import type { KpiPlan, KpiPlanMetric, QPMCatalogMetric } from "../../types/qpm";
import { FREQUENCIES } from "../../types/qpm";
import { useEngagementModelOptions } from "../../hooks/useEngagementModelOptions";

const COMPLIANCE_LABEL: Record<string, string> = {
  M: "Mandatory", O: "Optional", C: "Conditional", R: "Recommended",
};
const COMPLIANCE_COLOR: Record<string, string> = {
  M: "bg-rose-50 text-rose-700 border-rose-200",
  O: "bg-slate-100 text-slate-600 border-slate-200",
  C: "bg-amber-50 text-amber-700 border-amber-200",
  R: "bg-blue-50 text-blue-700 border-blue-200",
};

export function QPMPlanPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const toast = useToast();

  const { projectTypes, deliveryModels, projectCategories, workSizeUnits, dimensions } = useEngagementModelOptions();

  const [project, setProject] = useState<Project | null>(null);
  const [plan, setPlan] = useState<KpiPlan | null>(null);
  const [catalog, setCatalog] = useState<QPMCatalogMetric[]>([]);
  const [loading, setLoading] = useState(true);

  // Engagement model form
  const [engForm, setEngForm] = useState({
    project_type: "", delivery_process_model: "", project_category: "", work_size_unit: "",
  });
  const [savingEng, setSavingEng] = useState(false);

  // Catalog browser
  const [catFilter, setCatFilter] = useState("");
  const [catSearch, setCatSearch] = useState("");
  const [catTab, setCatTab] = useState<"catalog" | "selected" | "custom">("catalog");

  // Custom metric request tab state
  const [requestForm, setRequestForm] = useState({
    metric_name: "", metric_category: "", formula: "", uom: "",
    intent: "Higher the better", frequency: "Monthly",
    priority: "O", metrics_type: "Result",
    project_type: "", delivery_model: "",
    target: "", lsl: "", usl: "",
    measures_str: "",
    justification: "",
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [myRequests, setMyRequests] = useState<MetricApprovalRequest[]>([]);
  const [requestsLoaded, setRequestsLoaded] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([getProject(projectId), getCatalog()])
      .then(([proj, cat]) => {
        setProject(proj);
        setCatalog(cat);
        return getKpiPlan(projectId);
      })
      .then((p) => {
        setPlan(p);
        setEngForm({
          project_type: p.project_type || "",
          delivery_process_model: p.delivery_process_model || "",
          project_category: p.project_category || "",
          work_size_unit: p.work_size_unit || "",
        });
      })
      .catch(() => toast.error("Failed to load KPI Plan"))
      .finally(() => setLoading(false));
  }, [projectId]);

  const selectedIds = useMemo(() => new Set(plan?.metrics.map((m) => m.catalog_metric_id).filter(Boolean)), [plan]);

  const filteredCatalog = useMemo(() => {
    return catalog.filter((m) => {
      const matchCat = !catFilter || m.category === catFilter;
      const matchSearch = !catSearch ||
        m.name.toLowerCase().includes(catSearch.toLowerCase()) ||
        (m.formula || "").toLowerCase().includes(catSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [catalog, catFilter, catSearch]);

  const handleSaveEngagement = async () => {
    if (!plan) return;
    setSavingEng(true);
    try {
      const updated = await updateKpiPlanConfig(plan.id, engForm);

      // Fetch catalog filtered by the new engagement model
      const filtered = await getCatalog({
        project_type: engForm.project_type,
        delivery_model: engForm.delivery_process_model,
      });
      const newCatalog = filtered.length > 0 ? filtered : catalog;
      setCatalog(newCatalog);
      setPlan(updated);

      // Auto-remove catalog metrics that no longer match the new engagement model.
      // Custom metrics (is_custom=true) and metrics with no catalog_metric_id are never removed.
      // Finalized plans cannot have metrics removed (backend also enforces this).
      if (!updated.is_finalized && (engForm.project_type || engForm.delivery_process_model)) {
        const validCatalogIds = new Set(newCatalog.map((m) => m.id));
        const toRemove = (updated.metrics || []).filter(
          (pm) => !pm.is_custom && pm.catalog_metric_id && !validCatalogIds.has(pm.catalog_metric_id)
        );

        if (toRemove.length > 0) {
          let removed = 0;
          const removedNames: string[] = [];
          for (const pm of toRemove) {
            try {
              await removePlanMetric(pm.id);
              removed++;
              removedNames.push(pm.metric_name);
            } catch { /* ignore errors for individual removes */ }
          }
          // Update local plan state — remove deleted metrics
          setPlan((prev) =>
            prev
              ? {
                  ...prev,
                  metrics: prev.metrics.filter(
                    (m) => !toRemove.find((r) => r.id === m.id)
                  ),
                }
              : prev
          );
          toast.success(
            `Engagement model saved. Removed ${removed} metric${removed !== 1 ? "s" : ""} not applicable to the new model: ${removedNames.join(", ")}`
          );
        } else {
          toast.success("Engagement model saved");
        }
      } else {
        toast.success("Engagement model saved");
      }
    } catch {
      toast.error("Failed to save engagement model");
    } finally {
      setSavingEng(false);
    }
  };

  const handleAutoSuggestMandatory = async () => {
    if (!plan) return;
    const mandatory = filteredCatalog.filter((m) => m.compliance === "M" && !selectedIds.has(m.id));
    if (mandatory.length === 0) { toast.error("No new mandatory metrics to add"); return; }
    let added = 0;
    for (const m of mandatory) {
      try {
        const pm = await addPlanMetric(plan.id, { catalog_metric_id: m.id, metric_name: m.name, metric_category: m.category, formula: m.formula || "", uom: m.uom || "", intent: m.intent || "", frequency: m.frequency || "Monthly", priority: "O", target: m.default_target ?? undefined, lsl: m.default_lsl ?? undefined, usl: m.default_usl ?? undefined });
        setPlan((prev) => prev ? { ...prev, metrics: [...prev.metrics, pm] } : prev);
        added++;
      } catch { /* skip duplicates */ }
    }
    toast.success(`Added ${added} mandatory metrics`);
  };

  const handleAddFromCatalog = async (metric: QPMCatalogMetric) => {
    if (!plan) return;
    try {
      const updated_plan_metric = await addPlanMetric(plan.id, {
        catalog_metric_id: metric.id,
        metric_name: metric.name,
        metric_category: metric.category,
        formula: metric.formula || "",
        uom: metric.uom || "",
        intent: metric.intent || "",
        frequency: metric.frequency || "Monthly",
        priority: metric.compliance || "O",
        target: metric.default_target ?? undefined,
        lsl: metric.default_lsl ?? undefined,
        usl: metric.default_usl ?? undefined,
      });
      setPlan((prev) => prev ? { ...prev, metrics: [...prev.metrics, updated_plan_metric] } : prev);
      toast.success(`Added: ${metric.name}`);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to add metric");
    }
  };

  const handleRemove = async (pm: KpiPlanMetric) => {
    if (!window.confirm(`Remove "${pm.metric_name}" from plan?`)) return;
    try {
      await removePlanMetric(pm.id);
      setPlan((prev) => prev ? { ...prev, metrics: prev.metrics.filter((m) => m.id !== pm.id) } : prev);
      toast.success("Metric removed");
    } catch { toast.error("Failed to remove metric"); }
  };


  const handleSendToDE = async () => {
    if (!plan || !requestForm.metric_name || !requestForm.justification) return;
    setSubmittingRequest(true);
    const measuresArr = requestForm.measures_str.split(",").map(s => s.trim()).filter(Boolean);
    try {
      const req = await submitMetricRequest({
        kpi_plan_id: plan.id,
        metric_name: requestForm.metric_name,
        metric_category: requestForm.metric_category || undefined,
        formula: requestForm.formula || undefined,
        uom: requestForm.uom || undefined,
        intent: requestForm.intent,
        frequency: requestForm.frequency,
        priority: requestForm.priority || "O",
        metrics_type: requestForm.metrics_type || undefined,
        project_type: requestForm.project_type || undefined,
        delivery_model: requestForm.delivery_model || undefined,
        default_target: requestForm.target ? parseFloat(requestForm.target) : null,
        default_lsl: requestForm.lsl ? parseFloat(requestForm.lsl) : null,
        default_usl: requestForm.usl ? parseFloat(requestForm.usl) : null,
        measures: measuresArr.length > 0 ? measuresArr : undefined,
        justification: requestForm.justification,
      });
      setMyRequests(prev => [req, ...prev]);
      setRequestForm({ metric_name: "", metric_category: "", formula: "", uom: "", intent: "Higher the better", frequency: "Monthly", priority: "O", metrics_type: "Result", project_type: "", delivery_model: "", target: "", lsl: "", usl: "", measures_str: "", justification: "" });
      toast.success(`Request sent to Delivery Excellence for "${req.metric_name}"`);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to send request");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleFinalize = async () => {
    if (!plan) return;
    if (!window.confirm(plan.is_finalized ? "Unfinalize this KPI Plan?" : "Finalize this KPI Plan? You won't be able to add/remove metrics until you unfinalize.")) return;
    try {
      const updated = await updateKpiPlanConfig(plan.id, { is_finalized: !plan.is_finalized });
      setPlan(updated);
      toast.success(updated.is_finalized ? "KPI Plan finalized" : "KPI Plan unfinalized");
    } catch { toast.error("Failed to update plan status"); }
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-1/3 rounded bg-slate-200" />
      <div className="h-32 rounded-xl bg-slate-200" />
      <div className="h-64 rounded-xl bg-slate-200" />
    </div>
  );

  return (
    <div className="space-y-6 text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/pm/projects" className="text-xs text-slate-500 hover:text-slate-800">← Back to My Projects</Link>
          <h1 className="mt-1 text-xl font-bold text-slate-900">KPI Plan — {project?.project_name}</h1>
          <p className="text-xs text-slate-500">{project?.project_code} · Select metrics from the QPM catalog</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-bold border ${plan?.is_finalized ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
            {plan?.is_finalized ? "✓ Finalized" : "Draft"}
          </span>
          <span className="text-xs text-slate-500">{plan?.metrics.length || 0} metrics selected</span>
          <button onClick={handleFinalize}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition cursor-pointer ${plan?.is_finalized ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200" : "bg-slate-900 text-white hover:bg-slate-800"}`}>
            {plan?.is_finalized ? "Unfinalize" : "Finalize Plan"}
          </button>
        </div>
      </div>

      {/* Sheet navigation */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Sheet 1: KPI Plan", to: `/pm/projects/${projectId}/qpm`, active: true },
          { label: "Sheet 2: Data Entry", to: `/pm/projects/${projectId}/qpm/entry` },
          { label: "Sheet 3: KPI Tracker", to: `/pm/projects/${projectId}/qpm/tracker` },
          { label: "Sheet 4: Summary", to: `/pm/projects/${projectId}/qpm/summary` },
          { label: "Sheet 5: Doc Info", to: `/pm/projects/${projectId}/qpm/doc-info` },
        ].map((s) => (
          <Link key={s.label} to={s.to}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold border transition cursor-pointer ${s.active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
            {s.label}
          </Link>
        ))}
      </div>

      {/* Engagement Model (Sheet 1 header) */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Engagement Model</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Project Type", key: "project_type", options: projectTypes },
            { label: "Delivery Process Model", key: "delivery_process_model", options: deliveryModels },
            { label: "Project Category", key: "project_category", options: projectCategories },
            { label: "Work Size Unit", key: "work_size_unit", options: workSizeUnits },
          ].map(({ label, key, options }) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</label>
              <select disabled={!!plan?.is_finalized}
                value={(engForm as any)[key]}
                onChange={(e) => setEngForm((p) => ({ ...p, [key]: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-50">
                <option value="">Select…</option>
                {options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        {!plan?.is_finalized && (
          <button onClick={handleSaveEngagement} disabled={savingEng}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer">
            {savingEng ? "Saving…" : "Save Engagement Model"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border border-slate-200 bg-slate-50 p-1.5 rounded-lg gap-2 shadow-sm">
        {[
          { id: "catalog", label: `Metric Catalog (${catalog.length})` },
          { id: "selected", label: `Selected Metrics (${plan?.metrics.length || 0})` },
          { id: "custom", label: "Request Custom Metric" },
        ].map((t) => (
          <button key={t.id} onClick={() => setCatTab(t.id as any)}
            className={`flex-1 rounded-md py-2 text-xs font-bold transition-all ${catTab === t.id ? "bg-white text-slate-900 shadow border border-slate-200" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Catalog Tab */}
      {catTab === "catalog" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 p-4 border-b border-slate-100">
            <input type="text" placeholder="Search metrics…" value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs w-56 focus:outline-none focus:ring-1 focus:ring-slate-400" />
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400">
              <option value="">All Categories</option>
              {dimensions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="text-xs text-slate-400 self-center">{filteredCatalog.length} metrics</span>
            <button onClick={handleAutoSuggestMandatory} disabled={!!plan?.is_finalized}
              className="ml-auto rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 cursor-pointer">
              ★ Auto-add Preset Metrics for this Engagement
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 font-semibold uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Metric Name</th>
                  <th className="px-4 py-3 text-left">Formula</th>
                  <th className="px-4 py-3 text-left">UOM</th>
                  <th className="px-4 py-3 text-left">Intent</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Compliance</th>
                  <th className="px-4 py-3 text-left">Target</th>
                  <th className="px-4 py-3 text-left">LSL</th>
                  <th className="px-4 py-3 text-left">USL</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCatalog.map((m) => {
                  const isSelected = selectedIds.has(m.id);
                  return (
                    <tr key={m.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? "bg-emerald-50/30" : ""}`}>
                      <td className="px-4 py-3">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600 border border-slate-200 whitespace-nowrap">{m.category}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 max-w-[180px]">
                        <div className="truncate" title={m.name}>{m.name}</div>
                        {m.org_goal && <div className="text-[10px] text-slate-400 truncate">{m.org_goal}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px]">
                        <div className="line-clamp-2" title={m.formula || ""}>{m.formula || "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{m.uom || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{m.intent || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{m.metrics_type || "—"}</td>
                      <td className="px-4 py-3">
                        {m.compliance ? (
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${COMPLIANCE_COLOR[m.compliance] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                            {COMPLIANCE_LABEL[m.compliance] || m.compliance}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">{m.default_target ?? "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono">{m.default_lsl ?? "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono">{m.default_usl ?? "—"}</td>
                      <td className="px-4 py-3">
                        {isSelected ? (
                          <span className="text-emerald-600 text-xs font-bold">✓ Added</span>
                        ) : (
                          <button onClick={() => handleAddFromCatalog(m)} disabled={!!plan?.is_finalized}
                            className="rounded px-2.5 py-1 text-xs font-bold bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-40 cursor-pointer whitespace-nowrap">
                            + Add
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Metrics Tab */}
      {catTab === "selected" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {plan?.metrics.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="text-sm">No metrics selected yet.</p>
              <button onClick={() => setCatTab("catalog")} className="mt-3 text-xs text-indigo-600 hover:underline">Browse catalog →</button>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 font-semibold uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Metric Name</th>
                  <th className="px-4 py-3 text-left">UOM</th>
                  <th className="px-4 py-3 text-left">Intent</th>
                  <th className="px-4 py-3 text-left">Frequency</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Target</th>
                  <th className="px-4 py-3 text-left">LSL</th>
                  <th className="px-4 py-3 text-left">USL</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plan?.metrics.map((pm) => (
                  <tr key={pm.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600 border border-slate-200">{pm.metric_category || "—"}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 max-w-[180px]">
                      <div className="truncate">{pm.metric_name}</div>
                      {pm.is_custom && <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200 rounded px-1 font-bold">Custom</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">{pm.uom || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{pm.intent || "—"}</td>
                    <td className="px-4 py-3 text-xs">{pm.frequency || (
                      <span className="text-amber-600 font-semibold text-[10px] bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                        ⚠ Not set
                      </span>
                    )}</td>
                    <td className="px-4 py-3">
                      {pm.priority ? (
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${COMPLIANCE_COLOR[pm.priority] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {COMPLIANCE_LABEL[pm.priority] || pm.priority}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono">{pm.target ?? "—"}</td>
                    <td className="px-4 py-3 text-xs font-mono">{pm.lsl ?? "—"}</td>
                    <td className="px-4 py-3 text-xs font-mono">{pm.usl ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{pm.is_custom ? "Custom" : "Catalog"}</td>
                    <td className="px-4 py-3">
                      {!plan?.is_finalized && (
                        <button onClick={() => handleRemove(pm)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer">Remove</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Request Custom Metric Tab */}
      {catTab === "custom" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

          {/* Info banner */}
          <div className="flex items-start gap-3 px-6 py-4 bg-amber-50 border-b border-amber-200">
            <svg className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-amber-800">
              Custom metric requests require <strong>Delivery Excellence</strong> approval. Once approved, the metric is added to your KPI plan and the global catalog. You'll be notified when reviewed.
            </p>
          </div>

          {/* Sub-tabs: Request form / My requests */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button type="button"
              onClick={() => setRequestsLoaded(false)}
              className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${!requestsLoaded ? "border-indigo-500 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              Request New Metric
            </button>
            <button type="button"
              onClick={() => { setRequestsLoaded(true); if (myRequests.length === 0) listMetricRequests().then(rs => { setMyRequests(rs.filter(r => r.kpi_plan_id === plan?.id)); }).catch(() => {}); }}
              className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${requestsLoaded ? "border-indigo-500 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              My Requests ({myRequests.length})
            </button>
          </div>

          {/* ── Request form ── */}
          {!requestsLoaded && (
            <div className="p-6 space-y-4">
              {/* Row 1: Category + Metric Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Category <span className="text-rose-500">*</span></label>
                  <select value={requestForm.metric_category}
                    onChange={e => setRequestForm(p => ({ ...p, metric_category: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
                    <option value="">Select…</option>
                    {dimensions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Metric Name <span className="text-rose-500">*</span></label>
                  <input type="text" placeholder="E.g. Effort Variance"
                    value={requestForm.metric_name}
                    onChange={e => setRequestForm(p => ({ ...p, metric_name: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                </div>
              </div>

              {/* Row 2: UOM + Intent */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">UOM</label>
                  <input type="text" placeholder="E.g. %" value={requestForm.uom}
                    onChange={e => setRequestForm(p => ({ ...p, uom: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Intent</label>
                  <select value={requestForm.intent}
                    onChange={e => setRequestForm(p => ({ ...p, intent: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
                    {["Higher the better","Lower the better","Nominal the best","Within Limits","Not Applicable"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 3: Compliance + Frequency */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Compliance</label>
                  <select value={requestForm.priority}
                    onChange={e => setRequestForm(p => ({ ...p, priority: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
                    <option value="O">Optional</option>
                    <option value="M">Mandatory</option>
                    <option value="C">Conditional</option>
                    <option value="R">Recommended</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Frequency</label>
                  <select value={requestForm.frequency}
                    onChange={e => setRequestForm(p => ({ ...p, frequency: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
                    {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 4: Default Target + Default LSL */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Default Target</label>
                  <input type="number" step="any" placeholder=""
                    value={requestForm.target}
                    onChange={e => setRequestForm(p => ({ ...p, target: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Default LSL</label>
                  <input type="number" step="any" placeholder=""
                    value={requestForm.lsl}
                    onChange={e => setRequestForm(p => ({ ...p, lsl: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                </div>
              </div>

              {/* Row 5: Default USL + Metrics Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Default USL</label>
                  <input type="number" step="any" placeholder=""
                    value={requestForm.usl}
                    onChange={e => setRequestForm(p => ({ ...p, usl: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Metrics Type</label>
                  <select value={requestForm.metrics_type}
                    onChange={e => setRequestForm(p => ({ ...p, metrics_type: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
                    {["Result","Enabler","Insight"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Formula */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Formula</label>
                <textarea value={requestForm.formula} rows={2}
                  onChange={e => setRequestForm(p => ({ ...p, formula: e.target.value }))}
                  placeholder="E.g. (Actual / Planned) * 100"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none" />
              </div>

              {/* Applicable Project Types */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Applicable Project Types <span className="font-normal text-slate-400">(comma-separated)</span></label>
                <input type="text" value={requestForm.project_type}
                  onChange={e => setRequestForm(p => ({ ...p, project_type: e.target.value }))}
                  placeholder="E.g. Fresh Development,Testing,Migration"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              </div>

              {/* Applicable Delivery Models */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Applicable Delivery Models <span className="font-normal text-slate-400">(comma-separated)</span></label>
                <input type="text" value={requestForm.delivery_model}
                  onChange={e => setRequestForm(p => ({ ...p, delivery_model: e.target.value }))}
                  placeholder="E.g. Agile-Scrum,Waterfall,Iterative"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              </div>

              {/* Measure Parameters */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">
                  Measure Parameters <span className="font-normal text-slate-400">(comma-separated, in formula order)</span>
                </label>
                <input type="text" value={requestForm.measures_str}
                  onChange={e => setRequestForm(p => ({ ...p, measures_str: e.target.value }))}
                  placeholder="E.g. Total Size, Effort spent in Person-days"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                <p className="text-[11px] text-slate-400">These become the labeled input fields on Sheet 2 and are used by the calculation engine.</p>
              </div>

              {/* Justification — amber, matches screenshot */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Why is this metric needed? <span className="text-rose-500">*</span></label>
                <textarea value={requestForm.justification} rows={4}
                  onChange={e => setRequestForm(p => ({ ...p, justification: e.target.value }))}
                  placeholder="Explain why this custom metric is needed…"
                  className="rounded-lg border border-amber-300 bg-amber-50/40 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none" />
                <p className="text-[11px] text-amber-600">Will be sent to Delivery Excellence for approval.</p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setCatTab("catalog")}
                  className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                  Cancel
                </button>
                <button type="button"
                  onClick={handleSendToDE}
                  disabled={submittingRequest || !requestForm.metric_name || !requestForm.justification || !!plan?.is_finalized}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-6 py-2 text-xs font-bold text-white disabled:opacity-50 cursor-pointer shadow-sm">
                  {submittingRequest ? "Sending…" : "Send to DE"}
                </button>
              </div>
            </div>
          )}

          {/* ── My Requests list ── */}
          {requestsLoaded && (
            <div className="divide-y divide-slate-100">
              {myRequests.length === 0 ? (
                <div className="px-6 py-10 text-center text-slate-400 text-sm">No requests yet.</div>
              ) : myRequests.map(r => (
                <div key={r.id} className="px-6 py-4 flex flex-wrap items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800">{r.metric_name}</p>
                      {r.metric_category && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 rounded px-1.5 py-0.5 font-semibold">{r.metric_category}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.justification}</p>
                    {r.review_comments && (
                      <p className="text-xs text-slate-500 mt-1 italic border-l-2 border-slate-300 pl-2">"{r.review_comments}"</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                      r.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      r.status === "REJECTED" ? "bg-rose-50 text-rose-700 border-rose-200" :
                      "bg-amber-50 text-amber-700 border-amber-200"}`}>
                      {r.status}
                    </span>
                    <span className="text-[10px] text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              <div className="px-6 py-3 bg-slate-50">
                <button type="button" onClick={() => setRequestsLoaded(false)}
                  className="text-xs text-indigo-600 hover:underline cursor-pointer">
                  ← Request a new metric
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

