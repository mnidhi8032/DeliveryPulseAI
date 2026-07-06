/**
 * Project Portfolio Card — Individual project with header + metrics table
 */
import { useEffect, useState } from "react";
import { ProjectHeader } from "./ProjectHeader";
import { MetricTable } from "./MetricTable";
import type { Project } from "../../../types/project";
import type { KpiPlan, KpiSummaryMetric } from "../../../types/qpm";
import { getKpiPlan, getKpiSummary } from "../../../services/qpmService";

interface ProjectPortfolioCardProps {
  project: Project;
  kpiPlan?: KpiPlan;  // Pre-fetched by the parent to avoid duplicate requests
}

export interface PlanMeta {
  projectType: string | null;
  projectCategory: string | null;
}

export function ProjectPortfolioCard({ project, kpiPlan: prefetchedPlan }: ProjectPortfolioCardProps) {
  const [metrics, setMetrics] = useState<KpiSummaryMetric[]>([]);
  const [planMeta, setPlanMeta] = useState<PlanMeta>({
    projectType: prefetchedPlan?.project_type ?? null,
    projectCategory: prefetchedPlan?.project_category ?? null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Use the pre-fetched plan if available; otherwise fetch it
        const plan = prefetchedPlan ?? (await getKpiPlan(project.id));
        setPlanMeta({
          projectType: plan.project_type,
          projectCategory: plan.project_category,
        });
        const summary = await getKpiSummary(plan.id);
        setMetrics(summary.metrics);
      } catch {
        setError("Metrics unavailable");
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <ProjectHeader project={project} planMeta={planMeta} />

      <div className="border-t border-slate-100 bg-slate-50/50">
        {loading ? (
          <div className="px-6 py-8 text-center">
            <p className="text-xs text-slate-400">Loading metrics...</p>
          </div>
        ) : error ? (
          <div className="px-6 py-8 text-center">
            <p className="text-xs text-slate-400">{error}</p>
          </div>
        ) : metrics.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-xs text-slate-400">No metrics configured yet</p>
          </div>
        ) : (
          <MetricTable metrics={metrics} />
        )}
      </div>
    </div>
  );
}
