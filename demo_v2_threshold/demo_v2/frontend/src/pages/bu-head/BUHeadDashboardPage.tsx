/**
 * BU Head Dashboard -- read-only view of their assigned BU only.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listBusinessUnits } from "../../services/businessUnitService";
import { listProjects } from "../../services/projectService";
import type { BusinessUnit, Project } from "../../types/project";
import { RagBadge } from "../../components/RagBadge";

export function BUHeadDashboardPage() {
  const [bus, setBus] = useState<BusinessUnit[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listBusinessUnits(), listProjects()])
      .then(([b, p]) => { setBus(b); setProjects(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-64 rounded-xl bg-slate-200 animate-pulse" />;

  const greenCount = projects.filter(p => p.current_rag === "GREEN").length;
  const amberCount = projects.filter(p => p.current_rag === "AMBER").length;
  const redCount = projects.filter(p => p.current_rag === "RED" || p.current_rag === "CRITICAL").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">BU Head Dashboard</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {bus.length > 0 ? bus.map(b => b.name).join(", ") : "Your Business Unit"} -- read-only
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Projects", value: projects.length, cls: "border-slate-200 bg-white" },
          { label: "GREEN", value: greenCount, cls: "border-emerald-200 bg-emerald-50" },
          { label: "AMBER", value: amberCount, cls: "border-amber-200 bg-amber-50" },
          { label: "RED / CRITICAL", value: redCount, cls: "border-rose-200 bg-rose-50" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 shadow-sm text-center ${s.cls}`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Projects in your BU</p>
          <Link to="/bu-head/projects" className="text-xs text-indigo-600 hover:underline">View all</Link>
        </div>
        <table className="min-w-full text-sm divide-y divide-slate-100">
          <thead className="bg-slate-50 text-xs text-slate-500 font-semibold uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Project</th>
              <th className="px-4 py-3 text-left">Account</th>
              <th className="px-4 py-3 text-left">PM</th>
              <th className="px-4 py-3 text-left">Health</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projects.slice(0, 8).map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-800">{p.project_name}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{p.account_name || "--"}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{p.project_manager_name || "--"}</td>
                <td className="px-4 py-3">
                  {p.current_rag ? <RagBadge rag={p.current_rag} showDot /> : <span className="text-slate-300 text-xs">--</span>}
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No projects found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
