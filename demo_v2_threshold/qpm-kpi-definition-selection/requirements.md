# Requirements Document

## Introduction

The KPI Definition & Selection Module is the measurement backbone of the QPM (Quality & Performance Management) Platform.
It provides a centrally governed KPI Library of predefined indicators, enables Project Managers to select and assign KPIs
to their projects, and allows per-project threshold overrides within a controlled governance workflow.

The module enforces mandatory KPI retention, routes threshold-change requests through an approval workflow, and supports
creation of custom KPIs to accommodate project-specific measurement needs. All KPI definitions must satisfy completeness
and directional rules before they can be activated, ensuring only well-formed indicators drive measurement and RAG reporting.

---

## Glossary

- **QPM_Platform**: The Quality & Performance Management Platform built on FastAPI / React / PostgreSQL.
- **KPI**: A Key Performance Indicator — a named, formula-driven measurement assigned to a project with Target, Frequency, Direction, and Data Source.
- **KPI_Library**: The platform-maintained, centrally governed catalogue of predefined KPIs available for assignment to any project.
- **Custom_KPI**: A KPI created by a user (Project Manager or above) that does not originate from the KPI_Library.
- **Mandatory_KPI**: A KPI designated by the platform as compulsory for a project; it cannot be removed without Platform Admin approval.
- **Project_KPI**: The assignment record that binds a KPI (from the library or custom) to a specific project, carrying project-specific overrides for Target, LSL, USL, and Frequency.
- **Target**: The desired value a KPI should meet or exceed (or stay within) for a given measurement period.
- **LSL**: Lower Specification Limit — the minimum acceptable threshold below which a KPI value is considered Red.
- **USL**: Upper Specification Limit — the maximum acceptable threshold above which a KPI value is considered Red.
- **Direction**: The optimisation intent of a KPI — one of: Higher_is_Better, Lower_is_Better, or Within_Range.
- **Frequency**: The measurement cadence of a KPI — one of: Sprint, Monthly, or Release.
- **Data_Source**: The named origin from which raw input data for a KPI is collected.
- **Activation**: The act of enabling a Project_KPI for live data collection; requires Target, Frequency, Data_Source, and Direction to be defined.
- **Approval_Workflow**: The governance process by which a proposed change (removal or threshold modification of a Mandatory_KPI) is submitted, reviewed, and approved or rejected by a Platform Admin.
- **Project_Manager (PM)**: A platform user with the role to configure projects and manage KPI assignments.
- **Platform_Admin**: A platform user with full system access, including the authority to approve Mandatory_KPI changes and manage the KPI_Library.
- **RBAC**: Role-Based Access Control governing module and data visibility per user role.
- **JWT**: JSON Web Token used for authentication on all API requests.
- **Audit_Log**: An immutable record of all create, update, delete, and approval operations on platform entities.

---

## Requirements

### Requirement 1: KPI Library Maintenance

**User Story:** As a Platform Admin, I want to maintain a master KPI library with well-defined predefined KPIs, so that Project Managers have a consistent, governed catalogue to draw from when setting up measurement for their projects.

#### Acceptance Criteria

1. THE KPI_Library SHALL store each predefined KPI with the following attributes: name, category, formula description, Direction, default Target, LSL, USL, measurement unit, and Frequency.
2. WHEN a Platform Admin submits a new KPI definition with all required attributes, THE QPM_Platform SHALL persist the KPI record to the KPI_Library and return a success response within 2 seconds.
3. IF a new KPI definition is submitted with a name that already exists in the KPI_Library, THEN THE QPM_Platform SHALL reject the request and return a duplicate-name error.
4. IF a new or updated KPI definition is submitted without a Direction value, THEN THE QPM_Platform SHALL reject the request and return a direction-undefined error.
5. THE KPI_Library SHALL accept exactly one Direction value per KPI from the set: {Higher_is_Better, Lower_is_Better, Within_Range}.
6. THE KPI_Library SHALL accept exactly one Frequency value per KPI from the set: {Sprint, Monthly, Release}.
7. WHEN a Platform Admin updates an existing KPI in the KPI_Library, THE QPM_Platform SHALL write an immutable entry to the Audit_Log capturing the actor, timestamp, field name, previous value, and new value for each changed field.
8. THE QPM_Platform SHALL provide a paginated, searchable list endpoint for the KPI_Library, supporting filtering by category, Direction, Frequency, and mandatory status.

---

### Requirement 2: KPI Selection and Project Assignment

**User Story:** As a Project Manager, I want to select KPIs from the library and assign them to my project, so that I can define the measurement framework for my engagement without manually specifying every KPI detail from scratch.

#### Acceptance Criteria

