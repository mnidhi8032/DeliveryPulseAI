import { apiClient } from "./apiClient";

export interface MetricApprovalRequest {
  id: string;
  kpi_plan_id: string;
  requested_by_user_id: string;
  reviewed_by_user_id: string | null;
  metric_name: string;
  metric_category: string | null;
  formula: string | null;
  uom: string | null;
  intent: string | null;
  frequency: string | null;
  priority: string | null;
  justification: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  review_comments: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  requested_by_name: string | null;
  project_name: string | null;
}

export async function submitMetricRequest(payload: {
  kpi_plan_id: string;
  metric_name: string;
  metric_category?: string;
  formula?: string;
  uom?: string;
  intent?: string;
  frequency?: string;
  priority?: string;
  justification: string;
}): Promise<MetricApprovalRequest> {
  const { data } = await apiClient.post<MetricApprovalRequest>("/metric-approvals", payload);
  return data;
}

export async function listMetricRequests(): Promise<MetricApprovalRequest[]> {
  const { data } = await apiClient.get<MetricApprovalRequest[]>("/metric-approvals");
  return data;
}

export async function decideMetricRequest(
  requestId: string,
  action: "APPROVE" | "REJECT",
  review_comments?: string,
): Promise<MetricApprovalRequest> {
  const { data } = await apiClient.post<MetricApprovalRequest>(
    `/metric-approvals/${requestId}/decide`,
    { action, review_comments: review_comments || null },
  );
  return data;
}
