import type { MetricDefinition } from "../types/metrics";

export function validateMetricInput(
  definition: MetricDefinition,
  raw: string,
): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return "Value is required";
  }

  const num = Number(trimmed);
  if (Number.isNaN(num)) {
    return "Must be a number";
  }

  const rules = definition.validation_rules ?? {};

  if (definition.data_type === "integer" && !Number.isInteger(num)) {
    return "Must be a whole number";
  }

  if (rules.min !== undefined && num < Number(rules.min)) {
    return `Must be at least ${rules.min}`;
  }
  if (rules.max !== undefined && num > Number(rules.max)) {
    return `Must be at most ${rules.max}`;
  }
  if (rules.min_exclusive && rules.min !== undefined && num <= Number(rules.min)) {
    return `Must be greater than ${rules.min}`;
  }

  return null;
}

export function inputModeForDataType(
  dataType: string,
): "numeric" | "decimal" | undefined {
  if (dataType === "integer") {
    return "numeric";
  }
  if (dataType === "decimal") {
    return "decimal";
  }
  return undefined;
}
