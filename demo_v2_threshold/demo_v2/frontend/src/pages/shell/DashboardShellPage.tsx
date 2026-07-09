/**
 * PM Dashboard — Enterprise-level redesign.
 * Clean, modern, professional UI with data from existing APIs only.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { listProjects } from "../../services/projectService";
import { RagBadge } from "../../components/RagBadge";
import type { Project } from "../../types/project";

// ─── Accent map ───────────────────────────────────────────────────────────────
const RAG_LEFT: Record<string, string> = {
  GREEN: "border-l-emerald-500",
  AMBER: "border-l-amber-500",
  RED:   "border-l-rose-500",
};
const RAG_DOT_BG: Record<string, string> = {
  GREEN: "bg-emerald-500",
  AMBER: "bg-amber-500",
  RED:   "bg-rose-500",
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  gradient: string;
  to?: string;
  trend?: string;
  trendUp?: boolean;
}
function StatCard({ label, value, sub, icon, gradient, to, trend, trendUp }: StatCardProps) {
  const inner = (
    <div className={`relative overflow-hidden rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 ${gradient} ${to ? "cursor-pointer" : ""} group`}>
      <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
        <div className="w-full h-full rounded-full bg-white transform translate-x-8 -translate-y-8" />
      </div>
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm">
            {icon}
          </div>
          {trend && (
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${trendUp ? "bg-white/20 text-white" : "bg-white/20 text-white"}`}>
              {trendUp ? "↑" : "↓"} {trend}
            </span>
          )}
        </div>
        <p className="text-3xl font-black text-white leading-tight">{value}</p>
        <p className="text-xs font-bold text-white/70 uppercase tracking-wider mt-1">{label}</p>
        {sub && <p className="text-[11px] text-white/60 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
function DashboardStats({ projects }: { projects: Project[] }) {
  const total   = projects.length;
  const green   = projects.filter(p => p.current_rag === "GREEN").length;
  const amber   = projects.filter(p => p.current_rag === "AMBER").length;
  const red     = projects.filter(p => p.current_rag === "RED" || p.current_rag === "CRITICAL").length;
  const noScore = projects.filter(p => !p.current_rag).length;
  const healthPct = total > 0 ? Math.round((green / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatCard label="Total Projects" value={total}
        sub={`${total} assigned`} to="/pm/projects"
        gradient="bg-gradient-to-br from-indigo-600 to-indigo-800"
        icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
      />
      <StatCard label="Green Health" value={`${healthPct}%`}
        sub={`${green} of ${total} projects`}
        gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
        icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      />
      <StatCard label="Needs Attention" value={amber + red}
        sub={`${amber} amber · ${red} red`}
        gradient={amber + red > 0 ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-gradient-to-br from-slate-500 to-slate-700"}
        icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>}
      />
      <StatCard label="Awaiting Score" value={noScore}
        sub="No metrics entered" to="/pm/projects"
        gradient="bg-gradient-to-br from-violet-500 to-purple-700"
        icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
      />
    </div>
  );
}

// ─── Quick Action Card ────────────────────────────────────────────────────────
function QuickAction({ to, icon, label, desc, accent }: {
  to: string; icon: React.ReactNode; label: string; desc: string; accent: string;
}) {
  return (
    <Link to={to} className="group flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-50 p-4 transition-all duration-200">
      <div className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${accent} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{label}</p>
        <p className="text-xs text-slate-500 truncate mt-0.5">{desc}</p>
      </div>
      <svg className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate();
  const rag = project.current_rag;
  const borderAccent = rag ? (RAG_LEFT[rag] ?? "border-l-slate-300") : "border-l-slate-200";
  const dotBg = rag ? (RAG_DOT_BG[rag] ?? "bg-slate-400") : "bg-slate-300";

  const statusConfig: Record<string, { label: string; cls: string }> = {
    ACTIVE:    { label: "Active",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    ON_HOLD:   { label: "On Hold",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
    COMPLETED: { label: "Completed", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    CANCELLED: { label: "Cancelled", cls: "bg-slate-100 text-slate-500 border-slate-200" },
  };
  const sc = statusConfig[project.status] ?? { label: project.status, cls: "bg-slate-100 text-slate-500 border-slate-200" };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null;

  return (
    <div
      onClick={() => navigate(`/pm/projects/${project.id}/qpm/summary`)}
      className={`group relative rounded-2xl border border-slate-200 border-l-4 ${borderAccent} bg-white shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 overflow-hidden`}
    >
      {/* Hover glow overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-indigo-50/0 group-hover:from-indigo-50/40 group-hover:to-purple-50/20 transition-all duration-300 pointer-events-none rounded-2xl" />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] font-mono">{project.project_code}</span>
              <span className={`text-[9px] font-bold border rounded-full px-2 py-0.5 ${sc.cls}`}>{sc.label}</span>
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 leading-snug group-hover:text-indigo-700 transition-colors line-clamp-2">
              {project.project_name}
            </h3>
          </div>
          <div className="shrink-0">
            {rag ? (
              <RagBadge rag={rag} showDot />
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[10px] bg-slate-100 text-slate-500 border border-slate-200 rounded-full px-2.5 py-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                No score
              </span>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-5 h-5 rounded-md bg-slate-100 shrink-0">
              <svg className="h-3 w-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs text-slate-700 font-semibold truncate block">{project.account_name}</span>
              <span className="text-[10px] text-slate-400 truncate block">{project.business_unit_name}</span>
            </div>
          </div>
          {(project.start_date || project.target_end_date) && (
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-5 h-5 rounded-md bg-slate-100 shrink-0">
                <svg className="h-3 w-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs text-slate-500 truncate">
                {formatDate(project.start_date)} {project.target_end_date && `→ ${formatDate(project.target_end_date)}`}
              </span>
            </div>
          )}
        </div>

        {/* Footer action row */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${dotBg}`} />
            <span className="text-[10px] font-semibold text-slate-500">{rag ?? "Pending"}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 group-hover:text-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity">
            View KPI Summary
            <svg className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function ProjectSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 animate-pulse space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="h-2.5 w-20 bg-slate-200 rounded-full" />
          <div className="h-4 w-3/4 bg-slate-200 rounded" />
        </div>
        <div className="h-6 w-16 bg-slate-200 rounded-full shrink-0" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-slate-100 rounded" />
        <div className="h-3 w-2/3 bg-slate-100 rounded" />
      </div>
      <div className="h-px bg-slate-100" />
      <div className="h-3 w-1/3 bg-slate-100 rounded" />
    </div>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
export function DashboardShellPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  useEffect(() => {
    listProjects()
      .then(data => setProjects(data.sort((a, b) => a.project_name.localeCompare(b.project_name))))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const atRisk = projects.filter(p => p.current_rag === "AMBER" || p.current_rag === "RED" || p.current_rag === "CRITICAL");

  return (
    <div className="space-y-8">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 shadow-2xl">
        {/* Ambient light effects */}
        <div className="absolute top-0 left-0 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">PM Workspace</span>
              </span>
            </div>
            <h1 className="text-3xl font-black text-white leading-tight">
              Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}, {firstName}
            </h1>
            <p className="text-sm text-slate-400 mt-1.5">{today}</p>
            {atRisk.length > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span className="text-xs font-bold text-amber-300">{atRisk.length} project{atRisk.length > 1 ? "s" : ""} need your attention</span>
              </div>
            )}
          </div>
          <Link
            to="/pm/projects?create=1"
            className="inline-flex items-center gap-2 rounded-2xl bg-white hover:bg-indigo-50 text-slate-900 text-sm font-bold px-6 py-3 transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </Link>
        </div>
      </div>

      {/* ── Stats ── */}
      {!loading && !error && <DashboardStats projects={projects} />}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="rounded-2xl h-32 bg-slate-200 animate-pulse" />)}
        </div>
      )}

      {/* ── Quick Actions + RAG breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-extrabold text-slate-900">Quick Actions</h2>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <QuickAction to="/pm/projects" label="My Projects" desc="View and manage all assigned projects"
              accent="bg-indigo-100"
              icon={<svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
            />
            <QuickAction to="/pm/summary" label="KPI Summary" desc="Track metric trends and health scores"
              accent="bg-emerald-100"
              icon={<svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            />
            <QuickAction to="/pm/projects?create=1" label="Create Project" desc="Start a new project with engagement model"
              accent="bg-purple-100"
              icon={<svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
            />
            {projects.length > 0 && (
              <QuickAction
                to={`/pm/projects/${projects[0].id}/qpm/entry`}
                label="Enter KPI Data" desc="Log metrics for your latest project"
                accent="bg-amber-100"
                icon={<svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
              />
            )}
          </div>
        </div>

        {/* RAG breakdown panel */}
        {!loading && !error && projects.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <h2 className="text-sm font-extrabold text-slate-900">Portfolio Health</h2>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            <div className="space-y-3">
              {(["GREEN","AMBER","RED"] as const).map((rag) => {
                const cnt = projects.filter(p => p.current_rag === rag || (rag === "RED" && p.current_rag === "CRITICAL")).length;
                const pct = projects.length > 0 ? Math.round((cnt / projects.length) * 100) : 0;
                const cfg = { GREEN: { label: "Green", bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" }, AMBER: { label: "Amber", bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" }, RED: { label: "Red / Critical", bar: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50" } }[rag];
                return (
                  <div key={rag}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className={`font-bold ${cfg.text}`}>{cfg.label}</span>
                      <span className="font-bold text-slate-900">{cnt} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-2 rounded-full ${cfg.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500">No Score</span>
                  <span className="font-bold text-slate-900">{projects.filter(p => !p.current_rag).length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Projects section heading ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-extrabold text-slate-900">Your Projects</h2>
          {!loading && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black">
              {projects.length}
            </span>
          )}
        </div>
        {!loading && projects.length > 0 && (
          <Link to="/pm/projects" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors group">
            View all
            <svg className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>

      {/* ── Project Grid ── */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1,2,3].map(i => <ProjectSkeleton key={i} />)}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center w-12 h-12 rounded-full bg-rose-100">
            <svg className="h-6 w-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-rose-800">Could not connect to the server</p>
          <p className="text-xs text-rose-500 mt-1">Make sure the backend is running, then refresh.</p>
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100">
            <svg className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-sm font-bold text-slate-700">No projects yet</p>
          <p className="text-xs text-slate-400 mt-1 mb-5">Create your first project to get started with KPI tracking.</p>
          <Link to="/pm/projects?create=1" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white transition-colors shadow-lg shadow-indigo-500/30">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Create First Project
          </Link>
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
    </div>
  );
}
