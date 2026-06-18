import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getPlatformApprovalLatency,
  getPlatformOverview,
  getPlatformRiskSummary,
  getPlatformTemplateAdoption,
} from "../../services/platformService";
import type {
  PlatformApprovalLatencyRow,
  PlatformOverview,
  PlatformRiskRow,
  PlatformTemplateAdoptionRow,
} from "../../types/platform";

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function PlatformAdminDashboardPage() {
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [risk, setRisk] = useState<PlatformRiskRow[]>([]);
  const [latency, setLatency] = useState<PlatformApprovalLatencyRow[]>([]);
  const [adoption, setAdoption] = useState<PlatformTemplateAdoptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getPlatformOverview(),
      getPlatformRiskSummary(),
      getPlatformApprovalLatency(),
      getPlatformTemplateAdoption(),
    ])
      .then(([o, r, l, a]) => {
        setOverview(o);
        setRisk(r);
        setLatency(l);
        setAdoption(a);
      })
      .catch(() => setError("Failed to load governance data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-600">Loading governance overview…</p>;
  }

  if (error || !overview) {
    return <p className="text-sm text-red-600">{error ?? "Failed to load data."}</p>;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Governance overview</h1>
      <p className="mt-1 text-sm text-slate-600">
        Sonata governance team — organization-wide health (read-only).
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <SummaryCard label="Total customers" value={overview.total_customers} />
        <SummaryCard label="Business units" value={overview.total_business_units} />
        <SummaryCard label="Projects" value={overview.total_projects} />
        <SummaryCard label="Submissions" value={overview.total_submissions} />
        <SummaryCard label="Green %" value={`${overview.green_percent}%`} />
        <SummaryCard label="Amber %" value={`${overview.amber_percent}%`} />
        <SummaryCard label="Red %" value={`${overview.red_percent}%`} />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">Business unit risk summary</h2>
        <p className="mt-1 text-xs text-slate-500">HIGH RISK when red projects exceed 20%</p>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">BU</th>
                <th className="px-4 py-3 font-medium text-slate-700">Delivery Head</th>
                <th className="px-4 py-3 font-medium text-slate-700">Projects</th>
                <th className="px-4 py-3 font-medium text-slate-700">Red projects</th>
                <th className="px-4 py-3 font-medium text-slate-700">Red %</th>
                <th className="px-4 py-3 font-medium text-slate-700">Escalation</th>
                <th className="px-4 py-3 font-medium text-slate-700" />
              </tr>
            </thead>
            <tbody>
              {risk.map((row) => (
                <tr key={row.business_unit_id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium">{row.business_unit_name}</td>
                  <td className="px-4 py-3 text-slate-600">{row.delivery_head_name ?? "—"}</td>
                  <td className="px-4 py-3">{row.project_count}</td>
                  <td className="px-4 py-3 text-red-700">{row.red_projects}</td>
                  <td className="px-4 py-3">{row.red_percent}%</td>
                  <td className="px-4 py-3">
                    {row.escalation_flag ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                        HIGH RISK
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/platform/bu/${row.business_unit_id}`}
                      className="text-xs font-medium text-slate-900 hover:underline"
                    >
                      Analyze
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">Approval latency</h2>
        <p className="mt-1 text-xs text-slate-500">Days from submit to approve (where recorded)</p>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">BU</th>
                <th className="px-4 py-3 font-medium text-slate-700">Average days</th>
                <th className="px-4 py-3 font-medium text-slate-700">Min</th>
                <th className="px-4 py-3 font-medium text-slate-700">Max</th>
                <th className="px-4 py-3 font-medium text-slate-700">Samples</th>
              </tr>
            </thead>
            <tbody>
              {latency.map((row) => (
                <tr key={row.business_unit_id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium">{row.business_unit_name}</td>
                  <td className="px-4 py-3">
                    {row.average_approval_days != null ? row.average_approval_days : "—"}
                  </td>
                  <td className="px-4 py-3">{row.min_approval_days ?? "—"}</td>
                  <td className="px-4 py-3">{row.max_approval_days ?? "—"}</td>
                  <td className="px-4 py-3">{row.sample_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">Template adoption</h2>
        <p className="mt-1 text-xs text-slate-500">Excel import vs manual submissions per BU</p>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">BU</th>
                <th className="px-4 py-3 font-medium text-slate-700">Manual</th>
                <th className="px-4 py-3 font-medium text-slate-700">Excel</th>
                <th className="px-4 py-3 font-medium text-slate-700">Adoption %</th>
              </tr>
            </thead>
            <tbody>
              {adoption.map((row) => (
                <tr key={row.business_unit_id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium">{row.business_unit_name}</td>
                  <td className="px-4 py-3">{row.manual_submissions}</td>
                  <td className="px-4 py-3">{row.excel_submissions}</td>
                  <td className="px-4 py-3">
                    {row.adoption_percent != null ? `${row.adoption_percent}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
