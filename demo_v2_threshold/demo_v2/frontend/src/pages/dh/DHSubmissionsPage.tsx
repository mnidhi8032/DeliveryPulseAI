import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RagBadge } from "../../components/RagBadge";
import { listBusinessUnits } from "../../services/businessUnitService";
import { listGovernancePeriods } from "../../services/governanceService";
import { getSubmissionHealth } from "../../services/metricService";
import { listProjects } from "../../services/projectService";
import { listSubmissions } from "../../services/submissionService";
import type { SubmissionHealth } from "../../types/metrics";
import type { Project } from "../../types/project";
import {
  buildSubmissionRows,
  filterSubmissionRows,
  formatPeriodLabel,
  PENDING_DH_STATUSES,
  shortSubmissionId,
  type DHSubmissionRow,
} from "../../utils/dhSubmissionRows";
import { formatStatus, getStatusBadgeClass } from "../../utils/formatters";

const STATUS_OPTIONS = [
  "ALL",
  "UNDER_REVIEW",
  "SUBMITTED",
  "DRAFT",
  "APPROVED",
  "REJECTED",
  "LOCKED",
  "REOPENED",
] as const;

export function DHSubmissionsPage() {
  const [rows, setRows] = useState<DHSubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("UNDER_REVIEW");
  const [buFilter, setBuFilter] = useState<string>("ALL");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");

  useEffect(() => {
    Promise.all([
      listSubmissions(),
      listProjects(),
      listGovernancePeriods(),
      listBusinessUnits().catch(() => []),
    ])
      .then(async ([submissions, projects, periods]) => {
        const projectById = new Map(projects.map((p) => [p.id, p]));
        const periodById = new Map(periods.map((p) => [p.id, p]));

        const healthBySubmissionId = new Map<string, SubmissionHealth | null>();
        await Promise.all(
          submissions.map(async (s) => {
            try {
              const h = await getSubmissionHealth(s.id);
              healthBySubmissionId.set(s.id, h);
            } catch {
              healthBySubmissionId.set(s.id, null);
            }
          }),
        );

        setRows(
          buildSubmissionRows(submissions, projectById, periodById, healthBySubmissionId),
        );
      })
      .catch(() => setError("Failed to load submissions."))
      .finally(() => setLoading(false));
  }, []);

  const businessUnits = useMemo(() => {
    const names = new Set(rows.map((r) => r.project.business_unit_name).filter(Boolean));
    return Array.from(names).sort();
  }, [rows]);

  const projects = useMemo(() => {
    const map = new Map<string, Project>();
    for (const row of rows) {
      map.set(row.project.id, row.project);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.project_name.localeCompare(b.project_name),
    );
  }, [rows]);

  const filtered = useMemo(
    () =>
      filterSubmissionRows(rows, {
        status: statusFilter,
        businessUnit: buFilter,
        projectId: projectFilter,
      }),
    [rows, statusFilter, buFilter, projectFilter],
  );

  const pendingCount = rows.filter((r) =>
    PENDING_DH_STATUSES.includes(
      r.submission.status_code as (typeof PENDING_DH_STATUSES)[number],
    ),
  ).length;

  if (loading) {
    return <p className="text-sm text-slate-600">Loading submissions…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Submissions</h1>
      <p className="mt-1 text-sm text-slate-600">
        Review PM submissions for projects in your business units.
        {pendingCount > 0 && (
          <span className="ml-1 font-medium text-slate-800">
            {pendingCount} pending review.
          </span>
        )}
      </p>

      <div className="mt-6 flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-xs text-slate-600">
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "All statuses" : s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-600">
          Business unit
          <select
            value={buFilter}
            onChange={(e) => setBuFilter(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
          >
            <option value="ALL">All units</option>
            {businessUnits.map((bu) => (
              <option key={bu} value={bu}>
                {bu}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-600">
          Project
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 min-w-[12rem]"
          >
            <option value="ALL">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_code} — {p.project_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">No submissions match your filters.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">Submission</th>
                <th className="px-4 py-3 font-medium text-slate-700">Project</th>
                <th className="px-4 py-3 font-medium text-slate-700">PM</th>
                <th className="px-4 py-3 font-medium text-slate-700">Business unit</th>
                <th className="px-4 py-3 font-medium text-slate-700">Period</th>
                <th className="px-4 py-3 font-medium text-slate-700">Status</th>
                <th className="px-4 py-3 font-medium text-slate-700">Health</th>
                <th className="px-4 py-3 font-medium text-slate-700">RAG</th>
                <th className="px-4 py-3 font-medium text-slate-700" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ submission, project, period, health }) => (
                <tr key={submission.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">
                    {shortSubmissionId(submission.id)}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/delivery-head/projects/${project.id}/timeline`} className="font-medium text-indigo-600 hover:text-indigo-800">
                      {project.project_name}
                    </Link>
                    <span className="block text-xs text-slate-500">{project.project_code}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {project.project_manager_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{project.business_unit_name}</td>
                  <td className="px-4 py-3 text-slate-600">{formatPeriodLabel(period)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded border ${getStatusBadgeClass(submission.status_code)}`}>
                      {formatStatus(submission.status_code)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {health && health.health_available && health.overall_score !== null
                      ? Number(health.overall_score).toFixed(1)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {health && health.health_available && health.rag_status ? (
                      <RagBadge rag={health.rag_status} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/delivery-head/submissions/${submission.id}`}
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
    </div>
  );
}
