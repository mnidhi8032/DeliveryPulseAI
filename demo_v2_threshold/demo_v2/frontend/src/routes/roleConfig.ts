import type { RoleCode } from "../types/auth";

export const ROLE_HOME_PATH: Record<RoleCode, string> = {
  PLATFORM_ADMIN:       "/platform",
  CEO:                  "/ceo",
  DELIVERY_HEAD:        "/delivery-head",
  DELIVERY_MANAGER:     "/delivery-manager",
  PM:                   "/pm",
  DELIVERY_EXCELLENCE:  "/delivery-excellence",
};

export function homePathForRole(role: RoleCode | string): string {
  return ROLE_HOME_PATH[role as RoleCode] ?? "/login";
}

export function isRoleAllowed(userRole: RoleCode, allowed: RoleCode[]): boolean {
  return allowed.includes(userRole);
}
