# DeliveryPulse AI — Authorization & Ownership (Canonical Model)

**Last updated:** 2026-05-20  
**Scope:** Phase 1–2 only (Organization hierarchy + Authentication).  
**Explicitly out of scope:** Submissions, metrics, Excel workflow, health engine.

---

## 1. Canonical ownership hierarchy (stakeholder final)

DeliveryPulse AI is a delivery governance platform. Ownership flows downward:

```text
Sonata Governance Team (Platform Admin)
  ↓
Head of Delivery (Customer Admin)
  ↓
Business Units (each BU has one Delivery Head)
  ↓
Accounts
  ↓
Projects
  ↓
Project Managers (PM)
  ↓
Project submissions
```

Key ideas:

- **Platform Admin** owns governance framework and system configuration (read-only on delivery hierarchy).
- **Customer Admin** owns the *customer-wide* delivery landscape (creates BUs/accounts; assigns Delivery Heads).
- **Delivery Head** owns a *single BU* (creates projects; assigns PMs; approves submissions).
- **PM** owns execution and submissions for assigned projects.

---

## 2. Role definitions (responsibilities)

### 2.1 PLATFORM_ADMIN

**Purpose:** System owner

**Can:**
- Manage users (future)
- Manage templates (future)
- Manage thresholds (future)
- Manage audit visibility (future)
- Manage organization settings (future)
- Organization-wide reporting visibility (read-only)
- Read-only visibility into all portfolios

**Must NOT:**
- Create business units, accounts, or projects
- Assign PMs
- Approve submissions
- Own project execution

### 2.2 CUSTOMER_ADMIN

**Purpose:** Head of Delivery (customer-wide)

**Can:**
- View all business units and all projects (customer-wide visibility)
- Create Business Units
- Assign Delivery Heads (one per BU)
- Create Accounts under BUs
- View customer-wide health (future)

**Must NOT:**
- Create Projects
- Assign PMs
- Approve submissions

### 2.3 DELIVERY_HEAD

**Purpose:** BU owner

**Can:**
- View BU portfolio only (cannot access other BUs)
- Create Projects under accounts in their BU
- Assign PMs to projects
- Approve submissions (future Phase 6)
- View BU health (future)

**Must NOT:**
- Create Business Units
- Create Accounts
- Access other BUs

### 2.4 PM

**Can:**
- View assigned projects only
- (Future) create submissions, save drafts, submit metrics, upload Excel

**Must NOT:**
- Create projects
- Create accounts
- Approve submissions

---

## 3. Access matrix (canonical)

| Action | Platform Admin | Customer Admin | Delivery Head | PM |
|--------|----------------|----------------|---------------|----|
| Manage users | Yes | No | No | No |
| Manage templates | Yes | No | No | No |
| Manage thresholds | Yes | No | No | No |
| Create Business Unit | No | Yes | No | No |
| Assign BU Delivery Head | No | Yes | No | No |
| Create Account | No | Yes | No | No |
| Create Project | No | No | Yes | No |
| Assign PM | No | No | Yes | No |
| Submit metrics | No | No | No | Yes |
| Approve submissions | No | No | Yes | No |
| View org reports | Yes | Yes | Limited | No |

---

## 4. Authentication flow (current implementation)

**JWT login** (`POST /api/v1/auth/login`) returns an access token.

Protected routes use:
- `get_current_user()` which:
  - verifies JWT signature + expiry
  - loads the **user from DB**
  - blocks inactive users

Important: even though the token contains `role_code`, **authorization decisions are based on the user’s role in the database**, not the token claim.

---

## 5. Resource ownership (Phase 2 implementation)

Because we are not changing the schema in this correction, ownership is represented as:

- **Account → Delivery Head:** `accounts.delivery_head_user_id`
- **Project ownership (PM assignment):** `projects.project_manager_id`
- **BU → Delivery Head (effective):**
  - A BU is considered owned by a Delivery Head if it contains accounts where `accounts.delivery_head_user_id = that Delivery Head`.
  - **Invariant enforced in service logic:** once the first account sets a Delivery Head, all accounts in that BU must use the same Delivery Head.

Platform Admin has read-only visibility everywhere.
Customer Admin has customer-wide visibility and can create BUs/accounts.

---

## 6. Route permissions (Phase 2)

### Create endpoints

- `POST /api/v1/business-units` → **Customer Admin only**
- `POST /api/v1/accounts` → **Customer Admin only**
- `POST /api/v1/projects` → **Delivery Head only**

### Read endpoints (scoped)

- `GET /api/v1/projects`
  - Platform Admin: all projects (read-only)
  - Customer Admin: all projects
  - Delivery Head: projects under accounts owned by them (their BU)
  - PM: only projects where they are assigned as project manager

### Notes

- PM cannot list accounts or business units.
- Delivery Head can list accounts in their portfolio.
- Platform Admin can list everything but cannot create hierarchy.

---

## 7. Simple examples (end-to-end)

### 7.1 Customer Admin → Delivery Head → PM flow (canonical)

1. Customer Admin logs in → receives JWT
2. `POST /business-units` (Customer Admin only)
3. `POST /accounts` (Customer Admin only) → sets `delivery_head_user_id` for the BU
4. Delivery Head logs in → receives JWT
5. `POST /projects` (Delivery Head only) → sets `project_manager_id` to a PM user id

### 7.2 PM submits metrics (future)

1. PM logs in
2. PM sees only assigned projects via `GET /projects`
3. PM creates a submission for a project period (Phase 3+)

### 7.3 Delivery Head approves (future)

1. Delivery Head reviews submissions for owned accounts
2. Approves/rejects the PM submission (Phase 6)

### 7.4 CEO views reports (future)

1. CEO uses a reporting role (future) or Platform Admin report views
2. Views organization-wide rollups (dashboards are still out of scope for now)

---

## 8. Diagrams

### 8.1 Ownership scope (Phase 2)

```mermaid
flowchart TD
    PA[Platform Admin\n(read-only all)] --> BU[Business Unit]
    DH[Delivery Head\n(owns portfolio)] --> BU
    BU --> A[Account\naccounts.delivery_head_user_id = DH]
    A --> P[Project\nprojects.project_manager_id = PM]
    PM[PM\n(assigned)] --> P
```

---

## 9. Where this logic lives in code

- **Authentication (JWT + current user)**: `backend/app/auth/dependencies.py`
- **Role constants**: `backend/app/core/constants.py`
- **Authorization + ownership scoping**: `backend/app/services/access_control_service.py`
- **Service-level permissions**:
  - `backend/app/services/business_unit_service.py`
  - `backend/app/services/account_service.py`
  - `backend/app/services/project_service.py`
- **Route-level create guards (DH only)**:
  - `backend/app/api/v1/business_units.py`
  - `backend/app/api/v1/accounts.py`
  - `backend/app/api/v1/projects.py`

