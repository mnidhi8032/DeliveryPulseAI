/**
 * Sheet 4 -- KPI Summary Dashboard
 * Visual overview: RAG donut, per-category breakdown, metric cards with trend sparkline.
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { getProject } from "../../services/projectService";
import { getKpiPlan, getKpiSummary } from "../../services/qpmService";
import type { Project } from "../../types/project";
import type { KpiSummary, KpiSummaryMetric } from "../../types/qpm";

const RAG_COLOR: Record<string, string> = {
  GREEN: "#10b981", AMBER: "#f59e0b", RED: "#f43f5e",
};
const RAG_BADGE: Record<string, string> = {
  GREEN: "bg-emerald-100 text-emerald-800 border-emerald-300",
  AMBER: "bg-amber-100 text-amber-800 border-amber-300",
  RED: "bg-rose-100 text-rose-800 border-rose-300",
};

function RagDonut({ green, amber, red, noData }: { green: number; amber: number; red: number; noData: number }) {
  const total = green + amber + red + noData || 1;
  const R = 54; const cx = 64; const cy = 64;
  const circ = 2 * Math.PI * R;
  const slices = [
    { value: green, color: "#10b981" },
    { value: amber, color: "#f59e0b" },
    { value: red, color: "#f43f5e" },
    { value: noData, color: "#e2e8f0" },
  ];
  let offset = 0;
  const arcs = slices.map((s) => {
    const dash = (s.value / total) * circ;
    const arc = { dash, offset, color: s.color };
    offset += dash;
    return arc;
  });
  return (
    <svg viewBox="0 0 128 128" className="w-40 h-40">
      {arcs.map((a, i) => (
        <circle key={i} cx={cx} cy={cy} r={R} fill="none"
          stroke={a.color} strokeWidth={18}
          strokeDasharray={`${a.dash} ${circ - a.dash}`}
          strokeDashoffset={-a.offset + circ / 4}
          style={{ transition: "stroke-dasharray 0.5s ease" }} />
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={22} fontWeight="bold" fill="#1e293b">{total - noData}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={9} fill="#94a3b8">of {total}</text>
    </svg>
  );
}

function TrendArrow({ trend }: { trend: string | null }) {
  if (trend === "improving") return <span className="text-emerald-600 font-bold text-sm" title="Improving">[+]</span>;
  if (trend === "declining") return <span className="text-rose-600 font-bold text-sm" title="Declining">[-]</span>;
  if (trend === "stable") return <span className="text-slate-400 font-bold text-sm" title="Stable">[=]</span>;
  return <span className="text-slate-200">--</span>;
}

/** Inline SVG sparkline showing value over periods with RAG colour dots */
function Sparkline({ history }: {
  history: KpiSummaryMetric["history"];
}) {
  if (!history || history.length < 2) {
    return (
      <div className="flex items-center justify-center h-10 text-[10px] text-slate-300">
        {history?.length === 1 ? "1 period -- need 2+ for trend" : "No data"}
      </div>
    );
  }
  const values = history.map(h => h.actual_value ?? 0);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const W = 120; const H = 36; const pad = 4;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = pad + ((maxV - v) / range) * (H - pad * 2);
    return { x, y, rag: history[i].rag_status };
  });
  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10">
      {history[0].target != null && (() => {
        const ty = pad + ((maxV - (history[0].target ?? 0)) / range) * (H - pad * 2);
        return <line x1={pad} y1={ty} x2={W - pad} y2={ty} stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2,2" />;
      })()}
      <polyline points={polyline} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3"
          fill={p.rag ? RAG_COLOR[p.rag] || "#94a3b8" : "#94a3b8"}
          stroke="white" strokeWidth="1" />
      ))}
    </svg>
  );
}

