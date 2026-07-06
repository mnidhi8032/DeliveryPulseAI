"""Business unit use cases."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.business_unit import BusinessUnit
from app.repositories.business_unit_repository import BusinessUnitRepository
from app.schemas.business_unit import (
    BusinessUnitCreateRequest,
    BusinessUnitResponse,
    BusinessUnitUpdateRequest,
)
from app.services.access_control_service import AccessControlService


class BusinessUnitService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._repo = BusinessUnitRepository(session)
        self._access = AccessControlService(session)

    def create(self, user: User, body: BusinessUnitCreateRequest) -> BusinessUnitResponse:
        self._access.require_can_create_business_unit(user)
        if self._repo.get_by_code(body.code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Business unit code already exists: {body.code}",
            )
        bu = self._repo.create(
            code=body.code.strip().upper(),
            name=body.name.strip(),
            description=body.description,
            delivery_head_user_id=None,
            is_active=body.is_active,
        )
        self._session.commit()
        return BusinessUnitResponse.model_validate(bu)

    def list(self, user: User) -> list[BusinessUnitResponse]:
        if self._access.is_platform_admin(user) or self._access.is_ceo(user):
            units = self._repo.list_all()
        elif self._access.is_delivery_head(user):
            units = self._access.list_business_units_for_user(user)
        elif self._access.is_pm(user):
            # PM needs to list BUs to pick accounts when creating projects
            units = self._repo.list_all()
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to list business units",
            )
        return [BusinessUnitResponse.model_validate(b) for b in units]

    def get_by_id(self, user: User, bu_id: UUID) -> BusinessUnitResponse:
        if not (
            self._access.is_platform_admin(user)
            or self._access.is_ceo(user)
            or self._access.is_delivery_head(user)
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view business units",
            )
        bu = self._repo.get_by_id(bu_id)
        if bu is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business unit not found")
        if self._access.is_delivery_head(user):
            allowed_ids = {b.id for b in self._access.list_business_units_for_user(user)}
            if bu.id not in allowed_ids:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this BU")
        return BusinessUnitResponse.model_validate(bu)

    def update(
        self, user: User, bu_id: UUID, body: BusinessUnitUpdateRequest
    ) -> BusinessUnitResponse:
        # Customer Admin owns BU configuration.
        self._access.require_can_create_business_unit(user)
        bu = self._repo.get_by_id(bu_id)
        if bu is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business unit not found")
        if body.delivery_head_user_id:
            existing = self._session.query(BusinessUnit).filter(
                BusinessUnit.delivery_head_user_id == body.delivery_head_user_id,
                BusinessUnit.is_active == True,
                BusinessUnit.id != bu_id,
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Delivery Head is already assigned to another active Business Unit: {existing.name}",
                )
        self._repo.update(
            bu,
            name=body.name.strip() if body.name else None,
            description=body.description,
            delivery_head_user_id=body.delivery_head_user_id if body.delivery_head_user_id is not None else bu.delivery_head_user_id,
            bu_head_user_id=body.bu_head_user_id if "bu_head_user_id" in body.model_fields_set else bu.bu_head_user_id,
            is_active=body.is_active if body.is_active is not None else bu.is_active,
        )
        self._session.commit()
        return BusinessUnitResponse.model_validate(bu)
