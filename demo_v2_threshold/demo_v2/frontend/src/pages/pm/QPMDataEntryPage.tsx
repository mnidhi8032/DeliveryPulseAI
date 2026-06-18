/**
 * Sheet 2 -- KPI Measures Data Entry
 * Redesigned: metrics grouped by category/dimension as accordion.
 * Click a category to expand, click a metric to open its entry form.
 */
import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { getProject } from "../../services/projectService";
import {
  getKpiPlan, addMeasureEntry, getMeasureEntries, computeKpi, getMetricMeasures,
  submitQpmPlan, reopenQpmPlan, getLatestMeasurement,
} from "../../services/qpmService";
import type { Project } from "../../types/project";
import type { KpiPlan, KpiPlanMetric, KpiMeasureEntry, KpiMeasurement } from "../../types/qpm";
import { RAG_STYLE } from "../../types/qpm";

// RAG dot colours
const RAG_DOT: Record<string, string> = {
  GREEN: "bg-emerald-500",
  AMBER: "bg-amber-500",
  RED:   "bg-rose-500",
};

export function QPMDataEntryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const toast = useToast();

  const [project, setProject]               = useState<Project | null>(null);
  const [plan, setPlan]                     = useState<KpiPlan | null>(null);
  const [loading, setLoading]               = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<KpiPlanMetric | null>(null);
  const [expandedCat, setExpandedCat]       = useState<string | null>(null);
  const [requiredMeasures, setRequiredMeasures] = useState<string[]>([]);
  const [pastEntries, setPastEntries]       = useState<KpiMeasureEntry[]>([]);
  const [computed, setComputed]             = useState<KpiMeasurement | null>(null);
  const [submitting, setSubmitting]         = useState(false);

  // QPM plan submit/reopen
  const [pmRag, setPmRag]                   = useState("");
  const [pmRagComment, setPmRagComment]     = useState("");
  const [submittingPlan, setSubmittingPlan] = useState(false);
  const [reopening, setReopening]           = useState(false);

  // Period-level threshold overrides
  const [showThresholdOverride, setShowThresholdOverride] = useState(false);
  const [thresholdOverride, setThresholdOverride] = useState({
    override_target: "", override_lsl: "", override_usl: "",
  });

  // Period form
  const [period, setPeriod] = useState({
    frequency: "Monthly", frequency_name: "", from_date: "", to_date: "",
  });
  const [measureValues, setMeasureValues] = useState<Record<string, string>>({});

  // Track latest RAG per metric id for left panel dots
  const [metricRags, setMetricRags] = useState<Record<string, string | null>>({});

  // Modification reason — required when PM re-enters an existing period
  const [modificationReason, setModificationReason] = useState("");

  // Detect if the current period name already exists in past entries (case-insensitive)
  const isModifyingExistingPeriod = period.frequency_name.trim().length > 0 &&
    pastEntries.some(e =>
      (e.frequency_name || "").toLowerCase() === period.frequency_name.trim().toLowerCase()
    );

  const loadMetricData = useCallback(async (pm: KpiPlanMetric) => {
    setSelectedMetric(pm);
    setComputed(null);
    setMeasureValues({});
    setShowThresholdOverride(false);
    setModificationReason("");
    setPeriod(prev => ({
      ...prev,
      frequency: pm.frequency || "Monthly",
      frequency_name: "",
      from_date: "",
      to_date: "",
    }));

    // Pre-fill threshold overrides:
    // 1st priority: latest measurement's saved thresholds (previously overridden)
    // 2nd priority: plan metric defaults (from catalog)
    // 3rd fallback: 0 (never show --)
    try {
      const latest = await getLatestMeasurement(pm.id);
      if (latest && (latest.target != null || latest.lsl != null || latest.usl != null)) {
        setThresholdOverride({
          override_target: latest.target != null ? String(latest.target) : String(pm.target ?? 0),
          override_lsl:    latest.lsl    != null ? String(latest.lsl)    : String(pm.lsl    ?? 0),
          override_usl:    latest.usl    != null ? String(latest.usl)    : String(pm.usl    ?? 0),
        });
        setShowThresholdOverride(true);
      } else {
        // No prior measurement — use plan defaults, show 0 for nulls
        setThresholdOverride({
          override_target: String(pm.target ?? 0),
          override_lsl:    String(pm.lsl    ?? 0),
          override_usl:    String(pm.usl    ?? 0),
        });
        // Only auto-open if there are non-zero defaults
        setShowThresholdOverride(!!(pm.target || pm.lsl || pm.usl));
      }
    } catch {
      setThresholdOverride({
        override_target: String(pm.target ?? 0),
        override_lsl:    String(pm.lsl    ?? 0),
        override_usl:    String(pm.usl    ?? 0),
      });
      setShowThresholdOverride(false);
    }

    try {
      const measures = await getMetricMeasures(pm.metric_name);
      const list = measures.length > 0 ? measures : [pm.metric_name];
      setRequiredMeasures(list);
      const init: Record<string, string> = {};
      list.forEach(m => { init[m] = ""; });
      setMeasureValues(init);
    } catch {
      setRequiredMeasures([pm.metric_name]);
      setMeasureValues({ [pm.metric_name]: "" });
    }
    try {
      const entries = await getMeasureEntries(pm.id);
      setPastEntries(entries);
    } catch {
      setPastEntries([]);
    }
  }, []);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([getProject(projectId), getKpiPlan(projectId)])
      .then(([proj, p]) => {
        setProject(proj);
        setPlan(p);
        // Auto-expand first category
        const active = p.metrics.filter(m => m.is_active);
        if (active.length > 0) {
          const firstCat = active[0].metric_category || "Uncategorized";
          setExpandedCat(firstCat);
        }
      })
      .catch(() => toast.error("Failed to load data"))
      .finally(() => setLoading(false));
  }, [projectId]);

  // Build category groups
  const categoryGroups = (() => {
    const map: Record<string, KpiPlanMetric[]> = {};
    (plan?.metrics || []).filter(m => m.is_active).forEach(m => {
      const cat = m.metric_category || "Uncategorized";
      if (!map[cat]) map[cat] = [];
      map[cat].push(m);
    });
    return map;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMetric || !period.frequency_name) return;
    const missing = requiredMeasures.filter(m => !measureValues[m]);
    if (missing.length > 0) {
      toast.error(`Please enter values for: ${missing.join(", ")}`);
      return;
    }
    setSubmitting(true);
    try {
      for (const measureName of requiredMeasures) {
        try {
          await addMeasureEntry({
            plan_metric_id: selectedMetric.id,
            measure_name: measureName,
            actual_value: parseFloat(measureValues[measureName]),
            uom: selectedMetric.uom || undefined,
            frequency: period.frequency,
            frequency_name: period.frequency_name,
            from_date: period.from_date || undefined,
            to_date: period.to_date || undefined,
          });
        } catch (e: any) {
          const detail = e.response?.data?.detail;
          const msg = typeof detail === "string" ? detail : JSON.stringify(detail ?? e.message);
          throw new Error(`Failed to save "${measureName}": ${msg}`);
        }
      }
      let result;
      try {
        result = await computeKpi(selectedMetric.id, {
          frequency_name: period.frequency_name,
          from_date: period.from_date || undefined,
          to_date: period.to_date || undefined,
          override_target: thresholdOverride.override_target ? parseFloat(thresholdOverride.override_target) : null,
          override_lsl:    thresholdOverride.override_lsl    ? parseFloat(thresholdOverride.override_lsl)    : null,
          override_usl:    thresholdOverride.override_usl    ? parseFloat(thresholdOverride.override_usl)    : null,
          analysis_comments: modificationReason.trim() || null,
        });
      } catch (e: any) {
        const detail = e.response?.data?.detail;
        const msg = typeof detail === "string" ? detail : JSON.stringify(detail ?? e.message);
        throw new Error(`KPI computation failed: ${msg}`);
      }
      setComputed(result);
      // Update left-panel RAG dot
      if (result.rag_status) {
        setMetricRags(prev => ({ ...prev, [selectedMetric.id]: result.rag_status }));
      }
      const action = isModifyingExistingPeriod ? "Updated" : "Submitted";
      toast.success(`${action} — KPI: ${Number(result.actual_value).toFixed(2)} | RAG: ${result.rag_status || "No RAG"}`);
      const entries = await getMeasureEntries(selectedMetric.id);
      setPastEntries(entries);
      const init: Record<string, string> = {};
      requiredMeasures.forEach(m => { init[m] = ""; });
      setMeasureValues(init);
      setModificationReason("");
      setPeriod(p => ({ ...p, frequency_name: "" }));
    } catch (e: any) {
      const msg = e.message || e.response?.data?.detail || "Failed to save measurement";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  // Group past entries by period (case-insensitive) — keep only the latest entry per measure per period
  const historyByPeriod: Record<string, KpiMeasureEntry[]> = {};
  for (const e of pastEntries) {
    // Normalize key to lowercase for grouping, but preserve original casing from first seen
    const rawKey = e.frequency_name || "--";
    // Find if we already have this period under a different case
    const existingKey = Object.keys(historyByPeriod).find(
      k => k.toLowerCase() === rawKey.toLowerCase()
    );
    const key = existingKey || rawKey;
    if (!historyByPeriod[key]) historyByPeriod[key] = [];
    // For each measure within a period, keep only the most recent (latest updated_at)
    const idx = historyByPeriod[key].findIndex(x => x.measure_name === e.measure_name);
    if (idx === -1) {
      historyByPeriod[key].push(e);
    } else {
      // Replace if this entry is more recent
      if (new Date(e.updated_at) > new Date(historyByPeriod[key][idx].updated_at)) {
        historyByPeriod[key][idx] = e;
      }
    }
  }

  const handleSubmitPlan = async () => {
    if (!plan) return;
    if (!window.confirm("Submit KPI Plan? It will be approved automatically.")) return;
    setSubmittingPlan(true);
    try {
      const updated = await submitQpmPlan(plan.id, pmRag || undefined, pmRagComment || undefined);
      setPlan(updated);
      toast.success("KPI Plan submitted and approved.");
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to submit plan.");
    } finally {
      setSubmittingPlan(false);
    }
  };

  const handleReopen = async () => {
    if (!plan) return;
    if (!window.confirm("Reopen this plan for revision? Status goes back to Draft.")) return;
    setReopening(true);
    try {
      const updated = await reopenQpmPlan(plan.id);
      setPlan(updated);
      toast.success("Plan reopened. You can now update data and re-submit.");
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to reopen plan.");
    } finally {
      setReopening(false);
    }
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-1/3 rounded bg-slate-200" />
      <div className="h-96 rounded-xl bg-slate-200" />
    </div>
  );

  const totalMetrics  = Object.values(categoryGroups).flat().length;
  const filledMetrics = Object.keys(metricRags).length;

  return (
    <div className="space-y-5 text-slate-800">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to={`/pm/projects/${projectId}/qpm`} className="text-xs text-slate-500 hover:text-slate-800">Back to KPI Plan</Link>
          <h1 className="mt-0.5 text-xl font-bold text-slate-900">KPI Data Entry</h1>
          <p className="text-xs text-slate-500">{project?.project_name} -- Select a dimension, then fill each metric</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {plan && (
            <span className={`rounded-full px-3 py-1 text-xs font-bold border ${
              plan.qpm_status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
              plan.qpm_status === "REJECTED" ? "bg-rose-50 text-rose-700 border-rose-200" :
              "bg-slate-100 text-slate-600 border-slate-200"
            }`}>
              {plan.qpm_status === "DRAFT" ? "Draft" :
               plan.qpm_status === "APPROVED" ? "Approved" :
               plan.qpm_status === "REJECTED" ? "Rejected" : plan.qpm_status}
            </span>
          )}
          {totalMetrics > 0 && (
            <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-3 py-1 border border-slate-200">
              {filledMetrics}/{totalMetrics} computed
            </span>
          )}
          <Link to={`/pm/projects/${projectId}/qpm/tracker`}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
            Tracker
          </Link>
          <Link to={`/pm/projects/${projectId}/qpm/summary`}
            className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-bold hover:bg-slate-800">
            Summary
          </Link>
        </div>
      </div>

      {Object.keys(categoryGroups).length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-sm text-slate-400">No metrics in the KPI Plan yet.</p>
          <Link to={`/pm/projects/${projectId}/qpm`} className="mt-3 inline-block text-xs text-indigo-600 hover:underline">
            Go to KPI Plan to add metrics
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── LEFT: Category accordion ──────────────────────── */}
          <div className="lg:col-span-2 space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Dimensions</p>
            {Object.entries(categoryGroups).map(([cat, metrics]) => {
              const isOpen = expandedCat === cat;
              const catRags = metrics.map(m => metricRags[m.id]).filter(Boolean);
              const catRag = catRags.includes("RED") ? "RED" : catRags.includes("AMBER") ? "AMBER" : catRags.length > 0 ? "GREEN" : null;

              return (
                <div key={cat} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  {/* Category header -- clickable */}
                  <button
                    type="button"
                    onClick={() => setExpandedCat(isOpen ? null : cat)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {catRag ? (
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${RAG_DOT[catRag]}`} />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-slate-200" />
                      )}
                      <span className="text-sm font-semibold text-slate-800 truncate">{cat}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{metrics.length} metric{metrics.length !== 1 ? "s" : ""}</span>
                    </div>
                    <svg
                      className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Metrics inside category */}
                  {isOpen && (
                    <div className="border-t border-slate-100 divide-y divide-slate-100">
                      {metrics.map(m => {
                        const rag = metricRags[m.id];
                        const isSelected = selectedMetric?.id === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => loadMetricData(m)}
                            className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-indigo-600 text-white"
                                : "hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {rag ? (
                                <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${RAG_DOT[rag]}`} />
                              ) : (
                                <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${isSelected ? "bg-indigo-300" : "bg-slate-300"}`} />
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-semibold leading-snug truncate">{m.metric_name}</p>
                                {m.frequency && (
                                  <span className={`text-[9px] font-bold mt-0.5 inline-block rounded px-1 py-0.5 ${
                                    isSelected ? "bg-indigo-500 text-indigo-100" : "bg-slate-100 text-slate-500"
                                  }`}>
                                    {m.frequency}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── RIGHT: Entry form ────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">
            {!selectedMetric ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm font-semibold text-slate-600">Select a dimension on the left</p>
                <p className="text-xs text-slate-400 mt-1">Expand a category, then click a metric to enter data</p>
              </div>
            ) : (
              <>
                {/* Metric info card */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap gap-3 items-start justify-between">
                    <div>
                      <span className="inline-block rounded bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide mb-1">
                        {selectedMetric.metric_category}
                      </span>
                      <h2 className="text-base font-bold text-slate-900">{selectedMetric.metric_name}</h2>
                      {selectedMetric.formula && (
                        <p className="text-xs text-slate-500 mt-1 max-w-lg leading-relaxed">{selectedMetric.formula}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      {[
                        ["UOM", selectedMetric.uom],
                        ["Intent", selectedMetric.intent],
                        ["Target", selectedMetric.target ?? 0],
                        ["LSL", selectedMetric.lsl ?? 0],
                        ["USL", selectedMetric.usl ?? 0],
                      ].map(([l, v]) => v != null && (
                        <div key={l as string} className="text-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 min-w-[50px]">
                          <div className="text-[9px] font-bold text-slate-400 uppercase">{l}</div>
                          <div className="font-bold text-slate-800 mt-0.5 text-sm">{String(v)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Computed result */}
                {computed && (
                  <div className={`rounded-xl border-2 p-4 flex items-center gap-4 ${
                    computed.rag_status ? RAG_STYLE[computed.rag_status] : "bg-slate-50 border-slate-200"
                  }`}>
                    <div className="text-3xl font-extrabold">{Number(computed.actual_value).toFixed(2)}</div>
                    <div>
                      <div className="text-sm font-bold">KPI Result</div>
                      <div className="text-xs opacity-80">Period: {computed.frequency_name} &nbsp;|&nbsp; RAG: <strong>{computed.rag_status || "--"}</strong></div>
                    </div>
                  </div>
                )}

                {/* Entry form */}
                <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">
                      Enter Measurement
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {requiredMeasures.length} input{requiredMeasures.length !== 1 ? "s" : ""} required
                      </span>
                    </h3>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* Period */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-600">Frequency</label>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 font-semibold flex items-center gap-1">
                          <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          {period.frequency}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-600">Period Name <span className="text-red-500">*</span></label>
                        <input
                          type="text" required value={period.frequency_name}
                          onChange={e => {
                            setPeriod(p => ({ ...p, frequency_name: e.target.value }));
                            setModificationReason(""); // reset reason when period changes
                          }}
                          placeholder={period.frequency === "Monthly" ? "June 2026" : period.frequency === "Sprint" ? "Sprint 5" : "Q2 2026"}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-600">From Date</label>
                        <input type="date" value={period.from_date}
                          onChange={e => setPeriod(p => ({ ...p, from_date: e.target.value }))}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-600">To Date</label>
                        <input type="date" value={period.to_date}
                          onChange={e => setPeriod(p => ({ ...p, to_date: e.target.value }))}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                      </div>
                    </div>

                    {/* Measure inputs */}
                    <div>
                      <p className="text-xs font-bold text-slate-700 mb-3">Input Values</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {requiredMeasures.map((measureName, idx) => (
                          <div key={measureName} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-extrabold shrink-0">
                                {idx + 1}
                              </span>
                              {measureName}
                              <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2 items-center">
                              <input
                                type="number" step="any" required
                                value={measureValues[measureName] || ""}
                                onChange={e => setMeasureValues(p => ({ ...p, [measureName]: e.target.value }))}
                                placeholder="Enter value"
                                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              />
                              {selectedMetric.uom && (
                                <span className="text-xs text-slate-500 font-medium shrink-0 bg-white border border-slate-200 rounded px-2 py-1">
                                  {selectedMetric.uom}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Threshold override -- collapsible */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowThresholdOverride(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          Override Thresholds 
                          {(thresholdOverride.override_target || thresholdOverride.override_lsl || thresholdOverride.override_usl) && (
                            <span className="rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 text-[9px] font-bold">ACTIVE</span>
                          )}
                        </span>
                        <svg className={`h-4 w-4 text-slate-400 transition-transform ${showThresholdOverride ? "rotate-180" : ""}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {showThresholdOverride && (
                        <div className="px-4 py-4 bg-amber-50/30 border-t border-slate-200 space-y-3">
                          <p className="text-[10px] text-amber-700">
                            Set thresholds for this period. These values will be remembered for next time.
                          </p>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              ["override_target", "TARGET", selectedMetric.target ?? 0],
                              ["override_lsl",    "LSL",    selectedMetric.lsl    ?? 0],
                              ["override_usl",    "USL",    selectedMetric.usl    ?? 0],
                            ].map(([key, label, catalogDefault]) => (
                              <div key={key as string} className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase">{label as string}</label>
                                <input
                                  type="number" step="any"
                                  placeholder={`Catalog: ${catalogDefault}`}
                                  value={(thresholdOverride as any)[key as string]}
                                  onChange={e => setThresholdOverride(t => ({ ...t, [key as string]: e.target.value }))}
                                  className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                                />
                                <p className="text-[9px] text-slate-400">Catalog default: {catalogDefault}</p>
                              </div>
                            ))}
                          </div>
                          <button type="button"
                            onClick={() => setThresholdOverride({
                              override_target: String(selectedMetric.target ?? 0),
                              override_lsl:    String(selectedMetric.lsl    ?? 0),
                              override_usl:    String(selectedMetric.usl    ?? 0),
                            })}
                            className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer">
                            Reset to catalog defaults
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Modification reason — mandatory when re-entering an existing period */}
                    {isModifyingExistingPeriod && (
                      <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <p className="text-xs font-bold text-amber-800">
                            Modifying existing period: <span className="font-extrabold">{period.frequency_name}</span>
                          </p>
                        </div>
                        <p className="text-[10px] text-amber-700">
                          This period already has data. Please provide a mandatory reason for the change.
                          This reason will be visible in the KPI Tracker.
                        </p>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-amber-800">
                            Reason for modification <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            required={isModifyingExistingPeriod}
                            value={modificationReason}
                            onChange={e => setModificationReason(e.target.value)}
                            rows={3}
                            placeholder="e.g. Correcting data entry error — actual defects were 2, not 5. Revised after code review."
                            className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                          />
                          {!modificationReason.trim() && (
                            <p className="text-[10px] text-red-600 font-semibold">Required — cannot submit without a reason.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Submit button */}
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="submit"
                        disabled={submitting || !period.frequency_name || (isModifyingExistingPeriod && !modificationReason.trim())}
                        className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer transition-colors"
                      >
                        {submitting ? "Computing..." : isModifyingExistingPeriod ? "Update & Recompute KPI" : "Submit & Compute KPI"}
                      </button>
                      <p className="text-xs text-slate-400">KPI value auto-calculated from your inputs</p>
                    </div>
                  </div>
                </form>

                {/* Past entries history */}
                {Object.keys(historyByPeriod).length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Past Entries</p>
                      <span className="text-xs text-slate-400">{pastEntries.length} records</span>
                    </div>
                    {Object.entries(historyByPeriod)
                      .sort((a, b) => {
                        // Sort periods by most recent updated_at in each group
                        const latestA = Math.max(...a[1].map(e => new Date(e.updated_at).getTime()));
                        const latestB = Math.max(...b[1].map(e => new Date(e.updated_at).getTime()));
                        return latestB - latestA;
                      })
                      .map(([period_name, entries]) => {
                        // Show the most recent updated_at across all measures in this period
                        const latestUpdated = entries.reduce((max, e) =>
                          new Date(e.updated_at) > new Date(max) ? e.updated_at : max,
                          entries[0].updated_at
                        );
                        return (
                          <div key={period_name} className="border-b border-slate-100 last:border-0">
                            <div className="px-5 py-2 bg-slate-50/50 flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-600">{period_name}</span>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Last updated: {new Date(latestUpdated).toLocaleString()}
                              </span>
                            </div>
                            <table className="min-w-full text-xs">
                              <thead className="bg-slate-50 text-slate-400 font-semibold">
                                <tr>
                                  <th className="px-4 py-2 text-left">Measure</th>
                                  <th className="px-4 py-2 text-left">Value</th>
                                  <th className="px-4 py-2 text-left">UOM</th>
                                  <th className="px-4 py-2 text-left">From</th>
                                  <th className="px-4 py-2 text-left">To</th>
                                  <th className="px-4 py-2 text-left">Submitted On</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {entries.map(e => (
                                  <tr key={e.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 font-medium text-slate-700">{e.measure_name}</td>
                                    <td className="px-4 py-2 font-bold text-slate-900">{e.actual_value ?? "--"}</td>
                                    <td className="px-4 py-2 text-slate-500">{e.uom || "--"}</td>
                                    <td className="px-4 py-2 text-slate-500">{e.from_date || "--"}</td>
                                    <td className="px-4 py-2 text-slate-500">{e.to_date || "--"}</td>
                                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                                      <span className={`text-[10px] ${
                                        // Highlight if updated (updated_at significantly after created_at)
                                        new Date(e.updated_at).getTime() - new Date(e.created_at).getTime() > 5000
                                          ? "text-amber-700 font-semibold"
                                          : "text-slate-500"
                                      }`}>
                                        {new Date(e.updated_at).toLocaleString()}
                                        {new Date(e.updated_at).getTime() - new Date(e.created_at).getTime() > 5000 && (
                                          <span className="ml-1 rounded bg-amber-100 text-amber-700 border border-amber-200 px-1 py-0.5 text-[9px] font-bold">
                                            updated
                                          </span>
                                        )}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Submit / Reopen plan ────────────────────────────── */}
      {plan && plan.qpm_status !== "APPROVED" && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-indigo-900 mb-1">Submit KPI Plan</h2>
          <p className="text-xs text-indigo-700 mb-4">
            Once all metrics are filled, submit. The plan will be approved automatically.
          </p>
          <div className="mb-4">
            <label className="block text-xs font-bold text-indigo-800 mb-2">Overall RAG Perception (optional)</label>
            <div className="flex gap-2 mb-2">
              {["GREEN", "AMBER", "RED"].map(r => (
                <button key={r} type="button" onClick={() => setPmRag(r === pmRag ? "" : r)}
                  className={`rounded-lg px-4 py-2 text-sm font-bold border transition cursor-pointer ${
                    pmRag === r
                      ? r === "RED" ? "bg-red-600 text-white border-red-600"
                        : r === "AMBER" ? "bg-amber-500 text-white border-amber-500"
                        : "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}>{r}</button>
              ))}
              {pmRag && (
                <button type="button" onClick={() => setPmRag("")}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer px-2">Clear</button>
              )}
            </div>
            <textarea value={pmRagComment} onChange={e => setPmRagComment(e.target.value)}
              rows={2} placeholder="Comments (optional)..."
              className="w-full rounded-lg border border-indigo-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400" />
          </div>
          <button type="button" disabled={submittingPlan} onClick={handleSubmitPlan}
            className="rounded-lg bg-indigo-700 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-800 disabled:opacity-50 cursor-pointer transition-colors">
            {submittingPlan ? "Submitting..." : "Submit & Approve KPI Plan"}
          </button>
        </div>
      )}

      {plan && plan.qpm_status === "APPROVED" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-bold text-emerald-800">KPI Plan submitted and approved.</p>
              {plan.qpm_approved_at && (
                <p className="mt-1 text-xs text-emerald-700">Approved: {new Date(plan.qpm_approved_at).toLocaleString()}</p>
              )}
              <p className="mt-1 text-xs text-emerald-600">To enter data for a new period, reopen the plan and re-submit.</p>
            </div>
            <button type="button" disabled={reopening} onClick={handleReopen}
              className="rounded-lg border border-emerald-400 bg-white px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 cursor-pointer whitespace-nowrap">
              {reopening ? "Reopening..." : "Revise & Resubmit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
