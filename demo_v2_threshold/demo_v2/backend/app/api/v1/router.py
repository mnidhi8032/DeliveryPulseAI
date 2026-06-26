"""API v1 router aggregation."""

from fastapi import APIRouter

from app.api.v1 import (
    accounts,
    action_items,
    auth,
    business_units,
    compliance,
    customer_admin,
    excel,
    governance_periods,
    governance_reviews,
    metric_definitions,
    metrics,
    metric_approvals,
    platform,
    project_phases,
    projects,
    submissions,
    notifications,
    audit,
    qpm,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(business_units.router)
api_router.include_router(customer_admin.router)
api_router.include_router(platform.router)
api_router.include_router(accounts.router)
api_router.include_router(projects.router)
api_router.include_router(project_phases.router)
api_router.include_router(governance_periods.router)
api_router.include_router(governance_reviews.router)
api_router.include_router(submissions.router)
api_router.include_router(metrics.router)
api_router.include_router(metric_definitions.router)
api_router.include_router(metric_approvals.router)
api_router.include_router(excel.router)
api_router.include_router(notifications.router)
api_router.include_router(audit.router)
api_router.include_router(qpm.router)
api_router.include_router(action_items.router)
api_router.include_router(compliance.router)
