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
import { RagBadge } from "../../components/RagBadge";
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
        <h1 className="text-xl font-bold text-slate-900">Submissions</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Review PM submissions. Add commentary and create action items.
          {pendingCount > 0 && <span className="ml-2 rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">{pendingCount} need commentary</span>}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400">
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === "ALL" ? "All statuses" : s.replace(/_/g, " ")}</option>)}
        </select>
        <input type="text" placeholder="Search project…" value={search} onChange={e => setSearch(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-slate-400"/>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full text-sm divide-y divide-slate-100">
          <thead className="bg-slate-50 text-xs text-slate-500 font-semibold uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Project</th>
              <th className="px-4 py-3 text-left">PM</th>
              <th className="px-4 py-3 text-left">Period</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Score</th>
              <th className="px-4 py-3 text-left">RAG</th>
              <th className="px-4 py-3 text-left">DM Commentary</th>
              <th className="px-4 py-3 text-left"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No submissions found.</td></tr>
            ) : filtered.map(s => {
              const proj = projectById.get(s.project_id);
              const period = periodById.get(s.governance_period_id);
              const health = healthMap[s.id];
              return (
                <tr key={s.id} className={`hover:bg-slate-50 ${s.status_code === "SUBMITTED" ? "bg-amber-50/30" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{proj?.project_name ?? "—"}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{proj?.project_code}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{proj?.project_manager_name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{period ? formatPeriodLabel(period) : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getStatusBadgeClass(s.status_code)}`}>
                      {formatStatus(s.status_code)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-700">
                    {health?.health_available && health.overall_score != null ? Number(health.overall_score).toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {health?.health_available && health.rag_status ? <RagBadge rag={health.rag_status} /> : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px]">
                    {s.dm_comments ? (
                      <span className="text-emerald-600 font-semibold">✓ Added</span>
                    ) : (
                      <span className="text-amber-500">Not yet</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/delivery-manager/submissions/${s.id}`}
                      className={`rounded px-3 py-1.5 text-xs font-bold transition ${
                        s.status_code === "SUBMITTED"
                          ? "bg-slate-900 text-white hover:bg-slate-700"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}>
                      {s.status_code === "SUBMITTED" ? "Add Commentary" : "View"}
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
