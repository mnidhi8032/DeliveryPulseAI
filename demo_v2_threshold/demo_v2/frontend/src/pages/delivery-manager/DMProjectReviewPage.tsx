/**
 * DM Project Review Page — light purple theme matching PM pages.
 */
import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { getProject } from "../../services/projectService";
import { getKpiPlan, getKpiSummary } from "../../services/qpmService";
import { listReviewsForProject, createDMReview, updateDMReview } from "../../services/dmReviewService";
import type { Project } from "../../types/project";
import type { KpiSummary } from "../../types/qpm";
import type { DMReview } from "../../services/dmReviewService";
import { RAG_STYLE as _RAG_STYLE } from "../../types/qpm";

const C = { bg:"#f0f2ff", card:"#ffffff", primary:"#6c63ff", border:"#e8e6ff", shadow:"0 2px 16px rgba(108,99,255,0.10)", text:"#1a1a2e", muted:"#6b7280" };

const RAG_CFG: Record<string, { dot: string; text: string; pill: string; bg: string }> = {
  GREEN: { dot:"#22c55e", text:"#15803d", pill:"#f0fdf4", bg:"#bbf7d0" },
  AMBER: { dot:"#f59e0b", text:"#b45309", pill:"#fffbeb", bg:"#fde68a" },
  RED:   { dot:"#ef4444", text:"#b91c1c", pill:"#fef2f2", bg:"#fecaca" },
};

function RagPill({ rag }: { rag: string | null }) {
  if (!rag || !RAG_CFG[rag]) return <span style={{ color: C.muted, fontSize:13 }}>—</span>;
  const r = RAG_CFG[rag];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, background: r.pill, border:`1px solid ${r.bg}`, borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:700, color: r.text }}>
      <span style={{ width:7, height:7, borderRadius:"50%", background: r.dot }} />
      {rag.charAt(0) + rag.slice(1).toLowerCase()}
    </span>
  );
}

function RagDot({ rag }: { rag: string | null }) {
  if (!rag || !RAG_CFG[rag]) return <span style={{ color: C.muted, fontSize:13 }}>—</span>;
  const r = RAG_CFG[rag];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
      <span style={{ width:8, height:8, borderRadius:"50%", background: r.dot, flexShrink:0 }} />
      <span style={{ fontSize:13, fontWeight:600, color: r.text }}>{rag.charAt(0) + rag.slice(1).toLowerCase()}</span>
    </span>
  );
}

function TrendLabel({ trend }: { trend: string | null }) {
  if (!trend) return <span style={{ color: C.muted }}>—</span>;
  const t = trend.toLowerCase();
  if (t.includes("up") || t.includes("improv") || t.includes("increas"))
    return <span style={{ color:"#15803d", fontSize:13, fontWeight:600 }}>↑ Improving</span>;
  if (t.includes("down") || t.includes("declin") || t.includes("decreas"))
    return <span style={{ color:"#b91c1c", fontSize:13, fontWeight:600 }}>↓ Declining</span>;
  return <span style={{ color: C.muted, fontSize:13 }}>→ Stable</span>;
}

function fmt(val: string | number | null): string {
  if (val == null) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? "—" : n.toFixed(2);
}

