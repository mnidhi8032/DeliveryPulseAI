export interface MetricDefinition {
  id: string;
  code: string;
  name: string;
  dimension: string;
  description: string | null;
  data_type: string;
  weight: number;
  validation_rules: Record<string, unknown> | null;
  is_active: boolean;
}

export interface MetricValue {
  id: string;
  submission_id: string;
  metric_code: string;
  metric_name: string;
  dimension: string;
  value: number;
  created_at: string;
  updated_at: string;
}

export interface DimensionScore {
  dimension_name: string;
  score: number;
  weight: number;
  rag_status: string;
}

export interface SubmissionHealth {
  submission_id: string;
  health_available: boolean;
  metrics_completed: number;
  metrics_required: number;
  message: string | null;
  overall_score: number | null;
  rag_status: string | null;
  explanation: string | null;
  dimension_scores: DimensionScore[];
  computed_at: string | null;
}

export interface MetricInput {
  metric_code: string;
  value: number | string;
}
