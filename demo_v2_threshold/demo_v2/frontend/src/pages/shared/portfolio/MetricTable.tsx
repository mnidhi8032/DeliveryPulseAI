/**
 * Metric Table — Horizontally scrollable table of project metrics
 * Only the metrics section scrolls; header remains fixed
 */
import { MetricRow } from "./MetricRow";
import type { KpiSummaryMetric } from "../../../types/qpm";

interface MetricTableProps {
  metrics: KpiSummaryMetric[];
}

export function MetricTable({ metrics }: MetricTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-100">
          <tr>
            <th className="sticky left-0 z-10 bg-slate-100 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
              Metric Name
            </th>
            <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
              Category
            </th>
            <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-700">
              Current Value
            </th>
            <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-700">
              Target
            </th>
            <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-700">
              RAG Status
            </th>
            <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-700">
              Trend
            </th>
            <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
              Last Updated
            </th>
            <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
              Frequency
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {metrics.map((metric) => (
            <MetricRow key={metric.plan_metric_id} metric={metric} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
