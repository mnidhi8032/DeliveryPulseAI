/**
 * Platform Admin — Governance Reports
 * All counts come from listProjects() → projects.current_rag (live data).
 * getPlatformRiskSummary() is used only to get DH names per BU.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listProjects } from "../../services/projectService";
import { getPlatformRiskSummary } from "../../services/platformService";
import type { Project } from "../../types/project";
import type { PlatformRiskRow } from "../../types/platform";

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{ borderRadius: 20, padding: "20px 22px", background: color, boxShadow: `0 4px 20px ${color}55`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -18, right: -18, width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
      <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>{label}</p>
      <p style={{ fontSize: 30, fontWeight: 900, color: "#fff", margin: 0, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", margin: "5px 0 0" }}>{sub}</p>}
    </div>
  );
}

// Strip "DH — " or "PM — " prefix from display names (used inline below)

export function PlatformAdminReportsPage() {
  const navigate = useNavigate();
  const [projects,  setProjects]  = useState<Project[]>([]);
  const [riskMeta,  setRiskMeta]  = useState<PlatformRiskRow[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([listProjects(), getPlatformRiskSummary()])
      .then(([projs, rs]) => { setProjects(projs); setRiskMeta(rs); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ height: 32, width: "30%", borderRadius: 8, background: "var(--border)", animation: "pulse 1.5s infinite" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[1,2,3,4].map(i => <div key={i} style={{ borderRadius: 20, height: 96, background: "var(--border)", animation: "pulse 1.5s infinite" }} />)}
      </div>
    </div>
  );

  // ── All counts from live project current_rag ──────────────────────────────
  const total   = projects.length;
  const green   = projects.filter(p => p.current_rag === "GREEN").length;
  const amber   = projects.filter(p => p.current_rag === "AMBER").length;
  const red     = projects.filter(p => p.current_rag === "RED" || p.current_rag === "CRITICAL").length;
  const noScore = projects.filter(p => !p.current_rag).length;
  const greenPct  = total > 0 ? ((green / total) * 100).toFixed(1) : "0";
  const atRiskPct = total > 0 ? (((amber + red) / total) * 100).toFixed(1) : "0";

  // ── BU-level breakdown from projects ─────────────────────────────────────
  // Group projects by BU name, count RAGs per BU
  const buMap = new Map<string, { total: number; green: number; amber: number; red: number }>();
  for (const p of projects) {
    const bu = p.business_unit_name || "Unknown";
    if (!buMap.has(bu)) buMap.set(bu, { total: 0, green: 0, amber: 0, red: 0 });
    const entry = buMap.get(bu)!;
    entry.total++;
    if (p.current_rag === "GREEN") entry.green++;
    else if (p.current_rag === "AMBER") entry.amber++;
    else if (p.current_rag === "RED" || p.current_rag === "CRITICAL") entry.red++;
  }

  // Merge with riskMeta to get BU IDs and DH names
  // riskMeta is indexed by business_unit_name
  const riskMetaByName = new Map(riskMeta.map(r => [r.business_unit_name, r]));

  const buRows = Array.from(buMap.entries())
    .map(([buName, counts]) => {
      const meta = riskMetaByName.get(buName);
      const redPct = counts.total > 0 ? (counts.red / counts.total) * 100 : 0;
      const dhRaw = meta?.delivery_head_name ?? null;
      // Strip "DH — BU Name" → just the part after the dash
      const dhName = dhRaw ? dhRaw.replace(/^DH\s*[—–\-]\s*/i, "").trim() : "—";
      return {
        buId: meta?.business_unit_id ?? buName,
        buName,
        dhName,
        total: counts.total,
        green: counts.green,
        amber: counts.amber,
        red: counts.red,
        redPct,
        isHighRisk: redPct > 20,
      };
    })
    .sort((a, b) => a.buName.localeCompare(b.buName));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, fontFamily: "'Inter',system-ui,sans-serif" }}>

      {/* Header */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 800, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 6px" }}>Platform Admin</p>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>Governance Reports</h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Live project health across all business units.</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Projects"  value={total}             color="#6c63ff" />
        <StatCard label="Green Health"    value={`${greenPct}%`}    color="#22c55e" sub={`${green} project${green !== 1 ? "s" : ""} on track`} />
        <StatCard label="Needs Attention" value={`${atRiskPct}%`}   color={amber + red > 0 ? "#ef4444" : "#94a3b8"} sub={`${amber} amber · ${red} red`} />
        <StatCard label="No Score Yet"    value={noScore}           color="#3b82f6" sub="Awaiting KPI entry" />
      </div>

      {/* ── BU Risk Summary — computed from real project data ── */}
      {buRows.length > 0 && (
        <div style={{ borderRadius: 20, background: "var(--surface)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", background: "rgba(108,99,255,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", margin: 0 }}>Business Unit Health Summary</p>
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "3px 0 0" }}>Project RAG distribution per BU</p>
            </div>
            <button onClick={() => navigate("/platform/business-units")}
              style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", background: "none", border: "1.5px solid var(--border)", borderRadius: 10, padding: "6px 14px", cursor: "pointer" }}>
              Open BU Analysis →
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(108,99,255,0.04)" }}>
                  {["Business Unit", "Delivery Head", "Projects", "Green", "Amber", "Red", "Status"].map(h => (
                    <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buRows.map(r => (
                  <tr key={r.buId} style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(108,99,255,0.03)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}>
                    <td style={{ padding: "13px 20px", fontWeight: 700, color: "var(--text)" }}>{r.buName}</td>
                    <td style={{ padding: "13px 20px", color: "var(--muted)" }}>{r.dhName}</td>
                    <td style={{ padding: "13px 20px", fontWeight: 600, color: "var(--text)" }}>{r.total}</td>
                    <td style={{ padding: "13px 20px", fontWeight: 700, color: r.green > 0 ? "#15803d" : "var(--muted)" }}>{r.green}</td>
                    <td style={{ padding: "13px 20px", fontWeight: 700, color: r.amber > 0 ? "#b45309" : "var(--muted)" }}>{r.amber}</td>
                    <td style={{ padding: "13px 20px", fontWeight: 700, color: r.red > 0 ? "#b91c1c" : "var(--muted)" }}>{r.red}</td>
                    <td style={{ padding: "13px 20px" }}>
                      {r.isHighRisk ? (
                        <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 10px", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}>⚠ High Risk</span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 10px", background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.25)", color: "#15803d" }}>✓ OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Project Health Breakdown ── */}
      <div style={{ borderRadius: 20, background: "var(--surface)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", background: "rgba(108,99,255,0.04)" }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", margin: 0 }}>Project Health Breakdown</p>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "3px 0 0" }}>RAG distribution across all {total} projects</p>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "Green",    count: green,   color: "#22c55e", textColor: "#15803d" },
            { label: "Amber",    count: amber,   color: "#f59e0b", textColor: "#b45309" },
            { label: "Red",      count: red,     color: "#ef4444", textColor: "#b91c1c" },
            { label: "No Score", count: noScore, color: "#94a3b8", textColor: "var(--muted)" },
          ].map(row => (
            <div key={row.label}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, color: row.textColor }}>{row.label}</span>
                <span style={{ color: "var(--text)", fontWeight: 700 }}>
                  {row.count} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({total > 0 ? ((row.count / total) * 100).toFixed(1) : 0}%)</span>
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${total > 0 ? (row.count / total) * 100 : 0}%`, background: row.color, borderRadius: 999, transition: "width 0.7s" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick Navigation ── */}
      <div style={{ borderRadius: 20, background: "var(--surface)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow)", padding: "20px 24px" }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", margin: "0 0 14px" }}>Quick Navigation</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {[
            { label: "Portfolio Dashboard", to: "/platform" },
            { label: "Business Unit Analysis", to: "/platform/business-units" },
            { label: "Platform Settings", to: "/platform/settings" },
          ].map(l => (
            <button key={l.to} onClick={() => navigate(l.to)}
              style={{ borderRadius: 10, border: "1.5px solid var(--border)", padding: "8px 16px", fontSize: 12, fontWeight: 700, color: "var(--muted)", background: "transparent", cursor: "pointer", transition: "border-color 0.15s, color 0.15s" }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = "var(--primary)"; el.style.color = "var(--primary)"; }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = "var(--border)"; el.style.color = "var(--muted)"; }}
            >
              {l.label} →
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
