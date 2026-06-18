/**
 * CEO -- All projects read-only.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listProjects } from "../../services/projectService";
import type { Project } from "../../types/project";
import { RagBadge } from "../../components/RagBadge";

export function CEOProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listProjects().then(setProjects).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p =>
    !search ||
    p.project_name.toLowerCase().includes(search.toLowerCase()) ||
    p.project_code.toLowerCase().includes(search.toLowerCase()) ||
    (p.business_unit_name || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="h-64 rounded-xl bg-slate-200 animate-pulse" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">All Projects</h1>
          <p className="text-xs text-slate-500 mt-0.5">Read-only -- {projects.length} projects across all BUs</p>
        </div>
        <input
          type="text" placeholder="Search projects..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs w-56 focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full text-sm divide-y divide-slate-100">
          <thead className="bg-slate-50 text-xs text-slate-500 font-semibold uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Project Name</th>
              <th className="px-4 py-3 text-left">Business Unit</th>
              <th className="px-4 py-3 text-left">Account</th>
              <th className="px-4 py-3 text-left">PM</th>
              <th className="px-4 py-3 text-left">Health</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No projects found.</td></tr>
            ) : filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.project_code}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">{p.project_name}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{p.business_unit_name || "--"}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{p.account_name || "--"}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{p.project_manager_name || "--"}</td>
                <td className="px-4 py-3">
                  {p.current_rag ? <RagBadge rag={p.current_rag} showDot /> : <span className="text-slate-300 text-xs">--</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
