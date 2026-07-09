/**
 * Delivery Manager — Submissions list for their accounts.
 * DM can view all submissions and add commentary. No approve/reject.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listSubmissions } from "../../services/submissionService";
import { listProjects } from "../../services/projectService";
import { listGovernancePeriods } from "../../services/governanceService";
import { getSubmissionHealth } from "../../services/metricService";
import { getStatusBadgeClass, formatStatus } from "../../utils/formatters";
import { formatPeriodLabel } from "../../utils/dhSubmissionRows";
import type { Submission } from "../../types/submission";
import type { Project } from "../../types/project";
import type { GovernancePeriod } from "../../types/governance";
import type { SubmissionHealth } from "../../types/metrics";

// DM only needs to see SUBMITTED (active work) and ALL — no approval statuses
const STATUS_OPTIONS = ["ALL", "SUBMITTED", "DRAFT"] as const;

export function DMSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [periods, setPeriods] = useState<GovernancePeriod[]>([]);
  const [healthMap, setHealthMap] = useState<Record<string, SubmissionHealth | null>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("SUBMITTED");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([listSubmissions(), listProjects(), listGovernancePeriods()])
      .then(async ([subs, projs, pers]) => {
        setSubmissions(subs);
        setProjects(projs);
        setPeriods(pers);
        const hm: Record<string, SubmissionHealth | null> = {};
        await Promise.all(subs.map(async s => {
          try { hm[s.id] = await getSubmissionHealth(s.id); }
          catch { hm[s.id] = null; }
        }));
        setHealthMap(hm);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const projectById = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);
  const periodById = useMemo(() => new Map(periods.map(p => [p.id, p])), [periods]);

  const filtered = useMemo(() => submissions.filter(s => {
    const proj = projectById.get(s.project_id);
    const matchStatus = statusFilter === "ALL" || s.status_code === statusFilter;
    const matchSearch = !search || proj?.project_name?.toLowerCase().includes(search.toLowerCase()) ||
      proj?.project_code?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  }), [submissions, statusFilter, search, projectById]);

  const pendingCount = submissions.filter(s => s.status_code === "SUBMITTED").length;

  if (loading) return <div className="space-y-3 animate-pulse"><div className="h-8 w-48 rounded bg-slate-200"/><div className="h-64 rounded-xl bg-slate-200"/></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Submissions</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Review PM submissions. Add commentary and create action items.
          {pendingCount > 0 && <span className="ml-2 text-amber-700">{pendingCount} need commentary</span>}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400">
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === "ALL" ? "All statuses" : s.replace(/_/g, " ")}</option>)}
        </select>
        <input type="text" placeholder="Search project…" value={search} onChange={e => setSearch(e.target.value)}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-1 focus:ring-slate-400"/>
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded overflow-hidden">
        <table className="min-w-full text-sm divide-y divide-slate-100">
          <thead className="text-xs text-slate-400 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-left font-normal">Project</th>
              <th className="px-4 py-3 text-left font-normal">PM</th>
              <th className="px-4 py-3 text-left font-normal">Period</th>
              <th className="px-4 py-3 text-left font-normal">Status</th>
              <th className="px-4 py-3 text-left font-normal">Score</th>
              <th className="px-4 py-3 text-left font-normal">RAG</th>
              <th className="px-4 py-3 text-left font-normal">Commentary</th>
              <th className="px-4 py-3 text-left font-normal"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No submissions found.</td></tr>
            ) : filtered.map(s => {
              const proj = projectById.get(s.project_id);
              const period = periodById.get(s.governance_period_id);
              const health = healthMap[s.id];
              const rag = health?.health_available ? health.rag_status : null;
              const dot: Record<string, string> = { GREEN: "bg-emerald-500", AMBER: "bg-amber-500", RED: "bg-rose-500" };
              const ragText: Record<string, string> = { GREEN: "text-emerald-700", AMBER: "text-amber-700", RED: "text-rose-700" };
              return (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{proj?.project_name ?? "—"}</p>
                    <p className="text-xs text-slate-400 font-mono">{proj?.project_code}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{proj?.project_manager_name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{period ? formatPeriodLabel(period) : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs border ${getStatusBadgeClass(s.status_code)}`}>
                      {formatStatus(s.status_code)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {health?.health_available && health.overall_score != null ? Number(health.overall_score).toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {rag ? (
                      <span className={`inline-flex items-center gap-1.5 ${ragText[rag] ?? "text-slate-500"}`}>
                        <span className={`h-2 w-2 rounded-full shrink-0 ${dot[rag] ?? "bg-slate-300"}`} />
                        {rag.charAt(0) + rag.slice(1).toLowerCase()}
                      </span>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {s.dm_comments ? <span className="text-emerald-600">✓ Added</span> : <span className="text-slate-400">Not yet</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/delivery-manager/submissions/${s.id}`}
                      className={`rounded px-3 py-1.5 text-xs transition ${
                        s.status_code === "SUBMITTED"
                          ? "bg-slate-900 text-white hover:bg-slate-700"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}>
                      {s.status_code === "SUBMITTED" ? "Add commentary" : "View"}
                    </Link>
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
