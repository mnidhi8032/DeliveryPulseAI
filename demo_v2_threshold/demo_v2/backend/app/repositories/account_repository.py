"""Account data access."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.account import Account


class AccountRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, **kwargs) -> Account:
        account = Account(**kwargs)
        self._session.add(account)
        self._session.flush()
        return account

    def get_by_id(self, account_id: uuid.UUID) -> Account | None:
        stmt = (
            select(Account)
            .where(Account.id == account_id)
            .where(Account.deleted_at.is_(None))
        )
        return self._session.execute(stmt).scalar_one_or_none()

    def get_by_bu_and_code(self, business_unit_id: uuid.UUID, code: str) -> Account | None:
        stmt = (
            select(Account)
            .where(Account.business_unit_id == business_unit_id)
            .where(Account.code == code)
            .where(Account.deleted_at.is_(None))
        )
        return self._session.execute(stmt).scalar_one_or_none()

    def list_all(self) -> list[Account]:
        stmt = (
            select(Account)
            .where(Account.deleted_at.is_(None))
            .order_by(Account.name)
        )
        return list(self._session.execute(stmt).scalars().all())

    def list_by_delivery_head(self, user_id: uuid.UUID) -> list[Account]:
        from app.models.business_unit import BusinessUnit
        stmt = (
            select(Account)
            .join(BusinessUnit)
            .where(BusinessUnit.delivery_head_user_id == user_id)
            .where(Account.deleted_at.is_(None))
            .order_by(Account.name)
        )
        return list(self._session.execute(stmt).scalars().all())

    def list_by_business_units(self, business_unit_ids: list[uuid.UUID]) -> list[Account]:
        """Return accounts belonging to any of the given BU ids."""
        if not business_unit_ids:
            return []
        stmt = (
            select(Account)
            .where(Account.business_unit_id.in_(business_unit_ids))
            .where(Account.deleted_at.is_(None))
            .order_by(Account.name)
        )
        return list(self._session.execute(stmt).scalars().all())

    def list_by_business_unit(self, business_unit_id: uuid.UUID) -> list[Account]:
        stmt = (
            select(Account)
            .where(Account.business_unit_id == business_unit_id)
            .where(Account.deleted_at.is_(None))
            .order_by(Account.name)
        )
        return list(self._session.execute(stmt).scalars().all())

    def update(self, account: Account, **fields) -> Account:
        for key, value in fields.items():
            if hasattr(account, key):
                setattr(account, key, value)
        self._session.flush()
        return account

    def soft_delete(self, account: Account) -> None:
        account.deleted_at = datetime.now(timezone.utc)
        account.is_active = False
        self._session.flush()
