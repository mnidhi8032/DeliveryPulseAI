import { apiClient } from "./apiClient";

export interface BusinessUnit {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function listBusinessUnits(): Promise<BusinessUnit[]> {
  const { data } = await apiClient.get<BusinessUnit[]>("/business-units");
  return data;
}
