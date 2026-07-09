# Spec 02 — Organisation Structure

---

## Hierarchy

```
Organisation
└── Business Unit (BU)
    ├── Assigned Delivery Head (bu_head_user_id)
    ├── Assigned Project Manager (pm_user_id) — one PM per BU
    └── Account (Client)
        ├── Assigned Delivery Manager (delivery_manager_user_id)
        └── Project
            ├── Assigned PM (project_manager_id)
            └── KPI Plan
                └── KPI Plan Metrics (selected from catalog)
```

---

## Business Unit (BU)

**Created by:** Platform Admin  
**Fields:** code, name, description, is_active  
**Assignments:**
- `bu_head_user_id` → Delivery Head who oversees this BU
- `pm_user_id` → Project Manager assigned to this BU

**Rules:**
- Each BU has exactly one PM
- When PM creates a project, they see only accounts under their assigned BU
- PM does not select BU manually — it is derived from their assignment

---

## Account (Client)

**Created by:** Platform Admin  
**Fields:** code, name, is_active, business_unit_id  
**Assignment:**
- `delivery_manager_user_id` → Delivery Manager responsible for this account

**Rules:**
- One account belongs to exactly one BU
- One DM can be assigned to multiple accounts
- DM sees all projects under their assigned accounts
- Account is the client/customer entity (e.g. "Apex Bank", "Acme Corp")

---

## Project

**Created by:** PM (via My Projects page)  
**Fields:** project_code, project_name, description, start_date, target_end_date, status, account_id, project_manager_id  

**Creation flow:**
1. PM clicks "Create Project" on My Projects page
2. PM sees their BU displayed (read-only — derived from BU assignment)
3. PM selects an Account from their BU's accounts
4. PM fills project details and engagement model (project type, delivery model, project category, work size unit)
5. System auto-creates KPI Plan and auto-adds mandatory metrics from catalog

**Status values:** ACTIVE, CLOSED, ON_HOLD  
**RAG field:** `current_rag` — computed from latest KPI measurements (GREEN / AMBER / RED / null)

---

## Demo Data (3 BUs, 9 Projects)

| BU | Account | Projects | DM |
|---|---|---|---|
| Banking & Financial Services | Apex Bank | Loan Management System, SBI | Vivek Rao |
| Banking & Financial Services | Sterling Finance | Trade Finance Portal, ICIC | Suma Nair |
| Digital Services | Acme Corp | Banking Portal Redesign | Alex Thomas |
| Digital Services | Tech Nova | Mobile App Modernization | Riya Patel |
| Cloud Infrastructure | Globex | Cloud Migration Phase 1, Sonata Cloud | Kevin Dias |
| Cloud Infrastructure | Nexus Cloud | Telemetry Dashboard | Neha Singh |

---

## Setup Workflow (Platform Admin)

1. **Create BU** — Settings → Org Setup → Create BU (assign Delivery Head)
2. **Assign PM to BU** — Settings → Org Setup → Account DM Assignment table
3. **Assign DM to Account** — Settings → Org Setup → Account DM Assignment table (select DM from dropdown)
4. **Provision Users** — Settings → User Directory → Provision User (supports all 6 roles)
