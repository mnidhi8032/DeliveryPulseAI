/**
 * Platform Admin — BU Analysis
 * Shows real project KPI data for a specific Business Unit.
 * Uses listProjects (scoped) + getPlatformBUAnalysis for BU metadata only.
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { listProjects } from "../../services/projectService";
import { getPlatformBUAnalysis } from "../../services/platformService";
import type { Project } from "../../types/project";
import type { PlatformBUAnalysis } from "../../types/platform";

// ── Stat tile ─────────────────────────────────────────────────────────────────
function StatTile({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div style={{ borderRadius: 16, background: "var(--surface)", border: "1.5px solid var(--border)", padding: "18px 20px", boxShadow: "var(--shadow)" }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 900, color, margin: 0, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: "var(--muted)", margin: "5px 0 0" }}>{sub}</p>}
    </div>
  );
}

// ── RAG pill ──────────────────────────────────────────────────────────────────
function RagPill({ rag }: { rag: string | null }) {
  if (!rag) return <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>No score</span>;
  const cfg: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    GREEN:    { bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.25)",  text: "#15803d", dot: "#22c55e" },
    AMBER:    { bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.25)", text: "#b45309", dot: "#f59e0b" },
    RED:      { bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.25)",  text: "#b91c1c", dot: "#ef4444" },
    CRITICAL: { bg: "rgba(190,18,60,0.10)",  border: "rgba(190,18,60,0.25)",  text: "#9f1239", dot: "#be123c" },
  };
  const c = cfg[rag];
  if (!c) return <span style={{ fontSize: 11, color: "var(--muted)" }}>{rag}</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "3px 10px", background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />
      {rag.charAt(0) + rag.slice(1).toLowerCase()}
    </span>
  );
}

export function PlatformAdminBUAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [buMeta, setBuMeta]   = useState<PlatformBUAnalysis | null>(null);
  const [buProjects, setBuProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([getPlatformBUAnalysis(id), listProjects()])
      .then(([meta, allProjects]) => {
        setBuMeta(meta);
        // Filter projects that belong to this BU
        const filtered = allProjects.filter(p => {
          // Match by BU name (projects have business_unit_name)
          return p.business_unit_name === meta.business_unit_name;
        });
        setBuProjects(filtered.sort((a, b) => a.project_name.localeCompare(b.project_name)));
      })
      .catch(() => setError("Failed to load business unit data."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {[1, 2, 3].map(i => <div key={i} style={{ borderRadius: 16, height: i === 1 ? 60 : 120, background: "var(--border)", animation: "pulse 1.5s infinite" }} />)}
    </div>
  );

  if (error || !buMeta) return (
    <div style={{ borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", padding: "14px 18px" }}>
      <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>{error ?? "Business unit not found."}</p>
    </div>
  );

  // Compute real RAG counts from live project data
  const green   = buProjects.filter(p => p.current_rag === "GREEN").length;
  const amber   = buProjects.filter(p => p.current_rag === "AMBER").length;
  const red     = buProjects.filter(p => p.current_rag === "RED" || p.current_rag === "CRITICAL").length;
  const noScore = buProjects.filter(p => !p.current_rag).length;
  const total   = buProjects.length;
  const greenPct = total > 0 ? Math.round((green / total) * 100) : 0;

  // Strip "DH — " prefix from DH display names
  const dhNames = buMeta.delivery_head_names
    .map(n => n.replace(/^DH\s*[—–-]\s*/i, ""))
    .join(", ");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, fontFamily: "'Inter',system-ui,sans-serif" }}>

      {/* Back link */}
      <button onClick={() => navigate("/platform/business-units")}
        style={{ fontSize: 13, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", gap: 4, alignSelf: "flex-start" }}>
        ← Business Units
      </button>

      {/* BU header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Platform Admin · BU Analysis</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>{buMeta.business_unit_name}</h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted)", background: "rgba(108,99,255,0.08)", borderRadius: 6, padding: "2px 8px" }}>{buMeta.business_unit_code}</span>
          {dhNames && <span style={{ fontSize: 11, color: "var(--muted)" }}>DH: {dhNames}</span>}
          {buMeta.description && <span style={{ fontSize: 12, color: "var(--muted)" }}>{buMeta.description}</span>}
        </div>
      </div>

      {/* Stat tiles — from real project data */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Total Projects"  value={total}        color="var(--primary)" />
        <StatTile label="Green Health"    value={`${greenPct}%`} color="#22c55e" sub={`${green} project${green !== 1 ? "s" : ""}`} />
        <StatTile label="Needs Attention" value={amber + red}  color={amber + red > 0 ? "#ef4444" : "var(--muted)"} sub={`${amber} amber · ${red} red`} />
        <StatTile label="No Score Yet"    value={noScore}      color="#3b82f6" sub="Awaiting KPI entry" />
      </div>

      {/* Health breakdown bar */}
      {total > 0 && (
        <div style={{ borderRadius: 20, background: "var(--surface)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow)", padding: "20px 24px" }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: "0 0 16px" }}>Project Health Distribution</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Green",    count: green,   color: "#22c55e", textColor: "#15803d" },
              { label: "Amber",    count: amber,   color: "#f59e0b", textColor: "#b45309" },
              { label: "Red",      count: red,     color: "#ef4444", textColor: "#b91c1c" },
              { label: "No Score", count: noScore, color: "#94a3b8", textColor: "var(--muted)" },
            ].map(row => (
              <div key={row.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                  <span style={{ fontWeight: 700, color: row.textColor }}>{row.label}</span>
                  <span style={{ color: "var(--text)", fontWeight: 700 }}>
                    {row.count} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({total > 0 ? ((row.count / total) * 100).toFixed(1) : 0}%)</span>
                  </span>
                </div>
                <div style={{ height: 7, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${total > 0 ? (row.count / total) * 100 : 0}%`, background: row.color, borderRadius: 999, transition: "width 0.7s" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects table */}
      <div style={{ borderRadius: 20, background: "var(--surface)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", background: "rgba(108,99,255,0.04)" }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", margin: 0 }}>Projects in this BU</p>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "3px 0 0" }}>{total} project{total !== 1 ? "s" : ""}</p>
        </div>

        {buProjects.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>No projects found for this Business Unit.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(108,99,255,0.04)" }}>
                  {["Project", "Account", "PM", "Status", "Health"].map(h => (
                    <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buProjects.map((p, idx) => {
                  const ragColors: Record<string, string> = { GREEN: "#22c55e", AMBER: "#f59e0b", RED: "#ef4444", CRITICAL: "#ef4444" };
                  const leftColor = p.current_rag ? (ragColors[p.current_rag] ?? "var(--border)") : "var(--border)";
                  const statusLabel: Record<string, string> = { ACTIVE: "Active", ON_HOLD: "On Hold", COMPLETED: "Completed", CANCELLED: "Cancelled" };
                  return (
                    <tr key={p.id} style={{ borderBottom: idx < buProjects.length - 1 ? "1px solid var(--border)" : "none", borderLeft: `3px solid ${leftColor}` }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(108,99,255,0.03)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}>
                      <td style={{ padding: "13px 20px" }}>
                        <p style={{ fontWeight: 700, color: "var(--primary)", margin: 0 }}>{p.project_name}</p>
                        <p style={{ fontSize: 10, color: "var(--muted)", fontFamily: "monospace", margin: "2px 0 0" }}>{p.project_code}</p>
                      </td>
                      <td style={{ padding: "13px 20px", color: "var(--muted)" }}>{p.account_name || "—"}</td>
                      <td style={{ padding: "13px 20px", color: "var(--muted)" }}>
                        {p.project_manager_name
                          ? p.project_manager_name.replace(/^PM\s*[—–-]\s*/i, "")
                          : "—"}
                      </td>
                      <td style={{ padding: "13px 20px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "3px 9px",
                          color: p.status === "ACTIVE" ? "#15803d" : p.status === "ON_HOLD" ? "#b45309" : "var(--muted)",
                          background: p.status === "ACTIVE" ? "rgba(34,197,94,0.10)" : p.status === "ON_HOLD" ? "rgba(245,158,11,0.10)" : "rgba(107,114,128,0.10)",
                          border: `1px solid ${p.status === "ACTIVE" ? "rgba(34,197,94,0.25)" : p.status === "ON_HOLD" ? "rgba(245,158,11,0.25)" : "rgba(107,114,128,0.25)"}`,
                        }}>
                          {statusLabel[p.status] ?? p.status}
                        </span>
                      </td>
                      <td style={{ padding: "13px 20px" }}>
                        <RagPill rag={p.current_rag} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
