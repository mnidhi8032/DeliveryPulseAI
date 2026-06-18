export interface PlatformOverview {
  total_customers: number;
  total_business_units: number;
  total_projects: number;
  total_submissions: number;
  green_percent: number;
  amber_percent: number;
  red_percent: number;
  green_count: number;
  amber_count: number;
  red_count: number;
}

export interface PlatformRiskRow {
  business_unit_id: string;
  business_unit_name: string;
  delivery_head_name: string | null;
  project_count: number;
  red_projects: number;
  red_percent: number;
  escalation_flag: boolean;
}

export interface PlatformApprovalLatencyRow {
  business_unit_id: string;
  business_unit_name: string;
  average_approval_days: number | null;
  min_approval_days: number | null;
  max_approval_days: number | null;
  sample_count: number;
}

export interface PlatformTemplateAdoptionRow {
  business_unit_id: string;
  business_unit_name: string;
  manual_submissions: number;
  excel_submissions: number;
  adoption_percent: number | null;
}

export interface PlatformBUAnalysis {
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
  submission_trends: { status_code: string; count: number }[];
  recent_approvals: {
    submission_id: string;
    project_name: string;
    status_code: string;
    approval_date: string | null;
    overall_score: number | null;
    rag_status: string | null;
  }[];
}
