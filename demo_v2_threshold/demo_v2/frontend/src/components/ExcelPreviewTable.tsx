import React, { useState } from "react";
import type { ExcelImportBatch } from "../types/excel";
import type { MetricDefinition } from "../types/metrics";
import { validateMetricInput } from "../utils/metricValidation";

interface ExcelPreviewTableProps {
  batch: ExcelImportBatch;
  definitions: MetricDefinition[];
  applying: boolean;
  onApply: (editedRows: { metric_code: string; value: string }[]) => void;
  onCancel: () => void;
}

export function ExcelPreviewTable({
  batch,
  definitions,
  applying,
  onApply,
  onCancel,
}: ExcelPreviewTableProps) {
  // Initialize edited values from parsed Excel row values
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const row of batch.rows) {
      initial[row.metric_code] = row.raw_value ?? "";
    }
    return initial;
  });

  const getMetricName = (code: string) => {
    const d = definitions.find((def) => def.code === code);
    return d ? d.name : code;
  };

  const getMetricDimension = (code: string) => {
    const d = definitions.find((def) => def.code === code);
    return d ? d.dimension : "General";
  };

  // Perform dynamic validation depending on user changes
  const getRowErrors = (row: typeof batch.rows[0]): string[] => {
    const currentVal = values[row.metric_code] ?? "";
    // If the value hasn't been changed from original parsed Excel raw value, return original parsed errors.
    if (currentVal === (row.raw_value ?? "")) {
      return row.validation_errors;
    }
    
    // Otherwise, it was edited! Run real-time client-side validation.
    const def = definitions.find((d) => d.code === row.metric_code);
    if (!def) return [];
    if (currentVal.trim() === "") {
      return []; // Draft saving permits blank cells
    }
    const err = validateMetricInput(def, currentVal);
    return err ? [err] : [];
  };

  const handleInputChange = (code: string, val: string) => {
    setValues((prev) => ({ ...prev, [code]: val }));
  };

  const handleApplyClick = () => {
    // Audit all rows first
    const hasAnyErrors = batch.rows.some((r) => getRowErrors(r).length > 0);
    if (hasAnyErrors) {
      alert("Cannot apply metrics. Please resolve the highlighted validation errors first.");
      return;
    }

    // Filter out blank values to support partial draft saving
    const editedPayload = Object.entries(values)
      .filter(([_, val]) => val.trim() !== "")
      .map(([code, val]) => ({
        metric_code: code,
        value: val,
      }));

    if (editedPayload.length === 0) {
      alert("At least one metric value must be entered to apply this spreadsheet.");
      return;
    }

    onApply(editedPayload);
  };

  const totalRows = batch.rows.length;
  const invalidRows = batch.rows.filter((r) => getRowErrors(r).length > 0).length;
  const validRows = totalRows - invalidRows;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
        <div>
          <h3 className="font-bold text-slate-800 text-sm tracking-tight">Excel Import Preview</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Review parsed metrics from <strong>{batch.filename}</strong>. You can correct values inline before applying them.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={applying}
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={applying}
            onClick={handleApplyClick}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white transition cursor-pointer disabled:opacity-60"
          >
            {applying ? "Applying..." : "Apply to Draft"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <div className="rounded-lg border border-slate-150 bg-slate-50/50 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Parsed Rows</p>
          <p className="mt-1 text-xl font-bold text-slate-800">{totalRows}</p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/20 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Valid Metrics</p>
          <p className="mt-1 text-xl font-bold text-emerald-700">{validRows}</p>
        </div>
        <div className="rounded-lg border border-rose-100 bg-rose-50/20 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Invalid Metrics</p>
          <p className="mt-1 text-xl font-bold text-rose-700">{invalidRows}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-700 w-12 text-center">Row</th>
              <th className="px-4 py-3 font-medium text-slate-700">Metric Code</th>
              <th className="px-4 py-3 font-medium text-slate-700">Metric Description</th>
              <th className="px-4 py-3 font-medium text-slate-700">Dimension</th>
              <th className="px-4 py-3 font-medium text-slate-700 w-44">Imported Value</th>
              <th className="px-4 py-3 font-medium text-slate-700 w-24 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {batch.rows.map((row) => {
              const rowErrors = getRowErrors(row);
              const hasErrors = rowErrors.length > 0;
              return (
                <React.Fragment key={row.id}>
                  <tr className={`border-b border-slate-100 hover:bg-slate-50/40 transition-colors ${
                    hasErrors ? "bg-rose-50/10" : ""
                  }`}>
                    <td className="px-4 py-3 text-center font-mono text-xs text-slate-400">
                      {row.row_number}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 text-xs font-mono">
                      {row.metric_code}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {getMetricName(row.metric_code)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 uppercase">
                        {getMetricDimension(row.metric_code)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={values[row.metric_code] ?? ""}
                        onChange={(e) => handleInputChange(row.metric_code, e.target.value)}
                        className={`w-full rounded-md border px-2.5 py-1.5 text-xs focus:outline-none transition ${
                          hasErrors
                            ? "border-rose-300 bg-rose-50/30 focus:border-rose-500 focus:ring-1 focus:ring-rose-200"
                            : "border-slate-300 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-150"
                        }`}
                        placeholder="Empty"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasErrors ? (
                        <span className="inline-flex items-center justify-center rounded-full bg-rose-100 p-1 text-rose-800" title={`${rowErrors.length} validation errors`}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
                          </svg>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 p-1 text-emerald-800">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        </span>
                      )}
                    </td>
                  </tr>
                  
                  {hasErrors && (
                    <tr className="bg-rose-50/10">
                      <td colSpan={6} className="px-4 pb-3 pt-0">
                        <div className="rounded-lg bg-rose-50/50 border border-rose-100 p-2.5 text-xs text-rose-700 font-medium animate-fadeIn">
                          <div className="font-semibold text-[10px] uppercase tracking-wider text-rose-800 mb-1">
                            Validation Failures:
                          </div>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {rowErrors.map((err, idx) => (
                              <li key={idx}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
