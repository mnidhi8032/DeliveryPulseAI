/**
 * QPM Data Entry — Unified parameter entry page.
 * All shared measures entered once; all metrics auto-computed on Save.
 */
import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { getProject } from "../../services/projectService";
import { getKpiPlan, submitQpmPlan } from "../../services/qpmService";
import { getAllMeasures, saveAndCompute } from "../../services/periodMeasuresService";
import type { Project } from "../../types/project";
import type { KpiPlan } from "../../types/qpm";
import type { AllMeasuresResponse, MetricComputeResult, HistoryRow } from "../../services/periodMeasuresService";
import { RagBadge } from "../../components/RagBadge";

// ── Helpers ─────────────────────────────────────────────────────────────────
function currentPeriodLabel(): string {
  const today = new Date();
  const MONTHS = ["January","February","March","April","May","June","July",
                  "August","September","October","November","December"];
  return `${MONTHS[today.getMonth()]} ${today.getFullYear()}`;
}

function currentPeriodDates(): { from_date: string; to_date: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end   = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { from_date: fmt(start), to_date: fmt(end) };
}


export function QPMDataEntryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const toast  = useToast();
  const navigate = useNavigate();

  const [project, setProject]     = useState<Project | null>(null);
  const [plan,    setPlan]        = useState<KpiPlan | null>(null);
  const [data,    setData]        = useState<AllMeasuresResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving,  setSaving]      = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("All metrics");

  // Editable measure values: { measure_name -> string }
  const [measureValues, setMeasureValues] = useState<Record<string, string>>({});
  // Editable thresholds: { plan_metric_id -> { lsl, target, usl } }
  const [thresholds, setThresholds] = useState<Record<string, { lsl: string; target: string; usl: string }>>({});
  // Period state
  const [periodLabel, setPeriodLabel] = useState(currentPeriodLabel());

  // Computed results from last Save
  const [results, setResults] = useState<MetricComputeResult[]>([]);

  // PM comment
  const [pmComment, setPmComment]     = useState("");
  const [savingComment, setSavingComment] = useState(false);

  // ── Load data ────────────────────────────────────────────────────────────
  const loadData = useCallback(async (period: string) => {
    if (!projectId) return;
    try {
      const [proj, kpiPlan, measData] = await Promise.all([
        getProject(projectId),
        getKpiPlan(projectId),
        getAllMeasures(projectId, period),
      ]);
      setProject(proj);
      setPlan(kpiPlan);
      if (kpiPlan.pm_rag_comments) setPmComment(kpiPlan.pm_rag_comments);
      setData(measData);

      // Init measure values — pre-fill existing values
      const init: Record<string, string> = {};
      for (const m of measData.measures) {
        init[m.measure_name] = m.actual_value != null ? String(m.actual_value) : "";
      }
      setMeasureValues(init);

      // Init thresholds from metrics
      const tInit: Record<string, { lsl: string; target: string; usl: string }> = {};
      for (const m of measData.metrics) {
        tInit[m.plan_metric_id] = {
          lsl:    m.lsl    != null ? String(m.lsl)    : "",
          target: m.target != null ? String(m.target) : "",
          usl:    m.usl    != null ? String(m.usl)    : "",
        };
      }
      setThresholds(tInit);

      // Pre-populate results from history (most recent per metric)
      const latestByMetric: Record<string, MetricComputeResult> = {};
      for (const h of measData.history) {
        if (!latestByMetric[h.plan_metric_id] || (h.submitted_date && (!latestByMetric[h.plan_metric_id].frequency_name || h.submitted_date > latestByMetric[h.plan_metric_id].frequency_name))) {
          latestByMetric[h.plan_metric_id] = {
            plan_metric_id: h.plan_metric_id,
            metric_name: h.metric_name,
            metric_category: h.metric_category,
            frequency_name: h.frequency_name || "",
            actual_value: h.actual_value,
            rag_status: h.rag_status,
            target: h.target, lsl: h.lsl, usl: h.usl,
            complete: h.actual_value != null,
            missing_measures: [],
          };
        }
      }
      setResults(Object.values(latestByMetric));
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => { loadData(periodLabel); }, []);

  const handlePeriodChange = (p: string) => {
    setPeriodLabel(p);
    setLoading(true);
    loadData(p);
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!plan || !projectId) return;
    setSaving(true);
    const { from_date, to_date } = currentPeriodDates();
    try {
      const measures = Object.entries(measureValues).map(([measure_name, val]) => ({
        measure_name,
        actual_value: val.trim() !== "" ? parseFloat(val) : null,
      }));
      const res = await saveAndCompute(projectId, {
        plan_id: plan.id,
        period_label: periodLabel,
        frequency: "Monthly",
        from_date, to_date,
        measures,
        thresholds, // pass PM-edited thresholds so they persist
      });
      setResults(res.computed_metrics);
      const complete  = res.computed_metrics.filter(m => m.complete).length;
      const total     = res.computed_metrics.length;
      toast.success(`Saved. ${complete}/${total} metrics computed.`);
      // Reload to get fresh history
      await loadData(periodLabel);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ── History filter options ───────────────────────────────────────────────
  const historyMetricNames = data
    ? ["All metrics", ...Array.from(new Set(data.history.map(h => h.metric_name)))]
    : ["All metrics"];

  const filteredHistory: HistoryRow[] = data
    ? (historyFilter === "All metrics"
        ? data.history
        : data.history.filter(h => h.metric_name === historyFilter))
    : [];

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-1/3 rounded bg-slate-200" />
      <div className="h-96 rounded-xl bg-slate-200" />
    </div>
  );

  return (
    <div className="space-y-5 text-slate-800">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/pm/projects" className="text-xs text-slate-500 hover:text-slate-800">← Back to My Projects</Link>
          <h1 className="mt-0.5 text-xl font-bold text-slate-900">KPI Data Entry</h1>
          <p className="text-xs text-slate-500">{project?.project_name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <input
            type="text"
            value={periodLabel}
            onChange={e => setPeriodLabel(e.target.value)}
            onBlur={e => handlePeriodChange(e.target.value.trim() || periodLabel)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs w-44 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            placeholder="e.g. July 2026"
          />
          {plan && (
            <span className={`rounded-full px-3 py-1 text-xs font-bold border ${
              plan.qpm_status === "APPROVED"  ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
              plan.qpm_status === "REJECTED"  ? "bg-rose-50 text-rose-700 border-rose-200" :
              "bg-slate-100 text-slate-600 border-slate-200"
            }`}>
              {plan.qpm_status === "DRAFT" ? "Draft" :
               plan.qpm_status === "UNDER_REVIEW" ? "Pending Review" :
               plan.qpm_status === "APPROVED" ? "Approved" :
               plan.qpm_status === "REJECTED" ? "Rejected" : plan.qpm_status}
            </span>
          )}
        </div>
      </div>

      {/* ── Stats strip ── */}
      {data && (
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{data.metrics.length} metrics</span>
          <span>·</span>
          <span className="font-semibold text-slate-700">{data.measures.length} parameters</span>
          <span>·</span>
          <span className="text-emerald-600 font-semibold">{results.filter(r => r.complete && r.rag_status === "GREEN").length} Green</span>
          <span className="text-amber-600 font-semibold">{results.filter(r => r.complete && r.rag_status === "AMBER").length} Amber</span>
          <span className="text-red-600 font-semibold">{results.filter(r => r.complete && r.rag_status === "RED").length} Red</span>
          <span className="text-slate-400">{results.filter(r => !r.complete).length} not computed</span>
        </div>
      )}

      {/* ── PARAMETERS PANEL ── */}
      {data && !showHistory && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Parameters</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {data.metrics.length} metrics · {data.measures.length} parameters
              </p>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.measures.map(m => {
              const val = measureValues[m.measure_name] ?? "";
              const isEmpty = val.trim() === "";
              return (
                <div
                  key={m.measure_name}
                  className={`rounded-xl border p-4 space-y-2 transition-colors ${
                    isEmpty ? "border-amber-300 bg-amber-50/40" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-slate-700 leading-snug">
                      {m.measure_name}
                    </label>
                    <span className={`text-[9px] font-bold rounded-full px-2 py-0.5 border shrink-0 ${
                      isEmpty
                        ? "bg-amber-100 text-amber-700 border-amber-300"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                      {m.metrics_count} metric{m.metrics_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={val}
                    onChange={e => setMeasureValues(prev => ({ ...prev, [m.measure_name]: e.target.value }))}
                    placeholder={isEmpty ? "Not entered" : "Enter value"}
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-colors ${
                      isEmpty
                        ? "border-amber-300 bg-white text-amber-500 placeholder-amber-400"
                        : "border-slate-200 bg-slate-50 text-slate-900 focus:bg-white"
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── THRESHOLDS PANEL ── */}
      {data && !showHistory && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">Thresholds</p>
            {/* History icon */}
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              title="View history"
              className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 font-semibold uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left">Metric</th>
                  <th className="px-4 py-3 text-center">LSL</th>
                  <th className="px-4 py-3 text-center">Target</th>
                  <th className="px-4 py-3 text-center">USL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.metrics.map(metric => {
                  const t = thresholds[metric.plan_metric_id] ?? { lsl: "", target: "", usl: "" };
                  return (
                    <tr key={metric.plan_metric_id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-800 text-xs leading-snug">{metric.metric_name}</p>
                        {metric.metric_category && (
                          <span className="text-[9px] text-slate-400">{metric.metric_category}</span>
                        )}
                      </td>
                      {(["lsl","target","usl"] as const).map(field => (
                        <td key={field} className="px-3 py-2 text-center">
                          <input
                            type="number" step="any"
                            value={t[field]}
                            onChange={e => setThresholds(prev => ({
                              ...prev,
                              [metric.plan_metric_id]: { ...prev[metric.plan_metric_id], [field]: e.target.value }
                            }))}
                            className="w-20 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:bg-white"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── HISTORY PANEL ── */}
      {showHistory && data && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowHistory(false)}
              className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-100 cursor-pointer"
            >
              <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <p className="text-sm font-bold text-slate-900">History — all metrics</p>
            <div className="ml-auto">
              <select
                value={historyFilter}
                onChange={e => setHistoryFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                {historyMetricNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left">Metric</th>
                  <th className="px-4 py-3 text-left">Period</th>
                  <th className="px-4 py-3 text-left">Inputs</th>
                  <th className="px-4 py-3 text-left">LSL / Target / USL</th>
                  <th className="px-4 py-3 text-left">Result</th>
                  <th className="px-4 py-3 text-left">RAG</th>
                  <th className="px-4 py-3 text-left">Updated</th>
                  <th className="px-4 py-3 text-left">Comments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400">No history yet.</td></tr>
                ) : filteredHistory.map((h, idx) => {
                  const isLatest = idx === 0 || h.metric_name !== filteredHistory[idx - 1]?.metric_name;
                  const lslTargetUsl = [h.lsl, h.target, h.usl].map(v => v != null ? Number(v).toString() : "—").join(" / ");
                  return (
                    <tr key={h.measurement_id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-semibold text-slate-800">
                        {h.metric_name}
                        {isLatest && (
                          <span className="ml-2 rounded bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 text-[9px] font-bold">latest</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{h.frequency_name || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono">{h.inputs_str}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono">{lslTargetUsl}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {h.actual_value != null ? Number(h.actual_value).toFixed(2) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {h.rag_status
                          ? <div className="flex"><RagBadge rag={h.rag_status} showDot /></div>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {h.updated_at ? new Date(h.updated_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[140px]">
                        {h.analysis_comments ? (
                          <span className="truncate block" title={h.analysis_comments}>{h.analysis_comments}</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PM Comment ── */}
      {!showHistory && plan && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
              <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-6 4h10M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Project Update / Comments</h2>
              <p className="text-xs text-slate-500 mt-0.5">Optional — visible to Delivery Manager.</p>
            </div>
          </div>
          <textarea
            value={pmComment}
            onChange={e => setPmComment(e.target.value)}
            rows={3}
            placeholder="e.g. Productivity dipped this week due to sprint planning overhead..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white resize-none"
          />
          <div className="mt-3 flex items-center justify-end">
            <button
              type="button"
              disabled={savingComment || !pmComment.trim()}
              onClick={async () => {
                if (!plan || !pmComment.trim()) return;
                setSavingComment(true);
                try {
                  const updated = await submitQpmPlan(plan.id, plan.pm_perception_rag ?? undefined, pmComment.trim());
                  setPlan(updated);
                  toast.success("Comment saved.");
                } catch { toast.error("Failed to save comment."); }
                finally { setSavingComment(false); }
              }}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-40 cursor-pointer"
            >
              {savingComment ? "Saving..." : "Save Comment"}
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom action bar ── */}
      {!showHistory && (
        <div className="flex items-center justify-between gap-3 py-3 border-t border-slate-200 bg-white sticky bottom-0 px-1">
          <p className="text-xs text-slate-400">
            All complete metrics are computed automatically on Save.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(`/pm/projects/${projectId}/qpm/summary`)}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              View metrics summary
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-7 py-2.5 text-sm font-bold text-white disabled:opacity-50 cursor-pointer transition-colors shadow-sm"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
