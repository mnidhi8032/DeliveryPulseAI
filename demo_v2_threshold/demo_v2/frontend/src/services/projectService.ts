import type { Project } from "../types/project";
import type { SubmissionTimelineEvent, HealthHistoryEvent } from "../types/timeline";
import { apiClient } from "./apiClient";

export async function listProjects(): Promise<Project[]> {
  const { data } = await apiClient.get<Project[]>("/projects");
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
