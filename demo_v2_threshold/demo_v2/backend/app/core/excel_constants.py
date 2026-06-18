"""Excel import batch status codes."""

from enum import StrEnum


class ExcelImportBatchStatus(StrEnum):
    UPLOADED = "UPLOADED"
    PARSED = "PARSED"
    VALIDATED = "VALIDATED"
    FAILED = "FAILED"
    APPLIED = "APPLIED"
