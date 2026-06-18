// BRD-specific types

export interface ProjectPhase {
  id: string;
  project_id: string;
  phase_type: "SPRINT" | "RELEASE" | "MILESTONE" | "OTHER";
  phase_name: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD";
}

export interface ProjectPhasePayload {
  phase_type: string;
  phase_name: string;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  status?: string;
}

export interface ActionItem {
  id: string;
  project_id: string;
  submission_id: string | null;
  metric_name: string | null;
  rag_status_at_creation: string | null;
  root_cause: string;
  corrective_action: string;
  owner_user_id: string | null;
  owner_name: string | null;
  target_closure_date: string | null;
  closed_at: string | null;
  action_status: "OPEN" | "IN_PROGRESS" | "CLOSED";
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionItemCreatePayload {
  project_id: string;
  root_cause: string;
  corrective_action: string;
  metric_name?: string | null;
  rag_status_at_creation?: string | null;
  submission_id?: string | null;
  owner_user_id?: string | null;
  owner_name?: string | null;
  target_closure_date?: string | null;
}

export interface ActionItemStatusUpdate {
  action_status: string;
  corrective_action?: string | null;
  owner_name?: string | null;
  target_closure_date?: string | null;
}

export interface GovernanceReview {
  id: string;
  review_level: "BU" | "ACCOUNT" | "PROJECT";
  business_unit_id: string | null;
  account_id: string | null;
  project_id: string | null;
  review_date: string;
  review_title: string;
  outcome_comments: string | null;
  conducted_by_user_id: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  created_at: string;
  updated_at: string;
}

export interface GovernanceReviewPayload {
  review_level: string;
  review_date: string;
  review_title: string;
  outcome_comments?: string | null;
  business_unit_id?: string | null;
  account_id?: string | null;
  project_id?: string | null;
  status?: string;
}

export interface PMComplianceRow {
  pm_id: string;
  pm_name: string;
  pm_email: string;
  project_id: string;
  project_name: string;
  period_id: string;
  period_name: string;
  period_end: string;
  submitted: boolean;
  days_overdue: number;
}

export interface ReviewerComplianceRow {
  reviewer_role: string;
  reviewer_id: string | null;
  reviewer_name: string;
  submission_id: string;
  project_name: string;
  submitted_date: string;
  days_pending: number;
  current_status: string;
}

export interface ComplianceReport {
  pm_non_submissions: PMComplianceRow[];
  pending_reviews: ReviewerComplianceRow[];
  summary: {
    total_pm_non_submissions: number;
    total_pending_reviews: number;
    overdue_pm_submissions: number;
    review_threshold_days: number;
  };
}
