/**
 * Sheet 4 -- KPI Summary Dashboard
 * Visual overview: RAG donut, per-category breakdown, metric cards with trend sparkline.
 * Spec 14: Explanation + recommendation shown inside MetricTrendPanel for RED/AMBER metrics.
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { getProject } from "../../services/projectService";
import { getKpiPlan, getKpiSummary, explainMetric } from "../../services/qpmService";
import { createActionItem } from "../../services/brdService";
import type { RagExplainResponse } from "../../services/qpmService";
import type { Project } from "../../types/project";
import type { KpiSummary, KpiSummaryMetric } from "../../types/qpm";

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

/** Full chart: Actual line + USL / Target / LSL as stepped reference lines.
 *  All four lines track per-period values — threshold changes create visible steps.
 */
function ThresholdChart({ history }: {
  history: KpiSummaryMetric["history"];
}) {
  if (!history || history.length === 0) {
    return <div className="flex items-center justify-center h-36 text-xs text-slate-300">No data yet</div>;
  }

  const W = 500; const H = 200;
  const padL = 52; const padR = 56; const padT = 24; const padB = 36;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Collect all numeric values to determine Y scale
  const allNums: number[] = [];
  for (const h of history) {
    if (h.actual_value != null) allNums.push(Number(h.actual_value));
    if (h.target != null) allNums.push(Number(h.target));
    if (h.lsl != null) allNums.push(Number(h.lsl));
    if (h.usl != null) allNums.push(Number(h.usl));
  }
  if (allNums.length === 0) return <div className="flex items-center justify-center h-36 text-xs text-slate-300">No numeric data</div>;

  const rawMin = Math.min(...allNums);
  const rawMax = Math.max(...allNums);
  const rPad = (rawMax - rawMin) * 0.18 || Math.abs(rawMax) * 0.2 || 2;
  const yMin = rawMin - rPad;
  const yMax = rawMax + rPad;
  const yRange = yMax - yMin || 1;

  const n = history.length;
  // When single data point, centre it
  const toX = (i: number) => n === 1 ? padL + chartW / 2 : padL + (i / (n - 1)) * chartW;
  const toY = (v: number) => padT + chartH - ((v - yMin) / yRange) * chartH;
  const fmtY = (v: number) => {
    if (Math.abs(v) >= 10000) return (v / 1000).toFixed(0) + "k";
    if (Math.abs(v) >= 1000) return (v / 1000).toFixed(1) + "k";
    return v % 1 === 0 ? String(v) : v.toFixed(1);
  };

  // Y-axis ticks
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount }, (_, i) => yMin + (yRange / (tickCount - 1)) * i);

  // RAG colours for actual dots
  const ragDot: Record<string, string> = { GREEN: "#10b981", AMBER: "#f59e0b", RED: "#f43f5e" };

  // Build a proper stepped polyline: value is constant from period i to i+1, then steps
  function buildStepPath(vals: (number | null)[]): string {
    const pts: string[] = [];
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      if (v == null) continue;
      const x = toX(i);
      const y = toY(v);
      pts.push(`${x},${y}`);
      // Extend flat to the next period x, then next iteration draws the vertical step
      if (i < vals.length - 1) {
        const xNext = toX(i + 1);
        pts.push(`${xNext},${y}`);
      }
    }
    return pts.join(" ");
  }

  const uslPath    = buildStepPath(history.map(h => h.usl    != null ? Number(h.usl)    : null));
  const targetPath = buildStepPath(history.map(h => h.target != null ? Number(h.target) : null));
  const lslPath    = buildStepPath(history.map(h => h.lsl    != null ? Number(h.lsl)    : null));

  const hasUsl    = history.some(h => h.usl    != null);
  const hasTarget = history.some(h => h.target != null);
  const hasLsl    = history.some(h => h.lsl    != null);

  // Last known value for label Y position
  const lastUsl    = [...history].reverse().find(h => h.usl    != null);
  const lastTarget = [...history].reverse().find(h => h.target != null);
  const lastLsl    = [...history].reverse().find(h => h.lsl    != null);
  const labelX     = padL + chartW + 3;

  // Actual line points (simple line, not stepped)
  const actualPts = history
    .filter(h => h.actual_value != null)
    .map((h) => {
      const idx = history.indexOf(h);
      return `${toX(idx)},${toY(Number(h.actual_value))}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }}>
      {/* Chart background */}
      <rect x={padL} y={padT} width={chartW} height={chartH} fill="#f8fafc" rx="3" />

      {/* Grid + Y ticks */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} y1={toY(t)} x2={padL + chartW} y2={toY(t)} stroke="#e2e8f0" strokeWidth="1" />
          <text x={padL - 4} y={toY(t) + 3.5} fontSize="8.5" fill="#94a3b8" textAnchor="end">{fmtY(t)}</text>
        </g>
      ))}

      {/* USL — orange dashed step */}
      {hasUsl && uslPath && (
        <g>
          <polyline points={uslPath} fill="none" stroke="#f97316" strokeWidth="1.5" strokeDasharray="5,3" />
          {lastUsl && <text x={labelX} y={toY(Number(lastUsl.usl!)) + 3.5} fontSize="8.5" fill="#f97316" fontWeight="bold">USL</text>}
        </g>
      )}

      {/* Target — blue dashed step */}
      {hasTarget && targetPath && (
        <g>
          <polyline points={targetPath} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="7,2" />
          {lastTarget && <text x={labelX} y={toY(Number(lastTarget.target!)) + 3.5} fontSize="8.5" fill="#3b82f6" fontWeight="bold">Target</text>}
        </g>
      )}

      {/* LSL — purple dashed step */}
      {hasLsl && lslPath && (
        <g>
          <polyline points={lslPath} fill="none" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="5,3" />
          {lastLsl && <text x={labelX} y={toY(Number(lastLsl.lsl!)) + 3.5} fontSize="8.5" fill="#a855f7" fontWeight="bold">LSL</text>}
        </g>
      )}

      {/* Actual line — solid dark line */}
      {actualPts && <polyline points={actualPts} fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}

      {/* Actual dots with RAG colour + value label */}
      {history.map((h, i) => {
        if (h.actual_value == null) return null;
        const cx = toX(i);
        const cy = toY(Number(h.actual_value));
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r="5" fill={h.rag_status ? (ragDot[h.rag_status] || "#94a3b8") : "#94a3b8"} stroke="white" strokeWidth="2" />
            <text x={cx} y={cy - 9} fontSize="8" fill="#1e293b" textAnchor="middle" fontWeight="600">
              {Number(h.actual_value).toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* X-axis period labels */}
      {history.map((h, i) => (
        <text key={i} x={toX(i)} y={H - 8} fontSize="8" fill="#94a3b8" textAnchor="middle">
          {(h.frequency_name || "").substring(0, 10)}
        </text>
      ))}

      {/* Axes */}
      <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#cbd5e1" strokeWidth="1" />
      <line x1={padL} y1={padT + chartH} x2={padL + chartW} y2={padT + chartH} stroke="#cbd5e1" strokeWidth="1" />
    </svg>
  );
}

/** Mini sparkline for metric cards (no threshold lines, just actual) */
function Sparkline({ history }: { history: KpiSummaryMetric["history"] }) {
  if (!history || history.length < 2) {
    return <div className="flex items-center justify-center h-10 text-[10px] text-slate-300">
      {history?.length === 1 ? "1 period" : "No data"}
    </div>;
  }
  const values = history.map(h => h.actual_value ?? 0);
  const minV = Math.min(...values); const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const W = 120; const H = 36; const pad = 4;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = pad + ((maxV - v) / range) * (H - pad * 2);
    return { x, y, rag: history[i].rag_status };
  });
  const ragColor: Record<string, string> = { GREEN: "#10b981", AMBER: "#f59e0b", RED: "#f43f5e" };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10">
      <polyline points={pts.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3"
          fill={p.rag ? (ragColor[p.rag] || "#94a3b8") : "#94a3b8"}
          stroke="white" strokeWidth="1" />
      ))}
    </svg>
  );
}

/** Expanded trend panel shown when user clicks a metric card */
function MetricTrendPanel({ m, projectId, onClose }: { m: KpiSummaryMetric; projectId: string; onClose: () => void }) {
  const history = m.history ?? [];
  const toast = useToast();
  const [explain, setExplain] = useState<RagExplainResponse | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionForm, setActionForm] = useState({ root_cause: "", corrective_action: "", owner_name: "", target_closure_date: "" });
  const [savingAction, setSavingAction] = useState(false);

  // Fetch explanation for RED/AMBER metrics when the panel opens
  useEffect(() => {
    if (m.rag_status !== "RED" && m.rag_status !== "AMBER") return;
    setExplainLoading(true);
    explainMetric(m.plan_metric_id)
      .then(r => setExplain(r))
      .catch(() => setExplain(null))
      .finally(() => setExplainLoading(false));
  }, [m.plan_metric_id, m.rag_status]);

  const handleRaiseAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionForm.root_cause.trim() || !actionForm.corrective_action.trim()) return;
    setSavingAction(true);
    try {
      await createActionItem({
        project_id: projectId,
        root_cause: actionForm.root_cause,
        corrective_action: actionForm.corrective_action,
        metric_name: m.metric_name,
        rag_status_at_creation: m.rag_status ?? undefined,
        owner_name: actionForm.owner_name || undefined,
        target_closure_date: actionForm.target_closure_date || undefined,
      });
      toast.success("Action item created and visible in your Actions page.");
      setActionForm({ root_cause: "", corrective_action: "", owner_name: "", target_closure_date: "" });
      setShowActionForm(false);
    } catch {
      toast.error("Failed to create action item.");
    } finally {
      setSavingAction(false);
    }
  };

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
            {m.intent} · {m.uom} · {history.length} period{history.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer text-xs font-bold border border-slate-200 rounded px-2 py-1">✕ Close</button>
      </div>

      {/* Latest values */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Latest Value", val: m.latest_value != null ? Number(m.latest_value).toFixed(2) + (m.uom ? ` ${m.uom}` : "") : "—", color: "text-slate-900" },
          { label: "Target",       val: m.target != null ? String(m.target) : "—", color: "text-blue-700" },
          { label: "LSL",          val: m.lsl    != null ? String(m.lsl)    : "—", color: "text-purple-700" },
          { label: "USL",          val: m.usl    != null ? String(m.usl)    : "—", color: "text-orange-600" },
        ].map(item => (
          <div key={item.label} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{item.label}</p>
            <p className={`text-sm font-extrabold mt-0.5 ${item.color}`}>{item.val}</p>
          </div>
        ))}
      </div>

      {/* Explanation + Recommendation box (Spec 14) — RED/AMBER only */}
      {(m.rag_status === "RED" || m.rag_status === "AMBER") && (
        <div className={`rounded-lg border px-4 py-3 space-y-3 ${
          m.rag_status === "RED" ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200"
        }`}>
          {explainLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Loading explanation…
            </div>
          ) : explain?.explanation ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Why is this {m.rag_status === "RED" ? "red" : "amber"}?</span>
                {explain.is_worsening && (
                  <span className="text-[9px] font-bold rounded-full px-1.5 py-0.5 bg-rose-100 text-rose-700 border border-rose-200">↓ Worsening</span>
                )}
                {explain.is_first_breach && (
                  <span className="text-[9px] font-bold rounded-full px-1.5 py-0.5 bg-orange-100 text-orange-700 border border-orange-200">First breach</span>
                )}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{explain.explanation}</p>
              {explain.recommendation ? (
                <div className="mt-1 pt-2 border-t border-slate-200">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Recommended action</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{explain.recommendation}</p>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 italic mt-1">No recommendation configured for this metric yet.</p>
              )}
            </div>
          ) : null}

          {/* Raise Action Item */}
          <div className="pt-2 border-t border-slate-200">
            {!showActionForm ? (
              <button type="button" onClick={() => setShowActionForm(true)}
                className={`text-xs font-bold px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  m.rag_status === "RED"
                    ? "bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200"
                    : "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200"
                }`}>
                + Raise Action Item
              </button>
            ) : (
              <form onSubmit={handleRaiseAction} className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">New Action — {m.metric_name}</p>
                <input type="text" required placeholder="Root cause *"
                  value={actionForm.root_cause} onChange={e => setActionForm(f => ({ ...f, root_cause: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                <textarea required placeholder="Corrective action *" rows={2}
                  value={actionForm.corrective_action} onChange={e => setActionForm(f => ({ ...f, corrective_action: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Owner name (optional)"
                    value={actionForm.owner_name} onChange={e => setActionForm(f => ({ ...f, owner_name: e.target.value }))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                  <input type="date"
                    value={actionForm.target_closure_date} onChange={e => setActionForm(f => ({ ...f, target_closure_date: e.target.value }))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={savingAction || !actionForm.root_cause.trim() || !actionForm.corrective_action.trim()}
                    className="rounded-lg bg-indigo-600 text-white px-4 py-1.5 text-xs font-bold cursor-pointer disabled:opacity-50 hover:bg-indigo-700">
                    {savingAction ? "Saving…" : "Save Action Item"}
                  </button>
                  <button type="button" onClick={() => setShowActionForm(false)}
                    className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-600 cursor-pointer hover:bg-slate-50">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">No measurements yet.</p>
      ) : (
        <>
          {/* Full threshold chart */}
          <div className="rounded-lg border border-slate-100 bg-white px-2 py-3">
            <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide px-2">Performance vs Thresholds</p>
            <ThresholdChart history={history} />
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-2 px-2 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="inline-block w-6 border-b-2 border-slate-800" />Actual</span>
              <span className="flex items-center gap-1"><span className="inline-block w-6 border-b border-dashed border-orange-500" />USL</span>
              <span className="flex items-center gap-1"><span className="inline-block w-6 border-b border-dashed border-blue-500" />Target</span>
              <span className="flex items-center gap-1"><span className="inline-block w-6 border-b border-dashed border-purple-500" />LSL</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />GREEN</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />AMBER</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />RED</span>
            </div>
          </div>

          {/* Period-by-period table */}
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-400 font-semibold">
                <tr>
                  <th className="px-3 py-2 text-left">Period</th>
                  <th className="px-3 py-2 text-right">Value</th>
                  <th className="px-3 py-2 text-right text-blue-600">Target</th>
                  <th className="px-3 py-2 text-right text-purple-600">LSL</th>
                  <th className="px-3 py-2 text-right text-orange-600">USL</th>
                  <th className="px-3 py-2 text-center">RAG</th>
                  <th className="px-3 py-2 text-left">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...history].reverse().map((h, i) => (
                  <tr key={i} className={`${i === 0 ? "font-semibold bg-indigo-50/30" : ""} hover:bg-slate-50`}>
                    <td className="px-3 py-2 font-medium text-slate-700">
                      {h.frequency_name || "—"}
                      {i === 0 && <span className="ml-1 text-[9px] bg-indigo-100 text-indigo-700 border border-indigo-200 rounded px-1 font-bold">Latest</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-slate-900">
                      {h.actual_value != null ? Number(h.actual_value).toFixed(2) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-blue-700 font-mono">{h.target != null ? Number(h.target).toFixed(2) : "—"}</td>
                    <td className="px-3 py-2 text-right text-purple-700 font-mono">{h.lsl != null ? Number(h.lsl).toFixed(2) : "—"}</td>
                    <td className="px-3 py-2 text-right text-orange-600 font-mono">{h.usl != null ? Number(h.usl).toFixed(2) : "—"}</td>
                    <td className="px-3 py-2 text-center">
                      {h.rag_status ? (
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${RAG_BG[h.rag_status] || "bg-slate-100 text-slate-600"}`}>
                          {h.rag_status}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {h.submitted_date ? new Date(h.submitted_date).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
  const isAlert = rag === "RED" || rag === "AMBER";
  const border = isSelected
    ? "border-indigo-400 ring-2 ring-indigo-200"
    : rag === "GREEN" ? "border-emerald-200" : rag === "AMBER" ? "border-amber-200" : rag === "RED" ? "border-rose-200" : "border-slate-200";

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border ${border} bg-white p-4 shadow-sm flex flex-col gap-2 hover:shadow-md transition-all cursor-pointer relative`}
    >
      {/* Spec 14: info badge for RED/AMBER — hints that clicking shows explanation */}
      {isAlert && (
        <span className={`absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white z-10 ${
          rag === "RED" ? "bg-rose-500" : "bg-amber-500"
        }`} title="Click to see why this metric is underperforming">ℹ</span>
      )}
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
          <Link to={`/pm/projects/${projectId}/qpm/entry`} className="text-xs text-slate-500 hover:text-slate-800">← Back to Data Entry</Link>
          <h1 className="mt-1 text-xl font-bold text-slate-900">KPI Summary -- {project?.project_name}</h1>
          <p className="text-xs text-slate-500">{summary?.project_type} | {summary?.delivery_process_model}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/pm" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
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
        <MetricTrendPanel m={selectedMetric} projectId={projectId!} onClose={() => setSelectedMetric(null)} />
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
