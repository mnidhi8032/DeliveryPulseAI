# DeliveryPulse AI — Metric RAG Reference

> Auto-generated from `qpm_catalog_metrics` table.
> Re-run `python scripts/generate_metric_reference.py` to refresh.
> Generated: 2026-07-02

## RAG Logic Rules

| Intent | GREEN | AMBER | RED |
|--------|-------|-------|-----|
| Higher is better | Actual ≥ Target | LSL ≤ Actual < Target | Actual < LSL |
| Lower is better  | Actual ≤ Target | Target < Actual ≤ USL | Actual > USL |
| Within Limits    | LSL ≤ Actual ≤ USL | N/A | Actual < LSL or > USL |
| Nominal the best | Within 5% of Target | Outside 5% but within limits | < LSL or > USL |
| No thresholds    | Meets target | Within 10% of target | >10% away from target |

> **Note on Thresholds:** Columns marked *(suggested)* are industry-standard defaults.
> They are for reference only — PM sets project-specific values during KPI Plan setup.
> Columns with `—` have no standard default and must always be set per project.

---

## Delivered Quality

| Metric | UOM | Intent | Freq | Comp | Target | LSL | USL | Source | Input Values (what to enter) | GREEN when | AMBER when | RED when |
|--------|-----|--------|------|------|--------|-----|-----|--------|------------------------------|-----------|-----------|---------|
| % of Customer Rejected Candidates | % | Lower the better | Weekly and Monthly | Mandatory | 5 | — | 10 | 💡 suggested | [1] Number of resources rejected by customer for a position → [2] Number of resource profiles qualified internally for the same position | Actual ≤ 5 | Target (5) < Actual ≤ USL (10) | Actual > 10 (above USL) |
| Defect Detection Efficiency % | % | Higher the better | Sprint / Release/Test Cycle on completion of User acceptance testing | Mandatory | 97 | 95 | — | 📋 catalog | [1] Number of defects reported from testing → [2] Number of defects reported by customer or business | Actual ≥ 97 | LSL (95) ≤ Actual < Target (97) | Actual < 95 (below LSL) |
| Defect Leakage  % | % | Higher the better | Sprint / Release/Test Cycle on completion of User acceptance testing | Mandatory | 0 | — | 5 | 📋 catalog | [1] Number of defects reported by customer or business → [2] Number of defects reported from testing | Actual ≥ 0 | Actual below target but not critical | Actual significantly below target |
| Delivered Defect Density | Weighted Defects per Size Unit | Lower the better | On completion of customer or User acceptance testing and at Retrospective point | Mandatory | 1 | — | 3 | 💡 suggested | [1] Total Weighted Defects Leaked to Customer → [2] Delivered and Accepted Size | Actual ≤ 1 | Target (1) < Actual ≤ USL (3) | Actual > 3 (above USL) |
| First Time Fit  % | % | Higher the better | Monthly/ Agreed Frequency | Mandatory | 100 | 95 | — | 📋 catalog | [1] # of tickets resolved right first time → [2] # of tickets resolved | Actual ≥ 100 | LSL (95) ≤ Actual < Target (100) | Actual < 95 (below LSL) |
| Regression Incident % | % | Higher the better | Sprint / Release/Test Cycle on completion of User acceptance testing | Mandatory | 95 | — | — | 📋 catalog | [1] Number of Regression Incidents → [2] Total No of Incidents | Actual ≥ 95 | Actual below target but not critical | Actual significantly below target |

## Efficiency

