/**
 * PM -- Summary Dashboard
 * - Dimension cards: click to expand all metrics in that dimension with RAG
 * - Donut: hover slice to see which dimensions fall under that RAG status
 */
import { useEffect, useState } from "react";
import { listProjects } from "../../services/projectService";
import { getKpiPlan, getKpiSummary } from "../../services/qpmService";
import { useToast } from "../../contexts/ToastContext";
import type { Project } from "../../types/project";
import type { KpiSummary, KpiSummaryMetric } from "../../types/qpm";

const RAG_COLOR: Record<string, string> = { GREEN: "#10b981", AMBER: "#f59e0b", RED: "#f43f5e" };
const RAG_BADGE: Record<string, string> = {
  GREEN: "bg-emerald-100 text-emerald-800 border-emerald-300",
  AMBER: "bg-amber-100 text-amber-800 border-amber-300",
  RED:   "bg-rose-100 text-rose-800 border-rose-300",
};
const RAG_BG: Record<string, string> = {
  GREEN: "bg-emerald-50 border-emerald-200",
  AMBER: "bg-amber-50 border-amber-200",
  RED:   "bg-rose-50 border-rose-200",
};
const LABELS = ["GREEN", "AMBER", "RED", "No Data"];
const LABEL_COLORS = ["bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-slate-300"];

