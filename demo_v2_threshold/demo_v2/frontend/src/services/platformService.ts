import type {
  PlatformApprovalLatencyRow,
  PlatformBUAnalysis,
  PlatformOverview,
  PlatformRiskRow,
  PlatformTemplateAdoptionRow,
} from "../types/platform";
import { apiClient } from "./apiClient";

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const { data } = await apiClient.get<PlatformOverview>("/platform/overview");
  return data;
}

export async function getPlatformRiskSummary(): Promise<PlatformRiskRow[]> {
  const { data } = await apiClient.get<PlatformRiskRow[]>("/platform/risk-summary");
  return data;
}

export async function getPlatformApprovalLatency(): Promise<PlatformApprovalLatencyRow[]> {
  const { data } = await apiClient.get<PlatformApprovalLatencyRow[]>(
    "/platform/approval-latency",
  );
  return data;
}

export async function getPlatformTemplateAdoption(): Promise<PlatformTemplateAdoptionRow[]> {
  const { data } = await apiClient.get<PlatformTemplateAdoptionRow[]>(
    "/platform/template-adoption",
  );
  return data;
}

export async function getPlatformBUAnalysis(buId: string): Promise<PlatformBUAnalysis> {
  const { data } = await apiClient.get<PlatformBUAnalysis>(
    `/platform/business-units/${buId}`,
  );
  return data;
}