| Metric | UOM | Intent | Freq | Comp | Target | LSL | USL | Source | Input Values (what to enter) | GREEN when | AMBER when | RED when |
|--------|-----|--------|------|------|--------|-----|-----|--------|------------------------------|-----------|-----------|---------|
| Availability % | % | Higher the better | Monthly | Optional | 99.5 | 99 | — | 💡 suggested | Single value — enter the computed result directly | Actual ≥ 99.5 | LSL (99) ≤ Actual < Target (99.5) | Actual < 99 (below LSL) |
| Billability% | % | Higher the better | Monthly | Optional | 100 | 95 | — | 📋 catalog | Single value — enter the computed result directly | Actual ≥ 100 | LSL (95) ≤ Actual < Target (100) | Actual < 95 (below LSL) |
| Code Review Delivery Rate | Person-hours/Size Unit | Within Limits | On completion of each Component and at Retrospective point | Mandatory | 0.5 | 0.3 | 0.8 | 💡 suggested | [1] Effort spent for Code Review (person-hours) → [2] Total Size (size units) | LSL (0.3) ≤ Actual ≤ USL (0.8) | Not applicable — binary (within limits = GREEN, outside = RED) | Actual < 0.3 or Actual > 0.8 |
| Coding Delivery Rate | Person-hours/Size Unit | Within Limits | On completion of each Component and at Retrospective point | Optional | 0.8 | 0.5 | 1.5 | 💡 suggested | [1] Effort spent for Coding (person-hours) → [2] Total Size (size units) | LSL (0.5) ≤ Actual ≤ USL (1.5) | Not applicable — binary (within limits = GREEN, outside = RED) | Actual < 0.5 or Actual > 1.5 |
| Cost per Fulfillment | Currency Unit per resource | Lower the better | Weekly and Monthly | Mandatory | PM sets per project | — | — | ⚙️ project | Single value — enter the computed result directly | Actual at or below target | Actual above target but not critical | Actual significantly above target |
| Cost Performance Index | Number | Nominal the best | Monthly | Optional | 1 | 0.9 | 1.1 | 💡 suggested | [1] Earned Value (EV) → [2] Actual Cost (AC) | Actual within 5% of Target (1) | Actual outside 5% of target but within spec limits | Actual > USL (1.1) or < LSL (0.9) |
| Design Delivery Rate | Person-hours/Size Unit | Within Limits | On completion of each Component and at Retrospective point | Optional | 0.6 | 0.4 | 1 | 💡 suggested | [1] Effort spent for Design (person-hours) → [2] Total Size (size units) | LSL (0.4) ≤ Actual ≤ USL (1) | Not applicable — binary (within limits = GREEN, outside = RED) | Actual < 0.4 or Actual > 1 |
| Effort Variance | % | Lower the better | Monthly | Mandatory | 10 | — | 15 | 📋 catalog | [1] Actual Effort for the Work till date (person-hours) → [2] Remaining Effort for completing the pending work (person-hours) → [3] Planned Effort (person-hours) | Actual ≤ 10 | Target (10) < Actual ≤ USL (15) | Actual > 15 (above USL) |
| Overall Delivery Rate | Person-hour per Size Unit | Lower the better | On completion of each Component and at Retrospective point | Mandatory | 1 | — | 1.5 | 💡 suggested | [1] Total Actual Effort in Person-hours → [2] Delivered and Accepted Size | Actual ≤ 1 | Target (1) < Actual ≤ USL (1.5) | Actual > 1.5 (above USL) |
| Process Throughput | Story Points-SP | Higher the better | Each week, month, quarter | Mandatory | PM sets per project | — | — | ⚙️ project | Single value — enter the computed result directly | Actual meets or exceeds target | Actual below target but not critical | Actual significantly below target |
| Productivity | Size Unit per Person day | Higher the better | On completion of each Component and at Retrospective point | Mandatory | PM sets per project | — | — | ⚙️ project | [1] Delivered and Accepted Size → [2] Total Actual Effort in Person day | Actual meets or exceeds target | Actual below target but not critical | Actual significantly below target |
| Requirements Analysis Delivery Rate | Person-hours/Size Unit | Within Limits | On completion of each Component and at Retrospective point | Optional | 0.4 | 0.2 | 0.7 | 💡 suggested | [1] Effort spent for Requirements Analysis (person-hours) → [2] Total Size (size units) | LSL (0.2) ≤ Actual ≤ USL (0.7) | Not applicable — binary (within limits = GREEN, outside = RED) | Actual < 0.2 or Actual > 0.7 |
| Resource Utlization % | % | Higher the better | Monthly | Optional | 85 | 75 | — | 💡 suggested | Single value — enter the computed result directly | Actual ≥ 85 | LSL (75) ≤ Actual < Target (85) | Actual < 75 (below LSL) |
| Reuse Saving % | % | Higher the better | Monthly | Optional | 20 | 10 | — | 💡 suggested | [1] Actual Effort saving through Re-use (person-hours) → [2] Planned Effort (person-hours) | Actual ≥ 20 | LSL (10) ≤ Actual < Target (20) | Actual < 10 (below LSL) |
| Rework % | % | Lower the better | Weekly and Monthly | Optional | 5 | — | 15 | 💡 suggested | [1] Rework Effort (person-hours) → [2] Total Effort (person-hours) | Actual ≤ 5 | Target (5) < Actual ≤ USL (15) | Actual > 15 (above USL) |
| Test Design Delivery Rate | Person-hours/Size Unit | Within Limits | On completion of each Component and at Retrospective point | Optional | 0.5 | 0.3 | 0.8 | 💡 suggested | [1] Effort Spent for Test Design (person-hours) → [2] Total Size (size units) | LSL (0.3) ≤ Actual ≤ USL (0.8) | Not applicable — binary (within limits = GREEN, outside = RED) | Actual < 0.3 or Actual > 0.8 |
| Test Design Productivity | Size Unit/ Person-day | Higher the better | Each Test Cycle, Sprint and Release | Mandatory | 5 | 3 | — | 💡 suggested | [1] Total Size (test cases / size units) → [2] Effort spent for Test Design in Person-days | Actual ≥ 5 | LSL (3) ≤ Actual < Target (5) | Actual < 3 (below LSL) |
| Test Design Review Delivery Rate | Person-hours/Size Unit | Within Limits | On completion of each Component and at Retrospective point | Mandatory | 0.3 | 0.2 | 0.6 | 💡 suggested | [1] Effort Spent for Test Design Review (person-hours) → [2] Total Size (size units) | LSL (0.2) ≤ Actual ≤ USL (0.6) | Not applicable — binary (within limits = GREEN, outside = RED) | Actual < 0.2 or Actual > 0.6 |
| Test Execution Delivery Rate | Person-hours/Size Unit | Within Limits | On completion of each Component and at Retrospective point | Optional | 0.3 | 0.2 | 0.5 | 💡 suggested | [1] Effort Spent for Test Execution (person-hours) → [2] Total Size (size units) | LSL (0.2) ≤ Actual ≤ USL (0.5) | Not applicable — binary (within limits = GREEN, outside = RED) | Actual < 0.2 or Actual > 0.5 |
| Test Execution Productivity | Size Unit/ Person-day | Higher the better | Each Test Cycle, Sprint and Release | Mandatory | 10 | 7 | — | 💡 suggested | [1] Total Size (test cases / size units) → [2] Effort spent for Test Execution in Person-days | Actual ≥ 10 | LSL (7) ≤ Actual < Target (10) | Actual < 7 (below LSL) |

