/**
 * Read-only Project KPI Summary — for Platform Admin, CEO, Delivery Excellence.
 * Uses the same QPM summary data as the PM summary page, but read-only with a back link.
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import { getProject } from "../../services/projectService";
import { getKpiPlan, getKpiSummary } from "../../services/qpmService";
import type { Project } from "../../types/project";
import type { KpiSummary, KpiSummaryMetric } from "../../types/qpm";

const C = { primary:"#6c63ff", border:"#e8e6ff", shadow:"0 2px 16px rgba(108,99,255,0.10)", text:"#1a1a2e", muted:"#6b7280", card:"#ffffff" };

const RAG_CFG: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  GREEN: { dot:"#22c55e", text:"#15803d", bg:"#f0fdf4", border:"#bbf7d0" },
  AMBER: { dot:"#f59e0b", text:"#b45309", bg:"#fffbeb", border:"#fde68a" },
  RED:   { dot:"#ef4444", text:"#b91c1c", bg:"#fef2f2", border:"#fecaca" },
};

function RagPill({ rag }: { rag: string | null }) {
  if (!rag || !RAG_CFG[rag]) return <span style={{ fontSize:12, color: C.muted, background:"#f3f4f6", border:"1px solid #e5e7eb", borderRadius:20, padding:"2px 10px", fontWeight:600 }}>No data</span>;
  const r = RAG_CFG[rag];
  return <span style={{ display:"inline-flex", alignItems:"center", gap:6, background: r.bg, border:`1px solid ${r.border}`, borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:700, color: r.text }}>
    <span style={{ width:7, height:7, borderRadius:"50%", background: r.dot }} />{rag.charAt(0) + rag.slice(1).toLowerCase()}
  </span>;
}

function MetricRow({ m }: { m: KpiSummaryMetric }) {
  const fmt = (v: string | number | null) => { if (v == null) return "—"; const n = typeof v === "string" ? parseFloat(v) : v; return isNaN(n) ? "—" : n.toFixed(2); };
  return (
    <tr style={{ borderBottom:`1px solid ${C.border}` }}
      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = "#faf9ff"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}>
      <td style={{ padding:"10px 16px", maxWidth:220 }}>
        <p style={{ fontWeight:700, color: C.text, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontSize:13 }} title={m.metric_name}>{m.metric_name}</p>
        {m.metric_category && <p style={{ fontSize:11, color: C.muted, margin:"1px 0 0" }}>{m.metric_category}</p>}
      </td>
      <td style={{ padding:"10px 16px", textAlign:"right", fontWeight:700, color: C.text, fontSize:13 }}>{fmt(m.latest_value)}{m.uom ? ` ${m.uom}` : ""}</td>
      <td style={{ padding:"10px 16px", textAlign:"right", color: C.muted, fontSize:13 }}>{fmt(m.target)}</td>
      <td style={{ padding:"10px 16px", textAlign:"right", color: C.muted, fontSize:13 }}>{fmt(m.lsl)}</td>
      <td style={{ padding:"10px 16px", textAlign:"right", color: C.muted, fontSize:13 }}>{fmt(m.usl)}</td>
      <td style={{ padding:"10px 16px" }}><RagPill rag={m.rag_status} /></td>
      <td style={{ padding:"10px 16px", color: C.muted, fontSize:12 }}>
        {m.last_updated ? new Date(m.last_updated).toLocaleDateString("en-US", { day:"numeric", month:"short", year:"numeric" }) : "—"}
      </td>
    </tr>
  );
}

export function ProjectSummaryReadOnlyPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<KpiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("All");

  useEffect(() => {
    if (!projectId) return;
    Promise.all([getProject(projectId), getKpiPlan(projectId)])
      .then(([proj, plan]) => { setProject(proj); return getKpiSummary(plan.id); })
      .then(setSummary)
      .catch(() => toast.error("Failed to load project summary"))
      .finally(() => setLoading(false));
  }, [projectId]);

  const backPath = user?.role_code === "CEO" ? "/ceo" : user?.role_code === "DELIVERY_EXCELLENCE" ? "/delivery-excellence" : "/platform";

  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {[1,2,3].map(i => <div key={i} style={{ borderRadius:20, height: i===1 ? 80 : 200, background:"#e8e6ff" }} />)}
    </div>
  );

  const categories = [...new Set((summary?.metrics || []).map(m => m.metric_category).filter(Boolean))];
  const filtered = (summary?.metrics || []).filter(m => catFilter === "All" || m.metric_category === catFilter);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>

      {/* Header */}
      <div style={{ display:"flex", flexWrap:"wrap", alignItems:"flex-start", justifyContent:"space-between", gap:16 }}>
        <div>
          <button onClick={() => navigate(backPath)} style={{ fontSize:13, color: C.muted, background:"transparent", border:"none", cursor:"pointer", padding:0, display:"inline-flex", alignItems:"center", gap:4 }}>
            ← Portfolio Dashboard
          </button>
          <h1 style={{ fontSize:26, fontWeight:900, color: C.text, margin:"8px 0 0" }}>{project?.project_name}</h1>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:6 }}>
            {[project?.business_unit_name, project?.account_name, summary?.project_type, summary?.delivery_process_model].filter(Boolean).map((s, i) => (
              <span key={i} style={{ background:"#f5f3ff", border:`1px solid ${C.border}`, borderRadius:20, padding:"3px 12px", fontSize:12, color: C.muted }}>{s}</span>
            ))}
          </div>
        </div>
        {summary?.overall_rag && (
          <div style={{ background: C.card, borderRadius:16, border:`1.5px solid ${C.border}`, padding:"10px 18px", display:"flex", alignItems:"center", gap:10, boxShadow: C.shadow }}>
            <span style={{ fontSize:13, color: C.muted, fontWeight:600 }}>Overall health</span>
            <RagPill rag={summary.overall_rag} />
          </div>
        )}
      </div>

      {/* RAG summary tiles */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label:"Green",   count: summary.green_count,   color:"#22c55e" },
            { label:"Amber",   count: summary.amber_count,   color:"#f59e0b" },
            { label:"Red",     count: summary.red_count,     color:"#ef4444" },
            { label:"No data", count: summary.no_data_count, color:"#9ca3af" },
          ].map(s => (
            <div key={s.label} style={{ borderRadius:20, padding:"16px 20px", background: s.color, boxShadow:`0 4px 16px ${s.color}44` }}>
              <p style={{ fontSize:30, fontWeight:900, color:"#fff", margin:0 }}>{s.count}</p>
              <p style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.80)", margin:"4px 0 0", textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Category filter */}
      {categories.length > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:12, fontWeight:700, color: C.muted }}>Filter:</span>
          {["All", ...categories].map(cat => (
            <button key={cat} type="button" onClick={() => setCatFilter(cat as string)}
              style={{ borderRadius:20, padding:"5px 14px", fontSize:12, fontWeight:700, cursor:"pointer", border:`1.5px solid ${catFilter === cat ? C.primary : C.border}`, background: catFilter === cat ? C.primary : C.card, color: catFilter === cat ? "#fff" : C.muted, transition:"all 0.15s" }}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Metrics table */}
      {filtered.length === 0 ? (
        <div style={{ background: C.card, borderRadius:20, border:`2px dashed ${C.border}`, padding:"48px 24px", textAlign:"center" }}>
          <p style={{ color: C.muted, fontSize:14 }}>No metrics with measurements yet.</p>
        </div>
      ) : (
        <div style={{ background: C.card, borderRadius:20, boxShadow: C.shadow, overflow:"hidden" }}>
          <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, background:"#faf9ff" }}>
            <p style={{ fontSize:14, fontWeight:800, color: C.text, margin:0 }}>KPI Metrics</p>
            <p style={{ fontSize:12, color: C.muted, margin:"2px 0 0" }}>{filtered.length} metric{filtered.length !== 1 ? "s" : ""} — read-only view</p>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${C.border}`, background:"#faf9ff" }}>
                  {["Metric","Current Value","Target","LSL","USL","RAG Status","Last Updated"].map(h => (
                    <th key={h} style={{ padding:"9px 16px", textAlign: ["Current Value","Target","LSL","USL"].includes(h) ? "right" : "left", fontSize:11, fontWeight:700, color: C.muted, textTransform:"uppercase", letterSpacing:"0.05em", whiteSpace:"nowrap" }}>{h}</th>
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
