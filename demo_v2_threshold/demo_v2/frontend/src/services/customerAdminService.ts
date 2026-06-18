import type {
  BusinessUnitDetail,
  BusinessUnitHealthRow,
  ImpactMatrixRow,
  PortfolioSummary,
  SubmissionAging,
} from "../types/customerAdmin";
import { apiClient } from "./apiClient";

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const { data } = await apiClient.get<PortfolioSummary>("/customer-admin/portfolio-summary");
  return data;
}

export async function getBusinessUnitHealth(): Promise<BusinessUnitHealthRow[]> {
  const { data } = await apiClient.get<BusinessUnitHealthRow[]>(
    "/customer-admin/business-unit-health",
  );
  return data;
}

export async function getSubmissionAging(): Promise<SubmissionAging> {
  const { data } = await apiClient.get<SubmissionAging>("/customer-admin/aging");
  return data;
}

export async function getImpactMatrix(): Promise<ImpactMatrixRow[]> {
  const { data } = await apiClient.get<ImpactMatrixRow[]>("/customer-admin/impact-matrix");
  return data;
}

export async function getBusinessUnitDetail(buId: string): Promise<BusinessUnitDetail> {
  const { data } = await apiClient.get<BusinessUnitDetail>(
    `/customer-admin/business-units/${buId}`,
  );
  return data;
}

export async function getBusinessUnitTrendSummary(buId: string) {
  const { data } = await apiClient.get<import("../types/customerAdmin").BUTrendSummaryResponse>(
    `/customer-admin/business-units/${buId}/trends`,
  );
  return data;
}
