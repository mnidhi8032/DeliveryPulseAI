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
  getLatestMeasurement, submitQpmPlan,
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

  // PM project comment (optional, shown at bottom of page — no approval gate)
  const [pmComment, setPmComment]           = useState("");
  const [savingComment, setSavingComment]   = useState(false);

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

  // Track when previous values were carried forward
  const [carriedForwardFrom, setCarriedForwardFrom] = useState<string | null>(null);

  // Detect if the current period name already exists in past entries (case-insensitive)
  const isModifyingExistingPeriod = period.frequency_name.trim().length > 0 &&
    pastEntries.some(e =>
      (e.frequency_name || "").toLowerCase() === period.frequency_name.trim().toLowerCase()
    );

  // ── Auto-compute current period window from frequency + project start date ──
  // Uses Mon–Fri working days. Returns { frequency_name, from_date, to_date, label }.
  function computeCurrentPeriod(frequency: string, projectStartDate: string | null): {
    frequency_name: string; from_date: string; to_date: string; label: string;
  } {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    // Monday of the current week
    const dayOfWeek = today.getDay(); // 0=Sun,1=Mon,...,6=Sat
    const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - daysFromMon);
    // Friday of the current week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4);

    const freqLower = (frequency || "monthly").toLowerCase();

    if (freqLower.includes("week")) {
      const label = `Week of ${weekStart.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
      return { frequency_name: label, from_date: fmt(weekStart), to_date: fmt(weekEnd), label };
    }

    if (freqLower.includes("fortnight")) {
      // Fortnightly from project start, find which fortnight today falls in
      const anchor = projectStartDate ? new Date(projectStartDate) : new Date(today.getFullYear(), today.getMonth(), 1);
      const msPerDay = 86400000;
      const daysFromAnchor = Math.floor((today.getTime() - anchor.getTime()) / msPerDay);
      const fortnightIndex = Math.floor(daysFromAnchor / 10); // 10 working days = 2 weeks
      // Approximate: fortnight boundaries every 14 calendar days
      const fortnightStart = new Date(anchor);
      fortnightStart.setDate(anchor.getDate() + fortnightIndex * 14);
      // Adjust to Monday
      const fDow = fortnightStart.getDay();
      const fAdj = fDow === 0 ? 1 : fDow === 6 ? 2 : 0;
      fortnightStart.setDate(fortnightStart.getDate() + fAdj);
      const fortnightEnd = new Date(fortnightStart);
      fortnightEnd.setDate(fortnightStart.getDate() + 11); // +11 days = ~2 working weeks (Mon to Fri next week)
      // Adjust end to Friday
      const eDow = fortnightEnd.getDay();
      if (eDow === 6) fortnightEnd.setDate(fortnightEnd.getDate() - 1);
      if (eDow === 0) fortnightEnd.setDate(fortnightEnd.getDate() - 2);
      const label = `${fortnightStart.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} – ${fortnightEnd.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
      return { frequency_name: label, from_date: fmt(fortnightStart), to_date: fmt(fortnightEnd), label };
    }

    if (freqLower.includes("quarter")) {
      const q = Math.floor(today.getMonth() / 3);
      const qStart = new Date(today.getFullYear(), q * 3, 1);
      const qEnd = new Date(today.getFullYear(), q * 3 + 3, 0);
      // Adjust qEnd to last Friday if it falls on weekend
      const qeDow = qEnd.getDay();
      if (qeDow === 6) qEnd.setDate(qEnd.getDate() - 1);
      if (qeDow === 0) qEnd.setDate(qEnd.getDate() - 2);
      const qName = `Q${q + 1} ${today.getFullYear()}`;
      const label = `${qName} (${qStart.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} – ${qEnd.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })})`;
      return { frequency_name: qName, from_date: fmt(qStart), to_date: fmt(qEnd), label };
    }

    // Default: Monthly
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    // Adjust monthEnd to last Friday if weekend
    const meDow = monthEnd.getDay();
    if (meDow === 6) monthEnd.setDate(monthEnd.getDate() - 1);
    if (meDow === 0) monthEnd.setDate(monthEnd.getDate() - 2);
    const monthName = `${MONTHS[today.getMonth()]} ${today.getFullYear()}`;
    return { frequency_name: monthName, from_date: fmt(monthStart), to_date: fmt(monthEnd), label: monthName };
  }

  const loadMetricData = useCallback(async (pm: KpiPlanMetric) => {
    setSelectedMetric(pm);
    setComputed(null);
    setMeasureValues({});
    setShowThresholdOverride(false);
    setModificationReason("");
    setCarriedForwardFrom(null);

    // Auto-compute period from frequency + project start date
    const freq = pm.frequency || "Monthly";
    const computed_period = computeCurrentPeriod(freq, project?.start_date ?? null);
    setPeriod({
      frequency: freq,
      frequency_name: computed_period.frequency_name,
      from_date: computed_period.from_date,
      to_date: computed_period.to_date,
    });

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
      
      // Initialize measure values object
      const init: Record<string, string> = {};
      list.forEach(m => { init[m] = ""; });
      
      // ── CARRY FORWARD: Fetch previous completed entries for this metric + frequency ──
      try {
        // Fetch ALL entries for this metric (don't filter by frequency_name yet)
        const allEntries = await getMeasureEntries(pm.id);
        
        // Group by frequency_name (case-insensitive), keep only the latest entry per measure per period
        const periodMap: Record<string, Record<string, KpiMeasureEntry>> = {};
        for (const e of allEntries) {
          const periodKey = (e.frequency_name || "--").toLowerCase();
          if (!periodMap[periodKey]) periodMap[periodKey] = {};
          const existing = periodMap[periodKey][e.measure_name];
          if (!existing || new Date(e.updated_at) > new Date(existing.updated_at)) {
            periodMap[periodKey][e.measure_name] = e;
          }
        }
        
        // Check if current period already has data (case-insensitive)
        const currentPeriodKey = computed_period.frequency_name.toLowerCase();
        const hasCurrentPeriodData = !!periodMap[currentPeriodKey];
        
        if (!hasCurrentPeriodData) {
          // No data for current period — carry forward from the most recent DIFFERENT period
          // Find the most recent period (by updated_at) that's NOT the current period
          let mostRecentPeriod: string | null = null;
          let mostRecentPeriodDisplay: string | null = null;
          let mostRecentTime = 0;
          
          for (const [periodKey, measureMap] of Object.entries(periodMap)) {
            // Skip the current period
            if (periodKey === currentPeriodKey) continue;
            
            const periodTime = Math.max(...Object.values(measureMap).map(e => new Date(e.updated_at).getTime()));
            if (periodTime > mostRecentTime) {
              mostRecentTime = periodTime;
              mostRecentPeriod = periodKey;
              // Use the original casing from one of the entries for display
              mostRecentPeriodDisplay = Object.values(measureMap)[0]?.frequency_name || periodKey;
            }
          }
          
          // Carry forward values from the most recent previous period
          if (mostRecentPeriod && periodMap[mostRecentPeriod]) {
            const previousEntries = periodMap[mostRecentPeriod];
            let carriedCount = 0;
            for (const measureName of list) {
              const prevEntry = previousEntries[measureName];
              if (prevEntry && prevEntry.actual_value != null) {
                init[measureName] = String(prevEntry.actual_value);
                carriedCount++;
              }
            }
            // Set the carry-forward indicator if we actually carried any values
            if (carriedCount > 0 && mostRecentPeriodDisplay) {
              setCarriedForwardFrom(mostRecentPeriodDisplay);
            }
          }
        }
      } catch {
        // If fetching entries fails, just use empty values
      }
      
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
  }, [project]);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([getProject(projectId), getKpiPlan(projectId)])
      .then(([proj, p]) => {
        setProject(proj);
        setPlan(p);
        // Pre-fill the PM comment box with the last saved comment
        if (p.pm_rag_comments) setPmComment(p.pm_rag_comments);
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
          <Link to={`/pm/projects`} className="text-xs text-slate-500 hover:text-slate-800">Back to My Projects</Link>
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
               plan.qpm_status === "UNDER_REVIEW" ? "Pending Review" :
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
          <Link to={`/pm/summary`}
            className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-bold hover:bg-slate-800">
            Summary
          </Link>
        </div>
      </div>

      {Object.keys(categoryGroups).length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-sm text-slate-400">No metrics in the plan yet. Create a new project to auto-add mandatory metrics.</p>
          <Link to="/pm/projects" className="mt-3 inline-block text-xs text-indigo-600 hover:underline">
            Back to My Projects
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
                <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white">
                  {/* Top accent bar */}
                  <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
                  <div className="p-5">
                    <div className="flex flex-wrap gap-2 items-center justify-between">
                      <div>
                        <span className="inline-block rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-2">
                          {selectedMetric.metric_category}
                        </span>
                        <h2 className="text-lg font-extrabold text-slate-900 leading-snug">{selectedMetric.metric_name}</h2>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedMetric.uom && (
                          <span className="rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 text-xs font-semibold">
                            {selectedMetric.uom}
                          </span>
                        )}
                        {selectedMetric.intent && (
                          <span className="rounded-full bg-violet-50 text-violet-700 border border-violet-200 px-3 py-1 text-xs font-semibold">
                            {selectedMetric.intent}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Computed result */}
                {computed && (
                  <div className={`rounded-2xl border-2 p-5 flex items-center gap-5 shadow-sm ${
                    computed.rag_status ? RAG_STYLE[computed.rag_status] : "bg-slate-50 border-slate-200"
                  }`}>
                    <div className="text-4xl font-black tracking-tight">{Number(computed.actual_value).toFixed(2)}</div>
                    <div className="h-10 w-px bg-current opacity-20" />
                    <div>
                      <div className="text-sm font-bold">KPI Result</div>
                      <div className="text-xs opacity-70 mt-0.5">
                        {period.from_date && period.to_date
                          ? `${new Date(period.from_date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} – ${new Date(period.to_date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
                          : computed.frequency_name
                        }
                        &nbsp;&nbsp;·&nbsp;&nbsp;RAG: <strong>{computed.rag_status || "--"}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Entry form */}
                <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  {/* Form header with period info */}
                  <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-indigo-50 border-b border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Enter Measurement</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {requiredMeasures.length} input{requiredMeasures.length !== 1 ? "s" : ""} required
                        </p>
                      </div>
                      {/* Period pill */}
                      <div className="flex items-center gap-2 rounded-xl bg-white border border-indigo-200 shadow-sm px-4 py-2">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100">
                          <svg className="h-3.5 w-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{period.frequency}</div>
                          {period.from_date && period.to_date ? (
                            <div className="text-xs font-bold text-slate-800">
                              {new Date(period.from_date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                              {" – "}
                              {new Date(period.to_date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </div>
                          ) : (
                            <div className="text-xs font-bold text-slate-800">{period.frequency_name}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* Carry-forward indicator */}
                    {carriedForwardFrom && (
                      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 flex items-start gap-3">
                        <svg className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-indigo-900">Previous reporting values loaded</p>
                          <p className="text-xs text-indigo-700 mt-0.5">
                            Values carried forward from <span className="font-semibold">{carriedForwardFrom}</span>. 
                            Review and update any changed values before submitting.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Measure inputs */}
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Input Values</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {requiredMeasures.map((measureName, idx) => (
                          <div key={measureName} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all space-y-2">
                            <label className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-[9px] font-extrabold shrink-0 shadow-sm">
                                {idx + 1}
                              </span>
                              <span className="leading-tight">{measureName}</span>
                              <span className="text-red-400 ml-auto">*</span>
                            </label>
                            <div className="flex gap-2 items-center">
                              <input
                                type="number" step="any" required
                                value={measureValues[measureName] || ""}
                                onChange={e => setMeasureValues(p => ({ ...p, [measureName]: e.target.value }))}
                                placeholder="Enter value"
                                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white focus:border-indigo-300 transition-colors"
                              />
                              {selectedMetric.uom && (
                                <span className="text-[10px] text-indigo-600 font-bold shrink-0 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5">
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
                    <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                      <button
                        type="submit"
                        disabled={submitting || !period.frequency_name || (isModifyingExistingPeriod && !modificationReason.trim())}
                        className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 px-7 py-2.5 text-sm font-bold text-white disabled:opacity-50 cursor-pointer transition-all shadow-sm hover:shadow-md"
                      >
                        {submitting ? "Computing..." : isModifyingExistingPeriod ? "Update & Recompute KPI" : "Submit & Compute KPI"}
                      </button>
                      <p className="text-xs text-slate-400">KPI value auto-calculated from your inputs</p>
                    </div>
                  </div>
                </form>

                {/* Past entries history */}
                {Object.keys(historyByPeriod).length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200">
                          <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Past Entries</p>
                      </div>
                      <span className="rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold px-2.5 py-0.5">{pastEntries.length} records</span>
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

      {/* ── PM Project Comment ─────────────────────────────── */}
      {plan && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
              <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-6 4h10M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Project Update / Comments</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Optional — brief the Delivery Manager on any project context, blockers, or highlights for this reporting cycle.
              </p>
            </div>
          </div>
          <textarea
            value={pmComment}
            onChange={e => setPmComment(e.target.value)}
            rows={3}
            placeholder="e.g. Productivity dipped this week due to sprint planning overhead. Expect recovery next cycle. No blockers."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white resize-none"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">This comment is visible to the Delivery Manager and Delivery Head.</p>
            <button
              type="button"
              disabled={savingComment || !pmComment.trim()}
              onClick={async () => {
                if (!plan || !pmComment.trim()) return;
                setSavingComment(true);
                try {
                  // Save as pm_rag_comments on the plan (reusing existing field, no schema change)
                  const updated = await submitQpmPlan(plan.id, plan.pm_perception_rag ?? undefined, pmComment.trim());
                  setPlan(updated);
                  toast.success("Comment saved.");
                } catch {
                  toast.error("Failed to save comment.");
                } finally {
                  setSavingComment(false);
                }
              }}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap"
            >
              {savingComment ? "Saving..." : "Save Comment"}
            </button>
          </div>
          {/* Show previously saved comment if any */}
          {plan.pm_rag_comments && plan.pm_rag_comments !== pmComment && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Last saved comment</p>
              <p className="text-xs text-slate-700">{plan.pm_rag_comments}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
