import type { SubmissionHealth } from "../types/metrics";
import { RagBadge } from "./RagBadge";

interface HealthPanelProps {
  health: SubmissionHealth | null;
  loading?: boolean;
  error?: string | null;
}

export function HealthPanel({ health, loading, error }: HealthPanelProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">Calculating health…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Health</h2>
        <p className="mt-2 text-sm text-slate-500">Save metrics to see health scores.</p>
      </div>
    );
  }

  if (!health.health_available) {
    return (
      <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-xl pointer-events-none"></div>
        
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Health</h2>
        
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          
          <h3 className="text-sm font-bold text-slate-800">Health unavailable</h3>
          <p className="mt-1 text-xs font-semibold text-slate-600">
            {health.metrics_completed}/{health.metrics_required} metrics completed
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Complete remaining metrics
          </p>
          
          <div className="mt-4 w-full max-w-[200px] h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, Math.max(0, (health.metrics_completed / health.metrics_required) * 100))}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Health</h2>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="text-2xl font-semibold text-slate-900">
          {Number(health.overall_score ?? 0).toFixed(1)}
        </span>
        {health.rag_status && <RagBadge rag={health.rag_status} />}
      </div>
      {health.explanation && (
        <p className="mt-2 text-xs text-slate-600">{health.explanation}</p>
      )}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {health.dimension_scores.map((d) => (
          <div
            key={d.dimension_name}
            className="rounded border border-slate-100 bg-slate-50 px-3 py-2"
          >
            <p className="text-xs font-medium text-slate-700">{d.dimension_name}</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900">
                {Number(d.score).toFixed(1)}
              </span>
              <RagBadge rag={d.rag_status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
