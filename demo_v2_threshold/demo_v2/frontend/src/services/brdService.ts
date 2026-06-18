import { apiClient } from "./apiClient";
import type {
  ProjectPhase, ProjectPhasePayload,
  ActionItem, ActionItemCreatePayload, ActionItemStatusUpdate,
  GovernanceReview, GovernanceReviewPayload,
  ComplianceReport,
} from "../types/brd";

// ── Project Phases ────────────────────────────────────────────────────────────

export async function listProjectPhases(projectId: string): Promise<ProjectPhase[]> {
  const { data } = await apiClient.get<ProjectPhase[]>(`/projects/${projectId}/phases`);
  return data;
}

export async function createProjectPhase(projectId: string, payload: ProjectPhasePayload): Promise<ProjectPhase> {
  const { data } = await apiClient.post<ProjectPhase>(`/projects/${projectId}/phases`, payload);
  return data;
}

export async function updateProjectPhase(projectId: string, phaseId: string, payload: Partial<ProjectPhasePayload>): Promise<ProjectPhase> {
  const { data } = await apiClient.patch<ProjectPhase>(`/projects/${projectId}/phases/${phaseId}`, payload);
  return data;
}

export async function deleteProjectPhase(projectId: string, phaseId: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/phases/${phaseId}`);
}

// ── Action Items ──────────────────────────────────────────────────────────────

export async function listActionItems(projectId: string, overdueOnly = false): Promise<ActionItem[]> {
  const { data } = await apiClient.get<ActionItem[]>(`/action-items/by-project/${projectId}`, {
    params: { overdue_only: overdueOnly },
  });
  return data;
}

export async function createActionItem(payload: ActionItemCreatePayload): Promise<ActionItem> {
  const { data } = await apiClient.post<ActionItem>("/action-items", payload);
  return data;
}

export async function updateActionItemStatus(itemId: string, payload: ActionItemStatusUpdate): Promise<ActionItem> {
  const { data } = await apiClient.patch<ActionItem>(`/action-items/${itemId}/status`, payload);
  return data;
}

export async function deleteActionItem(itemId: string): Promise<void> {
  await apiClient.delete(`/action-items/${itemId}`);
}

// ── Governance Reviews ────────────────────────────────────────────────────────

export async function listGovernanceReviews(params?: {
  project_id?: string;
  account_id?: string;
  bu_id?: string;
}): Promise<GovernanceReview[]> {
  const { data } = await apiClient.get<GovernanceReview[]>("/governance-reviews", { params });
  return data;
}

export async function createGovernanceReview(payload: GovernanceReviewPayload): Promise<GovernanceReview> {
  const { data } = await apiClient.post<GovernanceReview>("/governance-reviews", payload);
  return data;
}

export async function updateGovernanceReview(
  reviewId: string,
  payload: { outcome_comments?: string; status?: string; review_title?: string },
): Promise<GovernanceReview> {
  const { data } = await apiClient.patch<GovernanceReview>(`/governance-reviews/${reviewId}`, payload);
  return data;
}

// ── Compliance Reporting ──────────────────────────────────────────────────────

export async function getComplianceReport(reviewThresholdDays = 3): Promise<ComplianceReport> {
  const { data } = await apiClient.get<ComplianceReport>("/compliance/report", {
    params: { review_threshold_days: reviewThresholdDays },
  });
  return data;
}

// ── Submission extras ─────────────────────────────────────────────────────────

export async function resubmitRejected(submissionId: string) {
  const { data } = await apiClient.post(`/submissions/${submissionId}/resubmit`);
  return data;
}

export async function updatePMPerceptionRag(
  submissionId: string,
  pm_perception_rag: string,
  pm_rag_comments?: string,
) {
  const { data } = await apiClient.patch(`/submissions/${submissionId}/pm-rag`, {
    pm_perception_rag,
    pm_rag_comments,
  });
  return data;
}

export async function addDMReview(submissionId: string, comments: string, review_status = "REVIEWED") {
  const { data } = await apiClient.post(`/submissions/${submissionId}/dm-review`, {
    comments,
    review_status,
  });
  return data;
}

export async function addDDReview(submissionId: string, comments: string, review_status = "REVIEWED") {
  const { data } = await apiClient.post(`/submissions/${submissionId}/dd-review`, {
    comments,
    review_status,
  });
  return data;
}
