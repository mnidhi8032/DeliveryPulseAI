"""Account use cases."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.account_repository import AccountRepository
from app.repositories.business_unit_repository import BusinessUnitRepository
from app.schemas.account import AccountCreateRequest, AccountResponse, AccountUpdateRequest
from app.services.access_control_service import AccessControlService


class AccountService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._repo = AccountRepository(session)
        self._bu_repo = BusinessUnitRepository(session)
        self._access = AccessControlService(session)

    def create(self, user: User, body: AccountCreateRequest) -> AccountResponse:
        self._access.require_can_create_account(user)
        if self._bu_repo.get_by_id(body.business_unit_id) is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Business unit not found",
            )
        if self._repo.get_by_bu_and_code(body.business_unit_id, body.code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Account code already exists in business unit: {body.code}",
            )

        account = self._repo.create(
            business_unit_id=body.business_unit_id,
            code=body.code.strip().upper(),
            name=body.name.strip(),
            is_active=body.is_active,
        )
        self._session.commit()
        return AccountResponse.model_validate(account)

    def list(self, user: User) -> list[AccountResponse]:
        self._access.require_can_list_accounts(user)
        accounts = self._access.list_accounts_for_user(user)
        return [AccountResponse.model_validate(a) for a in accounts]

    def get_by_id(self, user: User, account_id: UUID) -> AccountResponse:
        account = self._repo.get_by_id(account_id)
        if account is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
        if self._access.is_platform_admin(user):
            return AccountResponse.model_validate(account)
        if self._access.is_customer_admin(user):
            return AccountResponse.model_validate(account)
        # Check if user is the Delivery Head of the Account's Business Unit
        if (
            self._access.is_delivery_head(user)
            and account.business_unit.delivery_head_user_id == user.id
        ):
            return AccountResponse.model_validate(account)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    def update(self, user: User, account_id: UUID, body: AccountUpdateRequest) -> AccountResponse:
        self._access.require_can_create_account(user)
        account = self._repo.get_by_id(account_id)
        if account is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
        
        self._repo.update(
            account,
            name=body.name.strip() if body.name else account.name,
            is_active=body.is_active if body.is_active is not None else account.is_active,
        )
        self._session.commit()
        return AccountResponse.model_validate(account)
