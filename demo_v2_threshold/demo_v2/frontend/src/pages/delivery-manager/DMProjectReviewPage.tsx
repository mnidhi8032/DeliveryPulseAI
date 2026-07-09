/**
 * DM Project Review Page
 */
import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { getProject } from "../../services/projectService";
import { getKpiPlan, getKpiSummary } from "../../services/qpmService";
import { listReviewsForProject, createDMReview, updateDMReview } from "../../services/dmReviewService";
import type { Project } from "../../types/project";
import type { KpiSummary } from "../../types/qpm";
import type { DMReview } from "../../services/dmReviewService";
import { RAG_STYLE as _RAG_STYLE } from "../../types/qpm";

const RAG_CFG: Record<string, { dot: string; text: string; pill: string; label: string }> = {
  GREEN: { dot: "bg-emerald-500", text: "text-emerald-700", pill: "bg-emerald-100 text-emerald-700", label: "Green" },
  AMBER: { dot: "bg-amber-400",   text: "text-amber-700",   pill: "bg-amber-100 text-amber-700",     label: "Amber" },
  RED:   { dot: "bg-rose-500",    text: "text-rose-700",    pill: "bg-rose-100 text-rose-700",        label: "Red"   },
};

function RagPill({ rag }: { rag: string | null }) {
  if (!rag || !RAG_CFG[rag]) return <span className="text-slate-400">—</span>;
  const { dot, pill, label } = RAG_CFG[rag];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  );
}

function TrendLabel({ trend }: { trend: string | null }) {
  if (!trend) return <span className="text-slate-400">—</span>;
  const t = trend.toLowerCase();
  if (t.includes("up") || t.includes("improv") || t.includes("increas"))
    return <span className="text-emerald-600 text-sm font-medium">↑ Improving</span>;
  if (t.includes("down") || t.includes("declin") || t.includes("decreas"))
    return <span className="text-rose-600 text-sm font-medium">↓ Declining</span>;
  return <span className="text-slate-500 text-sm">→ Stable</span>;
}

function fmt(val: string | number | null): string {
  if (val == null) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? "—" : n.toFixed(2);
}

const CAT_RAG_DOT: Record<string, string> = { GREEN: "bg-emerald-500", AMBER: "bg-amber-400", RED: "bg-rose-500" };

