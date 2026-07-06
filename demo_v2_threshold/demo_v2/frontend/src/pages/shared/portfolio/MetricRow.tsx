/**
 * Metric Row — Individual metric display in the table
 */
import { RagBadge } from "../../../components/RagBadge";
import type { KpiSummaryMetric } from "../../../types/qpm";

interface MetricRowProps {
  metric: KpiSummaryMetric;
}

function TrendIcon({ trend }: { trend: string | null }) {
  if (!trend) return <span className="text-xs text-slate-400">—</span>;
  const t = trend.toLowerCase();
  if (t.includes("up") || t.includes("increas") || t.includes("improv")) {
    return (
      <div className="flex items-center justify-center gap-1 text-emerald-700">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
        <span className="text-xs font-medium">Up</span>
      </div>
    );
  }
  if (t.includes("down") || t.includes("decreas") || t.includes("declin")) {
    return (
      <div className="flex items-center justify-center gap-1 text-red-700">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        <span className="text-xs font-medium">Down</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-1 text-slate-500">
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
      </svg>
      <span className="text-xs font-medium">Stable</span>
    </div>
  );
}

export function MetricRow({ metric }: MetricRowProps) {
  const formatValue = (val: string | number | null, uom: string | null) => {
    if (val == null) return "—";
    const numVal = typeof val === "string" ? parseFloat(val) : val;
    const formatted = isNaN(numVal) ? "—" : numVal.toFixed(2);
    return uom ? `${formatted} ${uom}` : formatted;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const frequency =
    metric.history && metric.history.length > 0
      ? metric.history[metric.history.length - 1]?.frequency_name || "—"
      : "—";

  return (
    <tr className="hover:bg-slate-50">
      <td className="sticky left-0 z-10 bg-white px-4 py-3 hover:bg-slate-50">
        <div className="max-w-[200px]">
          <p className="truncate text-sm font-semibold text-slate-900" title={metric.metric_name}>
            {metric.metric_name}
          </p>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        {metric.metric_category ? (
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
            {metric.metric_category}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900 text-sm">
        {formatValue(metric.latest_value, metric.uom)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right text-slate-600 text-sm">
        {formatValue(metric.target, metric.uom)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-center">
        {metric.rag_status ? (
          <div className="flex justify-center">
            <RagBadge rag={metric.rag_status} showDot />
          </div>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <TrendIcon trend={metric.trend} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
        {formatDate(metric.last_updated)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
        {frequency}
      </td>
    </tr>
  );
}
