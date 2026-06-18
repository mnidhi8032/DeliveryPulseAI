import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { RagBadge } from "../../components/RagBadge";
import { getBusinessUnitDetail } from "../../services/customerAdminService";
import type { BusinessUnitDetail } from "../../types/customerAdmin";
import { formatStatus, getStatusBadgeClass } from "../../utils/formatters";

export function CustomerAdminBUDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<BusinessUnitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getBusinessUnitDetail(id)
      .then(setDetail)
      .catch(() => setError("Failed to load business unit."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="text-sm text-slate-600">Loading…</p>;
  }

  if (error || !detail) {
    return <p className="text-sm text-red-600">{error ?? "Business unit not found."}</p>;
  }

  return (
    <div>
      <Link to="/customer-admin" className="text-sm text-slate-600 hover:text-slate-900">
        ← Back to portfolio
      </Link>

      <h1 className="mt-4 text-xl font-semibold text-slate-900">{detail.business_unit_name}</h1>
      <div className="flex items-center gap-4 mt-1">
        <p className="font-mono text-xs text-slate-500">{detail.business_unit_code}</p>
        <Link to={`/customer-admin/bu/${detail.business_unit_id}/trends`} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          View Trends
        </Link>
      </div>
      {detail.description && (
        <p className="mt-2 text-sm text-slate-600">{detail.description}</p>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Delivery Heads</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {detail.delivery_head_names.length > 0
              ? detail.delivery_head_names.join(", ")
              : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Projects</p>
          <p className="mt-1 text-2xl font-semibold">{detail.project_count}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Submissions</p>
          <p className="mt-1 text-2xl font-semibold">{detail.submission_count}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Health %</p>
          <p className="mt-1 text-2xl font-semibold">
            {detail.health_percent != null ? `${detail.health_percent}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            G {detail.green_count} · A {detail.amber_count} · R {detail.red_count}
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">Projects</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">Code</th>
                <th className="px-4 py-3 font-medium text-slate-700">Name</th>
                <th className="px-4 py-3 font-medium text-slate-700">Account</th>
                <th className="px-4 py-3 font-medium text-slate-700">Status</th>
                <th className="px-4 py-3 font-medium text-slate-700">Submissions</th>
              </tr>
            </thead>
            <tbody>
              {detail.projects.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{p.project_code}</td>
                  <td className="px-4 py-3">{p.project_name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.account_name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded border ${getStatusBadgeClass(p.status)}`}>
                      {formatStatus(p.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">{p.submission_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">Recent submissions</h2>
        {detail.recent_submissions.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No submissions yet.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">Project</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Score</th>
                  <th className="px-4 py-3 font-medium text-slate-700">RAG</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {detail.recent_submissions.map((s) => {
                  // Handle QPM virtual entries (status_code starts with "KPI_")
                  const isQpm = s.status_code.startsWith("KPI_");
                  const qpmState = s.status_code.replace("KPI_", "");
                  const qpmLabel: Record<string, string> = {
                    APPROVED: "KPI Plan ✓ Approved",
                    UNDER_REVIEW: "KPI Plan ⏳ Under Review",
                    REJECTED: "KPI Plan ✗ Rejected",
                  };
                  const qpmBadgeClass: Record<string, string> = {
                    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    UNDER_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
                    REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
                  };

                  return (
                    <tr key={s.id} className={`border-b border-slate-100 last:border-0 ${
                      isQpm && qpmState === "APPROVED" ? "bg-emerald-50/30" :
                      isQpm && qpmState === "REJECTED" ? "bg-rose-50/20" : ""
                    }`}>
                      <td className="px-4 py-3 font-medium text-slate-900">{s.project_name}</td>
                      <td className="px-4 py-3">
                        {isQpm ? (
                          <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded border ${qpmBadgeClass[qpmState] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                            {qpmLabel[qpmState] ?? s.status_code}
                          </span>
                        ) : (
                          <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded border ${getStatusBadgeClass(s.status_code)}`}>
                            {formatStatus(s.status_code)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.overall_score != null ? Number(s.overall_score).toFixed(1) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {s.rag_status ? <RagBadge rag={s.rag_status} /> : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {s.submission_date
                          ? new Date(s.submission_date).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