## Financial

| Metric | UOM | Intent | Freq | Comp | Target | LSL | USL | Source | Input Values (what to enter) | GREEN when | AMBER when | RED when |
|--------|-----|--------|------|------|--------|-----|-----|--------|------------------------------|-----------|-----------|---------|
| Average Resource Cost | ₹-INR per Person-month | Lower the better | Monthly | Mandatory | PM sets per project | — | — | ⚙️ project | Single value — enter the computed result directly | Actual at or below target | Actual above target but not critical | Actual significantly above target |
| Gross Margin% | % | Higher the better | Monthly | Mandatory | 47.5 | 40 | — | 📋 catalog | Single value — enter the computed result directly | Actual ≥ 47.5 | LSL (40) ≤ Actual < Target (47.5) | Actual < 40 (below LSL) |
| Revenue per employee | $-USD per Person-month | Higher the better | Monthly | Mandatory | PM sets per project | — | — | ⚙️ project | Single value — enter the computed result directly | Actual meets or exceeds target | Actual below target but not critical | Actual significantly below target |

## Internal Quality

| Metric | UOM | Intent | Freq | Comp | Target | LSL | USL | Source | Input Values (what to enter) | GREEN when | AMBER when | RED when |
|--------|-----|--------|------|------|--------|-----|-----|--------|------------------------------|-----------|-----------|---------|
| % of  Internally Rejected Candidates | % | Lower the better | Weekly and Monthly | Mandatory | 5 | — | 10 | 💡 suggested | [1] Number of resources rejected internally for a position → [2] Number of resource profiles received for the same position | Actual ≤ 5 | Target (5) < Actual ≤ USL (10) | Actual > 10 (above USL) |
| First time Test Case Pass % | % | Higher the better | Each Sprint and Release | Optional | 90 | 80 | — | 💡 suggested | [1] Number of Test Cases passed first time → [2] Number of test cases executed | Actual ≥ 90 | LSL (80) ≤ Actual < Target (90) | Actual < 80 (below LSL) |
| Percentage Code Review Effort | % | Within Limits | Monthly | Optional | 15 | 10 | 25 | 💡 suggested | [1] Effort spent on Code or Script Reviews (person-hours) → [2] Total Engineering Effort (person-hours) | LSL (10) ≤ Actual ≤ USL (25) | Not applicable — binary (within limits = GREEN, outside = RED) | Actual < 10 or Actual > 25 |
| Percentage of valid defects % | % | Higher the better | Each Test Cycle, Sprint and Release | Mandatory | 100 | 95 | — | 📋 catalog | [1] Number of valid defects reported by testing team → [2] Total number of testing defects | Actual ≥ 100 | LSL (95) ≤ Actual < Target (100) | Actual < 95 (below LSL) |
| Process Health Index | % | Higher the better | Quarterly | Optional | 87.5 | 75 | — | 📋 catalog | Single value — enter the computed result directly | Actual ≥ 87.5 | LSL (75) ≤ Actual < Target (87.5) | Actual < 75 (below LSL) |
| Review Coverage % | % | Higher the better | On completion Unit Testing | Optional | 90 | 80 | — | 💡 suggested | [1] Size of code that is reviewed → [2] Delivered and Accepted Size | Actual ≥ 90 | LSL (80) ≤ Actual < Target (90) | Actual < 80 (below LSL) |
| Review Defect Density | Weighted Defects per Size Unit | Within Limits | Monthly | Mandatory | 2 | 0.5 | 5 | 💡 suggested | [1] Total weighted Review defects found → [2] Total Size reviewed | LSL (0.5) ≤ Actual ≤ USL (5) | Not applicable — binary (within limits = GREEN, outside = RED) | Actual < 0.5 or Actual > 5 |
| Review Efficiency | Weighted Defects per Person-day | Higher the better | On completion of each Component and at Retrospective point | Optional | 3 | 1.5 | — | 💡 suggested | [1] Total weighted Review defects → [2] Review Effort in Person day | Actual ≥ 3 | LSL (1.5) ≤ Actual < Target (3) | Actual < 1.5 (below LSL) |
| Test Automation Rejection % | % | Lower the better | Each Test Cycle, Sprint and Release | Optional | 0 | — | 3 | 📋 catalog | [1] Number of automated Test script rejections → [2] Total no of automated Test Scripts | Actual ≤ 0 | Target (0) < Actual ≤ USL (3) | Actual > 3 (above USL) |
| Test Case per Size | Test Case/Size Unit | Higher the better | Monthly | Optional | 5 | 3 | — | 💡 suggested | [1] Number of Test Cases → [2] Size Covered | Actual ≥ 5 | LSL (3) ≤ Actual < Target (5) | Actual < 3 (below LSL) |
| Test Efficiency | Weighted Defects per Person-day | Higher the better | On completion of each review and at Retrospective point | Optional | 2 | 1 | — | 💡 suggested | [1] Total Weighted Defects Leaked to Customer → [2] Effort for Test Execution (person-days) | Actual ≥ 2 | LSL (1) ≤ Actual < Target (2) | Actual < 1 (below LSL) |
| Testing Defect Density | Weighted Defects per Size Unit | Within Limits | On completion of each review and at Retrospective point | Mandatory | 3 | 1 | 8 | 💡 suggested | [1] Total weighted defects from Testing → [2] Size Tested | LSL (1) ≤ Actual ≤ USL (8) | Not applicable — binary (within limits = GREEN, outside = RED) | Actual < 1 or Actual > 8 |
| Total Defect Density | Weighted Defects per Size Unit | Lower the better | On completion of customer or user acceptance testing and at Retrospective point | Optional | 2 | — | 5 | 💡 suggested | [1] Total Weighted Defects Leaked to Customer → [2] Total Weighted defects from Internal testing → [3] Delivered and Accepted Size | Actual ≤ 2 | Target (2) < Actual ≤ USL (5) | Actual > 5 (above USL) |
| Unit Test Coverage % | % | Higher the better | On completion of each test cycle and at Retrospective point | Optional | 75 | 70 | — | 📋 catalog | [1] Size of code that is unit tested → [2] Delivered and Accepted Size | Actual ≥ 75 | LSL (70) ≤ Actual < Target (75) | Actual < 70 (below LSL) |

