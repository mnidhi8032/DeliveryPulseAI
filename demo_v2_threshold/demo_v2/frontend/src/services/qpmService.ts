import { apiClient } from "./apiClient";
import type {
  KpiMeasureEntry, KpiMeasurement, KpiPlan, KpiPlanMetric,
  KpiSummary, KpiTrackerRow, QPMCatalogMetric, KpiDocInfo,
  KpiDocVersionHistory,
} from "../types/qpm";

export async function getCatalog(params?: { category?: string; project_type?: string; delivery_model?: string }): Promise<QPMCatalogMetric[]> {
  const { data } = await apiClient.get<QPMCatalogMetric[]>("/qpm/catalog", { params });
  return data;
}

export async function getAllCatalog(): Promise<QPMCatalogMetric[]> {
  const { data } = await apiClient.get<QPMCatalogMetric[]>("/qpm/catalog/all");
  return data;
}

export async function createCatalogMetric(payload: {
  category: string; name: string; formula?: string; uom?: string;
  metrics_type?: string; intent?: string; project_type?: string;
  delivery_model?: string; project_category?: string; frequency?: string;
  compliance?: string; default_target?: number | null;
  default_lsl?: number | null; default_usl?: number | null;
}): Promise<QPMCatalogMetric> {
  const { data } = await apiClient.post<QPMCatalogMetric>("/qpm/catalog", payload);
  return data;
}

export async function updateCatalogMetric(metricId: string, payload: Partial<{
  category: string; name: string; formula: string; uom: string;
  metrics_type: string; intent: string; project_type: string;
  delivery_model: string; project_category: string; frequency: string;
  compliance: string; default_target: number | null;
  default_lsl: number | null; default_usl: number | null; is_active: boolean;
}>): Promise<QPMCatalogMetric> {
  const { data } = await apiClient.patch<QPMCatalogMetric>(`/qpm/catalog/${metricId}`, payload);
  return data;
}

export async function getMetricMeasures(metricName: string): Promise<string[]> {
  // Use query param to avoid URL-encoding issues with special chars like % in metric names
  const { data } = await apiClient.get<{ required_measures: string[] }>("/qpm/catalog/measures", {
    params: { metric_name: metricName }
  });
  return data.required_measures;
}

export async function getKpiPlan(projectId: string): Promise<KpiPlan> {
  const { data } = await apiClient.get<KpiPlan>(`/qpm/plans/by-project/${projectId}`);
  return data;
}

export async function updateKpiPlanConfig(planId: string, payload: Partial<{ project_type: string; delivery_process_model: string; project_category: string; work_size_unit: string; is_finalized: boolean }>): Promise<KpiPlan> {
  const { data } = await apiClient.patch<KpiPlan>(`/qpm/plans/${planId}/config`, payload);
  return data;
}

export async function addPlanMetric(planId: string, payload: {
  catalog_metric_id?: string | null; metric_name: string; metric_category?: string;
  formula?: string; uom?: string; intent?: string; frequency?: string; priority?: string;
  target?: number | null; lsl?: number | null; usl?: number | null;
  is_custom?: boolean; tailoring_reason?: string; reported_to_customer?: boolean;
  rationale?: string; data_source?: string;
}): Promise<KpiPlanMetric> {
  const { data } = await apiClient.post<KpiPlanMetric>(`/qpm/plans/${planId}/metrics`, payload);
  return data;
}

export async function updatePlanMetric(metricId: string, payload: Partial<{ frequency: string; priority: string; target: number; lsl: number; usl: number; reported_to_customer: boolean; rationale: string; data_source: string; is_active: boolean; tailoring_reason: string }>): Promise<KpiPlanMetric> {
  const { data } = await apiClient.patch<KpiPlanMetric>(`/qpm/plan-metrics/${metricId}`, payload);
  return data;
}

export async function removePlanMetric(metricId: string): Promise<void> {
  await apiClient.delete(`/qpm/plan-metrics/${metricId}`);
}

// Sheet 2 — raw measure entry
export async function addMeasureEntry(payload: { plan_metric_id: string; measure_name: string; actual_value?: number; uom?: string; frequency?: string; frequency_name?: string; from_date?: string; to_date?: string }): Promise<KpiMeasureEntry> {
  const { data } = await apiClient.post<KpiMeasureEntry>("/qpm/measure-entries", payload);
  return data;
}

export async function getMeasureEntries(planMetricId: string, frequencyName?: string): Promise<KpiMeasureEntry[]> {
  const { data } = await apiClient.get<KpiMeasureEntry[]>("/qpm/measure-entries", { params: { plan_metric_id: planMetricId, frequency_name: frequencyName } });
  return data;
}

// Compute KPI from entered measures
export async function computeKpi(
  planMetricId: string,
  payload: {
    frequency_name: string;
    from_date?: string;
    to_date?: string;
    override_target?: number | null;
    override_lsl?: number | null;
    override_usl?: number | null;
    analysis_comments?: string | null;
  }
): Promise<KpiMeasurement> {
  const { data } = await apiClient.post<KpiMeasurement>(`/qpm/compute/${planMetricId}`, payload);
  return data;
}

