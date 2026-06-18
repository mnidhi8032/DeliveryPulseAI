export interface Project {
  id: string;
  account_id: string;
  project_code: string;
  project_name: string;
  project_manager_id: string | null;
  delivery_head_user_id: string | null;
  description: string | null;
  start_date: string | null;
  target_end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  account_name: string;
  account_code: string;
  business_unit_name: string;
  project_manager_name: string | null;
  project_manager_email: string | null;
  current_rag: string | null;
}
