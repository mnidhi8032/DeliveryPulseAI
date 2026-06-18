/**
 * CEO -- Business Unit Detail view.
 * Uses /customer-admin/business-units/:id (allowed for CEO + BU_HEAD).
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getBusinessUnitDetail } from "../../services/customerAdminService";
import { listProjects } from "../../services/projectService";
import type { BusinessUnitDetail } from "../../types/customerAdmin";
import type { Project } from "../../types/project";
import { RagBadge } from "../../components/RagBadge";

export function CEOBUDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<BusinessUnitDetail | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getBusinessUnitDetail(id),
      listProjects(),
    ])
      .then(([d, projs]) => {
        setDetail(d);
        // Filter projects belonging to this BU
        setProjects(projs.filter(p => p.business_unit_name === d.business_unit_name));
      })
      .catch(() => setError("Failed to load business unit details."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-1/3 rounded bg-slate-200" />
      <div className="h-40 rounded-xl bg-slate-200" />
      <div className="h-64 rounded-xl bg-slate-200" />
    </div>
  );

  if (error || !detail) return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
      {error ?? "Business unit not found."}
      <div className="mt-3">
        <Link to="/ceo/business-units" className="text-xs text-indigo-600 hover:underline">
          Back to Business Units
        </Link>
      </div>
    </div>
  );

  const greenCount = projects.filter(p => p.current_rag === "GREEN").length;
  const amberCount = projects.filter(p => p.current_rag === "AMBER").length;
  const redCount   = projects.filter(p => p.current_rag === "RED" || p.current_rag === "CRITICAL").length;
  const noData     = projects.filter(p => !p.current_rag).length;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link to="/ceo/business-units" className="text-xs text-slate-500 hover:text-slate-800">
        Back to Business Units
      </Link>

      {/* BU Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Business Unit</p>
            <h1 className="text-2xl font-bold text-slate-900 mt-0.5">{detail.business_unit_name}</h1>
            <p className="font-mono text-xs text-slate-500 mt-0.5">{detail.business_unit_code}</p>
            {detail.description && (
              <p className="text-sm text-slate-500 mt-2 max-w-xl">{detail.description}</p>
            )}
          </div>
          <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-bold">
            Active
          </span>
        </div>
      </div>

      {/* Health summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Projects", value: projects.length, cls: "border-slate-200 bg-white" },
          { label: "GREEN",          value: greenCount,       cls: "border-emerald-200 bg-emerald-50" },
          { label: "AMBER",          value: amberCount,       cls: "border-amber-200 bg-amber-50" },
          { label: "RED / CRITICAL", value: redCount,         cls: "border-rose-200 bg-rose-50" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 text-center shadow-sm ${s.cls}`}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Projects table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Projects ({projects.length})
          </p>
        </div>
        {projects.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400 text-center">No projects in this BU yet.</p>
        ) : (
          <table className="min-w-full text-sm divide-y divide-slate-100">
            <thead className="bg-slate-50 text-xs text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Project Name</th>
                <th className="px-4 py-3 text-left">Account</th>
                <th className="px-4 py-3 text-left">Project Manager</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.project_code}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{p.project_name}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.account_name || "--"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.project_manager_name || "--"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.current_rag
                      ? <RagBadge rag={p.current_rag} showDot />
                      : <span className="text-slate-300 text-xs">No data</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
