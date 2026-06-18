import type { LoginCredentials, LoginResponse, User } from "../types/auth";
import { apiClient } from "./apiClient";

const TOKEN_KEY = "deliverypulse_access_token";

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/login", credentials);
  storeToken(data.access_token);
  return data;
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me");
  return data;
}

export function logout(): void {
  clearToken();
}
