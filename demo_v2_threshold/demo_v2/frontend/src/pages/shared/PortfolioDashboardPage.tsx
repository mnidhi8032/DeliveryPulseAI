/**
 * Portfolio Dashboard — Executive View (Platform Admin, CEO, Delivery Excellence)
 * Reference-style: stat cards, bar chart, donut, project table.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { listProjects } from "../../services/projectService";
import type { Project } from "../../types/project";

/* ── Design tokens ── */
const RAG_COLOR: Record<string, string> = {
  GREEN: "#22c55e", AMBER: "#f59e0b", RED: "#ef4444", CRITICAL: "#be123c",
};

/* ── Stat card (colored box style like PM dashboard) ── */
function StatCard({ label, value, color, icon, sub, trend, trendUp }: {
  label: string; value: string | number; color: string; icon: React.ReactNode;
  sub?: string; trend?: string; trendUp?: boolean;
}) {
  return (
    <div style={{
      borderRadius: 20, padding: "22px 22px 18px", background: color,
      boxShadow: `0 4px 20px ${color}55`,
      cursor: "default", position: "relative", overflow: "hidden",
    }}>
      {/* Decorative circle */}
      <div style={{ position: "absolute", top: -18, right: -18, width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.15)", pointerEvents: "none" }} />
      {/* Icon top-right */}
      <div style={{ position: "absolute", top: 16, right: 16, width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      {/* Trend badge */}
      {trend && (
        <div style={{ marginBottom: 6 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "2px 8px",
            background: "rgba(255,255,255,0.25)", color: "#fff",
          }}>
            {trendUp ? "↑" : "↓"} {trend}
          </span>
        </div>
      )}
      <p style={{ fontSize: 38, fontWeight: 900, color: "#fff", margin: 0, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.80)", margin: "7px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.60)", margin: "3px 0 0" }}>{sub}</p>}
    </div>
  );
}

/* ── SVG Bar chart — health per BU ── */
function BUHealthChart({ projects }: { projects: Project[] }) {
  const buNames = useMemo(() => Array.from(new Set(projects.map(p => p.business_unit_name).filter(Boolean))), [projects]);
  if (buNames.length === 0) return <p style={{ color: "var(--muted)", fontSize: 13 }}>No data</p>;

  const W = 560; const H = 180; const padL = 100; const padB = 32; const padT = 16; const padR = 16;
  const barW = Math.min(18, (W - padL - padR) / (buNames.length * 3 + buNames.length));
  const groupW = barW * 3 + barW * 0.5;
  const chartW = W - padL - padR;
  const chartH = H - padB - padT;

  const data = buNames.map(bu => {
    const buProjects = projects.filter(p => p.business_unit_name === bu);
    return {
      bu: bu.length > 12 ? bu.slice(0, 11) + "…" : bu,
      green: buProjects.filter(p => p.current_rag === "GREEN").length,
      amber: buProjects.filter(p => p.current_rag === "AMBER").length,
      red: buProjects.filter(p => p.current_rag === "RED" || p.current_rag === "CRITICAL").length,
    };
  });

  const maxVal = Math.max(...data.flatMap(d => [d.green, d.amber, d.red]), 1);
  const yTicks = [0, Math.ceil(maxVal / 2), maxVal];

  const xStep = chartW / buNames.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
      {/* Y grid */}
      {yTicks.map((t, i) => {
        const y = padT + chartH - (t / maxVal) * chartH;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--border)" strokeWidth="1" />
            <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{t}</text>
          </g>
        );
      })}
      {/* Bars */}
      {data.map((d, i) => {
        const cx = padL + i * xStep + xStep / 2;
        const bars = [
          { val: d.green, color: "#22c55e" },
          { val: d.amber, color: "#f59e0b" },
          { val: d.red,   color: "#ef4444" },
        ];
        return (
          <g key={i}>
            {bars.map((b, j) => {
              const bh = b.val > 0 ? Math.max((b.val / maxVal) * chartH, 4) : 0;
              const bx = cx - groupW / 2 + j * (barW + 2);
              const by = padT + chartH - bh;
              return (
                <g key={j}>
                  <rect x={bx} y={by} width={barW} height={bh} rx="3" fill={b.color} opacity="0.85" />
                  {b.val > 0 && (
                    <text x={bx + barW / 2} y={by - 3} textAnchor="middle" fontSize="9" fill={b.color} fontWeight="700">{b.val}</text>
                  )}
                </g>
              );
            })}
            <text x={cx} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--muted)">{d.bu}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── SVG Donut chart — RAG breakdown ── */
function RagDonut({ green, amber, red, total }: { green: number; amber: number; red: number; total: number }) {
  const R = 60; const cx = 80; const cy = 80; const circ = 2 * Math.PI * R;
  const noData = total - green - amber - red;
  const slices = [
    { val: green,  color: "#22c55e", label: "Green"  },
    { val: amber,  color: "#f59e0b", label: "Amber"  },
    { val: red,    color: "#ef4444", label: "Red"    },
    { val: noData, color: "#e5e7eb", label: "No data"},
  ];
  let offset = 0;
  const arcs = slices.map(s => {
    const dash = total > 0 ? (s.val / total) * circ : 0;
    const arc = { ...s, dash, offset };
    offset += dash;
    return arc;
  });
  const pct = total > 0 ? Math.round((green / total) * 100) : 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <svg viewBox="0 0 160 160" style={{ width: 160, height: 160, flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--border)" strokeWidth={20} />
        {arcs.map((a, i) => (
          <circle key={i} cx={cx} cy={cy} r={R} fill="none"
            stroke={a.color} strokeWidth={20} strokeLinecap="butt"
            strokeDasharray={`${Math.max(a.dash - 1.5, 0)} ${circ}`}
            strokeDashoffset={-a.offset + circ / 4}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="800" fill="var(--text)">{pct}%</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="var(--muted)">Green health</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {arcs.filter(a => a.val > 0).map(a => (
          <div key={a.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: a.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 600, minWidth: 60 }}>{a.label}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{a.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── RAG badge ── */
function RagBadge({ rag }: { rag: string | null }) {
  if (!rag) return <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>—</span>;
  const c = RAG_COLOR[rag] ?? "#6b7280";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700,
      borderRadius: 999, padding: "3px 10px",
      color: c, background: `${c}18`, border: `1px solid ${c}40`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />
      {rag.charAt(0) + rag.slice(1).toLowerCase()}
    </span>
  );
}

/* ── Section header ── */
function SectionHeader({ title, sub, action, onAction }: { title: string; sub?: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", margin: 0 }}>{title}</h2>
        {sub && <p style={{ fontSize: 12, color: "var(--muted)", margin: "3px 0 0" }}>{sub}</p>}
      </div>
      {action && (
        <button onClick={onAction} style={{
          fontSize: 12, fontWeight: 700, color: "var(--primary)", background: "none",
          border: "1.5px solid var(--border)", borderRadius: 10, padding: "6px 14px", cursor: "pointer",
        }}>
          {action} →
        </button>
      )}
    </div>
  );
}

/* ── Main page ── */
export function PortfolioDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [showAllAtRisk, setShowAllAtRisk] = useState(false);

  useEffect(() => {
    listProjects()
      .then(list => setProjects(list.sort((a, b) => a.project_name.localeCompare(b.project_name))))
      .catch(() => setError("Failed to load projects"))
      .finally(() => setLoading(false));
  }, []);

  const green    = projects.filter(p => p.current_rag === "GREEN").length;
  const amber    = projects.filter(p => p.current_rag === "AMBER").length;
  const red      = projects.filter(p => p.current_rag === "RED" || p.current_rag === "CRITICAL").length;
  const noScore  = projects.filter(p => !p.current_rag).length;
  const atRisk   = projects.filter(p => p.current_rag === "RED" || p.current_rag === "CRITICAL" || p.current_rag === "AMBER");
  const healthPct = projects.length > 0 ? Math.round((green / projects.length) * 100) : 0;

  const atRiskSorted = useMemo(() => {
    const order: Record<string, number> = { CRITICAL: 0, RED: 1, AMBER: 2 };
    return [...atRisk].sort((a, b) =>
      (order[a.current_rag ?? ""] ?? 3) - (order[b.current_rag ?? ""] ?? 3)
    );
  }, [atRisk]);

  const basePath =
    user?.role_code === "CEO" ? "/ceo"
    : user?.role_code === "DELIVERY_EXCELLENCE" ? "/delivery-excellence"
    : "/platform";

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14 }}>
        {[1,2,3,4,5].map(i => <div key={i} style={{ borderRadius: 16, height: 88, background: "var(--border)" }} className="animate-pulse" />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ borderRadius: 16, height: 240, background: "var(--border)" }} className="animate-pulse" />
        <div style={{ borderRadius: 16, height: 240, background: "var(--border)" }} className="animate-pulse" />
      </div>
    </div>
  );

  if (error) return (
    <div style={{ borderRadius: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.30)", padding: "16px 20px" }}>
      <p style={{ color: "#ef4444", fontSize: 14, margin: 0 }}>{error}</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, fontFamily: "'Inter',system-ui,sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>{today}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 10, padding: "6px 14px" }}>
            {projects.length} projects total
          </span>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard label="Total Projects" value={projects.length} color="#6c63ff" trend="All" trendUp
          icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
        />
        <StatCard label="Green Health" value={green} color="#22c55e" trend={`${healthPct}%`} trendUp={healthPct >= 50} sub="On track"
          icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard label="Amber" value={amber} color="#f59e0b" sub="Monitor closely"
          icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>}
        />
        <StatCard label="Red / Critical" value={red} color={red > 0 ? "#ef4444" : "#94a3b8"} trend={red > 0 ? `${red} at risk` : undefined} trendUp={false} sub="Needs action"
          icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard label="No Score" value={noScore} color="#3b82f6" sub="Awaiting entry"
          icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>

        {/* Bar chart */}
        <div style={{ borderRadius: 20, background: "var(--surface)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow)", padding: "22px 24px" }}>
          <SectionHeader title="Project health by Business Unit" sub="Green / Amber / Red distribution" />
          <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
            {[["Green","#22c55e"],["Amber","#f59e0b"],["Red","#ef4444"]].map(([l,c]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
                <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{l}</span>
              </div>
            ))}
          </div>
          <BUHealthChart projects={projects} />
        </div>

        {/* Donut */}
        <div style={{ borderRadius: 20, background: "var(--surface)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow)", padding: "22px 24px" }}>
          <SectionHeader title="Portfolio RAG" sub="Overall health breakdown" />
          <RagDonut green={green} amber={amber} red={red} total={projects.length} />
          {/* Summary stats below donut */}
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "Projects on track", val: green, icon: "✓", color: "#22c55e" },
              { label: "Need attention", val: amber + red, icon: "!", color: red > 0 ? "#ef4444" : "#f59e0b" },
              { label: "Awaiting first entry", val: noScore, icon: "○", color: "var(--muted)" },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: row.color, fontWeight: 800 }}>{row.icon}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{row.label}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Projects table ── */}
      <div style={{ borderRadius: 20, background: "var(--surface)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
        <div style={{ padding: "22px 24px 0" }}>
          <SectionHeader
            title="All Projects"
            sub={`${projects.length} projects across all business units`}
          />
        </div>

        {/* Table header */}
        <div style={{
          display: "grid", gridTemplateColumns: "2fr 1.2fr 1.2fr 1fr 1fr 110px",
          padding: "10px 24px", borderBottom: "1.5px solid var(--border)",
          background: "rgba(108,99,255,0.04)",
        }}>
          {["Project", "Business Unit", "Account", "Status", "PM", "Health"].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {projects.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>No projects found.</p>
          </div>
        ) : projects.map((p, idx) => (
          <div key={p.id}
            onClick={() => navigate(`${basePath}/projects/${p.id}/summary`)}
            style={{
              display: "grid", gridTemplateColumns: "2fr 1.2fr 1.2fr 1fr 1fr 110px",
              padding: "13px 24px",
              borderBottom: idx < projects.length - 1 ? "1px solid var(--border)" : "none",
              cursor: "pointer", alignItems: "center",
              transition: "background 0.12s",
              borderLeft: `3px solid ${p.current_rag ? RAG_COLOR[p.current_rag] ?? "transparent" : "transparent"}`,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(108,99,255,0.04)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
          >
            <div>
              <p style={{ fontWeight: 700, color: "var(--primary)", margin: 0, fontSize: 13 }}>{p.project_name}</p>
              <p style={{ fontSize: 10, color: "var(--muted)", fontFamily: "monospace", margin: "2px 0 0" }}>{p.project_code}</p>
            </div>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{p.business_unit_name || "—"}</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{p.account_name || "—"}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: p.status === "ACTIVE" ? "#16a34a" : "var(--muted)" }}>
              {p.status.replace("_", " ")}
            </span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{p.project_manager_name || "—"}</span>
            <div><RagBadge rag={p.current_rag} /></div>
          </div>
        ))}
      </div>

      {/* ── At-risk panel ── */}
      {atRisk.length > 0 && (
        <div style={{ borderRadius: 20, background: "rgba(239,68,68,0.06)", border: "1.5px solid rgba(239,68,68,0.20)", padding: "22px 24px" }}>
          <SectionHeader title="⚠ At-Risk Projects" sub={`${atRisk.length} project${atRisk.length > 1 ? "s" : ""} need immediate attention`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(showAllAtRisk ? atRiskSorted : atRiskSorted.slice(0, 5)).map(p => (
              <div key={p.id}
                onClick={() => navigate(`${basePath}/projects/${p.id}/summary`)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  borderRadius: 12, background: "var(--surface)", border: "1.5px solid var(--border)",
                  padding: "12px 16px", cursor: "pointer", gap: 12,
                  transition: "box-shadow 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(108,99,255,0.12)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: "var(--text)", margin: 0, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.project_name}</p>
                  <p style={{ fontSize: 11, color: "var(--muted)", margin: "2px 0 0" }}>{p.account_name} · {p.business_unit_name}</p>
                </div>
                <RagBadge rag={p.current_rag} />
              </div>
            ))}

            {/* Expand / collapse */}
            {atRiskSorted.length > 5 && !showAllAtRisk && (
              <button
                onClick={() => setShowAllAtRisk(true)}
                style={{
                  width: "100%", marginTop: 4, padding: "10px 0",
                  borderRadius: 12, border: "1.5px dashed var(--border)",
                  background: "transparent", cursor: "pointer",
                  fontSize: 12, fontWeight: 700, color: "var(--primary)",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(108,99,255,0.06)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                + {atRiskSorted.length - 5} more project{atRiskSorted.length - 5 > 1 ? "s" : ""} — click to view all
              </button>
            )}
            {showAllAtRisk && atRiskSorted.length > 5 && (
              <button
                onClick={() => setShowAllAtRisk(false)}
                style={{
                  width: "100%", marginTop: 4, padding: "10px 0",
                  borderRadius: 12, border: "1.5px dashed var(--border)",
                  background: "transparent", cursor: "pointer",
                  fontSize: 12, fontWeight: 700, color: "var(--muted)",
                }}
              >
                Show less ↑
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
