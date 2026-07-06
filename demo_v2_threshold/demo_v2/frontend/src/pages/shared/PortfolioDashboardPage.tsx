/**
 * Portfolio Dashboard — Executive View
 * For Platform Admin, Delivery Excellence, CEO
 *
 * Displays all projects as individual cards with:
 * - Sticky filter bar: BU, Account, Project Type, Project Category
 * - Project header: name, RAG, BU, account, type, category
 * - Horizontally scrollable metric table per project
 */
import { useEffect, useMemo, useState } from "react";
import { listProjects } from "../../services/projectService";
import { getKpiPlan } from "../../services/qpmService";
import { PortfolioFilterBar } from "./portfolio/PortfolioFilterBar";
import { ProjectPortfolioCard } from "./portfolio/ProjectPortfolioCard";
import type { Project } from "../../types/project";
import type { KpiPlan } from "../../types/qpm";
import { PROJECT_TYPES, PROJECT_CATEGORIES } from "../../types/qpm";

function RagStat({
  label,
  count,
  dotColor,
  textColor,
}: {
  label: string;
  count: number;
  dotColor: string;
  textColor: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-sm font-bold ${textColor}`}>{count}</span>
    </div>
  );
}

interface ProjectWithPlan extends Project {
  kpiPlan?: KpiPlan;
}

export function PortfolioDashboardPage() {
  const [projects, setProjects] = useState<ProjectWithPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [buFilter, setBuFilter] = useState("All");
  const [accountFilter, setAccountFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    listProjects()
      .then(async (projectList) => {
        // Fetch KPI plans for all projects in parallel to populate Type/Category filters
        const projectsWithPlans = await Promise.all(
          projectList.map(async (project) => {
            try {
              const plan = await getKpiPlan(project.id);
              return { ...project, kpiPlan: plan };
            } catch {
              // If no plan exists, project still shows but without type/category
              return { ...project, kpiPlan: undefined };
            }
          })
        );
        setProjects(projectsWithPlans.sort((a, b) => a.project_name.localeCompare(b.project_name)));
      })
      .catch(() => setError("Failed to load projects"))
      .finally(() => setLoading(false));
  }, []);

  // Derive unique filter options from data
  const businessUnits = useMemo(
    () => ["All", ...Array.from(new Set(projects.map((p) => p.business_unit_name).filter(Boolean))).sort()],
    [projects]
  );

  const accounts = useMemo(() => {
    const source =
      buFilter === "All"
        ? projects
        : projects.filter((p) => p.business_unit_name === buFilter);
    return ["All", ...Array.from(new Set(source.map((p) => p.account_name).filter(Boolean))).sort()];
  }, [projects, buFilter]);

  // Project Type / Category — use full static lists from qpm.ts
  const projectTypes = ["All", ...PROJECT_TYPES];
  const projectCategories = ["All", ...PROJECT_CATEGORIES];

  // Reset account filter when BU changes
  const handleBuChange = (val: string) => {
    setBuFilter(val);
    setAccountFilter("All");
  };

  // Apply filters
  const filteredProjects = useMemo(
    () =>
      projects.filter((p) => {
        const matchBu = buFilter === "All" || p.business_unit_name === buFilter;
        const matchAccount = accountFilter === "All" || p.account_name === accountFilter;
        const matchType = typeFilter === "All" || p.kpiPlan?.project_type === typeFilter;
        const matchCategory = categoryFilter === "All" || p.kpiPlan?.project_category === categoryFilter;
        return matchBu && matchAccount && matchType && matchCategory;
      }),
    [projects, buFilter, accountFilter, typeFilter, categoryFilter]
  );

  // RAG summary counts
  const ragCounts = useMemo(
    () => ({
      green: filteredProjects.filter((p) => p.current_rag === "GREEN").length,
      amber: filteredProjects.filter((p) => p.current_rag === "AMBER").length,
      red: filteredProjects.filter((p) => p.current_rag === "RED").length,
      noData: filteredProjects.filter((p) => !p.current_rag).length,
    }),
    [filteredProjects]
  );

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-10 w-64 rounded-lg bg-slate-200" />
        <div className="h-20 rounded-xl bg-slate-200" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-72 rounded-xl bg-slate-200" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4">
        <p className="text-sm font-medium text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title + RAG Summary */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Portfolio Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            {filteredProjects.length} of {projects.length} projects
          </p>
        </div>

        {/* RAG Summary Pills */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <RagStat label="Green" count={ragCounts.green} dotColor="bg-emerald-500" textColor="text-emerald-700" />
          <div className="h-5 w-px bg-slate-200" />
          <RagStat label="Amber" count={ragCounts.amber} dotColor="bg-amber-500" textColor="text-amber-700" />
          <div className="h-5 w-px bg-slate-200" />
          <RagStat label="Red" count={ragCounts.red} dotColor="bg-red-500" textColor="text-red-700" />
          <div className="h-5 w-px bg-slate-200" />
          <RagStat label="No Data" count={ragCounts.noData} dotColor="bg-slate-300" textColor="text-slate-500" />
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <PortfolioFilterBar
        businessUnits={businessUnits}
        accounts={accounts}
        projectTypes={projectTypes}
        projectCategories={projectCategories}
        selectedBu={buFilter}
        selectedAccount={accountFilter}
        selectedType={typeFilter}
        selectedCategory={categoryFilter}
        onBuChange={handleBuChange}
        onAccountChange={setAccountFilter}
        onTypeChange={setTypeFilter}
        onCategoryChange={setCategoryFilter}
      />

      {/* Project Cards */}
      <div className="space-y-6">
        {filteredProjects.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-sm text-slate-500">No projects match your selected filters</p>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <ProjectPortfolioCard key={project.id} project={project} kpiPlan={project.kpiPlan} />
          ))
        )}
      </div>
    </div>
  );
}
