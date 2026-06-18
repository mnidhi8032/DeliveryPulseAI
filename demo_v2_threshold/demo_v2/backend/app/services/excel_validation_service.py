"""Row-level validation for parsed Excel import rows."""

from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.metric_definition import MetricDefinition
from app.repositories.metric_definition_repository import MetricDefinitionRepository
from app.services.excel_parser_service import ParsedExcelRow
from app.services.metric_validation import MetricValidationError, validate_metric_value


@dataclass
class ValidatedExcelRow:
    row_number: int
    metric_code: str
    raw_value: str | None
    parsed_value: Decimal | None
    validation_errors: list[str]


class ExcelValidationService:
    def __init__(self, session: Session) -> None:
        self._definitions = MetricDefinitionRepository(session)
        self._known_codes = {d.code: d for d in self._definitions.list_active()}

    def validate_rows(self, parsed_rows: list[ParsedExcelRow]) -> list[ValidatedExcelRow]:
        """Validate each row independently; errors do not stop other rows."""
        results: list[ValidatedExcelRow] = []
        for row in parsed_rows:
            errors: list[str] = []
            parsed_value: Decimal | None = None

            definition: MetricDefinition | None = self._known_codes.get(row.metric_code)
            if definition is None:
                errors.append(f"Unknown metric code: {row.metric_code}")
            elif row.raw_value is None or row.raw_value == "":
                errors.append("Value is required")
            else:
                try:
                    parsed_value = validate_metric_value(definition, row.raw_value)
                except MetricValidationError as exc:
                    errors.append(exc.message)

            results.append(
                ValidatedExcelRow(
                    row_number=row.row_number,
                    metric_code=row.metric_code,
                    raw_value=row.raw_value,
                    parsed_value=parsed_value,
                    validation_errors=errors,
                )
            )
        return results

    @staticmethod
    def build_summary(validated: list[ValidatedExcelRow]) -> dict:
        valid = [r for r in validated if not r.validation_errors and r.parsed_value is not None]
        invalid = [r for r in validated if r.validation_errors]
        return {
            "total_rows": len(validated),
            "valid_rows": len(valid),
            "invalid_rows": len(invalid),
            "row_errors": [
                {"row_number": r.row_number, "metric_code": r.metric_code, "errors": r.validation_errors}
                for r in invalid
            ],
        }
