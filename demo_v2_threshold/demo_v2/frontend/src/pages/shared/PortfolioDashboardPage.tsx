/**
 * Portfolio Dashboard — Executive View (Platform Admin, CEO, Delivery Excellence)
 * Light purple theme matching PM dashboard. Click a project to see its KPI summary.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listProjects } from "../../services/projectService";
import { getKpiPlan } from "../../services/qpmService";
import { useAuth } from "../../contexts/AuthContext";
import type { Project } from "../../types/project";
import type { KpiPlan } from "../../types/qpm";
import { PROJECT_TYPES, PROJECT_CATEGORIES } from "../../types/qpm";

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

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{ borderRadius:20, padding:"20px 22px", background: color, boxShadow:`0 4px 20px ${color}55`, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-18, right:-18, width:72, height:72, borderRadius:"50%", background:"rgba(255,255,255,0.15)" }} />
      <p style={{ fontSize:36, fontWeight:900, color:"#fff", margin:0, lineHeight:1 }}>{value}</p>
      <p style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.80)", margin:"6px 0 0", textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</p>
    </div>
  );
}

// ── RAG dot + label ───────────────────────────────────────────────────────────
function RagLabel({ rag }: { rag: string | null }) {
  const cfg: Record<string, { dot: string; text: string; bg: string; border: string }> = {
    GREEN: { dot:"#22c55e", text:"#15803d", bg:"#f0fdf4", border:"#bbf7d0" },
    AMBER: { dot:"#f59e0b", text:"#b45309", bg:"#fffbeb", border:"#fde68a" },
    RED:   { dot:"#ef4444", text:"#b91c1c", bg:"#fef2f2", border:"#fecaca" },
  };
  if (!rag || !cfg[rag]) return (
    <span style={{ fontSize:12, color: C.muted, background:"#f3f4f6", border:"1px solid #e5e7eb", borderRadius:20, padding:"2px 10px", fontWeight:600 }}>No data</span>
  );
  const r = cfg[rag];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, background: r.bg, border:`1px solid ${r.border}`, borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:700, color: r.text }}>
      <span style={{ width:7, height:7, borderRadius:"50%", background: r.dot }} />
      {rag.charAt(0) + rag.slice(1).toLowerCase()}
    </span>
  );
}

// ── Select dropdown ───────────────────────────────────────────────────────────
function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:11, fontWeight:700, color: C.muted, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</label>
      <div style={{ position:"relative" }}>
        <select value={value} onChange={e => onChange(e.target.value)}
          style={{ width:"100%", appearance:"none", borderRadius:12, border:`1.5px solid ${C.border}`, padding:"9px 36px 9px 14px", fontSize:13, fontWeight:600, color: C.text, background: C.card, outline:"none", cursor:"pointer", fontFamily:"inherit" }}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color: C.muted }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </span>
      </div>
    </div>
  );
}

interface ProjectWithPlan extends Project { kpiPlan?: KpiPlan; }

export function PortfolioDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectWithPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [buFilter, setBuFilter]           = useState("All");
  const [accountFilter, setAccountFilter] = useState("All");
  const [typeFilter, setTypeFilter]       = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    listProjects().then(async (list) => {
      const withPlans = await Promise.all(list.map(async p => {
        try { return { ...p, kpiPlan: await getKpiPlan(p.id) }; }
        catch { return { ...p, kpiPlan: undefined }; }
      }));
      setProjects(withPlans.sort((a, b) => a.project_name.localeCompare(b.project_name)));
    }).catch(() => setError("Failed to load projects")).finally(() => setLoading(false));
  }, []);

  const businessUnits = useMemo(() => ["All", ...Array.from(new Set(projects.map(p => p.business_unit_name).filter(Boolean))).sort()], [projects]);
  const accounts = useMemo(() => {
    const src = buFilter === "All" ? projects : projects.filter(p => p.business_unit_name === buFilter);
    return ["All", ...Array.from(new Set(src.map(p => p.account_name).filter(Boolean))).sort()];
  }, [projects, buFilter]);
  const projectTypes = ["All", ...PROJECT_TYPES];
  const projectCategories = ["All", ...PROJECT_CATEGORIES];

  const handleBuChange = (v: string) => { setBuFilter(v); setAccountFilter("All"); };

  const filtered = useMemo(() => projects.filter(p => {
    const matchBu      = buFilter      === "All" || p.business_unit_name === buFilter;
    const matchAccount = accountFilter === "All" || p.account_name === accountFilter;
    const matchType    = typeFilter    === "All" || p.kpiPlan?.project_type === typeFilter;
    const matchCat     = categoryFilter=== "All" || p.kpiPlan?.project_category === categoryFilter;
    return matchBu && matchAccount && matchType && matchCat;
  }), [projects, buFilter, accountFilter, typeFilter, categoryFilter]);

  const green   = filtered.filter(p => p.current_rag === "GREEN").length;
  const amber   = filtered.filter(p => p.current_rag === "AMBER").length;
  const red     = filtered.filter(p => p.current_rag === "RED").length;

  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
        {[1,2,3,4].map(i => <div key={i} style={{ borderRadius:20, height:96, background:"#e8e6ff" }} />)}
      </div>
      <div style={{ borderRadius:20, height:72, background:"#e8e6ff" }} />
      {[1,2,3].map(i => <div key={i} style={{ borderRadius:16, height:64, background:"#f5f3ff" }} />)}
    </div>
  );

  if (error) return (
    <div style={{ borderRadius:16, background:"#fef2f2", border:"1px solid #fecaca", padding:"16px 20px" }}>
      <p style={{ color:"#b91c1c", fontSize:14, margin:0 }}>{error}</p>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>

      {/* Page title */}
      <div>
        <h1 style={{ fontSize:28, fontWeight:900, color: C.text, margin:0 }}>Portfolio Dashboard</h1>
        <p style={{ fontSize:14, color: C.muted, margin:"4px 0 0" }}>
          {filtered.length} of {projects.length} projects
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={filtered.length} color="#6c63ff" />
        <StatCard label="Green"          value={green}           color="#22c55e" />
        <StatCard label="Amber"          value={amber}           color="#f59e0b" />
        <StatCard label="Red"            value={red}             color="#ef4444" />
      </div>

      {/* Sticky filter bar */}
      <div style={{ position:"sticky", top:0, zIndex:10, background: C.card, borderRadius:20, boxShadow: C.shadow, padding:"18px 24px", border:`1px solid ${C.border}` }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FilterSelect label="Business Unit"   value={buFilter}       options={businessUnits}     onChange={handleBuChange} />
          <FilterSelect label="Account"          value={accountFilter}  options={accounts}          onChange={setAccountFilter} />
          <FilterSelect label="Project Type"    value={typeFilter}     options={projectTypes}      onChange={setTypeFilter} />
          <FilterSelect label="Project Category" value={categoryFilter} options={projectCategories} onChange={setCategoryFilter} />
        </div>
      </div>

      {/* Project list */}
      {filtered.length === 0 ? (
        <div style={{ background: C.card, borderRadius:20, border:`2px dashed ${C.border}`, padding:"48px 24px", textAlign:"center" }}>
          <p style={{ color: C.muted, fontSize:14 }}>No projects match your selected filters</p>
        </div>
      ) : (
        <div style={{ background: C.card, borderRadius:20, boxShadow: C.shadow, overflow:"hidden" }}>
          {/* Table header */}
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 100px", gap:0, padding:"10px 24px", borderBottom:`1px solid ${C.border}`, background:"#faf9ff" }}>
            {["Project","Business Unit","Account","Type","Category","Health"].map(h => (
              <span key={h} style={{ fontSize:11, fontWeight:700, color: C.muted, textTransform:"uppercase", letterSpacing:"0.06em" }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((p, idx) => (
            <div key={p.id}
              onClick={() => {
                // Navigate to read-only KPI summary — prefix depends on role
                const base =
                  user?.role_code === "CEO"                ? "/ceo"
                  : user?.role_code === "DELIVERY_EXCELLENCE" ? "/delivery-excellence"
                  : "/platform";
                navigate(`${base}/projects/${p.id}/summary`);
              }}
              style={{
                display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 100px", gap:0,
                padding:"14px 24px", borderBottom: idx < filtered.length - 1 ? `1px solid ${C.border}` : "none",
                cursor:"pointer", transition:"background 0.15s", alignItems:"center",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "#faf9ff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
            >
              {/* Project name */}
              <div>
                <p style={{ fontWeight:800, color: C.primary, margin:0, fontSize:14, textDecoration:"none" }}>{p.project_name}</p>
                <p style={{ fontSize:11, color: C.muted, fontFamily:"monospace", margin:"2px 0 0" }}>{p.project_code}</p>
              </div>
              <span style={{ fontSize:13, color: C.muted }}>{p.business_unit_name || "—"}</span>
              <span style={{ fontSize:13, color: C.muted }}>{p.account_name || "—"}</span>
              <span style={{ fontSize:13, color: C.muted }}>{p.kpiPlan?.project_type || "—"}</span>
              <span style={{ fontSize:13, color: C.muted }}>{p.kpiPlan?.project_category || "—"}</span>
              <div><RagLabel rag={p.current_rag} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
