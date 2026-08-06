import { apiClient } from "./apiClient";

export type EngagementItemType =
  | "PROJECT_TYPE"
  | "DELIVERY_MODEL"
  | "PROJECT_CATEGORY"
  | "WORK_SIZE_UNIT"
  | "DIMENSION";

export interface EngagementModelItem {
  id: string;
  item_type: EngagementItemType;
  value: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  min_mandatory_count: number; // DIMENSION only — for 18.3
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetricMapping {
  id: string;
  engagement_item_id: string;
  catalog_metric_id: string;
  is_mandatory: boolean;
  metric_name: string | null;
  metric_category: string | null;
  created_at: string;
}

// ── Items ─────────────────────────────────────────────────────────────────────

export async function listEngagementItems(
  item_type?: EngagementItemType,
  active_only = true,
): Promise<EngagementModelItem[]> {
  const { data } = await apiClient.get<EngagementModelItem[]>("/engagement-model-items", {
    params: { item_type, active_only },
  });
  return data;
}

export async function createEngagementItem(payload: {
  item_type: EngagementItemType;
  value: string;
  description?: string;
  sort_order?: number;
  min_mandatory_count?: number;
}): Promise<EngagementModelItem> {
  const { data } = await apiClient.post<EngagementModelItem>("/engagement-model-items", payload);
  return data;
}

export async function updateEngagementItem(
  id: string,
  payload: {
    value?: string;
    description?: string;
    is_active?: boolean;
    sort_order?: number;
    min_mandatory_count?: number;
  },
): Promise<EngagementModelItem> {
  const { data } = await apiClient.patch<EngagementModelItem>(
    `/engagement-model-items/${id}`,
    payload,
  );
  return data;
}

// ── Metric Mappings ───────────────────────────────────────────────────────────

export async function listMetricMappings(itemId: string): Promise<MetricMapping[]> {
  const { data } = await apiClient.get<MetricMapping[]>(
    `/engagement-model-items/${itemId}/metrics`,
  );
  return data;
}

export async function addMetricMapping(
  itemId: string,
  catalog_metric_id: string,
  is_mandatory: boolean,
): Promise<MetricMapping> {
  const { data } = await apiClient.post<MetricMapping>(
    `/engagement-model-items/${itemId}/metrics`,
    { catalog_metric_id, is_mandatory },
  );
  return data;
}

export async function updateMetricMapping(
  itemId: string,
  catalog_metric_id: string,
  is_mandatory: boolean,
): Promise<MetricMapping> {
  const { data } = await apiClient.patch<MetricMapping>(
    `/engagement-model-items/${itemId}/metrics/${catalog_metric_id}`,
    { is_mandatory },
  );
  return data;
}

export async function removeMetricMapping(
  itemId: string,
  catalog_metric_id: string,
): Promise<void> {
  await apiClient.delete(
    `/engagement-model-items/${itemId}/metrics/${catalog_metric_id}`,
  );
}
