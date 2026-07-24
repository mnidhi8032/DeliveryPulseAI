import { apiClient } from "./apiClient";

export interface MeasureOverride {
  plan_metric_id: string;
  metric_name: string;
  actual_value: number | null;
}

export interface MeasureInfo {
  measure_name: string;
  actual_value: number | null;
  metrics_using: string[];
  metrics_count: number;
  /** Per-metric overrides for this measure — each entry is one metric that
   *  has broken away from the shared default value. */
  overrides: MeasureOverride[];
}

export interface MetricInfo {
  plan_metric_id: string;
  metric_name: string;
  metric_category: string | null;
  lsl: number | null;
  target: number | null;
  usl: number | null;
  required_measures: string[];
  frequency: string | null;
  uom: string | null;
  intent: string | null;
}

export interface HistoryRow {
  measurement_id: string;
  plan_metric_id: string;
  metric_name: string;
  metric_category: string | null;
  frequency_name: string | null;
  from_date: string | null;
  to_date: string | null;
  actual_value: number | null;
  inputs_str: string;
  lsl: number | null;
  target: number | null;
  usl: number | null;
  rag_status: string | null;
  submitted_date: string | null;
  updated_at: string | null;
  analysis_comments: string | null;
}

export interface AllMeasuresResponse {
  period_label: string;
  measures: MeasureInfo[];
  metrics: MetricInfo[];
  history: HistoryRow[];
}

export interface MetricComputeResult {
  plan_metric_id: string;
  metric_name: string;
  metric_category: string | null;
  frequency_name: string;
  actual_value: number | null;
  rag_status: string | null;
  target: number | null;
  lsl: number | null;
  usl: number | null;
  complete: boolean;
  missing_measures: string[];
}

export interface PeriodSaveResponse {
  period_label: string;
  saved_measures: { measure_name: string; actual_value: number | null; updated_at: string }[];
  computed_metrics: MetricComputeResult[];
}

export async function getAllMeasures(
  projectId: string,
  periodLabel: string,
): Promise<AllMeasuresResponse> {
  const { data } = await apiClient.get<AllMeasuresResponse>(
    `/period-measures/projects/${projectId}`,
    { params: { period_label: periodLabel } },
  );
  return data;
}

export async function saveAndCompute(
  projectId: string,
  payload: {
    plan_id: string;
    period_label: string;
    frequency?: string;
    from_date?: string;
    to_date?: string;
    measures: {
      measure_name: string;
      actual_value: number | null;
      /** omit / null = shared default; non-null = per-metric override */
      plan_metric_id?: string | null;
    }[];
    thresholds?: Record<string, { lsl?: string; target?: string; usl?: string }>;
  },
): Promise<PeriodSaveResponse> {
  // Convert threshold string values to numbers for the API
  const apiThresholds: Record<string, Record<string, number | null>> = {};
  if (payload.thresholds) {
    for (const [metricId, t] of Object.entries(payload.thresholds)) {
      apiThresholds[metricId] = {
        lsl:    t.lsl    !== "" && t.lsl    != null ? parseFloat(t.lsl)    : null,
        target: t.target !== "" && t.target != null ? parseFloat(t.target) : null,
        usl:    t.usl    !== "" && t.usl    != null ? parseFloat(t.usl)    : null,
      };
    }
  }
  const { data } = await apiClient.post<PeriodSaveResponse>(
    `/period-measures/projects/${projectId}/save`,
    { ...payload, thresholds: apiThresholds },
  );
  return data;
}
