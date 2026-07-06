/**
 * Delivery Manager Dashboard — projects with review status badges.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listProjects } from "../../services/projectService";
import { getProjectReviewStatuses } from "../../services/dmReviewService";
import type { Project } from "../../types/project";
import type { ProjectReviewStatus } from "../../services/dmReviewService";
import { RagBadge } from "../../components/RagBadge";

export function DMDashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [reviewStatuses, setReviewStatuses] = useState<Map<string, ProjectReviewStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listProjects(), getProjectReviewStatuses()])
      .then(([projs, statuses]) => {
        setProjects(projs.sort((a, b) => a.project_name.localeCompare(b.project_name)));
        setReviewStatuses(new Map(statuses.map(s => [s.project_id, s])));
      })
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-1/3 rounded bg-slate-200" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-slate-200" />)}
      </div>
      <div className="h-64 rounded-xl bg-slate-200" />
    </div>
  );

  if (error) return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
      <p className="text-sm font-medium text-red-800">{error}</p>
    </div>
  );

  // Group projects by account
  const byAccount: Record<string, { accountName: string; buName: string; projects: Project[] }> = {};
  for (const p of projects) {
    if (!byAccount[p.account_id]) {
      byAccount[p.account_id] = { accountName: p.account_name, buName: p.business_unit_name, projects: [] };
    }
    byAccount[p.account_id].projects.push(p);
  }

  const needsReviewCount = [...reviewStatuses.values()].filter(s => s.needs_review).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Delivery Manager Dashboard</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Monitor KPI health across your assigned accounts. Review and comment on metric data.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Projects</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{projects.length}</p>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm text-center ${needsReviewCount > 0 ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Needs Review</p>
          <p className={`text-2xl font-extrabold mt-1 ${needsReviewCount > 0 ? "text-amber-700" : "text-slate-900"}`}>
            {needsReviewCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Accounts</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{Object.keys(byAccount).length}</p>
        </div>
      </div>

      {/* Needs review alert */}
      {needsReviewCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
            <svg className="h-4 w-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800">
              {needsReviewCount} project{needsReviewCount !== 1 ? "s" : ""} have new metric data since your last review
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Click "Review KPIs" next to each project to add commentary and action items.
            </p>
          </div>
        </div>
      )}

      {/* Projects grouped by account */}
      <div>
        <p className="text-sm font-bold text-slate-900 mb-3">My Projects</p>

        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-500 font-semibold">No projects assigned to your accounts yet</p>
            <p className="text-xs text-slate-400 mt-1">Contact your Platform Admin to assign accounts to your profile.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(byAccount).map(([, group]) => (
              <div key={group.accountName} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Account header */}
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{group.accountName}</p>
                    <p className="text-xs text-slate-500">{group.buName}</p>
                  </div>
                  <span className="ml-auto rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                    {group.projects.length} project{group.projects.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Projects table */}
                <table className="min-w-full text-sm divide-y divide-slate-100">
                  <thead className="bg-slate-50 text-xs text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Project</th>
                      <th className="px-4 py-2.5 text-left">PM</th>
                      <th className="px-4 py-2.5 text-left">Health</th>
                      <th className="px-4 py-2.5 text-left">Review Status</th>
                      <th className="px-4 py-2.5 text-left">Last Reviewed</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.projects.map(p => {
                      const rs = reviewStatuses.get(p.id);
                      const needsReview = rs?.needs_review ?? false;
                      return (
                        <tr key={p.id} className={`hover:bg-slate-50 ${needsReview ? "bg-amber-50/40" : ""}`}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">{p.project_name}</p>
                            <p className="text-[10px] font-mono text-slate-400">{p.project_code}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{p.project_manager_name || "—"}</td>
                          <td className="px-4 py-3">
                            {p.current_rag
                              ? <RagBadge rag={p.current_rag} showDot />
                              : <span className="text-slate-300 text-xs">No data</span>}
                          </td>
                          <td className="px-4 py-3">
                            {needsReview ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Needs Review
                              </span>
                            ) : rs?.last_reviewed_at ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Up to date
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">Not reviewed yet</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {rs?.last_reviewed_at
                              ? new Date(rs.last_reviewed_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
                              : "—"}
                            {rs?.last_review_period && (
                              <p className="text-[10px] text-slate-400 mt-0.5">{rs.last_review_period}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              to={`/delivery-manager/projects/${p.id}/review`}
                              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                needsReview
                                  ? "bg-amber-500 text-white hover:bg-amber-600"
                                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {needsReview ? "Review KPIs →" : "View KPIs"}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
