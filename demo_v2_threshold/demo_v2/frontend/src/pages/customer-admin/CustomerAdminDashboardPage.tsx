import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getBusinessUnitHealth,
  getImpactMatrix,
  getPortfolioSummary,
  getSubmissionAging,
} from "../../services/customerAdminService";
import type {
  BusinessUnitHealthRow,
  ImpactMatrixRow,
  PortfolioSummary,
  SubmissionAging,
  AgingProjectDetail,
} from "../../types/customerAdmin";

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function CustomerAdminDashboardPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [buHealth, setBuHealth] = useState<BusinessUnitHealthRow[]>([]);
  const [aging, setAging] = useState<SubmissionAging | null>(null);
  const [impact, setImpact] = useState<ImpactMatrixRow[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<{ title: string; projects: AgingProjectDetail[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getPortfolioSummary(),
      getBusinessUnitHealth(),
      getSubmissionAging(),
      getImpactMatrix(),
    ])
      .then(([s, bu, a, im]) => {
        setSummary(s);
        setBuHealth(bu);
        setAging(a);
        setImpact(im);
      })
      .catch(() => setError("Failed to load portfolio data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-600">Loading portfolio…</p>;
  }

  if (error || !summary || !aging) {
    return <p className="text-sm text-red-600">{error ?? "Failed to load portfolio."}</p>;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Portfolio overview</h1>
      <p className="mt-1 text-sm text-slate-600">
        Organization-wide health across all business units (read-only).
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Total BUs" value={summary.total_business_units} />
        <SummaryCard label="Total projects" value={summary.total_projects} />
        <SummaryCard label="Total submissions" value={summary.total_submissions} />
        <SummaryCard label="Green" value={summary.green_count} />
        <SummaryCard label="Amber" value={summary.amber_count} />
        <SummaryCard label="Red" value={summary.red_count} />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">Business unit health</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">BU name</th>
                <th className="px-4 py-3 font-medium text-slate-700">Delivery Head</th>
                <th className="px-4 py-3 font-medium text-slate-700">Projects</th>
                <th className="px-4 py-3 font-medium text-slate-700">Green</th>
                <th className="px-4 py-3 font-medium text-slate-700">Amber</th>
                <th className="px-4 py-3 font-medium text-slate-700">Red</th>
                <th className="px-4 py-3 font-medium text-slate-700">Health %</th>
                <th className="px-4 py-3 font-medium text-slate-700">Submissions</th>
                <th className="px-4 py-3 font-medium text-slate-700" />
              </tr>
            </thead>
            <tbody>
              {buHealth.map((row) => (
                <tr key={row.business_unit_id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium">{row.business_unit_name}</td>
                  <td className="px-4 py-3 text-slate-600">{row.delivery_head_name ?? "—"}</td>
                  <td className="px-4 py-3">{row.project_count}</td>
                  <td className="px-4 py-3 text-emerald-700">{row.green_count}</td>
                  <td className="px-4 py-3 text-amber-700">{row.amber_count}</td>
                  <td className="px-4 py-3 text-red-700">{row.red_count}</td>
                  <td className="px-4 py-3">
                    {row.health_percent != null ? `${row.health_percent}%` : "—"}
                  </td>
                  <td className="px-4 py-3">{row.submission_count}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/customer-admin/bu/${row.business_unit_id}`}
                      className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      Open details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">Business unit risk summary</h2>
        <p className="mt-1 text-xs text-slate-500">HIGH RISK when red projects exceed 20%</p>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">BU name</th>
                <th className="px-4 py-3 font-medium text-slate-700">Delivery Head</th>
                <th className="px-4 py-3 font-medium text-slate-700">Projects</th>
                <th className="px-4 py-3 font-medium text-slate-700">Red projects</th>
                <th className="px-4 py-3 font-medium text-slate-700">Red %</th>
                <th className="px-4 py-3 font-medium text-slate-700">Escalation</th>
                <th className="px-4 py-3 font-medium text-slate-700" />
              </tr>
            </thead>
            <tbody>
              {buHealth.map((row) => {
                const redPercent = row.project_count > 0 ? Math.round((row.red_count / row.project_count) * 100) : 0;
                const escalationFlag = redPercent > 20;
                return (
                  <tr key={row.business_unit_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3 font-medium">{row.business_unit_name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.delivery_head_name ?? "—"}</td>
                    <td className="px-4 py-3">{row.project_count}</td>
                    <td className="px-4 py-3 text-red-700">{row.red_count}</td>
                    <td className="px-4 py-3">{redPercent}%</td>
                    <td className="px-4 py-3">
                      {escalationFlag ? (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                          HIGH RISK
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/customer-admin/bu/${row.business_unit_id}`}
                        className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                      >
                        Open details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">Submission aging</h2>
        <p className="mt-1 text-xs text-slate-500">Weeks since RAG start date</p>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">0–2 weeks</th>
                <th className="px-4 py-3 font-medium text-slate-700">3–4 weeks</th>
                <th className="px-4 py-3 font-medium text-slate-700">5–8 weeks</th>
                <th className="px-4 py-3 font-medium text-slate-700">8+ weeks</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3">
                  <button 
                    onClick={() => setSelectedBucket({ title: "0–2 weeks", projects: aging.projects_0_2 ?? [] })}
                    className="text-indigo-600 hover:text-indigo-900 font-semibold underline cursor-pointer focus:outline-none"
                    disabled={!aging.weeks_0_2}
                  >
                    {aging.weeks_0_2}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button 
                    onClick={() => setSelectedBucket({ title: "3–4 weeks", projects: aging.projects_3_4 ?? [] })}
                    className="text-indigo-600 hover:text-indigo-900 font-semibold underline cursor-pointer focus:outline-none"
                    disabled={!aging.weeks_3_4}
                  >
                    {aging.weeks_3_4}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button 
                    onClick={() => setSelectedBucket({ title: "5–8 weeks", projects: aging.projects_5_8 ?? [] })}
                    className="text-indigo-600 hover:text-indigo-900 font-semibold underline cursor-pointer focus:outline-none"
                    disabled={!aging.weeks_5_8}
                  >
                    {aging.weeks_5_8}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button 
                    onClick={() => setSelectedBucket({ title: "8+ weeks", projects: aging.projects_8_plus ?? [] })}
                    className="text-indigo-600 hover:text-indigo-900 font-semibold underline cursor-pointer focus:outline-none"
                    disabled={!aging.weeks_8_plus}
                  >
                    {aging.weeks_8_plus}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">Impact matrix</h2>
        <p className="mt-1 text-xs text-slate-500">Count of red dimensions per business unit</p>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">Business unit</th>
                <th className="px-4 py-3 font-medium text-slate-700">Schedule</th>
                <th className="px-4 py-3 font-medium text-slate-700">Quality</th>
                <th className="px-4 py-3 font-medium text-slate-700">Finance</th>
                <th className="px-4 py-3 font-medium text-slate-700">People</th>
              </tr>
            </thead>
            <tbody>
              {impact.map((row) => (
                <tr key={row.business_unit_id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium">{row.business_unit_name}</td>
                  <td className="px-4 py-3">{row.schedule_impact}</td>
                  <td className="px-4 py-3">{row.quality_impact}</td>
                  <td className="px-4 py-3">{row.finance_impact}</td>
                  <td className="px-4 py-3">{row.people_impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedBucket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                  Aging Submissions ({selectedBucket.title})
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Showing projects currently in Amber or Red status with matching duration
                </p>
              </div>
              <button 
                onClick={() => setSelectedBucket(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-medium text-slate-700">Project name</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Business Unit</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Delivery Head</th>
                    <th className="px-4 py-3 font-medium text-slate-700">RAG Status</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Aging Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBucket.projects.map((proj) => (
                    <tr key={proj.project_id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3 font-semibold text-slate-800">{proj.project_name}</td>
                      <td className="px-4 py-3 text-slate-600">{proj.business_unit_name}</td>
                      <td className="px-4 py-3 text-slate-600">{proj.delivery_head_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded border ${
                          proj.rag_status === "RED" 
                            ? "bg-red-50 text-red-700 border-red-200" 
                            : proj.rag_status === "AMBER"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {proj.rag_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {proj.weeks_count} {proj.weeks_count === 1 ? "week" : "weeks"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="border-t border-slate-100 pt-4 mt-4 flex justify-end">
              <button 
                onClick={() => setSelectedBucket(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
