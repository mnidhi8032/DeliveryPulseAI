import { apiClient } from "./apiClient";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  category: string;
  type: string;
  is_read: boolean;
  related_submission_id: string | null;
  related_project_id: string | null;
  created_at: string;
}

export interface NotificationUnreadCount {
  unread_count: number;
}

export async function listNotifications(): Promise<Notification[]> {
  const { data } = await apiClient.get<Notification[]>("/notifications");
  return data;
}

export async function getUnreadCount(): Promise<NotificationUnreadCount> {
  const { data } = await apiClient.get<NotificationUnreadCount>("/notifications/unread-count");
  return data;
}

export async function markAsRead(notificationId: string): Promise<Notification> {
  const { data } = await apiClient.post<Notification>(`/notifications/${notificationId}/read`);
  return data;
}

export async function markAllAsRead(): Promise<{ status: string }> {
  const { data } = await apiClient.post<{ status: string }>("/notifications/read-all");
  return data;
}
