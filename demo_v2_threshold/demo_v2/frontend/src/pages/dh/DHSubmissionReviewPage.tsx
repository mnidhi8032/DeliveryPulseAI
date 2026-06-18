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
import {
  approveSubmission,
  getSubmission,
  lockSubmission,
  rejectSubmission,
  reopenSubmission,
} from "../../services/submissionService";
import { addDMReview, addDDReview } from "../../services/brdService";
import type { GovernancePeriod } from "../../types/governance";
import type { MetricDefinition, SubmissionHealth } from "../../types/metrics";
import type { Project } from "../../types/project";
import type { Submission } from "../../types/submission";
import { formatPeriodLabel } from "../../utils/dhSubmissionRows";
import { formatStatus, getStatusBadgeClass } from "../../utils/formatters";

function metricsReadOnly(statusCode: string): boolean {
  return statusCode !== "DRAFT";
}

function canApproveReject(statusCode: string): boolean {
  return statusCode === "UNDER_REVIEW";
}

function canReopenLock(statusCode: string): boolean {
  return statusCode === "APPROVED";
}

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
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [dmComment, setDmComment] = useState("");
  const [ddComment, setDdComment] = useState("");
  const [dmOpen, setDmOpen] = useState(false);
  const [ddOpen, setDdOpen] = useState(false);

  const loadHealth = useCallback(async (sid: string) => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const h = await getSubmissionHealth(sid);
      setHealth(h);
    } catch {
      setHealth(null);
      setHealthError("No health score yet (metrics may be missing).");
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
        for (const d of defs) {
          initial[d.code] = "";
        }
        for (const row of existing) {
          initial[row.metric_code] = String(row.value);
        }
        setValues(initial);

        const proj = await getProject(sub.project_id);
        setProject(proj);
        setPeriod(periods.find((p) => p.id === sub.governance_period_id) ?? null);

        if (existing.length > 0) {
          await loadHealth(submissionId);
        }
      })
      .catch(() => setError("Failed to load submission."))
      .finally(() => setLoading(false));
  }, [submissionId, loadHealth]);

  const handleAction = async (action: () => Promise<Submission>, successMsg: string) => {
    if (!submissionId) return;
    setActing(true);
    setError(null);
    setActionMessage(null);
    try {
      const updated = await action();
      setSubmission(updated);
      setActionMessage(successMsg);
      await loadHealth(submissionId);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Action failed.");
    } finally {
      setActing(false);
      setRejectOpen(false);
      setReopenOpen(false);
      setRejectComment("");
      setReopenReason("");
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-600">Loading review…</p>;
  }

  if (!submission || !project) {
    return <p className="text-sm text-red-600">{error ?? "Submission not found."}</p>;
  }

  const readOnly = metricsReadOnly(submission.status_code);
  const showApproveReject = canApproveReject(submission.status_code);
  const showReopenLock = canReopenLock(submission.status_code);
  const immutable = submission.status_code === "LOCKED";

  return (
    <div>
      <Link
        to="/delivery-head/submissions"
        className="text-sm text-slate-600 hover:text-slate-900"
      >
        ← Back to submissions
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Review submission</h1>
        <span className={`px-2.5 py-1 text-xs font-semibold rounded border ${getStatusBadgeClass(submission.status_code)}`}>
          {formatStatus(submission.status_code)}
        </span>
        {immutable && (
          <span className="text-xs text-slate-500">Locked — immutable</span>
        )}
        {readOnly && !immutable && (
          <span className="text-xs text-slate-500">Metrics read-only</span>
        )}
      </div>

      <section className="mt-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Project
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-900">{project.project_name}</p>
          <p className="text-xs text-slate-600">
            {project.project_code} · {project.account_name}
          </p>
          <p className="text-xs text-slate-500">{project.business_unit_name}</p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Project manager
          </h2>
          <p className="mt-1 text-sm text-slate-900">
            {project.project_manager_name ?? "—"}
          </p>
          <p className="text-xs text-slate-600">{project.project_manager_email ?? ""}</p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Submission
          </h2>
          <p className="mt-1 font-mono text-xs text-slate-700">{submission.id}</p>
          <p className="text-xs text-slate-600">{formatPeriodLabel(period)}</p>
          {submission.submission_date && (
            <p className="text-xs text-slate-500">
              Submitted {new Date(submission.submission_date).toLocaleString()}
            </p>
          )}
        </div>
      </section>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {actionMessage && <p className="mt-4 text-sm text-emerald-700">{actionMessage}</p>}

      {(showApproveReject || showReopenLock) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {showApproveReject && (
            <>
              <button
                type="button"
                disabled={acting}
                onClick={() =>
                  handleAction(
                    () => approveSubmission(submission.id),
                    "Submission approved.",
                  )
                }
                className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => setRejectOpen(true)}
                className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                Reject
              </button>
            </>
          )}
          {showReopenLock && (
            <>
              <button
                type="button"
                disabled={acting}
                onClick={() => setReopenOpen(true)}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Reopen
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() =>
                  handleAction(
                    () => lockSubmission(submission.id),
                    "Submission locked.",
                  )
                }
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                Lock
              </button>
            </>
          )}
        </div>
      )}

      {rejectOpen && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <label className="block text-sm font-medium text-slate-900">
            Rejection comment <span className="text-red-600">*</span>
          </label>
          <textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            rows={3}
            className="mt-2 w-full max-w-lg rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="Reason for rejection…"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={acting || !rejectComment.trim()}
              onClick={() =>
                handleAction(
                  () => rejectSubmission(submission.id, rejectComment.trim()),
                  "Submission rejected.",
                )
              }
              className="rounded bg-red-700 px-3 py-1.5 text-sm text-white disabled:opacity-60"
            >
              Confirm reject
            </button>
            <button
              type="button"
              onClick={() => setRejectOpen(false)}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {reopenOpen && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <label className="block text-sm font-medium text-slate-900">
            Reopen reason <span className="text-red-600">*</span>
          </label>
          <textarea
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            rows={3}
            className="mt-2 w-full max-w-lg rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="Why this submission is being reopened…"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={acting || !reopenReason.trim()}
              onClick={() =>
                handleAction(
                  () => reopenSubmission(submission.id, reopenReason.trim()),
                  "Submission reopened to draft.",
                )
              }
              className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-60"
            >
              Confirm reopen
            </button>
            <button
              type="button"
              onClick={() => setReopenOpen(false)}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <MetricDimensionForm
            definitions={definitions}
            values={values}
            errors={{}}
            readOnly={readOnly}
            onChange={() => {}}
          />
        </div>
        <div className="space-y-6">
          <HealthPanel health={health} loading={healthLoading} error={healthError} />
          <SubmissionTimeline submission={submission} />
        </div>
      </div>

      <div className="mt-8 border-t border-slate-100 pt-8">
        <AuditTimelineSection submissionId={submissionId!} />
      </div>

      {/* BRD §5.5.1.2–3: Multi-tier review comments */}
      <div className="mt-8 border-t border-slate-100 pt-8 space-y-6">
        <h2 className="text-sm font-semibold text-slate-900">Reviewer Commentary</h2>

        {/* PM Perception RAG */}
        {submission.pm_perception_rag && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">PM Perception</span>
              <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                submission.pm_perception_rag === "RED" ? "bg-red-100 text-red-700" :
                submission.pm_perception_rag === "AMBER" ? "bg-amber-100 text-amber-700" :
                "bg-emerald-100 text-emerald-700"
              }`}>{submission.pm_perception_rag}</span>
            </div>
            {submission.pm_rag_comments && (
              <p className="text-sm text-slate-700">{submission.pm_rag_comments}</p>
            )}
          </div>
        )}

        {/* DM Review */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">DM Commentary</span>
            <button type="button" onClick={() => setDmOpen(v => !v)}
              className="text-xs text-indigo-600 hover:underline cursor-pointer">
              {dmOpen ? "Cancel" : "Add / Update"}
            </button>
          </div>
          {submission.dm_comments ? (
            <div>
              <p className="text-sm text-slate-700">{submission.dm_comments}</p>
              <div className="mt-1 flex gap-3 text-xs text-slate-400">
                {submission.dm_review_date && <span>{new Date(submission.dm_review_date).toLocaleString()}</span>}
                {submission.dm_review_status && <span className="font-semibold text-slate-500">{submission.dm_review_status}</span>}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No DM comment yet.</p>
          )}
          {dmOpen && (
            <div className="mt-3">
              <textarea value={dmComment} onChange={e => setDmComment(e.target.value)} rows={3}
                placeholder="Delivery Manager commentary…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
              <button type="button" disabled={!dmComment.trim()} onClick={async () => {
                if (!submissionId) return;
                const updated = await addDMReview(submissionId, dmComment.trim());
                setSubmission(updated); setDmOpen(false); setDmComment("");
              }} className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
                Save DM Comment
              </button>
            </div>
          )}
        </div>

        {/* DD Review */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">DD Commentary</span>
            <button type="button" onClick={() => setDdOpen(v => !v)}
              className="text-xs text-indigo-600 hover:underline cursor-pointer">
              {ddOpen ? "Cancel" : "Add / Update"}
            </button>
          </div>
          {submission.dd_comments ? (
            <div>
              <p className="text-sm text-slate-700">{submission.dd_comments}</p>
              <div className="mt-1 flex gap-3 text-xs text-slate-400">
                {submission.dd_review_date && <span>{new Date(submission.dd_review_date).toLocaleString()}</span>}
                {submission.dd_review_status && <span className="font-semibold text-slate-500">{submission.dd_review_status}</span>}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No DD comment yet.</p>
          )}
          {ddOpen && (
            <div className="mt-3">
              <textarea value={ddComment} onChange={e => setDdComment(e.target.value)} rows={3}
                placeholder="Delivery Director commentary…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
              <button type="button" disabled={!ddComment.trim()} onClick={async () => {
                if (!submissionId) return;
                const updated = await addDDReview(submissionId, ddComment.trim());
                setSubmission(updated); setDdOpen(false); setDdComment("");
              }} className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
                Save DD Comment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
