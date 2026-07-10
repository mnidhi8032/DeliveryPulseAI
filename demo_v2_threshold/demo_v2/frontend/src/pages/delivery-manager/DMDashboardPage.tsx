/**
 * Delivery Manager Dashboard — dark enterprise theme
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listProjects } from "../../services/projectService";
import { getProjectReviewStatuses } from "../../services/dmReviewService";
import type { Project } from "../../types/project";
import type { ProjectReviewStatus } from "../../services/dmReviewService";

// ── RAG dot + coloured text ──────────────────────────────────────────────────
const RAG_TEXT: Record<string, string> = {
  GREEN: "text-emerald-400", AMBER: "text-amber-400", RED: "text-red-400",
};
const RAG_DOT_BG: Record<string, string> = {
  GREEN: "bg-emerald-500", AMBER: "bg-amber-400", RED: "bg-red-500",
};
const RAG_LABEL: Record<string, string> = {
  GREEN: "Green", AMBER: "Amber", RED: "Red",
};

function RagDot({ rag }: { rag: string | null }) {
  if (!rag || !RAG_TEXT[rag]) return <span className="text-slate-500 text-sm">—</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium text-sm ${RAG_TEXT[rag]}`}>
      <span className={`h-2 w-2 rounded-full shrink-0 ${RAG_DOT_BG[rag]}`} />
      {RAG_LABEL[rag]}
    </span>
  );
}

// ── Mini SVG bar chart ───────────────────────────────────────────────────────
function BarChart({ green, amber, red }: { green: number; amber: number; red: number }) {
  const max = Math.max(green, amber, red, 1);
  const H = 80;
  const bars = [
    { label: "Green", val: green, color: "#22c55e" },
    { label: "Amber", val: amber, color: "#fbbf24" },
    { label: "Red",   val: red,   color: "#f97316" },
  ];
  return (
    <svg viewBox="0 0 180 110" className="w-full h-28">
      {bars.map((b, i) => {
        const bh = b.val === 0 ? 3 : (b.val / max) * H;
        const x = 20 + i * 55;
        const y = 90 - bh;
        return (
          <g key={b.label}>
            <rect x={x} y={y} width={34} height={bh} rx={4} fill={b.color} fillOpacity={b.val === 0 ? 0.3 : 1} />
            <text x={x + 17} y={107} textAnchor="middle" fontSize={10} fill="#94a3b8">{b.label}</text>
            {b.val > 0 && (
              <text x={x + 17} y={y - 4} textAnchor="middle" fontSize={10} fill="#cbd5e1" fontWeight="600">{b.val}</text>
            )}
          </g>
        );
      })}
      <line x1="10" y1="90" x2="170" y2="90" stroke="#334155" strokeWidth="1" />
    </svg>
  );
}

// ── Donut chart for review status ────────────────────────────────────────────
function DonutChart({ needsReview, upToDate }: { needsReview: number; upToDate: number }) {
  const total = needsReview + upToDate || 1;
  const pct = Math.round((needsReview / total) * 100);
  const R = 44; const cx = 60; const cy = 60;
  const circ = 2 * Math.PI * R;
  const needsDash = (needsReview / total) * circ;
  const upDash   = (upToDate / total) * circ;
  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 120 120" className="w-32 h-32">
        {/* up to date arc — green */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#22c55e" strokeWidth={14}
          strokeDasharray={`${upDash} ${circ - upDash}`}
          strokeDashoffset={circ / 4} />
        {/* needs review arc — orange */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f97316" strokeWidth={14}
          strokeDasharray={`${needsDash} ${circ - needsDash}`}
          strokeDashoffset={circ / 4 - upDash} />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={16} fontWeight="700" fill="#f97316">{pct}%</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={8} fill="#94a3b8">needs review</text>
      </svg>
      <div className="flex gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />Needs review</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Up to date</span>
      </div>
    </div>
  );
}

