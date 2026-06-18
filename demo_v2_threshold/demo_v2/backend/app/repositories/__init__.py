"""Data access repositories."""

from app.repositories.notification_repository import NotificationRepository
from app.repositories.audit_event_repository import AuditEventRepository
from app.repositories.system_configuration_repository import SystemConfigurationRepository

__all__ = [
    "NotificationRepository",
    "AuditEventRepository",
    "SystemConfigurationRepository",
]
