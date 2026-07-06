export type RoleCode =
  | "PM"
  | "CEO"
  | "DELIVERY_MANAGER"
  | "DELIVERY_HEAD"
  | "PLATFORM_ADMIN"
  | "DELIVERY_EXCELLENCE";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role_code: RoleCode;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
