"""Project data access."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.account import Account
from app.models.project import Project


def _project_load_options():
    return (
        joinedload(Project.account).joinedload(Account.business_unit),
        joinedload(Project.project_manager),
    )


class ProjectRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, **kwargs) -> Project:
        project = Project(**kwargs)
        self._session.add(project)
        self._session.flush()
        return project

    def get_by_id(self, project_id: uuid.UUID) -> Project | None:
        stmt = (
            select(Project)
            .options(*_project_load_options())
            .where(Project.id == project_id)
            .where(Project.deleted_at.is_(None))
        )
        return self._session.execute(stmt).unique().scalar_one_or_none()

    def get_by_account_and_code(self, account_id: uuid.UUID, project_code: str) -> Project | None:
        stmt = (
            select(Project)
            .where(Project.account_id == account_id)
            .where(Project.project_code == project_code)
            .where(Project.deleted_at.is_(None))
        )
        return self._session.execute(stmt).scalar_one_or_none()

    def list_all(self) -> list[Project]:
        stmt = (
            select(Project)
            .options(*_project_load_options())
            .where(Project.deleted_at.is_(None))
            .order_by(Project.project_code)
        )
        return list(self._session.execute(stmt).unique().scalars().all())

    def list_by_project_manager(self, user_id: uuid.UUID) -> list[Project]:
        stmt = (
            select(Project)
            .options(*_project_load_options())
            .where(Project.project_manager_id == user_id)
            .where(Project.deleted_at.is_(None))
            .order_by(Project.project_code)
        )
        return list(self._session.execute(stmt).unique().scalars().all())

    def list_by_delivery_head(self, user_id: uuid.UUID) -> list[Project]:
        stmt = (
            select(Project)
            .options(*_project_load_options())
            .where(Project.delivery_head_user_id == user_id)
            .where(Project.deleted_at.is_(None))
            .order_by(Project.project_code)
        )
        return list(self._session.execute(stmt).unique().scalars().all())

    def list_by_delivery_head(self, user_id: uuid.UUID) -> list[Project]:
        """Return all projects in BUs where this user is the BU Head."""
        from app.models.business_unit import BusinessUnit
        # Get BU ids for this BU Head
        bu_stmt = select(BusinessUnit.id).where(
            BusinessUnit.bu_head_user_id == user_id,
            BusinessUnit.deleted_at.is_(None),
        )
        bu_ids = [r[0] for r in self._session.execute(bu_stmt).fetchall()]
        if not bu_ids:
            return []
        # Get accounts in those BUs
        from app.models.account import Account as AccModel
        acc_stmt = select(AccModel.id).where(AccModel.business_unit_id.in_(bu_ids))
        acc_ids = [r[0] for r in self._session.execute(acc_stmt).fetchall()]
        if not acc_ids:
            return []
        stmt = (
            select(Project)
            .options(*_project_load_options())
            .where(Project.account_id.in_(acc_ids))
            .where(Project.deleted_at.is_(None))
            .order_by(Project.project_code)
        )
        return list(self._session.execute(stmt).unique().scalars().all())

    def list_by_account_ids(self, account_ids: list[uuid.UUID]) -> list[Project]:
        if not account_ids:
            return []
        stmt = (
            select(Project)
            .options(*_project_load_options())
            .where(Project.account_id.in_(account_ids))
            .where(Project.deleted_at.is_(None))
            .order_by(Project.project_code)
        )
        return list(self._session.execute(stmt).unique().scalars().all())

    def update(self, project: Project, **fields) -> Project:
        for key, value in fields.items():
            if hasattr(project, key):
                setattr(project, key, value)
        self._session.flush()
        return project

    def soft_delete(self, project: Project) -> None:
        project.deleted_at = datetime.now(timezone.utc)
        project.status = "CLOSED"
        self._session.flush()
