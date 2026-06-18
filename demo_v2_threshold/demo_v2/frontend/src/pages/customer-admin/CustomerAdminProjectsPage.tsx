import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listProjects } from "../../services/projectService";
import type { Project } from "../../types/project";
import { formatStatus, getStatusBadgeClass } from "../../utils/formatters";

export function CustomerAdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch(() => setError("Failed to load projects."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-600">Loading projects…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Projects</h1>
      <p className="mt-1 text-sm text-slate-600">All projects across the organization (read-only).</p>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-700">Code</th>
              <th className="px-4 py-3 font-medium text-slate-700">Name</th>
              <th className="px-4 py-3 font-medium text-slate-700">Account</th>
              <th className="px-4 py-3 font-medium text-slate-700">Business unit</th>
              <th className="px-4 py-3 font-medium text-slate-700">PM</th>
              <th className="px-4 py-3 font-medium text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{p.project_code}</td>
                <td className="px-4 py-3">
                  <Link to={`/customer-admin/projects/${p.id}/timeline`} className="text-indigo-600 hover:text-indigo-800">
                    {p.project_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.account_name}</td>
                <td className="px-4 py-3 text-slate-600">{p.business_unit_name}</td>
                <td className="px-4 py-3 text-slate-600">{p.project_manager_name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded border ${getStatusBadgeClass(p.status)}`}>
                    {formatStatus(p.status)}
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
