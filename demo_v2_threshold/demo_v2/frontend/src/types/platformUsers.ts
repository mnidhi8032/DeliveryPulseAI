export interface ManagedUser {
  id: string;
  email: string;
  full_name: string;
  role_code: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCreatePayload {
  email: string;
  full_name: string;
  password?: string;
  role_code: string;
  is_active?: boolean;
}

export interface UserUpdatePayload {
  email?: string;
  full_name?: string;
  role_code?: string;
  is_active?: boolean;
}
