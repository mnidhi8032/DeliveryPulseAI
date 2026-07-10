/**
 * DM Project Review Page — dark enterprise theme
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

const RAG_PILL: Record<string, string> = {
  GREEN: "bg-green-500 text-white",
  AMBER: "bg-amber-500 text-white",
  RED:   "bg-red-500 text-white",
};
const RAG_DOT_BG: Record<string, string> = {
  GREEN: "bg-green-500", AMBER: "bg-amber-400", RED: "bg-red-500",
};
const RAG_TEXT: Record<string, string> = {
  GREEN: "text-green-400", AMBER: "text-amber-400", RED: "text-red-400",
};
const RAG_LABEL: Record<string, string> = { GREEN: "Green", AMBER: "Amber", RED: "Red" };

function RagPill({ rag }: { rag: string | null }) {
  if (!rag || !RAG_PILL[rag]) return <span className="text-slate-500">—</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-semibold ${RAG_PILL[rag]}`}>
      {RAG_LABEL[rag]}
    </span>
  );
}

function RagDot({ rag }: { rag: string | null }) {
  if (!rag || !RAG_DOT_BG[rag]) return <span className="text-slate-500 text-sm">—</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${RAG_TEXT[rag]}`}>
      <span className={`h-2 w-2 rounded-full shrink-0 ${RAG_DOT_BG[rag]}`} />
      {RAG_LABEL[rag]}
    </span>
  );
}

function TrendLabel({ trend }: { trend: string | null }) {
  if (!trend) return <span className="text-slate-500">—</span>;
  const t = trend.toLowerCase();
  if (t.includes("up") || t.includes("improv") || t.includes("increas"))
    return <span className="text-green-400 text-sm">↑ Improving</span>;
  if (t.includes("down") || t.includes("declin") || t.includes("decreas"))
    return <span className="text-red-400 text-sm">↓ Declining</span>;
  return <span className="text-slate-400 text-sm">→ Stable</span>;
}

function fmt(val: string | number | null): string {
  if (val == null) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? "—" : n.toFixed(2);
}

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
      setProject(proj); setPlanId(plan.id);
      const s = await getKpiSummary(plan.id);
      setSummary(s); setPastReviews(reviews);
      setExpandedCats(new Set(s.metrics.map(m => m.metric_category || "Uncategorized")));
      const today = new Date();
      const M = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      setPeriodLabel(`${M[today.getMonth()]} ${today.getFullYear()}`);
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

  const addAI = () => setActionItems(p => [...p, ""]);
  const updAI = (i: number, v: string) => setActionItems(p => p.map((x, j) => j === i ? v : x));
  const remAI = (i: number) => setActionItems(p => p.filter((_, j) => j !== i));

  const loadForEdit = (r: DMReview) => {
    setEditReviewId(r.id); setPeriodLabel(r.period_label);
    setDmComments(r.dm_comments || "");
    setActionItems(r.action_items.length > 0 ? r.action_items : [""]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditReviewId(null); setDmComments(""); setActionItems([""]);
    const today = new Date();
    const M = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    setPeriodLabel(`${M[today.getMonth()]} ${today.getFullYear()}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodLabel.trim()) { toast.error("Period label is required"); return; }
    if (!dmComments.trim()) { toast.error("Please add your commentary"); return; }
    const items = actionItems.map(a => a.trim()).filter(Boolean);
    setSaving(true);
    try {
      if (editReviewId) {
        const u = await updateDMReview(editReviewId, { dm_comments: dmComments.trim(), action_items: items });
        setPastReviews(p => p.map(r => r.id === editReviewId ? u : r));
        toast.success("Review updated");
      } else {
        const c = await createDMReview({ project_id: projectId!, kpi_plan_id: planId, period_label: periodLabel.trim(), dm_comments: dmComments.trim(), action_items: items });
        setPastReviews(p => [c, ...p]);
        toast.success("Review submitted");
      }
      resetForm();
    } catch (err: any) { toast.error(err.response?.data?.detail || "Failed to save review"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-48 rounded-xl bg-slate-700" />
      <div className="h-28 rounded-2xl bg-slate-700" />
      <div className="h-80 rounded-2xl bg-slate-700" />
    </div>
  );

  return (
    <div className="space-y-7">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/delivery-manager" className="inline-flex items-center gap-1 text-sm text-sky-400 hover:text-sky-300">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white">{project?.project_name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <span className="bg-slate-700/60 rounded-full px-2.5 py-0.5">{project?.business_unit_name}</span>
            <span className="bg-slate-700/60 rounded-full px-2.5 py-0.5">{project?.account_name}</span>
            <span>PM: {project?.project_manager_name || "—"}</span>
          </div>
        </div>
        {summary?.overall_rag && (
          <div className="bg-[#252540] rounded-2xl border border-slate-700/50 px-5 py-3 flex items-center gap-3">
            <span className="text-xs text-slate-400">Overall health</span>
            <RagPill rag={summary.overall_rag} />
          </div>
        )}
      </div>

      {/* RAG tiles */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Green",   count: summary.green_count,   bg: "bg-green-500" },
            { label: "Amber",   count: summary.amber_count,   bg: "bg-amber-500" },
            { label: "Red",     count: summary.red_count,     bg: "bg-red-500"   },
            { label: "No data", count: summary.no_data_count, bg: "bg-slate-600" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl px-5 py-4`}>
              <p className="text-2xl font-bold text-white">{s.count}</p>
              <p className="text-xs text-white/70 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* KPI metrics */}
      {summary && summary.metrics.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-slate-200">KPI Summary</h2>
          {Object.entries(byCategory).map(([cat, metrics]) => {
            const isOpen = expandedCats.has(cat);
            const catRags = metrics.map(m => m.rag_status).filter(Boolean);
            const catRag = catRags.includes("RED") ? "RED" : catRags.includes("AMBER") ? "AMBER" : catRags.length > 0 ? "GREEN" : null;
            return (
              <div key={cat} className="bg-[#252540] rounded-2xl border border-slate-700/30 overflow-hidden">
                <button type="button"
                  onClick={() => setExpandedCats(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; })}
                  className="w-full flex items-center gap-3 px-6 py-4 hover:bg-slate-700/20 transition-colors cursor-pointer text-left">
                  {catRag && <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${RAG_DOT_BG[catRag] ?? "bg-slate-500"}`} />}
                  <span className="text-sm font-semibold text-slate-200 flex-1">{cat}</span>
                  <span className="text-xs text-slate-500 bg-slate-700/50 rounded-full px-2.5 py-0.5">
                    {metrics.length} metric{metrics.length !== 1 ? "s" : ""}
                  </span>
                  <svg className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-700/30 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-xs text-slate-500 border-b border-slate-700/30">
                        <tr>
                          <th className="px-6 py-2.5 text-left font-medium">Metric</th>
                          <th className="px-4 py-2.5 text-right font-medium">Value</th>
                          <th className="px-4 py-2.5 text-right font-medium">Target</th>
                          <th className="px-4 py-2.5 text-left font-medium pl-6">RAG</th>
                          <th className="px-4 py-2.5 text-left font-medium">Trend</th>
                          <th className="px-4 py-2.5 text-left font-medium">Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/20">
                        {metrics.map(m => (
                          <tr key={m.plan_metric_id} className="hover:bg-slate-700/20 transition-colors">
                            <td className="px-6 py-3 max-w-[220px]">
                              <p className="font-semibold text-slate-200 truncate" title={m.metric_name}>{m.metric_name}</p>
                              {m.uom && <p className="text-xs text-slate-500">{m.uom}</p>}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-white">{fmt(m.latest_value)}</td>
                            <td className="px-4 py-3 text-right text-slate-400">{fmt(m.target)}</td>
                            <td className="px-4 py-3 pl-6"><RagDot rag={m.rag_status} /></td>
                            <td className="px-4 py-3"><TrendLabel trend={m.trend} /></td>
                            <td className="px-4 py-3 text-slate-400">
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
        <div className="bg-[#252540] rounded-2xl border border-dashed border-slate-600 p-14 text-center">
          <p className="text-sm text-slate-400">No KPI measurements recorded yet for this project.</p>
        </div>
      )}

      {/* Review form */}
      <div className="bg-[#252540] rounded-2xl border border-slate-700/30 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/30">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 shrink-0">
            <svg className="h-4 w-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-200">{editReviewId ? "Edit Review" : "Submit Your Review"}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Add commentary for this reporting period.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Reporting period <span className="text-red-400">*</span></label>
            <input type="text" required value={periodLabel} onChange={e => setPeriodLabel(e.target.value)}
              placeholder="e.g. July 2026"
              className="rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Commentary <span className="text-red-400">*</span></label>
            <textarea required rows={4} value={dmComments} onChange={e => setDmComments(e.target.value)}
              placeholder="Summarise the project's KPI performance this period…"
              className="rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-400">Action items <span className="text-slate-600">(optional)</span></label>
              <button type="button" onClick={addAI} className="text-xs text-sky-400 hover:text-sky-300 cursor-pointer">+ Add item</button>
            </div>
            {actionItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <span className="text-xs text-slate-500 w-5 text-right shrink-0">{idx + 1}.</span>
                <input type="text" value={item} onChange={e => updAI(idx, e.target.value)}
                  placeholder={`Action item ${idx + 1}…`}
                  className="flex-1 rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50" />
                {actionItems.length > 1 && (
                  <button type="button" onClick={() => remAI(idx)} className="text-slate-600 hover:text-red-400 cursor-pointer shrink-0">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-slate-700/30">
            <button type="submit" disabled={saving}
              className="rounded-xl bg-orange-500 text-white px-6 py-2.5 text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 cursor-pointer shadow-sm transition-colors">
              {saving ? "Saving…" : editReviewId ? "Update review" : "Submit review"}
            </button>
            {editReviewId && (
              <button type="button" onClick={resetForm}
                className="rounded-xl border border-slate-600 bg-transparent px-5 py-2.5 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-500 cursor-pointer">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Past reviews */}
      {pastReviews.length > 0 && (
        <div className="bg-[#252540] rounded-2xl border border-slate-700/30 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/30">
            <h2 className="text-sm font-semibold text-slate-200">Review history</h2>
            <span className="rounded-full bg-slate-700/50 text-slate-400 text-xs px-3 py-1">
              {pastReviews.length} review{pastReviews.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="divide-y divide-slate-700/20">
            {pastReviews.map(r => (
              <div key={r.id} className="px-6 py-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="rounded-full bg-violet-500/20 text-violet-300 text-xs font-semibold px-3 py-1">{r.period_label}</span>
                    <p className="text-xs text-slate-500 mt-1.5">{r.reviewed_by_name || "—"} · {new Date(r.reviewed_at).toLocaleString()}</p>
                  </div>
                  <button type="button" onClick={() => loadForEdit(r)}
                    className="rounded-xl border border-slate-600 bg-transparent px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-500 cursor-pointer">
                    Edit
                  </button>
                </div>
                {r.dm_comments && (
                  <p className="text-sm text-slate-300 whitespace-pre-wrap border-l-2 border-orange-500/40 pl-4 py-1">{r.dm_comments}</p>
                )}
                {r.action_items.length > 0 && (
                  <ul className="space-y-1.5 pl-1">
                    {r.action_items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" />{item}
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
