import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProject } from "../../services/projectService";
import { getKpiPlan } from "../../services/qpmService";
import type { Project } from "../../types/project";
import type { KpiPlan } from "../../types/qpm";

function qpmStatusBadge(status: string) {
  const map: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
    UNDER_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  };
  const label: Record<string, string> = {
    DRAFT: "● Draft",
    UNDER_REVIEW: "⏳ Under Review",
    APPROVED: "✓ Approved",
    REJECTED: "✗ Rejected",
  };
  const cls = map[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${cls}`}>
      {label[status] ?? status}
    </span>
  );
}

export function PMProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [plan, setPlan] = useState<KpiPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      getProject(projectId),
      getKpiPlan(projectId).catch(() => null),
    ])
      .then(([proj, p]) => {
        setProject(proj);
        setPlan(p);
      })
      .catch(() => setError("Failed to load project."))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 w-24 rounded bg-slate-200" />
        <div className="h-8 w-1/2 rounded bg-slate-200" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-48 rounded-lg bg-slate-200" />
          <div className="h-48 rounded-lg bg-slate-200" />
        </div>
        <div className="h-40 rounded-lg bg-slate-200" />
      </div>
    );
  }

  if (!project) {
    return <p className="text-sm text-red-600">{error ?? "Project not found."}</p>;
  }

  return (
    <div>
      <Link to="/pm/projects" className="text-sm text-slate-600 hover:text-slate-900">
        ← Back to projects
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{project.project_name}</h1>
          <p className="font-mono text-sm text-slate-500 mt-0.5">{project.project_code}</p>
        </div>
        {plan && qpmStatusBadge(plan.qpm_status)}
      </div>

      {/* KPI Plan rejection alert */}
      {plan?.qpm_status === "REJECTED" && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <span className="font-semibold">KPI Plan rejected</span>
          {plan.qpm_review_comments && `: ${plan.qpm_review_comments}`}
          <Link to={`/pm/projects/${projectId}/qpm/entry`} className="ml-3 text-rose-700 underline font-semibold">
            Revise & Resubmit →
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Project info */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Project Info</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Business Unit</dt>
              <dd className="text-slate-900 font-medium">{project.business_unit_name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Account</dt>
              <dd className="text-slate-900">{project.account_name} ({project.account_code})</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Status</dt>
              <dd>
                <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-semibold">
                  {project.status}
                </span>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Project Manager</dt>
              <dd className="text-right">
                {project.project_manager_name ?? "—"}
                {project.project_manager_email && (
                  <span className="block text-xs text-slate-500">{project.project_manager_email}</span>
                )}
              </dd>
            </div>
            {project.start_date && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Start Date</dt>
                <dd className="text-slate-900">{project.start_date}</dd>
              </div>
            )}
            {project.target_end_date && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Target End</dt>
                <dd className="text-slate-900">{project.target_end_date}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* KPI Plan status card */}
        <section className="rounded-lg border border-indigo-100 bg-indigo-50 p-5">
          <h2 className="text-sm font-semibold text-indigo-900 mb-1">KPI Plan (QPM)</h2>
          <p className="text-xs text-indigo-700 mb-4">
            Select metrics, enter data, compute KPIs and submit to Delivery Head for review.
          </p>
          {plan && (
            <div className="mb-4 space-y-1 text-xs text-indigo-800">
              <div className="flex gap-2">
                <span className="text-indigo-500">Metrics selected:</span>
                <span className="font-bold">{plan.metrics.length}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-indigo-500">Plan finalized:</span>
                <span className="font-bold">{plan.is_finalized ? "Yes" : "No"}</span>
              </div>
              {plan.qpm_submitted_at && (
                <div className="flex gap-2">
                  <span className="text-indigo-500">Submitted:</span>
                  <span className="font-bold">{new Date(plan.qpm_submitted_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Link to={`/pm/projects/${projectId}/qpm`}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors text-center">
              Sheet 1 — Select KPI Metrics
            </Link>
            <Link to={`/pm/projects/${projectId}/qpm/entry`}
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors text-center">
              Sheet 2 — Enter Data & Submit to DH →
            </Link>
            <Link to={`/pm/projects/${projectId}/qpm/tracker`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors text-center">
              Sheet 3 — KPI Tracker
            </Link>
            <Link to={`/pm/projects/${projectId}/qpm/summary`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors text-center">
              Sheet 4 — Summary Dashboard
            </Link>
          </div>
        </section>
      </div>

      {/* Quick links */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link to={`/pm/projects/${projectId}/phases`}
          className="rounded-lg border border-teal-200 bg-teal-50 p-4 hover:bg-teal-100 transition-colors">
          <div className="text-sm font-semibold text-teal-800">Project Phases</div>
          <div className="text-xs text-teal-600 mt-0.5">Sprints, Releases, Milestones</div>
        </Link>
        <Link to={`/pm/projects/${projectId}/actions`}
          className="rounded-lg border border-rose-200 bg-rose-50 p-4 hover:bg-rose-100 transition-colors">
          <div className="text-sm font-semibold text-rose-800">Action Items</div>
          <div className="text-xs text-rose-600 mt-0.5">Root cause & corrective actions</div>
        </Link>
        <Link to={`/pm/projects/${projectId}/timeline`}
          className="rounded-lg border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100 transition-colors">
          <div className="text-sm font-semibold text-slate-800">Health Timeline</div>
          <div className="text-xs text-slate-600 mt-0.5">Historical RAG trend</div>
        </Link>
      </div>
    </div>
  );
}
