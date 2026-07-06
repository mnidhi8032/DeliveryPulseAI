/**
 * Delivery Head — Submission view (read-only).
 * DH monitors submissions and adds high-level commentary only.
 * Approve / Reject / Lock / Reopen are NOT available here.
 * Those actions belong to the Delivery Manager workflow.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { HealthPanel } from "../../components/HealthPanel";
import { MetricDimensionForm } from "../../components/MetricDimensionForm";
import { SubmissionTimeline } from "../../components/SubmissionTimeline";
import { AuditTimelineSection } from "../../components/AuditTimelineSection";
import { listGovernancePeriods } from "../../services/governanceService";
import {
  getSubmissionHealth,
  listMetricDefinitions,
  listMetricValues,
} from "../../services/metricService";
import { getProject } from "../../services/projectService";
import { getSubmission } from "../../services/submissionService";
import type { GovernancePeriod } from "../../types/governance";
import type { MetricDefinition, SubmissionHealth } from "../../types/metrics";
import type { Project } from "../../types/project";
import type { Submission } from "../../types/submission";
import { formatPeriodLabel } from "../../utils/dhSubmissionRows";
import { formatStatus, getStatusBadgeClass } from "../../utils/formatters";

export function DHSubmissionReviewPage() {
  const { submissionId } = useParams<{ submissionId: string }>();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [period, setPeriod] = useState<GovernancePeriod | null>(null);
  const [definitions, setDefinitions] = useState<MetricDefinition[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [health, setHealth] = useState<SubmissionHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = useCallback(async (sid: string) => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const h = await getSubmissionHealth(sid);
      setHealth(h);
    } catch {
      setHealth(null);
      setHealthError("No health score yet.");
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!submissionId) return;
    Promise.all([
      getSubmission(submissionId),
      listMetricDefinitions(),
      listMetricValues(submissionId).catch(() => []),
      listGovernancePeriods(),
    ])
      .then(async ([sub, defs, existing, periods]) => {
        setSubmission(sub);
        setDefinitions(defs);
        const initial: Record<string, string> = {};
        defs.forEach(d => { initial[d.code] = ""; });
        existing.forEach(r => { initial[r.metric_code] = String(r.value); });
        setValues(initial);
        const proj = await getProject(sub.project_id);
        setProject(proj);
        setPeriod(periods.find(p => p.id === sub.governance_period_id) ?? null);
        if (existing.length > 0) await loadHealth(submissionId);
      })
      .catch(() => setError("Failed to load submission."))
      .finally(() => setLoading(false));
  }, [submissionId, loadHealth]);

  if (loading) return <p className="text-sm text-slate-600">Loading…</p>;
  if (!submission || !project) return <p className="text-sm text-red-600">{error ?? "Submission not found."}</p>;

  return (
    <div>
      <Link to="/delivery-head/submissions" className="text-sm text-slate-600 hover:text-slate-900">
        ← Back to submissions
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Submission Overview</h1>
        <span className={`px-2.5 py-1 text-xs font-semibold rounded border ${getStatusBadgeClass(submission.status_code)}`}>
          {formatStatus(submission.status_code)}
        </span>
        <span className="rounded-full bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold">
          Read-only — Delivery Head view
        </span>
      </div>

      {/* Project info */}
      <section className="mt-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project</h2>
          <p className="mt-1 text-sm font-medium text-slate-900">{project.project_name}</p>
          <p className="text-xs text-slate-600">{project.project_code} · {project.account_name}</p>
          <p className="text-xs text-slate-500">{project.business_unit_name}</p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project Manager</h2>
          <p className="mt-1 text-sm text-slate-900">{project.project_manager_name ?? "—"}</p>
          <p className="text-xs text-slate-600">{project.project_manager_email ?? ""}</p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Period</h2>
          <p className="mt-1 font-mono text-xs text-slate-700">{submission.id}</p>
          <p className="text-xs text-slate-600">{formatPeriodLabel(period)}</p>
          {submission.submission_date && (
            <p className="text-xs text-slate-500">Submitted {new Date(submission.submission_date).toLocaleString()}</p>
          )}
        </div>
      </section>

      {/* Metrics + health (all read-only) */}
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <MetricDimensionForm definitions={definitions} values={values} errors={{}} readOnly onChange={() => {}} />
        </div>
        <div className="space-y-6">
          <HealthPanel health={health} loading={healthLoading} error={healthError} />
          <SubmissionTimeline submission={submission} />
        </div>
      </div>

      {/* DM Commentary (read display only for DH) */}
      {(submission.dm_comments || submission.pm_perception_rag) && (
        <div className="mt-8 border-t border-slate-100 pt-8 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Review Commentary</h2>

          {submission.pm_perception_rag && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">PM Perception</p>
              <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                submission.pm_perception_rag === "RED" ? "bg-red-100 text-red-700" :
                submission.pm_perception_rag === "AMBER" ? "bg-amber-100 text-amber-700" :
                "bg-emerald-100 text-emerald-700"
              }`}>{submission.pm_perception_rag}</span>
              {submission.pm_rag_comments && <p className="mt-1 text-sm text-slate-700">{submission.pm_rag_comments}</p>}
            </div>
          )}

          {submission.dm_comments && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Delivery Manager Commentary</p>
              <p className="text-sm text-slate-700">{submission.dm_comments}</p>
              {submission.dm_review_date && (
                <p className="text-xs text-slate-400 mt-2">
                  {submission.dm_review_status && <span className="font-semibold mr-2">{submission.dm_review_status}</span>}
                  {new Date(submission.dm_review_date).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-8 border-t border-slate-100 pt-8">
        <AuditTimelineSection submissionId={submissionId!} />
      </div>
    </div>
  );
}
