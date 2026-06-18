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
import type { Project } from "../../types/project";
import type { KpiPlan, KpiPlanMetric, QPMCatalogMetric } from "../../types/qpm";
import {
  PROJECT_TYPES, DELIVERY_MODELS, PROJECT_CATEGORIES,
  WORK_SIZE_UNITS, FREQUENCIES, METRIC_CATEGORIES,
} from "../../types/qpm";

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

  // Custom metric form
  const [customForm, setCustomForm] = useState({
    metric_name: "", metric_category: "", formula: "", uom: "",
    intent: "Higher the better", frequency: "Monthly", priority: "O",
    target: "", lsl: "", usl: "", tailoring_reason: "", data_source: "",
  });

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
        const pm = await addPlanMetric(plan.id, { catalog_metric_id: m.id, metric_name: m.name, metric_category: m.category, formula: m.formula || "", uom: m.uom || "", intent: m.intent || "", frequency: m.frequency || "Monthly", priority: m.compliance || "M", target: m.default_target ?? undefined, lsl: m.default_lsl ?? undefined, usl: m.default_usl ?? undefined });
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

  const handleAddCustom = async () => {
    if (!plan || !customForm.metric_name) return;
    try {
      const pm = await addPlanMetric(plan.id, {
        metric_name: customForm.metric_name,
        metric_category: customForm.metric_category,
        formula: customForm.formula,
        uom: customForm.uom,
        intent: customForm.intent,
        frequency: customForm.frequency,
        priority: customForm.priority,
        target: customForm.target ? parseFloat(customForm.target) : undefined,
        lsl: customForm.lsl ? parseFloat(customForm.lsl) : undefined,
        usl: customForm.usl ? parseFloat(customForm.usl) : undefined,
        is_custom: true,
        tailoring_reason: customForm.tailoring_reason,
        data_source: customForm.data_source,
      });
      setPlan((prev) => prev ? { ...prev, metrics: [...prev.metrics, pm] } : prev);
      setCustomForm({ metric_name: "", metric_category: "", formula: "", uom: "", intent: "Higher the better", frequency: "Monthly", priority: "O", target: "", lsl: "", usl: "", tailoring_reason: "", data_source: "" });
      setCatTab("selected");
      toast.success("Custom metric added");
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to add custom metric");
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
          <Link to={`/pm/projects/${projectId}`} className="text-xs text-slate-500 hover:text-slate-800">← Back to project</Link>
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
            { label: "Project Type", key: "project_type", options: PROJECT_TYPES },
            { label: "Delivery Process Model", key: "delivery_process_model", options: DELIVERY_MODELS },
            { label: "Project Category", key: "project_category", options: PROJECT_CATEGORIES },
            { label: "Work Size Unit", key: "work_size_unit", options: WORK_SIZE_UNITS },
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
          { id: "custom", label: "Add Custom Metric" },
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
              {METRIC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="text-xs text-slate-400 self-center">{filteredCatalog.length} metrics</span>
            <button onClick={handleAutoSuggestMandatory} disabled={!!plan?.is_finalized}
              className="ml-auto rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-40 cursor-pointer">
              ★ Auto-add All Mandatory (M) Metrics
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

      {/* Custom Metric Tab */}
      {catTab === "custom" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Add Custom / Tailored Metric</h2>
          <p className="text-xs text-slate-500">Use this for client-mandated metrics, formula changes, or metrics not in the standard catalog.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Metric Name *", key: "metric_name", type: "text", placeholder: "E.g. Sprint Velocity" },
              { label: "Category", key: "metric_category", type: "select", options: METRIC_CATEGORIES },
              { label: "UOM", key: "uom", type: "text", placeholder: "E.g. %" },
              { label: "Intent", key: "intent", type: "select", options: ["Higher the better","Lower the better","Nominal the best","Within Limits","Not Applicable"] },
              { label: "Frequency", key: "frequency", type: "select", options: FREQUENCIES },
              { label: "Priority", key: "priority", type: "select", options: [["M","Mandatory"],["O","Optional"],["C","Conditional"],["R","Recommended"]] },
              { label: "Target", key: "target", type: "number", placeholder: "E.g. 95" },
              { label: "LSL (Lower Spec Limit)", key: "lsl", type: "number", placeholder: "E.g. 80" },
              { label: "USL (Upper Spec Limit)", key: "usl", type: "number", placeholder: "E.g. 110" },
              { label: "Data Source", key: "data_source", type: "text", placeholder: "E.g. JIRA, Time Tracking System" },
            ].map(({ label, key, type, placeholder, options }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">{label}</label>
                {type === "select" ? (
                  <select value={(customForm as any)[key]} onChange={(e) => setCustomForm((p) => ({ ...p, [key]: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400">
                    <option value="">Select…</option>
                    {(options as any[]).map((o) => Array.isArray(o)
                      ? <option key={o[0]} value={o[0]}>{o[1]}</option>
                      : <option key={o} value={o}>{o}</option>
                    )}
                  </select>
                ) : (
                  <input type={type} placeholder={placeholder} value={(customForm as any)[key]}
                    onChange={(e) => setCustomForm((p) => ({ ...p, [key]: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400" />
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700">Formula / Operational Definition</label>
            <textarea value={customForm.formula} onChange={(e) => setCustomForm((p) => ({ ...p, formula: e.target.value }))}
              placeholder="Describe how the metric is calculated…"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 h-20" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700">Reason for Tailoring</label>
            <input type="text" value={customForm.tailoring_reason}
              onChange={(e) => setCustomForm((p) => ({ ...p, tailoring_reason: e.target.value }))}
              placeholder="E.g. Client Mandate, Formula change…"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400" />
          </div>
          <button onClick={handleAddCustom} disabled={!customForm.metric_name || !!plan?.is_finalized}
            className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer">
            Add Custom Metric to Plan
          </button>
        </div>
      )}
    </div>
  );
}
