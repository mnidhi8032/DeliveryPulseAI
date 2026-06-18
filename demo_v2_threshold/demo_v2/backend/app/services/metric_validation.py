"""Validate metric values against definition rules."""

from decimal import Decimal, InvalidOperation

from app.models.metric_definition import MetricDefinition


class MetricValidationError(Exception):
    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


def validate_metric_value(definition: MetricDefinition, raw_value: Decimal | float | int | str) -> Decimal:
    try:
        value = Decimal(str(raw_value))
    except (InvalidOperation, ValueError) as exc:
        raise MetricValidationError(definition.code, "Value must be numeric") from exc

    rules = definition.validation_rules or {}
    data_type = definition.data_type

    if data_type == "integer":
        if value != value.to_integral_value():
            raise MetricValidationError(definition.code, "Value must be an integer")
        value = Decimal(int(value))

    if "min" in rules and value < Decimal(str(rules["min"])):
        raise MetricValidationError(definition.code, f"Value must be >= {rules['min']}")
    if "max" in rules and value > Decimal(str(rules["max"])):
        raise MetricValidationError(definition.code, f"Value must be <= {rules['max']}")
    if rules.get("min_exclusive") is True and "min" in rules and value <= Decimal(str(rules["min"])):
        raise MetricValidationError(definition.code, f"Value must be > {rules['min']}")

    return value
