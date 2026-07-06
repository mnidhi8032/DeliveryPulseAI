"""Role-based access rules for organisational entities.

Role model:
- PLATFORM_ADMIN    : creates BUs, manages users/system config, full read access
- CEO               : read-only across ALL BUs and projects
- DELIVERY_HEAD     : read-only for their own BU — monitors trends
- DELIVERY_MANAGER  : reviews submissions for their accounts, adds commentary/actions
- PM                : creates/manages own projects, fills QPM plan, submits data
- DELIVERY_EXCELLENCE: manages metric catalog
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
    def is_delivery_head(user: User) -> bool:
        return user.role.code == RoleCode.DELIVERY_HEAD

    @staticmethod
    def is_delivery_manager(user: User) -> bool:
        return user.role.code == RoleCode.DELIVERY_MANAGER

    @staticmethod
    def is_delivery_excellence(user: User) -> bool:
        return user.role.code == RoleCode.DELIVERY_EXCELLENCE

    @staticmethod
    def is_pm(user: User) -> bool:
        return user.role.code == RoleCode.PM

    # Convenience: any reviewer-level role
    @staticmethod
    def is_reviewer(user: User) -> bool:
        return user.role.code in (
            RoleCode.DELIVERY_MANAGER,
            RoleCode.DELIVERY_HEAD,
            RoleCode.CEO,
            RoleCode.PLATFORM_ADMIN,
        )

    # Legacy compat
    @staticmethod
    def is_customer_admin(user: User) -> bool:
        return user.role.code in (RoleCode.CEO, RoleCode.DELIVERY_HEAD)

    # ── Require helpers ───────────────────────────────────────────────────────

    def require_platform_admin(self, user: User) -> None:
        if not self.is_platform_admin(user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Platform Admin role required")

    def require_delivery_head(self, user: User) -> None:
        if not self.is_delivery_head(user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Delivery Head role required")

    def require_delivery_manager(self, user: User) -> None:
        if not self.is_delivery_manager(user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Delivery Manager role required")

    def require_can_create_business_unit(self, user: User) -> None:
        self.require_platform_admin(user)

    def require_can_create_account(self, user: User) -> None:
        self.require_platform_admin(user)

    def require_can_create_project(self, user: User) -> None:
        if not self.is_pm(user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Project Manager role required to create projects")

    def require_can_list_accounts(self, user: User) -> None:
        return  # all roles can list accounts

    def require_can_list_projects(self, user: User) -> None:
        return  # all roles can list projects (service-layer scoped)

    # ── List helpers ──────────────────────────────────────────────────────────

    def list_business_units_for_user(self, user: User) -> list[BusinessUnit]:
        if self.is_platform_admin(user) or self.is_ceo(user):
            return self._business_units.list_all()
        if self.is_delivery_head(user):
            from sqlalchemy import select
            stmt = (
                select(BusinessUnit)
                .where(BusinessUnit.bu_head_user_id == user.id)
                .where(BusinessUnit.deleted_at.is_(None))
            )
            return list(self._session.execute(stmt).scalars().all())
        if self.is_delivery_manager(user):
            # DM sees BUs of their assigned accounts
            dm_accounts = self._get_dm_accounts(user.id)
            bu_ids = {a.business_unit_id for a in dm_accounts}
            if not bu_ids:
                return []
            from sqlalchemy import select
            stmt = (
                select(BusinessUnit)
                .where(BusinessUnit.id.in_(bu_ids))
                .where(BusinessUnit.deleted_at.is_(None))
            )
            return list(self._session.execute(stmt).scalars().all())
        return []

    def list_accounts_for_user(self, user: User) -> list[Account]:
        if self.is_platform_admin(user) or self.is_ceo(user):
            return self._accounts.list_all()
        if self.is_delivery_head(user):
            from sqlalchemy import select
            bu_ids_stmt = select(BusinessUnit.id).where(
                BusinessUnit.bu_head_user_id == user.id,
                BusinessUnit.deleted_at.is_(None),
            )
            bu_ids = [r[0] for r in self._session.execute(bu_ids_stmt).fetchall()]
            if not bu_ids:
                return []
            return self._accounts.list_by_business_units(bu_ids)
        if self.is_delivery_manager(user):
            return self._get_dm_accounts(user.id)
        if self.is_pm(user):
            # PM sees only accounts belonging to their assigned BU
            from sqlalchemy import select
            bu_ids_stmt = select(BusinessUnit.id).where(
                BusinessUnit.pm_user_id == user.id,
                BusinessUnit.deleted_at.is_(None),
            )
            bu_ids = [r[0] for r in self._session.execute(bu_ids_stmt).fetchall()]
            if not bu_ids:
                return self._accounts.list_all()  # fallback: no BU assigned yet
            return self._accounts.list_by_business_units(bu_ids)
        return []

    def list_projects_for_user(self, user: User) -> list[Project]:
        if self.is_platform_admin(user) or self.is_ceo(user) or self.is_delivery_excellence(user):
            return self._projects.list_all()
        if self.is_delivery_head(user):
            return self._projects.list_by_delivery_head(user.id)
        if self.is_delivery_manager(user):
            accounts = self._get_dm_accounts(user.id)
            account_ids = [a.id for a in accounts]
            return self._projects.list_by_account_ids(account_ids)
        if self.is_pm(user):
            return self._projects.list_by_project_manager(user.id)
        return []

    # ── Project-level access ──────────────────────────────────────────────────

    def require_can_view_project(self, user: User, project: Project) -> None:
        if self.is_platform_admin(user) or self.is_ceo(user) or self.is_delivery_excellence(user):
            return
        if self.is_pm(user) and project.project_manager_id == user.id:
            return
        if self.is_delivery_head(user):
            from sqlalchemy import select
            acc = self._session.get(Account, project.account_id)
            if acc:
                bu = self._session.get(BusinessUnit, acc.business_unit_id)
                if bu and bu.bu_head_user_id == user.id:
                    return
        if self.is_delivery_manager(user):
            # DM can view projects in their assigned accounts
            dm_account_ids = {a.id for a in self._get_dm_accounts(user.id)}
            if project.account_id in dm_account_ids:
                return
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Insufficient permissions to view this project")

    def require_can_manage_project(self, user: User, project: Project) -> None:
        if self.is_platform_admin(user):
            return
        if self.is_pm(user) and project.project_manager_id == user.id:
            return
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Project Manager role required to manage this project")

    # ── DM account assignment helper ──────────────────────────────────────────

    def _get_dm_accounts(self, user_id: uuid.UUID) -> list[Account]:
        """Return accounts assigned to a Delivery Manager.

        DMs are assigned to accounts via the account.delivery_manager_user_id column.
        One DM can manage multiple accounts.
        """
        from sqlalchemy import select
        stmt = (
            select(Account)
            .where(Account.delivery_manager_user_id == user_id)
        )
        return list(self._session.execute(stmt).scalars().all())
