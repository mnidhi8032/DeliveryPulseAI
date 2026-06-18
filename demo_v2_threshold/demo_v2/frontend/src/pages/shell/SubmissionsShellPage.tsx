/**
 * Submissions History — shows KPI Plan submissions (QPM workflow) as the primary record.
 * This replaces the old governance draft submission view.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listProjects } from "../../services/projectService";
import { getKpiPlan, getKpiSummary } from "../../services/qpmService";
import type { KpiPlan, KpiSummary } from "../../types/qpm";
import type { Project } from "../../types/project";

interface QPMSubmissionRow {
  project_id: string;
  project_code: string;
  project_name: string;
  plan_id: string;
  qpm_status: string;
  is_finalized: boolean;
  metrics_count: number;
  green: number;
  amber: number;
  red: number;
  no_data: number;
  pm_perception_rag: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  review_comments: string | null;
}

function qpmStatusBadge(status: string) {
  const styles: Record<string, string> = {
    DRAFT:        "bg-slate-100 text-slate-600 border-slate-200",
    UNDER_REVIEW: "bg-blue-100 text-blue-700 border-blue-200",
    APPROVED:     "bg-emerald-100 text-emerald-700 border-emerald-200",
    REJECTED:     "bg-rose-100 text-rose-700 border-rose-200",
  };
  const labels: Record<string, string> = {
    DRAFT: "● Draft",
    UNDER_REVIEW: "⏳ Under Review",
    APPROVED: "✓ Approved",
    REJECTED: "✗ Rejected",
  };
  const cls = styles[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded border ${cls}`}>
      {labels[status] ?? status}
    </span>
  );
}

function ragBadge(r: string | null) {
  if (!r) return <span className="text-xs text-slate-400">—</span>;
  const m: Record<string, string> = {
    RED: "bg-red-100 text-red-700 border-red-200",
    AMBER: "bg-amber-100 text-amber-700 border-amber-200",
    GREEN: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded border ${m[r] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {r}
    </span>
  );
}

export function SubmissionsShellPage() {
  const [rows, setRows] = useState<QPMSubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProjects()
      .then(async (projects: Project[]) => {
        // Show rows immediately with skeleton data
        const initial: QPMSubmissionRow[] = projects.map((p) => ({
          project_id: p.id,
          project_code: p.project_code,
          project_name: p.project_name,
          plan_id: "",
          qpm_status: "—",
          is_finalized: false,
          metrics_count: 0,
          green: 0, amber: 0, red: 0, no_data: 0,
          pm_perception_rag: null,
          submitted_at: null,
          approved_at: null,
          review_comments: null,
        }));
        setRows(initial);
        setLoading(false);

        // Load plan + summary for each project
        const loaded: QPMSubmissionRow[] = await Promise.all(
          projects.map(async (p) => {
            try {
              const plan: KpiPlan = await getKpiPlan(p.id);
              let summary: KpiSummary | null = null;
              try {
                summary = await getKpiSummary(plan.id);
              } catch { /* no data yet */ }

              return {
                project_id: p.id,
                project_code: p.project_code,
                project_name: p.project_name,
                plan_id: plan.id,
                qpm_status: plan.qpm_status,
                is_finalized: plan.is_finalized,
                metrics_count: plan.metrics.length,
                green: summary?.green_count ?? 0,
                amber: summary?.amber_count ?? 0,
                red: summary?.red_count ?? 0,
                no_data: summary?.no_data_count ?? 0,
                pm_perception_rag: plan.pm_perception_rag,
                submitted_at: plan.qpm_submitted_at
                  ? new Date(plan.qpm_submitted_at).toLocaleDateString()
                  : null,
                approved_at: plan.qpm_approved_at
                  ? new Date(plan.qpm_approved_at).toLocaleDateString()
                  : null,
                review_comments: plan.qpm_review_comments,
              } as QPMSubmissionRow;
            } catch {
              return {
                project_id: p.id,
                project_code: p.project_code,
                project_name: p.project_name,
                plan_id: "",
                qpm_status: "NO PLAN",
                is_finalized: false,
                metrics_count: 0,
                green: 0, amber: 0, red: 0, no_data: 0,
                pm_perception_rag: null,
                submitted_at: null,
                approved_at: null,
                review_comments: null,
              } as QPMSubmissionRow;
            }
          })
        );

        // Sort: APPROVED first, then UNDER_REVIEW, REJECTED, DRAFT
        const order: Record<string, number> = { APPROVED: 0, UNDER_REVIEW: 1, REJECTED: 2, DRAFT: 3 };
        loaded.sort((a, b) => (order[a.qpm_status] ?? 9) - (order[b.qpm_status] ?? 9));
        setRows(loaded);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load KPI Plan submissions.");
        setLoading(false);
      });
  }, []);

  const approvedCount = rows.filter(r => r.qpm_status === "APPROVED").length;
  const rejectedCount = rows.filter(r => r.qpm_status === "REJECTED").length;
  const underReviewCount = rows.filter(r => r.qpm_status === "UNDER_REVIEW").length;

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">KPI Plan Submissions</h1>
      <p className="mt-1 text-sm text-slate-600">
        Status of your KPI Plans submitted to the Delivery Head for review.
      </p>

      {/* Status banners */}
      {!loading && approvedCount > 0 && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-3">
          <svg className="h-5 w-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-emerald-800 font-semibold">
            {approvedCount} KPI Plan{approvedCount > 1 ? "s" : ""} approved by Delivery Head.
          </p>
        </div>
      )}
      {!loading && rejectedCount > 0 && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 flex items-center gap-3">
          <svg className="h-5 w-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-rose-800 font-semibold">
            {rejectedCount} KPI Plan{rejectedCount > 1 ? "s" : ""} rejected — go to KPI Data Entry to revise and resubmit.
          </p>
        </div>
      )}
      {!loading && underReviewCount > 0 && (
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-center gap-3">
          <svg className="h-5 w-5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-800 font-semibold">
            {underReviewCount} KPI Plan{underReviewCount > 1 ? "s" : ""} under Delivery Head review. You will be notified on approval.
          </p>
        </div>
      )}

      {loading ? (
        <div className="mt-6 space-y-3 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-slate-200" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm text-slate-500 font-medium">No projects assigned yet.</p>
          <Link to="/pm/projects" className="mt-3 inline-block rounded bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition">
            Go to My Projects
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">Project</th>
                <th className="px-4 py-3 font-medium text-slate-700">KPI Plan Status</th>
                <th className="px-4 py-3 font-medium text-slate-700">Metrics</th>
                <th className="px-4 py-3 font-medium text-slate-700">RAG Summary</th>
                <th className="px-4 py-3 font-medium text-slate-700">PM Perception</th>
                <th className="px-4 py-3 font-medium text-slate-700">Submitted On</th>
                <th className="px-4 py-3 font-medium text-slate-700">Approved On</th>
                <th className="px-4 py-3 font-medium text-slate-700">DH Comments</th>
                <th className="px-4 py-3 font-medium text-slate-700" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.project_id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors ${
                  row.qpm_status === "APPROVED" ? "bg-emerald-50/40" :
                  row.qpm_status === "REJECTED" ? "bg-rose-50/30" :
                  row.qpm_status === "UNDER_REVIEW" ? "bg-blue-50/20" : ""
                }`}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{row.project_name}</div>
                    <div className="font-mono text-xs text-slate-500">{row.project_code}</div>
                  </td>
                  <td className="px-4 py-3">
                    {row.qpm_status === "—" || row.qpm_status === "NO PLAN"
                      ? <span className="text-xs text-slate-400">No plan yet</span>
                      : qpmStatusBadge(row.qpm_status)
                    }
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-semibold">
                    {row.metrics_count > 0 ? `${row.metrics_count} selected` : <span className="text-slate-400">None</span>}
                  </td>
                  <td className="px-4 py-3">
                    {row.metrics_count > 0 ? (
                      <div className="flex gap-2 text-xs font-bold">
                        {row.green > 0 && <span className="text-emerald-600">G:{row.green}</span>}
                        {row.amber > 0 && <span className="text-amber-600">A:{row.amber}</span>}
                        {row.red > 0 && <span className="text-red-600">R:{row.red}</span>}
                        {row.no_data > 0 && <span className="text-slate-400">—:{row.no_data}</span>}
                        {row.green === 0 && row.amber === 0 && row.red === 0 && (
                          <span className="text-slate-400 font-normal">No data entered</span>
                        )}
                      </div>
                    ) : <span className="text-slate-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">{ragBadge(row.pm_perception_rag)}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {row.submitted_at ?? <span className="text-slate-400">Not submitted</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {row.approved_at
                      ? <span className="font-semibold text-emerald-700">{row.approved_at}</span>
                      : <span className="text-slate-400">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-[180px]">
                    {row.review_comments
                      ? <span className="line-clamp-2" title={row.review_comments}>{row.review_comments}</span>
                      : <span className="text-slate-400">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.plan_id ? (
                      <Link
                        to={`/pm/projects/${row.project_id}/qpm/entry`}
                        className={`rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors ${
                          row.qpm_status === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700" :
                          row.qpm_status === "REJECTED" ? "bg-rose-600 hover:bg-rose-700" :
                          row.qpm_status === "UNDER_REVIEW" ? "bg-blue-600 hover:bg-blue-700" :
                          "bg-slate-900 hover:bg-slate-800"
                        }`}
                      >
                        {row.qpm_status === "APPROVED" ? "View KPI Plan" :
                         row.qpm_status === "REJECTED" ? "Revise & Resubmit" :
                         row.qpm_status === "UNDER_REVIEW" ? "View Progress" :
                         "Enter Data →"}
                      </Link>
                    ) : (
                      <Link to={`/pm/projects/${row.project_id}/qpm`}
                        className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">
                        Setup KPI Plan
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
