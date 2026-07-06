import { apiClient } from "./apiClient";

export interface ProjectReviewStatus {
  project_id: string;
  kpi_plan_id: string;
  last_reviewed_at: string | null;
  last_review_period: string | null;
  last_reviewer_name: string | null;
  latest_measurement_at: string | null;
  needs_review: boolean;
  total_reviews: number;
}

export interface DMReview {
  id: string;
  project_id: string;
  kpi_plan_id: string;
  reviewed_by_user_id: string | null;
  reviewed_by_name: string | null;
  period_label: string;
  dm_comments: string | null;
  action_items: string[];
  reviewed_at: string;
  created_at: string;
  updated_at: string;
}

export async function getProjectReviewStatuses(): Promise<ProjectReviewStatus[]> {
  const { data } = await apiClient.get<ProjectReviewStatus[]>("/dm-reviews/project-statuses");
  return data;
}

export async function listReviewsForProject(projectId: string): Promise<DMReview[]> {
  const { data } = await apiClient.get<DMReview[]>(`/dm-reviews/project/${projectId}`);
  return data;
}

export async function createDMReview(payload: {
  project_id: string;
  kpi_plan_id: string;
  period_label: string;
  dm_comments?: string;
  action_items?: string[];
}): Promise<DMReview> {
  const { data } = await apiClient.post<DMReview>("/dm-reviews", payload);
  return data;
}

export async function updateDMReview(
  reviewId: string,
  payload: { dm_comments?: string; action_items?: string[] }
): Promise<DMReview> {
  const { data } = await apiClient.patch<DMReview>(`/dm-reviews/${reviewId}`, payload);
  return data;
}
