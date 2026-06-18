"""Shared enumerations."""

from enum import StrEnum


class ProjectStatus(StrEnum):
    ACTIVE = "ACTIVE"
    ON_HOLD = "ON_HOLD"
    COMPLETED = "COMPLETED"
    CLOSED = "CLOSED"
