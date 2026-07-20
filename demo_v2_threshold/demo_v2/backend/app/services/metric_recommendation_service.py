"""MetricRecommendation service — Spec 14 CRUD + lookup."""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.metric_recommendation import MetricRecommendation


class MetricRecommendationService:
    def __init__(self, session: Session) -> None:
        self._s = session

    # ── Read ──────────────────────────────────────────────────────────────────

    def list_all(self) -> list[MetricRecommendation]:
        return list(
            self._s.execute(
                select(MetricRecommendation)
                .order_by(MetricRecommendation.metric_name, MetricRecommendation.breach_type)
            ).scalars().all()
        )

    def get_for(self, metric_name: str, breach_type: str) -> MetricRecommendation | None:
        """Return the recommendation row for a metric + breach combination, or None."""
        return self._s.execute(
            select(MetricRecommendation).where(
                MetricRecommendation.metric_name == metric_name,
                MetricRecommendation.breach_type == breach_type,
            )
        ).scalar_one_or_none()

    # ── Write (Platform Admin only) ───────────────────────────────────────────

    def create(self, metric_name: str, breach_type: str, recommendation_text: str) -> MetricRecommendation:
        existing = self.get_for(metric_name, breach_type)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A recommendation for '{metric_name}' / '{breach_type}' already exists. Use PUT to update.",
            )
        row = MetricRecommendation(
            id=uuid.uuid4(),
            metric_name=metric_name,
            breach_type=breach_type,
            recommendation_text=recommendation_text,
        )
        self._s.add(row)
        self._s.commit()
        self._s.refresh(row)
        return row

    def upsert(self, metric_name: str, breach_type: str, recommendation_text: str) -> MetricRecommendation:
        """Create or update — used by seed scripts."""
        row = self.get_for(metric_name, breach_type)
        if row:
            row.recommendation_text = recommendation_text
        else:
            row = MetricRecommendation(
                id=uuid.uuid4(),
                metric_name=metric_name,
                breach_type=breach_type,
                recommendation_text=recommendation_text,
            )
            self._s.add(row)
        self._s.commit()
        self._s.refresh(row)
        return row

    def update(self, rec_id: uuid.UUID, recommendation_text: str) -> MetricRecommendation:
        row = self._s.get(MetricRecommendation, rec_id)
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")
        row.recommendation_text = recommendation_text
        self._s.commit()
        self._s.refresh(row)
        return row

    def delete(self, rec_id: uuid.UUID) -> None:
        row = self._s.get(MetricRecommendation, rec_id)
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")
        self._s.delete(row)
        self._s.commit()