## Non-functional-Maintainability

| Metric | UOM | Intent | Freq | Comp | Target | LSL | USL | Source | Input Values (what to enter) | GREEN when | AMBER when | RED when |
|--------|-----|--------|------|------|--------|-----|-----|--------|------------------------------|-----------|-----------|---------|
| Cyclomatic Complexity | Number | Lower the better | After each build in Central Server | Optional | 10 | — | 20 | 💡 suggested | Single value — enter computed result from static analysis tool (e.g. SonarQube) | Actual ≤ 10 | Target (10) < Actual ≤ USL (20) | Actual > 20 (above USL) |
| Technical Debt | Person-hours | Lower the better | After each build in Central Server | Optional | PM sets per project | — | — | ⚙️ project | Effort to fix all Code Smells (person-hours, from static analysis tool) | Actual at or below target | Actual above target but not critical | Actual significantly above target |

## Non-functional-Performance

| Metric | UOM | Intent | Freq | Comp | Target | LSL | USL | Source | Input Values (what to enter) | GREEN when | AMBER when | RED when |
|--------|-----|--------|------|------|--------|-----|-----|--------|------------------------------|-----------|-----------|---------|
| % of Screens meeting Response Time Target | % | Higher the better | After Performance Testing | Optional | 95 | 90 | — | 💡 suggested | [1] Number of screens that met the Response Time Target → [2] Total number of screens in the application | Actual ≥ 95 | LSL (90) ≤ Actual < Target (95) | Actual < 90 (below LSL) |
| Application Throughput | Transcations per Unit of Time | Higher the better | After Performance Testing | Optional | PM sets per project | — | — | ⚙️ project | [1] Number of transactions handled → [2] Handling Time (unit of time) | Actual meets or exceeds target | Actual below target but not critical | Actual significantly below target |

