/**
 * Delivery Head — Projects list (light theme).
 * PM-inspired card rows with RAG left border. Full row clickable.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listProjects } from "../../services/projectService";
import type { Project } from "../../types/project";

const RAG_HEX: Record<string, string> = {
  GREEN: "#10b981", AMBER: "#f59e0b", RED: "#f43f5e", CRITICAL: "#be123c",
};
const RAG_DOT_BG: Record<string, string> = {
  GREEN: "bg-emerald-500", AMBER: "bg-amber-400", RED: "bg-rose-500", CRITICAL: "bg-rose-700",
};

export function DeliveryHeadProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [ragFilter, setRagFilter] = useState("ALL");

  useEffect(() => {
    listProjects()
      .then(ps => setProjects(ps.sort((a, b) => a.project_name.localeCompare(b.project_name))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const greenCnt    = useMemo(() => projects.filter(p => p.current_rag === "GREEN").length,    [projects]);
  const amberCnt    = useMemo(() => projects.filter(p => p.current_rag === "AMBER").length,    [projects]);
  const redCnt      = useMemo(() => projects.filter(p => p.current_rag === "RED").length,      [projects]);
  const criticalCnt = useMemo(() => projects.filter(p => p.current_rag === "CRITICAL").length, [projects]);
  const noScoreCnt  = useMemo(() => projects.filter(p => !p.current_rag).length,               [projects]);

  const filtered = useMemo(() => projects.filter(p => {
    const ms = !search ||
      p.project_name.toLowerCase().includes(search.toLowerCase()) ||
      p.project_code.toLowerCase().includes(search.toLowerCase()) ||
      (p.account_name ?? "").toLowerCase().includes(search.toLowerCase());
    const mr = ragFilter === "ALL" || (ragFilter === "NO_DATA" ? !p.current_rag : p.current_rag === ragFilter);
    return ms && mr;
  }), [projects, search, ragFilter]);

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-slate-200" />
      <div className="flex gap-3">{[...Array(5)].map((_, i) => <div key={i} className="h-8 w-20 rounded-full bg-slate-200" />)}</div>
      <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-200" />)}</div>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Delivery Head · Read-only</p>
          <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900 tracking-tight">Projects</h1>
          <p className="text-sm text-slate-500 mt-1">
            {projects.length} project{projects.length !== 1 ? "s" : ""} in your Business Unit
          </p>
        </div>
        <input type="text" placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 placeholder-slate-400 w-52 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
      </div>

      {/* stat chips */}
      {projects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {([
            { label: "All",      key: "ALL",      val: projects.length, color: "#6366f1", bg: "rgba(99,102,241,0.08)"  },
            { label: "Green",    key: "GREEN",    val: greenCnt,        color: "#16a34a", bg: "rgba(22,163,74,0.08)"   },
            { label: "Amber",    key: "AMBER",    val: amberCnt,        color: "#d97706", bg: "rgba(217,119,6,0.08)"   },
            { label: "Red",      key: "RED",      val: redCnt,          color: "#dc2626", bg: "rgba(220,38,38,0.08)"   },
            { label: "Critical", key: "CRITICAL", val: criticalCnt,     color: "#9f1239", bg: "rgba(159,18,57,0.08)"   },
            { label: "No score", key: "NO_DATA",  val: noScoreCnt,      color: "var(--muted)", bg: "rgba(100,116,139,0.08)" },
          ] as { label: string; key: string; val: number; color: string; bg: string }[]).map(s => (
            <button key={s.key} type="button" onClick={() => setRagFilter(s.key)} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              borderRadius: 999, padding: "5px 14px", cursor: "pointer",
              background: ragFilter === s.key ? s.color : s.bg,
              border: `1.5px solid ${s.color}${ragFilter === s.key ? "" : "40"}`,
              transition: "background 0.15s",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: ragFilter === s.key ? "var(--surface)" : s.color, display: "inline-block" }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: ragFilter === s.key ? "var(--surface)" : s.color }}>{s.val}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: ragFilter === s.key ? "rgba(255,255,255,0.85)" : s.color }}>{s.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* empty */}
      {projects.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">
          <p className="text-sm font-semibold text-slate-400">No projects in your Business Unit yet.</p>
        </div>
      )}

      {/* card rows */}
      {filtered.length === 0 && projects.length > 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-400">No projects match your filter.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(p => {
            const rag = p.current_rag;
            const isAtRisk = rag === "RED" || rag === "CRITICAL";
            const borderColor = rag ? RAG_HEX[rag] : "var(--border)";
            const statusBg: Record<string, string> = {
              ACTIVE:    "bg-emerald-50  text-emerald-700 border-emerald-200",
              ON_HOLD:   "bg-amber-50    text-amber-700   border-amber-200",
              COMPLETED: "bg-blue-50     text-blue-700    border-blue-200",
              CANCELLED: "bg-slate-100   text-slate-500   border-slate-200",
            };
            const statusLabel: Record<string, string> = {
              ACTIVE: "Active", ON_HOLD: "On Hold", COMPLETED: "Completed", CANCELLED: "Cancelled",
            };

            return (
              <div key={p.id}
                onClick={() => navigate(`/delivery-head/projects/${p.id}/summary`)}
                className="group flex items-center rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer shadow-sm overflow-hidden"
                style={{ borderLeft: `4px solid ${borderColor}` }}>

                {/* dot */}
                <div className="px-4 flex-shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full block" style={{ background: borderColor }} />
                </div>

                {/* code + name */}
                <div className="flex-1 min-w-0 py-4 pr-4">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-black text-indigo-500 font-mono uppercase tracking-wide">{p.project_code}</span>
                    <span className={`text-[9px] font-bold rounded-full px-2 py-0.5 border ${statusBg[p.status] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
                      {statusLabel[p.status] ?? p.status}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors truncate">{p.project_name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{p.account_name ?? "—"} · {p.business_unit_name ?? ""}</p>
                </div>

                {/* PM */}
                <div className="w-44 flex-shrink-0 py-4 px-4 border-l border-slate-100 hidden md:block">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">PM</p>
                  <p className="text-xs text-slate-600 truncate">{p.project_manager_name ?? "—"}</p>
                </div>

                {/* dates */}
                <div className="w-44 flex-shrink-0 py-4 px-4 border-l border-slate-100 hidden lg:block">
                  <p className="text-xs text-slate-400 whitespace-nowrap">
                    {p.start_date ? new Date(p.start_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    {p.target_end_date ? ` → ${new Date(p.target_end_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
                  </p>
                </div>

                {/* health */}
                <div className="w-32 flex-shrink-0 py-4 px-4 border-l border-slate-100 hidden sm:flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${rag ? RAG_DOT_BG[rag] : "bg-slate-300"}`} />
                  <span className="text-xs font-semibold" style={{ color: rag ? RAG_HEX[rag] : "var(--muted)" }}>{rag ?? "—"}</span>
                </div>

                {/* status pill */}
                <div className="flex-shrink-0 py-4 px-4 border-l border-slate-100">
                  <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold border ${
                    isAtRisk
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : rag === "AMBER"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : rag === "GREEN"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}>
                    {isAtRisk ? "At risk" : rag === "GREEN" ? "On track" : rag === "AMBER" ? "Monitor" : "No data"}
                  </span>
                </div>

                {/* arrow */}
                <div className="px-4 py-4 flex-shrink-0">
                  <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
