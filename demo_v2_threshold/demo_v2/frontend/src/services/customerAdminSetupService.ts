import { apiClient } from "./apiClient";
import type { SetupUser, SetupBusinessUnit, SetupAccount, SetupProject } from "../types/customerAdminSetup";

// Fetch PMs and DHs
export async function getSetupUsers(): Promise<SetupUser[]> {
  const { data } = await apiClient.get<SetupUser[]>("/customer-admin/users");
  return data;
}

// Business Units CRUD
export async function getSetupBusinessUnits(): Promise<SetupBusinessUnit[]> {
  const { data } = await apiClient.get<SetupBusinessUnit[]>("/business-units");
  return data;
}

export async function createBusinessUnit(payload: {
  code: string;
  name: string;
  description?: string;
  delivery_head_user_id?: string | null;
  is_active?: boolean;
}): Promise<SetupBusinessUnit> {
  const { data } = await apiClient.post<SetupBusinessUnit>("/business-units", payload);
  return data;
}

export async function updateBusinessUnit(
  buId: string,
  updates: Partial<{ name: string; description: string | null; delivery_head_user_id: string | null; is_active: boolean }>
): Promise<SetupBusinessUnit> {
  const { data } = await apiClient.patch<SetupBusinessUnit>(`/business-units/${buId}`, updates);
  return data;
}

// Accounts CRUD
export async function getSetupAccounts(): Promise<SetupAccount[]> {
  const { data } = await apiClient.get<SetupAccount[]>("/accounts");
  return data;
}

export async function createAccount(payload: {
  business_unit_id: string;
  code: string;
  name: string;
  is_active?: boolean;
}): Promise<SetupAccount> {
  const { data } = await apiClient.post<SetupAccount>("/accounts", payload);
  return data;
}

export async function updateAccount(
  accountId: string,
  updates: Partial<{ name: string; is_active: boolean; delivery_manager_user_id: string | null }>
): Promise<SetupAccount> {
  const { data } = await apiClient.patch<SetupAccount>(`/accounts/${accountId}`, updates);
  return data;
}

// Projects CRUD
export async function getSetupProjects(): Promise<SetupProject[]> {
  const { data } = await apiClient.get<any[]>("/projects");
  return data;
}

export async function createProjectShell(payload: {
  account_id: string;
  project_code: string;
  project_name: string;
  project_manager_id?: string | null;
  description?: string;
  start_date?: string | null;
  target_end_date?: string | null;
  status?: string;
}): Promise<SetupProject> {
  const { data } = await apiClient.post<SetupProject>("/projects", payload);
  return data;
}

export async function updateProjectShell(
  projectId: string,
  updates: Partial<{
    project_name: string;
    project_manager_id: string | null;
    description: string | null;
    start_date: string | null;
    target_end_date: string | null;
    status: string;
  }>
): Promise<SetupProject> {
  const { data } = await apiClient.patch<SetupProject>(`/projects/${projectId}`, updates);
  return data;
}