/** Expanded trend panel shown when user clicks a metric card */
function MetricTrendPanel({ m, onClose }: { m: KpiSummaryMetric; onClose: () => void }) {
  const history = m.history ?? [];
  const RAG_BG: Record<string, string> = {
    GREEN: "bg-emerald-50 text-emerald-800",
    AMBER: "bg-amber-50 text-amber-800",
    RED: "bg-rose-50 text-rose-800",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-lg p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{m.metric_category}</p>
          <h3 className="text-sm font-bold text-slate-900">{m.metric_name}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {m.intent} | {m.uom} | {history.length} period{history.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer text-xs font-bold">[x] Close</button>
      </div>

      {history.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">No measurements yet for this metric.</p>
      ) : (
        <>
          {/* Full-width sparkline */}
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Value over time</p>
            <Sparkline history={history} />
            <div className="flex gap-4 mt-2 text-[10px] text-slate-500 justify-end">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />GREEN</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />AMBER</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />RED</span>
              <span className="flex items-center gap-1"><span className="border-b border-dashed border-slate-400 w-4 inline-block" />Target</span>
            </div>
          </div>

          {/* Period-by-period table */}
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-400 font-semibold">
                <tr>
                  <th className="px-3 py-2 text-left">Period</th>
                  <th className="px-3 py-2 text-right">Value</th>
                  <th className="px-3 py-2 text-right">Target</th>
                  <th className="px-3 py-2 text-right">LSL</th>
                  <th className="px-3 py-2 text-right">USL</th>
                  <th className="px-3 py-2 text-center">RAG</th>
                  <th className="px-3 py-2 text-left">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...history].reverse().map((h, i) => (
                  <tr key={i} className={`${i === 0 ? "font-semibold" : ""} hover:bg-slate-50`}>
                    <td className="px-3 py-2 font-medium text-slate-700">
                      {h.frequency_name || "--"}
                      {i === 0 && <span className="ml-1 text-[9px] bg-indigo-100 text-indigo-700 border border-indigo-200 rounded px-1 font-bold">Latest</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-slate-900">
                      {h.actual_value != null ? Number(h.actual_value).toFixed(2) : "--"}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">{h.target ?? "--"}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{h.lsl ?? "--"}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{h.usl ?? "--"}</td>
                    <td className="px-3 py-2 text-center">
                      {h.rag_status ? (
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${RAG_BG[h.rag_status] || "bg-slate-100 text-slate-600"}`}>
                          {h.rag_status}
                        </span>
                      ) : <span className="text-slate-300">--</span>}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {h.submitted_date ? new Date(h.submitted_date).toLocaleDateString() : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Threshold change note */}
          {(() => {
            const targets = history.map(h => h.target).filter(v => v != null);
            const uniqueTargets = [...new Set(targets.map(String))];
            const lsls = history.map(h => h.lsl).filter(v => v != null);
            const uniqueLsls = [...new Set(lsls.map(String))];
            const usls = history.map(h => h.usl).filter(v => v != null);
            const uniqueUsls = [...new Set(usls.map(String))];
            const hasThresholdChange = uniqueTargets.length > 1 || uniqueLsls.length > 1 || uniqueUsls.length > 1;
            if (!hasThresholdChange) return null;
            return (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                <span className="font-bold">Threshold changes detected</span> -- this metric had different Target/LSL/USL values across periods.
                Each period used its own thresholds for RAG computation.
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

function RagDot({ rag }: { rag: string | null }) {
  if (rag === "GREEN") return <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" />;
  if (rag === "AMBER") return <span className="inline-block w-3 h-3 rounded-full bg-amber-500" />;
  if (rag === "RED") return <span className="inline-block w-3 h-3 rounded-full bg-rose-500" />;
  return <span className="inline-block w-3 h-3 rounded-full bg-slate-300" />;
}

function MetricCard({ m, onSelect, isSelected }: { m: KpiSummaryMetric; onSelect: () => void; isSelected: boolean }) {
  const rag = m.rag_status;
  const border = isSelected
    ? "border-indigo-400 ring-2 ring-indigo-200"
    : rag === "GREEN" ? "border-emerald-200" : rag === "AMBER" ? "border-amber-200" : rag === "RED" ? "border-rose-200" : "border-slate-200";

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border ${border} bg-white p-4 shadow-sm flex flex-col gap-2 hover:shadow-md transition-all cursor-pointer`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">{m.metric_category}</p>
          <p className="text-xs font-bold text-slate-800 leading-snug mt-0.5 line-clamp-2" title={m.metric_name}>{m.metric_name}</p>
        </div>
        <RagDot rag={rag} />
      </div>

      <div className="flex items-end justify-between gap-2 mt-auto">
        <div>
          <p className="text-[10px] text-slate-400">Latest</p>
          <p className="text-xl font-extrabold text-slate-900">
            {m.latest_value !== null && m.latest_value !== undefined ? Number(m.latest_value).toFixed(2) : "--"}
            {m.uom && <span className="text-xs font-normal text-slate-400 ml-1">{m.uom}</span>}
          </p>
        </div>
        <div className="text-right">
          <TrendArrow trend={m.trend} />
          {rag && (
            <span className={`mt-1 block rounded-full px-2 py-0.5 text-[9px] font-bold border ${RAG_BADGE[rag]}`}>{rag}</span>
          )}
        </div>
      </div>

      {/* Mini sparkline */}
      <div className="border-t border-slate-100 pt-2">
        <Sparkline history={m.history ?? []} />
      </div>

      <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-500">
        <div><span className="font-bold text-slate-700">T:</span> {m.target ?? "--"}</div>
        <div><span className="font-bold text-slate-700">L:</span> {m.lsl ?? "--"}</div>
        <div><span className="font-bold text-slate-700">U:</span> {m.usl ?? "--"}</div>
      </div>
      <p className="text-[10px] text-slate-400">
        {m.measurement_count} period{m.measurement_count !== 1 ? "s" : ""}
        {(m.history?.length ?? 0) > 0 && <span className="ml-1 text-indigo-500">(click for trend)</span>}
      </p>
    </div>
  );
}

export function QPMSummaryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const toast = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<KpiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("");
  const [ragFilter, setRagFilter] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<KpiSummaryMetric | null>(null);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([getProject(projectId), getKpiPlan(projectId)])
      .then(([proj, plan]) => {
        setProject(proj);
        return getKpiSummary(plan.id);
      })
      .then(setSummary)
      .catch(() => toast.error("Failed to load KPI summary"))
      .finally(() => setLoading(false));
  }, [projectId]);

  const categories = [...new Set(summary?.metrics.map((m) => m.metric_category).filter(Boolean))];

  const filtered = (summary?.metrics || []).filter((m) => {
    const matchCat = !catFilter || m.metric_category === catFilter;
    const matchRag = !ragFilter || m.rag_status === ragFilter;
    return matchCat && matchRag;
  });

  const catBreakdown = categories.map((cat) => {
    const catMetrics = summary?.metrics.filter((m) => m.metric_category === cat) || [];
    return {
      cat,
      green: catMetrics.filter((m) => m.rag_status === "GREEN").length,
      amber: catMetrics.filter((m) => m.rag_status === "AMBER").length,
      red: catMetrics.filter((m) => m.rag_status === "RED").length,
      total: catMetrics.length,
    };
  });

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-1/3 rounded bg-slate-200" />
      <div className="h-80 rounded-xl bg-slate-200" />
    </div>
  );

  return (
    <div className="space-y-6 text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to={`/pm/projects/${projectId}/qpm`} className="text-xs text-slate-500 hover:text-slate-800">Back to KPI Plan</Link>
          <h1 className="mt-1 text-xl font-bold text-slate-900">KPI Summary -- {project?.project_name}</h1>
          <p className="text-xs text-slate-500">{summary?.project_type} | {summary?.delivery_process_model}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/pm/projects/${projectId}/qpm/entry`}
            className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">Enter Data</Link>
          <Link to={`/pm/projects/${projectId}/qpm/tracker`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer">Open Tracker</Link>
        </div>
      </div>

      {/* Overall Project RAG */}
      {summary?.overall_rag && (
        <div className={`rounded-xl border p-4 flex items-center gap-4 shadow-sm ${
          summary.overall_rag === "RED"   ? "bg-rose-50 border-rose-200" :
          summary.overall_rag === "AMBER" ? "bg-amber-50 border-amber-200" :
          "bg-emerald-50 border-emerald-200"
        }`}>
          {/* Coloured status box instead of emoji */}
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-extrabold text-white text-lg shrink-0 ${
            summary.overall_rag === "RED" ? "bg-rose-500" :
            summary.overall_rag === "AMBER" ? "bg-amber-500" : "bg-emerald-500"
          }`}>
            {summary.overall_rag === "RED" ? "R" : summary.overall_rag === "AMBER" ? "A" : "G"}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Overall Project RAG</p>
            <p className={`text-xl font-extrabold ${
              summary.overall_rag === "RED" ? "text-rose-700" :
              summary.overall_rag === "AMBER" ? "text-amber-700" : "text-emerald-700"
            }`}>{summary.overall_rag}</p>
          </div>
          <div className="ml-4 text-xs text-slate-500">
            <p>Any category RED = project RED</p>
            <p>else any AMBER = AMBER, else GREEN</p>
          </div>
        </div>
      )}

      {/* Dimension RAG */}
      {summary?.category_rag && Object.keys(summary.category_rag).length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Dimension RAG Status</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(summary.category_rag).map(([cat, rag]) => (
              <div key={cat} className={`rounded-lg border p-3 text-center ${
                rag === "RED"   ? "bg-rose-50 border-rose-200" :
                rag === "AMBER" ? "bg-amber-50 border-amber-200" :
                "bg-emerald-50 border-emerald-200"
              }`}>
                <p className="text-[10px] font-bold text-slate-500 truncate mb-1" title={cat}>{cat}</p>
                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold border ${
                  rag === "RED"   ? "bg-rose-100 text-rose-700 border-rose-300" :
                  rag === "AMBER" ? "bg-amber-100 text-amber-700 border-amber-300" :
                  "bg-emerald-100 text-emerald-700 border-emerald-300"
                }`}>{rag}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overview charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col items-center gap-4">
          <h2 className="text-sm font-bold text-slate-900 self-start">Overall KPI Health</h2>
          <RagDonut green={summary?.green_count || 0} amber={summary?.amber_count || 0} red={summary?.red_count || 0} noData={summary?.no_data_count || 0} />
          <div className="flex gap-6 text-xs">
            {[
              { label: "GREEN", val: summary?.green_count, color: "bg-emerald-500" },
              { label: "AMBER", val: summary?.amber_count, color: "bg-amber-500" },
              { label: "RED", val: summary?.red_count, color: "bg-rose-500" },
              { label: "No Data", val: summary?.no_data_count, color: "bg-slate-300" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-full ${s.color}`} />
                <span className="text-slate-600">{s.label}: <b>{s.val}</b></span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4">By Category</h2>
          <div className="space-y-3">
            {catBreakdown.map(({ cat, green, amber, red, total }) => {
              const greenPct = total ? (green / total) * 100 : 0;
              const amberPct = total ? (amber / total) * 100 : 0;
              const redPct = total ? (red / total) * 100 : 0;
              return (
                <div key={cat as string}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700 truncate max-w-[180px]">{cat}</span>
                    <span className="text-slate-400">{total} metrics</span>
                  </div>
                  <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100">
                    {greenPct > 0 && <div style={{ width: `${greenPct}%` }} className="bg-emerald-500" />}
                    {amberPct > 0 && <div style={{ width: `${amberPct}%` }} className="bg-amber-400" />}
                    {redPct > 0 && <div style={{ width: `${redPct}%` }} className="bg-rose-500" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setSelectedMetric(null); }}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c!}>{c}</option>)}
        </select>
        <select value={ragFilter} onChange={(e) => { setRagFilter(e.target.value); setSelectedMetric(null); }}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400">
          <option value="">All RAG</option>
          <option value="GREEN">GREEN</option>
          <option value="AMBER">AMBER</option>
          <option value="RED">RED</option>
        </select>
        <span className="text-xs text-slate-400">{filtered.length} metrics</span>
        {selectedMetric && (
          <button onClick={() => setSelectedMetric(null)} className="ml-auto text-xs text-indigo-600 hover:underline cursor-pointer">
            Clear selection
          </button>
        )}
      </div>

      {/* Trend panel */}
      {selectedMetric && (
        <MetricTrendPanel m={selectedMetric} onClose={() => setSelectedMetric(null)} />
      )}

      {/* Metric cards grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-sm text-slate-400">No metrics with measurements yet.</p>
          <Link to={`/pm/projects/${projectId}/qpm/entry`} className="mt-3 inline-block text-xs text-indigo-600 hover:underline">Enter measurements</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((m) => (
            <MetricCard
              key={m.plan_metric_id}
              m={m}
              isSelected={selectedMetric?.plan_metric_id === m.plan_metric_id}
              onSelect={() => setSelectedMetric(
                selectedMetric?.plan_metric_id === m.plan_metric_id ? null : m
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