// ── Interactive donut with hover tooltip ────────────────────────────────────
function RagDonut({
  green, amber, red, noData,
  categoryRag,
}: {
  green: number; amber: number; red: number; noData: number;
  categoryRag: Record<string, string>;
}) {
  const total = green + amber + red + noData || 1;
  const R = 54; const cx = 64; const cy = 64; const circ = 2 * Math.PI * R;

  const slices = [
    { rag: "GREEN", value: green,  color: "#10b981" },
    { rag: "AMBER", value: amber,  color: "#f59e0b" },
    { rag: "RED",   value: red,    color: "#f43f5e" },
    { rag: null,    value: noData, color: "#e2e8f0" },
  ];

  let offset = 0;
  const arcs = slices.map(s => {
    const dash = (s.value / total) * circ;
    const arc = { ...s, dash, offset };
    offset += dash;
    return arc;
  });

  const [hovered, setHovered] = useState<string | null>(null);

  // Dimensions that match hovered RAG
  const hoveredDimensions = hovered
    ? Object.entries(categoryRag)
        .filter(([, r]) => r === hovered)
        .map(([cat]) => cat)
    : [];

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="relative">
        <svg viewBox="0 0 128 128" className="w-36 h-36">
          {arcs.map((a, i) => (
            <circle
              key={i}
              cx={cx} cy={cy} r={R}
              fill="none"
              stroke={a.color}
              strokeWidth={hovered === a.rag ? 22 : 18}
              strokeDasharray={`${a.dash} ${circ - a.dash}`}
              strokeDashoffset={-a.offset + circ / 4}
              style={{ transition: "stroke-width 0.15s ease", cursor: a.value > 0 ? "pointer" : "default" }}
              onMouseEnter={() => a.rag && a.value > 0 && setHovered(a.rag)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize={22} fontWeight="bold" fill="#1e293b">
            {total - noData}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize={9} fill="#94a3b8">of {total}</text>
        </svg>

        {/* Hover tooltip */}
        {hovered && hoveredDimensions.length > 0 && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-20 bg-white rounded-xl border border-slate-200 shadow-xl p-3 min-w-[160px] pointer-events-none">
            <p className={`text-[10px] font-extrabold mb-2 ${
              hovered === "RED" ? "text-rose-600" : hovered === "AMBER" ? "text-amber-600" : "text-emerald-600"
            }`}>{hovered} Dimensions</p>
            <div className="space-y-1">
              {hoveredDimensions.map(d => (
                <div key={d} className="flex items-center gap-2">
                  <span style={{ background: RAG_COLOR[hovered] }} className="w-2 h-2 rounded-full shrink-0" />
                  <span className="text-xs text-slate-700 font-medium">{d}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center text-xs">
        {[["GREEN", green, "bg-emerald-500"], ["AMBER", amber, "bg-amber-500"], ["RED", red, "bg-rose-500"], ["No Data", noData, "bg-slate-300"]].map(([l, v, c]) => (
          <div key={l as string} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${c}`} />
            <span className="text-slate-600">{l}: <b>{v}</b></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Multi-line trend chart for a single metric ─────────────────────────────
function MetricTrendChart({ metric }: { metric: KpiSummaryMetric }) {
  const history = metric.history ?? [];
  const hasData = history.filter(h => h.actual_value != null).length >= 1;
  if (!hasData) return (
    <div className="flex items-center justify-center h-40 text-xs text-slate-400 bg-slate-50 rounded-lg border border-slate-100">
      Not enough data to show trend
    </div>
  );

  const W = 560; const H = 160; const padL = 40; const padR = 16; const padT = 16; const padB = 32;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const n = history.length;

  // Collect all non-null values to determine Y scale
  const allValues: number[] = [];
  history.forEach(h => {
    if (h.actual_value != null) allValues.push(Number(h.actual_value));
    if (h.target != null) allValues.push(Number(h.target));
    if (h.lsl != null) allValues.push(Number(h.lsl));
    if (h.usl != null) allValues.push(Number(h.usl));
  });
  if (allValues.length === 0) return null;

  const minV = Math.min(...allValues);
  const maxV = Math.max(...allValues);
  const range = maxV - minV || 1;
  const pad5 = range * 0.1; // 10% padding top/bottom
  const yMin = minV - pad5;
  const yMax = maxV + pad5;
  const yRange = yMax - yMin || 1;

  const xPos = (i: number) => padL + (n <= 1 ? chartW / 2 : (i / (n - 1)) * chartW);
  const yPos = (v: number) => padT + ((yMax - v) / yRange) * chartH;

  const buildPath = (vals: (number | null)[]) => {
    const pts = vals.map((v, i) => v != null ? `${xPos(i)},${yPos(v)}` : null).filter(Boolean);
    if (pts.length < 1) return "";
    // Build path with gaps for null values
    let d = "";
    vals.forEach((v, i) => {
      if (v == null) return;
      const x = xPos(i); const y = yPos(v);
      if (d === "" || vals[i - 1] == null) d += `M${x},${y}`;
      else d += `L${x},${y}`;
    });
    return d;
  };

  const actualPath  = buildPath(history.map(h => h.actual_value != null ? Number(h.actual_value) : null));
  const targetPath  = buildPath(history.map(h => h.target != null ? Number(h.target) : null));
  const lslPath     = buildPath(history.map(h => h.lsl != null ? Number(h.lsl) : null));
  const uslPath     = buildPath(history.map(h => h.usl != null ? Number(h.usl) : null));

  // Y-axis ticks
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => yMin + (i / tickCount) * yRange);

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[10px] px-1">
        {[
          { label: "Actual", color: "#3b82f6",  dash: false },
          { label: "Target", color: "#10b981",  dash: true },
          { label: "LSL",    color: "#f59e0b",  dash: true },
          { label: "USL",    color: "#f43f5e",  dash: true },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <svg width="24" height="10">
              <line x1="0" y1="5" x2="24" y2="5" stroke={l.color} strokeWidth="2"
                strokeDasharray={l.dash ? "4,3" : undefined} />
            </svg>
            <span className="text-slate-600 font-medium">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-slate-100 bg-slate-50 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: "340px", height: "160px" }}>
          {/* Grid lines */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={padL} y1={yPos(t)} x2={W - padR} y2={yPos(t)}
                stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3" />
              <text x={padL - 4} y={yPos(t) + 4} textAnchor="end" fontSize="8" fill="#94a3b8">
                {t % 1 === 0 ? t.toFixed(0) : t.toFixed(1)}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {history.map((h, i) => (
            <text key={i} x={xPos(i)} y={H - 6} textAnchor="middle" fontSize="8" fill="#94a3b8">
              {(h.frequency_name || "").substring(0, 8)}
            </text>
          ))}

          {/* Lines */}
          {lslPath    && <path d={lslPath}    fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,4" />}
          {uslPath    && <path d={uslPath}    fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="5,4" />}
          {targetPath && <path d={targetPath} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="5,4" />}
          {actualPath && <path d={actualPath} fill="none" stroke="#3b82f6" strokeWidth="2.5" />}

          {/* Dots for actual values with RAG colour */}
          {history.map((h, i) => h.actual_value != null && (
            <g key={i}>
              <circle cx={xPos(i)} cy={yPos(Number(h.actual_value))} r="4"
                fill={h.rag_status ? RAG_COLOR[h.rag_status] || "#3b82f6" : "#3b82f6"}
                stroke="white" strokeWidth="1.5" />
              <title>{h.frequency_name}: {Number(h.actual_value).toFixed(2)}</title>
            </g>
          ))}
        </svg>
      </div>

      {/* Period table */}
      <div className="overflow-x-auto rounded-lg border border-slate-100">
        <table className="min-w-full text-[10px]">
          <thead className="bg-slate-50 text-slate-400 font-semibold">
            <tr>
              <th className="px-3 py-1.5 text-left">Period</th>
              <th className="px-3 py-1.5 text-right text-blue-600">Actual</th>
              <th className="px-3 py-1.5 text-right text-emerald-600">Target</th>
              <th className="px-3 py-1.5 text-right text-amber-600">LSL</th>
              <th className="px-3 py-1.5 text-right text-rose-600">USL</th>
              <th className="px-3 py-1.5 text-center">RAG</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...history].reverse().map((h, i) => (
              <tr key={i} className={i === 0 ? "bg-indigo-50/30 font-semibold" : "hover:bg-slate-50"}>
                <td className="px-3 py-1.5 font-medium text-slate-700">
                  {h.frequency_name || "--"}
                  {i === 0 && <span className="ml-1.5 text-[8px] bg-indigo-100 text-indigo-700 rounded px-1 font-bold">Latest</span>}
                </td>
                <td className="px-3 py-1.5 text-right font-bold text-slate-900">
                  {h.actual_value != null ? Number(h.actual_value).toFixed(2) : "--"}
                </td>
                <td className="px-3 py-1.5 text-right text-slate-600">{h.target != null ? Number(h.target).toFixed(2) : "--"}</td>
                <td className="px-3 py-1.5 text-right text-slate-600">{h.lsl != null ? Number(h.lsl).toFixed(2) : "--"}</td>
                <td className="px-3 py-1.5 text-right text-slate-600">{h.usl != null ? Number(h.usl).toFixed(2) : "--"}</td>
                <td className="px-3 py-1.5 text-center">
                  {h.rag_status ? (
                    <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold border ${RAG_BADGE[h.rag_status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                      {h.rag_status}
                    </span>
                  ) : <span className="text-slate-300">--</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export function PMSummaryPage() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [summary, setSummary] = useState<KpiSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  // Which dimension card is expanded (shows metrics inside)
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null);

  useEffect(() => {
    listProjects()
      .then(p => { setProjects(p); if (p.length > 0) setSelectedProjectId(p[0].id); })
      .catch(() => toast.error("Failed to load projects"));
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    setLoadingSummary(true);
    setSummary(null);
    setExpandedDimension(null);
    getKpiPlan(selectedProjectId)
      .then(plan => getKpiSummary(plan.id))
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoadingSummary(false));
  }, [selectedProjectId]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Metrics grouped by category
  const metricsByCategory = (summary?.metrics || []).reduce<Record<string, KpiSummaryMetric[]>>((acc, m) => {
    const cat = m.metric_category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header + project selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">KPI Summary</h1>
          <p className="text-xs text-slate-500 mt-0.5">Overall health and metric trends</p>
        </div>
        <select
          value={selectedProjectId}
          onChange={e => { setSelectedProjectId(e.target.value); setExpandedDimension(null); }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-400 min-w-[220px]"
        >
          {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
        </select>
      </div>

      {projects.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-sm text-slate-400">No projects yet. Create a project from My Projects.</p>
        </div>
      )}

      {loadingSummary && (
        <div className="space-y-4 animate-pulse">
          <div className="h-24 rounded-xl bg-slate-200" />
          <div className="h-64 rounded-xl bg-slate-200" />
        </div>
      )}

      {!loadingSummary && summary && (
        <>
          {/* Overall RAG banner */}
          {summary.overall_rag && (
            <div className={`rounded-xl border p-4 flex items-center gap-4 shadow-sm ${
              summary.overall_rag === "RED" ? "bg-rose-50 border-rose-200" :
              summary.overall_rag === "AMBER" ? "bg-amber-50 border-amber-200" :
              "bg-emerald-50 border-emerald-200"
            }`}>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-extrabold text-white text-lg shrink-0 ${
                summary.overall_rag === "RED" ? "bg-rose-500" :
                summary.overall_rag === "AMBER" ? "bg-amber-500" : "bg-emerald-500"
              }`}>{summary.overall_rag[0]}</div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Overall Project Health</p>
                <p className={`text-xl font-extrabold ${
                  summary.overall_rag === "RED" ? "text-rose-700" :
                  summary.overall_rag === "AMBER" ? "text-amber-700" : "text-emerald-700"
                }`}>{summary.overall_rag}</p>
              </div>
              <p className="ml-auto text-xs text-slate-400 font-medium">{selectedProject?.project_name}</p>
            </div>
          )}

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Donut with hover */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col items-center gap-3 relative overflow-visible">
              <h2 className="text-sm font-bold text-slate-900 self-start">KPI Health Distribution</h2>
              <p className="text-[10px] text-slate-400 self-start -mt-2">Hover a slice to see dimensions</p>
              <RagDonut
                green={summary.green_count}
                amber={summary.amber_count}
                red={summary.red_count}
                noData={summary.no_data_count}
                categoryRag={summary.category_rag}
              />
            </div>

            {/* Dimension cards — clickable */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 mb-1">Dimension Status</h2>
              <p className="text-[10px] text-slate-400 mb-3">Click a dimension to see its metrics</p>
              {Object.keys(summary.category_rag).length === 0 ? (
                <p className="text-xs text-slate-400">No data yet. Enter KPI measurements first.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(summary.category_rag).map(([cat, rag]) => {
                    const isOpen = expandedDimension === cat;
                    const dimMetrics = metricsByCategory[cat] || [];
                    return (
                      <div key={cat} className={`rounded-lg border overflow-hidden ${RAG_BG[rag] || "bg-slate-50 border-slate-200"}`}>
                        {/* Dimension header — clickable */}
                        <button
                          type="button"
                          onClick={() => setExpandedDimension(isOpen ? null : cat)}
                          className="w-full flex items-center justify-between px-3 py-2.5 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                              rag === "RED" ? "bg-rose-100 text-rose-700 border-rose-300" :
                              rag === "AMBER" ? "bg-amber-100 text-amber-700 border-amber-300" :
                              "bg-emerald-100 text-emerald-700 border-emerald-300"
                            }`}>{rag}</span>
                            <span className="text-xs font-semibold text-slate-700">{cat}</span>
                            <span className="text-[9px] text-slate-400">{dimMetrics.length} metric{dimMetrics.length !== 1 ? "s" : ""}</span>
                          </div>
                          <svg className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Expanded metrics list */}
                        {isOpen && (
                          <div className="border-t border-slate-200/60 bg-white divide-y divide-slate-100">
                            {dimMetrics.length === 0 ? (
                              <p className="px-4 py-3 text-xs text-slate-400">No metrics with data in this dimension.</p>
                            ) : dimMetrics.filter(m => m.rag_status != null).map(m => (
                              <div key={m.plan_metric_id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                                <p className="text-xs font-semibold text-slate-800 truncate flex-1">{m.metric_name}</p>
                                <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold border shrink-0 ${
                                  m.rag_status === "RED" ? "bg-rose-100 text-rose-700 border-rose-300" :
                                  m.rag_status === "AMBER" ? "bg-amber-100 text-amber-700 border-amber-300" :
                                  "bg-emerald-100 text-emerald-700 border-emerald-300"
                                }`}>{m.rag_status}</span>
                              </div>
                            ))}
                            {dimMetrics.filter(m => m.rag_status != null).length === 0 && (
                              <p className="px-4 py-3 text-xs text-slate-400">No data entered for metrics in this dimension yet.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Metric cards (all) */}
          {summary.metrics.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3">All Metrics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {summary.metrics.map(m => {
                  const rag = m.rag_status;
                  const isExpanded = expandedMetric === m.plan_metric_id;
                  return (
                    <div key={m.plan_metric_id} className={isExpanded ? "col-span-full" : ""}>
                      <div
                        onClick={() => setExpandedMetric(isExpanded ? null : m.plan_metric_id)}
                        className={`rounded-xl border bg-white shadow-sm cursor-pointer hover:shadow-md transition-all ${
                          isExpanded ? "border-indigo-400 ring-2 ring-indigo-100" :
                          rag === "GREEN" ? "border-emerald-200" :
                          rag === "AMBER" ? "border-amber-200" :
                          rag === "RED" ? "border-rose-200" : "border-slate-200"
                        }`}>
                        {/* Card header — always visible */}
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{m.metric_category}</p>
                              <p className="text-xs font-bold text-slate-800 line-clamp-2">{m.metric_name}</p>
                            </div>
                            <span style={{ background: rag ? RAG_COLOR[rag] : "#cbd5e1" }} className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5" />
                          </div>
                          <div className="flex items-end justify-between gap-2">
                            <div>
                              <p className="text-[9px] text-slate-400">Latest</p>
                              <p className="text-lg font-extrabold text-slate-900">
                                {m.latest_value != null ? Number(m.latest_value).toFixed(2) : "--"}
                                {m.uom && <span className="text-[9px] font-normal text-slate-400 ml-0.5">{m.uom}</span>}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {rag && <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold border ${RAG_BADGE[rag]}`}>{rag}</span>}
                              <span className="text-[9px] text-indigo-500">{isExpanded ? "collapse" : "trend"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Expanded trend chart */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 p-4" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="text-sm font-bold text-slate-900">{m.metric_name}</p>
                                <p className="text-[10px] text-slate-500">{m.metric_category} | {m.intent} | {m.uom}</p>
                              </div>
                              <button onClick={() => setExpandedMetric(null)}
                                className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer font-bold">[x]</button>
                            </div>
                            <MetricTrendChart metric={m} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {summary.metrics.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <p className="text-sm text-slate-400">No KPI data entered yet for {selectedProject?.project_name}.</p>
              <p className="text-xs text-slate-400 mt-1">Go to My Projects and click Data Entry to start entering metrics.</p>
            </div>
          )}
        </>
      )}

      {!loadingSummary && !summary && selectedProjectId && (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <p className="text-sm text-slate-400">No KPI plan found for this project yet.</p>
        </div>
      )}
    </div>
  );
}
