import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  listProjectPhases,
  createProjectPhase,
  updateProjectPhase,
  deleteProjectPhase,
} from "../../services/brdService";
import type { ProjectPhase } from "../../types/brd";

const PHASE_TYPES = ["SPRINT", "RELEASE", "MILESTONE", "OTHER"];
const STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"];

function statusBadge(s: string) {
  const map: Record<string, string> = {
    PLANNED: "bg-slate-100 text-slate-600",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    ON_HOLD: "bg-amber-100 text-amber-700",
  };
  return map[s] ?? "bg-slate-100 text-slate-600";
}

const empty = {
  phase_type: "SPRINT",
  phase_name: "",
  planned_start_date: "",
  planned_end_date: "",
  actual_start_date: "",
  actual_end_date: "",
  status: "PLANNED",
};

export function ProjectPhasesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const load = () => {
    if (!projectId) return;
    setLoading(true);
    listProjectPhases(projectId)
      .then(setPhases)
      .catch(() => setError("Failed to load phases."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [projectId]);

  const handleSave = async () => {
    if (!projectId || !form.phase_name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        phase_type: form.phase_type,
        phase_name: form.phase_name.trim(),
        planned_start_date: form.planned_start_date || null,
        planned_end_date: form.planned_end_date || null,
        actual_start_date: form.actual_start_date || null,
        actual_end_date: form.actual_end_date || null,
        status: form.status,
      };
      if (editId) {
        await updateProjectPhase(projectId, editId, payload);
      } else {
        await createProjectPhase(projectId, payload);
      }
      setShowForm(false);
      setEditId(null);
      setForm(empty);
      load();
    } catch {
      setError("Failed to save phase.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (p: ProjectPhase) => {
    setEditId(p.id);
    setForm({
      phase_type: p.phase_type,
      phase_name: p.phase_name,
      planned_start_date: p.planned_start_date ?? "",
      planned_end_date: p.planned_end_date ?? "",
      actual_start_date: p.actual_start_date ?? "",
      actual_end_date: p.actual_end_date ?? "",
      status: p.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!projectId || !confirm("Delete this phase?")) return;
    try {
      await deleteProjectPhase(projectId, id);
      load();
    } catch {
      setError("Failed to delete phase.");
    }
  };

  return (
    <div>
      <Link to={`/pm/projects/${projectId}`} className="text-sm text-slate-600 hover:text-slate-900">
        ← Back to project
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Project Phases</h1>
        <button
          type="button"
          onClick={() => { setShowForm(true); setEditId(null); setForm(empty); }}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          + Add Phase
        </button>
      </div>

      <p className="mt-1 text-sm text-slate-500">
        Define Sprints, Releases, and Milestones for this project (BRD §5.2.3).
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            {editId ? "Edit Phase" : "New Phase"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phase Type</label>
              <select
                value={form.phase_type}
                onChange={e => setForm(f => ({ ...f, phase_type: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                {PHASE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phase Name *</label>
              <input
                type="text"
                value={form.phase_name}
                onChange={e => setForm(f => ({ ...f, phase_name: e.target.value }))}
                placeholder="e.g. Sprint 1, Release 2"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Planned Start</label>
              <input type="date" value={form.planned_start_date}
                onChange={e => setForm(f => ({ ...f, planned_start_date: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Planned End</label>
              <input type="date" value={form.planned_end_date}
                onChange={e => setForm(f => ({ ...f, planned_end_date: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Actual Start</label>
              <input type="date" value={form.actual_start_date}
                onChange={e => setForm(f => ({ ...f, actual_start_date: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Actual End</label>
              <input type="date" value={form.actual_end_date}
                onChange={e => setForm(f => ({ ...f, actual_end_date: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400">
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" disabled={saving || !form.phase_name.trim()} onClick={handleSave}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer">
              {saving ? "Saving…" : editId ? "Update Phase" : "Create Phase"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Phases Table */}
      {loading ? (
        <div className="mt-6 space-y-2 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-slate-200" />)}
        </div>
      ) : phases.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-500">No phases defined yet. Add a Sprint, Release, or Milestone.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Planned Start</th>
                <th className="px-4 py-3 text-left">Planned End</th>
                <th className="px-4 py-3 text-left">Actual Start</th>
                <th className="px-4 py-3 text-left">Actual End</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {phases.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.phase_type}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{p.phase_name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.planned_start_date ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{p.planned_end_date ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{p.actual_start_date ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{p.actual_end_date ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(p.status)}`}>
                      {p.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleEdit(p)}
                        className="text-xs text-indigo-600 hover:underline cursor-pointer">Edit</button>
                      <button type="button" onClick={() => handleDelete(p.id)}
                        className="text-xs text-red-500 hover:underline cursor-pointer">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
