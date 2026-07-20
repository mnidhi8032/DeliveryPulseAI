/**
 * Read-only Project KPI Summary — for Platform Admin, CEO, Delivery Excellence.
 * Uses CSS variables so it works in both light and dark theme.
 * Spec 14: Shows first-sentence explanation on RED/AMBER metric rows.
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import { getProject } from "../../services/projectService";
import { getKpiPlan, getKpiSummary, explainMetric } from "../../services/qpmService";
import type { RagExplainResponse } from "../../services/qpmService";
import type { Project } from "../../types/project";
import type { KpiSummary, KpiSummaryMetric } from "../../types/qpm";

// ── RAG pill ──────────────────────────────────────────────────────────────────
function RagPill({ rag }: { rag: string | null }) {
  const cfg: Record<string, { dot: string; text: string; bg: string; border: string }> = {
    GREEN: { dot: "#22c55e", text: "#15803d", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.30)"  },
    AMBER: { dot: "#f59e0b", text: "#b45309", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.30)" },
    RED:   { dot: "#ef4444", text: "#b91c1c", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.30)"  },
  };
  if (!rag || !cfg[rag]) return (
    <span style={{ fontSize: 12, color: "var(--muted)", background: "rgba(107,114,128,0.10)", border: "1px solid rgba(107,114,128,0.20)", borderRadius: 20, padding: "2px 10px", fontWeight: 600 }}>No data</span>
  );
  const r = cfg[rag];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: r.bg, border: `1px solid ${r.border}`, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700, color: r.text }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: r.dot }} />
      {rag.charAt(0) + rag.slice(1).toLowerCase()}
    </span>
  );
}

// ── Metric row ────────────────────────────────────────────────────────────────
function MetricRow({ m }: { m: KpiSummaryMetric }) {
  const fmt = (v: string | number | null) => {
    if (v == null) return "—";
    const n = typeof v === "string" ? parseFloat(v) : v;
    return isNaN(n) ? "—" : n.toFixed(2);
  };

  // Spec 14: fetch explanation for RED/AMBER metrics (one sentence only)
  const [explain, setExplain] = useState<RagExplainResponse | null>(null);
  useEffect(() => {
    if (m.rag_status !== "RED" && m.rag_status !== "AMBER") return;
    explainMetric(m.plan_metric_id)
      .then(r => { if (r.explanation) setExplain(r); })
      .catch(() => {});
  }, [m.plan_metric_id, m.rag_status]);

  // First sentence only
  const firstSentence = explain?.explanation
    ? explain.explanation.split(". ")[0] + "."
    : null;

  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}
      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(108,99,255,0.04)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}>
      <td style={{ padding: "10px 16px", maxWidth: 260 }}>
        <p style={{ fontWeight: 700, color: "var(--text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }} title={m.metric_name}>{m.metric_name}</p>
        {m.metric_category && <p style={{ fontSize: 11, color: "var(--muted)", margin: "1px 0 0" }}>{m.metric_category}</p>}
        {/* Spec 14: one-line explanation for RED/AMBER */}
        {firstSentence && (
          <p style={{ fontSize: 11, color: m.rag_status === "RED" ? "#b91c1c" : "#b45309", margin: "4px 0 0", lineHeight: 1.4, fontStyle: "italic" }}>
            {firstSentence}
          </p>
        )}
      </td>
      <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: "var(--text)", fontSize: 13 }}>{fmt(m.latest_value)}{m.uom ? ` ${m.uom}` : ""}</td>
      <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--muted)", fontSize: 13 }}>{fmt(m.target)}</td>
      <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--muted)", fontSize: 13 }}>{fmt(m.lsl)}</td>
      <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--muted)", fontSize: 13 }}>{fmt(m.usl)}</td>
      <td style={{ padding: "10px 16px" }}><RagPill rag={m.rag_status} /></td>
      <td style={{ padding: "10px 16px", color: "var(--muted)", fontSize: 12 }}>
        {m.last_updated ? new Date(m.last_updated).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—"}
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function ProjectSummaryReadOnlyPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [project, setProject]   = useState<Project | null>(null);
  const [summary, setSummary]   = useState<KpiSummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [catFilter, setCatFilter] = useState("All");

  useEffect(() => {
    if (!projectId) return;
    Promise.all([getProject(projectId), getKpiPlan(projectId)])
      .then(([proj, plan]) => { setProject(proj); return getKpiSummary(plan.id); })
      .then(setSummary)
      .catch(() => toast.error("Failed to load project summary"))
      .finally(() => setLoading(false));
  }, [projectId]);

  const backPath =
    user?.role_code === "CEO"                 ? "/ceo"
    : user?.role_code === "DELIVERY_EXCELLENCE" ? "/delivery-excellence"
    : "/platform";

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {[1, 2, 3].map(i => <div key={i} style={{ borderRadius: 20, height: i === 1 ? 80 : 200, background: "var(--border)" }} />)}
    </div>
  );

  const categories = [...new Set((summary?.metrics || []).map(m => m.metric_category).filter(Boolean))];
  const filtered   = (summary?.metrics || []).filter(m => catFilter === "All" || m.metric_category === catFilter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <button onClick={() => navigate(backPath)}
            style={{ fontSize: 13, color: "var(--muted)", background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", gap: 4 }}>
            ← Portfolio Dashboard
          </button>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--text)", margin: "8px 0 0" }}>{project?.project_name}</h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
            {[project?.business_unit_name, project?.account_name, summary?.project_type, summary?.delivery_process_model].filter(Boolean).map((s, i) => (
              <span key={i} style={{ background: "rgba(108,99,255,0.08)", border: "1px solid var(--border)", borderRadius: 20, padding: "3px 12px", fontSize: 12, color: "var(--muted)" }}>{s}</span>
            ))}
          </div>
        </div>
        {summary?.overall_rag && (
          <div style={{ background: "var(--surface)", borderRadius: 16, border: "1.5px solid var(--border)", padding: "10px 18px", display: "flex", alignItems: "center", gap: 10, boxShadow: "var(--shadow)" }}>
            <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Overall health</span>
            <RagPill rag={summary.overall_rag} />
          </div>
        )}
      </div>

      {/* RAG summary tiles */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Green",   count: summary.green_count,   color: "#22c55e" },
            { label: "Amber",   count: summary.amber_count,   color: "#f59e0b" },
            { label: "Red",     count: summary.red_count,     color: "#ef4444" },
            { label: "No data", count: summary.no_data_count, color: "#9ca3af" },
          ].map(s => (
            <div key={s.label} style={{ borderRadius: 20, padding: "16px 20px", background: s.color, boxShadow: `0 4px 16px ${s.color}44` }}>
              <p style={{ fontSize: 30, fontWeight: 900, color: "#fff", margin: 0 }}>{s.count}</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.80)", margin: "4px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Category filter */}
      {categories.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Filter:</span>
          {["All", ...categories].map(cat => (
            <button key={cat} type="button" onClick={() => setCatFilter(cat as string)}
              style={{
                borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: `1.5px solid ${catFilter === cat ? "var(--primary)" : "var(--border)"}`,
                background: catFilter === cat ? "var(--primary)" : "var(--surface)",
                color: catFilter === cat ? "#fff" : "var(--muted)",
                transition: "all 0.15s",
              }}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Metrics table */}
      {filtered.length === 0 ? (
        <div style={{ background: "var(--surface)", borderRadius: 20, border: "2px dashed var(--border)", padding: "48px 24px", textAlign: "center" }}>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>No metrics with measurements yet.</p>
        </div>
      ) : (
        <div style={{ background: "var(--surface)", borderRadius: 20, boxShadow: "var(--shadow)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "rgba(108,99,255,0.04)" }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", margin: 0 }}>KPI Metrics</p>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 0" }}>{filtered.length} metric{filtered.length !== 1 ? "s" : ""} — read-only view</p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(108,99,255,0.04)" }}>
                  {["Metric", "Current Value", "Target", "LSL", "USL", "RAG Status", "Last Updated"].map(h => (
                    <th key={h} style={{ padding: "9px 16px", textAlign: ["Current Value", "Target", "LSL", "USL"].includes(h) ? "right" : "left", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => <MetricRow key={m.plan_metric_id} m={m} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
