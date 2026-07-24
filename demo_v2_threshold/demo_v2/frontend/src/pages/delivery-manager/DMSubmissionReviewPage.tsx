/**
 * Delivery Manager — Submission Review Page.
 * DM can view metrics, add commentary, and create action items.
 * NO approve / reject / lock / reopen — DM is a review-only role.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { HealthPanel } from "../../components/HealthPanel";
import { MetricDimensionForm } from "../../components/MetricDimensionForm";
import { AuditTimelineSection } from "../../components/AuditTimelineSection";
import { listGovernancePeriods } from "../../services/governanceService";
import { getSubmissionHealth, listMetricDefinitions, listMetricValues } from "../../services/metricService";
import { getProject } from "../../services/projectService";
import { getSubmission } from "../../services/submissionService";
import { addDMReview, createActionItem } from "../../services/brdService";
import { useToast } from "../../contexts/ToastContext";
import { getStatusBadgeClass, formatStatus } from "../../utils/formatters";
import { formatPeriodLabel } from "../../utils/dhSubmissionRows";
import type { GovernancePeriod } from "../../types/governance";
import type { MetricDefinition, SubmissionHealth } from "../../types/metrics";
import type { Project } from "../../types/project";
import type { Submission } from "../../types/submission";

export function DMSubmissionReviewPage() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const toast = useToast();

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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // DM commentary form
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  // Raise action item
  const emptyActionForm = { root_cause: "", corrective_action: "", owner_name: "", target_closure_date: "", metric_name: "" };
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionForm, setActionForm] = useState(emptyActionForm);
  const [savingAction, setSavingAction] = useState(false);

  const loadHealth = useCallback(async (sid: string) => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      setHealth(await getSubmissionHealth(sid));
    } catch {
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
    ]).then(async ([sub, defs, existing, periods]) => {
      setSubmission(sub);
      setDefinitions(defs);
      const init: Record<string, string> = {};
      defs.forEach(d => { init[d.code] = ""; });
      existing.forEach(r => { init[r.metric_code] = String(r.value); });
      setValues(init);
      const proj = await getProject(sub.project_id);
      setProject(proj);
      setPeriod(periods.find(p => p.id === sub.governance_period_id) ?? null);
      if (existing.length > 0) await loadHealth(submissionId);
    }).catch(() => setError("Failed to load submission."))
      .finally(() => setLoading(false));
  }, [submissionId, loadHealth]);

  const handleSaveComment = async () => {
    if (!submissionId || !commentText.trim()) return;
    setSavingComment(true);
    setError(null);
    try {
      const updated = await addDMReview(submissionId, commentText.trim());
      setSubmission(updated);
      setCommentOpen(false);
      setCommentText("");
      setSuccessMsg("Commentary saved successfully.");
    } catch {
      setError("Failed to save commentary.");
    } finally {
      setSavingComment(false);
    }
  };

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submission || !actionForm.root_cause.trim() || !actionForm.corrective_action.trim()) return;
    setSavingAction(true);
    setError(null);
    try {
      await createActionItem({
        project_id: submission.project_id,
        root_cause: actionForm.root_cause.trim(),
        corrective_action: actionForm.corrective_action.trim(),
        metric_name: actionForm.metric_name.trim() || undefined,
        owner_name: actionForm.owner_name.trim() || undefined,
        target_closure_date: actionForm.target_closure_date || undefined,
        submission_id: submissionId ?? undefined,
      });
      setSuccessMsg("Action item raised successfully.");
      setActionForm(emptyActionForm);
      setShowActionForm(false);
    } catch {
      setError("Failed to create action item.");
    } finally {
      setSavingAction(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-600">Loading submission…</p>;
  if (!submission || !project) return <p className="text-sm text-red-600">{error ?? "Submission not found."}</p>;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link to="/delivery-manager/submissions" className="text-sm text-slate-500 hover:text-slate-800">
        ← Back to submissions
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Review Submission</h1>
        <span className={`px-2.5 py-1 text-xs font-semibold rounded border ${getStatusBadgeClass(submission.status_code)}`}>
          {formatStatus(submission.status_code)}
        </span>
        <span className="text-xs text-slate-400">Metrics are read-only</span>
      </div>

      {/* Project info */}
      <div className="grid gap-4 rounded border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-slate-400 mb-1">Project</p>
          <p className="text-sm font-semibold text-slate-900">{project.project_name}</p>
          <p className="text-xs text-slate-500">{project.project_code} · {project.account_name}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Project Manager</p>
          <p className="text-sm text-slate-900">{project.project_manager_name ?? "—"}</p>
          <p className="text-xs text-slate-500">{project.project_manager_email ?? ""}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Period</p>
          <p className="text-sm text-slate-900">{period ? formatPeriodLabel(period) : "—"}</p>
          {submission.submission_date && (
            <p className="text-xs text-slate-500">Submitted {new Date(submission.submission_date).toLocaleString()}</p>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {successMsg && <p className="text-sm text-emerald-700">{successMsg}</p>}

      {/* Metrics + health */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <MetricDimensionForm definitions={definitions} values={values} errors={{}} readOnly onChange={() => {}} />
        </div>
        <div>
          <HealthPanel health={health} loading={healthLoading} error={healthError} />
        </div>
      </div>

      {/* PM Perception */}
      {submission.pm_perception_rag && (
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400 mb-2">PM Perception RAG</p>
          <span className="inline-flex items-center gap-1.5 text-sm">
            <span className={`h-2 w-2 rounded-full shrink-0 ${
              submission.pm_perception_rag === "RED" ? "bg-rose-500" :
              submission.pm_perception_rag === "AMBER" ? "bg-amber-500" : "bg-emerald-500"
            }`} />
            <span className={
              submission.pm_perception_rag === "RED" ? "text-rose-700" :
              submission.pm_perception_rag === "AMBER" ? "text-amber-700" : "text-emerald-700"
            }>{submission.pm_perception_rag.charAt(0) + submission.pm_perception_rag.slice(1).toLowerCase()}</span>
          </span>
          {submission.pm_rag_comments && <p className="mt-1.5 text-sm text-slate-600">{submission.pm_rag_comments}</p>}
        </div>
      )}

      {/* DM Commentary section */}
      <div className="rounded border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Your Commentary</h2>
            <p className="text-xs text-slate-400 mt-0.5">Add observations or recommendations for this submission.</p>
          </div>
          <button type="button" onClick={() => {
            setCommentText(submission.dm_comments ?? "");
            setCommentOpen(v => !v);
          }}
            className={`rounded px-3 py-1.5 text-xs transition cursor-pointer ${
              commentOpen
                ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                : "bg-slate-900 text-white hover:bg-slate-700"
            }`}>
            {commentOpen ? "Cancel" : submission.dm_comments ? "Edit commentary" : "Add commentary"}
          </button>
        </div>

        {!commentOpen && (
          submission.dm_comments ? (
            <div className="border-l-2 border-slate-200 pl-3">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{submission.dm_comments}</p>
              {submission.dm_review_date && (
                <p className="text-xs text-slate-400 mt-1.5">
                  {submission.dm_review_status && <span className="mr-2">{submission.dm_review_status}</span>}
                  {new Date(submission.dm_review_date).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No commentary added yet.</p>
          )
        )}

        {commentOpen && (
          <div className="space-y-3">
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              rows={5}
              placeholder="Write your observations, analysis, risks, or recommendations…"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            <button type="button"
              disabled={savingComment || !commentText.trim()}
              onClick={handleSaveComment}
              className="rounded bg-slate-900 px-5 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50 cursor-pointer">
              {savingComment ? "Saving…" : "Save commentary"}
            </button>
          </div>
        )}
      </div>

      {/* Raise Action Item — inline form after commentary */}
      <div className="rounded border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Raise Action Item</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Log a corrective action for this submission — tied to a specific metric or the overall project.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowActionForm(v => !v); setActionForm(emptyActionForm); }}
            className={`rounded px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              showActionForm
                ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {showActionForm ? "Cancel" : "+ New Action Item"}
          </button>
        </div>

        {showActionForm && (
          <form onSubmit={handleCreateAction} className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Metric / Area of concern
                </label>
                <input
                  type="text"
                  placeholder="E.g. Test Pass Rate (leave blank for project-level)"
                  value={actionForm.metric_name}
                  onChange={e => setActionForm(f => ({ ...f, metric_name: e.target.value }))}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Owner name
                </label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={actionForm.owner_name}
                  onChange={e => setActionForm(f => ({ ...f, owner_name: e.target.value }))}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Root Cause <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Describe the root cause of the issue…"
                  value={actionForm.root_cause}
                  onChange={e => setActionForm(f => ({ ...f, root_cause: e.target.value }))}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Corrective Action <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="What corrective action will be taken?…"
                  value={actionForm.corrective_action}
                  onChange={e => setActionForm(f => ({ ...f, corrective_action: e.target.value }))}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Target Closure Date
                </label>
                <input
                  type="date"
                  value={actionForm.target_closure_date}
                  onChange={e => setActionForm(f => ({ ...f, target_closure_date: e.target.value }))}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingAction || !actionForm.root_cause.trim() || !actionForm.corrective_action.trim()}
                className="rounded bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                {savingAction ? "Saving…" : "Save Action Item"}
              </button>
              <button
                type="button"
                onClick={() => { setShowActionForm(false); setActionForm(emptyActionForm); }}
                className="rounded border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {!showActionForm && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Click "+ New Action Item" to log a corrective action for this submission.{" "}
            <Link to={`/delivery-manager/actions?projectId=${submission?.project_id}`} className="text-indigo-600 hover:underline">
              View all actions →
            </Link>
          </div>
        )}
      </div>

      {/* Audit trail */}
      <div className="border-t border-slate-100 pt-6">
        <AuditTimelineSection submissionId={submissionId!} />
      </div>
    </div>
  );
}
