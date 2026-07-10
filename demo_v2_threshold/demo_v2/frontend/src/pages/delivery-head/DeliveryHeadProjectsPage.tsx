/**
 * Delivery Head — Projects list (dark theme).
 * Full row is clickable → navigates to project summary.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listProjects } from "../../services/projectService";
import type { Project } from "../../types/project";

const RAG_DOT: Record<string, string> = {
  GREEN:    "bg-emerald-400",
  AMBER:    "bg-amber-400",
  RED:      "bg-rose-500",
  CRITICAL: "bg-rose-700",
};
const RAG_TEXT: Record<string, string> = {
  GREEN:    "text-emerald-400",
  AMBER:    "text-amber-400",
  RED:      "text-rose-400",
  CRITICAL: "text-rose-300",
};

export function DeliveryHeadProjectsPage() {
  const navigate    = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [ragFilter, setRagFilter] = useState("ALL");

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p => {
    const matchSearch =
      !search ||
      p.project_name.toLowerCase().includes(search.toLowerCase()) ||
      p.project_code.toLowerCase().includes(search.toLowerCase()) ||
      (p.account_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchRag =
      ragFilter === "ALL" ||
      (ragFilter === "NO_DATA" ? !p.current_rag : p.current_rag === ragFilter);
    return matchSearch && matchRag;
  });

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-slate-700" />
        <div className="h-64 rounded-2xl bg-slate-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* page header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Projects</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {projects.length} project{projects.length !== 1 ? "s" : ""} in your BU · read-only
        </p>
      </div>

      {/* table card */}
      <div className="rounded-2xl bg-[#1e1e2e] border border-white/5 shadow-lg overflow-hidden">

        {/* toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white/5">
          <p className="text-sm font-bold text-white">{filtered.length} shown</p>
          <div className="flex flex-wrap items-center gap-2">
            {(["ALL", "GREEN", "AMBER", "RED", "CRITICAL"] as const).map(r => (
              <button key={r} type="button" onClick={() => setRagFilter(r)}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition cursor-pointer ${
                  ragFilter === r
                    ? "bg-white text-slate-900 border-white"
                    : "border-white/20 text-slate-400 hover:border-white/40 hover:text-white"
                }`}>
                {r === "ALL" ? "All" : r}
              </button>
            ))}
            <input type="text" placeholder="Search…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white placeholder-slate-500 w-36 focus:outline-none focus:ring-1 focus:ring-white/20" />
          </div>
        </div>

        {/* column headers */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] px-5 py-2 border-b border-white/5">
          {["Project", "Account", "PM", "Health", ""].map((h, i) => (
            <p key={i} className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{h}</p>
          ))}
        </div>

        {/* rows */}
        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">No projects match your filter.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map(p => {
              const rag = p.current_rag;
              return (
                <div key={p.id}
                  onClick={() => navigate(`/delivery-head/projects/${p.id}/summary`)}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center px-5 py-4 hover:bg-white/5 transition-colors group cursor-pointer">
                  {/* project */}
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors">{p.project_name}</p>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">{p.project_code}</p>
                  </div>
                  {/* account */}
                  <p className="text-sm text-slate-400 truncate">{p.account_name ?? "—"}</p>
                  {/* pm */}
                  <p className="text-sm text-slate-400 truncate">{p.project_manager_name ?? "—"}</p>
                  {/* health */}
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${rag ? RAG_DOT[rag] : "bg-slate-600"}`} />
                    <span className={`text-sm font-semibold ${rag ? RAG_TEXT[rag] : "text-slate-500"}`}>
                      {rag ?? "No data"}
                    </span>
                  </div>
                  {/* actions — stop propagation so link clicks don't double-fire */}
                  <div className="flex items-center gap-3 pl-4" onClick={e => e.stopPropagation()}>
                    <Link to={`/delivery-head/projects/${p.id}/summary`}
                      className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors whitespace-nowrap">
                      Summary →
                    </Link>
                    <Link to={`/delivery-head/projects/${p.id}/timeline`}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors whitespace-nowrap">
                      Timeline
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
