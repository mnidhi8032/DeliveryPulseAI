/**
 * DH QPM Review Page — Delivery Head reviews and approves/rejects KPI Plans submitted by PMs.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { getProject } from "../../services/projectService";
import { getKpiPlan, reviewQpmPlan, getTracker, getKpiSummary } from "../../services/qpmService";
import type { Project } from "../../types/project";
import type { KpiPlan, KpiTrackerRow, KpiSummary } from "../../types/qpm";
import { RAG_STYLE } from "../../types/qpm";

function ragBadge(rag: string | null) {
  if (!rag) return <span className="text-xs text-slate-400">—</span>;
  const cls = RAG_STYLE[rag] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return <span className={`rounded px-2 py-0.5 text-xs font-bold border ${cls}`}>{rag}</span>;
}

export function DHQPMReviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const toast = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [plan, setPlan] = useState<KpiPlan | null>(null);
  const [tracker, setTracker] = useState<KpiTrackerRow[]>([]);
  const [summary, setSummary] = useState<KpiSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [reviewAction, setReviewAction] = useState<"APPROVE" | "REJECT" | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([getProject(projectId), getKpiPlan(projectId)])
      .then(async ([proj, p]) => {
        setProject(proj);
        setPlan(p);
        const [t, s] = await Promise.all([
          getTracker(p.id).catch(() => []),
          getKpiSummary(p.id).catch(() => null),
        ]);
        setTracker(t);
        setSummary(s);
      })
      .catch(() => toast.error("Failed to load KPI Plan"))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleReview = async () => {
    if (!plan || !reviewAction) return;
    setSubmitting(true);
    try {
      const updated = await reviewQpmPlan(plan.id, reviewAction, reviewComment || undefined);
      setPlan(updated);
      setReviewAction(null);
      setReviewComment("");
      toast.success(`KPI Plan ${reviewAction === "APPROVE" ? "approved" : "rejected"}. PM has been notified.`);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-1/3 rounded bg-slate-200" />
      <div className="h-64 rounded-xl bg-slate-200" />
    </div>
  );

  if (!plan || !project) return <p className="text-sm text-red-600">KPI Plan not found.</p>;

  const canReview = plan.qpm_status === "UNDER_REVIEW";

  return (
    <div className="space-y-6 text-slate-800">
      <div>
        <Link to="/delivery-head/submissions" className="text-xs text-slate-500 hover:text-slate-800">← Back to Submissions</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900">QPM KPI Plan Review</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-bold border ${
            plan.qpm_status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
            plan.qpm_status === "UNDER_REVIEW" ? "bg-amber-50 text-amber-700 border-amber-200" :
            plan.qpm_status === "REJECTED" ? "bg-rose-50 text-rose-700 border-rose-200" :
            "bg-slate-100 text-slate-600 border-slate-200"
          }`}>
            {plan.qpm_status}
          </span>
        </div>
      </div>

      {/* Project info */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm grid sm:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Project</p>
          <p className="font-semibold text-slate-900 mt-0.5">{project.project_name}</p>
          <p className="text-xs text-slate-500">{project.project_code} · {project.account_name}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Project Manager</p>
          <p className="text-slate-800 mt-0.5">{project.project_manager_name ?? "—"}</p>
          <p className="text-xs text-slate-500">{project.project_manager_email ?? ""}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Submitted</p>
          <p className="text-slate-800 mt-0.5">
            {plan.qpm_submitted_at ? new Date(plan.qpm_submitted_at).toLocaleString() : "—"}
          </p>
          <p className="text-xs text-slate-500">
            {plan.project_type} · {plan.delivery_process_model}
          </p>
        </div>
      </div>

      {/* PM Perception RAG */}
      {plan.pm_perception_rag && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">PM Overall Perception</p>
          <div className="flex items-center gap-3">
            {ragBadge(plan.pm_perception_rag)}
            {plan.pm_rag_comments && <p className="text-sm text-slate-700">{plan.pm_rag_comments}</p>}
          </div>
        </div>
      )}

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Metrics", value: summary.total_metrics, color: "text-slate-700" },
            { label: "GREEN", value: summary.green_count, color: "text-emerald-600" },
            { label: "AMBER", value: summary.amber_count, color: "text-amber-600" },
            { label: "RED", value: summary.red_count, color: "text-red-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-3 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* KPI Tracker table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">KPI Tracker — All Computed Metrics</p>
        </div>
        {tracker.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">No computed KPI data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-slate-100">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Metric</th>
                  <th className="px-4 py-3 text-left">Period</th>
                  <th className="px-4 py-3 text-left">Actual</th>
                  <th className="px-4 py-3 text-left">Target</th>
                  <th className="px-4 py-3 text-left">LSL</th>
                  <th className="px-4 py-3 text-left">USL</th>
                  <th className="px-4 py-3 text-left">RAG</th>
                  <th className="px-4 py-3 text-left">Analysis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tracker.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800 max-w-[180px]">
                      <div className="truncate">{row.metric}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.frequency_name ?? "—"}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {row.actual_value != null ? Number(row.actual_value).toFixed(2) : "—"}
                      {row.uom && <span className="text-[10px] text-slate-400 ml-1">{row.uom}</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{row.target ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.lsl ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.usl ?? "—"}</td>
                    <td className="px-4 py-3">{ragBadge(row.rag_status)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px]">
                      <div className="truncate">{row.analysis_comments ?? "—"}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review action */}
      {canReview && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Review Decision</h2>
          <div className="flex gap-3 mb-4">
            <button type="button"
              onClick={() => setReviewAction(reviewAction === "APPROVE" ? null : "APPROVE")}
              className={`rounded-lg px-5 py-2.5 text-sm font-bold border transition cursor-pointer ${
                reviewAction === "APPROVE"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              }`}>
              ✓ Approve
            </button>
            <button type="button"
              onClick={() => setReviewAction(reviewAction === "REJECT" ? null : "REJECT")}
              className={`rounded-lg px-5 py-2.5 text-sm font-bold border transition cursor-pointer ${
                reviewAction === "REJECT"
                  ? "bg-rose-600 text-white border-rose-600"
                  : "bg-white text-rose-700 border-rose-300 hover:bg-rose-50"
              }`}>
              ✗ Reject
            </button>
          </div>

          {reviewAction && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Review Comments {reviewAction === "REJECT" && <span className="text-red-500">*</span>}
                </label>
                <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                  rows={3} placeholder={reviewAction === "APPROVE" ? "Optional comments…" : "Reason for rejection (required)…"}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
              </div>
              <button type="button"
                disabled={submitting || (reviewAction === "REJECT" && !reviewComment.trim())}
                onClick={handleReview}
                className={`rounded-lg px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50 cursor-pointer transition-colors ${
                  reviewAction === "APPROVE" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                }`}>
                {submitting ? "Submitting…" : reviewAction === "APPROVE" ? "Confirm Approval" : "Confirm Rejection"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Already reviewed */}
      {plan.qpm_status === "APPROVED" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-bold">✓ KPI Plan approved.</p>
          {plan.qpm_approved_at && <p className="text-xs mt-1">{new Date(plan.qpm_approved_at).toLocaleString()}</p>}
          {plan.qpm_review_comments && <p className="mt-1 text-emerald-700">{plan.qpm_review_comments}</p>}
        </div>
      )}
      {plan.qpm_status === "REJECTED" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-bold">✗ KPI Plan rejected.</p>
          {plan.qpm_review_comments && <p className="mt-1">{plan.qpm_review_comments}</p>}
        </div>
      )}
    </div>
  );
}
