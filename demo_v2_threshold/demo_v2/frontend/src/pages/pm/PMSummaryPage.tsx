/**
 * PM -- Summary Dashboard (light purple theme)
 * Logic is 100% unchanged. Only UI/CSS upgraded.
 * Spec 14: Explanation + recommendation shown in expanded metric card.
 */
import { useEffect, useState } from "react";
import { listProjects } from "../../services/projectService";
import { getKpiPlan, getKpiSummary, explainMetric } from "../../services/qpmService";
import { createActionItem } from "../../services/brdService";
import type { RagExplainResponse } from "../../services/qpmService";
import { useToast } from "../../contexts/ToastContext";
import type { Project } from "../../types/project";
import type { KpiSummary, KpiSummaryMetric } from "../../types/qpm";

// ── Project-level Action Item form ────────────────────────────────────────────
function PMProjectActionForm({ projectId, projectName }: { projectId: string; projectName: string }) {
  const toast = useToast();
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm]     = useState({ root_cause: "", corrective_action: "", owner_name: "", target_closure_date: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.root_cause.trim() || !form.corrective_action.trim()) return;
    setSaving(true);
    try {
      await createActionItem({
        project_id: projectId,
        root_cause: form.root_cause,
        corrective_action: form.corrective_action,
        owner_name: form.owner_name || undefined,
        target_closure_date: form.target_closure_date || undefined,
        // No metric_name → project-level action
      });
      toast.success("Project action item created. View it in Actions.");
      setForm({ root_cause: "", corrective_action: "", owner_name: "", target_closure_date: "" });
      setOpen(false);
    } catch { toast.error("Failed to create action item."); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ borderRadius: 16, background: "var(--surface)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", background: "rgba(108,99,255,0.04)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: 0 }}>Project-Level Action</p>
          <p style={{ fontSize: 11, color: "var(--muted)", margin: "3px 0 0" }}>
            Raise a corrective action for <strong style={{ color: "var(--text)" }}>{projectName}</strong> as a whole — not tied to any single metric.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(v => !v)} style={{
          borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
          background: open ? "transparent" : "var(--primary)",
          color: open ? "var(--muted)" : "#fff",
          border: open ? "1.5px solid var(--border)" : "none",
          boxShadow: open ? "none" : "0 2px 10px rgba(108,99,255,0.30)",
        }}>
          {open ? "Cancel" : "+ Raise Project Action"}
        </button>
      </div>
      {/* Form */}
      {open && (
        <form onSubmit={handleSubmit} style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "Root Cause", key: "root_cause" as const, required: true, rows: 2, placeholder: "Describe the root cause for this project-level issue…" },
            { label: "Corrective Action", key: "corrective_action" as const, required: true, rows: 2, placeholder: "What corrective action will be taken?…" },
          ].map(f => (
            <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {f.label} {f.required && <span style={{ color: "#ef4444" }}>*</span>}
              </label>
              <textarea required={f.required} rows={f.rows} placeholder={f.placeholder}
                value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                style={{ borderRadius: 10, border: "1.5px solid var(--border)", padding: "9px 12px", fontSize: 13, color: "var(--text)", background: "var(--surface)", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box", resize: "none" }} />
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Owner Name", key: "owner_name" as const, type: "text", placeholder: "Optional" },
              { label: "Target Closure Date", key: "target_closure_date" as const, type: "date", placeholder: "" },
            ].map(f => (
              <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder}
                  value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ borderRadius: 10, border: "1.5px solid var(--border)", padding: "9px 12px", fontSize: 13, color: "var(--text)", background: "var(--surface)", outline: "none", fontFamily: "inherit" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, paddingTop: 4, borderTop: "1px solid var(--border)" }}>
            <button type="submit" disabled={saving || !form.root_cause.trim() || !form.corrective_action.trim()} style={{
              borderRadius: 10, background: "var(--primary)", color: "#fff", border: "none", padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              opacity: (saving || !form.root_cause.trim() || !form.corrective_action.trim()) ? 0.5 : 1,
              boxShadow: "0 2px 8px rgba(108,99,255,0.30)",
            }}>
              {saving ? "Saving…" : "Save Action Item"}
            </button>
            <button type="button" onClick={() => setOpen(false)} style={{
              borderRadius: 10, border: "1.5px solid var(--border)", background: "transparent", color: "var(--muted)", padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const RAG_COLOR: Record<string, string> = {
  GREEN: "#22c55e",
  AMBER: "#f59e0b",
  RED:   "#ef4444",
};
const RAG_GLOW: Record<string, string> = {
  GREEN: "0 0 10px rgba(34,197,94,0.25)",
  AMBER: "0 0 10px rgba(245,158,11,0.25)",
  RED:   "0 0 10px rgba(239,68,68,0.25)",
};
const RAG_BG_STYLE = (rag: string): React.CSSProperties => ({
  background: rag === "GREEN" ? "rgba(34,197,94,0.07)"
            : rag === "AMBER" ? "rgba(245,158,11,0.07)"
            : rag === "RED"   ? "rgba(239,68,68,0.07)"
            : "rgba(229,231,235,0.5)",
  border: `1px solid ${
    rag === "GREEN" ? "rgba(34,197,94,0.22)"
  : rag === "AMBER" ? "rgba(245,158,11,0.22)"
  : rag === "RED"   ? "rgba(239,68,68,0.22)"
  : "rgba(209,213,219,0.8)"
  }`,
});

// ─── RAG pill badge ───────────────────────────────────────────────────────────
function RagPill({ rag, size = "sm" }: { rag: string; size?: "xs" | "sm" }) {
  const color = RAG_COLOR[rag] ?? "var(--muted)";
  const fs = size === "xs" ? "9px" : "10px";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: size === "xs" ? "2px 7px" : "3px 9px",
      borderRadius: "999px",
      fontSize: fs, fontWeight: 700, letterSpacing: "0.05em",
      color,
      background: `${color}18`,
      border: `1px solid ${color}40`,
      boxShadow: `0 0 8px ${color}25`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, boxShadow: `0 0 5px ${color}` }} />
      {rag}
    </span>
  );
}

// ─── Glass card wrapper ───────────────────────────────────────────────────────
function GlassCard({ children, style, className }: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div className={className} style={{
      background: "var(--surface)",border: "1px solid var(--border)",borderRadius: 20,boxShadow: "var(--shadow)",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#6366F1", textTransform: "uppercase", marginBottom: 4 }}>
      {children}
    </p>
  );
}

// ─── Interactive Donut ────────────────────────────────────────────────────────
function RagDonut({
  green, amber, red, noData, categoryRag,
}: {
  green: number; amber: number; red: number; noData: number;
  categoryRag: Record<string, string>;
}) {
  const total = green + amber + red + noData || 1;
  const R = 52; const cx = 64; const cy = 64; const circ = 2 * Math.PI * R;

  const slices = [
    { rag: "GREEN", value: green,  color: "#22c55e"  },
    { rag: "AMBER", value: amber,  color: "#f59e0b"  },
    { rag: "RED",   value: red,    color: "#ef4444"    },
    { rag: null,    value: noData, color: "#e5e7eb" },
  ];

  let offset = 0;
  const arcs = slices.map(s => {
    const dash = (s.value / total) * circ;
    const arc = { ...s, dash, offset };
    offset += dash;
    return arc;
  });

  const [hovered, setHovered] = useState<string | null>(null);

  const hoveredDimensions = hovered
    ? Object.entries(categoryRag).filter(([, r]) => r === hovered).map(([cat]) => cat)
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%" }}>
      <div style={{ position: "relative" }}>
        <svg viewBox="0 0 128 128" style={{ width: 160, height: 160, filter: "drop-shadow(0 2px 8px rgba(108,99,255,0.15))" }}>
          {/* Track ring */}
          <circle cx={cx} cy={cy} r={R} fill="none" stroke={"#e5e7eb"} strokeWidth={16} opacity={0.15} />
          {arcs.map((a, i) => (
            <circle
              key={i}
              cx={cx} cy={cy} r={R}
              fill="none"
              stroke={a.color}
              strokeWidth={hovered === a.rag ? 22 : 16}
              strokeLinecap="round"
              strokeDasharray={`${Math.max(a.dash - 2, 0)} ${circ - Math.max(a.dash - 2, 0)}`}
              strokeDashoffset={-a.offset + circ / 4}
              style={{
                transition: "stroke-width 0.2s cubic-bezier(.4,0,.2,1), filter 0.2s ease",
                filter: hovered === a.rag ? `drop-shadow(0 0 8px ${a.color})` : "none",
                cursor: a.value > 0 ? "pointer" : "default",
              }}
              onMouseEnter={() => a.rag && a.value > 0 && setHovered(a.rag)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize={24} fontWeight="800" fill="var(--text)">
            {total - noData}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="var(--muted)" fontWeight="600">
            of {total}
          </text>
          <text x={cx} y={cy + 24} textAnchor="middle" fontSize={7} fill={"#6c63ff"} fontWeight="700" letterSpacing="0.1em">
            METRICS
          </text>
        </svg>

        {hovered && hoveredDimensions.length > 0 && (
          <div style={{
            position: "absolute", left: "calc(100% + 12px)", top: "50%",
            transform: "translateY(-50%)", zIndex: 20,
            background: "var(--surface)", border: "1px solid #e8e6ff",
            borderRadius: 14, padding: "12px 14px", minWidth: 170,
            boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${RAG_COLOR[hovered] ?? "var(--border)"}30`,
            pointerEvents: "none",
          }}>
            <p style={{ fontSize: 9, fontWeight: 800, marginBottom: 8, color: RAG_COLOR[hovered] ?? "var(--text)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {hovered} Dimensions
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {hoveredDimensions.map(d => (
                <div key={d} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: RAG_COLOR[hovered] ?? "var(--muted)", boxShadow: `0 0 6px ${RAG_COLOR[hovered]}` }} />
                  <span style={{ fontSize: 11, color: "var(--text)", fontWeight: 500 }}>{d}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 16px", justifyContent: "center" }}>
        {([["GREEN", green, "#22c55e"], ["AMBER", amber, "#f59e0b"], ["RED", red, "#ef4444"], ["No Data", noData, "#e5e7eb"]] as [string, number, string][]).map(([l, v, c]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, boxShadow: c !== "#e5e7eb" ? `0 0 6px ${c}` : "none" }} />
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{l}: <b style={{ color: "var(--text)" }}>{v}</b></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Metric Trend Chart ───────────────────────────────────────────────────────
function MetricTrendChart({ metric }: { metric: KpiSummaryMetric }) {
  const history = metric.history ?? [];
  const hasData = history.filter(h => h.actual_value != null).length >= 1;
  if (!hasData) return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: 120, fontSize: 12, color: "var(--muted)",
      background: "var(--surface)", borderRadius: 12,
      border: `1px dashed ${"var(--border)"}`,
    }}>
      Not enough data to show trend
    </div>
  );

  const W = 560; const H = 160; const padL = 42; const padR = 16; const padT = 16; const padB = 32;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const n = history.length;

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
  const pad5 = range * 0.1;
  const yMin = minV - pad5;
  const yMax = maxV + pad5;
  const yRange = yMax - yMin || 1;

  const xPos = (i: number) => padL + (n <= 1 ? chartW / 2 : (i / (n - 1)) * chartW);
  const yPos = (v: number) => padT + ((yMax - v) / yRange) * chartH;

  const buildPath = (vals: (number | null)[]) => {
    let d = "";
    vals.forEach((v, i) => {
      if (v == null) return;
      const x = xPos(i); const y = yPos(v);
      if (d === "" || vals[i - 1] == null) d += `M${x},${y}`; else d += `L${x},${y}`;
    });
    return d;
  };

  const actualPath  = buildPath(history.map(h => h.actual_value != null ? Number(h.actual_value) : null));
  const targetPath  = buildPath(history.map(h => h.target != null ? Number(h.target) : null));
  const lslPath     = buildPath(history.map(h => h.lsl != null ? Number(h.lsl) : null));
  const uslPath     = buildPath(history.map(h => h.usl != null ? Number(h.usl) : null));
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => yMin + (i / tickCount) * yRange);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", padding: "0 4px" }}>
        {([
          { label: "Actual", color: "#6c63ff", dash: false },
          { label: "Target", color: "#22c55e", dash: true },
          { label: "LSL",    color: "#f59e0b", dash: true },
          { label: "USL",    color: "#ef4444",   dash: true },
        ] as { label: string; color: string; dash: boolean }[]).map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="22" height="10">
              <line x1="0" y1="5" x2="22" y2="5" stroke={l.color} strokeWidth="2" strokeDasharray={l.dash ? "4,3" : undefined} />
            </svg>
            <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{
        borderRadius: 12, border: "1px solid #e8e6ff",
        background: "var(--surface)", overflowX: "auto",
      }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: 340, height: 160 }}>
          <defs>
            <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={"#6c63ff"} stopOpacity="0.15" />
              <stop offset="100%" stopColor={"#6c63ff"} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Grid */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={padL} y1={yPos(t)} x2={W - padR} y2={yPos(t)}
                stroke="rgba(108,99,255,0.04)" strokeWidth="1" />
              <text x={padL - 4} y={yPos(t) + 4} textAnchor="end" fontSize="8" fill="var(--muted)">
                {t % 1 === 0 ? t.toFixed(0) : t.toFixed(1)}
              </text>
            </g>
          ))}
          {history.map((h, i) => (
            <text key={i} x={xPos(i)} y={H - 6} textAnchor="middle" fontSize="8" fill="var(--muted)">
              {(h.frequency_name || "").substring(0, 8)}
            </text>
          ))}
          {/* Lines */}
          {lslPath    && <path d={lslPath}    fill="none" stroke={"#f59e0b"} strokeWidth="1.5" strokeDasharray="5,4" opacity="0.7" />}
          {uslPath    && <path d={uslPath}    fill="none" stroke={"#ef4444"}   strokeWidth="1.5" strokeDasharray="5,4" opacity="0.7" />}
          {targetPath && <path d={targetPath} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.8" />}
          {/* Area fill under actual */}
          {actualPath && <path d={`${actualPath} L${xPos(n-1)},${padT + chartH} L${xPos(0)},${padT + chartH} Z`} fill="url(#actualGrad)" />}
          {actualPath && <path d={actualPath} fill="none" stroke="#6c63ff" strokeWidth="2.5" style={{ filter: `drop-shadow(0 0 4px ${"#6c63ff"}80)` }} />}
          {/* Dots */}
          {history.map((h, i) => h.actual_value != null && (
            <g key={i}>
              <circle cx={xPos(i)} cy={yPos(Number(h.actual_value))} r="5"
                fill={h.rag_status ? RAG_COLOR[h.rag_status] || "#6c63ff" : "#6c63ff"}
                stroke={"var(--surface)"} strokeWidth="2"
                style={{ filter: `drop-shadow(0 0 4px ${h.rag_status ? RAG_COLOR[h.rag_status] : "#6c63ff"})` }}
              />
              <title>{h.frequency_name}: {Number(h.actual_value).toFixed(2)}</title>
            </g>
          ))}
        </svg>
      </div>

      {/* Period table */}
      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e8e6ff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
          <thead>
            <tr style={{ background: "var(--surface)", borderBottom: "1px solid #e8e6ff" }}>
              {[["Period", "left"], ["Actual", "right"], ["Target", "right"], ["LSL", "right"], ["USL", "right"], ["RAG", "center"]].map(([h, align]) => (
                <th key={h} style={{ padding: "8px 10px", textAlign: align as "left" | "right" | "center", color: "var(--muted)", fontWeight: 700, fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...history].reverse().map((h, i) => (
              <tr key={i} style={{
                borderBottom: "1px solid #e8e6ff",
                background: i === 0 ? "rgba(108,99,255,0.06)" : "transparent",
                transition: "background 0.15s",
              }}>
                <td style={{ padding: "7px 10px", fontWeight: 600, color: "var(--text)" }}>
                  {h.frequency_name || "--"}
                  {i === 0 && (
                    <span style={{ marginLeft: 6, fontSize: 8, background: "rgba(108,99,255,0.12)", color: "#6c63ff", borderRadius: 4, padding: "1px 5px", fontWeight: 700 }}>Latest</span>
                  )}
                </td>
                <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: "var(--text)" }}>{h.actual_value != null ? Number(h.actual_value).toFixed(2) : "--"}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", color: "#22c55e" }}>{h.target != null ? Number(h.target).toFixed(2) : "--"}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", color: "#f59e0b" }}>{h.lsl != null ? Number(h.lsl).toFixed(2) : "--"}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", color: "#ef4444" }}>{h.usl != null ? Number(h.usl).toFixed(2) : "--"}</td>
                <td style={{ padding: "7px 10px", textAlign: "center" }}>
                  {h.rag_status ? <RagPill rag={h.rag_status} size="xs" /> : <span style={{ color: "#e5e7eb" }}>--</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function PMSummaryPage() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [summary, setSummary] = useState<KpiSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null);
  // Spec 14: explanation for the currently expanded metric
  const [explanation, setExplanation] = useState<RagExplainResponse | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  // Action item form
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionForm, setActionForm] = useState({ root_cause: "", corrective_action: "", owner_name: "", target_closure_date: "" });
  const [savingAction, setSavingAction] = useState(false);

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
  const metricsByCategory = (summary?.metrics || []).reduce<Record<string, KpiSummaryMetric[]>>((acc, m) => {
    const cat = m.metric_category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  // Spec 14: open metric card + fetch explanation for RED/AMBER
  const handleExpandMetric = (m: KpiSummaryMetric) => {
    if (expandedMetric === m.plan_metric_id) {
      setExpandedMetric(null);
      setExplanation(null);
      setShowActionForm(false);
      return;
    }
    setExpandedMetric(m.plan_metric_id);
    setExplanation(null);
    setShowActionForm(false);
    setActionForm({ root_cause: "", corrective_action: "", owner_name: "", target_closure_date: "" });
    if (m.rag_status === "RED" || m.rag_status === "AMBER") {
      setExplainLoading(true);
      explainMetric(m.plan_metric_id)
        .then(r => setExplanation(r))
        .catch(() => setExplanation(null))
        .finally(() => setExplainLoading(false));
    }
  };

  const handleRaiseAction = async (e: React.FormEvent, m: KpiSummaryMetric) => {
    e.preventDefault();
    if (!actionForm.root_cause.trim() || !actionForm.corrective_action.trim()) return;
    setSavingAction(true);
    try {
      await createActionItem({
        project_id: selectedProjectId,
        root_cause: actionForm.root_cause,
        corrective_action: actionForm.corrective_action,
        metric_name: m.metric_name,
        rag_status_at_creation: m.rag_status ?? undefined,
        owner_name: actionForm.owner_name || undefined,
        target_closure_date: actionForm.target_closure_date || undefined,
      });
      toast.success("Action item created. View it in Actions.");
      setActionForm({ root_cause: "", corrective_action: "", owner_name: "", target_closure_date: "" });
      setShowActionForm(false);
    } catch {
      toast.error("Failed to create action item.");
    } finally {
      setSavingAction(false);
    }
  };

  /* ── Page wrapper styles ─────────────────────────────── */
  const pageStyle: React.CSSProperties = {
    minHeight: "100%",
    background: "var(--bg)",
    color: "var(--text)",
    fontFamily: "'Inter', 'Poppins', system-ui, sans-serif",
    padding: "4px 0 40px",
  };

  return (
    <div style={pageStyle}>
      {/* styles live in index.css — no inline style tag needed */}

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Header ────────────────────────────────────────── */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <SectionLabel>Project Manager · Analytics</SectionLabel>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
              KPI Summary
            </h1>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Overall health and metric trends</p>
          </div>

          {/* Project selector */}
          <div style={{ position: "relative" }}>
            <select
              value={selectedProjectId}
              onChange={e => { setSelectedProjectId(e.target.value); setExpandedDimension(null); }}
              className="kpi-select"
              style={{
                appearance: "none", WebkitAppearance: "none",
                background: "var(--surface)",
                border: "1px solid #e8e6ff",
                borderRadius: 12, padding: "10px 42px 10px 14px",
                fontSize: 13, fontWeight: 600, color: "var(--text)",
                minWidth: 240, cursor: "pointer", outline: "none",
                boxShadow: "0 0 0 0 #6c63ff",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
            </select>
            <svg style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#6c63ff" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* ── Empty state ────────────────────────────────────── */}
        {projects.length === 0 && (
          <GlassCard style={{ padding: "56px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>No projects yet. Create a project from My Projects.</p>
          </GlassCard>
        )}

        {/* ── Loading skeleton ────────────────────────────────── */}
        {loadingSummary && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ height: 80, borderRadius: 16, background: "#ede9ff", backgroundSize: "200% 100%", animation: "kpi-shimmer 1.5s ease-in-out infinite", backgroundImage: "linear-gradient(90deg, #ede9ff 25%, #f3f0ff 50%, #ede9ff 75%)" }} />
            <div style={{ height: 260, borderRadius: 16, background: "#ede9ff" }} />
          </div>
        )}

        {/* ── Summary content ─────────────────────────────────── */}
        {!loadingSummary && summary && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Overall RAG banner */}
            {summary.overall_rag && (() => {
              const rag = summary.overall_rag;
              const color = RAG_COLOR[rag] ?? "var(--muted)";
              const solidBg: Record<string, string> = {
                GREEN: "linear-gradient(135deg, #e2f3eaff 0%, #7af375ff 100%)",
                AMBER: "linear-gradient(135deg, #ecead9ff 0%, #e0e276ff 100%)",
                RED:   "linear-gradient(135deg, #ec8b8bec 0%, #d30e2fff 100%)",
              };
              const borderColor: Record<string, string> = {
                GREEN: "#00E0C640", AMBER: "#F59E0B40", RED: "#F43F5E40",
              };
              return (
                <div style={{
                  borderRadius: 20,
                  background: solidBg[rag] ?? `linear-gradient(135deg, #1A2640, #131C2E)`,
                  border: `1px solid ${borderColor[rag] ?? "var(--border)"}`,
                  padding: "20px 24px",
                  display: "flex", alignItems: "center", gap: 20,
                  boxShadow: `0 4px 32px ${color}25, inset 0 1px 0 rgba(255,255,255,0.06)`,
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: `linear-gradient(135deg, ${color}50, ${color}25)`,
                    border: `1px solid ${color}60`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, fontWeight: 900, color: "var(--text)", flexShrink: 0,
                    boxShadow: `0 0 24px ${color}40`,
                  }}>
                    {rag[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(26,26,46,0.5)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>
                      Overall Project Health
                    </p>
                    <p style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.01em", lineHeight: 1 }}>
                      {rag}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 12, color: "rgba(26,26,46,0.5)", fontWeight: 500 }}>{selectedProject?.project_name}</p>
                    <div style={{ marginTop: 6 }}>
                      <RagPill rag={rag} />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Charts row: Donut + Dimensions */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>

              {/* Donut */}
              <GlassCard style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12, overflow: "visible" }} className="kpi-card-hover">
                <div>
                  <SectionLabel>Distribution</SectionLabel>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0 }}>KPI Health Distribution</h2>
                  <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>Hover a slice to see dimensions</p>
                </div>
                <RagDonut
                  green={summary.green_count}
                  amber={summary.amber_count}
                  red={summary.red_count}
                  noData={summary.no_data_count}
                  categoryRag={summary.category_rag}
                />
              </GlassCard>

              {/* Dimension status */}
              <GlassCard style={{ padding: 24 }} className="kpi-card-hover">
                <div style={{ marginBottom: 14 }}>
                  <SectionLabel>Breakdown</SectionLabel>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0 }}>Dimension Status</h2>
                  <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>Click a dimension to see its metrics</p>
                </div>
                {Object.keys(summary.category_rag).length === 0 ? (
                  <p style={{ fontSize: 12, color: "var(--muted)" }}>No data yet. Enter KPI measurements first.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {Object.entries(summary.category_rag).map(([cat, rag]) => {
                      const isOpen = expandedDimension === cat;
                      const dimMetrics = metricsByCategory[cat] || [];
                      const color = RAG_COLOR[rag] ?? "var(--muted)";
                      return (
                        <div key={cat} style={{ borderRadius: 12, overflow: "hidden", ...RAG_BG_STYLE(rag) }}>
                          <button
                            type="button"
                            onClick={() => setExpandedDimension(isOpen ? null : cat)}
                            className="kpi-dim-row"
                            style={{
                              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                              padding: "10px 14px", cursor: "pointer", background: "transparent", border: "none",
                              textAlign: "left",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <RagPill rag={rag} size="xs" />
                              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{cat}</span>
                              <span style={{ fontSize: 10, color: "var(--muted)" }}>
                                {dimMetrics.length} metric{dimMetrics.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <svg style={{ flexShrink: 0, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                              width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {isOpen && (
                            <div style={{ borderTop: "1px solid #e8e6ff", background: "var(--surface)" }}>
                              {dimMetrics.filter(m => m.rag_status != null).length === 0 ? (
                                <p style={{ padding: "12px 16px", fontSize: 11, color: "var(--muted)" }}>No data entered yet.</p>
                              ) : dimMetrics.filter(m => m.rag_status != null).map(m => (
                                <div key={m.plan_metric_id} style={{
                                  padding: "9px 16px", display: "flex", alignItems: "center",
                                  justifyContent: "space-between", gap: 12,
                                  borderBottom: "1px solid #e8e6ff",
                                }}>
                                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {m.metric_name}
                                  </p>
                                  {m.rag_status && <RagPill rag={m.rag_status} size="xs" />}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Metric cards */}
            {summary.metrics.length > 0 && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <SectionLabel>All KPIs</SectionLabel>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0 }}>All Metrics</h2>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                  {summary.metrics.map(m => {
                    const rag = m.rag_status;
                    const isExpanded = expandedMetric === m.plan_metric_id;
                    const color = rag ? RAG_COLOR[rag] : "#e5e7eb";

                    if (isExpanded) {
                      return (
                        <div key={m.plan_metric_id} style={{ gridColumn: "1 / -1" }}>
                          <GlassCard style={{
                            border: `1px solid ${color}28`,
                            boxShadow: RAG_GLOW[rag ?? ""] ?? "0 4px 24px rgba(0,0,0,0.3)",
                          }}>
                            <div style={{
                              padding: "18px 20px", display: "flex", alignItems: "center",
                              justifyContent: "space-between", borderBottom: "1px solid #e8e6ff",
                            }}>
                              <div>
                                <p style={{ fontSize: 10, fontWeight: 700, color: "#6c63ff", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                                  {m.metric_category}
                                </p>
                                <p style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{m.metric_name}</p>
                                <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                                  {m.intent} · {m.uom}
                                </p>
                              </div>
                              <button
                                onClick={() => { setExpandedMetric(null); setExplanation(null); }}
                                style={{ background: "rgba(108,99,255,0.08)", border: "1px solid #e8e6ff", borderRadius: 8, padding: "6px 12px", fontSize: 11, color: "var(--muted)", cursor: "pointer", fontWeight: 600 }}
                              >
                                ✕ Close
                              </button>
                            </div>

                            {/* Spec 14: Explanation + Recommendation box for RED/AMBER */}
                            {(rag === "RED" || rag === "AMBER") && (
                              <div style={{
                                margin: "16px 20px 0",
                                borderRadius: 12,
                                border: `1px solid ${rag === "RED" ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`,
                                background: rag === "RED" ? "rgba(239,68,68,0.05)" : "rgba(245,158,11,0.05)",
                                padding: "14px 16px",
                              }}>
                                {explainLoading ? (
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)" }}>
                                    <svg style={{ animation: "spin 1s linear infinite", width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Loading explanation…
                                  </div>
                                ) : explanation?.explanation ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {/* Header row */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                      <span style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                                        Why is this {rag === "RED" ? "red" : "amber"}?
                                      </span>
                                      {explanation.is_worsening && (
                                        <span style={{ fontSize: 9, fontWeight: 700, borderRadius: 999, padding: "2px 8px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#b91c1c" }}>↓ Worsening</span>
                                      )}
                                      {explanation.is_first_breach && (
                                        <span style={{ fontSize: 9, fontWeight: 700, borderRadius: 999, padding: "2px 8px", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", color: "#b45309" }}>First breach</span>
                                      )}
                                    </div>
                                    {/* Explanation */}
                                    <p style={{ fontSize: 12, color: "var(--text)", margin: 0, lineHeight: 1.6 }}>
                                      {explanation.explanation}
                                    </p>
                                    {/* Recommendation */}
                                    {explanation.recommendation ? (
                                      <div style={{ paddingTop: 10, borderTop: `1px solid ${rag === "RED" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)"}` }}>
                                        <p style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>
                                          Recommended action
                                        </p>
                                        <p style={{ fontSize: 12, color: "var(--text)", margin: 0, lineHeight: 1.6 }}>
                                          {explanation.recommendation}
                                        </p>
                                      </div>
                                    ) : (
                                      <p style={{ fontSize: 10, color: "var(--muted)", fontStyle: "italic", margin: 0 }}>
                                        No recommendation configured for this metric yet.
                                      </p>
                                    )}

                                    {/* Raise Action Item */}
                                    <div style={{ paddingTop: 10, borderTop: `1px solid ${rag === "RED" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)"}` }}>
                                      {!showActionForm ? (
                                        <button type="button" onClick={() => setShowActionForm(true)} style={{
                                          fontSize: 11, fontWeight: 700, cursor: "pointer", borderRadius: 8,
                                          padding: "6px 14px", border: "none",
                                          background: rag === "RED" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                                          color: rag === "RED" ? "#b91c1c" : "#b45309",
                                          transition: "background 0.15s",
                                        }}>
                                          + Raise Action Item
                                        </button>
                                      ) : (
                                        <form onSubmit={e => handleRaiseAction(e, m)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                          <p style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
                                            New Action — {m.metric_name}
                                          </p>
                                          <input required type="text" placeholder="Root cause *"
                                            value={actionForm.root_cause}
                                            onChange={e => setActionForm(f => ({ ...f, root_cause: e.target.value }))}
                                            style={{ borderRadius: 8, border: "1.5px solid var(--border)", padding: "8px 12px", fontSize: 12, color: "var(--text)", background: "var(--surface)", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" as const }} />
                                          <textarea required placeholder="Corrective action *" rows={2}
                                            value={actionForm.corrective_action}
                                            onChange={e => setActionForm(f => ({ ...f, corrective_action: e.target.value }))}
                                            style={{ borderRadius: 8, border: "1.5px solid var(--border)", padding: "8px 12px", fontSize: 12, color: "var(--text)", background: "var(--surface)", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" as const, resize: "none" as const }} />
                                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                            <input type="text" placeholder="Owner (optional)"
                                              value={actionForm.owner_name}
                                              onChange={e => setActionForm(f => ({ ...f, owner_name: e.target.value }))}
                                              style={{ borderRadius: 8, border: "1.5px solid var(--border)", padding: "8px 12px", fontSize: 12, color: "var(--text)", background: "var(--surface)", outline: "none", fontFamily: "inherit" }} />
                                            <input type="date" placeholder="Target date"
                                              value={actionForm.target_closure_date}
                                              onChange={e => setActionForm(f => ({ ...f, target_closure_date: e.target.value }))}
                                              style={{ borderRadius: 8, border: "1.5px solid var(--border)", padding: "8px 12px", fontSize: 12, color: "var(--text)", background: "var(--surface)", outline: "none", fontFamily: "inherit" }} />
                                          </div>
                                          <div style={{ display: "flex", gap: 8 }}>
                                            <button type="submit" disabled={savingAction || !actionForm.root_cause.trim() || !actionForm.corrective_action.trim()} style={{
                                              borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none",
                                              background: "var(--primary)", color: "#fff",
                                              opacity: (savingAction || !actionForm.root_cause.trim() || !actionForm.corrective_action.trim()) ? 0.5 : 1,
                                            }}>
                                              {savingAction ? "Saving…" : "Save Action Item"}
                                            </button>
                                            <button type="button" onClick={() => setShowActionForm(false)} style={{
                                              borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                                              border: "1.5px solid var(--border)", background: "transparent", color: "var(--muted)",
                                            }}>
                                              Cancel
                                            </button>
                                          </div>
                                        </form>
                                      )}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            )}

                            <div style={{ padding: "18px 20px" }} onClick={e => e.stopPropagation()}>
                              <MetricTrendChart metric={m} />
                            </div>
                          </GlassCard>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={m.plan_metric_id}
                        onClick={() => handleExpandMetric(m)}
                        className="kpi-card-hover"
                        style={{
                          borderRadius: 16, cursor: "pointer",
                          background: "var(--surface)",
                          border: `1px solid ${color}28`,
                          boxShadow: `0 2px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(108,99,255,0.04)`,
                          padding: 16, overflow: "hidden", position: "relative",
                        }}
                      >
                        {/* Top accent line */}
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)`, borderRadius: "16px 16px 0 0" }} />

                        {/* Spec 14: info badge for RED/AMBER */}
                        {(rag === "RED" || rag === "AMBER") && (
                          <span
                            title="Click to see why this metric is underperforming"
                            style={{
                              position: "absolute", top: 8, right: 8,
                              width: 16, height: 16, borderRadius: "50%",
                              background: rag === "RED" ? "#ef4444" : "#f59e0b",
                              color: "#fff", fontSize: 9, fontWeight: 900,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              boxShadow: `0 0 6px ${color}60`,
                            }}
                          >ℹ</span>
                        )}

                        <div style={{ marginBottom: 10 }}>
                          <p style={{ fontSize: 9, fontWeight: 700, color: "#6c63ff", textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 4 }}>
                            {m.metric_category || "—"}
                          </p>
                          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", lineHeight: 1.3,
                            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {m.metric_name}
                          </p>
                        </div>

                        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
                          <div>
                            <p style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600, marginBottom: 2 }}>LATEST</p>
                            <p style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>
                              {m.latest_value != null ? Number(m.latest_value).toFixed(2) : "--"}
                              {m.uom && <span style={{ fontSize: 10, fontWeight: 400, color: "var(--muted)", marginLeft: 3 }}>{m.uom}</span>}
                            </p>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                            {rag && <RagPill rag={rag} size="xs" />}
                            <span style={{ fontSize: 9, color: "#6c63ff", fontWeight: 700 }}>trend →</span>
                          </div>
                        </div>

                        {/* Mini bar showing measurement count */}
                        {m.measurement_count > 0 && (
                          <div style={{ marginTop: 10, height: 2, borderRadius: 999, background: "rgba(108,99,255,0.08)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min((m.measurement_count / 10) * 100, 100)}%`, background: color, borderRadius: 999 }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {summary.metrics.length === 0 && (
              <GlassCard style={{ padding: "56px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📈</div>
                <p style={{ color: "var(--muted)", fontSize: 14 }}>
                  No KPI data entered yet for {selectedProject?.project_name}.
                </p>
                <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
                  Go to My Projects and click Data Entry to start entering metrics.
                </p>
              </GlassCard>
            )}

            {/* Project-level action item — after all metrics */}
            {selectedProjectId && selectedProject && (
              <PMProjectActionForm projectId={selectedProjectId} projectName={selectedProject.project_name} />
            )}
          </div>
        )}

        {/* No plan state */}
        {!loadingSummary && !summary && selectedProjectId && (
          <GlassCard style={{ padding: "56px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🗂️</div>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>No KPI plan found for this project yet.</p>
          </GlassCard>
        )}

      </div>
    </div>
  );
}