## Non-functional-Security

| Metric | UOM | Intent | Freq | Comp | Target | LSL | USL | Source | Input Values (what to enter) | GREEN when | AMBER when | RED when |
|--------|-----|--------|------|------|--------|-----|-----|--------|------------------------------|-----------|-----------|---------|
| Ontime activation and deactivation % | % | Higher the better | Monthly | Optional | 100 | 95 | — | 💡 suggested | Single value — enter the computed result directly | Actual ≥ 100 | LSL (95) ≤ Actual < Target (100) | Actual < 95 (below LSL) |
| OWASP Compliance % | % | Higher the better | After Security Testing | Optional | 100 | 95 | — | 💡 suggested | Single value — enter the computed result directly | Actual ≥ 100 | LSL (95) ≤ Actual < Target (100) | Actual < 95 (below LSL) |

## Non-functional-Usability

| Metric | UOM | Intent | Freq | Comp | Target | LSL | USL | Source | Input Values (what to enter) | GREEN when | AMBER when | RED when |
|--------|-----|--------|------|------|--------|-----|-----|--------|------------------------------|-----------|-----------|---------|
| Usability | % | Higher the better | After Usability Testing | Optional | 80 | 70 | — | 💡 suggested | Single value — enter the usability score % from testing | Actual ≥ 80 | LSL (70) ≤ Actual < Target (80) | Actual < 70 (below LSL) |

