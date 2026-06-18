import type { MetricDefinition } from "../types/metrics";
import { DIMENSION_ORDER } from "../constants/dimensions";
import { inputModeForDataType, validateMetricInput } from "../utils/metricValidation";

interface MetricDimensionFormProps {
  definitions: MetricDefinition[];
  values: Record<string, string>;
  errors: Record<string, string>;
  readOnly: boolean;
  onChange: (code: string, value: string) => void;
}

export function MetricDimensionForm({
  definitions,
  values,
  errors,
  readOnly,
  onChange,
}: MetricDimensionFormProps) {
  const byDimension = DIMENSION_ORDER.map((dim) => ({
    dimension: dim,
    metrics: definitions.filter((d) => d.dimension === dim),
  })).filter((g) => g.metrics.length > 0);

  return (
    <div className="space-y-6">
      {byDimension.map(({ dimension, metrics }) => (
        <section key={dimension} className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">{dimension}</h3>
          <div className="mt-4 space-y-4">
            {metrics.map((def) => {
              const err = errors[def.code];
              const hint =
                def.data_type === "decimal" && def.validation_rules?.max === 100
                  ? "0–100"
                  : def.data_type === "integer"
                    ? "Whole number"
                    : def.data_type === "currency"
                      ? "Amount"
                      : undefined;

              return (
                <div key={def.code}>
                  <label htmlFor={def.code} className="block text-sm font-medium text-slate-700">
                    {def.name}
                    <span className="ml-1 font-normal text-slate-400">({def.code})</span>
                  </label>
                  {def.description && (
                    <p className="text-xs text-slate-500">{def.description}</p>
                  )}
                  <input
                    id={def.code}
                    type="number"
                    inputMode={inputModeForDataType(def.data_type)}
                    step={def.data_type === "integer" ? 1 : "any"}
                    disabled={readOnly}
                    value={values[def.code] ?? ""}
                    onChange={(e) => onChange(def.code, e.target.value)}
                    className={`mt-1 w-full max-w-md rounded border px-3 py-2 text-sm ${
                      readOnly ? "bg-slate-50 text-slate-600" : "border-slate-300"
                    } ${err ? "border-red-400" : ""}`}
                  />
                  {hint && !err && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
                  {err && <p className="mt-0.5 text-xs text-red-600">{err}</p>}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function buildMetricPayload(
  definitions: MetricDefinition[],
  values: Record<string, string>,
  options?: { draftMode?: boolean },
): { metrics: { metric_code: string; value: number }[]; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const metrics: { metric_code: string; value: number }[] = [];
  const draftMode = options?.draftMode ?? false;

  for (const def of definitions) {
    const raw = values[def.code] ?? "";
    if (draftMode && raw.trim() === "") {
      continue;
    }
    const err = validateMetricInput(def, raw);
    if (err) {
      errors[def.code] = err;
      continue;
    }
    metrics.push({
      metric_code: def.code,
      value: Number(raw),
    });
  }

  if (draftMode && metrics.length === 0 && Object.keys(errors).length === 0) {
    errors._form = "Enter at least one metric value to save the draft.";
  }

  return { metrics, errors };
}