1. WHEN a Project Manager requests the KPI selection view for a project, THE QPM_Platform SHALL present the full KPI_Library list with each KPI's name, category, formula description, Direction, default Target, and default Frequency.
2. WHEN a Project Manager selects one or more KPIs from the KPI_Library and assigns them to a project, THE QPM_Platform SHALL create a Project_KPI record for each selected KPI, inheriting the library's default Target, LSL, USL, Direction, and Frequency.
3. WHEN KPIs are assigned to a project, THE QPM_Platform SHALL return the created Project_KPI records in the response, including the KPI name, category, inherited defaults, and mandatory status.
4. IF a Project Manager attempts to assign a KPI that has already been assigned to the same project, THEN THE QPM_Platform SHALL reject the request and return a duplicate-assignment error.
5. THE QPM_Platform SHALL restrict KPI assignment operations to users whose RBAC role includes the `project:kpi:assign` permission on the target project.
6. WHEN KPIs are assigned to a project, THE QPM_Platform SHALL write an entry to the Audit_Log recording the actor, timestamp, project identifier, and list of assigned KPI identifiers.

---

### Requirement 3: Per-Project KPI Threshold and Frequency Override

**User Story:** As a Project Manager, I want to override the Target, LSL, USL, and Frequency for each KPI assigned to my project, so that the measurement thresholds reflect my project's specific context and commitments.

#### Acceptance Criteria

1. WHEN a Project Manager submits an override for a Project_KPI, THE QPM_Platform SHALL accept updates to any combination of: Target, LSL, USL, and Frequency, and persist the changes to the Project_KPI record.
2. WHEN a Project_KPI override is applied, THE QPM_Platform SHALL preserve the KPI_Library's original default values unchanged; only the Project_KPI record SHALL be modified.
3. THE QPM_Platform SHALL validate that, WHERE Direction is Within_Range, LSL is less than Target and Target is less than USL before persisting the override.
4. IF an override submission for a Within_Range KPI violates the constraint LSL < Target < USL, THEN THE QPM_Platform SHALL reject the update and return a threshold-ordering error identifying the conflicting values.
5. WHEN a Project_KPI override is persisted, THE QPM_Platform SHALL write an entry to the Audit_Log capturing the actor, timestamp, field name, previous value, and new value for each changed field.
6. THE QPM_Platform SHALL restrict Project_KPI override operations to users whose RBAC role includes the `project:kpi:configure` permission on the target project.

---

### Requirement 4: Mandatory KPI Protection and Removal Approval

**User Story:** As a Platform Admin, I want mandatory KPIs to be protected from removal unless I explicitly approve the request, so that platform-wide measurement standards are enforced consistently across all projects.

#### Acceptance Criteria

1. THE QPM_Platform SHALL designate each Project_KPI as either mandatory or non-mandatory, inheriting the mandatory status from the KPI_Library assignment record.
2. WHEN a Project Manager attempts to remove a non-mandatory Project_KPI, THE QPM_Platform SHALL remove the Project_KPI record immediately and return a success response.
3. WHEN a Project Manager attempts to remove a mandatory Project_KPI, THE QPM_Platform SHALL reject the direct removal and initiate an Approval_Workflow, creating a removal request record with status Pending.
4. WHEN a removal request for a mandatory Project_KPI is submitted, THE QPM_Platform SHALL notify the Platform Admin of the pending request via in-app notification.
5. WHEN a Platform Admin approves a mandatory KPI removal request, THE QPM_Platform SHALL remove the Project_KPI record and write an entry to the Audit_Log recording the approval actor, timestamp, and justification.
6. WHEN a Platform Admin rejects a mandatory KPI removal request, THE QPM_Platform SHALL update the request status to Rejected and notify the requesting Project Manager.
7. WHILE a removal request is in Pending status, THE QPM_Platform SHALL retain the mandatory Project_KPI on the project as active and continue to require data entry for it.

---

### Requirement 5: Custom KPI Creation

**User Story:** As a Project Manager, I want to create custom KPIs specific to my project, so that I can track measurements that are not covered by the standard KPI library.

#### Acceptance Criteria

1. WHEN a Project Manager submits a custom KPI definition with name, formula description, Direction, Target, LSL, USL, Frequency, and measurement unit, THE QPM_Platform SHALL create a Custom_KPI record scoped to the specified project.
2. IF a custom KPI submission is missing any of the following: name, formula description, Direction, Target, Frequency, THEN THE QPM_Platform SHALL reject the request and return a field-level validation error identifying each missing attribute.
3. IF a custom KPI name conflicts with an existing KPI name (library or custom) already assigned to the same project, THEN THE QPM_Platform SHALL reject the request and return a duplicate-name-within-project error.
4. THE QPM_Platform SHALL accept exactly one Direction value for a custom KPI from the set: {Higher_is_Better, Lower_is_Better, Within_Range}.
5. WHERE Direction is Within_Range for a custom KPI, THE QPM_Platform SHALL enforce the constraint LSL < Target < USL before persisting the record.
6. WHEN a Custom_KPI is created, THE QPM_Platform SHALL write an entry to the Audit_Log recording the actor, timestamp, project identifier, and all custom KPI field values.
7. THE QPM_Platform SHALL restrict custom KPI creation to users whose RBAC role includes the `project:kpi:create-custom` permission on the target project.

