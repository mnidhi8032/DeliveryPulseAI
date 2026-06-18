"""AuditEvent data access repository."""

import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from app.models.audit_event import AuditEvent


class AuditEventRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, **kwargs) -> AuditEvent:
        audit_event = AuditEvent(**kwargs)
        self._session.add(audit_event)
        self._session.flush()
        return audit_event

    def get_by_id(self, audit_id: uuid.UUID) -> AuditEvent | None:
        stmt = (
            select(AuditEvent)
            .options(joinedload(AuditEvent.performer))
            .where(AuditEvent.id == audit_id)
        )
        return self._session.execute(stmt).scalar_one_or_none()

    def list_by_entity(self, entity_type: str, entity_id: uuid.UUID) -> list[AuditEvent]:
        stmt = (
            select(AuditEvent)
            .options(joinedload(AuditEvent.performer))
            .where(AuditEvent.entity_type == entity_type)
            .where(AuditEvent.entity_id == entity_id)
            .order_by(AuditEvent.created_at.asc())
        )
        return list(self._session.execute(stmt).scalars().all())
