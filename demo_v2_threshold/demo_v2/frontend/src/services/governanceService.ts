import type { GovernancePeriod } from "../types/governance";
import { apiClient } from "./apiClient";

export async function listGovernancePeriods(): Promise<GovernancePeriod[]> {
  const { data } = await apiClient.get<GovernancePeriod[]>("/governance-periods");
  return data;
}

export async function createGovernancePeriod(payload: {
  name: string;
  period_type: string;
  period_start: string;
  period_end: string;
  is_active: boolean;
}): Promise<GovernancePeriod> {
  const { data } = await apiClient.post<GovernancePeriod>("/governance-periods", payload);
  return data;
}
