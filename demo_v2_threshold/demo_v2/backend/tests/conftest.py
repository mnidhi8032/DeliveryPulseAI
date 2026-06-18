"""Pytest fixtures for API and database tests with database isolation."""

import os
from app.core.settings import settings

# Force the settings to point to the isolated test database before any other imports
settings.DATABASE_URL = "postgresql+psycopg2://postgres:root@127.0.0.1:5432/deliverypulse_ai_test"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.main import app
from database.database import SessionLocal, engine
from app.models.base import Base


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    # 1. Connect to standard postgres maintenance DB and ensure the test database exists
    admin_url = "postgresql+psycopg2://postgres:root@127.0.0.1:5432/postgres"
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = 'deliverypulse_ai_test'")
        ).scalar()
        if not exists:
            conn.execute(text("CREATE DATABASE deliverypulse_ai_test"))
            print("Created isolated test database: deliverypulse_ai_test")

    # 2. Re-create all tables in deliverypulse_ai_test
    # Import all models to ensure they are registered with the Base metadata
    import app.models  # noqa: F401
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Test database schema created.")

    # 3. Seed required master lookup data in the test database
    from scripts.seed_roles import seed_roles
    from scripts.seed_submission_statuses import seed as seed_statuses
    from scripts.seed_metric_definitions import main as seed_metrics
    from scripts.seed_governance_periods import seed as seed_periods

    seed_roles()
    seed_statuses()
    seed_metrics()
    seed_periods()

    # 4. Seed core users needed by integration tests
    from app.repositories.user_repository import UserRepository
    from app.auth.password import hash_password
    from app.models.role import Role
    from sqlalchemy import select
    
    with SessionLocal() as session:
        role_pm = session.execute(select(Role).where(Role.code == "PM")).scalar_one()
        role_dh = session.execute(select(Role).where(Role.code == "DELIVERY_HEAD")).scalar_one()
        role_ca = session.execute(select(Role).where(Role.code == "CUSTOMER_ADMIN")).scalar_one()
        role_pa = session.execute(select(Role).where(Role.code == "PLATFORM_ADMIN")).scalar_one()
        
        repo = UserRepository(session)
        
        for email, name, role in [
            ("pm1@deliverypulse.ai", "Sarah (PM)", role_pm),
            ("pm2@deliverypulse.ai", "John (PM)", role_pm),
            ("priya.dh@deliverypulse.ai", "Priya (Delivery Head)", role_dh),
            ("rajesh.dh@deliverypulse.ai", "Rajesh (Delivery Head)", role_dh),
            ("customer.admin@deliverypulse.ai", "Customer Admin", role_ca),
            ("admin@deliverypulse.ai", "Platform Administrator", role_pa),
        ]:
            if repo.get_by_email(email) is None:
                repo.create_user(
                    email=email,
                    password_hash=hash_password("Demo@12345" if "admin@" not in email else "Admin@123"),
                    full_name=name,
                    role_id=role.id,
                )
        session.commit()
    print("Test database master data and core users seeded successfully.")



@pytest.fixture
def db_session() -> Session:
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session: Session) -> TestClient:
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

