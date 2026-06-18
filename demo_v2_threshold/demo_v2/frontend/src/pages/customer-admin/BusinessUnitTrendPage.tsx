import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getBusinessUnitTrendSummary } from "../../services/customerAdminService";
import type { BUTrendSummaryResponse } from "../../types/customerAdmin";
import { formatStatus, getStatusBadgeClass } from "../../utils/formatters";

export function BusinessUnitTrendPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<BUTrendSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getBusinessUnitTrendSummary(id)
      .then(setData)
      .catch((e: any) => {
        if (e.response?.status === 403) navigate("/unauthorized");
        else setError("Failed to load BU trends.");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <p className="p-4 text-sm text-slate-600">Loading trends…</p>;
  if (error || !data) return <p className="p-4 text-sm text-red-600">{error || "Data not found"}</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <Link to={`/customer-admin/bu/${id}`} className="text-sm text-slate-600 hover:text-slate-900">
          ← Back to BU
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Business Unit Trends</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Aging Changes Card */}
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Submission Aging</h2>
          <div className="space-y-3">
            {data.aging_changes.map((row, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                <span className="text-sm font-medium text-slate-600">{row.category}</span>
                <span className="text-sm font-bold text-slate-900">{row.count}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Red Project Movement Card */}
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Red Project Movement</h2>
          <div className="space-y-3">
            {data.red_project_movement.length === 0 ? (
              <p className="text-sm text-slate-500">No red projects found.</p>
            ) : (
              data.red_project_movement.map((row, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm font-medium text-slate-600">{new Date(row.date).toLocaleDateString()}</span>
                  <span className="text-sm font-bold text-rose-600">{row.red_count} Red</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Health Changes Table */}
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Health Changes (Last 2 Submissions)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-left text-slate-600">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 font-semibold text-slate-900">Project</th>
                <th className="px-6 py-3 font-semibold text-slate-900">Previous Score</th>
                <th className="px-6 py-3 font-semibold text-slate-900">Current Score</th>
                <th className="px-6 py-3 font-semibold text-slate-900">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data.health_changes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-slate-500">
                    Not enough data to calculate health changes.
                  </td>
                </tr>
              ) : (
                data.health_changes.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{row.project_name}</td>
                    <td className="px-6 py-4">{row.previous_score ?? "—"}</td>
                    <td className="px-6 py-4">{row.current_score ?? "—"}</td>
                    <td className="px-6 py-4">
                      {row.trend === "improving" && <span className="text-emerald-600 font-bold">↑ Improving</span>}
                      {row.trend === "declining" && <span className="text-rose-600 font-bold">↓ Declining</span>}
                      {row.trend === "stable" && <span className="text-slate-500 font-bold">→ Stable</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Submissions */}
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Recent Submissions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-left text-slate-600">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 font-semibold text-slate-900">Project</th>
                <th className="px-6 py-3 font-semibold text-slate-900">Date</th>
                <th className="px-6 py-3 font-semibold text-slate-900">Status</th>
                <th className="px-6 py-3 font-semibold text-slate-900">Score</th>
                <th className="px-6 py-3 font-semibold text-slate-900">RAG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data.recent_submissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-slate-500">
                    No recent submissions.
                  </td>
                </tr>
              ) : (
                data.recent_submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{sub.project_name}</td>
                    <td className="px-6 py-4">
                      {sub.submission_date ? new Date(sub.submission_date).toLocaleDateString() : new Date(sub.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded border ${getStatusBadgeClass(sub.status_code)}`}>
                        {formatStatus(sub.status_code)}
                      </span>
                    </td>
                    <td className="px-6 py-4">{sub.overall_score ?? "—"}</td>
                    <td className="px-6 py-4">
                      {sub.rag_status ? (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          sub.rag_status === "GREEN" ? "bg-emerald-100 text-emerald-800" :
                          sub.rag_status === "AMBER" ? "bg-amber-100 text-amber-800" :
                          "bg-rose-100 text-rose-800"
                        }`}>
                          {sub.rag_status}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
