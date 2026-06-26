"""Metric approval request service — PM requests custom metric, DE approves/rejects."""
import uuid
import json
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.metric_approval_request import MetricApprovalRequest
from app.models.kpi_plan import KpiPlan, KpiPlanMetric
from app.models.notification import Notification
from app.models.user import User
from app.core.constants import RoleCode
from app.schemas.metric_approval import (
    MetricApprovalRequestCreate,
    MetricApprovalRequestResponse,
    MetricApprovalDecision,
)
from app.services.qpm_service import get_required_measures


class MetricApprovalService:
    def __init__(self, session: Session) -> None:
        self._s = session

    def _to_response(self, req: MetricApprovalRequest) -> MetricApprovalRequestResponse:
        project_name = None
        try:
            plan = self._s.get(KpiPlan, req.kpi_plan_id)
            if plan:
                from app.models.project import Project
                project = self._s.get(Project, plan.project_id)
                if project:
                    project_name = project.project_name
        except Exception:
            pass
        return MetricApprovalRequestResponse(
            id=req.id,
            kpi_plan_id=req.kpi_plan_id,
            requested_by_user_id=req.requested_by_user_id,
            reviewed_by_user_id=req.reviewed_by_user_id,
            metric_name=req.metric_name,
            metric_category=req.metric_category,
            formula=req.formula,
            uom=req.uom,
            intent=req.intent,
            frequency=req.frequency,
            priority=req.priority,
            justification=req.justification,
            status=req.status,
            review_comments=req.review_comments,
            reviewed_at=req.reviewed_at,
            created_at=req.created_at,
            updated_at=req.updated_at,
            requested_by_name=req.requested_by.full_name if req.requested_by else None,
            project_name=project_name,
        )

    def create_request(self, user: User, body: MetricApprovalRequestCreate) -> MetricApprovalRequestResponse:
        if user.role.code != RoleCode.PM:
            raise HTTPException(status_code=403, detail="PM role required")
        if not body.justification or not body.justification.strip():
            raise HTTPException(status_code=400, detail="Justification is required for custom metric requests.")

        # Check no duplicate pending request for same metric name in same plan
        existing = self._s.execute(
            select(MetricApprovalRequest).where(
                MetricApprovalRequest.kpi_plan_id == body.kpi_plan_id,
                MetricApprovalRequest.metric_name == body.metric_name,
                MetricApprovalRequest.status == "PENDING",
            )
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail=f"A pending request for '{body.metric_name}' already exists.")

        req = MetricApprovalRequest(
            id=uuid.uuid4(),
            kpi_plan_id=body.kpi_plan_id,
            requested_by_user_id=user.id,
            metric_name=body.metric_name,
            metric_category=body.metric_category,
            formula=body.formula,
            uom=body.uom,
            intent=body.intent,
            frequency=body.frequency,
            priority=body.priority or "O",
            justification=body.justification.strip(),
            status="PENDING",
        )
        self._s.add(req)
        self._s.flush()

        # Notify all Delivery Excellence users
        from app.models.role import Role
        de_role = self._s.execute(
            select(Role).where(Role.code == RoleCode.DELIVERY_EXCELLENCE)
        ).scalar_one_or_none()
        if de_role:
            de_users = self._s.execute(
                select(User).where(User.role_id == de_role.id, User.is_active == True)
            ).scalars().all()
            plan = self._s.get(KpiPlan, body.kpi_plan_id)
            project_name = ""
            if plan:
                from app.models.project import Project
                project = self._s.get(Project, plan.project_id)
                if project:
                    project_name = project.project_name
            for de_user in de_users:
                self._s.add(Notification(
                    user_id=de_user.id,
                    title="Custom Metric Request",
                    message=f"{user.full_name} requested to add custom metric '{body.metric_name}' for project {project_name}. Reason: {body.justification[:100]}",
                    category="WORKFLOW",
                    type="METRIC_APPROVAL_REQUEST",
                    is_read=False,
                ))
        self._s.commit()
        self._s.refresh(req)
        return self._to_response(req)

    def list_pending(self, user: User) -> list[MetricApprovalRequestResponse]:
        """DE sees all pending requests; PM sees their own."""
        stmt = select(MetricApprovalRequest).options(
            selectinload(MetricApprovalRequest.requested_by)
        ).order_by(MetricApprovalRequest.created_at.desc())
        if user.role.code == RoleCode.PM:
            stmt = stmt.where(MetricApprovalRequest.requested_by_user_id == user.id)
        elif user.role.code not in (RoleCode.DELIVERY_EXCELLENCE, RoleCode.PLATFORM_ADMIN):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        rows = self._s.execute(stmt).scalars().all()
        return [self._to_response(r) for r in rows]

    def decide(self, user: User, request_id: uuid.UUID, body: MetricApprovalDecision) -> MetricApprovalRequestResponse:
        if user.role.code not in (RoleCode.DELIVERY_EXCELLENCE, RoleCode.PLATFORM_ADMIN):
            raise HTTPException(status_code=403, detail="Delivery Excellence role required")
        if body.action not in ("APPROVE", "REJECT"):
            raise HTTPException(status_code=400, detail="action must be APPROVE or REJECT")

        req = self._s.execute(
            select(MetricApprovalRequest).options(selectinload(MetricApprovalRequest.requested_by))
            .where(MetricApprovalRequest.id == request_id)
        ).scalar_one_or_none()
        if req is None:
            raise HTTPException(status_code=404, detail="Request not found")
        if req.status != "PENDING":
            raise HTTPException(status_code=400, detail=f"Request is already {req.status}")

        now = datetime.now(timezone.utc)
        req.status = "APPROVED" if body.action == "APPROVE" else "REJECTED"
        req.reviewed_by_user_id = user.id
        req.review_comments = body.review_comments
        req.reviewed_at = now
        req.updated_at = now

        if body.action == "APPROVE":
            # Add the metric to the KPI plan
            required = get_required_measures(req.metric_name)
            pm = KpiPlanMetric(
                id=uuid.uuid4(),
                kpi_plan_id=req.kpi_plan_id,
                catalog_metric_id=None,
                metric_name=req.metric_name,
                metric_category=req.metric_category,
                formula=req.formula,
                uom=req.uom,
                intent=req.intent,
                frequency=req.frequency,
                priority=req.priority or "O",
                is_custom=True,
                reported_to_customer=False,
                is_active=True,
                required_measures=json.dumps(required),
            )
            self._s.add(pm)

        # Notify the PM
        action_label = "approved" if body.action == "APPROVE" else "rejected"
        msg = f"Your request to add custom metric '{req.metric_name}' has been {action_label} by {user.full_name}."
        if body.review_comments:
            msg += f" Comments: {body.review_comments}"
        self._s.add(Notification(
            user_id=req.requested_by_user_id,
            title=f"Metric Request {action_label.capitalize()}",
            message=msg,
            category="APPROVAL",
            type=f"METRIC_REQUEST_{body.action}D",
            is_read=False,
        ))

        self._s.commit()
        self._s.refresh(req)
        return self._to_response(req)
