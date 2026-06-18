import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  buildMetricPayload,
  MetricDimensionForm,
} from "../../components/MetricDimensionForm";
import { HealthPanel } from "../../components/HealthPanel";
import { AuditTimelineSection } from "../../components/AuditTimelineSection";
import {
  getSubmissionHealth,
  listMetricDefinitions,
  listMetricValues,
  saveMetrics,
} from "../../services/metricService";
import { getProject } from "../../services/projectService";
import { getSubmission, submitSubmission, deleteSubmission } from "../../services/submissionService";
import { resubmitRejected, updatePMPerceptionRag } from "../../services/brdService";
import { formatStatus, getStatusBadgeClass } from "../../utils/formatters";
import type { MetricDefinition, SubmissionHealth } from "../../types/metrics";
import type { Project } from "../../types/project";
import type { Submission } from "../../types/submission";
import { ExcelUploadCard } from "../../components/ExcelUploadCard";
import { ExcelPreviewTable } from "../../components/ExcelPreviewTable";
import { applyExcelImportBatch } from "../../services/excelService";
import type { ExcelImportBatch } from "../../types/excel";

export function PMSubmissionPage() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [definitions, setDefinitions] = useState<MetricDefinition[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [health, setHealth] = useState<SubmissionHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Phase 14 Excel workflow states
  const [activeTab, setActiveTab] = useState<"manual" | "excel">("manual");
  const [excelBatch, setExcelBatch] = useState<ExcelImportBatch | null>(null);
  const [applyingExcel, setApplyingExcel] = useState(false);

  // BRD §5.4.1.7 — PM perception RAG
  const [pmRagOpen, setPmRagOpen] = useState(false);
  const [pmRag, setPmRag] = useState("");
  const [pmRagComment, setPmRagComment] = useState("");
  const [pmRagSaving, setPmRagSaving] = useState(false);

  // BRD §11.3 — resubmit rejected
  const [resubmitting, setResubmitting] = useState(false);

  const editable = submission?.status_code === "DRAFT";

  const loadHealth = useCallback(async (sid: string) => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const h = await getSubmissionHealth(sid);
      setHealth(h);
    } catch {
      setHealth(null);
      setHealthError("Save metrics to compute health.");
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
    ])
      .then(async ([sub, defs, existing]) => {
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

        if (existing.length > 0) {
          await loadHealth(submissionId);
        }
      })
      .catch(() => setError("Failed to load submission."))
      .finally(() => setLoading(false));
  }, [submissionId, loadHealth]);

  const handleChange = (code: string, value: string) => {
    setValues((prev) => ({ ...prev, [code]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[code];
      return next;
    });
    setSaveMessage(null);
  };

  const handleSaveDraft = async () => {
    if (!submissionId || !editable) return;

    const { metrics, errors } = buildMetricPayload(definitions, values, { draftMode: true });
    const fieldOnly = { ...errors };
    const formError = fieldOnly._form;
    delete fieldOnly._form;
    if (Object.keys(fieldOnly).length > 0 || formError) {
      setFieldErrors(fieldOnly);
      setError(
        formError ??
          `Fix ${Object.keys(fieldOnly).length} highlighted field(s) before saving.`,
      );
      setSaveMessage(null);
      return;
    }

    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      await saveMetrics(submissionId, metrics);
      setSaveMessage("Draft saved. Health updated.");
      await loadHealth(submissionId);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data
        ?.detail;
      if (detail && typeof detail === "object" && "errors" in detail) {
        setError((detail as { errors: string[] }).errors.join("; "));
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Failed to save metrics.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!submissionId || !editable) return;
    if (!window.confirm("Are you sure you want to permanently delete this draft submission? All filled metrics will be lost.")) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await deleteSubmission(submissionId);
      navigate(`/pm/projects/${project?.id}`, { replace: true });
    } catch {
      setError("Failed to delete draft submission.");
    } finally {
      setSaving(false);
    }
  };

  const handleExcelApply = async (editedRows: { metric_code: string; value: string | number }[]) => {
    if (!submissionId || !excelBatch) return;
    setApplyingExcel(true);
    setError(null);
    setSaveMessage(null);
    try {
      await applyExcelImportBatch(excelBatch.id, {
        submission_id: submissionId,
        rows: editedRows,
      });

      // Reload fresh values and calculations from DB
      const existingValues = await listMetricValues(submissionId);
      const updatedValues: Record<string, string> = {};
      for (const d of definitions) {
        updatedValues[d.code] = "";
      }
      for (const val of existingValues) {
        updatedValues[val.metric_code] = String(val.value);
      }
      setValues(updatedValues);
      setFieldErrors({});

      // Load new health scores
      await loadHealth(submissionId);

      setSaveMessage("Excel metrics applied to draft successfully.");
      setExcelBatch(null);
      setActiveTab("manual");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Failed to apply Excel metrics. Please review validation errors.");
    } finally {
      setApplyingExcel(false);
    }
  };

  // BRD §11.3: PM moves REJECTED → DRAFT to revise and resubmit
  const handleResubmit = async () => {
    if (!submissionId) return;
    setResubmitting(true);
    setError(null);
    try {
      const updated = await resubmitRejected(submissionId);
      setSubmission(updated);
      setSaveMessage("Submission moved back to Draft. You can now edit and resubmit.");
    } catch {
      setError("Failed to resubmit.");
    } finally {
      setResubmitting(false);
    }
  };

  // BRD §5.4.1.7: Save PM perception RAG
  const handleSavePmRag = async () => {
    if (!submissionId || !pmRag) return;
    setPmRagSaving(true);
    setError(null);
    try {
      const updated = await updatePMPerceptionRag(submissionId, pmRag, pmRagComment || undefined);
      setSubmission(updated);
      setPmRagOpen(false);
      setSaveMessage("PM perception RAG saved.");
    } catch {
      setError("Failed to save PM RAG.");
    } finally {
      setPmRagSaving(false);
    }
  };

  const handleSubmit = async () => {    if (!submissionId || !editable) return;

    const { metrics, errors } = buildMetricPayload(definitions, values, { draftMode: false });
    const fieldOnly = { ...errors };
    const formError = fieldOnly._form;
    delete fieldOnly._form;
    if (Object.keys(fieldOnly).length > 0 || formError) {
      setFieldErrors(fieldOnly);
      setError(
        formError ??
          `Fix ${Object.keys(fieldOnly).length} highlighted field(s) before submitting.`,
      );
      setSaveMessage(null);
      return;
    }

    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      await saveMetrics(submissionId, metrics);
      const updated = await submitSubmission(submissionId);
      setSubmission(updated);
      setSaveMessage("Submission submitted successfully.");
      await loadHealth(submissionId);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data
        ?.detail;
      if (detail && typeof detail === "object" && "errors" in detail) {
        setError((detail as { errors: string[] }).errors.join("; "));
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Failed to submit.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-600">Loading submission…</p>;
  }

  if (!submission || !project) {
    return <p className="text-sm text-red-600">{error ?? "Submission not found."}</p>;
  }

  return (
    <div>
      <Link
        to={`/pm/projects/${project.id}`}
        className="text-sm text-slate-600 hover:text-slate-900"
      >
        ← Back to {project.project_name}
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Submission</h1>
        <span className={`px-2.5 py-1 text-xs font-semibold rounded border ${getStatusBadgeClass(submission.status_code)}`}>
          {formatStatus(submission.status_code)}
        </span>
        {!editable && (
          <span className="text-xs text-slate-500">Read-only (not in DRAFT)</span>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {project.project_code} · {project.project_name}
      </p>

      {/* BRD §11.3 — Resubmit rejected */}
      {submission.status_code === "REJECTED" && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-800">This submission was rejected.</p>
          {submission.review_comments && (
            <p className="mt-1 text-sm text-rose-700">Reason: {submission.review_comments}</p>
          )}
          <button
            type="button"
            disabled={resubmitting}
            onClick={handleResubmit}
            className="mt-3 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50 cursor-pointer"
          >
            {resubmitting ? "Moving to Draft…" : "Revise & Resubmit"}
          </button>
        </div>
      )}

      {/* BRD §5.4.1.7 — PM Perception RAG */}
      {(editable || submission.status_code === "UNDER_REVIEW") && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Your Overall RAG Perception
              </span>
              {submission.pm_perception_rag && (
                <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                  submission.pm_perception_rag === "RED" ? "bg-red-100 text-red-700" :
                  submission.pm_perception_rag === "AMBER" ? "bg-amber-100 text-amber-700" :
                  "bg-emerald-100 text-emerald-700"
                }`}>{submission.pm_perception_rag}</span>
              )}
            </div>
            <button type="button" onClick={() => {
              setPmRag(submission.pm_perception_rag ?? "GREEN");
              setPmRagComment(submission.pm_rag_comments ?? "");
              setPmRagOpen(v => !v);
            }}
              className="text-xs text-indigo-600 hover:underline cursor-pointer">
              {pmRagOpen ? "Cancel" : "Set RAG"}
            </button>
          </div>
          {submission.pm_rag_comments && !pmRagOpen && (
            <p className="mt-1 text-sm text-slate-600">{submission.pm_rag_comments}</p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            BRD §5.4.1.7 — Stored separately from computed RAG, does not override it.
          </p>
          {pmRagOpen && (
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                {["GREEN", "AMBER", "RED"].map(r => (
                  <button key={r} type="button" onClick={() => setPmRag(r)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold border transition cursor-pointer ${
                      pmRag === r
                        ? r === "RED" ? "bg-red-600 text-white border-red-600"
                          : r === "AMBER" ? "bg-amber-500 text-white border-amber-500"
                          : "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}>{r}</button>
                ))}
              </div>
              <textarea value={pmRagComment} onChange={e => setPmRagComment(e.target.value)}
                rows={2} placeholder="Comments on your perception (optional)…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
              <button type="button" disabled={pmRagSaving || !pmRag} onClick={handleSavePmRag}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
                {pmRagSaving ? "Saving…" : "Save Perception"}
              </button>
            </div>
          )}
        </div>
      )}

      {editable && (
        <div className="mt-6 flex border-b border-slate-200">          <button
            type="button"
            onClick={() => {
              setActiveTab("manual");
              setError(null);
              setSaveMessage(null);
            }}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition focus:outline-none cursor-pointer ${
              activeTab === "manual"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Manual Form Entry
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("excel");
              setError(null);
              setSaveMessage(null);
            }}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition focus:outline-none cursor-pointer ${
              activeTab === "excel"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Excel Upload Workflow
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {saveMessage && <p className="mt-4 text-sm text-emerald-700">{saveMessage}</p>}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {activeTab === "manual" ? (
            <>
              <MetricDimensionForm
                definitions={definitions}
                values={values}
                errors={fieldErrors}
                readOnly={!editable}
                onChange={handleChange}
              />
              {editable && (
                <div className="mt-4 flex gap-3 w-full">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveDraft}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-60 cursor-pointer"
                  >
                    {saving ? "Saving…" : "Save Draft"}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSubmit}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-60 cursor-pointer"
                  >
                    {saving ? "Submitting…" : "Submit"}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleDeleteDraft}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-60 cursor-pointer ml-auto"
                  >
                    Delete Draft
                  </button>
                </div>
              )}
            </>
          ) : (
            <div>
              {excelBatch ? (
                <ExcelPreviewTable
                  batch={excelBatch}
                  definitions={definitions}
                  applying={applyingExcel}
                  onApply={handleExcelApply}
                  onCancel={() => setExcelBatch(null)}
                />
              ) : (
                <ExcelUploadCard
                  submissionId={submissionId!}
                  onUploadSuccess={(batch) => {
                    setExcelBatch(batch);
                    setError(null);
                  }}
                  onUploadError={(err) => setError(err)}
                />
              )}
            </div>
          )}
        </div>
        <div>
          <HealthPanel health={health} loading={healthLoading} error={healthError} />
        </div>
      </div>

      <div className="mt-8 border-t border-slate-100 pt-8">
        <AuditTimelineSection submissionId={submissionId!} />
      </div>
    </div>
  );
}
