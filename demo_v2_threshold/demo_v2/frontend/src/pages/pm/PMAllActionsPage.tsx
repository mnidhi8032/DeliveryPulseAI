/**
 * PM — All Action Items
 * Consolidated view of action items across all PM's projects.
 * Deep-linked from notification bell (ACTION_ITEM_CREATED).
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { listProjects } from "../../services/projectService";
import { listActionItems, updateActionItemStatus, deleteActionItem } from "../../services/brdService";
import type { Project } from "../../types/project";
import type { ActionItem } from "../../types/brd";

const C = {
  primary: "var(--primary)",
  bg:      "var(--bg)",
  card:    "var(--surface)",
  border:  "var(--border)",
  text:    "var(--text)",
  muted:   "var(--muted)",
  shadow:  "var(--shadow)",
};

const STATUSES = ["OPEN", "IN_PROGRESS", "CLOSED"] as const;

function StatusBadge({ s }: { s: string }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    OPEN:        { bg: "#fff1f2", color: "#dc2626", border: "#fca5a5" },
    IN_PROGRESS: { bg: "#fffbeb", color: "#d97706", border: "#fcd34d" },
    CLOSED:      { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
  };
  const st = styles[s] ?? { bg: "#f9fafb", color: "var(--muted)", border: "#e5e7eb" };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, borderRadius: 999,
      padding: "3px 9px", border: `1px solid ${st.border}`,
      background: st.bg, color: st.color,
    }}>
      {s.replace("_", " ")}
    </span>
  );
}

function RagDot({ r }: { r: string | null }) {
  if (!r) return null;
  const c = r === "RED" ? "#ef4444" : r === "AMBER" ? "#f59e0b" : "#22c55e";
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block", boxShadow: `0 0 6px ${c}80` }} />;
}

export function PMAllActionsPage() {
  const [searchParams] = useSearchParams();
  const highlightProjectId = searchParams.get("project");

  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "IN_PROGRESS" | "CLOSED">("ALL");
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const projs = await listProjects();
      setProjects(projs);
      // Load action items for all projects in parallel
      const results = await Promise.all(projs.map(p => listActionItems(p.id, false).catch(() => [])));
      const all = results.flat().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setItems(all);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // Auto-select project filter when deep-linked from notification
  useEffect(() => {
    if (highlightProjectId) setSelectedProject(highlightProjectId);
  }, [highlightProjectId]);

  const handleStatusChange = async (itemId: string, newStatus: string) => {
    setUpdatingId(itemId);
    try {
      await updateActionItemStatus(itemId, { action_status: newStatus });
      await loadAll();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Delete this action item?")) return;
    await deleteActionItem(itemId);
    await loadAll();
  };

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));

  const filtered = items.filter(i => {
    if (filter !== "ALL" && i.action_status !== filter) return false;
    if (selectedProject !== "ALL" && i.project_id !== selectedProject) return false;
    return true;
  });

  const today = new Date().toISOString().split("T")[0];

  const counts = {
    OPEN: items.filter(i => i.action_status === "OPEN").length,
    IN_PROGRESS: items.filter(i => i.action_status === "IN_PROGRESS").length,
    CLOSED: items.filter(i => i.action_status === "CLOSED").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, fontFamily: "'Inter',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.14em", margin: "0 0 6px" }}>
            Project Manager
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: C.text, margin: 0, letterSpacing: "-0.02em" }}>
            Action Items
          </h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            Corrective actions raised across all your projects
          </p>
        </div>
      </div>

      {/* Stat chips */}
      {!loading && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {([
            { label: "All",         key: "ALL",         val: items.length,        color: "var(--primary)", bg: "rgba(108,99,255,0.08)" },
            { label: "Open",        key: "OPEN",        val: counts.OPEN,         color: "#dc2626", bg: "rgba(239,68,68,0.08)"  },
            { label: "In Progress", key: "IN_PROGRESS", val: counts.IN_PROGRESS,  color: "#d97706", bg: "rgba(245,158,11,0.08)" },
            { label: "Closed",      key: "CLOSED",      val: counts.CLOSED,       color: "#16a34a", bg: "rgba(34,197,94,0.08)"  },
          ] as { label: string; key: string; val: number; color: string; bg: string }[]).map(s => (
            <button key={s.key} onClick={() => setFilter(s.key as typeof filter)} style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              borderRadius: 999, padding: "6px 16px", cursor: "pointer",
              background: filter === s.key ? s.color : s.bg,
              border: `1.5px solid ${s.color}${filter === s.key ? "" : "40"}`,
              transition: "background 0.15s",
            }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: filter === s.key ? "#fff" : s.color }}>{s.val}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: filter === s.key ? "rgba(255,255,255,0.85)" : s.color }}>{s.label}</span>
            </button>
          ))}

          {/* Project filter */}
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
            style={{
              marginLeft: "auto", appearance: "none", WebkitAppearance: "none",
              background: C.card, border: `1.5px solid ${C.border}`,
              borderRadius: 12, padding: "7px 36px 7px 14px",
              fontSize: 12, fontWeight: 600, color: C.text,
              cursor: "pointer", outline: "none",
              boxShadow: C.shadow,
            }}>
            <option value="ALL">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ borderRadius: 16, height: 80, background: C.card, border: `1.5px solid ${C.border}`, boxShadow: C.shadow }} className="animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{ borderRadius: 20, border: `2px dashed ${C.border}`, background: C.card, padding: "60px 24px", textAlign: "center", boxShadow: C.shadow }}>
          <div style={{ margin: "0 auto 16px", width: 56, height: 56, borderRadius: 16, background: `${C.primary}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke={C.primary} strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>No action items</p>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
            {filter !== "ALL" ? `No ${filter.toLowerCase().replace("_", " ")} action items.` : "No action items across your projects yet."}
          </p>
        </div>
      )}

      {/* Action items list */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(item => {
            const proj = projectMap[item.project_id];
            const isOverdue = item.target_closure_date && item.action_status !== "CLOSED" && item.target_closure_date < today;
            const isHighlighted = item.project_id === highlightProjectId;

            return (
              <div key={item.id} style={{
                borderRadius: 16, background: C.card,
                border: `1.5px solid ${isHighlighted ? C.primary : C.border}`,
                borderLeft: `4px solid ${item.action_status === "OPEN" ? "#ef4444" : item.action_status === "IN_PROGRESS" ? "#f59e0b" : "#22c55e"}`,
                boxShadow: isHighlighted ? `0 4px 24px rgba(108,99,255,0.18)` : C.shadow,
                padding: "16px 20px",
                transition: "box-shadow 0.2s",
              }}>
                {/* Top row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                    <StatusBadge s={item.action_status} />
                    <RagDot r={item.rag_status_at_creation} />
                    {item.metric_name && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.primary, background: `${C.primary}12`, borderRadius: 8, padding: "2px 8px" }}>
                        {item.metric_name}
                      </span>
                    )}
                    {isOverdue && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fff1f2", border: "1px solid #fca5a5", borderRadius: 999, padding: "2px 8px" }}>
                        ⚠ Overdue
                      </span>
                    )}
                    {proj && (
                      <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>
                        {proj.project_name}
                      </span>
                    )}
                  </div>
                  {/* Status changer + delete */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <select
                      value={item.action_status}
                      disabled={updatingId === item.id || item.action_status === "CLOSED"}
                      onChange={e => handleStatusChange(item.id, e.target.value)}
                      style={{
                        appearance: "none", WebkitAppearance: "none",
                        borderRadius: 8, border: `1.5px solid ${C.border}`,
                        padding: "5px 10px", fontSize: 11, fontWeight: 600,
                        color: C.text, background: "var(--bg)", cursor: "pointer", outline: "none",
                      }}>
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <button onClick={() => handleDelete(item.id)} style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "#ef4444", fontSize: 11, fontWeight: 700,
                      padding: "4px 8px", borderRadius: 6,
                    }}>Delete</button>
                  </div>
                </div>

                {/* Root cause + corrective action */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 3px" }}>Root Cause</p>
                    <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.45 }}>{item.root_cause}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 3px" }}>Corrective Action</p>
                    <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.45 }}>{item.corrective_action}</p>
                  </div>
                </div>

                {/* Meta row */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 11, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                  {item.owner_name && (
                    <span>Owner: <strong style={{ color: C.text }}>{item.owner_name}</strong></span>
                  )}
                  {item.created_by_name && (
                    <span>Raised by: <strong style={{ color: C.primary }}>{item.created_by_name}</strong></span>
                  )}
                  {item.target_closure_date && (
                    <span>Target: <strong style={{ color: isOverdue ? "#dc2626" : C.text }}>{item.target_closure_date}</strong></span>
                  )}
                  {item.closed_at && (
                    <span>Closed: <strong style={{ color: "#16a34a" }}>{new Date(item.closed_at).toLocaleDateString()}</strong></span>
                  )}
                  <span style={{ marginLeft: "auto" }}>
                    {new Date(item.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
