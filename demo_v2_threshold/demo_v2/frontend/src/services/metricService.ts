import type {
  MetricDefinition,
  MetricInput,
  MetricValue,
  SubmissionHealth,
} from "../types/metrics";
import { apiClient } from "./apiClient";

export async function listMetricDefinitions(): Promise<MetricDefinition[]> {
  const { data } = await apiClient.get<MetricDefinition[]>("/metric-definitions");
  return data;
}

export async function listMetricValues(submissionId: string): Promise<MetricValue[]> {
  const { data } = await apiClient.get<MetricValue[]>("/metrics", {
    params: { submission_id: submissionId },
  });
  return data;
}

export async function saveMetrics(
  submissionId: string,
  metrics: MetricInput[],
): Promise<MetricValue[]> {
  const { data } = await apiClient.post<MetricValue[]>("/metrics", {
    submission_id: submissionId,
    metrics,
  });
  return data;
}

export async function getSubmissionHealth(submissionId: string): Promise<SubmissionHealth> {
  const { data } = await apiClient.get<SubmissionHealth>(
    `/submissions/${submissionId}/health`,
  );
  return data;
}
