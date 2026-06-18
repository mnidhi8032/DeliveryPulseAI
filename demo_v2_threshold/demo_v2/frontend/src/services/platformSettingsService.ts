import { apiClient } from "./apiClient";
import type { SystemSettings, MetricCatalogItem, SettingsAuditLog } from "../types/platformSettings";

export async function getSystemSettings(): Promise<SystemSettings> {
  const { data } = await apiClient.get<SystemSettings>("/platform/settings");
  return data;
}

export async function updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  const { data } = await apiClient.put<SystemSettings>("/platform/settings", settings);
  return data;
}

export async function getMetricCatalog(): Promise<MetricCatalogItem[]> {
  const { data } = await apiClient.get<MetricCatalogItem[]>("/platform/settings/metrics");
  return data;
}

export async function updateMetricCatalogItem(
  metricId: string,
  updates: { weight?: number; is_active?: boolean }
): Promise<MetricCatalogItem> {
  const { data } = await apiClient.put<MetricCatalogItem>(
    `/platform/settings/metrics/${metricId}`,
    updates
  );
  return data;
}

export async function getGlobalAuditLogs(page: number = 1, limit: number = 50): Promise<SettingsAuditLog[]> {
  const { data } = await apiClient.get<SettingsAuditLog[]>("/platform/settings/audit", {
    params: { page, limit },
  });
  return data;
}
