import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  listActionItems,
  createActionItem,
  updateActionItemStatus,
  deleteActionItem,
} from "../../services/brdService";
import type { ActionItem } from "../../types/brd";

const STATUSES = ["OPEN", "IN_PROGRESS", "CLOSED"] as const;

function statusBadge(s: string) {
  const m: Record<string, string> = {
    OPEN: "bg-red-100 text-red-700",
    IN_PROGRESS: "bg-amber-100 text-amber-700",
    CLOSED: "bg-emerald-100 text-emerald-700",
  };
  return m[s] ?? "bg-slate-100 text-slate-600";
}

function ragBadge(r: string | null) {
  if (!r) return null;
  const m: Record<string, string> = {
    RED: "bg-red-100 text-red-700",
    AMBER: "bg-amber-100 text-amber-700",
    GREEN: "bg-emerald-100 text-emerald-700",
  };
  return <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${m[r] ?? "bg-slate-100 text-slate-600"}`}>{r}</span>;
}

const emptyForm = {
  metric_name: "",
  rag_status_at_creation: "",
  root_cause: "",
  corrective_action: "",
  owner_name: "",
  target_closure_date: "",
};

export function ActionItemsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = () => {
    if (!projectId) return;
    setLoading(true);
    listActionItems(projectId, overdueOnly)
      .then(setItems)
      .catch(() => setError("Failed to load action items."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [projectId, overdueOnly]);

  const handleCreate = async () => {
    if (!projectId || !form.root_cause.trim() || !form.corrective_action.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createActionItem({
        project_id: projectId,
        root_cause: form.root_cause.trim(),
        corrective_action: form.corrective_action.trim(),
        metric_name: form.metric_name || null,
        rag_status_at_creation: form.rag_status_at_creation || null,
        owner_name: form.owner_name || null,
        target_closure_date: form.target_closure_date || null,
      });
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch {
      setError("Failed to create action item.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (itemId: string, newStatus: string) => {
    setUpdatingId(itemId);
    try {
      await updateActionItemStatus(itemId, { action_status: newStatus });
      load();
    } catch {
      setError("Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Delete this action item?")) return;
    try {
      await deleteActionItem(itemId);
      load();
    } catch {
      setError("Failed to delete action item.");
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <Link to={`/pm/projects/${projectId}`} className="text-sm text-slate-600 hover:text-slate-900">
        ← Back to project
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Action Items</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Log corrective actions for Red / Amber metrics (BRD §8).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)}
              className="rounded border-slate-300" />
            Overdue only
          </label>
          <button type="button" onClick={() => setShowForm(true)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer">
            + New Action Item
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {/* Create form */}
      {showForm && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">New Action Item</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Metric Name</label>
              <input type="text" value={form.metric_name}
                onChange={e => setForm(f => ({ ...f, metric_name: e.target.value }))}
                placeholder="e.g. Test Pass Rate"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">RAG Status</label>
              <select value={form.rag_status_at_creation}
                onChange={e => setForm(f => ({ ...f, rag_status_at_creation: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400">
                <option value="">— Select —</option>
                <option>RED</option>
                <option>AMBER</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Root Cause *</label>
              <textarea value={form.root_cause}
                onChange={e => setForm(f => ({ ...f, root_cause: e.target.value }))}
                rows={2} placeholder="Describe the root cause…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Corrective Action *</label>
              <textarea value={form.corrective_action}
                onChange={e => setForm(f => ({ ...f, corrective_action: e.target.value }))}
                rows={2} placeholder="Describe the corrective action…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Owner</label>
              <input type="text" value={form.owner_name}
                onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))}
                placeholder="Owner name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Closure Date</label>
              <input type="date" value={form.target_closure_date}
                onChange={e => setForm(f => ({ ...f, target_closure_date: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" disabled={saving || !form.root_cause.trim() || !form.corrective_action.trim()}
              onClick={handleCreate}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer">
              {saving ? "Saving…" : "Create Action Item"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Items list */}
      {loading ? (
        <div className="mt-6 space-y-3 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-lg bg-slate-200" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-500">
            {overdueOnly ? "No overdue action items." : "No action items yet. Create one when a metric is Red or Amber."}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map(item => {
            const isOverdue = item.target_closure_date && item.action_status !== "CLOSED" && item.target_closure_date < today;
            return (
              <div key={item.id}
                className={`rounded-lg border bg-white p-4 shadow-sm ${isOverdue ? "border-red-200" : "border-slate-200"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(item.action_status)}`}>
                      {item.action_status.replace("_", " ")}
                    </span>
                    {item.metric_name && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {item.metric_name}
                      </span>
                    )}
                    {ragBadge(item.rag_status_at_creation)}
                    {isOverdue && (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        ⚠ Overdue
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={item.action_status}
                      disabled={updatingId === item.id || item.action_status === "CLOSED"}
                      onChange={e => handleStatusChange(item.id, e.target.value)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none cursor-pointer"
                    >
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <button type="button" onClick={() => handleDelete(item.id)}
                      className="text-xs text-red-500 hover:underline cursor-pointer">Delete</button>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                  <div>
                    <span className="text-xs font-semibold text-slate-500">Root Cause</span>
                    <p className="mt-0.5 text-slate-800">{item.root_cause}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500">Corrective Action</span>
                    <p className="mt-0.5 text-slate-800">{item.corrective_action}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                  {item.owner_name && <span>Owner: <strong className="text-slate-700">{item.owner_name}</strong></span>}
                  {item.created_by_name && (
                    <span>Raised by: <strong className="text-indigo-700">{item.created_by_name}</strong></span>
                  )}
                  {item.target_closure_date && (
                    <span>Target: <strong className={isOverdue ? "text-red-600" : "text-slate-700"}>{item.target_closure_date}</strong></span>
                  )}
                  {item.closed_at && <span>Closed: <strong className="text-emerald-700">{new Date(item.closed_at).toLocaleDateString()}</strong></span>}
                  <span className="text-slate-400">Created {new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
