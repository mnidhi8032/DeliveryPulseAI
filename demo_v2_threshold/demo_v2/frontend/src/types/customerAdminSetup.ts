export interface SetupUser {
  id: string;
  email: string;
  full_name: string;
  role_code: string;
}

export interface SetupBusinessUnit {
  id: string;
  code: string;
  name: string;
  description: string | null;
  delivery_head_user_id: string | null;
  is_active: boolean;
}

export interface SetupAccount {
  id: string;
  business_unit_id: string;
  code: string;
  name: string;
  is_active: boolean;
  business_unit_name?: string;
}

export interface SetupProject {
  id: string;
  account_id: string;
  project_code: string;
  project_name: string;
  project_manager_id: string | null;
  description: string | null;
  start_date: string | null;
  target_end_date: string | null;
  status: string;
  account_name?: string;
  business_unit_name?: string;
  project_manager_name?: string;
}
