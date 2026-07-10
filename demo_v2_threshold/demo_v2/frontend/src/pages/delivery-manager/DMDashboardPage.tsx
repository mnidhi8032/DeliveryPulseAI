/**
 * Delivery Manager Dashboard — light purple theme matching PM dashboard.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listProjects } from "../../services/projectService";
import { getProjectReviewStatuses } from "../../services/dmReviewService";
import type { Project } from "../../types/project";
import type { ProjectReviewStatus } from "../../services/dmReviewService";

// ── Design tokens (matches PM dashboard) ─────────────────────────────────────
const C = {
  bg:      "#f0f2ff",
  card:    "#ffffff",
  primary: "#6c63ff",
  border:  "#e8e6ff",
  shadow:  "0 2px 16px rgba(108,99,255,0.10)",
  text:    "#1a1a2e",
  muted:   "#6b7280",
};

// ── Stat card (matches PM style exactly) ─────────────────────────────────────
function StatCard({ label, value, sub, color }: {
  label: string; value: number | string; sub?: string; color: string;
}) {
  return (
    <div style={{
      borderRadius: 20, padding: "22px 22px 18px", background: color,
      boxShadow: `0 4px 20px ${color}55`, position: "relative", overflow: "hidden",
    }}>
      <div style={{ position:"absolute", top:-18, right:-18, width:72, height:72, borderRadius:"50%", background:"rgba(255,255,255,0.15)" }} />
      <p style={{ fontSize: 38, fontWeight: 900, color: "#fff", margin: 0, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.80)", margin: "7px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.60)", margin: "3px 0 0" }}>{sub}</p>}
    </div>
  );
}

// ── RAG dot + label ───────────────────────────────────────────────────────────
function RagLabel({ rag }: { rag: string | null }) {
  const cfg: Record<string, { dot: string; text: string; label: string }> = {
    GREEN: { dot: "#22c55e", text: "#15803d", label: "Green" },
    AMBER: { dot: "#f59e0b", text: "#b45309", label: "Amber" },
    RED:   { dot: "#ef4444", text: "#b91c1c", label: "Red"   },
  };
  if (!rag || !cfg[rag]) return <span style={{ color: C.muted, fontSize: 13 }}>—</span>;
  const { dot, text, label } = cfg[rag];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius:"50%", background: dot, flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: text }}>{label}</span>
    </span>
  );
}

// ── SVG Bar chart ─────────────────────────────────────────────────────────────
function BarChart({ green, amber, red }: { green: number; amber: number; red: number }) {
  const max = Math.max(green, amber, red, 1);
  const H = 80;
  const bars = [
    { label: "Green", val: green, color: "#22c55e" },
    { label: "Amber", val: amber, color: "#f59e0b" },
    { label: "Red",   val: red,   color: "#ef4444" },
  ];
  return (
    <svg viewBox="0 0 180 110" style={{ width: "100%", height: 110 }}>
      {bars.map((b, i) => {
        const bh = b.val === 0 ? 3 : (b.val / max) * H;
        const x = 20 + i * 55;
        const y = 90 - bh;
        return (
          <g key={b.label}>
            <rect x={x} y={y} width={34} height={bh} rx={6} fill={b.color} fillOpacity={b.val === 0 ? 0.25 : 1} />
            <text x={x + 17} y={107} textAnchor="middle" fontSize={10} fill={C.muted}>{b.label}</text>
            {b.val > 0 && <text x={x + 17} y={y - 5} textAnchor="middle" fontSize={11} fill={C.text} fontWeight="700">{b.val}</text>}
          </g>
        );
      })}
      <line x1="10" y1="90" x2="170" y2="90" stroke={C.border} strokeWidth="1.5" />
    </svg>
  );
}

// ── Donut chart ───────────────────────────────────────────────────────────────
function DonutChart({ needsReview, upToDate }: { needsReview: number; upToDate: number }) {
  const total = needsReview + upToDate || 1;
  const pct   = Math.round((needsReview / total) * 100);
  const R = 44; const circ = 2 * Math.PI * R;
  const upDash   = (upToDate   / total) * circ;
  const needsDash = (needsReview / total) * circ;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap: 12 }}>
      <svg viewBox="0 0 120 120" style={{ width: 120, height: 120 }}>
        <circle cx={60} cy={60} r={R} fill="none" stroke="#22c55e" strokeWidth={14}
          strokeDasharray={`${upDash} ${circ - upDash}`} strokeDashoffset={circ / 4} />
        <circle cx={60} cy={60} r={R} fill="none" stroke="#f97316" strokeWidth={14}
          strokeDasharray={`${needsDash} ${circ - needsDash}`} strokeDashoffset={circ / 4 - upDash} />
        <text x={60} y={56} textAnchor="middle" fontSize={16} fontWeight="800" fill={C.text}>{pct}%</text>
        <text x={60} y={70} textAnchor="middle" fontSize={8} fill={C.muted}>needs review</text>
      </svg>
      <div style={{ display:"flex", gap: 16, fontSize: 11, color: C.muted }}>
        <span style={{ display:"flex", alignItems:"center", gap: 5 }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background:"#f97316" }} />Needs review
        </span>
        <span style={{ display:"flex", alignItems:"center", gap: 5 }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background:"#22c55e" }} />Up to date
        </span>
      </div>
    </div>
  );
}

export function DMDashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [reviewStatuses, setReviewStatuses] = useState<Map<string, ProjectReviewStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listProjects(), getProjectReviewStatuses()])
      .then(([projs, statuses]) => {
        setProjects(projs.sort((a, b) => a.project_name.localeCompare(b.project_name)));
        setReviewStatuses(new Map(statuses.map(s => [s.project_id, s])));
      })
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:"grid", gap:16, gridTemplateColumns:"repeat(4,1fr)" }}>
      {[1,2,3,4].map(i => <div key={i} style={{ borderRadius:20, height:100, background:"#e8e6ff", animation:"pulse 1.5s infinite" }} />)}
    </div>
  );

  if (error) return (
    <div style={{ borderRadius:16, background:"#fef2f2", border:"1px solid #fecaca", padding:"16px 20px" }}>
      <p style={{ color:"#b91c1c", fontSize:14 }}>{error}</p>
    </div>
  );

  const byAccount: Record<string, { accountName: string; buName: string; projects: Project[] }> = {};
  for (const p of projects) {
    if (!byAccount[p.account_id]) byAccount[p.account_id] = { accountName: p.account_name, buName: p.business_unit_name, projects: [] };
    byAccount[p.account_id].projects.push(p);
  }

  const needsReviewCount = [...reviewStatuses.values()].filter(s => s.needs_review).length;
  const upToDateCount    = projects.length - needsReviewCount;
  const greenCount  = projects.filter(p => p.current_rag === "GREEN").length;
  const amberCount  = projects.filter(p => p.current_rag === "AMBER").length;
  const redCount    = projects.filter(p => p.current_rag === "RED").length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap: 28 }}>

      {/* Page title */}
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: 0 }}>Delivery Manager</h1>
        <p style={{ fontSize: 14, color: C.muted, margin: "4px 0 0" }}>
          Monitor KPI health across your assigned accounts.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Projects"  value={projects.length}  sub="across all accounts" color="#6c63ff" />
        <StatCard label="Needs Review"    value={needsReviewCount} sub={needsReviewCount > 0 ? "action required" : "all reviewed"} color="#f97316" />
        <StatCard label="Green Health"    value={greenCount}       sub={`${projects.length ? Math.round((greenCount / projects.length) * 100) : 0}% of projects`} color="#22c55e" />
        <StatCard label="At Risk"         value={amberCount + redCount} sub="amber + red"    color="#f59e0b" />
      </div>

      {/* Charts row */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div style={{ background: C.card, borderRadius: 20, padding: "22px 24px", boxShadow: C.shadow }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: "0 0 4px" }}>Project health distribution</p>
            <p style={{ fontSize: 12, color: C.muted, margin: "0 0 12px" }}>across all accounts</p>
            <BarChart green={greenCount} amber={amberCount} red={redCount} />
          </div>
          <div style={{ background: C.card, borderRadius: 20, padding: "22px 24px", boxShadow: C.shadow, display:"flex", flexDirection:"column" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: "0 0 4px" }}>Review status</p>
            <p style={{ fontSize: 12, color: C.muted, margin: "0 0 12px" }}>{projects.length} projects total</p>
            <div style={{ flex: 1, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <DonutChart needsReview={needsReviewCount} upToDate={upToDateCount} />
            </div>
          </div>
        </div>
      )}

      {/* Needs review alert */}
      {needsReviewCount > 0 && (
        <div style={{ background:"#fff7ed", borderRadius:16, border:"1px solid #fed7aa", padding:"14px 18px", display:"flex", alignItems:"flex-start", gap:12 }}>
          <span style={{ fontSize:18 }}>⚠️</span>
          <div>
            <p style={{ fontSize:14, fontWeight:700, color:"#9a3412", margin:0 }}>
              {needsReviewCount} project{needsReviewCount !== 1 ? "s" : ""} have new metric data awaiting your review
            </p>
            <p style={{ fontSize:12, color:"#c2410c", margin:"3px 0 0" }}>
              Click "Review KPIs" next to each project to add commentary and action items.
            </p>
          </div>
        </div>
      )}

      {/* Projects by account */}
      {projects.length === 0 ? (
        <div style={{ background: C.card, borderRadius: 20, border: `2px dashed ${C.border}`, padding: "48px 24px", textAlign: "center" }}>
          <p style={{ color: C.muted, fontSize: 14 }}>No projects assigned to your accounts yet.</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap: 20 }}>
          {Object.entries(byAccount).map(([, group]) => (
            <div key={group.accountName} style={{ background: C.card, borderRadius: 20, boxShadow: C.shadow, overflow: "hidden" }}>
              {/* Account header */}
              <div style={{ background: "#f5f3ff", borderBottom: `1px solid ${C.border}`, padding: "14px 24px", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:15, fontWeight:800, color: C.text, margin:0 }}>{group.accountName} projects</p>
                  <p style={{ fontSize:12, color: C.muted, margin:"2px 0 0" }}>{group.buName}</p>
                </div>
                <span style={{ background: C.primary + "18", color: C.primary, fontSize:11, fontWeight:700, borderRadius:20, padding:"3px 12px" }}>
                  {group.projects.length} project{group.projects.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Projects table */}
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                    {["Project","PM","Health","Review Status","Last Reviewed",""].map(h => (
                      <th key={h} style={{ padding:"10px 20px", textAlign:"left", fontSize:11, fontWeight:700, color: C.muted, textTransform:"uppercase", letterSpacing:"0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.projects.map(p => {
                    const rs = reviewStatuses.get(p.id);
                    const needsReview = rs?.needs_review ?? false;
                    return (
                      <tr key={p.id} style={{ borderBottom:`1px solid ${C.border}`, background: needsReview ? "#fff7ed" : "transparent", transition:"background 0.15s" }}
                        onMouseEnter={e => { if (!needsReview) (e.currentTarget as HTMLTableRowElement).style.background = "#faf9ff"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = needsReview ? "#fff7ed" : "transparent"; }}
                      >
                        <td style={{ padding:"14px 20px" }}>
                          <p style={{ fontWeight:700, color: C.text, margin:0 }}>{p.project_name}</p>
                          <p style={{ fontSize:11, color: C.muted, fontFamily:"monospace", margin:"2px 0 0" }}>{p.project_code}</p>
                        </td>
                        <td style={{ padding:"14px 20px", color: C.muted }}>{p.project_manager_name || "—"}</td>
                        <td style={{ padding:"14px 20px" }}><RagLabel rag={p.current_rag} /></td>
                        <td style={{ padding:"14px 20px" }}>
                          {needsReview ? (
                            <span style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:700, color:"#c2410c" }}>
                              <span style={{ width:6, height:6, borderRadius:"50%", background:"#f97316" }} />
                              Needs review
                            </span>
                          ) : rs?.last_reviewed_at ? (
                            <span style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:700, color:"#15803d" }}>
                              <span style={{ width:6, height:6, borderRadius:"50%", background:"#22c55e" }} />
                              Up to date
                            </span>
                          ) : (
                            <span style={{ color: C.muted, fontSize:13 }}>Not reviewed</span>
                          )}
                        </td>
                        <td style={{ padding:"14px 20px", color: C.muted, fontSize:13 }}>
                          {rs?.last_reviewed_at
                            ? new Date(rs.last_reviewed_at).toLocaleDateString("en-US", { day:"numeric", month:"short", year:"numeric" })
                            : "—"}
                          {rs?.last_review_period && <p style={{ fontSize:11, color: C.muted, margin:"2px 0 0" }}>{rs.last_review_period}</p>}
                        </td>
                        <td style={{ padding:"14px 20px", textAlign:"right" }}>
                          <Link
                            to={`/delivery-manager/projects/${p.id}/review`}
                            style={{
                              display:"inline-block", borderRadius:10, padding:"7px 16px", fontSize:12, fontWeight:700, textDecoration:"none", transition:"all 0.15s",
                              background: needsReview ? C.primary : "transparent",
                              color: needsReview ? "#fff" : C.primary,
                              border: needsReview ? "none" : `1.5px solid ${C.border}`,
                              boxShadow: needsReview ? `0 2px 10px ${C.primary}44` : "none",
                            }}
                          >
                            {needsReview ? "Review KPIs →" : "View"}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
