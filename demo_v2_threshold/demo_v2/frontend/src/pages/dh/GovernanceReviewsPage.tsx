import { useEffect, useState } from "react";
import {
  listGovernanceReviews,
  createGovernanceReview,
  updateGovernanceReview,
} from "../../services/brdService";
import type { GovernanceReview } from "../../types/brd";

const LEVELS = ["BU", "ACCOUNT", "PROJECT"];
const STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED"];

function statusBadge(s: string) {
  const m: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-slate-100 text-slate-500",
  };
  return m[s] ?? "bg-slate-100 text-slate-600";
}

const emptyForm = {
  review_level: "PROJECT",
  review_date: "",
  review_title: "",
  outcome_comments: "",
  project_id: "",
  account_id: "",
  business_unit_id: "",
  status: "SCHEDULED",
};

export function GovernanceReviewsPage() {
  const [reviews, setReviews] = useState<GovernanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [outcomeEditId, setOutcomeEditId] = useState<string | null>(null);
  const [outcomeText, setOutcomeText] = useState("");
  const [outcomeStatus, setOutcomeStatus] = useState("COMPLETED");

  const load = () => {
    setLoading(true);
    listGovernanceReviews()
      .then(setReviews)
      .catch(() => setError("Failed to load reviews."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSave = async () => {
    if (!form.review_date || !form.review_title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        review_level: form.review_level,
        review_date: form.review_date,
        review_title: form.review_title.trim(),
        outcome_comments: form.outcome_comments || null,
        project_id: form.project_id || null,
        account_id: form.account_id || null,
        business_unit_id: form.business_unit_id || null,
        status: form.status,
      };
      if (editId) {
        await updateGovernanceReview(editId, {
          review_title: payload.review_title,
          outcome_comments: payload.outcome_comments ?? undefined,
          status: payload.status,
        });
      } else {
        await createGovernanceReview(payload);
      }
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      load();
    } catch {
      setError("Failed to save review.");
    } finally {
      setSaving(false);
    }
  };

  const handleOutcomeSave = async (id: string) => {
    try {
      await updateGovernanceReview(id, { outcome_comments: outcomeText, status: outcomeStatus });
      setOutcomeEditId(null);
      load();
    } catch {
      setError("Failed to update outcome.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Governance Reviews</h1>
          <p className="mt-1 text-sm text-slate-500">BRD §5.5.2 — Reviews at BU, Account, or Project level.</p>
        </div>
        <button type="button" onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer">
          + Schedule Review
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {/* Schedule form */}
      {showForm && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">{editId ? "Edit Review" : "Schedule Review"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Review Level</label>
              <select value={form.review_level} onChange={e => setForm(f => ({ ...f, review_level: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400">
                {LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Review Date *</label>
              <input type="date" value={form.review_date}
                onChange={e => setForm(f => ({ ...f, review_date: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Review Title *</label>
              <input type="text" value={form.review_title}
                onChange={e => setForm(f => ({ ...f, review_title: e.target.value }))}
                placeholder="e.g. Monthly BU Governance Review — June 2026"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Outcome Comments</label>
              <textarea value={form.outcome_comments}
                onChange={e => setForm(f => ({ ...f, outcome_comments: e.target.value }))}
                rows={2} placeholder="Outcome of the governance review…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400">
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" disabled={saving || !form.review_date || !form.review_title.trim()}
              onClick={handleSave}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer">
              {saving ? "Saving…" : editId ? "Update" : "Schedule"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="mt-6 space-y-3 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-slate-200" />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-500">No governance reviews scheduled yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(r.status)}`}>
                      {r.status}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-semibold">
                      {r.review_level}
                    </span>
                    <span className="text-xs text-slate-500">{r.review_date}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{r.review_title}</p>
                  {r.outcome_comments && (
                    <p className="mt-1 text-sm text-slate-600">{r.outcome_comments}</p>
                  )}
                </div>
                <button type="button"
                  onClick={() => { setOutcomeEditId(r.id); setOutcomeText(r.outcome_comments ?? ""); setOutcomeStatus(r.status); }}
                  className="text-xs text-indigo-600 hover:underline cursor-pointer shrink-0">
                  Update Outcome
                </button>
              </div>

              {outcomeEditId === r.id && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Outcome Comments</label>
                  <textarea value={outcomeText} onChange={e => setOutcomeText(e.target.value)} rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
                  <div className="mt-2 flex items-center gap-3">
                    <select value={outcomeStatus} onChange={e => setOutcomeStatus(e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400">
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <button type="button" onClick={() => handleOutcomeSave(r.id)}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800 cursor-pointer">
                      Save
                    </button>
                    <button type="button" onClick={() => setOutcomeEditId(null)}
                      className="text-sm text-slate-500 hover:underline cursor-pointer">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