// Sheet 3 — tracker
export async function getTracker(planId: string): Promise<KpiTrackerRow[]> {
  const { data } = await apiClient.get<KpiTrackerRow[]>(`/qpm/plans/${planId}/tracker`);
  return data;
}

export async function updateMeasurement(id: string, payload: Partial<{ actual_value: number; analysis_comments: string; action_taken: string; responsibility: string; action_status: string; frequency_name: string; from_date: string; to_date: string }>): Promise<KpiMeasurement> {
  const { data } = await apiClient.patch<KpiMeasurement>(`/qpm/measurements/${id}`, payload);
  return data;
}

// Sheet 4 — summary
export async function getKpiSummary(planId: string): Promise<KpiSummary> {
  const { data } = await apiClient.get<KpiSummary>(`/qpm/plans/${planId}/summary`);
  return data;
}

// Sheet 5 — doc info
export async function getDocInfo(projectId: string): Promise<KpiDocInfo> {
  const { data } = await apiClient.get<KpiDocInfo>(`/qpm/projects/${projectId}/doc-info`);
  return data;
}

export async function saveDocInfo(projectId: string, payload: Partial<KpiDocInfo>): Promise<KpiDocInfo> {
  const { data } = await apiClient.post<KpiDocInfo>(`/qpm/projects/${projectId}/doc-info`, payload);
  return data;
}

export async function addVersionHistory(docInfoId: string, payload: Partial<KpiDocVersionHistory>): Promise<KpiDocVersionHistory> {
  const { data } = await apiClient.post<KpiDocVersionHistory>(`/qpm/doc-info/${docInfoId}/version-history`, payload);
  return data;
}

// QPM Submit / Review workflow
export async function submitQpmPlan(
  planId: string,
  pm_perception_rag?: string,
  pm_rag_comments?: string,
): Promise<KpiPlan> {
  const { data } = await apiClient.post<KpiPlan>(`/qpm/plans/${planId}/submit`, {
    pm_perception_rag: pm_perception_rag || null,
    pm_rag_comments: pm_rag_comments || null,
  });
  return data;
}

export async function reviewQpmPlan(
  planId: string,
  action: "APPROVE" | "REJECT",
  review_comments?: string,
): Promise<KpiPlan> {
  const { data } = await apiClient.post<KpiPlan>(`/qpm/plans/${planId}/review`, {
    action,
    review_comments: review_comments || null,
  });
  return data;
}

export async function reopenQpmPlan(planId: string): Promise<KpiPlan> {
  const { data } = await apiClient.post<KpiPlan>(`/qpm/plans/${planId}/reopen`, {});
  return data;
}

export interface KpiTrendPoint {
  frequency_name: string;
  from_date: string | null;
  to_date: string | null;
  actual_value: number | null;
  target: number | null;
  lsl: number | null;
  usl: number | null;
  rag_status: string | null;
  submitted_date: string | null;
}

export interface KpiMetricTrend {
  plan_metric_id: string;
  metric_name: string;
  uom: string | null;
  intent: string | null;
  history: KpiTrendPoint[];
}

export async function getMetricTrend(planMetricId: string): Promise<KpiMetricTrend> {
  const { data } = await apiClient.get<KpiMetricTrend>(`/qpm/plan-metrics/${planMetricId}/trend`);
  return data;
}

export async function getLatestMeasurement(planMetricId: string): Promise<KpiMeasurement | null> {
  // Use the trend endpoint — returns history ordered oldest→newest by date
  const trend = await getMetricTrend(planMetricId);
  if (!trend.history || trend.history.length === 0) return null;
  // Take the most recently *submitted* point (latest submitted_date) — this has the latest thresholds PM used
  const sorted = [...trend.history].sort((a, b) => {
    const ta = a.submitted_date ? new Date(a.submitted_date).getTime() : 0;
    const tb = b.submitted_date ? new Date(b.submitted_date).getTime() : 0;
    return tb - ta; // newest first
  });
  // Find the first entry that has at least one non-null threshold
  const withThreshold = sorted.find(h => h.target != null || h.lsl != null || h.usl != null);
  const latest = withThreshold || sorted[0];
  return {
    id: "",
    plan_metric_id: planMetricId,
    metric_name: trend.metric_name,
    metric_category: null,
    uom: trend.uom,
    intent: trend.intent,
    frequency: null,
    frequency_name: latest.frequency_name,
    from_date: latest.from_date,
    to_date: latest.to_date,
    actual_value: latest.actual_value,
    target: latest.target,
    lsl: latest.lsl,
    usl: latest.usl,
    measure1_name: null, measure1_value: null,
    measure2_name: null, measure2_value: null,
    measure3_name: null, measure3_value: null,
    measure4_name: null, measure4_value: null,
    submitted_by: null, submitted_date: latest.submitted_date,
    analysis_comments: null, action_taken: null,
    responsibility: null, action_status: null, updated_by: null,
    rag_status: latest.rag_status,
    created_at: "", updated_at: "",
  } as KpiMeasurement;
}
