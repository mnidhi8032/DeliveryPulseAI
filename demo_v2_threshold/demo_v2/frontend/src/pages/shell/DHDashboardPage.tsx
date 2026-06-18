import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { listSubmissions } from "../../services/submissionService";
import { listProjects } from "../../services/projectService";
import { listGovernancePeriods } from "../../services/governanceService";
import { getSubmissionHealth } from "../../services/metricService";
import { getKpiPlan } from "../../services/qpmService";
import { formatStatus, getStatusBadgeClass } from "../../utils/formatters";
import { RagBadge } from "../../components/RagBadge";
import type { KpiPlan } from "../../types/qpm";

interface PendingReviewItem {
  id: string;
  project_name: string;
  period_name: string;
  status_code: string;
  rag_status: string | null;
  overall_score: number | null;
  submitted_date: string;
}

interface PendingQPMItem {
  project_id: string;
  project_name: string;
  pm_name: string | null;
  qpm_submitted_at: string;
  pm_perception_rag: string | null;
  plan_id: string;
}

export function DHDashboardPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<PendingReviewItem[]>([]);
  const [pendingQpm, setPendingQpm] = useState<PendingQPMItem[]>([]);
  const [stats, setStats] = useState({ totalProjects: 0, pendingCount: 0, approvedCount: 0, pendingQpmCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      listSubmissions(),
      listProjects(),
      listGovernancePeriods().catch(() => []),
    ])
      .then(async ([subs, projs, periods]) => {
        const periodMap = new Map(periods.map((p) => [p.id, p]));

        const pendingReviews: PendingReviewItem[] = [];
        let approved = 0;

        await Promise.all(
          subs.map(async (s) => {
            const project = projs.find((p) => p.id === s.project_id);
            if (!project) return;

            if (s.status_code === "APPROVED" || s.status_code === "LOCKED") {
              approved++;
              return;
            }

            if (s.status_code === "SUBMITTED" || s.status_code === "UNDER_REVIEW") {
              let rStatus: string | null = null;
              let oScore: number | null = null;
              try {
                const health = await getSubmissionHealth(s.id);
                if (health && health.health_available) {
                  rStatus = health.rag_status;
                  oScore = Number(health.overall_score);
                }
              } catch {
                // ignore
              }

              const period = periodMap.get(s.governance_period_id);
              const dateVal = s.submission_date ?? s.updated_at;
              pendingReviews.push({
                id: s.id,
                project_name: project.project_name,
                period_name: period ? period.name : "—",
                status_code: s.status_code,
                rag_status: rStatus,
                overall_score: oScore,
                submitted_date: new Date(dateVal).toLocaleDateString(),
              });
            }
          })
        );

        // Fetch QPM plans that are UNDER_REVIEW
        const qpmPending: PendingQPMItem[] = [];
        await Promise.all(
          projs.map(async (proj) => {
            try {
              const plan: KpiPlan = await getKpiPlan(proj.id);
              if (plan.qpm_status === "UNDER_REVIEW" && plan.qpm_submitted_at) {
                qpmPending.push({
                  project_id: proj.id,
                  project_name: proj.project_name,
                  pm_name: proj.project_manager_name ?? null,
                  qpm_submitted_at: plan.qpm_submitted_at,
                  pm_perception_rag: plan.pm_perception_rag,
                  plan_id: plan.id,
                });
              }
            } catch {
              // project may not have a plan yet
            }
          })
        );

        setReviews(pendingReviews.sort((a, b) => b.submitted_date.localeCompare(a.submitted_date)));
        setPendingQpm(qpmPending);
        setStats({
          totalProjects: projs.length,
          pendingCount: pendingReviews.length,
          approvedCount: approved,
          pendingQpmCount: qpmPending.length,
        });
      })
      .catch(() => setError("Failed to load delivery head dashboard statistics."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 rounded-xl bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-lg bg-slate-200" />)}
        </div>
        <div className="h-64 rounded-lg bg-slate-200" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white shadow-md">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.full_name}!</h1>
          <p className="mt-2 text-sm text-slate-300 font-light max-w-xl">
            Review pending PM metric submissions, audit delivery risks, and authorize locks for your Business Unit vertical.
          </p>
        </div>
        <div className="absolute right-10 top-0 bottom-0 flex items-center justify-center opacity-10 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-40 w-40">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.03 0 1.9.693 2.166 1.638m-7.377 0A48.536 48.536 0 0 1 12 3m0 0c2.917 0 5.747.294 8.5.862m-21 1.402L3 20.25a.75.75 0 0 0 1 1h13a.75.75 0 0 0 1-1L18 5.262M15 12.25h.008v.008H15v-.008Zm0 3h.008v.008H15v-.008Zm0 3h.008v.008H15v-.008Z" />
          </svg>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Projects in BU</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.totalProjects}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pending Submissions</p>
          <p className="mt-2 text-2xl font-semibold text-indigo-600">{stats.pendingCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pending QPM Plans</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">{stats.pendingQpmCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Approved Reports</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{stats.approvedCount}</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Submissions Awaiting Review ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center bg-white">
            <p className="text-sm text-slate-500 font-medium">All clear! No pending submissions awaiting review.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">Project Name</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Governance Period</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Current Health</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Score</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Report Status</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Submitted Date</th>
                  <th className="px-4 py-3 font-medium text-slate-700" />
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.project_name}</td>
                    <td className="px-4 py-3 text-slate-600">{r.period_name}</td>
                    <td className="px-4 py-3">
                      {r.rag_status ? (
                        <RagBadge rag={r.rag_status} />
                      ) : (
                        <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded">
                          No score
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {r.overall_score !== null ? `${Number(r.overall_score).toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded border ${getStatusBadgeClass(r.status_code)}`}>
                        {formatStatus(r.status_code)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.submitted_date}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/delivery-head/submissions/${r.id}`}
                        className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* QPM Plans Pending Review */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          QPM KPI Plans Awaiting Review ({pendingQpm.length})
        </h2>
        {pendingQpm.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center bg-white">
            <p className="text-sm text-slate-500 font-medium">No QPM plans pending review.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-amber-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-amber-100 bg-amber-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">Project</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Project Manager</th>
                  <th className="px-4 py-3 font-medium text-slate-700">PM Perception</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Submitted</th>
                  <th className="px-4 py-3 font-medium text-slate-700" />
                </tr>
              </thead>
              <tbody>
                {pendingQpm.map((q) => (
                  <tr key={q.project_id} className="border-b border-amber-50 last:border-0 hover:bg-amber-50/30 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">{q.project_name}</td>
                    <td className="px-4 py-3 text-slate-600">{q.pm_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {q.pm_perception_rag ? (
                        <span className={`rounded px-2 py-0.5 text-xs font-bold border ${
                          q.pm_perception_rag === "RED" ? "bg-red-100 text-red-700 border-red-200" :
                          q.pm_perception_rag === "AMBER" ? "bg-amber-100 text-amber-700 border-amber-200" :
                          "bg-emerald-100 text-emerald-700 border-emerald-200"
                        }`}>{q.pm_perception_rag}</span>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(q.qpm_submitted_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/delivery-head/projects/${q.project_id}/qpm-review`}
                        className="rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                      >
                        Review KPI Plan
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
