import type { RoleCode } from "../types/auth";

export const ROLE_HOME_PATH: Record<RoleCode, string> = {
  PLATFORM_ADMIN: "/platform",
  CEO:            "/ceo",
  BU_HEAD:        "/bu-head",
  PM:             "/pm",
};

export function homePathForRole(role: RoleCode | string): string {
  return ROLE_HOME_PATH[role as RoleCode] ?? "/login";
}

export function isRoleAllowed(userRole: RoleCode, allowed: RoleCode[]): boolean {
  return allowed.includes(userRole);
}
