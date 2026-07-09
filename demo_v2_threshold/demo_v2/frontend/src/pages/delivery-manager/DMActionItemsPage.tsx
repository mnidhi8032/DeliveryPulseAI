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
    <div className="min-h-full bg-teal-50/40 -mx-8 -my-6 px-8 py-8 space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Action Items</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track corrective actions for delivery issues.</p>
        </div>
        <button type="button" onClick={() => setShowForm(v => !v)}
          className={`rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition cursor-pointer ${
            showForm
              ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          }`}>
          {showForm ? "Cancel" : "+ New action item"}
        </button>
      </div>

      {/* Project selector */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-3">
        <label className="text-sm text-slate-500 shrink-0">Project:</label>
        <select value={selectedProject} onChange={e => handleProjectChange(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:bg-white">
          <option value="">Select a project…</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>)}
        </select>
      </div>

      {/* Summary strip */}
      {selectedProject && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total",       value: actionItems.length, bg: "bg-white",         text: "text-slate-900" },
            { label: "Open",        value: openCount,          bg: "bg-amber-50",       text: "text-amber-700" },
            { label: "In progress", value: inProgressCount,    bg: "bg-blue-50",        text: "text-blue-700"  },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl ${s.bg} border border-white shadow-sm px-5 py-4`}>
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className={`text-2xl font-semibold mt-0.5 ${s.text}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      {showForm && selectedProject && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h2 className="text-base font-semibold text-slate-800">New Action Item</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Metric / area of concern", key: "metric_name",         placeholder: "E.g. Schedule Variance" },
              { label: "Owner name",               key: "owner_name",          placeholder: "E.g. John Smith" },
              { label: "Target closure date",      key: "target_closure_date", type: "date" },
            ].map(({ label, key, placeholder, type }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">{label}</label>
                <input type={type ?? "text"} placeholder={placeholder}
                  value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:bg-white"/>
              </div>
            ))}
          </div>
          {[
            { label: "Root cause *",         key: "root_cause",         placeholder: "Describe the root cause of the issue…" },
            { label: "Corrective action *",  key: "corrective_action",  placeholder: "Describe the corrective action to be taken…" },
          ].map(({ label, key, placeholder }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">{label}</label>
              <textarea rows={3} placeholder={placeholder}
                value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:bg-white"/>
            </div>
          ))}
          <button type="button" disabled={saving || !form.root_cause.trim() || !form.corrective_action.trim()}
            onClick={handleCreate}
            className="rounded-xl bg-emerald-600 text-white px-6 py-2.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-sm">
            {saving ? "Saving…" : "Create action item"}
          </button>
        </div>
      )}

      {/* Action items list */}
      {selectedProject && (
        <div className="space-y-3">
          {actionItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center shadow-sm">
              <p className="text-sm text-slate-400">No action items for this project yet.</p>
            </div>
          ) : actionItems.map(item => {
            const statusCfg: Record<string, { dot: string; pill: string; text: string }> = {
              OPEN:        { dot: "bg-amber-400",   pill: "bg-amber-100",   text: "text-amber-700"   },
              IN_PROGRESS: { dot: "bg-blue-400",    pill: "bg-blue-100",    text: "text-blue-700"    },
              CLOSED:      { dot: "bg-emerald-500", pill: "bg-emerald-100", text: "text-emerald-700" },
              OVERDUE:     { dot: "bg-rose-500",    pill: "bg-rose-100",    text: "text-rose-700"    },
            };
            const sc = statusCfg[item.action_status] ?? { dot: "bg-slate-300", pill: "bg-slate-100", text: "text-slate-600" };
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {item.metric_name && (
                      <span className="inline-block rounded-full bg-teal-100 text-teal-700 text-xs font-semibold px-2.5 py-0.5 mb-2">
                        {item.metric_name}
                      </span>
                    )}
                    <p className="text-sm font-semibold text-slate-800">Root cause: {item.root_cause}</p>
                    <p className="text-sm text-slate-600 mt-1">Action: {item.corrective_action}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-400">
                      {item.owner_name && <span>Owner: <span className="text-slate-600 font-medium">{item.owner_name}</span></span>}
                      {item.target_closure_date && <span>Due: <span className="text-slate-600 font-medium">{item.target_closure_date}</span></span>}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full ${sc.pill} ${sc.text} text-xs font-semibold px-3 py-1`}>
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${sc.dot}`} />
                    {item.action_status?.replace("_", " ")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
