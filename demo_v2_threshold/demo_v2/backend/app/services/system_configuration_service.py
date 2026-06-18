"""System configuration service layer."""

import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.system_configuration_repository import SystemConfigurationRepository
from app.repositories.metric_definition_repository import MetricDefinitionRepository
from app.repositories.audit_event_repository import AuditEventRepository
from app.schemas.system_configuration import SystemConfigurationResponse, SystemConfigurationUpdateRequest
from app.schemas.metric_definition import MetricDefinitionResponse, MetricDefinitionUpdateRequest
from app.services.access_control_service import AccessControlService


class SystemConfigurationService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._settings_repo = SystemConfigurationRepository(session)
        self._metrics_repo = MetricDefinitionRepository(session)
        self._audit_repo = AuditEventRepository(session)
        self._access = AccessControlService(session)

    def get_settings(self, user: User) -> SystemConfigurationResponse:
        self._access.require_platform_admin(user)
        settings = self._settings_repo.get_global_settings()
        return SystemConfigurationResponse.model_validate(settings)

    def update_settings(self, user: User, body: SystemConfigurationUpdateRequest) -> SystemConfigurationResponse:
        self._access.require_platform_admin(user)
        settings = self._settings_repo.get_global_settings()
        
        # Capture old values for audit
        old_val = {
            "reporting_frequency": settings.reporting_frequency,
            "approval_sla_days": settings.approval_sla_days,
            "auto_lock_days": settings.auto_lock_days,
            "reopen_policy": settings.reopen_policy,
            "green_threshold_min": float(settings.green_threshold_min),
            "amber_threshold_min": float(settings.amber_threshold_min),
            "red_threshold_min": float(settings.red_threshold_min),
            "escalation_rules_enabled": settings.escalation_rules_enabled,
            "project_red_alerts_enabled": settings.project_red_alerts_enabled,
            "bu_risk_alerts_enabled": settings.bu_risk_alerts_enabled,
            "approval_reminders_enabled": settings.approval_reminders_enabled,
        }

        updated = self._settings_repo.update(settings, **body.model_dump(exclude_unset=True))
        self._session.commit()

        # Log system setting change audit
        new_val = {
            "reporting_frequency": updated.reporting_frequency,
            "approval_sla_days": updated.approval_sla_days,
            "auto_lock_days": updated.auto_lock_days,
            "reopen_policy": updated.reopen_policy,
            "green_threshold_min": float(updated.green_threshold_min),
            "amber_threshold_min": float(updated.amber_threshold_min),
            "red_threshold_min": float(updated.red_threshold_min),
            "escalation_rules_enabled": updated.escalation_rules_enabled,
            "project_red_alerts_enabled": updated.project_red_alerts_enabled,
            "bu_risk_alerts_enabled": updated.bu_risk_alerts_enabled,
            "approval_reminders_enabled": updated.approval_reminders_enabled,
        }

        # Filter out unchanged fields to log compact delta
        delta_old = {}
        delta_new = {}
        for k, v in new_val.items():
            if old_val[k] != v:
                delta_old[k] = old_val[k]
                delta_new[k] = v

        # Use settings.id as a UUID-compliant representation for System Settings ID in audits
        dummy_uuid = uuid.UUID(int=1)

        if delta_new:
            self._audit_repo.create(
                entity_type="SYSTEM_SETTINGS",
                entity_id=dummy_uuid,
                event_type="SETTINGS_UPDATED",
                performed_by_user_id=user.id,
                old_value=delta_old,
                new_value=delta_new,
            )
            self._session.commit()

        return SystemConfigurationResponse.model_validate(updated)

    def list_metrics(self, user: User) -> list[MetricDefinitionResponse]:
        self._access.require_platform_admin(user)
        metrics = self._metrics_repo.list_all_with_inactive()
        return [MetricDefinitionResponse.model_validate(m) for m in metrics]

    def update_metric(self, user: User, metric_id: uuid.UUID, body: MetricDefinitionUpdateRequest) -> MetricDefinitionResponse:
        self._access.require_platform_admin(user)
        metric = self._metrics_repo.get_by_id(metric_id)
        if metric is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Metric not found")

        old_val = {
            "is_active": metric.is_active,
            "weight": float(metric.weight),
        }

        updated = self._metrics_repo.update(metric, **body.model_dump(exclude_unset=True))
        self._session.commit()

        new_val = {
            "is_active": updated.is_active,
            "weight": float(updated.weight),
        }

        delta_old = {}
        delta_new = {}
        for k, v in new_val.items():
            if old_val[k] != v:
                delta_old[k] = old_val[k]
                delta_new[k] = v

        if delta_new:
            self._audit_repo.create(
                entity_type="METRIC_DEFINITION",
                entity_id=metric.id,
                event_type="METRIC_UPDATED",
                performed_by_user_id=user.id,
                old_value=delta_old,
                new_value=delta_new,
            )
            self._session.commit()

        return MetricDefinitionResponse.model_validate(updated)
