"""Application-wide constants."""

from enum import StrEnum


class RoleCode(StrEnum):
    PM = "PM"
    CEO = "CEO"
    DELIVERY_MANAGER = "DELIVERY_MANAGER"
    DELIVERY_HEAD = "DELIVERY_HEAD"
    PLATFORM_ADMIN = "PLATFORM_ADMIN"
    DELIVERY_EXCELLENCE = "DELIVERY_EXCELLENCE"
