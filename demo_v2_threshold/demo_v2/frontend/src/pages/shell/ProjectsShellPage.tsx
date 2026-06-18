import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listProjects } from "../../services/projectService";
import { listSubmissions } from "../../services/submissionService";
import { getSubmissionHealth } from "../../services/metricService";
import { formatStatus, getStatusBadgeClass } from "../../utils/formatters";
import { RagBadge } from "../../components/RagBadge";
import { useToast } from "../../contexts/ToastContext";
import {
  getSetupAccounts,
  getSetupUsers,
  createProjectShell,
  updateProjectShell,
} from "../../services/customerAdminSetupService";
import type { SetupAccount, SetupUser } from "../../types/customerAdminSetup";
import type { Project } from "../../types/project";

interface DHProjectItem extends Project {
  rag_status: string | null;
}

export function ProjectsShellPage() {
  const [items, setItems] = useState<DHProjectItem[]>([]);
  const [accounts, setAccounts] = useState<SetupAccount[]>([]);
  const [pms, setPms] = useState<SetupUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal & Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<DHProjectItem | null>(null);
  const [form, setForm] = useState({
    account_id: "",
    project_code: "",
    project_name: "",
    project_manager_id: "",
    description: "",
    start_date: "",
    target_end_date: "",
    status: "ACTIVE"
  });

  const toast = useToast();

  const loadData = async () => {
    try {
      const [projects, submissions, accountsData, usersData] = await Promise.all([
        listProjects(),
        listSubmissions(),
        getSetupAccounts(),
        getSetupUsers(),
      ]);

      // Find latest submission for each project to get current RAG status
      const latestSubmissionMap = new Map<string, string>();
      for (const sub of submissions) {
        const existing = latestSubmissionMap.get(sub.project_id);
        if (!existing) {
          latestSubmissionMap.set(sub.project_id, sub.id);
        }
      }

      const detailed: DHProjectItem[] = [];
      await Promise.all(
        projects.map(async (p) => {
          let ragStatus: string | null = null;
          const latestSubId = latestSubmissionMap.get(p.id);
          if (latestSubId) {
            try {
              const health = await getSubmissionHealth(latestSubId);
              if (health && health.health_available) {
                ragStatus = health.rag_status;
              }
            } catch {
              ragStatus = null;
            }
          }

          detailed.push({
            ...p,
            rag_status: ragStatus,
          });
        })
      );

      setItems(detailed.sort((a, b) => a.project_name.localeCompare(b.project_name)));
      setAccounts(accountsData.filter(a => a.is_active));
      setPms(usersData.filter(u => u.role_code === "PM"));
    } catch (err) {
      setError("Failed to load projects portfolio.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditProject(null);
    setForm({
      account_id: accounts[0]?.id || "",
      project_code: "",
      project_name: "",
      project_manager_id: "",
      description: "",
      start_date: "",
      target_end_date: "",
      status: "ACTIVE"
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (project: DHProjectItem) => {
    setEditProject(project);
    setForm({
      account_id: project.account_id,
      project_code: project.project_code,
      project_name: project.project_name,
      project_manager_id: project.project_manager_id || "",
      description: project.description || "",
      start_date: project.start_date || "",
      target_end_date: project.target_end_date || "",
      status: project.status
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        project_manager_id: form.project_manager_id || null,
        start_date: form.start_date || null,
        target_end_date: form.target_end_date || null,
      };

      if (editProject) {
        await updateProjectShell(editProject.id, {
          project_name: form.project_name,
          project_manager_id: form.project_manager_id || null,
          description: form.description || null,
          start_date: form.start_date || null,
          target_end_date: form.target_end_date || null,
          status: form.status,
        });
        toast.success("Project updated successfully");
      } else {
        await createProjectShell(payload);
        toast.success("Project created successfully");
      }
      setModalOpen(false);
      setEditProject(null);
      setLoading(true);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save project");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-1/4 rounded bg-slate-200 animate-pulse" />
        <div className="h-12 w-full rounded bg-slate-200 animate-pulse" />
        <div className="h-64 rounded bg-slate-200 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-6 text-slate-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">BU Projects Portfolio</h1>
          <p className="text-sm text-slate-500">Active projects and assigned PM contacts under your Business Unit.</p>
        </div>
        
        <button
          onClick={handleOpenCreate}
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow shrink-0 cursor-pointer"
        >
          Create Project
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-slate-500 font-medium">No projects found in your Business Unit portfolio.</p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition"
          >
            Create Your First Project
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
              <thead className="bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Project Name</th>
                  <th className="px-4 py-3">Client Account</th>
                  <th className="px-4 py-3">Project Manager</th>
                  <th className="px-4 py-3">Current Health</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-500">{item.project_code}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{item.project_name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{item.account_name}</td>
                    <td className="px-4 py-3">
                      {item.project_manager_name ? (
                        <>
                          <p className="font-semibold text-slate-800">{item.project_manager_name}</p>
                          {item.project_manager_email && (
                            <a 
                              href={`mailto:${item.project_manager_email}`} 
                              className="text-[10px] text-slate-500 hover:underline"
                            >
                              {item.project_manager_email}
                            </a>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                          ⚠️ Unassigned PM
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.rag_status ? (
                        <RagBadge rag={item.rag_status} />
                      ) : (
                        <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          No score yet
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadgeClass(item.status)}`}>
                        {formatStatus(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="rounded px-2.5 py-1 text-xs font-bold bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 transition-colors shadow-sm cursor-pointer inline-block"
                      >
                        Edit
                      </button>
                      <Link
                        to={`/delivery-head/projects/${item.id}/timeline`}
                        className="rounded px-2.5 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition shadow-sm inline-block"
                      >
                        Timeline
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editProject ? "Update Project" : "Create Project"}
              </h3>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setEditProject(null);
                }}
                className="rounded p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Account</label>
                <select
                  required
                  disabled={!!editProject}
                  value={form.account_id}
                  onChange={(e) => setForm({ ...form, account_id: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-50"
                >
                  <option value="">Select Account...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Project Code</label>
                <input
                  type="text"
                  required
                  disabled={!!editProject}
                  placeholder="E.g. NEXUS-PAY"
                  value={form.project_code}
                  onChange={(e) => setForm({ ...form, project_code: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-50"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Nexus Core Payment System"
                  value={form.project_name}
                  onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Assign Project Manager (PM)</label>
                <select
                  value={form.project_manager_id}
                  onChange={(e) => setForm({ ...form, project_manager_id: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="">Select Active PM (Optional)...</option>
                  {pms.map((pm) => (
                    <option key={pm.id} value={pm.id}>{pm.full_name} ({pm.email})</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-0.5">Assigned PM gains exclusive metric submission authority.</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Start Date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Target End Date</label>
                  <input
                    type="date"
                    value={form.target_end_date}
                    onChange={(e) => setForm({ ...form, target_end_date: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  placeholder="Scope, objectives, and deliverables..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 h-16"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Project Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ON_HOLD">ON_HOLD</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CLOSED">CLOSED (Deactivated)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditProject(null);
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {editProject ? "Save Changes" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
