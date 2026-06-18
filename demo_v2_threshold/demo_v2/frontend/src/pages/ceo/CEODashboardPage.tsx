/**
 * CEO Dashboard -- read-only view across all BUs and projects.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listBusinessUnits } from "../../services/businessUnitService";
import type { BusinessUnit } from "../../services/businessUnitService";

export function CEODashboardPage() {
  const [bus, setBus] = useState<BusinessUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listBusinessUnits()
      .then(setBus)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-1/3 rounded bg-slate-200" />
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-slate-200" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">CEO Dashboard</h1>
        <p className="text-xs text-slate-500 mt-0.5">Organisation-wide overview -- all Business Units</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Business Units</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{bus.length}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">All Business Units</p>
        </div>
        {bus.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400 text-center">No business units found.</p>
        ) : (
          <table className="min-w-full text-sm divide-y divide-slate-100">
            <thead className="bg-slate-50 text-xs text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Code</th>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bus.map((bu) => (
                <tr key={bu.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-xs text-slate-600">{bu.code}</td>
                  <td className="px-5 py-3 font-semibold text-slate-800">{bu.name}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${bu.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                      {bu.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <Link to={`/ceo/business-units/${bu.id}`} className="text-xs text-indigo-600 hover:underline font-medium">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
