/**
 * Delivery Head -- Projects in their BU, read-only.
 * Shows QPM Review link when a project's KPI plan is UNDER_REVIEW.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listProjects } from "../../services/projectService";
import { getKpiPlan } from "../../services/qpmService";
import type { Project } from "../../types/project";
import type { KpiPlan } from "../../types/qpm";
import { RagBadge } from "../../components/RagBadge";

export function DeliveryHeadProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [planStatuses, setPlanStatuses] = useState<Record<string, KpiPlan>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listProjects()
      .then(async (projs) => {
        setProjects(projs);
        // Fetch QPM plan status for each project in parallel
        const entries = await Promise.all(
          projs.map(async (p) => {
            try {
              const plan = await getKpiPlan(p.id);
              return [p.id, plan] as [string, KpiPlan];
            } catch {
              return null;
            }
          })
        );
        const map: Record<string, KpiPlan> = {};
        for (const e of entries) {
          if (e) map[e[0]] = e[1];
        }
        setPlanStatuses(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p =>
    !search ||
    p.project_name.toLowerCase().includes(search.toLowerCase()) ||
    p.project_code.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="h-64 rounded-xl bg-slate-200 animate-pulse" />;

  const pendingReviewCount = Object.values(planStatuses).filter(p => p.qpm_status === "UNDER_REVIEW").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Delivery Head Projects</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Read-only — {projects.length} projects in your BU
            {pendingReviewCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">
                {pendingReviewCount} QPM pending review
              </span>
            )}
          </p>
        </div>
        <input
          type="text" placeholder="Search..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full text-sm divide-y divide-slate-100">
          <thead className="bg-slate-50 text-xs text-slate-500 font-semibold uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Project Name</th>
              <th className="px-4 py-3 text-left">Account</th>
              <th className="px-4 py-3 text-left">Project Manager</th>
              <th className="px-4 py-3 text-left">Health</th>
              <th className="px-4 py-3 text-left">QPM Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No projects found.</td></tr>
            ) : filtered.map(p => {
              const plan = planStatuses[p.id];
              const qpmStatus = plan?.qpm_status ?? null;
              const needsReview = qpmStatus === "UNDER_REVIEW";

              return (
                <tr key={p.id} className={`hover:bg-slate-50 ${needsReview ? "bg-amber-50/40" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.project_code}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{p.project_name}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.account_name || "--"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.project_manager_name || "--"}</td>
                  <td className="px-4 py-3">
                    {p.current_rag ? <RagBadge rag={p.current_rag} showDot /> : <span className="text-slate-300 text-xs">--</span>}
                  </td>
                  <td className="px-4 py-3">
                    {qpmStatus ? (
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                        qpmStatus === "APPROVED"     ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        qpmStatus === "UNDER_REVIEW" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        qpmStatus === "REJECTED"     ? "bg-rose-50 text-rose-700 border-rose-200" :
                        "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        {qpmStatus === "UNDER_REVIEW" ? "⏳ Pending Review" : qpmStatus}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/delivery-head/projects/${p.id}/timeline`}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Timeline
                      </Link>
                      {qpmStatus && (
                        <Link
                          to={`/delivery-head/projects/${p.id}/qpm-review`}
                          className={`rounded px-2.5 py-1 text-xs font-bold transition ${
                            needsReview
                              ? "bg-amber-500 text-white hover:bg-amber-600"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {needsReview ? "Review QPM ↗" : "View QPM"}
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