// ── Stat tile ────────────────────────────────────────────────────────────────
function StatTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`${color} rounded-2xl p-5 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
          <svg className="h-4 w-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
          </svg>
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-white">{value}</p>
        <p className="text-sm text-white/70 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export function DMDashboardPage() {
  const [projects, setProjects]       = useState<Project[]>([]);
  const [reviewStatuses, setReviewStatuses] = useState<Map<string, ProjectReviewStatus>>(new Map());
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listProjects(), getProjectReviewStatuses()])
      .then(([projs, statuses]) => {
        setProjects(projs.sort((a, b) => a.project_name.localeCompare(b.project_name)));
        setReviewStatuses(new Map(statuses.map(s => [s.project_id, s])));
      })
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-5 animate-pulse">
      <div className="h-10 w-64 rounded-xl bg-slate-700" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-32 rounded-2xl bg-slate-700" />)}
      </div>
      <div className="h-64 rounded-2xl bg-slate-700" />
    </div>
  );

  if (error) return (
    <div className="rounded-2xl bg-red-900/30 border border-red-700 px-5 py-4">
      <p className="text-sm text-red-400">{error}</p>
    </div>
  );

  const byAccount: Record<string, { accountName: string; buName: string; projects: Project[] }> = {};
  for (const p of projects) {
    if (!byAccount[p.account_id]) {
      byAccount[p.account_id] = { accountName: p.account_name, buName: p.business_unit_name, projects: [] };
    }
    byAccount[p.account_id].projects.push(p);
  }

  const needsReviewCount = [...reviewStatuses.values()].filter(s => s.needs_review).length;
  const upToDateCount    = projects.length - needsReviewCount;
  const greenCount  = projects.filter(p => p.current_rag === "GREEN").length;
  const amberCount  = projects.filter(p => p.current_rag === "AMBER").length;
  const redCount    = projects.filter(p => p.current_rag === "RED").length;
  const atRiskCount = amberCount + redCount;

  return (
    <div className="space-y-8">

      {/* Page title */}
      <div>
        <h1 className="text-3xl font-bold text-white">Delivery manager</h1>
        <p className="text-sm text-slate-400 mt-1">Monitor KPI health across your assigned accounts.</p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Total projects"  value={projects.length}   color="bg-violet-500" />
        <StatTile label="Needs review"    value={needsReviewCount}  color="bg-sky-500" />
        <StatTile label="Green health"    value={greenCount}        color="bg-green-500" />
        <StatTile label="At risk"         value={atRiskCount}       color="bg-orange-500" />
      </div>

      {/* Charts row */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Bar chart — project health distribution */}
          <div className="bg-[#252540] rounded-2xl p-6">
            <p className="text-sm font-semibold text-slate-200 mb-1">Project health distribution</p>
            <p className="text-xs text-slate-500 mb-4">across all accounts</p>
            <BarChart green={greenCount} amber={amberCount} red={redCount} />
          </div>

          {/* Donut — review status */}
          <div className="bg-[#252540] rounded-2xl p-6 flex flex-col items-center justify-center">
            <p className="text-sm font-semibold text-slate-200 mb-1 self-start">Review status</p>
            <p className="text-xs text-slate-500 mb-4 self-start">{projects.length} projects total</p>
            <DonutChart needsReview={needsReviewCount} upToDate={upToDateCount} />
          </div>
        </div>
      )}

      {/* Projects by account */}
      {projects.length === 0 ? (
        <div className="bg-[#252540] rounded-2xl border border-dashed border-slate-600 p-14 text-center">
          <p className="text-sm text-slate-400">No projects assigned to your accounts yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byAccount).map(([, group]) => (
            <div key={group.accountName} className="bg-[#252540] rounded-2xl overflow-hidden">
              {/* Account section header */}
              <div className="px-6 py-4 border-b border-slate-700/50">
                <p className="text-base font-bold text-slate-100">{group.accountName} projects</p>
                <p className="text-xs text-slate-500 mt-0.5">{group.buName}</p>
              </div>

              {/* Table */}
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-700/50">
                    <th className="px-6 py-3 text-left font-medium">Project</th>
                    <th className="px-4 py-3 text-left font-medium">PM</th>
                    <th className="px-4 py-3 text-left font-medium">Health</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Last reviewed</th>
                    <th className="px-4 py-3 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {group.projects.map(p => {
                    const rs = reviewStatuses.get(p.id);
                    const needsReview = rs?.needs_review ?? false;
                    return (
                      <tr key={p.id} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-100">{p.project_name}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{p.project_code}</p>
                        </td>
                        <td className="px-4 py-4 text-slate-300">{p.project_manager_name || "—"}</td>
                        <td className="px-4 py-4"><RagDot rag={p.current_rag} /></td>
                        <td className="px-4 py-4">
                          {needsReview ? (
                            <span className="inline-block rounded-xl bg-orange-500 text-white text-xs font-semibold px-3 py-1.5">
                              Needs review
                            </span>
                          ) : rs?.last_reviewed_at ? (
                            <span className="inline-block rounded-xl bg-violet-600 text-white text-xs font-semibold px-3 py-1.5">
                              Up to date
                            </span>
                          ) : (
                            <span className="text-slate-500 text-sm">Not reviewed</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-400">
                          {rs?.last_reviewed_at
                            ? new Date(rs.last_reviewed_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
                            : "—"}
                          {rs?.last_review_period && (
                            <p className="text-xs text-slate-500 mt-0.5">{rs.last_review_period}</p>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Link
                            to={`/delivery-manager/projects/${p.id}/review`}
                            className="text-xs text-slate-400 hover:text-white transition-colors"
                          >
                            <svg className="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
