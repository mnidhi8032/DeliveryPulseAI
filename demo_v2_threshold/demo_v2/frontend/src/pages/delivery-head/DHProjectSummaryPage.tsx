/**
 * Delivery Head — Project KPI Summary (light theme)
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProject } from "../../services/projectService";
import { getKpiPlan, getKpiSummary } from "../../services/qpmService";
import type { Project } from "../../types/project";
import type { KpiSummary, KpiSummaryMetric } from "../../types/qpm";

const RAG_HEX: Record<string, string> = {
  GREEN: "#10b981", AMBER: "#f59e0b", RED: "#f43f5e", CRITICAL: "#be123c",
};
const RAG_PILL: Record<string, string> = {
  GREEN:    "bg-emerald-50 text-emerald-700 border border-emerald-200",
  AMBER:    "bg-amber-50   text-amber-700   border border-amber-200",
  RED:      "bg-rose-50    text-rose-700    border border-rose-200",
  CRITICAL: "bg-rose-100   text-rose-800    border border-rose-300",
};
const RAG_CARD_BORDER: Record<string, string> = {
  GREEN: "border-emerald-200", AMBER: "border-amber-200", RED: "border-rose-200", CRITICAL: "border-rose-300",
};
const RAG_DIM_BG: Record<string, string> = {
  GREEN: "bg-emerald-50 border-emerald-200", AMBER: "bg-amber-50 border-amber-200",
  RED:   "bg-rose-50    border-rose-200",    CRITICAL: "bg-rose-100 border-rose-300",
};

// ── Interactive donut ────────────────────────────────────────────────────────
function RagDonut({ green, amber, red, noData, categoryRag }: {
  green: number; amber: number; red: number; noData: number;
  categoryRag: Record<string, string>;
}) {
  const total = green + amber + red + noData || 1;
  const R = 54; const cx = 64; const cy = 64; const circ = 2 * Math.PI * R;
  const slices = [
    { rag: "GREEN", value: green, color: "#10b981" },
    { rag: "AMBER", value: amber, color: "#f59e0b" },
    { rag: "RED",   value: red,   color: "#f43f5e" },
    { rag: null,    value: noData,color: "#e2e8f0" },
  ];
  let offset = 0;
  const arcs = slices.map(s => { const dash = (s.value / total) * circ; const arc = { ...s, dash, offset }; offset += dash; return arc; });
  const [hovered, setHovered] = useState<string | null>(null);
  const hoveredDims = hovered ? Object.entries(categoryRag).filter(([, r]) => r === hovered).map(([c]) => c) : [];

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="relative">
        <svg viewBox="0 0 128 128" className="w-36 h-36">
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f1f5f9" strokeWidth={20} />
          {arcs.map((a, i) => (
            <circle key={i} cx={cx} cy={cy} r={R} fill="none"
              stroke={a.color} strokeWidth={hovered === a.rag ? 22 : 18}
              strokeDasharray={`${a.dash} ${circ - a.dash}`}
              strokeDashoffset={-a.offset + circ / 4}
              style={{ transition: "stroke-width 0.15s", cursor: a.value > 0 ? "pointer" : "default" }}
              onMouseEnter={() => a.rag && a.value > 0 && setHovered(a.rag)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize={22} fontWeight="bold" fill="#1e293b">{total - noData}</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize={9} fill="#94a3b8">of {total}</text>
        </svg>
        {hovered && hoveredDims.length > 0 && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-20 rounded-xl border border-slate-200 bg-white shadow-xl p-3 min-w-[160px] pointer-events-none">
            <p style={{ color: RAG_HEX[hovered] }} className="text-[10px] font-extrabold mb-2 uppercase">{hovered} Dimensions</p>
            <div className="space-y-1">
              {hoveredDims.map(d => (
                <div key={d} className="flex items-center gap-2">
                  <span style={{ background: RAG_HEX[hovered] }} className="w-2 h-2 rounded-full shrink-0" />
                  <span className="text-xs text-slate-700 font-medium">{d}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-3 justify-center text-xs">
        {[["GREEN", green, "#10b981"], ["AMBER", amber, "#f59e0b"], ["RED", red, "#f43f5e"], ["No Data", noData, "#cbd5e1"]].map(([l, v, c]) => (
          <div key={l as string} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: c as string }} />
            <span className="text-slate-500">{l}: <b className="text-slate-800">{v}</b></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Metric trend chart (light) ───────────────────────────────────────────────
function MetricTrendChart({ metric }: { metric: KpiSummaryMetric }) {
  const history = metric.history ?? [];
  if (history.filter(h => h.actual_value != null).length < 1)
    return <div className="flex items-center justify-center h-40 text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">Not enough data to show trend</div>;

  const W = 560; const H = 160; const padL = 40; const padR = 16; const padT = 16; const padB = 32;
  const chartW = W - padL - padR; const chartH = H - padT - padB; const n = history.length;
  const allV: number[] = [];
  history.forEach(h => { [h.actual_value, h.target, h.lsl, h.usl].forEach(v => { if (v != null) allV.push(Number(v)); }); });
  if (!allV.length) return null;
  const minV = Math.min(...allV); const maxV = Math.max(...allV);
  const pad = (maxV - minV || 1) * 0.1;
  const yMin = minV - pad; const yMax = maxV + pad; const yRange = yMax - yMin || 1;
  const xP = (i: number) => padL + (n <= 1 ? chartW / 2 : (i / (n - 1)) * chartW);
  const yP = (v: number) => padT + ((yMax - v) / yRange) * chartH;
  const path = (vals: (number | null)[]) => { let d = ""; vals.forEach((v, i) => { if (v == null) return; const x = xP(i), y = yP(v); d += (d === "" || vals[i - 1] == null) ? `M${x},${y}` : `L${x},${y}`; }); return d; };
  const ap = path(history.map(h => h.actual_value != null ? Number(h.actual_value) : null));
  const tp = path(history.map(h => h.target != null ? Number(h.target) : null));
  const lp = path(history.map(h => h.lsl != null ? Number(h.lsl) : null));
  const up = path(history.map(h => h.usl != null ? Number(h.usl) : null));
  const ticks = Array.from({ length: 5 }, (_, i) => yMin + (i / 4) * yRange);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-4 text-[10px] px-1">
        {[{ label: "Actual", color: "#3b82f6", dash: false }, { label: "Target", color: "#10b981", dash: true }, { label: "LSL", color: "#f59e0b", dash: true }, { label: "USL", color: "#f43f5e", dash: true }].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke={l.color} strokeWidth="2" strokeDasharray={l.dash ? "4,3" : undefined} /></svg>
            <span className="text-slate-500 font-medium">{l.label}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-100 bg-slate-50 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: "340px", height: "160px" }}>
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={padL} y1={yP(t)} x2={W - padR} y2={yP(t)} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
              <text x={padL - 4} y={yP(t) + 4} textAnchor="end" fontSize="8" fill="#94a3b8">{t % 1 === 0 ? t.toFixed(0) : t.toFixed(1)}</text>
            </g>
          ))}
          {history.map((h, i) => <text key={i} x={xP(i)} y={H - 6} textAnchor="middle" fontSize="8" fill="#94a3b8">{(h.frequency_name || "").substring(0, 8)}</text>)}
          {lp && <path d={lp} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,4" />}
          {up && <path d={up} fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="5,4" />}
          {tp && <path d={tp} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="5,4" />}
          {ap && <path d={ap} fill="none" stroke="#3b82f6" strokeWidth="2.5" />}
          {history.map((h, i) => h.actual_value != null && (
            <circle key={i} cx={xP(i)} cy={yP(Number(h.actual_value))} r="4"
              fill={h.rag_status ? RAG_HEX[h.rag_status] || "#3b82f6" : "#3b82f6"} stroke="#ffffff" strokeWidth="1.5">
              <title>{h.frequency_name}: {Number(h.actual_value).toFixed(2)}</title>
            </circle>
          ))}
        </svg>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="min-w-full text-[10px]">
          <thead className="bg-slate-50 text-slate-500 font-semibold">
            <tr>
              <th className="px-3 py-1.5 text-left">Period</th>
              <th className="px-3 py-1.5 text-right text-blue-500">Actual</th>
              <th className="px-3 py-1.5 text-right text-emerald-600">Target</th>
              <th className="px-3 py-1.5 text-right text-amber-600">LSL</th>
              <th className="px-3 py-1.5 text-right text-rose-500">USL</th>
              <th className="px-3 py-1.5 text-center">RAG</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...history].reverse().map((h, i) => (
              <tr key={i} className={i === 0 ? "bg-indigo-50/50" : "hover:bg-slate-50"}>
                <td className="px-3 py-1.5 font-medium text-slate-700">
                  {h.frequency_name || "--"}
                  {i === 0 && <span className="ml-1.5 text-[8px] bg-indigo-100 text-indigo-700 rounded px-1 font-bold">Latest</span>}
                </td>
                <td className="px-3 py-1.5 text-right font-bold text-slate-900">{h.actual_value != null ? Number(h.actual_value).toFixed(2) : "--"}</td>
                <td className="px-3 py-1.5 text-right text-slate-500">{h.target != null ? Number(h.target).toFixed(2) : "--"}</td>
                <td className="px-3 py-1.5 text-right text-slate-500">{h.lsl != null ? Number(h.lsl).toFixed(2) : "--"}</td>
                <td className="px-3 py-1.5 text-right text-slate-500">{h.usl != null ? Number(h.usl).toFixed(2) : "--"}</td>
                <td className="px-3 py-1.5 text-center">
                  {h.rag_status
                    ? <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold border ${RAG_PILL[h.rag_status] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>{h.rag_status}</span>
                    : <span className="text-slate-300">--</span>}
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
export function DHProjectSummaryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject]   = useState<Project | null>(null);
  const [summary, setSummary]   = useState<KpiSummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [noKpiPlan, setNoKpiPlan] = useState(false);
  const [expandedDim, setExpandedDim]       = useState<string | null>(null);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true); setNoKpiPlan(false);
    getProject(projectId)
      .then(proj => { setProject(proj); return getKpiPlan(projectId); })
      .then(plan => getKpiSummary(plan.id))
      .then(s => { setSummary(s); setLoading(false); })
      .catch(err => { if (err?.response?.status === 404) setNoKpiPlan(true); setLoading(false); });
  }, [projectId]);

  const metricsByCategory = (summary?.metrics ?? []).reduce<Record<string, KpiSummaryMetric[]>>((acc, m) => {
    const c = m.metric_category ?? "Uncategorized"; (acc[c] = acc[c] ?? []).push(m); return acc;
  }, {});

  if (loading) return (
    <div className="space-y-5 animate-pulse">
      <div className="h-4 w-40 rounded bg-slate-200" />
      <div className="h-28 rounded-xl bg-slate-200" />
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-slate-200" />)}</div>
      <div className="grid md:grid-cols-2 gap-5">{[1,2].map(i => <div key={i} className="h-64 rounded-xl bg-slate-200" />)}</div>
    </div>
  );

  const rag = summary?.overall_rag;

  return (
    <div className="space-y-6">

      {/* breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/delivery-head" className="hover:text-slate-700 transition-colors">Dashboard</Link>
        <span>/</span>
        <Link to="/delivery-head/projects" className="hover:text-slate-700 transition-colors">Projects</Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">{project?.project_name ?? "Project"}</span>
      </div>

      {/* project header card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Project · Read-only</p>
            <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900">{project?.project_name}</h1>
            <p className="font-mono text-xs text-slate-400 mt-0.5">{project?.project_code}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {project?.current_rag && (
              <span className={`rounded-lg px-3 py-1.5 text-xs font-bold border ${RAG_PILL[project.current_rag] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
                ● {project.current_rag}
              </span>
            )}
            <Link to={`/delivery-head/projects/${projectId}/timeline`}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
              Health Timeline →
            </Link>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            ["Business Unit",   project?.business_unit_name ?? "—"],
            ["Account",         project?.account_name       ?? "—"],
            ["Project Manager", project?.project_manager_name ?? "—"],
            ["Status",          project?.status             ?? "—"],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{k}</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* no KPI plan */}
      {noKpiPlan && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="text-sm font-semibold text-slate-500">No KPI Plan found for this project.</p>
          <p className="text-xs text-slate-400 mt-1">The PM hasn't created a KPI plan yet.</p>
        </div>
      )}

      {summary && (
        <>
          {/* overall RAG banner */}
          {rag && (
            <div className={`rounded-xl border p-5 flex items-center gap-4 shadow-sm ${
              rag === "GREEN" ? "bg-emerald-50 border-emerald-200" :
              rag === "AMBER" ? "bg-amber-50 border-amber-200" :
              rag === "RED" ? "bg-rose-50 border-rose-200" : "bg-rose-100 border-rose-300"
            }`}>
              <div className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-white text-2xl shrink-0"
                style={{ background: RAG_HEX[rag] ?? "#94a3b8" }}>
                {rag[0]}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Overall Project Health</p>
                <p className="text-2xl font-extrabold mt-0.5" style={{ color: RAG_HEX[rag] }}>{rag}</p>
              </div>
              <div className="ml-auto grid grid-cols-4 gap-4 text-center">
                {[
                  { label: "Total", v: summary.total_metrics, c: "text-slate-800" },
                  { label: "Green", v: summary.green_count,   c: "text-emerald-600" },
                  { label: "Amber", v: summary.amber_count,   c: "text-amber-600" },
                  { label: "Red",   v: summary.red_count,     c: "text-rose-600" },
                ].map(s => (
                  <div key={s.label}>
                    <p className={`text-xl font-black ${s.c}`}>{s.v}</p>
                    <p className="text-[9px] text-slate-400 uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* donut + dimension accordion */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col items-center gap-3 relative overflow-visible">
              <div className="self-start">
                <h2 className="text-sm font-bold text-slate-900">KPI Health Distribution</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">Hover a slice to see dimensions</p>
              </div>
              <RagDonut green={summary.green_count} amber={summary.amber_count} red={summary.red_count} noData={summary.no_data_count} categoryRag={summary.category_rag} />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 mb-1">Dimension Status</h2>
              <p className="text-[10px] text-slate-400 mb-4">Click a dimension to expand its metrics</p>
              {Object.keys(summary.category_rag).length === 0
                ? <p className="text-xs text-slate-400">No data yet.</p>
                : (
                  <div className="space-y-2">
                    {Object.entries(summary.category_rag).map(([cat, r]) => {
                      const isOpen = expandedDim === cat;
                      const dims = (metricsByCategory[cat] ?? []).filter(m => m.rag_status != null);
                      return (
                        <div key={cat} className={`rounded-lg border overflow-hidden ${RAG_DIM_BG[r] ?? "bg-slate-50 border-slate-200"}`}>
                          <button type="button" onClick={() => setExpandedDim(isOpen ? null : cat)}
                            className="w-full flex items-center justify-between px-3 py-2.5 cursor-pointer hover:opacity-80 transition-opacity">
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${RAG_PILL[r] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>{r}</span>
                              <span className="text-xs font-semibold text-slate-700">{cat}</span>
                              <span className="text-[9px] text-slate-400">{dims.length} metric{dims.length !== 1 ? "s" : ""}</span>
                            </div>
                            <svg className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {isOpen && (
                            <div className="border-t border-slate-200/60 bg-white divide-y divide-slate-100">
                              {dims.length === 0
                                ? <p className="px-4 py-3 text-xs text-slate-400">No data entered yet.</p>
                                : dims.map(m => (
                                  <div key={m.plan_metric_id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                                    <p className="text-xs font-semibold text-slate-700 truncate flex-1">{m.metric_name}</p>
                                    <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold border shrink-0 ${RAG_PILL[m.rag_status!] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>{m.rag_status}</span>
                                  </div>
                                ))
                              }
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          </div>

          {/* all metric cards */}
          {summary.metrics.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3">All Metrics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {summary.metrics.map(m => {
                  const r = m.rag_status;
                  const isExp = expandedMetric === m.plan_metric_id;
                  return (
                    <div key={m.plan_metric_id} className={isExp ? "col-span-full" : ""}>
                      <div onClick={() => setExpandedMetric(isExp ? null : m.plan_metric_id)}
                        className={`rounded-xl border bg-white shadow-sm cursor-pointer hover:shadow-md transition-all ${
                          isExp ? "border-indigo-400 ring-2 ring-indigo-100"
                          : r ? RAG_CARD_BORDER[r] : "border-slate-200"
                        }`}>
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-1 mb-2">
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 truncate">{m.metric_category}</p>
                              <p className="text-xs font-bold text-slate-800 line-clamp-2 mt-0.5">{m.metric_name}</p>
                            </div>
                            <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5" style={{ background: r ? RAG_HEX[r] : "#cbd5e1" }} />
                          </div>
                          <div className="flex items-end justify-between gap-2">
                            <div>
                              <p className="text-[9px] text-slate-400">Latest</p>
                              <p className="text-xl font-extrabold text-slate-900 leading-none">
                                {m.latest_value != null ? Number(m.latest_value).toFixed(2) : "--"}
                                {m.uom && <span className="text-[9px] font-normal text-slate-400 ml-0.5">{m.uom}</span>}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {r && <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold border ${RAG_PILL[r]}`}>{r}</span>}
                              <span className="text-[9px] text-indigo-500">{isExp ? "collapse" : "trend ↓"}</span>
                            </div>
                          </div>
                        </div>
                        {isExp && (
                          <div className="border-t border-slate-100 p-4" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="text-sm font-bold text-slate-900">{m.metric_name}</p>
                                <p className="text-[10px] text-slate-500">{m.metric_category} · {m.intent} · {m.uom}</p>
                              </div>
                              <button onClick={() => setExpandedMetric(null)} className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer font-bold">[×]</button>
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
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <p className="text-sm text-slate-400">No KPI data entered yet for {project?.project_name}.</p>
              <p className="text-xs text-slate-400 mt-1">The PM needs to enter measurements in the KPI Data Entry sheet.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
