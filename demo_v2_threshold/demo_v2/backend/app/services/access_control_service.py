"""Role-based access rules for organisational entities.

New role model:
- PLATFORM_ADMIN  : creates BUs, manages users/system config, read-only on org data
- CEO             : read-only across ALL BUs and projects (customer-level oversight)
- BU_HEAD         : read-only for their own BU only (assigned via business_unit.bu_head_user_id)
- PM              : creates/manages own projects, fills QPM plan, submits — no DH review
"""

import uuid

from fastapi import HTTPException, status

from app.core.constants import RoleCode
from app.models.business_unit import BusinessUnit
from app.models.account import Account
from app.models.project import Project
from app.models.user import User
from app.repositories.business_unit_repository import BusinessUnitRepository
from app.repositories.account_repository import AccountRepository
from app.repositories.project_repository import ProjectRepository


class AccessControlService:
    def __init__(self, session) -> None:
        self._business_units = BusinessUnitRepository(session)
        self._accounts = AccountRepository(session)
        self._projects = ProjectRepository(session)
        self._session = session

    # ── Role checks ──────────────────────────────────────────────────────────

    @staticmethod
    def is_platform_admin(user: User) -> bool:
        return user.role.code == RoleCode.PLATFORM_ADMIN

    @staticmethod
    def is_ceo(user: User) -> bool:
        return user.role.code == RoleCode.CEO

    @staticmethod
    def is_bu_head(user: User) -> bool:
        return user.role.code == RoleCode.BU_HEAD

    @staticmethod
    def is_delivery_excellence(user: User) -> bool:
        return user.role.code == RoleCode.DELIVERY_EXCELLENCE

    @staticmethod
    def is_pm(user: User) -> bool:
        return user.role.code == RoleCode.PM

    # Keep backward-compat helpers so existing code doesn't break immediately
    @staticmethod
    def is_delivery_head(user: User) -> bool:
        return False  # role no longer exists

    @staticmethod
    def is_customer_admin(user: User) -> bool:
        return user.role.code in (RoleCode.CEO, RoleCode.BU_HEAD)

    # ── Require helpers ───────────────────────────────────────────────────────

    def require_platform_admin(self, user: User) -> None:
        if not self.is_platform_admin(user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Platform Admin role required")

    def require_ceo(self, user: User) -> None:
        if not self.is_ceo(user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="CEO role required")

    def require_bu_head(self, user: User) -> None:
        if not self.is_bu_head(user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="BU Head role required")

    def require_can_create_business_unit(self, user: User) -> None:
        """Only Platform Admin creates BUs."""
        self.require_platform_admin(user)

    def require_can_create_account(self, user: User) -> None:
        """Only Platform Admin creates Accounts."""
        self.require_platform_admin(user)

    def require_can_create_project(self, user: User) -> None:
        """PM can create projects (auto-assigned as PM)."""
        if not self.is_pm(user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Project Manager role required to create projects")

    def require_can_list_accounts(self, user: User) -> None:
        # All roles can list accounts (PM needs it to create projects)
        return

    def require_can_list_projects(self, user: User) -> None:
        return

    # ── List helpers ──────────────────────────────────────────────────────────

    def list_business_units_for_user(self, user: User) -> list[BusinessUnit]:
        """
        - Platform Admin : all BUs
        - CEO            : all BUs (org-wide read)
        - BU Head        : only BUs where they are assigned as bu_head
        - PM             : none
        """
        if self.is_platform_admin(user) or self.is_ceo(user):
            return self._business_units.list_all()
        if self.is_bu_head(user):
            from sqlalchemy import select
            stmt = (
                select(BusinessUnit)
                .where(BusinessUnit.bu_head_user_id == user.id)
                .where(BusinessUnit.deleted_at.is_(None))
            )
            return list(self._session.execute(stmt).scalars().all())
        return []

    def list_accounts_for_user(self, user: User) -> list[Account]:
        if self.is_platform_admin(user) or self.is_ceo(user):
            return self._accounts.list_all()
        if self.is_bu_head(user):
            # Accounts under BUs assigned to this BU Head
            from sqlalchemy import select
            bu_ids_stmt = select(BusinessUnit.id).where(
                BusinessUnit.bu_head_user_id == user.id,
                BusinessUnit.deleted_at.is_(None),
            )
            bu_ids = [r[0] for r in self._session.execute(bu_ids_stmt).fetchall()]
            if not bu_ids:
                return []
            return self._accounts.list_by_business_units(bu_ids)
        if self.is_pm(user):
            return self._accounts.list_all()
        return []

    def list_projects_for_user(self, user: User) -> list[Project]:
        if self.is_platform_admin(user) or self.is_ceo(user):
            return self._projects.list_all()
        if self.is_bu_head(user):
            return self._projects.list_by_bu_head(user.id)
        if self.is_pm(user):
            return self._projects.list_by_project_manager(user.id)
        return []

    # ── Project-level access ──────────────────────────────────────────────────

    def require_can_view_project(self, user: User, project: Project) -> None:
        if self.is_platform_admin(user) or self.is_ceo(user):
            return
        if self.is_pm(user) and project.project_manager_id == user.id:
            return
        if self.is_bu_head(user):
            # BU Head can view projects in their BU
            from sqlalchemy import select
            from app.models.account import Account
            acc = self._session.get(Account, project.account_id)
            if acc:
                bu = self._session.get(BusinessUnit, acc.business_unit_id)
                if bu and bu.bu_head_user_id == user.id:
                    return
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Insufficient permissions to view this project")

    def require_can_manage_project(self, user: User, project: Project) -> None:
        """Only PM can manage their own projects. Platform Admin has full access."""
        if self.is_platform_admin(user):
            return
        if self.is_pm(user) and project.project_manager_id == user.id:
            return
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Project Manager role required to manage this project")
