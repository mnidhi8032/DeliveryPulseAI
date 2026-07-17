/**
 * Platform Admin — Business Units
 * Counts are computed from listProjects() (live current_rag).
 * getPlatformRiskSummary() is used only for BU IDs and DH names.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listProjects } from "../../services/projectService";
import { getPlatformRiskSummary } from "../../services/platformService";
import type { Project } from "../../types/project";
import type { PlatformRiskRow } from "../../types/platform";

export function PlatformAdminBusinessUnitsPage() {
  const navigate = useNavigate();
  const [projects,  setProjects]  = useState<Project[]>([]);
  const [riskMeta,  setRiskMeta]  = useState<PlatformRiskRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listProjects(), getPlatformRiskSummary()])
      .then(([projs, rs]) => { setProjects(projs); setRiskMeta(rs); })
      .catch(() => setError("Failed to load business units."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[1,2,3].map(i => <div key={i} style={{ borderRadius: 16, height: 80, background: "var(--border)", animation: "pulse 1.5s infinite" }} />)}
    </div>
  );

  if (error) return (
    <div style={{ borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", padding: "14px 18px" }}>
      <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>{error}</p>
    </div>
  );

  // Group projects by BU name, compute real RAG counts
  const buMap = new Map<string, { total: number; green: number; amber: number; red: number }>();
  for (const p of projects) {
    const bu = p.business_unit_name || "Unknown";
    if (!buMap.has(bu)) buMap.set(bu, { total: 0, green: 0, amber: 0, red: 0 });
    const e = buMap.get(bu)!;
    e.total++;
    if (p.current_rag === "GREEN") e.green++;
    else if (p.current_rag === "AMBER") e.amber++;
    else if (p.current_rag === "RED" || p.current_rag === "CRITICAL") e.red++;
  }

  // Merge with riskMeta (for BU IDs + DH names)
  const riskMetaByName = new Map(riskMeta.map(r => [r.business_unit_name, r]));

  const rows = Array.from(buMap.entries())
    .map(([buName, counts]) => {
      const meta = riskMetaByName.get(buName);
      const redPct = counts.total > 0 ? (counts.red / counts.total) * 100 : 0;
      // Strip "DH — " prefix: the display name is "DH — <BU Name>"
      // We want just the human-readable part after the separator
      const rawDh = meta?.delivery_head_name ?? "";
      // Find the separator (em-dash or regular dash or hyphen) and take what's after it
      const sep = rawDh.indexOf("\u2014"); // em-dash —
      const dhName = sep >= 0 ? rawDh.slice(sep + 1).trim() : rawDh.replace(/^DH\s*[-–]\s*/i, "").trim() || rawDh || "—";
      return {
        buId: meta?.business_unit_id ?? buName,
        buName,
        dhName: dhName || "—",
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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 800, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 6px" }}>Platform Admin</p>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>Business Units</h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Governance health overview by business unit.</p>
      </div>

      {/* BU cards */}
      {rows.length === 0 ? (
        <div style={{ borderRadius: 20, border: "2px dashed var(--border)", padding: "48px 24px", textAlign: "center" }}>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>No business units found.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map(row => {
            const riskColor  = row.isHighRisk ? "#ef4444" : row.red > 0 ? "#f59e0b" : "#22c55e";
            const riskBg     = row.isHighRisk ? "rgba(239,68,68,0.08)"  : row.red > 0 ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)";
            const riskBorder = row.isHighRisk ? "rgba(239,68,68,0.25)" : row.red > 0 ? "rgba(245,158,11,0.25)" : "rgba(34,197,94,0.25)";
            const riskLabel  = row.isHighRisk ? "⚠ High Risk" : row.red > 0 ? "Attention" : "✓ OK";

            return (
              <div key={row.buId}
                style={{
                  borderRadius: 16, background: "var(--surface)",
                  border: "1.5px solid var(--border)",
                  borderLeft: `4px solid ${riskColor}`,
                  boxShadow: "var(--shadow)",
                  padding: "18px 24px",
                  display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20,
                  transition: "box-shadow 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 28px rgba(108,99,255,0.14)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow)"; }}
              >
                {/* BU name + DH */}
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", margin: 0 }}>{row.buName}</p>
                  <p style={{ fontSize: 11, color: "var(--muted)", margin: "4px 0 0" }}>DH: {row.dhName}</p>
                </div>

                {/* Stats */}
                <div style={{ display: "flex", gap: 28, flexShrink: 0, alignItems: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", margin: 0, lineHeight: 1 }}>{row.total}</p>
                    <p style={{ fontSize: 10, color: "var(--muted)", margin: "3px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Projects</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {[
                      { label: "G", count: row.green, color: "#22c55e" },
                      { label: "A", count: row.amber, color: "#f59e0b" },
                      { label: "R", count: row.red,   color: "#ef4444" },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: "center" }}>
                        <p style={{ fontSize: 18, fontWeight: 900, color: s.count > 0 ? s.color : "var(--muted)", margin: 0, lineHeight: 1 }}>{s.count}</p>
                        <p style={{ fontSize: 9, color: "var(--muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label === "G" ? "Green" : s.label === "A" ? "Amber" : "Red"}</p>
                      </div>
                    ))}
                  </div>
                  {/* Risk bar */}
                  <div style={{ width: 110 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 5 }}>
                      <span style={{ color: "var(--muted)" }}>Risk</span>
                      <span style={{ fontWeight: 700, color: riskColor }}>{row.redPct.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(row.redPct, 100)}%`, background: riskColor, borderRadius: 999, transition: "width 0.6s" }} />
                    </div>
                  </div>
                </div>

                {/* Risk badge */}
                <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "4px 12px", background: riskBg, border: `1px solid ${riskBorder}`, color: riskColor, flexShrink: 0 }}>
                  {riskLabel}
                </span>

                {/* Open analysis button */}
                <button
                  onClick={() => navigate(`/platform/bu/${row.buId}`)}
                  style={{ borderRadius: 10, padding: "8px 18px", fontSize: 12, fontWeight: 700, color: "#fff", background: "var(--primary)", border: "none", cursor: "pointer", flexShrink: 0, boxShadow: "0 2px 10px rgba(108,99,255,0.30)", whiteSpace: "nowrap" }}
                >
                  Open Analysis →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
