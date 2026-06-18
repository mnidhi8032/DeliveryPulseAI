"""Generate downloadable governance Excel template."""

from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Font
from sqlalchemy.orm import Session

from app.repositories.metric_definition_repository import MetricDefinitionRepository

TEMPLATE_HEADERS = ["metric_code", "metric_name", "value", "dimension", "description"]


def build_template_workbook(session: Session) -> bytes:
    """Build xlsx bytes with all active metric definitions and empty value column."""
    definitions = MetricDefinitionRepository(session).list_active()
    wb = Workbook()
    ws = wb.active
    ws.title = "Governance Metrics"
    ws.append(TEMPLATE_HEADERS)
    for cell in ws[1]:
        cell.font = Font(bold=True)

    for definition in definitions:
        ws.append(
            [
                definition.code,
                definition.name,
                "",
                definition.dimension,
                definition.description or "",
            ]
        )

    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()
