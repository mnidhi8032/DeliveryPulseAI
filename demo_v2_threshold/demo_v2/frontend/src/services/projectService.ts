import type { Project } from "../types/project";
import type { SubmissionTimelineEvent, HealthHistoryEvent } from "../types/timeline";
import { apiClient } from "./apiClient";

export async function listProjects(): Promise<Project[]> {
  const { data } = await apiClient.get<Project[]>("/projects");
  return data;
}

export async function createProjectWithPlan(payload: {
  account_id: string; project_code: string; project_name: string;
  description?: string; start_date?: string; target_end_date?: string;
  project_type?: string; delivery_process_model?: string;
  project_category?: string; work_size_unit?: string;
}): Promise<{ project_id: string; project_code: string; project_name: string; plan_id: string; mandatory_metrics_added: number }> {
  const { data } = await apiClient.post("/projects/create-with-plan", payload);
  return data;
}

export async function getProject(projectId: string): Promise<Project> {
  const { data } = await apiClient.get<Project>(`/projects/${projectId}`);
  return data;
}

export async function getSubmissionTimeline(projectId: string): Promise<SubmissionTimelineEvent[]> {
  const { data } = await apiClient.get<SubmissionTimelineEvent[]>(`/projects/${projectId}/submission-timeline`);
  return data;
}

export async function getHealthHistory(projectId: string): Promise<HealthHistoryEvent[]> {
  const { data } = await apiClient.get<HealthHistoryEvent[]>(`/projects/${projectId}/health-history`);
  return data;
}
