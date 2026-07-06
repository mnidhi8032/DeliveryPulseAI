/**
 * DM Project Review Page
 *
 * Delivery Manager views the full KPI summary for a project,
 * adds commentary and action items, then submits the review.
 */
import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { getProject } from "../../services/projectService";
import { getKpiPlan, getKpiSummary } from "../../services/qpmService";
import {
  listReviewsForProject,
  createDMReview,
  updateDMReview,
} from "../../services/dmReviewService";
import type { Project } from "../../types/project";
import type { KpiSummary } from "../../types/qpm";
import type { DMReview } from "../../services/dmReviewService";
import { RagBadge } from "../../components/RagBadge";
import { RAG_STYLE as _RAG_STYLE } from "../../types/qpm"; // kept for future use

// ── RAG dot helper ──────────────────────────────────────────────────────────
const RAG_DOT: Record<string, string> = {
  GREEN: "bg-emerald-500",
  AMBER: "bg-amber-500",
  RED: "bg-rose-500",
};

// ── Format value helper ─────────────────────────────────────────────────────
function fmt(val: string | number | null, uom?: string | null): string {
  if (val == null) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return uom ? `${n.toFixed(2)} ${uom}` : n.toFixed(2);
}

// ── Trend icon ──────────────────────────────────────────────────────────────
function TrendIcon({ trend }: { trend: string | null }) {
  if (!trend) return <span className="text-slate-400">—</span>;
  const t = trend.toLowerCase();
  if (t.includes("up") || t.includes("improv") || t.includes("increas"))
    return (
      <span className="flex items-center gap-0.5 text-emerald-600 font-bold text-xs">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>Up
      </span>
    );
  if (t.includes("down") || t.includes("declin") || t.includes("decreas"))
    return (
      <span className="flex items-center gap-0.5 text-red-600 font-bold text-xs">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>Down
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-slate-500 font-bold text-xs">
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>Stable
    </span>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export function DMProjectReviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const toast = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<KpiSummary | null>(null);
  const [planId, setPlanId] = useState<string>("");
  const [pastReviews, setPastReviews] = useState<DMReview[]>([]);
  const [loading, setLoading] = useState(true);

  // Review form state
  const [periodLabel, setPeriodLabel] = useState("");
  const [dmComments, setDmComments] = useState("");
  const [actionItems, setActionItems] = useState<string[]>([""]);
  const [editReviewId, setEditReviewId] = useState<string | null>(null); // null = new review
  const [saving, setSaving] = useState(false);

  // Category expand state
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      const [proj, plan, reviews] = await Promise.all([
        getProject(projectId),
        getKpiPlan(projectId),
        listReviewsForProject(projectId),
      ]);
      setProject(proj);
      setPlanId(plan.id);

      const kpiSummary = await getKpiSummary(plan.id);
      setSummary(kpiSummary);
      setPastReviews(reviews);

      // Auto-expand all categories
      const cats = new Set(kpiSummary.metrics.map(m => m.metric_category || "Uncategorized"));
      setExpandedCats(cats);

      // Auto-suggest period label from today
      const today = new Date();
      const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      setPeriodLabel(`${MONTHS[today.getMonth()]} ${today.getFullYear()}`);
    } catch {
      toast.error("Failed to load project data");
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => { load(); }, [load]);

  // Group metrics by category
  const byCategory: Record<string, NonNullable<typeof summary>["metrics"]> = {};
  if (summary) {
    for (const m of summary.metrics) {
      const cat = m.metric_category || "Uncategorized";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(m);
    }
  }

  // Action items helpers
  const addActionItem = () => setActionItems(prev => [...prev, ""]);
  const updateActionItem = (idx: number, val: string) =>
    setActionItems(prev => prev.map((x, i) => (i === idx ? val : x)));
  const removeActionItem = (idx: number) =>
    setActionItems(prev => prev.filter((_, i) => i !== idx));

  // Load an existing review into edit mode
  const loadForEdit = (review: DMReview) => {
    setEditReviewId(review.id);
    setPeriodLabel(review.period_label);
    setDmComments(review.dm_comments || "");
    setActionItems(review.action_items.length > 0 ? review.action_items : [""]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditReviewId(null);
    setDmComments("");
    setActionItems([""]);
    const today = new Date();
    const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    setPeriodLabel(`${MONTHS[today.getMonth()]} ${today.getFullYear()}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodLabel.trim()) { toast.error("Period label is required"); return; }
    if (!dmComments.trim()) { toast.error("Please add your commentary before submitting"); return; }
    const cleanedItems = actionItems.map(a => a.trim()).filter(Boolean);
    setSaving(true);
    try {
      if (editReviewId) {
        const updated = await updateDMReview(editReviewId, {
          dm_comments: dmComments.trim(),
          action_items: cleanedItems,
        });
        setPastReviews(prev => prev.map(r => r.id === editReviewId ? updated : r));
        toast.success("Review updated");
      } else {
        const created = await createDMReview({
          project_id: projectId!,
          kpi_plan_id: planId,
          period_label: periodLabel.trim(),
          dm_comments: dmComments.trim(),
          action_items: cleanedItems,
        });
        setPastReviews(prev => [created, ...prev]);
        toast.success("Review submitted");
      }
      resetForm();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save review");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-1/3 rounded bg-slate-200" />
      <div className="h-32 rounded-xl bg-slate-200" />
      <div className="h-96 rounded-xl bg-slate-200" />
    </div>
  );

  return (
    <div className="space-y-6 text-slate-800">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/delivery-manager" className="text-xs text-slate-500 hover:text-slate-800">
            ← Back to Dashboard
          </Link>
          <h1 className="mt-1 text-xl font-bold text-slate-900">{project?.project_name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>{project?.business_unit_name}</span>
            <span className="text-slate-300">·</span>
            <span>{project?.account_name}</span>
            <span className="text-slate-300">·</span>
            <span>PM: {project?.project_manager_name || "—"}</span>
          </div>
        </div>
        {summary?.overall_rag && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Overall Health</span>
            <RagBadge rag={summary.overall_rag} showDot />
          </div>
        )}
      </div>

      {/* ── RAG Summary Strip ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Green",   count: summary.green_count,   dot: "bg-emerald-500", text: "text-emerald-700", border: "border-emerald-200 bg-emerald-50" },
            { label: "Amber",   count: summary.amber_count,   dot: "bg-amber-500",   text: "text-amber-700",   border: "border-amber-200 bg-amber-50" },
            { label: "Red",     count: summary.red_count,     dot: "bg-red-500",     text: "text-red-700",     border: "border-red-200 bg-red-50" },
            { label: "No Data", count: summary.no_data_count, dot: "bg-slate-300",   text: "text-slate-500",   border: "border-slate-200 bg-slate-50" },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border px-4 py-3 shadow-sm flex items-center gap-3 ${s.border}`}>
              <span className={`h-3 w-3 rounded-full shrink-0 ${s.dot}`} />
              <div>
                <p className={`text-xl font-extrabold ${s.text}`}>{s.count}</p>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Metrics by Category ── */}
      {summary && summary.metrics.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900">KPI Summary</h2>
          {Object.entries(byCategory).map(([cat, metrics]) => {
            const isOpen = expandedCats.has(cat);
            const catRags = metrics.map(m => m.rag_status).filter(Boolean);
            const catRag = catRags.includes("RED") ? "RED" : catRags.includes("AMBER") ? "AMBER" : catRags.length > 0 ? "GREEN" : null;
            return (
              <div key={cat} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Category row */}
                <button
                  type="button"
                  onClick={() => {
                    setExpandedCats(prev => {
                      const next = new Set(prev);
                      if (next.has(cat)) next.delete(cat); else next.add(cat);
                      return next;
                    });
                  }}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${catRag ? RAG_DOT[catRag] : "bg-slate-200"}`} />
                    <span className="text-sm font-semibold text-slate-800">{cat}</span>
                    <span className="text-[10px] text-slate-400">{metrics.length} metric{metrics.length !== 1 ? "s" : ""}</span>
                    {catRag && <RagBadge rag={catRag} />}
                  </div>
                  <svg className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Metrics table */}
                {isOpen && (
                  <div className="border-t border-slate-100 overflow-x-auto">
                    <table className="min-w-full text-xs divide-y divide-slate-100">
                      <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wide">
                        <tr>
                          <th className="px-4 py-2.5 text-left">Metric</th>
                          <th className="px-4 py-2.5 text-right">Latest Value</th>
                          <th className="px-4 py-2.5 text-right">Target</th>
                          <th className="px-4 py-2.5 text-center">RAG</th>
                          <th className="px-4 py-2.5 text-center">Trend</th>
                          <th className="px-4 py-2.5 text-left">Last Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {metrics.map(m => (
                          <tr key={m.plan_metric_id} className={`hover:bg-slate-50 ${m.rag_status === "RED" ? "bg-red-50/30" : ""}`}>
                            <td className="px-4 py-2.5 font-semibold text-slate-800 max-w-[220px]">
                              <p className="truncate" title={m.metric_name}>{m.metric_name}</p>
                              {m.uom && <p className="text-[9px] text-slate-400 font-normal">{m.uom}</p>}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                              {fmt(m.latest_value, null)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-slate-500">
                              {fmt(m.target, null)}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {m.rag_status
                                ? <div className="flex justify-center"><RagBadge rag={m.rag_status} showDot /></div>
                                : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <TrendIcon trend={m.trend} />
                            </td>
                            <td className="px-4 py-2.5 text-slate-500">
                              {m.last_updated
                                ? new Date(m.last_updated).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {summary && summary.metrics.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-400">No KPI measurements recorded yet for this project.</p>
        </div>
      )}

      {/* ── Review Form ── */}
      <div className="rounded-xl border border-indigo-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-indigo-50 border-b border-indigo-100">
          <h2 className="text-sm font-bold text-indigo-900">
            {editReviewId ? "Edit Review" : "Submit Your Review"}
          </h2>
          <p className="text-xs text-indigo-600 mt-0.5">
            Add your commentary on the KPI data for this reporting period. Action items are optional.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Period label */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              Reporting Period <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={periodLabel}
              onChange={e => setPeriodLabel(e.target.value)}
              placeholder="e.g. July 2026, Week of 30 Jun 2026, Q2 2026"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {/* DM Commentary */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              Commentary <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={dmComments}
              onChange={e => setDmComments(e.target.value)}
              placeholder="Summarise the project's KPI performance this period. Highlight RED metrics, risks, and any positive trends..."
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>

          {/* Action Items */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Action Items (optional)</label>
              <button
                type="button"
                onClick={addActionItem}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
              >
                + Add item
              </button>
            </div>
            <div className="space-y-2">
              {actionItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="text-xs text-slate-400 shrink-0 w-5 text-right">{idx + 1}.</span>
                  <input
                    type="text"
                    value={item}
                    onChange={e => updateActionItem(idx, e.target.value)}
                    placeholder={`Action item ${idx + 1}...`}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  {actionItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeActionItem(idx)}
                      className="text-slate-400 hover:text-red-500 cursor-pointer shrink-0"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit / Cancel */}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer transition-colors"
            >
              {saving ? "Saving..." : editReviewId ? "Update Review" : "Submit Review"}
            </button>
            {editReviewId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
            <p className="text-xs text-slate-400 ml-auto">Review is saved against this project</p>
          </div>
        </form>
      </div>

      {/* ── Past Reviews ── */}
      {pastReviews.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Review History</p>
            <span className="rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold px-2.5 py-0.5">
              {pastReviews.length} review{pastReviews.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {pastReviews.map(r => (
              <div key={r.id} className="px-5 py-4 space-y-3">
                {/* Review header */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="inline-block rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                      {r.period_label}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Reviewed by {r.reviewed_by_name || "—"} · {new Date(r.reviewed_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadForEdit(r)}
                    className="rounded px-2.5 py-1 text-[10px] font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Edit
                  </button>
                </div>

                {/* Commentary */}
                {r.dm_comments && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Commentary</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.dm_comments}</p>
                  </div>
                )}

                {/* Action items */}
                {r.action_items.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Action Items</p>
                    <ul className="space-y-1">
                      {r.action_items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
