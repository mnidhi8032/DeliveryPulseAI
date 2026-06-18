# DeliveryPulse AI — Backend (foundation)

Foundation only: FastAPI app shell, settings, SQLAlchemy engine/session, Alembic, empty package layout. **No business logic, no API routes.**

Aligned with `docs/PRODUCT_SPECIFICATION.md` and `docs/BACKEND_ARCHITECTURE.md`.

---

## Folder structure

| Path | Purpose |
|------|---------|
| `app/` | Main Python package: FastAPI app, domain layout. |
| `app/main.py` | FastAPI application instance and lifespan (no routers yet). |
| `app/core/` | Cross-cutting config: `settings.py` (Pydantic settings / env). |
| `app/models/` | SQLAlchemy ORM — currently only `base.py` (`DeclarativeBase`). Table models come in later phases. |
| `app/schemas/` | Pydantic API DTOs (empty placeholder). |
| `app/api/` | FastAPI routers (empty placeholder). |
| `app/services/` | Use-case / orchestration layer (empty placeholder). |
| `app/repositories/` | Data access / queries (empty placeholder). |
| `app/middleware/` | HTTP middleware (empty placeholder). |
| `app/auth/` | JWT helpers and auth dependencies (empty placeholder). |
| `app/excel/` | pandas / openpyxl import pipeline (empty placeholder). |
| `app/health_engine/` | Scoring engine (empty placeholder). |
| `app/audit/` | Audit log writers (empty placeholder). |
| `database/` | **Infrastructure** package: `database.py` — SQLAlchemy `engine`, `SessionLocal`, `get_db()` generator. |
| `alembic/` | Alembic migrations; `env.py` reads DB URL from `app.core.settings`. |
| `tests/` | Pytest tests (`test_database_connection.py` smoke test). |

**Boundary:** `database/` talks to PostgreSQL only. `app/models/` defines metadata for Alembic. Routers and services are not wired yet.

---

## Environment variables

Copy `.env.example` to `.env` in this directory (`backend/.env`).

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLAlchemy URL for **new** DB `deliverypulse_ai` only. |
| `JWT_SECRET` | HMAC secret for JWT (min 16 chars in `Settings`). |
| `JWT_ALGORITHM` | e.g. `HS256`. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL. |
| `APP_NAME` | API title. |
| `ENVIRONMENT` | `development` / `staging` / `production`. |
| `SQL_ECHO` | Optional; set `true` to log SQL. |

If `DATABASE_URL` is unset, URL is built from `POSTGRES_*` fields in `settings.py`.

---

## Database connection lifecycle

1. **Engine** — Created at import time in `database/database.py` using `create_engine(..., pool_pre_ping=True)`. The pool opens connections lazily.
2. **Session** — `SessionLocal()` creates a session bound to the engine. `get_db()` yields one session per request and **always** closes it in `finally` (pattern for future `Depends(get_db)`).
3. **Transactions** — Not started automatically here; future services will use `session.begin()` or explicit `commit`/`rollback`.
4. **Migrations** — Alembic uses the same URL from settings; schema changes are versioned under `alembic/versions/`.

---

## First implementation order (exact)

1. **Database connection** — Done: `database/database.py`, `app/core/settings.py`, Alembic `env.py`.
2. **User model** — Add `app/models/user.py` + Alembic revision (after auth design is fixed).
3. **Authentication** — `app/auth/`, JWT login, `Depends` guards.
4. **Project model** — `projects`, `accounts`, `business_units` per architecture doc.
5. **Submission model** — `submissions`, lifecycle, `submission_status`.
6. **Metric model** — `metric_definitions`, `metric_values`.
7. **Health engine** — `app/health_engine/` pure scoring + persistence via repositories.

---

## Run instructions (PowerShell)

Run all commands from the **`backend`** directory: `cd d:\FROM_SCRATCH\demo_v1\backend`

### 1. Create the new database only (does not alter other databases)

**Option A — `psql` (if on PATH):**

```powershell
$env:PGPASSWORD = "root"
psql -h 127.0.0.1 -p 5432 -U postgres -c "CREATE DATABASE deliverypulse_ai;"
```

**Option B — Python helper (no `psql` required):** uses the built-in `postgres` database only to run `CREATE DATABASE`.

```powershell
cd d:\FROM_SCRATCH\demo_v1\backend
Copy-Item .env.example .env
.\.venv\Scripts\python scripts\create_database.py
```

Using **`127.0.0.1`** in `DATABASE_URL` avoids some Windows setups resolving `localhost` to IPv6 (`::1`) when the server listens on IPv4 only.

If the database already exists, both methods are safe; no other databases are modified.

### 2. Virtual environment

```powershell
cd d:\FROM_SCRATCH\demo_v1\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Environment file

```powershell
Copy-Item .env.example .env
# Edit .env if your password or host differs
```

### 5. Initialize Alembic (already present in repo)

This repository already contains `alembic.ini` and `alembic/`. To recreate from scratch elsewhere you would run:

```powershell
alembic init alembic
```

(On this project, skip re-init to avoid overwriting `env.py`.)

### 6. Apply migrations

```powershell
alembic upgrade head
```

### 7. Start FastAPI (no routes yet; OpenAPI still available)

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 8. Test database connection

```powershell
pytest tests\test_database_connection.py -v
```

---

## Optional: SQLAlchemy 2.0 typing

When you add models, use `Mapped` / `mapped_column` on subclasses of `app.models.base.Base`.

---

## Security note

Do not commit `backend/.env`. The password you shared is for your machine only; rotate it if it was ever exposed beyond local dev.
