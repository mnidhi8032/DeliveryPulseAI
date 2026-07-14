/**
 * PM Dashboard — Light purple theme matching reference design.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { listProjects } from "../../services/projectService";
import { RagBadge } from "../../components/RagBadge";
import type { Project } from "../../types/project";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:       "var(--bg)",
  card:     "var(--surface)",
  primary:  "#6c63ff",
  purple2:  "#7c73ff",
  text:     "var(--text)",
  muted:    "var(--muted)",
  border:   "var(--border)",
  shadow:   "0 2px 16px rgba(108,99,255,0.10)",
  shadowHov:"0 6px 28px rgba(108,99,255,0.18)",
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color, to }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; to?: string;
}) {
  const inner = (
    <div style={{
      borderRadius: 20, padding: "22px 22px 18px", background: color,
      boxShadow: `0 4px 20px ${color}55`,
      cursor: to ? "pointer" : "default", position: "relative", overflow: "hidden",
      transition: "transform 0.2s, box-shadow 0.2s",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; }}
    >
      <div style={{ position:"absolute", top:-18, right:-18, width:72, height:72, borderRadius:"50%", background:"rgba(255,255,255,0.15)" }} />
      <div style={{ position:"absolute", top:16, right:16, width:38, height:38, borderRadius:12, background:"rgba(255,255,255,0.22)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        {icon}
      </div>
      <p style={{ fontSize:38, fontWeight:900, color:"#fff", margin:0, lineHeight:1 }}>{value}</p>
      <p style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.80)", margin:"7px 0 0", textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</p>
      {sub && <p style={{ fontSize:11, color:"rgba(255,255,255,0.60)", margin:"3px 0 0" }}>{sub}</p>}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration:"none" }}>{inner}</Link> : inner;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
function DashboardStats({ projects }: { projects: Project[] }) {
  const total   = projects.length;
  const green   = projects.filter(p => p.current_rag === "GREEN").length;
  const amber   = projects.filter(p => p.current_rag === "AMBER").length;
  const red     = projects.filter(p => p.current_rag === "RED" || p.current_rag === "CRITICAL").length;
  const noScore = projects.filter(p => !p.current_rag).length;
  const healthPct = total > 0 ? Math.round((green / total) * 100) : 0;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatCard label="Total Projects" value={total} sub="Assigned to you" to="/pm/projects" color="#6c63ff"
        icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
      />
      <StatCard label="Green Health" value={`${healthPct}%`} sub={`${green} of ${total} healthy`} color="#22c55e"
        icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      />
      <StatCard label="Needs Attention" value={amber + red} sub={`${amber} amber · ${red} red`} color={amber + red > 0 ? "#f97316" : "#94a3b8"}
        icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>}
      />
      <StatCard label="Awaiting Score" value={noScore} sub="No metrics yet" to="/pm/projects" color="#3b82f6"
        icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
      />
    </div>
  );
}

// ─── Quick Action ─────────────────────────────────────────────────────────────
function QuickAction({ to, icon, label, desc, dot }: {
  to: string; icon: React.ReactNode; label: string; desc: string; dot: string;
}) {
  return (
    <Link to={to} style={{ textDecoration:"none" }}>
      <div style={{
        display:"flex", alignItems:"center", gap:14, borderRadius:16,
        border:`1.5px solid ${C.border}`, background:C.card, padding:"14px 16px",
        boxShadow: C.shadow, transition:"box-shadow 0.15s, transform 0.15s", cursor:"pointer",
      }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = C.shadowHov; el.style.transform = "translateY(-2px)"; }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = C.shadow; el.style.transform = ""; }}
      >
        <div style={{ width:40, height:40, borderRadius:12, background:`${dot}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          {icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:13, fontWeight:700, color:C.text, margin:0 }}>{label}</p>
          <p style={{ fontSize:11, color:C.muted, margin:"2px 0 0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{desc}</p>
        </div>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={C.primary} strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate();
  const rag = project.current_rag;
  const ragColor = rag === "GREEN" ? "#22c55e" : rag === "AMBER" ? "#f59e0b" : rag === "RED" ? "#ef4444" : "#94a3b8";

  const statusBg: Record<string, string> = {
    ACTIVE: "rgba(34,197,94,0.10)", ON_HOLD: "rgba(245,158,11,0.10)", COMPLETED: "rgba(59,130,246,0.10)", CANCELLED: "#f8fafc",
  };
  const statusColor: Record<string, string> = {
    ACTIVE: "#16a34a", ON_HOLD: "#d97706", COMPLETED: "#2563eb", CANCELLED: "#94a3b8",
  };
  const statusLabel: Record<string, string> = {
    ACTIVE: "Active", ON_HOLD: "On Hold", COMPLETED: "Completed", CANCELLED: "Cancelled",
  };
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short" }) : null;

  return (
    <div onClick={() => navigate(`/pm/projects/${project.id}/qpm/summary`)}
      style={{
        borderRadius:20, background:C.card, cursor:"pointer", overflow:"hidden",
        boxShadow: C.shadow, border:`1.5px solid ${C.border}`,
        borderTop:`3px solid ${ragColor}`,
        transition:"transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "translateY(-4px)"; el.style.boxShadow = C.shadowHov; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ""; el.style.boxShadow = C.shadow; }}
    >
      <div style={{ padding:"18px 20px 16px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, marginBottom:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
              <span style={{ fontSize:9, fontWeight:800, color:C.primary, fontFamily:"monospace", textTransform:"uppercase", letterSpacing:"0.12em" }}>{project.project_code}</span>
              <span style={{ fontSize:9, fontWeight:700, borderRadius:999, padding:"2px 7px",
                color: statusColor[project.status] ?? "var(--muted)",
                background: statusBg[project.status] ?? "#f8fafc",
              }}>{statusLabel[project.status] ?? project.status}</span>
            </div>
            <h3 style={{ fontSize:14, fontWeight:700, color:C.text, margin:0, lineHeight:1.35,
              overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as "vertical" }}>
              {project.project_name}
            </h3>
          </div>
          <div style={{ flexShrink:0 }}>
            {rag ? <RagBadge rag={rag} showDot /> : (
              <span style={{ fontSize:10, color:C.muted, background:"var(--border)", borderRadius:999, padding:"3px 10px", fontWeight:600 }}>No score</span>
            )}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke={C.muted} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" /></svg>
            <span style={{ fontSize:11, color:C.text, fontWeight:500 }}>{project.account_name}</span>
            <span style={{ color:"#d1d5db" }}>·</span>
            <span style={{ fontSize:11, color:C.muted }}>{project.business_unit_name}</span>
          </div>
          {(project.start_date || project.target_end_date) && (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke={C.muted} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span style={{ fontSize:11, color:C.muted }}>{formatDate(project.start_date)} {project.target_end_date && `→ ${formatDate(project.target_end_date)}`}</span>
            </div>
          )}
        </div>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:10, borderTop:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:ragColor, display:"inline-block" }} />
            <span style={{ fontSize:10, fontWeight:600, color:C.muted }}>{rag ?? "Pending"}</span>
          </div>
          <span style={{ fontSize:10, fontWeight:700, color:C.primary }}>View KPI →</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export function DashboardShellPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  useEffect(() => {
    listProjects()
      .then(data => setProjects(data.sort((a, b) => a.project_name.localeCompare(b.project_name))))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const firstName = user?.full_name?.split(" ")[0] ?? "there";
  const today = new Date().toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  const atRisk = projects.filter(p => p.current_rag === "AMBER" || p.current_rag === "RED" || p.current_rag === "CRITICAL");

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:28, fontFamily:"'Inter',system-ui,sans-serif" }}>

      {/* ── Hero ── */}
      <div style={{
        borderRadius:24, background:`linear-gradient(135deg, ${C.primary} 0%, #9333ea 100%)`,
        padding:"28px 32px", boxShadow:"0 8px 32px rgba(108,99,255,0.30)",
        display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"space-between", gap:16,
      }}>
        <div>
          <p style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.70)", textTransform:"uppercase", letterSpacing:"0.14em", margin:"0 0 8px" }}>
            PM Workspace
          </p>
          <h1 style={{ fontSize:28, fontWeight:900, color:"#fff", margin:0, letterSpacing:"-0.02em" }}>
            Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}, {firstName} 👋
          </h1>
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.65)", marginTop:6 }}>{today}</p>
          {atRisk.length > 0 && (
            <div style={{ marginTop:12, display:"inline-flex", alignItems:"center", gap:7,
              background:"rgba(255,255,255,0.15)", borderRadius:10, padding:"6px 12px" }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#fbbf24", display:"inline-block" }} />
              <span style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{atRisk.length} project{atRisk.length > 1 ? "s" : ""} need attention</span>
            </div>
          )}
        </div>
        <Link to="/pm/projects?create=1" style={{ textDecoration:"none" }}>
          <div style={{
            display:"inline-flex", alignItems:"center", gap:8, borderRadius:14,
            background:"#fff", color:C.primary, fontSize:13, fontWeight:800,
            padding:"11px 24px", boxShadow:"0 4px 16px rgba(0,0,0,0.15)",
          }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={C.primary} strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            New Project
          </div>
        </Link>
      </div>

      {/* ── Stats ── */}
      {!loading && !error && <DashboardStats projects={projects} />}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} style={{ borderRadius:20, height:120, background:"#fff", border:`1.5px solid ${C.border}`, boxShadow:C.shadow }} className="animate-pulse" />)}
        </div>
      )}

      {/* ── Quick Actions + Portfolio Health ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <h2 style={{ fontSize:14, fontWeight:800, color:C.text, margin:0 }}>Quick Actions</h2>
            <div style={{ flex:1, height:1.5, background:C.border }} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <QuickAction to="/pm/projects" label="My Projects" desc="View and manage all projects" dot="#6c63ff"
              icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#6c63ff" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
            />
            <QuickAction to="/pm/summary" label="KPI Summary" desc="Track metric trends and health" dot="#22c55e"
              icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            />
            <QuickAction to="/pm/projects?create=1" label="Create Project" desc="Start with engagement model" dot="#9333ea"
              icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#9333ea" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
            />
            {projects.length > 0 && (
              <QuickAction to={`/pm/projects/${projects[0].id}/qpm/entry`} label="Enter KPI Data" desc="Log metrics for latest project" dot="#f97316"
                icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#f97316" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
              />
            )}
          </div>
        </div>

        {!loading && !error && projects.length > 0 && (
          <div style={{ borderRadius:20, background:C.card, border:`1.5px solid ${C.border}`, padding:20, boxShadow:C.shadow }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
              <h2 style={{ fontSize:14, fontWeight:800, color:C.text, margin:0 }}>Portfolio Health</h2>
              <div style={{ flex:1, height:1.5, background:C.border }} />
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {(["GREEN","AMBER","RED"] as const).map(rag => {
                const cnt = projects.filter(p => p.current_rag === rag || (rag==="RED" && p.current_rag==="CRITICAL")).length;
                const pct = projects.length > 0 ? Math.round((cnt/projects.length)*100) : 0;
                const cfg = { GREEN:{label:"Green",bar:"#22c55e",text:"#16a34a"}, AMBER:{label:"Amber",bar:"#f59e0b",text:"#d97706"}, RED:{label:"Red / Critical",bar:"#ef4444",text:"#dc2626"} }[rag];
                return (
                  <div key={rag}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}>
                      <span style={{ fontWeight:700, color:cfg.text }}>{cfg.label}</span>
                      <span style={{ fontWeight:700, color:C.text }}>{cnt} <span style={{ color:C.muted, fontWeight:400 }}>({pct}%)</span></span>
                    </div>
                    <div style={{ width:"100%", height:7, background:"var(--border)", borderRadius:999, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:cfg.bar, borderRadius:999, transition:"width 0.7s" }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ paddingTop:12, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", fontSize:12 }}>
                <span style={{ fontWeight:700, color:C.muted }}>No Score</span>
                <span style={{ fontWeight:700, color:C.text }}>{projects.filter(p => !p.current_rag).length}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Your Projects ── */}
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <h2 style={{ fontSize:16, fontWeight:800, color:C.text, margin:0 }}>Your Projects</h2>
            {!loading && (
              <span style={{ width:24, height:24, borderRadius:"50%", background:`${C.primary}18`, color:C.primary, fontSize:11, fontWeight:800, display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
                {projects.length}
              </span>
            )}
          </div>
          {!loading && projects.length > 0 && (
            <Link to="/pm/projects" style={{ fontSize:12, fontWeight:700, color:C.primary, textDecoration:"none" }}>View all →</Link>
          )}
        </div>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1,2,3].map(i => (
              <div key={i} style={{ borderRadius:20, border:`1.5px solid ${C.border}`, background:C.card, padding:20 }} className="animate-pulse">
                <div style={{ height:10, width:"40%", background:"var(--border)", borderRadius:6, marginBottom:10 }} />
                <div style={{ height:14, width:"70%", background:"var(--border)", borderRadius:6, marginBottom:16 }} />
                <div style={{ height:10, width:"100%", background:"var(--bg)", borderRadius:6, marginBottom:8 }} />
                <div style={{ height:10, width:"60%", background:"var(--bg)", borderRadius:6 }} />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div style={{ borderRadius:16, border:"1px solid #fecaca", background:"var(--surface)", padding:"40px 24px", textAlign:"center" }}>
            <p style={{ fontSize:14, fontWeight:700, color:"#dc2626", margin:0 }}>Could not connect to the server</p>
            <p style={{ fontSize:12, color:C.muted, marginTop:6 }}>Make sure the backend is running, then refresh.</p>
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div style={{ borderRadius:20, border:`2px dashed ${C.border}`, background:C.card, padding:"60px 24px", textAlign:"center" }}>
            <div style={{ margin:"0 auto 16px", width:56, height:56, borderRadius:16, background:`${C.primary}15`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke={C.primary} strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <p style={{ fontSize:15, fontWeight:700, color:C.text, margin:0 }}>No projects yet</p>
            <p style={{ fontSize:12, color:C.muted, marginTop:6, marginBottom:20 }}>Create your first project to get started.</p>
            <Link to="/pm/projects?create=1" style={{ textDecoration:"none" }}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:8, borderRadius:12, background:C.primary, color:"#fff", fontSize:13, fontWeight:700, padding:"11px 22px", boxShadow:`0 4px 16px ${C.primary}50` }}>
                + Create First Project
              </span>
            </Link>
          </div>
        )}

        {!loading && !error && projects.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
