export interface PortfolioSummary {
  total_business_units: number;
  total_projects: number;
  total_submissions: number;
  green_count: number;
  amber_count: number;
  red_count: number;
}

export interface BusinessUnitHealthRow {
  business_unit_id: string;
  business_unit_name: string;
  business_unit_code: string;
  delivery_head_name: string | null;
  project_count: number;
  green_count: number;
  amber_count: number;
  red_count: number;
  health_percent: number | null;
  submission_count: number;
}

export interface AgingProjectDetail {
  project_id: string;
  project_name: string;
  business_unit_name: string;
  delivery_head_name: string | null;
  rag_status: string | null;
  weeks_count: number;
}

export interface SubmissionAging {
  weeks_0_2: number;
  weeks_3_4: number;
  weeks_5_8: number;
  weeks_8_plus: number;
  projects_0_2: AgingProjectDetail[];
  projects_3_4: AgingProjectDetail[];
  projects_5_8: AgingProjectDetail[];
  projects_8_plus: AgingProjectDetail[];
}

export interface ImpactMatrixRow {
  business_unit_id: string;
  business_unit_name: string;
  schedule_impact: number;
  quality_impact: number;
  finance_impact: number;
  people_impact: number;
}

export interface BusinessUnitDetail {
  business_unit_id: string;
  business_unit_name: string;
  business_unit_code: string;
  description: string | null;
  delivery_head_names: string[];
  project_count: number;
  submission_count: number;
  green_count: number;
  amber_count: number;
  red_count: number;
  health_percent: number | null;
  projects: {
    id: string;
    project_code: string;
    project_name: string;
    account_name: string;
    status: string;
    submission_count: number;
  }[];
  recent_submissions: {
    id: string;
    project_name: string;
    status_code: string;
    overall_score: number | null;
    rag_status: string | null;
    submission_date: string | null;
    created_at: string;
  }[];
}

export interface HealthChangeRow {
  project_name: string;
  previous_score: number | null;
  current_score: number | null;
  trend: string;
}

export interface RedProjectMovementRow {
  date: string;
  red_count: number;
}

export interface AgingChangeRow {
  category: string;
  count: number;
}

export interface BUTrendSummaryResponse {
  recent_submissions: BusinessUnitDetail["recent_submissions"];
  health_changes: HealthChangeRow[];
  red_project_movement: RedProjectMovementRow[];
  aging_changes: AgingChangeRow[];
}