export function DMProjectReviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const toast = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<KpiSummary | null>(null);
  const [planId, setPlanId] = useState<string>("");
  const [pastReviews, setPastReviews] = useState<DMReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodLabel, setPeriodLabel] = useState("");
  const [dmComments, setDmComments] = useState("");
  const [actionItems, setActionItems] = useState<string[]>([""]);
  const [editReviewId, setEditReviewId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      const [proj, plan, reviews] = await Promise.all([
        getProject(projectId), getKpiPlan(projectId), listReviewsForProject(projectId),
      ]);
      setProject(proj);
      setPlanId(plan.id);
      const kpiSummary = await getKpiSummary(plan.id);
      setSummary(kpiSummary);
      setPastReviews(reviews);
      setExpandedCats(new Set(kpiSummary.metrics.map(m => m.metric_category || "Uncategorized")));
      const today = new Date();
      const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      setPeriodLabel(`${MONTHS[today.getMonth()]} ${today.getFullYear()}`);
    } catch { toast.error("Failed to load project data"); }
    finally { setLoading(false); }
  }, [projectId, toast]);

  useEffect(() => { load(); }, [load]);

  const byCategory: Record<string, NonNullable<typeof summary>["metrics"]> = {};
  if (summary) {
    for (const m of summary.metrics) {
      const cat = m.metric_category || "Uncategorized";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(m);
    }
  }

  const addActionItem = () => setActionItems(p => [...p, ""]);
  const updateActionItem = (i: number, v: string) => setActionItems(p => p.map((x, j) => j === i ? v : x));
  const removeActionItem = (i: number) => setActionItems(p => p.filter((_, j) => j !== i));

  const loadForEdit = (r: DMReview) => {
    setEditReviewId(r.id); setPeriodLabel(r.period_label);
    setDmComments(r.dm_comments || "");
    setActionItems(r.action_items.length > 0 ? r.action_items : [""]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditReviewId(null); setDmComments(""); setActionItems([""]);
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
        const updated = await updateDMReview(editReviewId, { dm_comments: dmComments.trim(), action_items: cleanedItems });
        setPastReviews(p => p.map(r => r.id === editReviewId ? updated : r));
        toast.success("Review updated");
      } else {
        const created = await createDMReview({ project_id: projectId!, kpi_plan_id: planId, period_label: periodLabel.trim(), dm_comments: dmComments.trim(), action_items: cleanedItems });
        setPastReviews(p => [created, ...p]);
        toast.success("Review submitted");
      }
      resetForm();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save review");
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse p-1">
      <div className="h-7 w-48 rounded-xl bg-slate-200" />
      <div className="h-28 rounded-2xl bg-slate-200" />
      <div className="h-80 rounded-2xl bg-slate-200" />
    </div>
  );

  return (
    <div className="min-h-full bg-teal-50/40 -mx-8 -my-6 px-8 py-8 space-y-7">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/delivery-manager" className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-800 font-medium">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{project?.project_name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className="bg-slate-100 rounded-full px-2.5 py-0.5">{project?.business_unit_name}</span>
            <span className="bg-slate-100 rounded-full px-2.5 py-0.5">{project?.account_name}</span>
            <span className="text-slate-400">PM: {project?.project_manager_name || "—"}</span>
          </div>
        </div>
        {summary?.overall_rag && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3 flex items-center gap-3">
            <div>
              <p className="text-xs text-slate-400">Overall health</p>
              <RagPill rag={summary.overall_rag} />
            </div>
          </div>
        )}
      </div>

      {/* RAG summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Green",   count: summary.green_count,   bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
            { label: "Amber",   count: summary.amber_count,   bg: "bg-amber-50",    text: "text-amber-700",   dot: "bg-amber-400"   },
            { label: "Red",     count: summary.red_count,     bg: "bg-rose-50",     text: "text-rose-700",    dot: "bg-rose-500"    },
            { label: "No data", count: summary.no_data_count, bg: "bg-slate-50",    text: "text-slate-500",   dot: "bg-slate-300"   },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl ${s.bg} border border-white shadow-sm px-5 py-4 flex items-center gap-3`}>
              <span className={`h-3 w-3 rounded-full shrink-0 ${s.dot}`} />
              <div>
                <p className={`text-2xl font-semibold ${s.text}`}>{s.count}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPI metrics by category */}
      {summary && summary.metrics.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-slate-700">KPI Summary</h2>
          {Object.entries(byCategory).map(([cat, metrics]) => {
            const isOpen = expandedCats.has(cat);
            const catRags = metrics.map(m => m.rag_status).filter(Boolean);
            const catRag = catRags.includes("RED") ? "RED" : catRags.includes("AMBER") ? "AMBER" : catRags.length > 0 ? "GREEN" : null;
            return (
              <div key={cat} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button type="button"
                  onClick={() => setExpandedCats(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; })}
                  className="w-full flex items-center gap-3 px-6 py-4 hover:bg-slate-50/60 transition-colors cursor-pointer text-left">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${catRag ? CAT_RAG_DOT[catRag] : "bg-slate-200"}`} />
                  <span className="text-sm font-semibold text-slate-800 flex-1">{cat}</span>
                  <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5">
                    {metrics.length} metric{metrics.length !== 1 ? "s" : ""}
                  </span>
                  <svg className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-xs text-slate-400 bg-slate-50/60 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-2.5 text-left font-medium">Metric</th>
                          <th className="px-4 py-2.5 text-right font-medium">Value</th>
                          <th className="px-4 py-2.5 text-right font-medium">Target</th>
                          <th className="px-4 py-2.5 text-left font-medium pl-6">RAG</th>
                          <th className="px-4 py-2.5 text-left font-medium">Trend</th>
                          <th className="px-4 py-2.5 text-left font-medium">Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {metrics.map(m => (
                          <tr key={m.plan_metric_id} className="hover:bg-teal-50/30 transition-colors">
                            <td className="px-6 py-3 max-w-[220px]">
                              <p className="font-semibold text-slate-800 truncate" title={m.metric_name}>{m.metric_name}</p>
                              {m.uom && <p className="text-xs text-slate-400">{m.uom}</p>}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmt(m.latest_value)}</td>
                            <td className="px-4 py-3 text-right text-slate-500">{fmt(m.target)}</td>
                            <td className="px-4 py-3 pl-6"><RagPill rag={m.rag_status} /></td>
                            <td className="px-4 py-3"><TrendLabel trend={m.trend} /></td>
                            <td className="px-4 py-3 text-slate-500">
                              {m.last_updated ? new Date(m.last_updated).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—"}
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
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-14 text-center shadow-sm">
          <p className="text-sm text-slate-400">No KPI measurements recorded yet for this project.</p>
        </div>
      )}

      {/* Review form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 bg-emerald-50/40">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 shrink-0">
            <svg className="h-4 w-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">{editReviewId ? "Edit Review" : "Submit Your Review"}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Add commentary for this reporting period. Action items are optional.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">Reporting period <span className="text-rose-400">*</span></label>
            <input type="text" required value={periodLabel} onChange={e => setPeriodLabel(e.target.value)}
              placeholder="e.g. July 2026"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-slate-50 focus:bg-white" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">Commentary <span className="text-rose-400">*</span></label>
            <textarea required rows={4} value={dmComments} onChange={e => setDmComments(e.target.value)}
              placeholder="Summarise the project's KPI performance this period…"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-slate-50 focus:bg-white resize-none" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600">Action items <span className="text-slate-400">(optional)</span></label>
              <button type="button" onClick={addActionItem}
                className="text-xs text-emerald-600 hover:text-emerald-800 font-medium cursor-pointer">+ Add item</button>
            </div>
            {actionItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <span className="text-xs text-slate-400 w-5 text-right shrink-0">{idx + 1}.</span>
                <input type="text" value={item} onChange={e => updateActionItem(idx, e.target.value)}
                  placeholder={`Action item ${idx + 1}…`}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-slate-50 focus:bg-white" />
                {actionItems.length > 1 && (
                  <button type="button" onClick={() => removeActionItem(idx)}
                    className="text-slate-300 hover:text-rose-400 cursor-pointer shrink-0">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <button type="submit" disabled={saving}
              className="rounded-xl bg-emerald-600 text-white px-6 py-2.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-sm transition-colors">
              {saving ? "Saving…" : editReviewId ? "Update review" : "Submit review"}
            </button>
            {editReviewId && (
              <button type="button" onClick={resetForm}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Past reviews */}
      {pastReviews.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Review history</h2>
            <span className="rounded-full bg-slate-100 text-slate-500 text-xs px-3 py-1">
              {pastReviews.length} review{pastReviews.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {pastReviews.map(r => (
              <div key={r.id} className="px-6 py-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1">{r.period_label}</span>
                    <p className="text-xs text-slate-400 mt-1.5">{r.reviewed_by_name || "—"} · {new Date(r.reviewed_at).toLocaleString()}</p>
                  </div>
                  <button type="button" onClick={() => loadForEdit(r)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer">
                    Edit
                  </button>
                </div>
                {r.dm_comments && (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap border-l-2 border-emerald-200 pl-4 bg-emerald-50/30 py-2 rounded-r-lg">{r.dm_comments}</p>
                )}
                {r.action_items.length > 0 && (
                  <ul className="space-y-1.5 pl-1">
                    {r.action_items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />{item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
