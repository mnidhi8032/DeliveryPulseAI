/**
 * PM Dashboard — redesigned landing page.
 * Uses only existing project data (listProjects API).
 * No new APIs, no fake numbers, no new business logic.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { listProjects } from "../../services/projectService";
import { RagBadge } from "../../components/RagBadge";
import type { Project } from "../../types/project";

// ─── RAG accent colour map ────────────────────────────────────────────────────
const RAG_BORDER: Record<string, string> = {
  GREEN:  "border-l-emerald-500",
  AMBER:  "border-l-amber-500",
  RED:    "border-l-rose-500",
};
const RAG_GLOW: Record<string, string> = {
  GREEN:  "shadow-emerald-100",
  AMBER:  "shadow-amber-100",
  RED:    "shadow-rose-100",
};

// ─── Sub-component: Dashboard Header ─────────────────────────────────────────
function DashboardHeader({ name }: { name: string }) {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">
          Project Manager Workspace
        </p>
        <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">
          Welcome back, {name} 👋
        </h1>
        <p className="text-sm text-slate-400 mt-1">{today}</p>
      </div>
      {/* Create project CTA */}
      <Link
        to="/pm/projects?create=1"
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2.5 transition-colors shadow-sm"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Create Project
      </Link>
    </div>
  );
}

