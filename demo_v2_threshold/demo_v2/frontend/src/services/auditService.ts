import { apiClient } from "./apiClient";

export interface AuditEvent {
  id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  performed_by_user_id: string;
  performed_by_name: string | null;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  created_at: string;
}

export async function getAuditTrail(entityType: string, entityId: string): Promise<AuditEvent[]> {
  const { data } = await apiClient.get<AuditEvent[]>(`/audit/entity/${entityType}/${entityId}`);
  return data;
}