---

### Requirement 6: Mandatory KPI Threshold Change Approval Workflow

**User Story:** As a Platform Admin, I want any change to the Target, LSL, or USL of a mandatory KPI to require my approval, so that threshold modifications on governed indicators are controlled and auditable.

#### Acceptance Criteria

1. WHEN a Project Manager submits a change to Target, LSL, or USL for a mandatory Project_KPI, THE QPM_Platform SHALL NOT apply the change immediately; instead, it SHALL create a threshold-change request record with status Pending and return a pending-approval response to the caller.
2. WHEN a threshold-change request is created, THE QPM_Platform SHALL notify the Platform Admin via in-app notification with the details of the proposed change.
3. WHILE a threshold-change request is in Pending status, THE QPM_Platform SHALL continue to enforce the existing (pre-change) threshold values for RAG calculation and data validation.
4. WHEN a Platform Admin approves a threshold-change request, THE QPM_Platform SHALL apply the new threshold values to the Project_KPI record and write an entry to the Audit_Log recording the approval actor, timestamp, previous values, and new values.
5. WHEN a Platform Admin rejects a threshold-change request, THE QPM_Platform SHALL retain the original threshold values unchanged and notify the requesting Project Manager with the rejection reason.
6. IF a second threshold-change request is submitted for the same Project_KPI while a prior request is still Pending, THEN THE QPM_Platform SHALL reject the new submission and return a pending-request-in-progress error.
7. THE QPM_Platform SHALL maintain a full history of all threshold-change requests for each Project_KPI, including status, proposed values, decision actor, and decision timestamp.

---

### Requirement 7: KPI Activation Pre-conditions

**User Story:** As a Platform Admin, I want to enforce that every KPI meets completeness rules before it can be activated, so that only well-formed KPIs with all required configuration drive live measurement and reporting.

#### Acceptance Criteria

1. WHEN a user attempts to activate a Project_KPI, THE QPM_Platform SHALL verify that Target, Frequency, Data_Source, and Direction are all defined on the Project_KPI record before permitting activation.
2. IF a Project_KPI submitted for activation is missing one or more of Target, Frequency, Data_Source, or Direction, THEN THE QPM_Platform SHALL reject the activation request and return an error identifying each missing attribute.
3. WHEN a user attempts to activate a Project_KPI, THE QPM_Platform SHALL verify that no threshold-change request for that Project_KPI is currently in Pending status.
4. IF a Project_KPI has a Pending threshold-change request at the time of an activation attempt, THEN THE QPM_Platform SHALL reject the activation and return a pending-approval-blocks-activation error.
5. THE QPM_Platform SHALL prevent any metric data collection against a Project_KPI that has not been successfully activated.
6. WHEN a Project_KPI is successfully activated, THE QPM_Platform SHALL write an entry to the Audit_Log recording the activation actor and timestamp.

---

### Requirement 8: Security and Audit

**User Story:** As a Platform Admin, I want all KPI definition and selection operations to be authenticated, authorised, and fully logged, so that the platform maintains complete traceability over the KPI configuration lifecycle.

#### Acceptance Criteria

1. THE QPM_Platform SHALL require a valid JWT token on every KPI Library and Project_KPI API request and return HTTP 401 for unauthenticated requests.
2. THE QPM_Platform SHALL enforce RBAC permissions on every KPI operation, returning HTTP 403 for operations the requesting user's role does not permit.
3. WHEN any KPI_Library record, Project_KPI record, Custom_KPI, Approval_Workflow record, or threshold-change request is created, updated, or deleted, THE QPM_Platform SHALL write an immutable entry to the Audit_Log within the same database transaction.
4. THE QPM_Platform SHALL store all KPI definition and threshold data at rest using encrypted storage.
5. WHILE the system is operating, THE QPM_Platform SHALL maintain a 99.5% uptime SLA for all KPI definition and selection endpoints.

---

### Requirement 9: Performance and Scalability

**User Story:** As a Platform Admin, I want KPI definition and selection operations to be performant under production load, so that users experience responsive interactions as the platform scales across hundreds of projects and thousands of KPIs.

#### Acceptance Criteria

1. WHEN a request to list the KPI_Library is made, THE QPM_Platform SHALL return the paginated response within 2 seconds for a library containing 500 or more KPI definitions.
2. WHEN a request to list all Project_KPIs for a project is made, THE QPM_Platform SHALL return the response within 1 second regardless of the number of KPIs assigned to the project.
3. THE QPM_Platform SHALL support at least 1000 concurrent authenticated users performing KPI selection and configuration operations without exceeding the response time thresholds stated in criteria 1 and 2.
4. THE QPM_Platform SHALL support at least 500 active projects concurrently, each with independent Project_KPI configurations, without data retrieval performance degradation.
