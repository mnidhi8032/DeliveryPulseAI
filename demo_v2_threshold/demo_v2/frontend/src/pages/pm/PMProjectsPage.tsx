import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listProjects } from "../../services/projectService";
import { getSetupAccounts, createProjectShell } from "../../services/customerAdminSetupService";
import { useToast } from "../../contexts/ToastContext";
import { RagBadge } from "../../components/RagBadge";
import type { Project } from "../../types/project";
import { formatStatus, getStatusBadgeClass } from "../../utils/formatters";

export function PMProjectsPage() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    account_id: "",
    project_code: "",
    project_name: "",
    description: "",
    start_date: "",
    target_end_date: "",
  });

  const loadProjects = async () => {
    // current_rag is now returned directly by the backend in ProjectEnrichedResponse
    // It reflects the latest QPM KPI measurement RAG — no need to fetch submissions
    const projs = await listProjects();
    setProjects(projs.sort((a, b) => a.project_name.localeCompare(b.project_name)));
  };

  useEffect(() => {
    loadProjects()
      .catch(() => setError("Failed to load projects."))
      .finally(() => setLoading(false));
  }, []);

  const handleOpenCreate = async () => {
    try {
      const accts = await getSetupAccounts();
      setAccounts(accts.filter((a) => a.is_active));
      setForm({ account_id: accts[0]?.id || "", project_code: "", project_name: "", description: "", start_date: "", target_end_date: "" });
    } catch {
      toast.error("Failed to load accounts");
      return;
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createProjectShell({
        account_id: form.account_id,
        project_code: form.project_code,
        project_name: form.project_name,
        description: form.description || undefined,
        start_date: form.start_date || undefined,
        target_end_date: form.target_end_date || undefined,
        status: "ACTIVE",
      });
      toast.success("Project created successfully. You have been assigned as PM.");
      setModalOpen(false);
      setLoading(true);
      await loadProjects();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create project");
    } finally {
      setSaving(false);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-1/3 rounded bg-slate-200" />
        <div className="h-64 rounded-xl bg-slate-200" />
      </div>
    );
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Projects</h1>
          <p className="text-sm text-slate-500">Projects you are assigned to as Project Manager.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow cursor-pointer"
        >
          + Create Project
        </button>
      </div>

      {/* Projects table */}
      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center bg-white">
          <svg className="mx-auto h-10 w-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p className="text-sm font-semibold text-slate-500">No projects yet</p>
          <p className="mt-1 text-xs text-slate-400">Create your first project or wait to be assigned by your Delivery Head.</p>
          <button onClick={handleOpenCreate}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer">
            + Create Project
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm text-left text-slate-700">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Project Name</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Business Unit</th>
                  <th className="px-4 py-3">Health</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-500">{p.project_code}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{p.project_name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{p.account_name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{p.business_unit_name}</td>
                    <td className="px-4 py-3">
                      {p.current_rag
                        ? <RagBadge rag={p.current_rag} showDot />
                        : <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">No score</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadgeClass(p.status)}`}>
                        {formatStatus(p.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <Link to={`/pm/projects/${p.id}/qpm`}
                        className="rounded px-2.5 py-1 text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors inline-block">
                        KPI Plan
                      </Link>
                      <Link to={`/pm/projects/${p.id}`}
                        className="rounded px-2.5 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition shadow-sm inline-block">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create New Project</h3>
                <p className="text-xs text-slate-500 mt-0.5">You will be automatically assigned as Project Manager.</p>
              </div>
              <button onClick={() => setModalOpen(false)}
                className="rounded p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Account / Client *</label>
                <select required value={form.account_id} onChange={(e) => setForm((p) => ({ ...p, account_id: e.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400">
                  <option value="">Select Account…</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Project Code *</label>
                  <input type="text" required placeholder="E.g. PROJ-001"
                    value={form.project_code} onChange={(e) => setForm((p) => ({ ...p, project_code: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Project Name *</label>
                  <input type="text" required placeholder="E.g. Customer Portal"
                    value={form.project_name} onChange={(e) => setForm((p) => ({ ...p, project_name: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Start Date</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Target End Date</label>
                  <input type="date" value={form.target_end_date} onChange={(e) => setForm((p) => ({ ...p, target_end_date: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea rows={3} placeholder="Project scope and objectives…"
                  value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
                ℹ️ You will be auto-assigned as Project Manager. The Delivery Head of the selected account's Business Unit will be linked automatically.
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer">
                  {saving ? "Creating…" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
