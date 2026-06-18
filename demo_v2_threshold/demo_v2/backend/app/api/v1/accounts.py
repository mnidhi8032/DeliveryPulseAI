"""Account API routes."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.core.constants import RoleCode
from app.models.user import User
from app.schemas.account import AccountCreateRequest, AccountResponse, AccountUpdateRequest
from app.services.account_service import AccountService

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountResponse])
def list_accounts(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[AccountResponse]:
    return AccountService(db).list(current_user)


@router.post("", response_model=AccountResponse, status_code=201)
def create_account(
    body: AccountCreateRequest,
    current_user: Annotated[User, Depends(require_roles(RoleCode.PLATFORM_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
) -> AccountResponse:
    return AccountService(db).create(current_user, body)


@router.get("/{account_id}", response_model=AccountResponse)
def get_account(
    account_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AccountResponse:
    return AccountService(db).get_by_id(current_user, account_id)


@router.patch("/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: UUID,
    body: AccountUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AccountResponse:
    return AccountService(db).update(current_user, account_id, body)
