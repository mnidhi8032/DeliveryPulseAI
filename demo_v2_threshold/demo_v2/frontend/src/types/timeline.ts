export interface SubmissionTimelineEvent {
  submission_id: string;
  date: string;
  overall_score: number | null;
  rag_status: string | null;
  status_code: string;
  trend: "improving" | "declining" | "stable" | "none";
  action_description: string;
  actor_name: string | null;
  actor_role: string | null;
  created_at: string;
  submission_date: string | null;
  approval_date: string | null;
  locked_at: string | null;
}

export interface DimensionHistoryRow {
  dimension_name: string;
  score: number;
}

export interface HealthHistoryEvent {
  submission_id: string;
  date: string;
  overall_score: number | null;
  rag_status: string | null;
  dimensions: DimensionHistoryRow[];
}
