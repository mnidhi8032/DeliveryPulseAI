/**
 * Delivery Manager — Action Items — light purple theme matching PM pages.
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { listProjects } from "../../services/projectService";
import { listActionItems, createActionItem } from "../../services/brdService";
import type { Project } from "../../types/project";
import type { ActionItem } from "../../types/brd";
import { useToast } from "../../contexts/ToastContext";

const C = { bg:"var(--bg)", card:"var(--surface)", primary:"#6c63ff", border:"var(--border)", shadow:"0 2px 16px rgba(108,99,255,0.10)", text:"var(--text)", muted:"var(--muted)" };

const STATUS_CFG: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  OPEN:        { dot:"#f59e0b", bg:"#fffbeb", text:"#b45309", label:"Open"        },
  IN_PROGRESS: { dot:"#3b82f6", bg:"#eff6ff", text:"#1d4ed8", label:"In Progress" },
  CLOSED:      { dot:"#22c55e", bg:"#f0fdf4", text:"#15803d", label:"Closed"      },
  OVERDUE:     { dot:"#ef4444", bg:"#fef2f2", text:"#b91c1c", label:"Overdue"     },
};

export function DMActionItemsPage() {
  const [searchParams] = useSearchParams();
  const preselectedProjectId = searchParams.get("projectId") ?? "";
  const toast = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(preselectedProjectId);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ root_cause:"", corrective_action:"", owner_name:"", target_closure_date:"", metric_name:"" });

  const loadAll = async (projectList: Project[]) => {
    try {
      const allItems = await Promise.all(
        projectList.map(p => listActionItems(p.id, false).catch(() => [] as ActionItem[]))
      );
      setActionItems(allItems.flat().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch { setActionItems([]); }
  };

  const load = async (projectId: string) => {
    try { setActionItems(await listActionItems(projectId)); } catch { setActionItems([]); }
  };

  useEffect(() => {
    listProjects().then(async projs => {
      setProjects(projs);
      const pid = preselectedProjectId || "";
      setSelectedProject(pid);
      if (pid) {
        await load(pid);
      } else {
        await loadAll(projs);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleProjectChange = async (pid: string) => {
    setSelectedProject(pid);
    setLoading(true);
    if (pid) {
      await load(pid);
    } else {
      await loadAll(projects);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!selectedProject || !form.root_cause.trim() || !form.corrective_action.trim()) return;
    setSaving(true);
    try {
      await createActionItem({ project_id: selectedProject, root_cause: form.root_cause, corrective_action: form.corrective_action, owner_name: form.owner_name || undefined, target_closure_date: form.target_closure_date || undefined, metric_name: form.metric_name || undefined });
      toast.success("Action item created.");
      setForm({ root_cause:"", corrective_action:"", owner_name:"", target_closure_date:"", metric_name:"" });
      setShowForm(false);
      await load(selectedProject);
    } catch { toast.error("Failed to create action item."); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {[1,2,3].map(i => <div key={i} style={{ borderRadius:20, height:80, background:"var(--border)" }} />)}
    </div>
  );

  const openCount = actionItems.filter(a => a.action_status === "OPEN").length;
  const inProgressCount = actionItems.filter(a => a.action_status === "IN_PROGRESS").length;

  const inputStyle: React.CSSProperties = {
    borderRadius:12, border:`1.5px solid ${C.border}`, padding:"10px 14px",
    fontSize:14, color: C.text, outline:"none", width:"100%", boxSizing:"border-box",
    background:"#faf9ff", fontFamily:"inherit",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>

      {/* Header */}
      <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"space-between", gap:12 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:900, color: C.text, margin:0 }}>Action Items</h1>
          <p style={{ fontSize:14, color: C.muted, margin:"4px 0 0" }}>Track corrective actions for delivery issues.</p>
        </div>
        <button type="button" onClick={() => setShowForm(v => !v)} style={{
          borderRadius:12, padding:"10px 22px", fontSize:14, fontWeight:800, cursor:"pointer", transition:"all 0.15s",
          background: showForm ? "transparent" : C.primary,
          color: showForm ? C.muted : "var(--surface)",
          border: showForm ? `1.5px solid ${C.border}` : "none",
          boxShadow: showForm ? "none" : `0 2px 10px ${C.primary}44`,
        } as React.CSSProperties}>
          {showForm ? "Cancel" : "+ New action item"}
        </button>
      </div>

      {/* Project selector */}
      <div style={{ background: C.card, borderRadius:16, boxShadow: C.shadow, padding:"16px 20px", display:"flex", alignItems:"center", gap:12 }}>
        <label style={{ fontSize:13, fontWeight:700, color: C.muted, flexShrink:0 }}>Project:</label>
        <select value={selectedProject} onChange={e => handleProjectChange(e.target.value)}
          style={{ flex:1, borderRadius:12, border:`1.5px solid ${C.border}`, padding:"8px 12px", fontSize:14, color: C.text, background:"#faf9ff", outline:"none", fontFamily:"inherit" }}>
          <option value="">All Projects — show all action items</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>)}
        </select>
      </div>

      {/* Stat tiles — show for specific project only */}
      {selectedProject && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label:"Total",       value: actionItems.length, color:"#6c63ff" },
            { label:"Open",        value: openCount,          color:"#f59e0b" },
            { label:"In Progress", value: inProgressCount,    color:"#3b82f6" },
          ].map(s => (
            <div key={s.label} style={{ borderRadius:20, padding:"18px 20px", background: s.color, boxShadow:`0 4px 16px ${s.color}44` }}>
              <p style={{ fontSize:32, fontWeight:900, color:"var(--surface)", margin:0 }}>{s.value}</p>
              <p style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.80)", margin:"5px 0 0", textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create form — only available when a specific project is selected */}
      {showForm && selectedProject && (
        <div style={{ background: C.card, borderRadius:20, boxShadow: C.shadow, padding:24, display:"flex", flexDirection:"column", gap:18 }}>
          <p style={{ fontSize:15, fontWeight:800, color: C.text, margin:0 }}>New Action Item</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label:"Metric name — leave blank for a project-level action", key:"metric_name", placeholder:"Only fill if this relates to a specific metric" },
              { label:"Owner name",               key:"owner_name",          placeholder:"E.g. John Smith" },
              { label:"Target closure date",      key:"target_closure_date", type:"date" },
            ].map(({ label, key, placeholder, type }) => (
              <div key={key} style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{ fontSize:12, fontWeight:700, color: C.muted }}>{label}</label>
                <input type={type ?? "text"} placeholder={placeholder}
                  value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={inputStyle} />
                {key === "metric_name" && !form.metric_name.trim() && (
                  <span style={{ fontSize:10, color:"#6366f1", fontWeight:600 }}>📋 Will be saved as a Project-Level action</span>
                )}
                {key === "metric_name" && form.metric_name.trim() && (
                  <span style={{ fontSize:10, color: C.muted, fontWeight:600 }}>📊 Will be saved as a Metric-Level action</span>
                )}
              </div>
            ))}
          </div>
          {[
            { label:"Root cause *",        key:"root_cause",        placeholder:"Describe the root cause…" },
            { label:"Corrective action *", key:"corrective_action", placeholder:"Describe the corrective action…" },
          ].map(({ label, key, placeholder }) => (
            <div key={key} style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={{ fontSize:12, fontWeight:700, color: C.muted }}>{label}</label>
              <textarea rows={3} placeholder={placeholder}
                value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                style={{ ...inputStyle, resize:"none" }} />
            </div>
          ))}
          <button type="button" disabled={saving || !form.root_cause.trim() || !form.corrective_action.trim()} onClick={handleCreate}
            style={{ borderRadius:12, background: C.primary, color:"var(--surface)", padding:"10px 24px", fontSize:14, fontWeight:800, border:"none", cursor:"pointer", boxShadow:`0 2px 10px ${C.primary}44`, opacity: (saving || !form.root_cause.trim() || !form.corrective_action.trim()) ? 0.5 : 1, alignSelf:"flex-start" }}>
            {saving ? "Saving…" : "Create action item"}
          </button>
        </div>
      )}

      {/* Action items list — always visible */}
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {actionItems.length === 0 ? (
            <div style={{ background: C.card, borderRadius:20, border:`2px dashed ${C.border}`, padding:"48px 24px", textAlign:"center", boxShadow: C.shadow }}>
              <p style={{ color: C.muted, fontSize:14 }}>{selectedProject ? "No action items for this project yet." : "No action items found across your projects."}</p>
            </div>
          ) : actionItems.map(item => {
            const sc = STATUS_CFG[item.action_status] ?? { dot:"#9ca3af", bg:"var(--surface)", text: C.muted, label: item.action_status };
            return (
              <div key={item.id} style={{ background: C.card, borderRadius:20, boxShadow: C.shadow, padding:"20px 24px" }}>
                <div style={{ display:"flex", flexWrap:"wrap", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    {item.metric_name && (
                      <span style={{ display:"inline-block", background:"#f5f3ff", border:`1px solid ${C.border}`, color: C.primary, fontSize:11, fontWeight:700, borderRadius:20, padding:"2px 12px", marginBottom:8 }}>
                        {item.metric_name}
                      </span>
                    )}
                    {/* Show project name when viewing "All Projects" */}
                    {!selectedProject && (
                      <span style={{ display:"inline-block", background:"rgba(108,99,255,0.08)", border:`1px solid rgba(108,99,255,0.2)`, color: C.primary, fontSize:10, fontWeight:700, borderRadius:20, padding:"2px 10px", marginBottom:8, marginLeft: item.metric_name ? 6 : 0 }}>
                        {projects.find(p => p.id === item.project_id)?.project_name ?? item.project_id.slice(0,8)}
                      </span>
                    )}
                    <p style={{ fontSize:14, fontWeight:700, color: C.text, margin:0 }}>Root cause: {item.root_cause}</p>
                    <p style={{ fontSize:14, color: C.muted, margin:"6px 0 0" }}>Action: {item.corrective_action}</p>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:16, marginTop:10, fontSize:12, color: C.muted }}>
                      {item.owner_name && <span>Owner: <strong style={{ color: C.text }}>{item.owner_name}</strong></span>}
                      {item.target_closure_date && <span>Due: <strong style={{ color: C.text }}>{item.target_closure_date}</strong></span>}
                    </div>
                  </div>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:6, background: sc.bg, border:`1px solid ${sc.dot}44`, borderRadius:20, padding:"4px 14px", fontSize:12, fontWeight:700, color: sc.text, flexShrink:0 }}>
                    <span style={{ width:6, height:6, borderRadius:"50%", background: sc.dot }} />
                    {sc.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
    </div>
  );
}
