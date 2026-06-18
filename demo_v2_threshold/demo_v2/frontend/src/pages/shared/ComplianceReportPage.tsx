import { useEffect, useState } from "react";
import { getComplianceReport } from "../../services/brdService";
import type { ComplianceReport } from "../../types/brd";

export function ComplianceReportPage() {
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(3);

  const load = (t: number) => {
    setLoading(true);
    setError(null);
    getComplianceReport(t)
      .then(setReport)
      .catch(() => setError("Failed to load compliance report."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(threshold); }, [threshold]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Compliance Report</h1>
      <p className="mt-1 text-sm text-slate-500">
        BRD §5.6.1.2 — PMs who haven't submitted data, and submissions pending review.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <label className="text-sm text-slate-700 font-medium">Review threshold (days):</label>
        <select value={threshold} onChange={e => setThreshold(Number(e.target.value))}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400">
          {[1,2,3,5,7,10,14].map(d => <option key={d} value={d}>{d} days</option>)}
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="mt-6 space-y-3 animate-pulse">
          <div className="h-24 rounded-lg bg-slate-200" />
          <div className="h-24 rounded-lg bg-slate-200" />
        </div>
      ) : report && (
        <>
          {/* Summary cards */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{report.summary.total_pm_non_submissions}</div>
              <div className="mt-1 text-xs text-slate-500 font-medium">Missing PM Submissions</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
              <div className="text-3xl font-bold text-amber-600">{report.summary.overdue_pm_submissions}</div>
              <div className="mt-1 text-xs text-slate-500 font-medium">Overdue Submissions</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
              <div className="text-3xl font-bold text-slate-700">{report.summary.total_pending_reviews}</div>
              <div className="mt-1 text-xs text-slate-500 font-medium">Pending Reviews (&gt;{threshold}d)</div>
            </div>
          </div>

          {/* PM Non-submissions table */}
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              PM Non-submissions ({report.pm_non_submissions.length})
            </h2>
            {report.pm_non_submissions.length === 0 ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                All PMs have submitted for active governance periods.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">PM Name</th>
                      <th className="px-4 py-3 text-left">PM Email</th>
                      <th className="px-4 py-3 text-left">Project</th>
                      <th className="px-4 py-3 text-left">Period</th>
                      <th className="px-4 py-3 text-left">Period End</th>
                      <th className="px-4 py-3 text-right">Days Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.pm_non_submissions.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{row.pm_name}</td>
                        <td className="px-4 py-3 text-slate-600">{row.pm_email}</td>
                        <td className="px-4 py-3 text-slate-700">{row.project_name}</td>
                        <td className="px-4 py-3 text-slate-600">{row.period_name}</td>
                        <td className="px-4 py-3 text-slate-600">{row.period_end}</td>
                        <td className="px-4 py-3 text-right">
                          {row.days_overdue > 0 ? (
                            <span className="font-semibold text-red-600">{row.days_overdue}d overdue</span>
                          ) : (
                            <span className="text-slate-400">Within period</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Pending reviews table */}
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              Pending Reviews — beyond {threshold} days ({report.pending_reviews.length})
            </h2>
            {report.pending_reviews.length === 0 ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                No submissions have been pending review beyond the threshold.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Project</th>
                      <th className="px-4 py-3 text-left">Reviewer</th>
                      <th className="px-4 py-3 text-left">Submitted</th>
                      <th className="px-4 py-3 text-right">Days Pending</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.pending_reviews.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{row.project_name}</td>
                        <td className="px-4 py-3 text-slate-700">{row.reviewer_name} <span className="text-slate-400">({row.reviewer_role})</span></td>
                        <td className="px-4 py-3 text-slate-600">{new Date(row.submitted_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right font-semibold text-amber-600">{row.days_pending}d</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            {row.current_status.replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
