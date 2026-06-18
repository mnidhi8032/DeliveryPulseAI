/**
 * Sheet 5 — Document Information
 * Project document header + version history table.
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { getProject } from "../../services/projectService";
import { getDocInfo, saveDocInfo, addVersionHistory } from "../../services/qpmService";
import type { Project } from "../../types/project";
import type { KpiDocInfo } from "../../types/qpm";

export function QPMDocInfoPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const toast = useToast();
  const [_project, setProject] = useState<Project | null>(null);
  const [docInfo, setDocInfo] = useState<KpiDocInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    project_name: "", project_id_code: "", customer_name: "", document_title: "",
    issue_no: "", pm_name: "", issue_date: "", prepared_by: "", preparation_date: "",
    reviewed_by: "", review_date: "", template_version: "3.1",
  });
  const [versionForm, setVersionForm] = useState({
    issue_id: "", issue_date: "", prepared_by: "", reviewed_by: "", description: "",
  });
  const [showVersionForm, setShowVersionForm] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([getProject(projectId), getDocInfo(projectId)])
      .then(([proj, doc]) => {
        setProject(proj);
        setDocInfo(doc);
        setForm({
          project_name: doc.project_name || proj.project_name || "",
          project_id_code: doc.project_id_code || proj.project_code || "",
          customer_name: doc.customer_name || proj.account_name || "",
          document_title: doc.document_title || "",
          issue_no: doc.issue_no || "1.0",
          pm_name: doc.pm_name || proj.project_manager_name || "",
          issue_date: doc.issue_date || "",
          prepared_by: doc.prepared_by || "",
          preparation_date: doc.preparation_date || "",
          reviewed_by: doc.reviewed_by || "",
          review_date: doc.review_date || "",
          template_version: doc.template_version || "3.1",
        });
      })
      .catch(() => toast.error("Failed to load document info"))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await saveDocInfo(projectId!, form);
      setDocInfo(updated);
      toast.success("Document information saved");
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const handleAddVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docInfo) return;
    try {
      const newRow = await addVersionHistory(docInfo.id, versionForm);
      setDocInfo((prev) => prev ? { ...prev, version_history: [...prev.version_history, newRow] } : prev);
      setVersionForm({ issue_id: "", issue_date: "", prepared_by: "", reviewed_by: "", description: "" });
      setShowVersionForm(false);
      toast.success("Version history entry added");
    } catch { toast.error("Failed to add version"); }
  };

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 w-1/3 rounded bg-slate-200" /><div className="h-64 rounded-xl bg-slate-200" /></div>;

  return (
    <div className="space-y-6 text-slate-800 max-w-4xl">
      <div>
        <Link to={`/pm/projects/${projectId}/qpm`} className="text-xs text-slate-500 hover:text-slate-800">← KPI Plan</Link>
        <h1 className="mt-1 text-xl font-bold text-slate-900">Document Information</h1>
        <p className="text-xs text-slate-500">Template Version {form.template_version} — QPM Plan Document</p>
      </div>

      {/* Doc Info form */}
      <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Project & Document Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Project Name", key: "project_name", type: "text" },
            { label: "Project ID", key: "project_id_code", type: "text" },
            { label: "Customer Name", key: "customer_name", type: "text" },
            { label: "Document Title", key: "document_title", type: "text" },
            { label: "Document Issue No.", key: "issue_no", type: "text" },
            { label: "Template Version", key: "template_version", type: "text" },
            { label: "Project Manager", key: "pm_name", type: "text" },
            { label: "Issue Date", key: "issue_date", type: "date" },
            { label: "Prepared By", key: "prepared_by", type: "text" },
            { label: "Preparation Date", key: "preparation_date", type: "date" },
            { label: "Reviewed By", key: "reviewed_by", type: "text" },
            { label: "Review Date", key: "review_date", type: "date" },
          ].map(({ label, key, type }) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">{label}</label>
              <input type={type} value={(form as any)[key] || ""}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="rounded-lg bg-slate-900 px-6 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer">
            {saving ? "Saving…" : "Save Document Info"}
          </button>
        </div>
      </form>

      {/* Version History */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Document Version History</h2>
          <button onClick={() => setShowVersionForm((v) => !v)}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer">
            + Add Row
          </button>
        </div>

        {showVersionForm && (
          <form onSubmit={handleAddVersion} className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Issue ID", key: "issue_id", type: "text", placeholder: "v1.0" },
                { label: "Issue Date", key: "issue_date", type: "date", placeholder: "" },
                { label: "Prepared By", key: "prepared_by", type: "text", placeholder: "Name" },
                { label: "Reviewed & Approved By", key: "reviewed_by", type: "text", placeholder: "Name" },
                { label: "Description", key: "description", type: "text", placeholder: "Changes made…" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">{label}</label>
                  <input type={type} value={(versionForm as any)[key] || ""} placeholder={placeholder}
                    onChange={(e) => setVersionForm((p) => ({ ...p, [key]: e.target.value }))}
                    className="rounded border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <button type="submit" className="rounded px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer">Add</button>
              <button type="button" onClick={() => setShowVersionForm(false)} className="rounded px-3 py-1.5 text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer">Cancel</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 font-semibold uppercase tracking-wide">
              <tr>
                {["Issue ID", "Issue Date", "Prepared By", "Reviewed & Approved By", "Description"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(docInfo?.version_history || []).length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-xs">No version history yet.</td></tr>
              ) : (
                docInfo?.version_history.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600">{v.issue_id || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{v.issue_date || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{v.prepared_by || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{v.reviewed_by || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{v.description || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
