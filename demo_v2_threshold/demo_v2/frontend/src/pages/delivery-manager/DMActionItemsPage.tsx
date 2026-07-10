/**
 * Delivery Manager — Action Items — dark enterprise theme
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

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-slate-700" />
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-700" />)}
      </div>
      <div className="h-64 rounded-2xl bg-slate-700" />
    </div>
  );

  const openCount = actionItems.filter(a => a.action_status === "OPEN").length;
  const inProgressCount = actionItems.filter(a => a.action_status === "IN_PROGRESS").length;

  return (
    <div className="space-y-7">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Action Items</h1>
          <p className="text-sm text-slate-400 mt-0.5">Track corrective actions for delivery issues.</p>
        </div>
        <button type="button" onClick={() => setShowForm(v => !v)}
          className={`rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition cursor-pointer ${
            showForm
              ? "border border-slate-600 bg-transparent text-slate-400 hover:text-slate-200"
              : "bg-orange-500 text-white hover:bg-orange-600"
          }`}>
          {showForm ? "Cancel" : "+ New action item"}
        </button>
      </div>

      {/* Project selector */}
      <div className="bg-[#252540] rounded-2xl border border-slate-700/30 px-5 py-4 flex items-center gap-3">
        <label className="text-sm text-slate-400 shrink-0">Project:</label>
        <select value={selectedProject} onChange={e => handleProjectChange(e.target.value)}
          className="flex-1 rounded-xl border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50">
          <option value="">Select a project…</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>)}
        </select>
      </div>

      {/* Stat tiles */}
      {selectedProject && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total",       value: actionItems.length, bg: "bg-violet-500" },
            { label: "Open",        value: openCount,          bg: "bg-amber-500"  },
            { label: "In progress", value: inProgressCount,    bg: "bg-sky-500"    },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl px-5 py-4`}>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-white/70 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      {showForm && selectedProject && (
        <div className="bg-[#252540] rounded-2xl border border-slate-700/30 p-6 space-y-5">
          <h2 className="text-base font-semibold text-slate-200">New Action Item</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Metric / area of concern", key: "metric_name",         placeholder: "E.g. Schedule Variance" },
              { label: "Owner name",               key: "owner_name",          placeholder: "E.g. John Smith" },
              { label: "Target closure date",      key: "target_closure_date", type: "date" },
            ].map(({ label, key, placeholder, type }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400">{label}</label>
                <input type={type ?? "text"} placeholder={placeholder}
                  value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50" />
              </div>
            ))}
          </div>
          {[
            { label: "Root cause *",        key: "root_cause",        placeholder: "Describe the root cause…" },
            { label: "Corrective action *", key: "corrective_action", placeholder: "Describe the corrective action…" },
          ].map(({ label, key, placeholder }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">{label}</label>
              <textarea rows={3} placeholder={placeholder}
                value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50" />
            </div>
          ))}
          <button type="button" disabled={saving || !form.root_cause.trim() || !form.corrective_action.trim()}
            onClick={handleCreate}
            className="rounded-xl bg-orange-500 text-white px-6 py-2.5 text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 cursor-pointer shadow-sm">
            {saving ? "Saving…" : "Create action item"}
          </button>
        </div>
      )}

      {/* Action items list */}
      {selectedProject && (
        <div className="space-y-3">
          {actionItems.length === 0 ? (
            <div className="bg-[#252540] rounded-2xl border border-dashed border-slate-600 p-10 text-center">
              <p className="text-sm text-slate-400">No action items for this project yet.</p>
            </div>
          ) : actionItems.map(item => {
            const statusCfg: Record<string, { dot: string; pill: string; text: string }> = {
              OPEN:        { dot: "bg-amber-400",   pill: "bg-amber-500/20",   text: "text-amber-300"   },
              IN_PROGRESS: { dot: "bg-sky-400",     pill: "bg-sky-500/20",     text: "text-sky-300"     },
              CLOSED:      { dot: "bg-green-500",   pill: "bg-green-500/20",   text: "text-green-300"   },
              OVERDUE:     { dot: "bg-red-500",     pill: "bg-red-500/20",     text: "text-red-300"     },
            };
            const sc = statusCfg[item.action_status] ?? { dot: "bg-slate-500", pill: "bg-slate-500/20", text: "text-slate-400" };
            return (
              <div key={item.id} className="bg-[#252540] rounded-2xl border border-slate-700/30 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {item.metric_name && (
                      <span className="inline-block rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold px-2.5 py-0.5 mb-2">
                        {item.metric_name}
                      </span>
                    )}
                    <p className="text-sm font-semibold text-slate-200">Root cause: {item.root_cause}</p>
                    <p className="text-sm text-slate-400 mt-1">Action: {item.corrective_action}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                      {item.owner_name && <span>Owner: <span className="text-slate-300 font-medium">{item.owner_name}</span></span>}
                      {item.target_closure_date && <span>Due: <span className="text-slate-300 font-medium">{item.target_closure_date}</span></span>}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-xl ${sc.pill} ${sc.text} text-xs font-semibold px-3 py-1.5`}>
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
