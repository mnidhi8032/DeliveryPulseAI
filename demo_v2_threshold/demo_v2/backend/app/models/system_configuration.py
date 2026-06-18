"""System configuration ORM model."""

from sqlalchemy import Boolean, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class SystemConfiguration(Base, TimestampMixin):
    __tablename__ = "system_configurations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    reporting_frequency: Mapped[str] = mapped_column(String(20), nullable=False, default="MONTHLY")
    approval_sla_days: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    auto_lock_days: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    reopen_policy: Mapped[str] = mapped_column(String(50), nullable=False, default="DH_AND_PLATFORM_ADMIN")
    
    green_threshold_min: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=80.0)
    amber_threshold_min: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=50.0)
    red_threshold_min: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0.0)
    
    escalation_rules_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    
    project_red_alerts_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    bu_risk_alerts_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    approval_reminders_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    def __repr__(self) -> str:
        return f"<SystemConfiguration id={self.id} frequency={self.reporting_frequency!r}>"
