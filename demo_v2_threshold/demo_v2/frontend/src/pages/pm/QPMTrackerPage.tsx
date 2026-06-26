/**
 * Sheet 3 — KPI Tracker
 * Full table view: all metrics × all periods with RAG, comments, actions.
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { getProject } from "../../services/projectService";
import { getKpiPlan, getTracker, updateMeasurement } from "../../services/qpmService";
import type { Project } from "../../types/project";
import type { KpiTrackerRow } from "../../types/qpm";
import { ACTION_STATUSES } from "../../types/qpm";

const RAG_STYLE: Record<string, string> = {
  GREEN: "bg-emerald-100 text-emerald-800 border-emerald-300",
  AMBER: "bg-amber-100 text-amber-800 border-amber-300",
  RED: "bg-rose-100 text-rose-800 border-rose-300",
};

export function QPMTrackerPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const toast = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [measurements, setMeasurements] = useState<KpiTrackerRow[]>([]);
  const [metricCategoryMap, setMetricCategoryMap] = useState<Record<string, string>>({});
  const [metricIntentMap, setMetricIntentMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<KpiTrackerRow>>({});
  const [ragFilter, setRagFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [search, setSearch] = useState("");

  const load = async (pid: string) => {
    const [proj, p] = await Promise.all([getProject(pid), getKpiPlan(pid)]);
    setProject(proj);
    const catMap: Record<string, string> = {};
    const intentMap: Record<string, string> = {};
    for (const pm of p.metrics) {
      if (pm.metric_category) catMap[pm.id] = pm.metric_category;
      if (pm.intent) intentMap[pm.id] = pm.intent;
    }
    setMetricCategoryMap(catMap);
    setMetricIntentMap(intentMap);
    const m = await getTracker(p.id);
    setMeasurements(m);
  };

  useEffect(() => {
    if (!projectId) return;
    load(projectId).catch(() => toast.error("Failed to load tracker")).finally(() => setLoading(false));
  }, [projectId]);

  const handleEdit = (m: KpiTrackerRow) => {
    setEditRow(m.id);
    setEditForm({
      analysis_comments: m.analysis_comments || "",
      action_taken: m.action_taken || "",
      responsibility: m.responsibility || "",
      action_status: m.action_status || "Open",
    });
  };

  const handleSave = async (id: string) => {
    try {
      const updated = await updateMeasurement(id, {
        analysis_comments: editForm.analysis_comments as string || undefined,
        action_taken: editForm.action_taken as string || undefined,
        responsibility: editForm.responsibility as string || undefined,
        action_status: editForm.action_status as string || undefined,
      });
      // Update local list — merge updated fields
      setMeasurements((prev) => prev.map((m) => m.id === id ? { ...m, analysis_comments: updated.analysis_comments, action_taken: updated.action_taken, responsibility: updated.responsibility, action_status: updated.action_status, rag_status: updated.rag_status } : m));
      setEditRow(null);
      toast.success("Updated");
    } catch { toast.error("Failed to update"); }
  };

  const categories = [...new Set(
    measurements.map((m) => metricCategoryMap[m.plan_metric_id]).filter(Boolean)
  )] as string[];

  const filtered = measurements.filter((m: KpiTrackerRow) => {
    const cat = metricCategoryMap[m.plan_metric_id] || "";
    const matchRag = !ragFilter || m.rag_status === ragFilter;
    const matchCat = !catFilter || cat === catFilter;
    const matchSearch = !search || m.metric.toLowerCase().includes(search.toLowerCase()) || (m.frequency_name || "").toLowerCase().includes(search.toLowerCase());
    return matchRag && matchCat && matchSearch;
  });

  const greenCount = measurements.filter((m) => m.rag_status === "GREEN").length;
  const amberCount = measurements.filter((m) => m.rag_status === "AMBER").length;
  const redCount = measurements.filter((m) => m.rag_status === "RED").length;

  if (loading) return <div className="space-y-4 animate-pulse"><div className="h-8 w-1/3 rounded bg-slate-200" /><div className="h-96 rounded-xl bg-slate-200" /></div>;

  return (
    <div className="space-y-6 text-slate-800">
      <div>
        <Link to={`/pm/projects`} className="text-xs text-slate-500 hover:text-slate-800">Back to My Projects</Link>
        <h1 className="mt-1 text-xl font-bold text-slate-900">KPI Tracker — {project?.project_name}</h1>
        <p className="text-xs text-slate-500">All measurements with RAG status, comments and actions</p>
      </div>

      {/* Summary badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Entries", value: measurements.length, color: "border-slate-200 bg-white" },
          { label: "GREEN", value: greenCount, color: "border-emerald-200 bg-emerald-50" },
          { label: "AMBER", value: amberCount, color: "border-amber-200 bg-amber-50" },
          { label: "RED", value: redCount, color: "border-rose-200 bg-rose-50" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 shadow-sm text-center ${s.color}`}>
            <p className="text-xs font-semibold uppercase text-slate-500">{s.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input type="text" placeholder="Search metric or period…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs w-52 focus:outline-none focus:ring-1 focus:ring-slate-400" />
        <select value={ragFilter} onChange={(e) => setRagFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400">
          <option value="">All RAG</option>
          <option value="GREEN">GREEN</option>
          <option value="AMBER">AMBER</option>
          <option value="RED">RED</option>
        </select>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c!}>{c}</option>)}
        </select>
        <Link to={`/pm/projects/${projectId}/qpm/entry`}
          className="ml-auto rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer">
          + Enter Data
        </Link>
      </div>

      {/* Tracker table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wide">
              <tr>
                {["Metric","Category","Intent","Period","From","To","Actual","UOM","Target","LSL","USL","RAG","Analysis / Comments","Action Taken","Responsibility","Action Status","Updated By",""].map((h) => (
                  <th key={h} className="px-3 py-3 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={18} className="px-4 py-8 text-center text-slate-400">No measurements found.</td></tr>
              ) : filtered.map((m) => (
                <tr key={m.id} className={`hover:bg-slate-50 transition-colors ${m.rag_status === "RED" ? "bg-rose-50/30" : m.rag_status === "AMBER" ? "bg-amber-50/20" : ""}`}>
                  <td className="px-3 py-2 font-semibold text-slate-800 max-w-[160px]"><div className="truncate" title={m.metric}>{m.metric}</div></td>
                  <td className="px-3 py-2"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 border border-slate-200 whitespace-nowrap">{metricCategoryMap[m.plan_metric_id] || "—"}</span></td>
                  <td className="px-3 py-2">
                    {metricIntentMap[m.plan_metric_id] ? (
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold whitespace-nowrap ${
                        (metricIntentMap[m.plan_metric_id] || "").toLowerCase().includes("higher") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        (metricIntentMap[m.plan_metric_id] || "").toLowerCase().includes("lower")  ? "bg-rose-50 text-rose-700 border border-rose-200" :
                        (metricIntentMap[m.plan_metric_id] || "").toLowerCase().includes("nominal") ? "bg-indigo-50 text-indigo-700 border border-indigo-200" :
                        "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {metricIntentMap[m.plan_metric_id]}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{m.frequency_name || "—"}</td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{m.from_date || "—"}</td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{m.to_date || "—"}</td>
                  <td className="px-3 py-2 font-bold text-slate-900">{m.actual_value ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{m.uom || "—"}</td>
                  <td className="px-3 py-2">{m.target != null ? m.target : 0}</td>
                  <td className="px-3 py-2">{m.lsl   != null ? m.lsl   : 0}</td>
                  <td className="px-3 py-2">{m.usl   != null ? m.usl   : 0}</td>
                  <td className="px-3 py-2">
                    {m.rag_status ? (
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${RAG_STYLE[m.rag_status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>{m.rag_status}</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  {editRow === m.id ? (
                    <>
                      <td className="px-3 py-2"><textarea value={editForm.analysis_comments || ""} onChange={(e) => setEditForm((p) => ({ ...p, analysis_comments: e.target.value }))} className="w-44 rounded border border-slate-300 px-2 py-1 text-xs" rows={2} /></td>
                      <td className="px-3 py-2"><textarea value={editForm.action_taken || ""} onChange={(e) => setEditForm((p) => ({ ...p, action_taken: e.target.value }))} className="w-44 rounded border border-slate-300 px-2 py-1 text-xs" rows={2} /></td>
                      <td className="px-3 py-2"><input type="text" value={editForm.responsibility || ""} onChange={(e) => setEditForm((p) => ({ ...p, responsibility: e.target.value }))} className="w-32 rounded border border-slate-300 px-2 py-1 text-xs" /></td>
                      <td className="px-3 py-2">
                        <select value={editForm.action_status || "Open"} onChange={(e) => setEditForm((p) => ({ ...p, action_status: e.target.value }))} className="rounded border border-slate-300 px-2 py-1 text-xs">
                          {ACTION_STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 max-w-[160px] text-slate-600"><div className="line-clamp-2">{m.analysis_comments || "—"}</div></td>
                      <td className="px-3 py-2 max-w-[160px] text-slate-600"><div className="line-clamp-2">{m.action_taken || "—"}</div></td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{m.responsibility || "—"}</td>
                      <td className="px-3 py-2">
                        {m.action_status ? (
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${m.action_status === "Closed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : m.action_status === "In-Progress" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>{m.action_status}</span>
                        ) : "—"}
                      </td>
                    </>
                  )}
                  <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{m.updated_by || "—"}</td>
                  <td className="px-3 py-2">
                    {editRow === m.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleSave(m.id)} className="rounded px-2 py-1 text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer">Save</button>
                        <button onClick={() => setEditRow(null)} className="rounded px-2 py-1 text-[10px] font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => handleEdit(m)} className="rounded px-2.5 py-1 text-[10px] font-bold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 cursor-pointer">Edit</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
