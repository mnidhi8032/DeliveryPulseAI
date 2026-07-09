# Non-Functional Requirements

---

## NFR-001 — Performance

### NFR-001.1 — Page Load Time
**Priority:** High  
**Description:** All pages shall load initial content within acceptable time limits.  
**Target:**
- Dashboard and project list pages: < 3 seconds on first load
- KPI Summary page: < 5 seconds (fetches plan + summary)
- Portfolio Dashboard: < 8 seconds (fetches all projects + plans in parallel)

### NFR-001.2 — API Response Time
**Priority:** High  
**Description:** All API endpoints shall respond within defined limits.  
**Target:**
- Auth endpoints: < 500ms
- List endpoints (projects, metrics): < 1 second
- KPI computation (save_and_compute): < 3 seconds for a plan with 20+ metrics
- KPI summary: < 2 seconds

### NFR-001.3 — Lazy Loading
**Priority:** Medium  
**Description:** Metric data in the Portfolio Dashboard shall be fetched lazily per card.  
**Target:** Each project card independently fetches its metrics on mount, so slow cards don't block the rest of the page.

---

## NFR-002 — Security

### NFR-002.1 — Authentication Required
**Priority:** Critical  
**Description:** All API endpoints except `/auth/login` shall require a valid JWT token.  
**Implementation:** `Depends(get_current_user)` on every protected route.

### NFR-002.2 — Role Enforcement at API Level
**Priority:** Critical  
**Description:** Role checks shall be enforced at the backend API layer, not just the frontend.  
**Implementation:** `AccessControlService` enforces data scoping. Role-specific endpoints use `require_roles(...)`.

### NFR-002.3 — Password Hashing
**Priority:** Critical  
**Description:** Passwords shall never be stored in plain text.  
**Implementation:** bcrypt hashing via `passlib[bcrypt]`.

### NFR-002.4 — JWT Secret
**Priority:** Critical  
**Description:** JWT tokens shall be signed with a secure secret key.  
**Implementation:** Secret stored in `.env` as `JWT_SECRET`. Never committed to source control.

### NFR-002.5 — Input Validation
**Priority:** High  
**Description:** All API inputs shall be validated using Pydantic schemas.  
**Implementation:** All request bodies are Pydantic `BaseModel` classes with field validation.

### NFR-002.6 — Data Isolation
**Priority:** Critical  
**Description:** Users shall not be able to access data outside their permitted scope.  
**Implementation:** All list/fetch operations go through `AccessControlService` which enforces role-based scoping.

---

## NFR-003 — Usability

### NFR-003.1 — Responsive Layout
**Priority:** High  
**Description:** All pages shall be usable on desktop screen sizes (1280px+).  
**Implementation:** Tailwind CSS responsive grid utilities. Mobile layout supported but not primary target.

### NFR-003.2 — RAG Badges with Text
**Priority:** High  
**Description:** RAG status shall always display both colour and text, never colour alone.  
**Implementation:** `RagBadge` component always renders the label (Green / Amber / Red) alongside the colour indicator.

### NFR-003.3 — Empty State Messaging
**Priority:** Medium  
**Description:** All lists and tables shall show a helpful message when empty.  
**Implementation:** Each table/list has an empty state row with descriptive text.

### NFR-003.4 — Loading States
**Priority:** Medium  
**Description:** All async data loads shall show a loading indicator.  
**Implementation:** Skeleton pulse animations (`animate-pulse` via Tailwind) during data fetch.

### NFR-003.5 — Toast Notifications
**Priority:** Medium  
**Description:** Success and error outcomes of user actions shall be communicated via toast notifications.  
**Implementation:** `useToast()` context used across all form submissions.

### NFR-003.6 — Carry-Forward Values
**Priority:** High  
**Description:** Repeating data entry across periods shall be minimized by pre-filling previous values.  
**Implementation:** Parameters pre-filled from `project_period_measures`. Thresholds pre-filled from last `KpiMeasurement`.

---

## NFR-004 — Reliability and Data Integrity

### NFR-004.1 — Immutable History
**Priority:** Critical  
**Description:** Each KPI save creates a new database record. Previous entries are never overwritten.  
**Implementation:** `kpi_measurements` uses INSERT, never UPDATE. Every Save call to `period_measures_service` inserts a new row.

### NFR-004.2 — Threshold Snapshot
**Priority:** High  
**Description:** The threshold values active at the time of computation shall be stored with each measurement.  
**Implementation:** `kpi_measurements.target`, `lsl`, `usl` store a snapshot of the thresholds used for that specific computation.

### NFR-004.3 — Soft Deletes
**Priority:** Medium  
**Description:** Core entities (BUs, projects) shall support soft delete.  
**Implementation:** `SoftDeleteMixin` on `Base` model provides `deleted_at` timestamp. Queries filter `deleted_at IS NULL`.

### NFR-004.4 — Unique Constraints
**Priority:** High  
**Description:** Key entities shall have uniqueness constraints.  
**Implementation:**
- `project_period_measures`: UNIQUE (project_id, period_label, measure_name)
- `kpi_plans`: UNIQUE (project_id)
- `kpi_doc_info`: UNIQUE (project_id)

---

## NFR-005 — Maintainability

### NFR-005.1 — Database Migrations
**Priority:** High  
**Description:** All database schema changes shall be managed via Alembic migrations.  
**Implementation:** Every new table/column has a numbered migration file in `alembic/versions/`.

### NFR-005.2 — Service Layer Separation
**Priority:** High  
**Description:** Business logic shall be in service classes, separate from API route handlers.  
**Implementation:** All logic in `app/services/`. Route handlers only call services and return schemas.

### NFR-005.3 — Type Safety
**Priority:** Medium  
**Description:** Frontend code shall use TypeScript with strict typing.  
**Implementation:** `tsc -b` (TypeScript compiler) runs as part of every build. No `any` types in service/type files.

### NFR-005.4 — Component Reusability
**Priority:** Medium  
**Description:** Shared UI components shall be centralised.  
**Implementation:** `RagBadge`, `HealthPanel`, `Sidebar`, `Header` in `frontend/src/components/`.

---

## NFR-006 — Scalability

### NFR-006.1 — Parallel Data Fetching
**Priority:** Medium  
**Description:** Multiple independent API calls shall be made in parallel where possible.  
**Implementation:** `Promise.all([...])` used throughout frontend for parallel fetch calls.

### NFR-006.2 — Database Indexing
**Priority:** Medium  
**Description:** Frequently queried foreign keys shall be indexed.  
**Implementation:** `index=True` on `plan_metric_id`, `project_id`, `kpi_plan_id`, `delivery_manager_user_id` across all relevant tables.
