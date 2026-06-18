import { apiClient } from "./apiClient";
import type { ManagedUser, UserCreatePayload, UserUpdatePayload } from "../types/platformUsers";

export async function getManagedUsers(): Promise<ManagedUser[]> {
  const { data } = await apiClient.get<ManagedUser[]>("/platform/users");
  return data;
}

export async function createManagedUser(payload: UserCreatePayload): Promise<ManagedUser> {
  const { data } = await apiClient.post<ManagedUser>("/platform/users", payload);
  return data;
}

export async function updateManagedUser(
  userId: string,
  payload: UserUpdatePayload
): Promise<ManagedUser> {
  const { data } = await apiClient.patch<ManagedUser>(`/platform/users/${userId}`, payload);
  return data;
}

export async function deleteManagedUser(userId: string): Promise<void> {
  await apiClient.delete(`/platform/users/${userId}`);
}
