export interface SystemSettings {
  reporting_frequency: string;
  approval_sla_days: number;
  auto_lock_days: number;
  reopen_policy: string;
  green_threshold_min: number;
  amber_threshold_min: number;
  red_threshold_min: number;
  escalation_rules_enabled: boolean;
  project_red_alerts_enabled: boolean;
  bu_risk_alerts_enabled: boolean;
  approval_reminders_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface MetricCatalogItem {
  id: string;
  code: string;
  name: string;
  dimension: string;
  description: string | null;
  data_type: string;
  weight: number;
  validation_rules: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SettingsAuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  performed_by_user_id: string;
  old_value: any;
  new_value: any;
  created_at: string;
  performer?: {
    full_name: string;
    email: string;
  };
}
