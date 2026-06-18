export interface QPMCatalogMetric {
  id: string; category: string; name: string;
  objective_type: string | null; org_goal: string | null; higher_objective: string | null;
  formula: string | null; uom: string | null; metrics_type: string | null;
  intent: string | null; project_type: string | null; delivery_model: string | null;
  project_category: string | null; frequency: string | null; compliance: string | null;
  default_target: number | null; default_lsl: number | null; default_usl: number | null;
  is_active: boolean;
}

export interface KpiPlanMetric {
  id: string; kpi_plan_id: string; catalog_metric_id: string | null;
  metric_name: string; metric_category: string | null; formula: string | null;
  uom: string | null; intent: string | null; frequency: string | null; priority: string | null;
  target: number | null; lsl: number | null; usl: number | null;
  is_custom: boolean; tailoring_reason: string | null; reported_to_customer: boolean;
  rationale: string | null; data_source: string | null; is_active: boolean;
  required_measures: string | null; // JSON array string
  created_at: string; updated_at: string;
}

export interface KpiPlan {
  id: string; project_id: string;
  project_type: string | null; delivery_process_model: string | null;
  project_category: string | null; work_size_unit: string | null;
  is_finalized: boolean;
  // QPM submission workflow
  qpm_status: string;   // DRAFT | UNDER_REVIEW | APPROVED | REJECTED
  qpm_submitted_at: string | null;
  qpm_approved_at: string | null;
  qpm_reviewed_by_user_id: string | null;
  qpm_review_comments: string | null;
  // PM perception RAG
  pm_perception_rag: string | null;
  pm_rag_comments: string | null;
  metrics: KpiPlanMetric[];
  created_at: string; updated_at: string;
}

export interface KpiMeasureEntry {
  id: string; plan_metric_id: string; measure_name: string;
  actual_value: number | null; uom: string | null;
  frequency: string | null; frequency_name: string | null;
  from_date: string | null; to_date: string | null;
  created_at: string; updated_at: string;
}

export interface KpiMeasurement {
  id: string; plan_metric_id: string;
  metric_name: string | null; metric_category: string | null; uom: string | null; intent: string | null;
  frequency: string | null; frequency_name: string | null;
  from_date: string | null; to_date: string | null;
  actual_value: string | number | null;   // Pydantic Decimal serialises as string
  target: string | number | null;
  lsl: string | number | null;
  usl: string | number | null;
  measure1_name: string | null; measure1_value: number | null;
  measure2_name: string | null; measure2_value: number | null;
  measure3_name: string | null; measure3_value: number | null;
  measure4_name: string | null; measure4_value: number | null;
  submitted_by: string | null; submitted_date: string | null;
  analysis_comments: string | null; action_taken: string | null;
  responsibility: string | null; action_status: string | null; updated_by: string | null;
  rag_status: string | null; created_at: string; updated_at: string;
}

export interface KpiTrackerRow {
  id: string; plan_metric_id: string; metric: string;
  frequency: string | null; frequency_name: string | null;
  actual_value: string | number | null; uom: string | null;
  target_operator: string | null;
  target: string | number | null;
  lsl: string | number | null;
  usl: string | number | null;
  measure1_name: string | null; measure1_value: number | null;
  measure2_name: string | null; measure2_value: number | null;
  measure3_name: string | null; measure3_value: number | null;
  measure4_name: string | null; measure4_value: number | null;
  from_date: string | null; to_date: string | null;
  submitted_by: string | null; submitted_date: string | null;
  rag_status: string | null; analysis_comments: string | null;
  action_taken: string | null; responsibility: string | null;
  action_status: string | null; updated_by: string | null; updated_date: string | null;
}

export interface KpiSummaryMetric {
  plan_metric_id: string; metric_name: string; metric_category: string | null;
  uom: string | null; intent: string | null;
  latest_value: string | number | null;
  target: string | number | null;
  lsl: string | number | null;
  usl: string | number | null;
  rag_status: string | null; trend: string | null;
  measurement_count: number; last_updated: string | null;
  history: Array<{
    frequency_name: string | null;
    from_date: string | null;
    to_date: string | null;
    actual_value: number | null;
    target: number | null;
    lsl: number | null;
    usl: number | null;
    rag_status: string | null;
    submitted_date: string | null;
  }>;
}

export interface KpiSummary {
  kpi_plan_id: string; project_id: string;
  project_type: string | null; delivery_process_model: string | null;
  is_finalized: boolean; total_metrics: number;
  green_count: number; amber_count: number; red_count: number; no_data_count: number;
  category_rag: Record<string, string>;   // { "Internal Quality": "RED", ... }
  overall_rag: string | null;             // overall project RAG
  metrics: KpiSummaryMetric[];
}

export interface KpiDocVersionHistory {
  id: string; doc_info_id: string;
  issue_id: string | null; issue_date: string | null;
  prepared_by: string | null; reviewed_by: string | null; description: string | null;
  created_at: string;
}

export interface KpiDocInfo {
  id: string; project_id: string;
  project_name: string | null; project_id_code: string | null; customer_name: string | null;
  document_title: string | null; issue_no: string | null; pm_name: string | null;
  issue_date: string | null; prepared_by: string | null; preparation_date: string | null;
  reviewed_by: string | null; review_date: string | null; template_version: string | null;
  version_history: KpiDocVersionHistory[];
  created_at: string; updated_at: string;
}

// Dropdowns
export const PROJECT_TYPES = ["Fresh Development","Maintenance & Support","Testing","Infrastructure Management Services","Re-Engineering","Migration","Package Rollout","Package implementation","Production Support","Application Build","Helpdesk Services","Upgrade","Professional Services","Custom Enhancements"];
export const DELIVERY_MODELS = ["Waterfall","Iterative","Incremental","Agile-Scrum","Agile-Kanban","Sure Step","Agile Sure Step","ASAP","Oracle AIM","ITIL based Service Delivery","Traditional Maintenance & Support","Staffing"];
export const PROJECT_CATEGORIES = ["Time & Material","Fixed Price","Time & Material With Cap","Fixed Capacity","Outcome based Fee","Cost-Plus"];
export const WORK_SIZE_UNITS = ["Story Point-SP","Function Point-FP","Complexity Point-CP","Use Case Point-UCP","Person-days","Number of tickets","KLOC"];
export const FREQUENCIES = ["Weekly","Monthly","Quarterly","Half Yearly","Release","Sprint","On Demand"];
export const ACTION_STATUSES = ["Open","In-Progress","Closed","Not Applicable"];
export const METRIC_CATEGORIES = ["Time & Speed","Efficiency","Delivered Quality","Internal Quality","Scope","Financial","Stakeholder Perception","Non-functional-Performance","Non-functional-Security","Non-functional-Usability","Non-functional-Maintainability"];
export const COMPLIANCE_LABEL: Record<string,string> = { M:"Mandatory", O:"Optional", C:"Conditional", R:"Recommended" };
export const COMPLIANCE_COLOR: Record<string,string> = { M:"bg-rose-50 text-rose-700 border-rose-200", O:"bg-slate-100 text-slate-600 border-slate-200", C:"bg-amber-50 text-amber-700 border-amber-200", R:"bg-blue-50 text-blue-700 border-blue-200" };
export const RAG_STYLE: Record<string,string> = { GREEN:"bg-emerald-100 text-emerald-800 border-emerald-300", AMBER:"bg-amber-100 text-amber-800 border-amber-300", RED:"bg-rose-100 text-rose-800 border-rose-300" };
