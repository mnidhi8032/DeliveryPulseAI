/**
 * Delivery Excellence -- QPM Metric Catalog Management
 * Two tabs: Metric Catalog (browse/edit/add) | Pending Requests (approve/reject PM custom metric requests)
 */
import React, { useEffect, useState } from "react";
import { useToast } from "../../contexts/ToastContext";
import { getAllCatalog, createCatalogMetric, updateCatalogMetric } from "../../services/qpmService";
import { listMetricRequests, decideMetricRequest } from "../../services/metricApprovalService";
import type { MetricApprovalRequest } from "../../services/metricApprovalService";
import type { QPMCatalogMetric } from "../../types/qpm";
import { METRIC_CATEGORIES, FREQUENCIES, COMPLIANCE_LABEL } from "../../types/qpm";

const INTENT_OPTIONS = ["Higher the better", "Lower the better", "Nominal the best", "Within Limits", "Not Applicable"];

export function DECatalogPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"catalog" | "requests">("catalog");

  // -- Catalog state
  const [metrics, setMetrics] = useState<QPMCatalogMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editMetric, setEditMetric] = useState<QPMCatalogMetric | null>(null);
  const [saving, setSaving] = useState(false);
  const emptyForm = {
    category: "", name: "", formula: "", uom: "", metrics_type: "Result",
    intent: "Higher the better", project_type: "", delivery_model: "",
    project_category: "", frequency: "Monthly", compliance: "O",
    default_target: "", default_lsl: "", default_usl: "",
  };
  const [form, setForm] = useState(emptyForm);

  // -- Requests state
  const [requests, setRequests] = useState<MetricApprovalRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  // -- Load catalog
  const loadCatalog = () => {
    getAllCatalog().then(setMetrics).catch(() => toast.error("Failed to load catalog")).finally(() => setLoading(false));
  };

  // -- Load requests
  const loadRequests = () => {
    setRequestsLoading(true);
    listMetricRequests().then(setRequests).catch(() => toast.error("Failed to load requests")).finally(() => setRequestsLoading(false));
  };

  useEffect(() => { loadCatalog(); }, []);
  useEffect(() => { if (activeTab === "requests") loadRequests(); }, [activeTab]);

  // -- Catalog handlers
  const openCreate = () => { setEditMetric(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (m: QPMCatalogMetric) => {
    setEditMetric(m);
    setForm({
      category: m.category || "", name: m.name || "", formula: m.formula || "",
      uom: m.uom || "", metrics_type: m.metrics_type || "Result",
      intent: m.intent || "Higher the better", project_type: m.project_type || "",
      delivery_model: m.delivery_model || "", project_category: m.project_category || "",
      frequency: m.frequency || "Monthly", compliance: m.compliance || "O",
      default_target: m.default_target != null ? String(m.default_target) : "",
      default_lsl: m.default_lsl != null ? String(m.default_lsl) : "",
      default_usl: m.default_usl != null ? String(m.default_usl) : "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      default_target: form.default_target !== "" ? parseFloat(form.default_target) : null,
      default_lsl: form.default_lsl !== "" ? parseFloat(form.default_lsl) : null,
      default_usl: form.default_usl !== "" ? parseFloat(form.default_usl) : null,
    };
    try {
      if (editMetric) {
        const updated = await updateCatalogMetric(editMetric.id, payload);
        setMetrics(prev => prev.map(m => m.id === editMetric.id ? updated : m));
        toast.success("Metric updated");
      } else {
        const created = await createCatalogMetric(payload);
        setMetrics(prev => [created, ...prev]);
        toast.success(`"${created.name}" added to catalog`);
      }
      setShowModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save metric");
    } finally { setSaving(false); }
  };

  const handleToggle = async (m: QPMCatalogMetric) => {
    try {
      const updated = await updateCatalogMetric(m.id, { is_active: !m.is_active });
      setMetrics(prev => prev.map(x => x.id === m.id ? updated : x));
      toast.success(`${m.name} ${updated.is_active ? "activated" : "deactivated"}`);
    } catch { toast.error("Failed to update status"); }
  };

  // -- Request handlers
  const handleApprove = async (id: string) => {
    setDecidingId(id);
    try {
      const updated = await decideMetricRequest(id, "APPROVE");
      setRequests(prev => prev.map(r => r.id === id ? updated : r));
      toast.success(`Approved: "${updated.metric_name}" added to the project's KPI plan.`);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to approve");
    } finally { setDecidingId(null); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setDecidingId(rejectModal.id);
    try {
      const updated = await decideMetricRequest(rejectModal.id, "REJECT", rejectComment);
      setRequests(prev => prev.map(r => r.id === rejectModal.id ? updated : r));
      toast.success(`Rejected: "${updated.metric_name}"`);
      setRejectModal(null);
      setRejectComment("");
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to reject");
    } finally { setDecidingId(null); }
  };

  // -- Derived
  const categories = [...new Set(metrics.map(m => m.category).filter(Boolean))].sort();
  const filtered = metrics.filter(m => {
    const matchCat = !catFilter || m.category === catFilter;
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });
  const pendingCount = requests.filter(r => r.status === "PENDING").length;

  if (loading) return <div className="h-64 rounded-xl bg-slate-200 animate-pulse" />;

  return (
    <div className="space-y-5 text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">QPM Metric Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">{metrics.length} metrics total</p>
        </div>
        {activeTab === "catalog" && (
          <button onClick={openCreate} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer">
            + Add Metric
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border border-slate-200 bg-slate-50 p-1 rounded-lg gap-1 w-fit">
        <button type="button" onClick={() => setActiveTab("catalog")}
          className={`px-5 py-2 text-xs font-bold rounded transition ${activeTab === "catalog" ? "bg-white text-slate-900 shadow border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}>
          Metric Catalog
        </button>
        <button type="button" onClick={() => setActiveTab("requests")}
          className={`px-5 py-2 text-xs font-bold rounded transition relative ${activeTab === "requests" ? "bg-indigo-600 text-white shadow" : "text-slate-500 hover:text-slate-800"}`}>
          Pending Requests
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">{pendingCount}</span>
          )}
        </button>
      </div>

      {/* ── PENDING REQUESTS TAB ── */}
      {activeTab === "requests" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Custom Metric Requests from Project Managers</p>
          </div>
          {requestsLoading ? (
            <p className="px-5 py-8 text-sm text-slate-400 text-center">Loading...</p>
          ) : requests.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-400 text-center">No requests yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.map(r => (
                <div key={r.id} className={`p-5 space-y-3 ${r.status === "PENDING" ? "bg-amber-50/30" : ""}`}>
                  <div className="flex items-start gap-3 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">{r.metric_name}</span>
                    {r.metric_category && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 border border-slate-200">{r.metric_category}</span>}
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                      r.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      r.status === "REJECTED" ? "bg-rose-50 text-rose-700 border-rose-200" :
                      "bg-amber-100 text-amber-700 border-amber-300"
                    }`}>{r.status}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Requested by <span className="font-semibold">{r.requested_by_name}</span>
                    {r.project_name && <> for <span className="font-semibold">{r.project_name}</span></>}
                    <span className="ml-2 text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-600">
                    {r.uom && <div><span className="font-bold text-slate-500">UOM:</span> {r.uom}</div>}
                    {r.intent && <div><span className="font-bold text-slate-500">Intent:</span> {r.intent}</div>}
                    {r.frequency && <div><span className="font-bold text-slate-500">Frequency:</span> {r.frequency}</div>}
                    {r.formula && <div className="col-span-2"><span className="font-bold text-slate-500">Formula:</span> {r.formula}</div>}
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-[10px] font-bold text-amber-700 mb-0.5">PM Justification</p>
                    <p className="text-xs text-amber-900">{r.justification}</p>
                  </div>
                  {r.review_comments && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-bold text-slate-500 mb-0.5">Review Comment</p>
                      <p className="text-xs text-slate-700">{r.review_comments}</p>
                    </div>
                  )}
                  {r.status === "PENDING" && (
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(r.id)} disabled={decidingId === r.id}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">
                        {decidingId === r.id ? "Approving..." : "Approve"}
                      </button>
                      <button onClick={() => { setRejectModal({ id: r.id, name: r.metric_name }); setRejectComment(""); }}
                        disabled={decidingId === r.id}
                        className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50 cursor-pointer">
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CATALOG TAB ── */}
      {activeTab === "catalog" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <input type="text" placeholder="Search metric name..." value={search} onChange={e => setSearch(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs w-52 focus:outline-none focus:ring-1 focus:ring-slate-400" />
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            <span className="text-xs text-slate-400 self-center">{filtered.length} metrics</span>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs divide-y divide-slate-100">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wide">
                  <tr>
                    {["Category","Name","Formula","UOM","Intent","Compliance","Target","LSL","USL","Freq","Status",""].map(h => (
                      <th key={h} className="px-3 py-3 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={12} className="px-4 py-8 text-center text-slate-400">No metrics found.</td></tr>
                  ) : filtered.map(m => (
                    <tr key={m.id} className={`hover:bg-slate-50 ${!m.is_active ? "opacity-50" : ""}`}>
                      <td className="px-3 py-2"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 border border-slate-200">{m.category}</span></td>
                      <td className="px-3 py-2 font-semibold text-slate-800 max-w-[160px]"><div className="truncate" title={m.name}>{m.name}</div></td>
                      <td className="px-3 py-2 text-slate-500 max-w-[180px]"><div className="truncate text-[10px]" title={m.formula || ""}>{m.formula || "--"}</div></td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{m.uom || "--"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`text-[9px] font-semibold rounded px-1.5 py-0.5 ${
                          (m.intent||"").toLowerCase().includes("higher") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          (m.intent||"").toLowerCase().includes("lower") ? "bg-rose-50 text-rose-700 border border-rose-200" :
                          "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>{m.intent || "--"}</span>
                      </td>
                      <td className="px-3 py-2">
                        {m.compliance ? (
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                            m.compliance === "M" ? "bg-rose-50 text-rose-700 border-rose-200" :
                            m.compliance === "C" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-slate-100 text-slate-600 border-slate-200"
                          }`}>{COMPLIANCE_LABEL[m.compliance] || m.compliance}</span>
                        ) : "--"}
                      </td>
                      <td className="px-3 py-2 font-mono">{m.default_target ?? 0}</td>
                      <td className="px-3 py-2 font-mono">{m.default_lsl ?? 0}</td>
                      <td className="px-3 py-2 font-mono">{m.default_usl ?? 0}</td>
                      <td className="px-3 py-2 text-slate-500 text-[10px] whitespace-nowrap">{m.frequency ? m.frequency.substring(0, 20) : "--"}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${m.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                          {m.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(m)} className="rounded px-2 py-1 text-[10px] font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer">Edit</button>
                          <button onClick={() => handleToggle(m)}
                            className={`rounded px-2 py-1 text-[10px] font-bold cursor-pointer ${m.is_active ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100" : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"}`}>
                            {m.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Reject confirmation modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reject Request</h3>
            <p className="text-xs text-slate-600">Rejecting: <strong>{rejectModal.name}</strong></p>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700">Reason (optional)</label>
              <textarea value={rejectComment} onChange={e => setRejectComment(e.target.value)} rows={3}
                placeholder="Explain why this request is rejected..."
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setRejectModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button onClick={handleReject} disabled={!!decidingId}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer">
                {decidingId ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit metric modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">{editMetric ? "Edit Metric" : "Add New Metric"}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer text-xs font-bold">[x]</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {([
                  { label: "Category *", key: "category", type: "select", options: METRIC_CATEGORIES },
                  { label: "Metric Name *", key: "name", type: "text", placeholder: "E.g. Effort Variance" },
                  { label: "UOM", key: "uom", type: "text", placeholder: "E.g. %" },
                  { label: "Intent", key: "intent", type: "select", options: INTENT_OPTIONS },
                  { label: "Compliance", key: "compliance", type: "select", options: [["M","Mandatory"],["O","Optional"],["C","Conditional"]] },
                  { label: "Frequency", key: "frequency", type: "select", options: FREQUENCIES },
                  { label: "Default Target", key: "default_target", type: "number" },
                  { label: "Default LSL", key: "default_lsl", type: "number" },
                  { label: "Default USL", key: "default_usl", type: "number" },
                  { label: "Metrics Type", key: "metrics_type", type: "select", options: ["Result","Enabler","Insight"] },
                ] as any[]).map(({ label, key, type, placeholder, options }) => (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-700">{label}</label>
                    {type === "select" ? (
                      <select value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400">
                        <option value="">Select...</option>
                        {(options as any[]).map(o => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input type={type} placeholder={placeholder || ""} value={(form as any)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Formula</label>
                <textarea value={form.formula} onChange={e => setForm(f => ({ ...f, formula: e.target.value }))}
                  rows={2} placeholder="E.g. (Actual / Planned) * 100"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Applicable Project Types (comma-separated)</label>
                <input type="text" value={form.project_type} onChange={e => setForm(f => ({ ...f, project_type: e.target.value }))}
                  placeholder="E.g. Fresh Development,Testing,Migration"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Applicable Delivery Models (comma-separated)</label>
                <input type="text" value={form.delivery_model} onChange={e => setForm(f => ({ ...f, delivery_model: e.target.value }))}
                  placeholder="E.g. Agile-Scrum,Waterfall,Iterative"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
              </div>
              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button type="submit" disabled={saving || !form.name || !form.category}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
                  {saving ? "Saving..." : editMetric ? "Update Metric" : "Add to Catalog"}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
