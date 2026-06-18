export interface Submission {
  id: string;
  project_id: string;
  governance_period_id: string;
  status_code: string;
  created_by_user_id: string;
  reviewed_by_user_id: string | null;
  submission_date: string | null;
  approval_date: string | null;
  rag_start_date: string | null;
  locked_at: string | null;
  review_comments: string | null;
  // BRD §5.4.1.7: PM perception RAG
  pm_perception_rag: string | null;
  pm_rag_comments: string | null;
  // BRD §5.5.1.3: Multi-tier review comments
  dm_comments: string | null;
  dm_review_date: string | null;
  dm_review_status: string | null;
  dd_comments: string | null;
  dd_review_date: string | null;
  dd_review_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionCreatePayload {
  project_id: string;
  governance_period_id: string;
}