## Scope

| Metric | UOM | Intent | Freq | Comp | Target | LSL | USL | Source | Input Values (what to enter) | GREEN when | AMBER when | RED when |
|--------|-----|--------|------|------|--------|-----|-----|--------|------------------------------|-----------|-----------|---------|
| % of  unfulfilled Resource Requests | % | Lower the better | Weekly and Monthly | Mandatory | 5 | — | 15 | 💡 suggested | [1] Number of resources not fulfilled as on date → [2] Number of resources requests raised | Actual ≤ 5 | Target (5) < Actual ≤ USL (15) | Actual > 15 (above USL) |
| Abandon Call rate | % | Lower the better | Monthly | Optional | 3 | — | 8 | 💡 suggested | [1] Number of Abandoned Calls → [2] Number of Incoming Calls | Actual ≤ 3 | Target (3) < Actual ≤ USL (8) | Actual > 8 (above USL) |
| Backlog Management Index | % | Nominal the best | Monthly | Optional | 1 | 0.95 | — | 📋 catalog | [1] Number of tickets closed in a month → [2] Number of tickets reported in a month | Actual within 5% of Target (1) | Actual outside 5% of target but within spec limits | Actual < LSL (0.95) |
| Billability % for Change Requests | % | Higher the better | Monthly | Mandatory | 90 | 80 | — | 💡 suggested | [1] Effort billed to customer towards Change Requests → [2] Effort spent for implementing Change Requests | Actual ≥ 90 | LSL (80) ≤ Actual < Target (90) | Actual < 80 (below LSL) |
| Change Impact % | % | Not Applicable | Monthly | Optional | 10 | — | 25 | 💡 suggested | [1] Estimated or Actual Effort due to approved Change Requests → [2] Planned Effort | Actual meets Target (10) | Actual within 10% of target | Actual more than 10% away from target |
| Commitment to Delivery % | % | Higher the better | Each Sprint and Release | Mandatory | 98 | 95 | — | 📋 catalog | [1] Delivered and Accepted Size → [2] Size of Items committed | Actual ≥ 98 | LSL (95) ≤ Actual < Target (98) | Actual < 95 (below LSL) |
| Requirements Change % | % | Not Applicable | Monthly | Optional | 10 | — | 25 | 💡 suggested | [1] Number of Requirements changed after work start → [2] Total Number of Requirements | Actual meets Target (10) | Actual within 10% of target | Actual more than 10% away from target |
| Test Automation % | % | Higher the better | Each Test Cycle, Sprint and Release | Optional | 90 | 80 | — | 📋 catalog | [1] Number of test cases automated → [2] Total number of automatable test cases | Actual ≥ 90 | LSL (80) ≤ Actual < Target (90) | Actual < 80 (below LSL) |
| Test Coverage % | % | Higher the better | Each Test Cycle, Sprint and Release | Optional | 100 | 95 | — | 📋 catalog | [1] Number of test cases executed in a build or cycle → [2] Total number of Test cases planned for execution | Actual ≥ 100 | LSL (95) ≤ Actual < Target (100) | Actual < 95 (below LSL) |

## Stakeholder Perception

