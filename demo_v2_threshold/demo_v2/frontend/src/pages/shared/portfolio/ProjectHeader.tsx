/**
 * Project Header — Top section of portfolio card
 * Shows: Project name, Overall RAG, BU, Account, Type, Category
 */
import { RagBadge } from "../../../components/RagBadge";
import type { Project } from "../../../types/project";
import type { PlanMeta } from "./ProjectPortfolioCard";

interface ProjectHeaderProps {
  project: Project;
  planMeta: PlanMeta;
}

// Inline SVG icons to match project's no-icon-lib pattern
function BuildingIcon() {
  return (
    <svg className="h-4 w-4 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg className="h-4 w-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    </svg>
  );
}

function MetaItem({
  iconEl,
  iconBg,
  label,
  value,
}: {
  iconEl: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        {iconEl}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="truncate text-sm font-medium text-slate-900" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}

export function ProjectHeader({ project, planMeta }: ProjectHeaderProps) {
  return (
    <div className="px-6 py-5">
      {/* Project Name + RAG Badge Row */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">{project.project_name}</h2>
          <p className="mt-0.5 font-mono text-xs text-slate-400">{project.project_code}</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-200">
          <span className="text-xs font-semibold text-slate-500">Overall Health</span>
          {project.current_rag ? (
            <RagBadge rag={project.current_rag} showDot />
          ) : (
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-400">
              No data
            </span>
          )}
        </div>
      </div>

      {/* Project Meta Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetaItem
          iconEl={<BuildingIcon />}
          iconBg="bg-indigo-100"
          label="Business Unit"
          value={project.business_unit_name || "—"}
        />
        <MetaItem
          iconEl={<BriefcaseIcon />}
          iconBg="bg-emerald-100"
          label="Account"
          value={project.account_name || "—"}
        />
        <MetaItem
          iconEl={<span className="text-xs font-bold text-amber-700">PT</span>}
          iconBg="bg-amber-50"
          label="Project Type"
          value={planMeta.projectType || "—"}
        />
        <MetaItem
          iconEl={<span className="text-xs font-bold text-purple-700">PC</span>}
          iconBg="bg-purple-50"
          label="Category"
          value={planMeta.projectCategory || "—"}
        />
      </div>
    </div>
  );
}
