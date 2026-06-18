"""System configuration repository layer."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.system_configuration import SystemConfiguration


class SystemConfigurationRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_global_settings(self) -> SystemConfiguration:
        """
        Fetch global settings (ID=1).
        If settings row doesn't exist, lazily generate and return defaults.
        """
        stmt = select(SystemConfiguration).where(SystemConfiguration.id == 1)
        settings = self._session.execute(stmt).scalar_one_or_none()
        if settings is None:
            settings = SystemConfiguration(
                id=1,
                reporting_frequency="MONTHLY",
                approval_sla_days=5,
                auto_lock_days=5,
                reopen_policy="DH_AND_PLATFORM_ADMIN",
                green_threshold_min=80.0,
                amber_threshold_min=50.0,
                red_threshold_min=0.0,
                escalation_rules_enabled=True,
                project_red_alerts_enabled=True,
                bu_risk_alerts_enabled=True,
                approval_reminders_enabled=True,
            )
            self._session.add(settings)
            self._session.commit()
            self._session.refresh(settings)
        return settings

    def update(self, settings: SystemConfiguration, **kwargs) -> SystemConfiguration:
        """Update system settings with provided key-value fields."""
        for key, value in kwargs.items():
            if value is not None:
                setattr(settings, key, value)
        self._session.flush()
        return settings