| Metric | UOM | Intent | Freq | Comp | Target | LSL | USL | Source | Input Values (what to enter) | GREEN when | AMBER when | RED when |
|--------|-----|--------|------|------|--------|-----|-----|--------|------------------------------|-----------|-----------|---------|
| Customer Satisfaction Index | Number | Higher the better | Once in Six Months or on Project Completion | Mandatory | 4 | 3 | 5 | 📋 catalog | CSAT Score (e.g. 3.8 on a 5-point scale) | Actual ≥ 4 | LSL (3) ≤ Actual < Target (4) | Actual < 3 (below LSL) |

## Time & Speed

| Metric | UOM | Intent | Freq | Comp | Target | LSL | USL | Source | Input Values (what to enter) | GREEN when | AMBER when | RED when |
|--------|-----|--------|------|------|--------|-----|-----|--------|------------------------------|-----------|-----------|---------|
| Average Resolution Time | Hours or days | Lower the better | Monthly | Optional | 4 | — | 8 | 💡 suggested | Single value — enter directly (average hours or days to resolve) | Actual ≤ 4 | Target (4) < Actual ≤ USL (8) | Actual > 8 (above USL) |
| Average Response Time | Minutes or hours | Lower the better | Monthly | Optional | 2 | — | 5 | 💡 suggested | Single value — enter directly (average minutes or hours to respond) | Actual ≤ 2 | Target (2) < Actual ≤ USL (5) | Actual > 5 (above USL) |
| Cycle Time | Number of hours or Number of days | Higher the better,Lower the better | Each week, month, quarter | Mandatory | PM sets per project | — | — | ⚙️ project | Single value — enter directly (hours or days per work item) | Actual meets target | Actual within 10% of target | Actual more than 10% away from target |
| Ontime completion | % | Higher the better | Monthly | Optional | 95 | 90 | — | 📋 catalog | [1] # of items completed on time → [2] # items planned for completion | Actual ≥ 95 | LSL (90) ≤ Actual < Target (95) | Actual < 90 (below LSL) |
| Release Delay % | % | Nominal the best | Each Sprint and Release | Optional | 0 | — | 10 | 💡 suggested | [1] Number of Sprints planned for release scope → [2] Actual Number of sprints completed → [3] Expected number of sprints required for remaining Release Scope | Actual within 5% of Target (0) | Actual outside 5% of target but within spec limits | Actual > USL (10) |
| Schedule Performance Index | Number | Nominal the best | Monthly | Optional | 1 | 0.9 | 1.1 | 💡 suggested | [1] Earned Value (EV) → [2] Planned Value (PV) | Actual within 5% of Target (1) | Actual outside 5% of target but within spec limits | Actual > USL (1.1) or < LSL (0.9) |
| Schedule Variance | % | Lower the better | Monthly | Mandatory | 2.5 | — | 5 | 📋 catalog | [1] Actual End Date → [2] Planned End Date → [3] Planned Start Date | Actual ≤ 2.5 | Target (2.5) < Actual ≤ USL (5) | Actual > 5 (above USL) |
| SLA Adherance % -  Resolution | % | Higher the better | Monthly | Mandatory | 95 | 90 | — | 📋 catalog | Single value — enter directly | Actual ≥ 95 | LSL (90) ≤ Actual < Target (95) | Actual < 90 (below LSL) |
| SLA Adherance % - P1 Resolution | % | Higher the better | Monthly | Optional | 95 | 90 | — | 📋 catalog | [1] # of P1 tickets resolved within SLA → [2] # of P1 tickets resolved | Actual ≥ 95 | LSL (90) ≤ Actual < Target (95) | Actual < 90 (below LSL) |
| SLA Adherance % - P1 Response | % | Higher the better | Monthly | Optional | 100 | 95 | — | 💡 suggested | [1] # of P1 tickets responded within SLA → [2] # of P1 tickets responded | Actual ≥ 100 | LSL (95) ≤ Actual < Target (100) | Actual < 95 (below LSL) |
| SLA Adherance % - P2 Resolution | % | Higher the better | Monthly | Optional | 95 | 90 | — | 📋 catalog | [1] # of P2 tickets resolved within SLA → [2] # of P2 tickets resolved | Actual ≥ 95 | LSL (90) ≤ Actual < Target (95) | Actual < 90 (below LSL) |
| SLA Adherance % - P2 Response | % | Higher the better | Monthly | Optional | 98 | 90 | — | 💡 suggested | [1] # of P2 tickets responded within SLA → [2] # of P2 tickets responded | Actual ≥ 98 | LSL (90) ≤ Actual < Target (98) | Actual < 90 (below LSL) |
| SLA Adherance % - P3 Resolution | % | Higher the better | Monthly | Optional | 95 | 90 | — | 📋 catalog | [1] # of P3 tickets resolved within SLA → [2] # of P3 tickets resolved | Actual ≥ 95 | LSL (90) ≤ Actual < Target (95) | Actual < 90 (below LSL) |
| SLA Adherance % - P3 Response | % | Higher the better | Monthly | Optional | 95 | 85 | — | 💡 suggested | [1] # of P3 tickets responded within SLA → [2] # of P3 tickets responded | Actual ≥ 95 | LSL (85) ≤ Actual < Target (95) | Actual < 85 (below LSL) |
| SLA Adherance % - P4 Resolution | % | Higher the better | Monthly | Optional | 95 | 90 | — | 📋 catalog | [1] # of P4 tickets resolved within SLA → [2] # of P4 tickets resolved | Actual ≥ 95 | LSL (90) ≤ Actual < Target (95) | Actual < 90 (below LSL) |
| SLA Adherance % - P4 Response | % | Higher the better | Monthly | Optional | 90 | 80 | — | 💡 suggested | [1] # of P4 tickets responded within SLA → [2] # of P4 tickets responded | Actual ≥ 90 | LSL (80) ≤ Actual < Target (90) | Actual < 80 (below LSL) |
| SLA Adherance % - P5 Resolution | % | Higher the better | Monthly | Optional | 95 | 90 | — | 📋 catalog | [1] # of P5 tickets resolved within SLA → [2] # of P5 tickets resolved | Actual ≥ 95 | LSL (90) ≤ Actual < Target (95) | Actual < 90 (below LSL) |
| SLA Adherance % - P5 Response | % | Higher the better | Monthly | Optional | 85 | 75 | — | 💡 suggested | [1] # of P5 tickets responded within SLA → [2] # of P5 tickets responded | Actual ≥ 85 | LSL (75) ≤ Actual < Target (85) | Actual < 75 (below LSL) |
| SLA Adherance % - Response | % | Higher the better | Monthly | Mandatory | 95 | 85 | — | 💡 suggested | Single value — enter directly | Actual ≥ 95 | LSL (85) ≤ Actual < Target (95) | Actual < 85 (below LSL) |
| Time to Fill Requisition | Days | Lower the better | Weekly and Monthly | Mandatory | 15 | — | 30 | 💡 suggested | Single value — enter directly (days taken to fill position) | Actual ≤ 15 | Target (15) < Actual ≤ USL (30) | Actual > 30 (above USL) |
| Time to Market | Calander Days per 100 Unit of Size | Lower the better | On completion of each Release | Optional | PM sets per project | — | — | ⚙️ project | Single value — enter directly (calendar days per 100 size units) | Actual at or below target | Actual above target but not critical | Actual significantly above target |
| Velocity | Story Points-SP | Nominal the best | Each Sprint and Release | Mandatory | PM sets per project | — | — | ⚙️ project | Story Points delivered and accepted per Sprint | Actual close to nominal target | Actual outside 5% of target but within spec limits | Actual far from nominal |
| WIP | Story Points-SP | Lower the better | Each week, month, quarter | Mandatory | PM sets per project | — | — | ⚙️ project | The sum of all WIP items currently in progress | Actual at or below target | Actual above target but not critical | Actual significantly above target |

---

## Legend
- 📋 **catalog** — threshold from the standard QPM catalog (authoritative)
- 💡 **suggested** — industry-standard default; PM should validate per project
- ⚙️ **project-specific** — no standard exists; PM must set during KPI Plan setup

*End of Metric RAG Reference*