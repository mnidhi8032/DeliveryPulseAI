/**
 * CEO -- All Business Units read-only view.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listBusinessUnits } from "../../services/businessUnitService";
import type { BusinessUnit } from "../../services/businessUnitService";

export function CEOBusinessUnitsPage() {
  const [bus, setBus] = useState<BusinessUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listBusinessUnits().then(setBus).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-64 rounded-xl bg-slate-200 animate-pulse" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">All Business Units</h1>
        <p className="text-xs text-slate-500 mt-0.5">Read-only -- {bus.length} BU{bus.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full text-sm divide-y divide-slate-100">
          <thead className="bg-slate-50 text-xs text-slate-500 font-semibold uppercase">
            <tr>
              <th className="px-5 py-3 text-left">Code</th>
              <th className="px-5 py-3 text-left">Name</th>
              <th className="px-5 py-3 text-left">Description</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bus.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No business units.</td></tr>
            ) : bus.map((bu) => (
              <tr key={bu.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-mono text-xs text-slate-600">{bu.code}</td>
                <td className="px-5 py-3 font-semibold text-slate-800">{bu.name}</td>
                <td className="px-5 py-3 text-slate-500 max-w-xs truncate">{bu.description || "--"}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${bu.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                    {bu.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <Link to={`/ceo/business-units/${bu.id}`} className="text-xs text-indigo-600 hover:underline">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