// ─── Sub-component: Stat Card ─────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;   // Tailwind bg class for icon bg
  to?: string;
}
function StatCard({ label, value, sub, icon, accent, to }: StatCardProps) {
  const inner = (
    <div className={`flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow ${to ? "cursor-pointer hover:border-indigo-300" : ""}`}>
      <div className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-extrabold text-slate-900 leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

// ─── Sub-component: Dashboard Stats ──────────────────────────────────────────
function DashboardStats({ projects }: { projects: Project[] }) {
  const total   = projects.length;
  const green   = projects.filter(p => p.current_rag === "GREEN").length;
  const amber   = projects.filter(p => p.current_rag === "AMBER").length;
  const red     = projects.filter(p => p.current_rag === "RED").length;
  const noScore = projects.filter(p => !p.current_rag).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        label="Total Projects"
        value={total}
        sub={total === 1 ? "1 project assigned" : `${total} projects assigned`}
        to="/pm/projects"
        accent="bg-indigo-100"
        icon={
          <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
          </svg>
        }
      />
      <StatCard
        label="Green Health"
        value={green}
        sub={`${total > 0 ? Math.round((green / total) * 100) : 0}% of projects`}
        accent="bg-emerald-100"
        icon={
          <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        }
      />
      <StatCard
        label="Needs Attention"
        value={amber + red}
        sub={`${amber} amber · ${red} red`}
        accent="bg-amber-100"
        icon={
          <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        }
      />
      <StatCard
        label="No Score Yet"
        value={noScore}
        sub="Awaiting first entry"
        to="/pm/projects"
        accent="bg-slate-100"
        icon={
          <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
    </div>
  );
}

// ─── Sub-component: Project Card ──────────────────────────────────────────────
function ProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate();
  const rag = project.current_rag;
  const borderAccent = rag ? (RAG_BORDER[rag] ?? "border-l-slate-300") : "border-l-slate-200";
  const shadowAccent = rag ? (RAG_GLOW[rag]   ?? "") : "";

  const updatedAt = project.updated_at
    ? new Date(project.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  const startDate = project.start_date
    ? new Date(project.start_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  const statusColor: Record<string, string> = {
    ACTIVE:    "bg-emerald-50 text-emerald-700 border-emerald-200",
    ON_HOLD:   "bg-amber-50 text-amber-700 border-amber-200",
    COMPLETED: "bg-blue-50 text-blue-700 border-blue-200",
    CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
  };
  const statusLabel: Record<string, string> = {
    ACTIVE: "Active", ON_HOLD: "On Hold", COMPLETED: "Completed", CANCELLED: "Cancelled",
  };

  return (
    <div
      onClick={() => navigate(`/pm/projects/${project.id}/qpm/summary`)}
      className={`group relative rounded-2xl border border-slate-200 border-l-4 ${borderAccent} bg-white p-5 shadow-sm hover:shadow-lg ${shadowAccent} transition-all duration-200 cursor-pointer hover:-translate-y-0.5`}
    >
      {/* Top row: name + status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            {project.project_code}
          </p>
          <h3 className="text-sm font-extrabold text-slate-900 leading-snug group-hover:text-indigo-700 transition-colors line-clamp-2">
            {project.project_name}
          </h3>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          {rag
            ? <RagBadge rag={rag} showDot />
            : <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 rounded px-2 py-0.5 font-semibold">No score</span>
          }
          <span className={`text-[10px] font-bold border rounded px-2 py-0.5 ${statusColor[project.status] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
            {statusLabel[project.status] ?? project.status}
          </span>
        </div>
      </div>

      {/* Info rows */}
      <div className="space-y-1.5 mb-4">
        <InfoRow
          icon={<BuildingIcon />}
          label={project.account_name}
          sub={project.business_unit_name}
        />
        {startDate && (
          <InfoRow
            icon={<CalendarIcon />}
            label={`Started ${startDate}`}
            sub={project.target_end_date
              ? `Due ${new Date(project.target_end_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
              : undefined
            }
          />
        )}
        {updatedAt && (
          <InfoRow
            icon={<ClockIcon />}
            label={`Updated ${updatedAt}`}
          />
        )}
      </div>

      {/* Action buttons — removed, card click leads to summary */}
    </div>
  );
}

// tiny icon helpers
function InfoRow({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500">
      <span className="shrink-0 text-slate-300">{icon}</span>
      <span className="truncate">{label}</span>
      {sub && <><span className="text-slate-300">·</span><span className="truncate text-slate-400">{sub}</span></>}
    </div>
  );
}
const BuildingIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);
const CalendarIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const ClockIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ─── Sub-component: Project Grid ──────────────────────────────────────────────
function ProjectGrid({ projects, loading, error }: { projects: Project[]; loading: boolean; error: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 animate-pulse space-y-3">
            <div className="h-3 w-1/3 bg-slate-200 rounded" />
            <div className="h-4 w-2/3 bg-slate-200 rounded" />
            <div className="h-3 w-full bg-slate-100 rounded" />
            <div className="h-3 w-3/4 bg-slate-100 rounded" />
            <div className="h-8 w-28 bg-slate-200 rounded-xl mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
        <div className="mx-auto mb-3 flex items-center justify-center w-12 h-12 rounded-full bg-rose-100">
          <svg className="h-6 w-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <p className="text-sm font-bold text-rose-800">Could not connect to the server</p>
        <p className="text-xs text-rose-500 mt-1">Make sure the backend is running, then refresh the page.</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center">
        <div className="mx-auto mb-4 flex items-center justify-center w-14 h-14 rounded-full bg-indigo-50">
          <svg className="h-7 w-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
          </svg>
        </div>
        <p className="text-sm font-bold text-slate-600">No projects assigned yet</p>
        <p className="text-xs text-slate-400 mt-1">Contact your Delivery Manager to get a project assigned.</p>
        <Link to="/pm/projects"
          className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors">
          Go to My Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map(p => <ProjectCard key={p.id} project={p} />)}
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

  return (
    <div className="space-y-7">
      {/* Header */}
      <DashboardHeader name={firstName} />

      {/* Stats */}
      {!loading && <DashboardStats projects={projects} />}

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        <Link to="/pm/projects"
          className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-4 py-2 transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
          All Projects
        </Link>
        <Link to="/pm/summary"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2 transition-colors shadow-sm">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          KPI Summary
        </Link>
      </div>

      {/* Section heading */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Your Projects</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {loading ? "Loading…" : `${projects.length} project${projects.length !== 1 ? "s" : ""} assigned to you`}
          </p>
        </div>
        {!loading && projects.length > 0 && (
          <Link to="/pm/projects"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
            View all →
          </Link>
        )}
      </div>

      {/* Project grid */}
      <ProjectGrid projects={projects} loading={loading} error={error} />
    </div>
  );
}
