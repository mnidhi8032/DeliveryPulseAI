import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPlatformRiskSummary } from "../../services/platformService";
import type { PlatformRiskRow } from "../../types/platform";

export function PlatformAdminBusinessUnitsPage() {
  const [rows, setRows] = useState<PlatformRiskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlatformRiskSummary()
      .then(setRows)
      .catch(() => setError("Failed to load business units."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-600">Loading…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Business units</h1>
      <p className="mt-1 text-sm text-slate-600">Governance analysis by business unit (read-only).</p>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-700">BU</th>
              <th className="px-4 py-3 font-medium text-slate-700">Red %</th>
              <th className="px-4 py-3 font-medium text-slate-700">Risk</th>
              <th className="px-4 py-3 font-medium text-slate-700" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.business_unit_id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium">{row.business_unit_name}</td>
                <td className="px-4 py-3">{row.red_percent}%</td>
                <td className="px-4 py-3">
                  {row.escalation_flag ? (
                    <span className="text-xs font-medium text-red-700">HIGH RISK</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/platform/bu/${row.business_unit_id}`}
                    className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    Open analysis
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