export function DMProjectReviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const toast = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<KpiSummary | null>(null);
  const [planId, setPlanId] = useState<string>("");
  const [pastReviews, setPastReviews] = useState<DMReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodLabel, setPeriodLabel] = useState("");
  const [dmComments, setDmComments] = useState("");
  const [actionItems, setActionItems] = useState<string[]>([""]);
  const [editReviewId, setEditReviewId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      const [proj, plan, reviews] = await Promise.all([getProject(projectId), getKpiPlan(projectId), listReviewsForProject(projectId)]);
      setProject(proj); setPlanId(plan.id);
      const s = await getKpiSummary(plan.id);
      setSummary(s); setPastReviews(reviews);
      setExpandedCats(new Set(s.metrics.map(m => m.metric_category || "Uncategorized")));
      const today = new Date();
      const M = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      setPeriodLabel(`${M[today.getMonth()]} ${today.getFullYear()}`);
    } catch { toast.error("Failed to load project data"); }
    finally { setLoading(false); }
  }, [projectId, toast]);

  useEffect(() => { load(); }, [load]);

  const byCategory: Record<string, NonNullable<typeof summary>["metrics"]> = {};
  if (summary) {
    for (const m of summary.metrics) {
      const cat = m.metric_category || "Uncategorized";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(m);
    }
  }

  const addAI = () => setActionItems(p => [...p, ""]);
  const updAI = (i: number, v: string) => setActionItems(p => p.map((x, j) => j === i ? v : x));
  const remAI = (i: number) => setActionItems(p => p.filter((_, j) => j !== i));

  const loadForEdit = (r: DMReview) => {
    setEditReviewId(r.id); setPeriodLabel(r.period_label); setDmComments(r.dm_comments || "");
    setActionItems(r.action_items.length > 0 ? r.action_items : [""]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditReviewId(null); setDmComments(""); setActionItems([""]);
    const today = new Date();
    const M = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    setPeriodLabel(`${M[today.getMonth()]} ${today.getFullYear()}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodLabel.trim()) { toast.error("Period label is required"); return; }
    if (!dmComments.trim()) { toast.error("Please add your commentary"); return; }
    const items = actionItems.map(a => a.trim()).filter(Boolean);
    setSaving(true);
    try {
      if (editReviewId) {
        const u = await updateDMReview(editReviewId, { dm_comments: dmComments.trim(), action_items: items });
        setPastReviews(p => p.map(r => r.id === editReviewId ? u : r));
        toast.success("Review updated");
      } else {
        const c = await createDMReview({ project_id: projectId!, kpi_plan_id: planId, period_label: periodLabel.trim(), dm_comments: dmComments.trim(), action_items: items });
        setPastReviews(p => [c, ...p]);
        toast.success("Review submitted");
      }
      resetForm();
    } catch (err: any) { toast.error(err.response?.data?.detail || "Failed to save review"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {[1,2,3].map(i => <div key={i} style={{ borderRadius:20, height: i === 1 ? 60 : 120, background:"#e8e6ff" }} />)}
    </div>
  );

  const inputStyle: React.CSSProperties = {
    borderRadius:12, border:`1.5px solid ${C.border}`, padding:"10px 14px",
    fontSize:14, color: C.text, outline:"none", width:"100%", boxSizing:"border-box",
    background:"#faf9ff", fontFamily:"inherit",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>

      {/* Header */}
      <div style={{ display:"flex", flexWrap:"wrap", alignItems:"flex-start", justifyContent:"space-between", gap:16 }}>
        <div>
          <Link to="/delivery-manager" style={{ fontSize:13, color: C.muted, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:4 }}>
            ← Dashboard
          </Link>
          <h1 style={{ fontSize:26, fontWeight:900, color: C.text, margin:"8px 0 0" }}>{project?.project_name}</h1>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:6 }}>
            {[project?.business_unit_name, project?.account_name, `PM: ${project?.project_manager_name || "—"}`].map((s, i) => (
              <span key={i} style={{ background:"#f5f3ff", border:`1px solid ${C.border}`, borderRadius:20, padding:"3px 12px", fontSize:12, color: C.muted }}>
                {s}
              </span>
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

      {/* RAG counts */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label:"Green",   count: summary.green_count,   color:"#22c55e" },
            { label:"Amber",   count: summary.amber_count,   color:"#f59e0b" },
            { label:"Red",     count: summary.red_count,     color:"#ef4444" },
            { label:"No data", count: summary.no_data_count, color:"#9ca3af" },
          ].map(s => (
            <div key={s.label} style={{ borderRadius:20, padding:"18px 20px", background: s.color, boxShadow:`0 4px 16px ${s.color}44` }}>
              <p style={{ fontSize:32, fontWeight:900, color:"#fff", margin:0 }}>{s.count}</p>
              <p style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.80)", margin:"5px 0 0", textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* KPI metrics by category */}
      {summary && summary.metrics.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <h2 style={{ fontSize:16, fontWeight:800, color: C.text, margin:0 }}>KPI Summary</h2>
          {Object.entries(byCategory).map(([cat, metrics]) => {
            const isOpen = expandedCats.has(cat);
            const catRags = metrics.map(m => m.rag_status).filter(Boolean);
            const catRag = catRags.includes("RED") ? "RED" : catRags.includes("AMBER") ? "AMBER" : catRags.length > 0 ? "GREEN" : null;
            const dotColor = catRag ? RAG_CFG[catRag]?.dot : "#d1d5db";
            return (
              <div key={cat} style={{ background: C.card, borderRadius:16, boxShadow: C.shadow, overflow:"hidden" }}>
                <button type="button" onClick={() => setExpandedCats(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; })}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"14px 20px", background:"transparent", border:"none", cursor:"pointer", textAlign:"left" }}
                >
                  <span style={{ width:10, height:10, borderRadius:"50%", background: dotColor, flexShrink:0 }} />
                  <span style={{ flex:1, fontSize:14, fontWeight:700, color: C.text }}>{cat}</span>
                  <span style={{ fontSize:11, fontWeight:600, color: C.muted, background:"#f5f3ff", borderRadius:20, padding:"2px 10px" }}>
                    {metrics.length} metric{metrics.length !== 1 ? "s" : ""}
                  </span>
                  <svg style={{ width:16, height:16, color: C.muted, transform: isOpen ? "rotate(180deg)" : "none", transition:"transform 0.2s" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div style={{ borderTop:`1px solid ${C.border}`, overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                      <thead>
                        <tr style={{ borderBottom:`1px solid ${C.border}`, background:"#faf9ff" }}>
                          {["Metric","Value","Target","RAG","Trend","Updated"].map(h => (
                            <th key={h} style={{ padding:"8px 16px", textAlign: h === "Value" || h === "Target" ? "right" : "left", fontSize:11, fontWeight:700, color: C.muted, textTransform:"uppercase", letterSpacing:"0.05em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.map(m => (
                          <tr key={m.plan_metric_id} style={{ borderBottom:`1px solid ${C.border}` }}>
                            <td style={{ padding:"12px 16px", maxWidth:220 }}>
                              <p style={{ fontWeight:700, color: C.text, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={m.metric_name}>{m.metric_name}</p>
                              {m.uom && <p style={{ fontSize:11, color: C.muted, margin:"2px 0 0" }}>{m.uom}</p>}
                            </td>
                            <td style={{ padding:"12px 16px", textAlign:"right", fontWeight:700, color: C.text }}>{fmt(m.latest_value)}</td>
                            <td style={{ padding:"12px 16px", textAlign:"right", color: C.muted }}>{fmt(m.target)}</td>
                            <td style={{ padding:"12px 16px" }}><RagDot rag={m.rag_status} /></td>
                            <td style={{ padding:"12px 16px" }}><TrendLabel trend={m.trend} /></td>
                            <td style={{ padding:"12px 16px", color: C.muted }}>
                              {m.last_updated ? new Date(m.last_updated).toLocaleDateString("en-US", { day:"numeric", month:"short", year:"numeric" }) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {summary && summary.metrics.length === 0 && (
        <div style={{ background: C.card, borderRadius:20, border:`2px dashed ${C.border}`, padding:"48px 24px", textAlign:"center", boxShadow: C.shadow }}>
          <p style={{ color: C.muted, fontSize:14 }}>No KPI measurements recorded yet for this project.</p>
        </div>
      )}

      {/* Review form */}
      <div style={{ background: C.card, borderRadius:20, boxShadow: C.shadow, overflow:"hidden" }}>
        <div style={{ background:"#f5f3ff", borderBottom:`1px solid ${C.border}`, padding:"18px 24px", display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:38, height:38, borderRadius:12, background: C.primary + "20", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg style={{ width:18, height:18, color: C.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize:15, fontWeight:800, color: C.text, margin:0 }}>{editReviewId ? "Edit Review" : "Submit Your Review"}</p>
            <p style={{ fontSize:12, color: C.muted, margin:"2px 0 0" }}>Add commentary for this reporting period.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ padding:"24px", display:"flex", flexDirection:"column", gap:18 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <label style={{ fontSize:12, fontWeight:700, color: C.muted }}>Reporting period <span style={{ color:"#ef4444" }}>*</span></label>
            <input type="text" required value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} placeholder="e.g. July 2026" style={inputStyle} />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <label style={{ fontSize:12, fontWeight:700, color: C.muted }}>Commentary <span style={{ color:"#ef4444" }}>*</span></label>
            <textarea required rows={4} value={dmComments} onChange={e => setDmComments(e.target.value)}
              placeholder="Summarise the project's KPI performance this period…"
              style={{ ...inputStyle, resize:"none" }} />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <label style={{ fontSize:12, fontWeight:700, color: C.muted }}>Action items <span style={{ color: C.muted, fontWeight:400 }}>(optional)</span></label>
              <button type="button" onClick={addAI} style={{ fontSize:12, color: C.primary, fontWeight:700, background:"transparent", border:"none", cursor:"pointer" }}>+ Add item</button>
            </div>
            {actionItems.map((item, idx) => (
              <div key={idx} style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontSize:12, color: C.muted, width:20, textAlign:"right", flexShrink:0 }}>{idx + 1}.</span>
                <input type="text" value={item} onChange={e => updAI(idx, e.target.value)} placeholder={`Action item ${idx + 1}…`} style={{ ...inputStyle }} />
                {actionItems.length > 1 && (
                  <button type="button" onClick={() => remAI(idx)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"#d1d5db", flexShrink:0, padding:4 }}>
                    <svg style={{ width:16, height:16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12, paddingTop:8, borderTop:`1px solid ${C.border}` }}>
            <button type="submit" disabled={saving} style={{
              borderRadius:12, background: C.primary, color:"#fff", padding:"10px 24px", fontSize:14, fontWeight:800, border:"none", cursor:"pointer",
              boxShadow:`0 2px 10px ${C.primary}44`, opacity: saving ? 0.6 : 1,
            }}>
              {saving ? "Saving…" : editReviewId ? "Update review" : "Submit review"}
            </button>
            {editReviewId && (
              <button type="button" onClick={resetForm} style={{ borderRadius:12, border:`1.5px solid ${C.border}`, background:"transparent", color: C.muted, padding:"10px 20px", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Past reviews */}
      {pastReviews.length > 0 && (
        <div style={{ background: C.card, borderRadius:20, boxShadow: C.shadow, overflow:"hidden" }}>
          <div style={{ padding:"16px 24px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <p style={{ fontSize:15, fontWeight:800, color: C.text, margin:0 }}>Review history</p>
            <span style={{ fontSize:12, color: C.muted, background:"#f5f3ff", borderRadius:20, padding:"3px 12px" }}>
              {pastReviews.length} review{pastReviews.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div>
            {pastReviews.map((r, ri) => (
              <div key={r.id} style={{ padding:"20px 24px", borderBottom: ri < pastReviews.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ display:"flex", flexWrap:"wrap", alignItems:"flex-start", justifyContent:"space-between", gap:10, marginBottom:12 }}>
                  <div>
                    <span style={{ background: C.primary + "18", color: C.primary, fontSize:12, fontWeight:700, borderRadius:20, padding:"3px 14px" }}>{r.period_label}</span>
                    <p style={{ fontSize:11, color: C.muted, margin:"6px 0 0" }}>{r.reviewed_by_name || "—"} · {new Date(r.reviewed_at).toLocaleString()}</p>
                  </div>
                  <button type="button" onClick={() => loadForEdit(r)} style={{ borderRadius:10, border:`1.5px solid ${C.border}`, background:"transparent", color: C.muted, padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                    Edit
                  </button>
                </div>
                {r.dm_comments && (
                  <p style={{ fontSize:14, color: C.text, borderLeft:`3px solid ${C.primary}44`, paddingLeft:14, margin:"0 0 10px", lineHeight:1.6 }}>{r.dm_comments}</p>
                )}
                {r.action_items.length > 0 && (
                  <ul style={{ margin:0, padding:0, listStyle:"none", display:"flex", flexDirection:"column", gap:6 }}>
                    {r.action_items.map((item, idx) => (
                      <li key={idx} style={{ display:"flex", alignItems:"flex-start", gap:8, fontSize:13, color: C.muted }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background: C.primary, flexShrink:0, marginTop:5 }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
