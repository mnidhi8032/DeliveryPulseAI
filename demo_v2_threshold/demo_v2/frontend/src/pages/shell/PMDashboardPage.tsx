import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { listProjects } from "../../services/projectService";
import { listSubmissions } from "../../services/submissionService";
import { listGovernancePeriods } from "../../services/governanceService";
import { getSubmissionHealth } from "../../services/metricService";
import { RagBadge } from "../../components/RagBadge";
import type { Submission } from "../../types/submission";

interface ProjectCardData {
  id: string;
  project_code: string;
  project_name: string;
  account_name: string;
  rag_status: string | null;
  overall_score: number | null;
}

interface PendingItem {
  id: string;
  project_name: string;
  period_name: string;
  status_code: string;
  updated_at: string;
}

export function PMDashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectCardData[]>([]);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      listProjects(),
      listSubmissions(),
      listGovernancePeriods(),
    ])
      .then(async ([projs, subs, periods]) => {
        const periodMap = new Map(periods.map((p) => [p.id, p]));

        // Get latest submissions
        const latestSubByProj = new Map<string, Submission>();
        for (const sub of subs) {
          const existing = latestSubByProj.get(sub.project_id);
          if (!existing || new Date(sub.created_at) > new Date(existing.created_at)) {
            latestSubByProj.set(sub.project_id, sub);
          }
        }

        // Fetch health for each latest submission
        const projCards: ProjectCardData[] = [];
        await Promise.all(
          projs.map(async (p) => {
            let ragStatus: string | null = null;
            let overallScore: number | null = null;
            const latest = latestSubByProj.get(p.id);
            if (latest) {
              try {
                const health = await getSubmissionHealth(latest.id);
                if (health && health.health_available) {
                  ragStatus = health.rag_status;
                  overallScore = Number(health.overall_score);
                }
              } catch {
                // Ignore health load errors
              }
            }
            projCards.push({
              id: p.id,
              project_code: p.project_code,
              project_name: p.project_name,
              account_name: p.account_name,
              rag_status: ragStatus,
              overall_score: overallScore,
            });
          })
        );

        // Submissions that need attention (DRAFT or REOPENED)
        const pendingItems: PendingItem[] = [];
        for (const sub of subs) {
          if (sub.status_code === "DRAFT" || sub.status_code === "REOPENED" ||
              sub.status_code === "APPROVED" || sub.status_code === "REJECTED" ||
              sub.status_code === "UNDER_REVIEW") {
            const matchedProj = projs.find((p) => p.id === sub.project_id);
            if (matchedProj) {
              const matchedPeriod = periodMap.get(sub.governance_period_id);
              pendingItems.push({
                id: sub.id,
                project_name: matchedProj.project_name,
                period_name: matchedPeriod ? matchedPeriod.name : "—",
                status_code: sub.status_code,
                updated_at: new Date(sub.updated_at).toLocaleDateString(),
              });
            }
          }
        }

        setProjects(projCards.sort((a, b) => a.project_name.localeCompare(b.project_name)));
        setPending(pendingItems.sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
      })
      .catch(() => setError("Failed to load dashboard statistics."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 rounded-xl bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-36 rounded-xl bg-slate-200" />
          ))}
        </div>
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
            Use this dashboard to manage your assigned project metric reports, track delivery health, and submit governance reports.
          </p>
        </div>
        <div className="absolute right-10 top-0 bottom-0 flex items-center justify-center opacity-10 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-40 w-40">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
      </div>

      {pending.length > 0 && (
        <section className="mt-8 space-y-4">

          {/* Approved submissions */}
          {pending.filter(i => i.status_code === "APPROVED" || i.status_code === "LOCKED").length > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-sm font-semibold text-emerald-800">
                  Approved by Delivery Head ({pending.filter(i => i.status_code === "APPROVED" || i.status_code === "LOCKED").length})
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {pending.filter(i => i.status_code === "APPROVED" || i.status_code === "LOCKED").map((item) => (
                  <div key={item.id} className="rounded-lg border border-emerald-200 bg-white p-3 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="font-semibold text-slate-800 text-xs truncate">{item.project_name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.period_name} · {item.updated_at}</div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                        {item.status_code}
                      </span>
                      <Link to={`/pm/submissions/${item.id}`} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline">
                        View →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected submissions */}
          {pending.filter(i => i.status_code === "REJECTED").length > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <h2 className="text-sm font-semibold text-rose-800">
                  Rejected — Action Required ({pending.filter(i => i.status_code === "REJECTED").length})
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {pending.filter(i => i.status_code === "REJECTED").map((item) => (
                  <div key={item.id} className="rounded-lg border border-rose-200 bg-white p-3 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="font-semibold text-slate-800 text-xs truncate">{item.project_name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.period_name} · {item.updated_at}</div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded border bg-rose-50 text-rose-700 border-rose-200">
                        REJECTED
                      </span>
                      <Link to={`/pm/submissions/${item.id}`} className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline">
                        Revise →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Under Review */}
          {pending.filter(i => i.status_code === "UNDER_REVIEW").length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-sm font-semibold text-blue-800">
                  Under Delivery Head Review ({pending.filter(i => i.status_code === "UNDER_REVIEW").length})
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {pending.filter(i => i.status_code === "UNDER_REVIEW").map((item) => (
                  <div key={item.id} className="rounded-lg border border-blue-200 bg-white p-3 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="font-semibold text-slate-800 text-xs truncate">{item.project_name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.period_name} · {item.updated_at}</div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded border bg-blue-50 text-blue-700 border-blue-200">
                        UNDER REVIEW
                      </span>
                      <Link to={`/pm/submissions/${item.id}`} className="text-xs text-slate-600 hover:text-slate-800 font-semibold underline">
                        View →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Draft / Reopened — needs action */}
          {pending.filter(i => i.status_code === "DRAFT" || i.status_code === "REOPENED").length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
              <div className="flex gap-3">
                <svg className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-amber-800">
                    Draft / Reopened — Fill & Submit ({pending.filter(i => i.status_code === "DRAFT" || i.status_code === "REOPENED").length})
                  </h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {pending.filter(i => i.status_code === "DRAFT" || i.status_code === "REOPENED").map((item) => (
                      <div key={item.id} className="rounded-lg border border-amber-200 bg-white p-3 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="font-semibold text-slate-800 text-xs truncate">{item.project_name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{item.period_name} · {item.updated_at}</div>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded border bg-amber-50 text-amber-700 border-amber-200">
                            {item.status_code}
                          </span>
                          <Link to={`/pm/submissions/${item.id}`} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline">
                            Fill Metrics →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">My Assigned Projects ({projects.length})</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((p) => (
            <div 
              key={p.id}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-slate-50 group-hover:bg-slate-100/70 transition-all duration-300"></div>
              
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">{p.project_code}</div>
                <h3 className="mt-1 font-bold text-slate-800 text-sm tracking-tight group-hover:text-slate-900 transition-colors line-clamp-1">{p.project_name}</h3>
                <p className="mt-1.5 text-xs text-slate-500 font-medium">{p.account_name}</p>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Current Health</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    {p.rag_status ? (
                      <>
                        <RagBadge rag={p.rag_status} />
                        <span className="text-xs font-semibold text-slate-800">{p.overall_score?.toFixed(1)}%</span>
                      </>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50">
                        None
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  to={`/pm/projects/${p.id}`}
                  className="rounded-lg bg-slate-100 hover:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-white transition-all duration-300 focus:outline-none"
                >
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
