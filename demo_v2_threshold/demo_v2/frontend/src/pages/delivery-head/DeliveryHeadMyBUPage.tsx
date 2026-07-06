/**
 * Delivery Head -- My Business Unit view.
 * Auto-loads the BU(s) assigned to the logged-in BU Head via the API
 * (backend filters business-units by bu_head_user_id for DELIVERY_HEAD role).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listBusinessUnits } from "../../services/businessUnitService";
import { listProjects } from "../../services/projectService";
import type { BusinessUnit } from "../../services/businessUnitService";
import type { Project } from "../../types/project";
import { RagBadge } from "../../components/RagBadge";

export function DeliveryHeadMyBUPage() {
  const [bus, setBus] = useState<BusinessUnit[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listBusinessUnits(), listProjects()])
      .then(([b, p]) => { setBus(b); setProjects(p); })
      .catch(() => setError("Failed to load BU data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-1/3 rounded bg-slate-200" />
      <div className="h-40 rounded-xl bg-slate-200" />
    </div>
  );

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  if (bus.length === 0) return (
    <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
      <p className="text-sm text-slate-500 font-semibold">No Business Unit assigned to your account.</p>
      <p className="text-xs text-slate-400 mt-1">Contact your Platform Admin to assign you as Delivery Head.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {bus.map(bu => {
        const buProjects = projects.filter(p => p.business_unit_name === bu.name);
        const greenCount = buProjects.filter(p => p.current_rag === "GREEN").length;
        const amberCount = buProjects.filter(p => p.current_rag === "AMBER").length;
        const redCount = buProjects.filter(p => ["RED", "CRITICAL"].includes(p.current_rag ?? "")).length;

        return (
          <div key={bu.id} className="space-y-4">
            {/* BU Header */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Business Unit</p>
                  <h1 className="text-xl font-bold text-slate-900 mt-0.5">{bu.name}</h1>
                  <p className="font-mono text-xs text-slate-500 mt-0.5">{bu.code}</p>
                  {bu.description && <p className="text-sm text-slate-500 mt-1">{bu.description}</p>}
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${bu.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                  {bu.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {/* Health Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Projects", value: buProjects.length, cls: "border-slate-200 bg-white" },
                { label: "GREEN", value: greenCount, cls: "border-emerald-200 bg-emerald-50" },
                { label: "AMBER", value: amberCount, cls: "border-amber-200 bg-amber-50" },
                { label: "RED / CRITICAL", value: redCount, cls: "border-rose-200 bg-rose-50" },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border p-4 text-center shadow-sm ${s.cls}`}>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{s.label}</p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Projects Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Projects in {bu.name}</p>
                <Link to="/delivery-head/projects" className="text-xs text-indigo-600 hover:underline">View all</Link>
              </div>
              {buProjects.length === 0 ? (
                <p className="px-5 py-8 text-sm text-slate-400 text-center">No projects in this BU yet.</p>
              ) : (
                <table className="min-w-full text-sm divide-y divide-slate-100">
                  <thead className="bg-slate-50 text-xs text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Code</th>
                      <th className="px-4 py-3 text-left">Project Name</th>
                      <th className="px-4 py-3 text-left">Account</th>
                      <th className="px-4 py-3 text-left">PM</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Health</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {buProjects.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.project_code}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{p.project_name}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{p.account_name || "--"}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{p.project_manager_name || "--"}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">{p.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          {p.current_rag
                            ? <RagBadge rag={p.current_rag} showDot />
                            : <span className="text-slate-300 text-xs">--</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
