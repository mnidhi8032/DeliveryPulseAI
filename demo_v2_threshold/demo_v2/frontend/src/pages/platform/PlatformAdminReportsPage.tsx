import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getPlatformOverview,
  getPlatformRiskSummary,
  getPlatformApprovalLatency,
  getPlatformTemplateAdoption,
} from "../../services/platformService";
import type {
  PlatformOverview,
  PlatformRiskRow,
  PlatformApprovalLatencyRow,
  PlatformTemplateAdoptionRow,
} from "../../types/platform";

function StatCard({ label, value, sub, color = "text-slate-900" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function PlatformAdminReportsPage() {
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [risk, setRisk] = useState<PlatformRiskRow[]>([]);
  const [latency, setLatency] = useState<PlatformApprovalLatencyRow[]>([]);
  const [adoption, setAdoption] = useState<PlatformTemplateAdoptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPlatformOverview(),
      getPlatformRiskSummary(),
      getPlatformApprovalLatency(),
      getPlatformTemplateAdoption(),
    ])
      .then(([ov, rs, lat, adp]) => {
        setOverview(ov);
        setRisk(rs);
        setLatency(lat);
        setAdoption(adp);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-1/4 rounded bg-slate-200" />
      <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-slate-200" />)}</div>
      <div className="h-64 rounded-xl bg-slate-200" />
    </div>
  );

  return (
    <div className="space-y-8 text-slate-800">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Governance Reports</h1>
        <p className="mt-1 text-sm text-slate-500">Live governance metrics across the entire platform.</p>
      </div>

      {/* Summary stats */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Projects" value={overview.total_projects} />
          <StatCard label="Total Submissions" value={overview.total_submissions} />
          <StatCard label="Green Projects" value={`${overview.green_percent.toFixed(1)}%`} color="text-emerald-700" sub={`${overview.green_count} projects`} />
          <StatCard label="Red / Amber Projects" value={`${(overview.red_percent + overview.amber_percent).toFixed(1)}%`} color="text-rose-700" sub={`${overview.red_count + overview.amber_count} at risk`} />
        </div>
      )}

      {/* Risk Summary */}
      {risk.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Business Unit Risk Summary</h2>
            <Link to="/platform/business-units" className="text-xs text-indigo-600 hover:underline font-semibold">View all →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 font-semibold uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left">Business Unit</th>
                  <th className="px-5 py-3 text-left">Delivery Head</th>
                  <th className="px-5 py-3 text-left">Projects</th>
                  <th className="px-5 py-3 text-left">Red / Critical</th>
                  <th className="px-5 py-3 text-left">Risk %</th>
                  <th className="px-5 py-3 text-left">Alert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {risk.map((r) => (
                  <tr key={r.business_unit_id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-slate-800">{r.business_unit_name}</td>
                    <td className="px-5 py-3 text-slate-600">{r.delivery_head_name || "—"}</td>
                    <td className="px-5 py-3">{r.project_count}</td>
                    <td className="px-5 py-3 font-bold text-rose-700">{r.red_projects}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full bg-slate-200 overflow-hidden">
                          <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.min(r.red_percent, 100)}%` }} />
                        </div>
                        <span className="text-xs font-semibold">{r.red_percent.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {r.escalation_flag ? (
                        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold border bg-rose-100 text-rose-800 border-rose-200">⚠ HIGH RISK</span>
                      ) : (
                        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approval Latency + Template Adoption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {latency.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Approval Latency by BU</h2>
              <p className="text-xs text-slate-400 mt-0.5">Average days from submission to approval</p>
            </div>
            <div className="divide-y divide-slate-100">
              {latency.map((l) => (
                <div key={l.business_unit_id} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm font-medium text-slate-700 truncate max-w-[140px]">{l.business_unit_name}</span>
                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-shrink-0">
                    <span>Avg <b className="text-slate-800">{l.average_approval_days?.toFixed(1) ?? "—"}d</b></span>
                    <span>Min <b className="text-slate-800">{l.min_approval_days ?? "—"}d</b></span>
                    <span>Max <b className="text-slate-800">{l.max_approval_days ?? "—"}d</b></span>
                    <span className="text-slate-400">({l.sample_count} samples)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {adoption.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Template Adoption by BU</h2>
              <p className="text-xs text-slate-400 mt-0.5">Manual vs Excel upload submissions</p>
            </div>
            <div className="divide-y divide-slate-100">
              {adoption.map((a) => {
                const pct = a.adoption_percent ?? 0;
                return (
                  <div key={a.business_unit_id} className="px-5 py-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 truncate max-w-[140px]">{a.business_unit_name}</span>
                      <span className="text-slate-400 flex-shrink-0">{a.excel_submissions} Excel / {a.manual_submissions} Manual</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-indigo-700 flex-shrink-0">{pct.toFixed(0)}% Excel</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quick navigation */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 mb-3">Quick Navigation</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Governance Dashboard", to: "/platform" },
            { label: "Business Unit Analysis", to: "/platform/business-units" },
            { label: "Platform Settings", to: "/platform/settings" },
          ].map((l) => (
            <Link key={l.to} to={l.to}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors">
              {l.label} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
