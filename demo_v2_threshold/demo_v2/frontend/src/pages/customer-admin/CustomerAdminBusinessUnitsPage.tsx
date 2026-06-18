import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBusinessUnitHealth } from "../../services/customerAdminService";
import type { BusinessUnitHealthRow } from "../../types/customerAdmin";

export function CustomerAdminBusinessUnitsPage() {
  const [rows, setRows] = useState<BusinessUnitHealthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBusinessUnitHealth()
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
      <p className="mt-1 text-sm text-slate-600">All business units in your organization (read-only).</p>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-700">Name</th>
              <th className="px-4 py-3 font-medium text-slate-700">Code</th>
              <th className="px-4 py-3 font-medium text-slate-700">Delivery Head</th>
              <th className="px-4 py-3 font-medium text-slate-700">Projects</th>
              <th className="px-4 py-3 font-medium text-slate-700">Health %</th>
              <th className="px-4 py-3 font-medium text-slate-700" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.business_unit_id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium">{row.business_unit_name}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.business_unit_code}</td>
                <td className="px-4 py-3 text-slate-600">{row.delivery_head_name ?? "—"}</td>
                <td className="px-4 py-3">{row.project_count}</td>
                <td className="px-4 py-3">
                  {row.health_percent != null ? `${row.health_percent}%` : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/customer-admin/bu/${row.business_unit_id}`}
                    className="text-sm font-medium text-slate-900 hover:underline"
                  >
                    View details
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
