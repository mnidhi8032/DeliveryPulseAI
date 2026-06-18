"""Application configuration loaded from environment (.env supported)."""

from functools import lru_cache
from urllib.parse import quote_plus

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "DeliveryPulse AI API"
    ENVIRONMENT: str = Field(default="development", description="e.g. development, staging, production")

    # Primary connection string (see .env.example).
    DATABASE_URL: str | None = Field(
        default=None,
        description="SQLAlchemy URL, e.g. postgresql+psycopg2://user:pass@host:5432/deliverypulse_ai",
    )
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "root"
    POSTGRES_HOST: str = "127.0.0.1"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "deliverypulse_ai"

    JWT_SECRET: str = Field(
        default="dev-only-change-me-please-16chars",
        min_length=16,
        description="Signing key for JWT; override in production",
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    SQL_ECHO: bool = Field(
        default=False,
        description="If true, log SQL statements (ORM debugging)",
    )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def sqlalchemy_database_uri(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        user = quote_plus(self.POSTGRES_USER)
        password = quote_plus(self.POSTGRES_PASSWORD)
        host = self.POSTGRES_HOST
        port = self.POSTGRES_PORT
        db = self.POSTGRES_DB
        return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{db}"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
