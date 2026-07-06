/**
 * Delivery Manager — Action Items across all their projects.
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { listProjects } from "../../services/projectService";
import { listActionItems, createActionItem } from "../../services/brdService";
import type { Project } from "../../types/project";
import type { ActionItem } from "../../types/brd";
import { useToast } from "../../contexts/ToastContext";

const STATUS_COLORS: Record<string, string> = {
  OPEN:        "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  CLOSED:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  OVERDUE:     "bg-rose-50 text-rose-700 border-rose-200",
};

export function DMActionItemsPage() {
  const [searchParams] = useSearchParams();
  const preselectedProjectId = searchParams.get("projectId") ?? "";
  const toast = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(preselectedProjectId);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    root_cause: "", corrective_action: "", owner_name: "",
    target_closure_date: "", metric_name: "",
  });

  const load = async (projectId: string) => {
    if (!projectId) { setActionItems([]); return; }
    try {
      const items = await listActionItems(projectId);
      setActionItems(items);
    } catch { setActionItems([]); }
  };

  useEffect(() => {
    listProjects()
      .then(async (projs) => {
        setProjects(projs);
        const pid = preselectedProjectId || (projs[0]?.id ?? "");
        setSelectedProject(pid);
        await load(pid);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleProjectChange = async (pid: string) => {
    setSelectedProject(pid);
    setLoading(true);
    await load(pid);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!selectedProject || !form.root_cause.trim() || !form.corrective_action.trim()) return;
    setSaving(true);
    try {
      await createActionItem({
        project_id: selectedProject,
        root_cause: form.root_cause,
        corrective_action: form.corrective_action,
        owner_name: form.owner_name || undefined,
        target_closure_date: form.target_closure_date || undefined,
        metric_name: form.metric_name || undefined,
      });
      toast.success("Action item created.");
      setForm({ root_cause: "", corrective_action: "", owner_name: "", target_closure_date: "", metric_name: "" });
      setShowForm(false);
      await load(selectedProject);
    } catch {
      toast.error("Failed to create action item.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-64 rounded-xl bg-slate-200 animate-pulse" />;

  const openCount = actionItems.filter(a => a.action_status === "OPEN").length;
  const inProgressCount = actionItems.filter(a => a.action_status === "IN_PROGRESS").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Action Items</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track corrective actions for delivery issues.</p>
        </div>
        <button type="button" onClick={() => setShowForm(v => !v)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 cursor-pointer">
          {showForm ? "Cancel" : "+ New Action Item"}
        </button>
      </div>

      {/* Project selector */}
      <div>
        <label className="text-xs font-semibold text-slate-600 mr-2">Project:</label>
        <select value={selectedProject} onChange={e => handleProjectChange(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400">
          <option value="">Select a project…</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>)}
        </select>
      </div>

      {/* Summary */}
      {selectedProject && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total", value: actionItems.length, cls: "border-slate-200 bg-white" },
            { label: "Open", value: openCount, cls: "border-amber-200 bg-amber-50" },
            { label: "In Progress", value: inProgressCount, cls: "border-blue-200 bg-blue-50" },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-3 text-center shadow-sm ${s.cls}`}>
              <p className="text-[10px] font-semibold text-slate-500 uppercase">{s.label}</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      {showForm && selectedProject && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900">New Action Item</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Metric / Area of Concern", key: "metric_name", placeholder: "E.g. Schedule Variance", required: false },
              { label: "Owner Name", key: "owner_name", placeholder: "E.g. John Smith", required: false },
              { label: "Target Closure Date", key: "target_closure_date", type: "date", required: false },
            ].map(({ label, key, placeholder, type, required }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">{label}</label>
                <input type={type ?? "text"} placeholder={placeholder} required={required}
                  value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"/>
              </div>
            ))}
          </div>
          {[
            { label: "Root Cause *", key: "root_cause", placeholder: "Describe the root cause of the issue…" },
            { label: "Corrective Action *", key: "corrective_action", placeholder: "Describe the corrective action to be taken…" },
          ].map(({ label, key, placeholder }) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700">{label}</label>
              <textarea rows={3} placeholder={placeholder}
                value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"/>
            </div>
          ))}
          <button type="button" disabled={saving || !form.root_cause.trim() || !form.corrective_action.trim()}
            onClick={handleCreate}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
            {saving ? "Saving…" : "Create Action Item"}
          </button>
        </div>
      )}

      {/* Action items list */}
      {selectedProject && (
        <div className="space-y-3">
          {actionItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <p className="text-sm text-slate-400">No action items for this project yet.</p>
            </div>
          ) : actionItems.map(item => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {item.metric_name && (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200 mb-1 inline-block">
                      {item.metric_name}
                    </span>
                  )}
                  <p className="text-sm font-semibold text-slate-800 mt-1">Root Cause: {item.root_cause}</p>
                  <p className="text-sm text-slate-600 mt-1">Action: {item.corrective_action}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-400">
                    {item.owner_name && <span>Owner: <span className="font-medium text-slate-600">{item.owner_name}</span></span>}
                    {item.target_closure_date && <span>Due: <span className="font-medium text-slate-600">{item.target_closure_date}</span></span>}
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${STATUS_COLORS[item.action_status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                  {item.action_status?.replace("_", " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
