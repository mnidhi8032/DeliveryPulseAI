import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { RagBadge } from "../../components/RagBadge";
import { getPlatformBUAnalysis } from "../../services/platformService";
import type { PlatformBUAnalysis } from "../../types/platform";

export function PlatformAdminBUAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<PlatformBUAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getPlatformBUAnalysis(id)
      .then(setDetail)
      .catch(() => setError("Failed to load business unit analysis."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="text-sm text-slate-600">Loading analysis…</p>;
  }

  if (error || !detail) {
    return <p className="text-sm text-red-600">{error ?? "Business unit not found."}</p>;
  }

  return (
    <div>
      <Link to="/platform" className="text-sm text-slate-600 hover:text-slate-900">
        ← Back to governance dashboard
      </Link>

      <h1 className="mt-4 text-xl font-semibold text-slate-900">{detail.business_unit_name}</h1>
      <p className="mt-1 font-mono text-xs text-slate-500">{detail.business_unit_code}</p>
      {detail.description && (
        <p className="mt-2 text-sm text-slate-600">{detail.description}</p>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Delivery Heads</p>
          <p className="mt-1 text-sm font-medium">
            {detail.delivery_head_names.length > 0
              ? detail.delivery_head_names.join(", ")
              : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Projects / Submissions</p>
          <p className="mt-1 text-2xl font-semibold">
            {detail.project_count} / {detail.submission_count}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Health %</p>
          <p className="mt-1 text-2xl font-semibold">
            {detail.health_percent != null ? `${detail.health_percent}%` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">RAG (submissions)</p>
          <p className="mt-1 text-sm">
            G {detail.green_count} · A {detail.amber_count} · R {detail.red_count}
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">Submission trends</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">Status</th>
                <th className="px-4 py-3 font-medium text-slate-700">Count</th>
              </tr>
            </thead>
            <tbody>
              {detail.submission_trends.map((t) => (
                <tr key={t.status_code} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">{t.status_code}</td>
                  <td className="px-4 py-3">{t.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">Recent approvals</h2>
        {detail.recent_approvals.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No approved submissions yet.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">Project</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Score</th>
                  <th className="px-4 py-3 font-medium text-slate-700">RAG</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Approved</th>
                </tr>
              </thead>
              <tbody>
                {detail.recent_approvals.map((a) => (
                  <tr key={a.submission_id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">{a.project_name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                        {a.status_code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.overall_score != null ? Number(a.overall_score).toFixed(1) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {a.rag_status ? <RagBadge rag={a.rag_status} /> : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {a.approval_date
                        ? new Date(a.approval_date).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
