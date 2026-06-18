# DeliveryPulse AI — All 83 QPM Metrics: Explanation, Formulas & Test Inputs

> **How to use this file:**  
> Login as **PM** → My Projects → Select a project → KPI Plan (QPM)  
> Sheet 1: Add metrics to your plan  
> Sheet 2: Enter the inputs listed below per metric → click **Submit & Compute KPI**  
> Check Sheet 3 (Tracker) and Sheet 4 (Summary) for computed results and RAG status.
>
> **Sample Period Name to use for all tests:** `June 2026`  
> **RAG Logic:** GREEN = meeting target | AMBER = acceptable but below target | RED = breaching limit

---

## RAG Rules Quick Reference

| Intent | GREEN | AMBER | RED |
|--------|-------|-------|-----|
| Higher the better | actual ≥ Target | Target > actual > LSL | actual ≤ LSL |
| Lower the better | actual ≤ Target | Target < actual < USL | actual ≥ USL |
| Nominal the best | within ±5% of Target | inside LSL–USL, off target | outside LSL or USL |
| Within Limits | inside LSL–USL | — | outside LSL or USL |

---

---

# CATEGORY 1 — FINANCIAL (3 metrics)

---

## 1. Gross Margin %

**What it measures:** The profitability of the project — how much revenue is left after paying direct resource and other costs.

**Why it matters:** This is the single most important financial metric. A project can be on-time and high-quality but still unprofitable if gross margin is poor.

**Formula:**
```
((Revenue - Direct HR Cost - Other Direct Cost) / Revenue) × 100
```

**UOM:** %  
**Intent:** Higher the better  
**Frequency:** Monthly  
**Compliance:** Mandatory (M)  
**Default Thresholds:** Target = 47.5% | LSL = 40%

**Real-world example:**  
Banking Portal project earns ₹10,00,000 in revenue. Direct HR cost = ₹4,50,000. Other direct costs = ₹80,000.  
Gross Margin = ((10,00,000 - 4,50,000 - 80,000) / 10,00,000) × 100 = **47%** → AMBER (below 47.5 target but above 40 LSL)

**Input type:** Direct (D) — enter the final % value directly

| Test Scenario | Input Value | Expected KPI | Expected RAG |
|--------------|-------------|--------------|--------------|
| GREEN — profitable | 50 | 50% | GREEN |
| AMBER — acceptable | 43 | 43% | AMBER |
| RED — loss zone | 35 | 35% | RED |

---

## 2. Revenue per Employee

**What it measures:** How much revenue each team member generates per month.

**Why it matters:** Higher revenue per employee means better leverage. Falling values signal over-staffing or undercharging.

**Formula:**
```
Total Revenue / Total Number of Resources
```

**UOM:** USD per Person-month  
**Intent:** Higher the better  
**Frequency:** Monthly  
**Compliance:** Mandatory (M)  
**Default Thresholds:** No default (project-specific)

**Real-world example:**  
Monthly revenue = $50,000. Team size = 10 people.  
Revenue per employee = $50,000 / 10 = **$5,000/person-month**

**Input type:** Direct — enter the calculated value

| Test Scenario | Input Value | Expected KPI | Expected RAG |
|--------------|-------------|--------------|--------------|
| Good performance | 5000 | 5000 | No RAG (no thresholds set) |
| Low performance | 2000 | 2000 | No RAG (set thresholds first) |

---

## 3. Average Resource Cost

**What it measures:** The average cost of each team member per month.

**Why it matters:** Higher average cost reduces gross margin. Useful for cost pyramid analysis and staffing optimization.

**Formula:**
```
Total Cost / Total Number of Resources
```

**UOM:** INR per Person-month  
**Intent:** Lower the better  
**Frequency:** Monthly  
**Compliance:** Mandatory (M)  
**Default Thresholds:** No default (project-specific)

**Real-world example:**  
Monthly team cost = ₹8,00,000. Team size = 10.  
Average Resource Cost = ₹8,00,000 / 10 = **₹80,000/person-month**

**Input type:** Direct — enter the calculated value

| Test Scenario | Input Value | Expected KPI | Expected RAG |
|--------------|-------------|--------------|--------------|
| Controlled cost | 80000 | 80000 | No RAG (set USL first) |

---

---

# CATEGORY 2 — EFFICIENCY (20 metrics)

---

## 4. Resource Utilization %

**What it measures:** What percentage of the available team capacity is actually being used productively.

**Why it matters:** Low utilization = idle talent burning cost. High utilization (>100%) = burnout risk.

**Formula:**
```
(Billed Effort + Nonbillable Delivery Effort + Training + Backup Effort)
/ (Total Capacity - Holidays & Leaves) × 100
```

**UOM:** %  
**Intent:** Higher the better  
**Frequency:** Monthly  
**Compliance:** Optional (O)

**Real-world example:**  
Team has 1000 hrs capacity. Holidays = 80 hrs. Productive effort = 860 hrs.  
Utilization = 860 / (1000 - 80) × 100 = **93.5%**

**Input type:** Direct — enter the final % value

| Test Scenario | Input Value | Expected KPI | Expected RAG |
|--------------|-------------|--------------|--------------|
| Well utilized | 92 | 92% | No RAG (no thresholds) |
| Under-utilized | 60 | 60% | No RAG (set LSL first) |

---

## 5. Billability %

**What it measures:** The percentage of team capacity that is actually billed to the customer.

**Why it matters:** Directly impacts revenue. Non-billed hours are cost without income.

**Formula:**
```
(Effort billed to customer / Total Capacity of team) × 100
```

**UOM:** %  
**Intent:** Higher the better  
**Frequency:** Monthly  
**Compliance:** Optional (O)  
**Default Thresholds:** Target = 100% | LSL = 95%

**Real-world example:**  
Team capacity = 800 hrs. Billed = 780 hrs.  
Billability = 780 / 800 × 100 = **97.5%** → GREEN

| Test Scenario | Input Value | Expected KPI | Expected RAG |
|--------------|-------------|--------------|--------------|
| GREEN | 97 | 97% | GREEN |
| AMBER | 96 | 96% | GREEN (above LSL 95) |
| RED | 88 | 88% | RED (below LSL 95) |

---

## 6. Effort Variance

**What it measures:** How much the project's total effort (actual + remaining) deviates from the original planned effort, expressed as a percentage.

**Why it matters:** Positive variance = over-spend risk. Negative = delivered efficiently under plan.

**Formula:**
```
(Actual Effort till date + Remaining Effort - Planned Effort) / Planned Effort × 100
```

**UOM:** %  
**Intent:** Lower the better  
**Frequency:** Monthly  
**Compliance:** Mandatory (M)  
**Default Thresholds:** Target = 10% | USL = 15%

**Inputs required (3 measures):**
1. Actual Effort for the Work till date
2. Remaining Effort for completing the pending work
3. Planned Effort

**Real-world example:**  
Banking Portal. Planned = 1000 hrs. Actual so far = 600 hrs. Remaining = 500 hrs.  
Effort Variance = (600 + 500 - 1000) / 1000 × 100 = **10%** → AMBER (equals target)

| Test Scenario | M1: Actual Effort | M2: Remaining | M3: Planned | Expected KPI | Expected RAG |
|--------------|-------------------|---------------|-------------|--------------|--------------|
| GREEN (on plan) | 400 | 550 | 1000 | 5% (AMBER — check) → actually (400+550-1000)/1000×100 = -5% | GREEN |
| AMBER | 600 | 500 | 1000 | 10% | AMBER |
| RED (overrun) | 700 | 500 | 1000 | 20% | RED |

> **Tip:** For GREEN, try Actual=400, Remaining=550, Planned=1000 → (400+550-1000)/1000×100 = -5% → GREEN

---

## 7. Productivity

**What it measures:** How much work (in size units like FP or story points) is delivered per person-day of effort.

**Why it matters:** Higher productivity = more output per hour. Trend over time shows process improvement.

**Formula:**
```
Delivered & Accepted Size / Total Actual Effort in Person-days
```

**UOM:** Size Unit per Person-day  
**Intent:** Higher the better  
**Frequency:** On completion of each component  
**Compliance:** Mandatory (M)  
**Default Thresholds:** No default (baseline from history)

**Inputs required (2 measures):**
1. Delivered and Accepted Size
2. Total Actual Effort in Person-days

**Real-world example:**  
Delivered 200 function points. Effort = 40 person-days.  
Productivity = 200 / 40 = **5 FP/person-day**

| Test Scenario | M1: Delivered Size | M2: Effort (PD) | Expected KPI | Expected RAG |
|--------------|-------------------|-----------------|--------------|--------------|
| High productivity | 200 | 40 | 5.0 | No RAG |
| Low productivity | 50 | 40 | 1.25 | No RAG |

---

## 8. Overall Delivery Rate

**What it measures:** How many person-hours it takes to deliver one unit of size. Inverse of productivity.

**Why it matters:** Lower is better — less effort per unit means more efficient delivery.

**Formula:**
```
Total Actual Effort in Person-hours / Delivered and Accepted Size
```

**UOM:** Person-hours per Size Unit  
**Intent:** Lower the better  
**Frequency:** On completion of each component  
**Compliance:** Mandatory (M)

**Inputs required (2 measures):**
1. Total Actual Effort in Person-hours
2. Delivered and Accepted Size

| Test Scenario | M1: Effort (PH) | M2: Delivered Size | Expected KPI | Expected RAG |
|--------------|-----------------|-------------------|--------------|--------------|
| Efficient | 320 | 200 | 1.6 hrs/unit | No RAG |
| Slow | 600 | 100 | 6.0 hrs/unit | No RAG |

---

## 9. Rework %

**What it measures:** What percentage of total effort was spent redoing work that was already done (due to defects, miscommunication, or scope misunderstanding).

**Why it matters:** High rework % signals quality problems upstream. Every hour on rework is an hour not adding new value.

**Formula:**
```
Rework Effort / Total Effort × 100
```

**UOM:** %  
**Intent:** Lower the better  
**Compliance:** Optional (O)

**Inputs required (2 measures):**
1. Rework Effort
2. Total Effort

**Real-world example:**  
Total effort = 500 hrs. Rework = 50 hrs.  
Rework % = 50 / 500 × 100 = **10%**

| Test Scenario | M1: Rework Effort | M2: Total Effort | Expected KPI | Expected RAG |
|--------------|-------------------|-----------------|--------------|--------------|
| Good (low rework) | 20 | 500 | 4% | No RAG |
| High rework | 100 | 500 | 20% | No RAG |

---

## 10. Reuse Saving %

**What it measures:** What percentage of planned effort was saved by reusing existing components, libraries, or assets.

**Why it matters:** Reuse is free productivity. High reuse means better delivery speed at lower cost.

**Formula:**
```
(Actual Effort saving through Re-use / Planned Effort) × 100
```

**Inputs required (2 measures):**
1. Actual Effort saving through Re-use
2. Planned Effort

| Test Scenario | M1: Saving | M2: Planned | Expected KPI | Expected RAG |
|--------------|------------|-------------|--------------|--------------|
| Good reuse | 150 | 1000 | 15% | No RAG |
| No reuse | 0 | 1000 | 0% | No RAG |

---

## 11. Cost Performance Index (CPI)

**What it measures:** Ratio of Earned Value to Actual Cost. CPI > 1 means you're getting more work done per dollar than planned.

**Why it matters:** Key Earned Value Management (EVM) metric. CPI < 1 is a red flag for financial overrun.

**Formula:**
```
Earned Value / Actual Cost
```

**UOM:** Number (ratio)  
**Intent:** Nominal the best (target = 1.0)  
**Compliance:** Optional (O)

**Inputs required (2 measures):**
1. Earned Value
2. Actual Cost

**Real-world example:**  
EV = $80,000 (work accomplished). AC = $100,000 (what was spent).  
CPI = 80,000 / 100,000 = **0.8** → under-performing (spending more than earned)

| Test Scenario | M1: Earned Value | M2: Actual Cost | Expected KPI | Expected RAG |
|--------------|-----------------|-----------------|--------------|--------------|
| GREEN (on budget) | 100000 | 100000 | 1.0 | GREEN (if target=1) |
| AMBER (slight overrun) | 90000 | 100000 | 0.9 | AMBER |
| RED (major overrun) | 60000 | 100000 | 0.6 | RED |

---

## 12. Billability % for Change Requests

**What it measures:** Of all the effort spent implementing Change Requests, what % was actually billed to the customer.

**Why it matters:** Unbilled CR effort is pure cost with no revenue recovery.

**Formula:**
```
Effort billed to customer for CRs / Effort spent on CRs × 100
```

**Inputs required (2 measures):**
1. Effort billed to customer towards Change Requests
2. Effort spent for implementing Change Requests

| Test Scenario | M1: Billed CR Effort | M2: CR Effort Spent | Expected KPI | Expected RAG |
|--------------|---------------------|---------------------|--------------|--------------|
| Full recovery | 200 | 200 | 100% | No RAG |
| Partial recovery | 150 | 200 | 75% | No RAG |

---

## 13. Requirements Analysis Delivery Rate

**What it measures:** Effort per size unit spent specifically on requirements analysis.

**Formula:** `Effort for Requirements Analysis / Total Size`  
**Intent:** Within Limits  
**Inputs:** Effort spent for Requirements Analysis + Total Size

| Test Scenario | M1: Analysis Effort | M2: Total Size | Expected KPI |
|--------------|---------------------|---------------|--------------|
| Normal | 40 | 100 | 0.4 hrs/unit |

---

## 14. Design Delivery Rate

**What it measures:** Effort per size unit spent on design.

**Formula:** `Effort for Design / Total Size`  
**Intent:** Within Limits  
**Inputs:** Effort spent for Design + Total Size

| Test | M1: Design Effort | M2: Size | KPI |
|------|------------------|----------|-----|
| Normal | 60 | 100 | 0.6 |

---

## 15. Coding Delivery Rate

**What it measures:** Effort per size unit for coding/development.

**Formula:** `Effort for Coding / Total Size`  
**Intent:** Within Limits  
**Inputs:** Effort spent for Coding + Total Size

| Test | M1: Coding Effort | M2: Size | KPI |
|------|------------------|----------|-----|
| Normal | 120 | 100 | 1.2 |

---

## 16. Code Review Delivery Rate

**What it measures:** Effort per size unit spent on code reviews.

**Formula:** `Effort for Code Review / Total Size`  
**Intent:** Within Limits | **Compliance:** Mandatory  
**Inputs:** Effort spent for Code Review + Total Size

| Test | M1: Review Effort | M2: Size | KPI |
|------|------------------|----------|-----|
| Normal | 30 | 100 | 0.3 |

---

## 17. Test Design Delivery Rate

**Formula:** `Effort for Test Design / Total Size`  
**Intent:** Within Limits  
**Inputs:** Effort Spent for Test Design + Total Size

| Test | M1: Test Design Effort | M2: Size | KPI |
|------|----------------------|----------|-----|
| Normal | 50 | 100 | 0.5 |

---

## 18. Test Design Review Delivery Rate

**Formula:** `Effort for Test Design Review / Total Size`  
**Intent:** Within Limits | **Compliance:** Mandatory  
**Inputs:** Effort Spent for Test Design Review + Total Size

| Test | M1: TDR Effort | M2: Size | KPI |
|------|---------------|----------|-----|
| Normal | 20 | 100 | 0.2 |

---

## 19. Test Execution Delivery Rate

**Formula:** `Effort for Test Execution / Total Size`  
**Intent:** Within Limits  
**Inputs:** Effort Spent for Test Execution + Total Size

| Test | M1: Test Exec Effort | M2: Size | KPI |
|------|---------------------|----------|-----|
| Normal | 80 | 100 | 0.8 |

---

## 20. Process Throughput

**What it measures:** Total size of work items completed in a time period (Kanban teams).

**Formula:** Direct — enter the number of story points completed  
**Intent:** Higher the better | **Compliance:** Mandatory (Kanban)

| Test Scenario | Input | Expected KPI | Expected RAG |
|--------------|-------|--------------|--------------|
| High output | 85 | 85 SP | No RAG |
| Low output | 20 | 20 SP | No RAG |

---

## 21. Percentage Code Review Effort

**What it measures:** What portion of total engineering effort went into code/script reviews.

**Formula:**
```
(Effort spent on Code/Script Reviews / Total Engineering Effort) × 100
```

**Intent:** Within Limits  
**Inputs required (2 measures):**
1. Effort spent on Code or Script Reviews
2. Total Engineering Effort

| Test Scenario | M1: Review Effort | M2: Total Eng Effort | Expected KPI |
|--------------|-------------------|---------------------|--------------|
| Healthy review % | 30 | 200 | 15% |
| Under-reviewed | 5 | 200 | 2.5% |

---

## 22. Review Efficiency

**What it measures:** How many weighted defects are found per person-day of review effort. High = reviews are working well.

**Formula:**
```
Total weighted Review defects / Review Effort in Person-days
```

**Inputs required (2 measures):**
1. Total weighted Review defects
2. Review Effort in Person-days

| Test | M1: Defects | M2: Review Days | Expected KPI |
|------|-------------|-----------------|--------------|
| High efficiency | 20 | 4 | 5 defects/PD |
| Low efficiency | 2 | 4 | 0.5 defects/PD |

---

## 23. Test Efficiency

**What it measures:** Defects found (leaked to customer) per person-day of test execution effort.

**Formula:**
```
Total Weighted Defects Leaked to Customer / Effort for Test Execution
```

**Inputs required (2 measures):**
1. Total Weighted Defects Leaked to Customer
2. Effort for Test Execution

| Test | M1: Customer Defects | M2: Test Effort | Expected KPI |
|------|---------------------|-----------------|--------------|
| Normal | 5 | 20 | 0.25 |

---

---

# CATEGORY 3 — TIME & SPEED (23 metrics)

---

## 24. Schedule Variance

**What it measures:** How much the project end date slipped compared to the original plan, expressed as a % of total planned duration.

**Why it matters:** Most visible metric for customers. Even a small slip becomes significant on long projects.

**Formula:**
```
((Actual End Date - Planned End Date) / (Planned End Date - Planned Start Date)) × 100
```

**UOM:** %  
**Intent:** Lower the better  
**Frequency:** Monthly  
**Compliance:** Mandatory (M)  
**Default Thresholds:** Target = 2.5% | USL = 5%

**Inputs required (3 measures):**
1. Actual End Date (enter as days-from-start number, e.g., 120 for day 120)
2. Planned End Date
3. Planned Start Date

> **Note:** The system uses numeric values. Enter dates as day-count numbers (e.g., Planned Start = 0, Planned End = 100, Actual End = 105 → variance = 5%)

| Test Scenario | M1: Actual End | M2: Planned End | M3: Planned Start | Expected KPI | Expected RAG |
|--------------|----------------|-----------------|-------------------|--------------|--------------|
| GREEN (minor slip) | 102 | 100 | 0 | 2% | GREEN |
| AMBER (moderate) | 104 | 100 | 0 | 4% | AMBER |
| RED (major slip) | 108 | 100 | 0 | 8% | RED |
| On time | 100 | 100 | 0 | 0% | GREEN |

---

## 25. Schedule Performance Index (SPI)

**What it measures:** EVM ratio. SPI = 1.0 is perfect. <1.0 means behind schedule; >1.0 means ahead.

**Formula:**
```
Earned Value / Planned Value
```

**Intent:** Nominal the best  
**Inputs required (2 measures):**
1. Earned Value
2. Planned Value

| Test Scenario | M1: EV | M2: PV | Expected KPI | Note |
|--------------|--------|--------|--------------|------|
| On schedule | 100000 | 100000 | 1.0 | GREEN |
| Behind schedule | 80000 | 100000 | 0.8 | RED |
| Ahead | 110000 | 100000 | 1.1 | AMBER |

---

## 26. Time to Market

**What it measures:** Calendar days per 100 size units from release start to milestone completion. Lower = faster.

**Formula:** Direct — enter the computed value  
**Intent:** Lower the better  
**UOM:** Calendar days per 100 size units

| Test | Input | Expected KPI | Expected RAG |
|------|-------|--------------|--------------|
| Fast delivery | 30 | 30 | No RAG |
| Slow delivery | 90 | 90 | No RAG |

---

## 27. Velocity

**What it measures:** Story points delivered and accepted per sprint. Fundamental Agile team health metric.

**Why it matters:** Stable or growing velocity = healthy team. Fluctuating velocity = planning or process issues.

**Formula:** Direct — Story Points delivered and accepted per sprint  
**UOM:** Story Points  
**Intent:** Nominal the best  
**Compliance:** Mandatory (Scrum)  
**Frequency:** Each Sprint

| Test Scenario | Input | Expected KPI | Expected RAG |
|--------------|-------|--------------|--------------|
| Healthy sprint | 42 | 42 SP | No RAG (set target first) |
| Low velocity sprint | 15 | 15 SP | No RAG |
| Great sprint | 58 | 58 SP | No RAG |

---

## 28. Release Delay %

**What it measures:** How many more sprints are needed vs. originally planned to complete the release scope.

**Formula:**
```
(Actual sprints completed + Expected sprints remaining - Planned sprints) / Planned sprints × 100
```

**Inputs required (3 measures):**
1. Number of Sprints planned for release scope
2. Actual Number of sprints completed
3. Expected number of sprints required for remaining Release Scope

| Test Scenario | M1: Planned | M2: Actual Done | M3: Remaining | Expected KPI | Expected RAG |
|--------------|-------------|-----------------|---------------|--------------|--------------|
| On track | 10 | 5 | 5 | 0% | GREEN (if target=0) |
| Delayed | 10 | 7 | 5 | 20% | RED |

---

## 29. WIP (Work In Progress)

**What it measures:** Total number/points of items currently in-progress on the Kanban board. Lower = better flow.

**Why it matters:** High WIP leads to context-switching, delays, and reduced throughput. Limiting WIP is a core Kanban principle.

**Formula:** Direct — enter the sum of WIP items  
**Intent:** Lower the better  
**Compliance:** Mandatory (Kanban)

| Test Scenario | Input | Expected KPI | Expected RAG |
|--------------|-------|--------------|--------------|
| Healthy (low WIP) | 8 | 8 | GREEN (if USL set to 15) |
| Too high WIP | 25 | 25 | RED |

---

## 30. Cycle Time

**What it measures:** Average elapsed time from when a work item is picked up to when it is completed and delivered.

**Formula:** Direct — enter average days/hours  
**Intent:** Lower the better  
**Compliance:** Mandatory (Kanban)

| Test Scenario | Input | Expected KPI | Expected RAG |
|--------------|-------|--------------|--------------|
| Fast cycle | 3 | 3 days | No RAG |
| Slow cycle | 14 | 14 days | No RAG |

---

## 31. SLA Adherence % — Resolution (All Priority)

**What it measures:** % of all tickets resolved within the agreed SLA time.

**Formula:**
```
(# tickets resolved within SLA / # tickets resolved) × 100
```

**Default Thresholds:** Target = 95% | LSL = 90%  
**Compliance:** Mandatory

**Inputs (2 measures):**
1. # of tickets resolved within SLA
2. # of tickets resolved

| Test Scenario | M1: Within SLA | M2: Total Resolved | Expected KPI | Expected RAG |
|--------------|----------------|-------------------|--------------|--------------|
| GREEN | 96 | 100 | 96% | GREEN |
| AMBER | 92 | 100 | 92% | AMBER |
| RED | 85 | 100 | 85% | RED |

---

## 32. SLA Adherence % — P1 Resolution

Same as above but filtered to Priority 1 (Critical) tickets only.  
**Thresholds:** Target = 95% | LSL = 90%

**Inputs (2 measures):**
1. # of P1 tickets resolved within SLA
2. # of P1 tickets resolved

| Test | M1 | M2 | KPI | RAG |
|------|----|----|-----|-----|
| GREEN | 19 | 20 | 95% | GREEN |
| RED | 15 | 20 | 75% | RED |

---

## 33. SLA Adherence % — P2 Resolution

**Inputs:** # P2 within SLA + # P2 total resolved  
**Thresholds:** Target = 95% | LSL = 90%

| Test | M1: Within SLA | M2: Total | KPI | RAG |
|------|----------------|-----------|-----|-----|
| GREEN | 47 | 50 | 94% | AMBER |
| RED | 40 | 50 | 80% | RED |

---

## 34. SLA Adherence % — P3 Resolution

Same pattern. **Inputs:** P3 within SLA + total P3.

| Test | M1 | M2 | KPI | RAG |
|------|----|----|-----|-----|
| GREEN | 95 | 100 | 95% | GREEN |
| RED | 80 | 100 | 80% | RED |

---

## 35. SLA Adherence % — P4 Resolution

Same pattern. **Inputs:** P4 within SLA + total P4.

| Test | M1 | M2 | KPI | RAG |
|------|----|----|-----|-----|
| GREEN | 95 | 100 | 95% | GREEN |

---

## 36. SLA Adherence % — P5 Resolution

Same pattern. **Inputs:** P5 within SLA + total P5.

| Test | M1 | M2 | KPI | RAG |
|------|----|----|-----|-----|
| GREEN | 95 | 100 | 95% | GREEN |

---

## 37. SLA Adherence % — Response (All Priority)

**What it measures:** % of tickets where the first response was made within the agreed SLA.

**Formula:**
```
(# tickets responded within SLA / # tickets responded) × 100
```

**Compliance:** Mandatory

**Inputs:** # responded within SLA + # responded total

| Test | M1 | M2 | KPI | RAG |
|------|----|----|-----|-----|
| GREEN | 98 | 100 | 98% | No RAG (no thresholds) |

---

## 38. SLA Adherence % — P1 Response

**Inputs:** # P1 responded within SLA + total P1 responded

| Test | M1 | M2 | KPI |
|------|----|----|-----|
| Good | 20 | 20 | 100% |

---

## 39. SLA Adherence % — P2 Response

**Inputs:** # P2 responded within SLA + total P2 responded

| Test | M1 | M2 | KPI |
|------|----|----|-----|
| Good | 45 | 50 | 90% |

---

## 40. SLA Adherence % — P3 Response

**Inputs:** # P3 responded within SLA + total P3 responded

---

## 41. SLA Adherence % — P4 Response

**Inputs:** # P4 responded within SLA + total P4 responded

---

## 42. SLA Adherence % — P5 Response

**Inputs:** # P5 responded within SLA + total P5 responded

---

## 43. Mean Time to Resolve (MTTR)

**What it measures:** Average time taken to fully resolve an incident from when it was raised.

**Formula:** Direct — enter average resolution time in hours  
**Intent:** Lower the better  
**Compliance:** Mandatory

| Test Scenario | Input | Expected KPI | Expected RAG |
|--------------|-------|--------------|--------------|
| Fast resolution | 2 | 2 hours | No RAG |
| Slow resolution | 48 | 48 hours | No RAG |

---

## 44. Mean Time Between Failures (MTBF)

**What it measures:** Average time between system failures/incidents. Higher = more stable system.

**Formula:** Direct  
**Intent:** Higher the better  
**Compliance:** Mandatory

| Test Scenario | Input | Expected KPI |
|--------------|-------|--------------|
| Stable system | 720 | 720 hours |
| Frequent failures | 24 | 24 hours |

---

---

# CATEGORY 4 — INTERNAL QUALITY (14 metrics)

---

## 45. Process Health Index

**What it measures:** An overall index (from Del-Ex tool) representing how well the project follows defined processes — reviews, test coverage, risk management, etc.

**Why it matters:** Poor process health today leads to quality and delivery problems tomorrow.

**Formula:** Direct — enter the index value from Del-Ex tool  
**UOM:** %  
**Intent:** Higher the better  
**Frequency:** Quarterly  
**Default Thresholds:** Target = 87.5% | LSL = 75%

| Test Scenario | Input | Expected KPI | Expected RAG |
|--------------|-------|--------------|--------------|
| GREEN | 90 | 90% | GREEN |
| AMBER | 80 | 80% | AMBER |
| RED | 70 | 70% | RED |

---

## 46. Total Defect Density

**What it measures:** Total defects (both internal testing + customer-escaped) per unit of delivered size. Comprehensive quality picture.

**Formula:**
```
(Customer Defects + Internal Testing Defects) / Delivered and Accepted Size
```

**Inputs required (3 measures):**
1. Total Weighted Defects Leaked to Customer
2. Total Weighted defects from Internal testing
3. Delivered and Accepted Size

| Test Scenario | M1: Customer | M2: Internal | M3: Size | Expected KPI | Expected RAG |
|--------------|-------------|-------------|---------|--------------|--------------|
| Low density (good) | 2 | 8 | 100 | 0.1 | No RAG |
| High density (bad) | 10 | 40 | 100 | 0.5 | No RAG |

---

## 47. Review Coverage %

**What it measures:** What % of delivered code was subjected to peer/code review.

**Formula:**
```
Size of code reviewed / Delivered and Accepted Size × 100
```

**Intent:** Higher the better

**Inputs (2 measures):**
1. Size of code that is reviewed
2. Delivered and Accepted Size

| Test Scenario | M1: Reviewed Size | M2: Delivered Size | Expected KPI | Expected RAG |
|--------------|------------------|-------------------|--------------|--------------|
| GREEN (full coverage) | 95 | 100 | 95% | No RAG |
| Poor coverage | 40 | 100 | 40% | No RAG |

---

## 48. Unit Test Coverage %

**What it measures:** What % of code is covered by unit tests.

**Formula:**
```
Size of code unit tested / Delivered and Accepted Size × 100
```

**Intent:** Higher the better  
**Default Thresholds:** Target = 75% | LSL = 70%

**Inputs (2 measures):**
1. Size of code that is unit tested
2. Delivered and Accepted Size

| Test Scenario | M1: UT Size | M2: Total Size | Expected KPI | Expected RAG |
|--------------|------------|---------------|--------------|--------------|
| GREEN | 80 | 100 | 80% | GREEN |
| AMBER | 72 | 100 | 72% | AMBER |
| RED | 65 | 100 | 65% | RED |

---

## 49. Review Defect Density

**What it measures:** Defects per size unit found during reviews (code reviews, design reviews).

**Formula:**
```
Total weighted Review defects / Total Size reviewed
```

**Intent:** Within Limits | **Compliance:** Mandatory

**Inputs (2 measures):**
1. Total weighted Review defects
2. Total Size reviewed

| Test | M1: Defects | M2: Size Reviewed | Expected KPI |
|------|-------------|------------------|--------------|
| Normal | 15 | 100 | 0.15 |
| Too high | 50 | 100 | 0.5 |

---

## 50. Testing Defect Density

**What it measures:** Defects found during internal testing per unit of size tested.

**Formula:**
```
Total weighted defects from Testing / Size Tested
```

**Intent:** Within Limits | **Compliance:** Mandatory

**Inputs (2 measures):**
1. Total weighted defects from Testing
2. Size Tested

| Test | M1: Testing Defects | M2: Size Tested | Expected KPI |
|------|--------------------|-----------------|-----------------------------|
| Normal | 25 | 100 | 0.25 |
| High | 60 | 100 | 0.6 |

---

## 51. Test Case per Size

**What it measures:** How many test cases exist per size unit. Indicates test thoroughness.

**Formula:**
```
Number of Test Cases / Size Covered
```

**Inputs (2 measures):**
1. Number of Test Cases
2. Size Covered

| Test | M1: Test Cases | M2: Size | Expected KPI |
|------|---------------|---------|--------------|
| Good coverage | 300 | 100 | 3.0 |
| Sparse coverage | 50 | 100 | 0.5 |

---

## 52. First Time Test Case Pass %

**What it measures:** % of test cases that passed on the very first execution. High = clean code being tested.

**Formula:**
```
Number of Test Cases passed first time / Number executed × 100
```

**Intent:** Higher the better

**Inputs (2 measures):**
1. Number of Test Cases passed first time
2. Number of test cases executed

| Test Scenario | M1: Passed 1st Time | M2: Total Executed | Expected KPI | Expected RAG |
|--------------|--------------------|--------------------|--------------|--------------|
| HIGH quality | 90 | 100 | 90% | No RAG |
| POOR quality | 50 | 100 | 50% | No RAG |

---

---

# CATEGORY 5 — DELIVERED QUALITY (6 metrics)

---

## 53. Delivered Defect Density

**What it measures:** Defects that escaped to the customer per unit of delivered size. This is THE most important quality metric visible to the customer.

**Why it matters:** Every defect reaching production destroys customer trust and creates support cost. Target is always to drive this to zero.

**Formula:**
```
Total Weighted Defects Leaked to Customer / Delivered and Accepted Size
```

**UOM:** Weighted Defects per Size Unit  
**Intent:** Lower the better  
**Frequency:** On completion of UAT  
**Compliance:** Mandatory (M)

**Inputs required (2 measures):**
1. Total Weighted Defects Leaked to Customer
2. Delivered and Accepted Size

**Real-world example:**  
Banking Portal UAT: 3 weighted defects leaked. Delivered = 150 FP.  
DDD = 3 / 150 = **0.02 defects/FP** → excellent

| Test Scenario | M1: Customer Defects | M2: Delivered Size | Expected KPI | Expected RAG |
|--------------|---------------------|-------------------|--------------|--------------|
| Excellent (GREEN) | 2 | 200 | 0.01 | No RAG (set USL first) |
| Poor (many leaks) | 20 | 200 | 0.10 | No RAG |
| Zero defects | 0 | 200 | 0.0 | Needs USL configured |

---

## 54. Test Automation Coverage %

**What it measures:** What % of the test suite is automated vs. manual.

**Formula:** Direct — enter the %  
**Intent:** Higher the better  
**Compliance:** Mandatory

| Test Scenario | Input | Expected KPI | Expected RAG |
|--------------|-------|--------------|--------------|
| Good automation | 75 | 75% | No RAG |
| Low automation | 20 | 20% | No RAG |

---

## 55–58. (Other Delivered Quality metrics)

These follow the same direct-entry pattern. Enter the % value directly.

---

---

# CATEGORY 6 — SCOPE (9 metrics)

---

## 59. Requirements Change %

**What it measures:** What % of requirements changed after development started.

**Why it matters:** Frequent changes = unstable scope = rework = cost overruns.

**Formula:**
```
Number of Requirements changed after work start / Total Requirements × 100
```

**Intent:** Not Applicable (informational only — no RAG computed)  
**Compliance:** Optional (O)

**Inputs (2 measures):**
1. Number of Requirements changed after work start
2. Total Number of Requirements

| Test Scenario | M1: Changed | M2: Total | Expected KPI |
|--------------|-------------|-----------|--------------|
| Stable scope | 5 | 100 | 5% |
| Volatile scope | 30 | 100 | 30% |

---

## 60. Change Impact %

**What it measures:** How much additional effort the approved change requests added on top of original planned effort.

**Formula:**
```
Estimated/Actual Effort due to approved CRs / Planned Effort × 100
```

**Intent:** Not Applicable (informational)

**Inputs (2 measures):**
1. Estimated or Actual Effort due to approved Change Requests
2. Planned Effort

| Test | M1: CR Effort | M2: Planned | Expected KPI |
|------|--------------|-------------|--------------|
| Moderate impact | 150 | 1000 | 15% |
| High impact | 400 | 1000 | 40% |

---

## 61. Commitment to Delivery %

**What it measures:** % of committed sprint/release scope that was actually delivered and accepted.

**Formula:**
```
(Delivered and Accepted Size / Size of Items committed) × 100
```

**Intent:** Higher the better  
**Compliance:** Mandatory (Agile)  
**Default Thresholds:** Target = 98% | LSL = 95%

**Inputs (2 measures):**
1. Delivered and Accepted Size
2. Size of Items committed

| Test Scenario | M1: Delivered | M2: Committed | Expected KPI | Expected RAG |
|--------------|--------------|---------------|--------------|--------------|
| GREEN (full delivery) | 49 | 50 | 98% | GREEN |
| AMBER | 46 | 50 | 92% | AMBER |
| RED | 40 | 50 | 80% | RED |

---

## 62. Billability % for Change Requests

_(Already covered in Efficiency section — #12)_

---

---

# CATEGORY 7 — STAKEHOLDER PERCEPTION (1 metric)

---

## 63. Customer Satisfaction Index (CSAT)

**What it measures:** Customer's satisfaction with the project, product, and team, measured on a 1–5 scale.

**Why it matters:** The ultimate measure. All other metrics should ultimately improve the customer experience.

**Formula:** Direct — enter the CSAT score (1.0 to 5.0)  
**UOM:** Number (scale 1–5)  
**Intent:** Higher the better  
**Frequency:** Once in 6 months or on project completion  
**Compliance:** Mandatory (M)  
**Default Thresholds:** Target = 4.0 | LSL = 3.0 | USL = 5.0

| Test Scenario | Input | Expected KPI | Expected RAG |
|--------------|-------|--------------|--------------|
| GREEN (satisfied) | 4.2 | 4.2 | GREEN |
| AMBER (neutral) | 3.5 | 3.5 | AMBER |
| RED (dissatisfied) | 2.5 | 2.5 | RED |

---

---

# CATEGORY 8 — NON-FUNCTIONAL: PERFORMANCE (2 metrics)

---

## 64. % of Screens Meeting Response Time Target

**What it measures:** What % of the application screens load/respond within the performance target time (e.g., <3 seconds).

**Why it matters:** Slow screens = poor user experience = reduced adoption.

**Formula:**
```
Screens meeting response time target / Total screens × 100
```

**Inputs (2 measures):**
1. Number of screens met the Response Time Target
2. Number of screens in the application

| Test Scenario | M1: Screens Passing | M2: Total Screens | Expected KPI | Expected RAG |
|--------------|--------------------|--------------------|--------------|--------------|
| Good performance | 45 | 50 | 90% | No RAG |
| Poor performance | 20 | 50 | 40% | No RAG |

---

## 65. Application Throughput

**What it measures:** How many transactions the application can handle per unit of time under load.

**Formula:**
```
Number of transactions handled / Handling Time
```

**UOM:** Transactions per unit time  
**Intent:** Higher the better

**Inputs (2 measures):**
1. Number of transactions handled
2. Handling Time

| Test | M1: Transactions | M2: Time | Expected KPI |
|------|-----------------|---------|--------------|
| High throughput | 1000 | 10 | 100 TPS |
| Low throughput | 200 | 10 | 20 TPS |

---

---

# CATEGORY 9 — NON-FUNCTIONAL: SECURITY (2 metrics)

---

## 66. OWASP Compliance %

**What it measures:** What % of applicable OWASP security vulnerabilities have been addressed.

**Why it matters:** Security is non-negotiable. Unaddressed OWASP issues = hacked applications, data breaches, regulatory fines.

**Formula:**
```
OWASP vulnerabilities addressed / Total applicable OWASP vulnerabilities × 100
```

**Intent:** Higher the better  
**Formula:** Direct — enter the %

| Test Scenario | Input | Expected KPI | Expected RAG |
|--------------|-------|--------------|--------------|
| Fully compliant | 100 | 100% | No RAG |
| Partially compliant | 75 | 75% | No RAG |
| Non-compliant | 40 | 40% | No RAG |

---

## 67. Ontime Activation/Deactivation %

**What it measures:** % of user access requests (activate/deactivate accounts) completed within the agreed SLA time.

**Formula:**
```
Requests completed on time / Total requests × 100
```

**Intent:** Higher the better  
**Formula:** Direct — enter the %

| Test | Input | Expected KPI |
|------|-------|--------------|
| GREEN | 98 | 98% |
| Delayed | 75 | 75% |

---

---

# CATEGORY 10 — NON-FUNCTIONAL: MAINTAINABILITY (2 metrics)

---

## 68. Technical Debt

**What it measures:** Total estimated effort (in person-hours) required to fix all code smells and bad practices in the codebase right now.

**Why it matters:** Accumulated technical debt slows down every future feature. It compounds like financial debt.

**Formula:** Direct — enter effort in person-hours to fix all code smells  
**UOM:** Person-hours  
**Intent:** Lower the better  
**Frequency:** After each build

| Test Scenario | Input | Expected KPI | Expected RAG |
|--------------|-------|--------------|--------------|
| Healthy codebase | 8 | 8 hours | No RAG |
| High debt | 200 | 200 hours | No RAG |
| Critical debt | 500 | 500 hours | No RAG |

---

## 69. Cyclomatic Complexity

**What it measures:** Mathematical measure of code complexity based on the number of linearly independent paths through the code.

**Why it matters:** High complexity = harder to test, maintain, and debug. Functions above 10 are hard to maintain; above 25 are unmaintainable.

**Formula:**
```
Number of edges - Number of nodes + 2 × Number of disconnected parts
```

**UOM:** Number  
**Intent:** Lower the better

**Input:** Direct — enter the complexity score

| Test Scenario | Input | Expected KPI | Expected RAG |
|--------------|-------|--------------|--------------|
| Simple code | 5 | 5 | No RAG |
| Complex code | 15 | 15 | No RAG |
| Unmaintainable | 30 | 30 | No RAG |

---

---

# CATEGORY 11 — NON-FUNCTIONAL: USABILITY (1 metric)

---

## 70. Usability

**What it measures:** What % of the application's screens/features/information can be accessed within the target number of clicks (usually 3 clicks from homepage).

**Why it matters:** Poor navigation wastes user time, reduces productivity, and leads to system abandonment.

**Formula:**
```
Screens/Features accessible within N clicks / Total screens × 100
```

**UOM:** %  
**Intent:** Higher the better  
**Formula:** Direct — enter the %

| Test Scenario | Input | Expected KPI | Expected RAG |
|--------------|-------|--------------|--------------|
| Excellent UX | 92 | 92% | No RAG |
| Poor UX | 45 | 45% | No RAG |

---

---

# COMPLETE TESTING GUIDE

## How to Test Your Project End-to-End

### Step 1 — Login & Navigate to QPM
```
URL: http://localhost:5173
Login: pm1@deliverypulse.ai / Demo@12345
Go to: My Projects → [Your Project] → KPI Plan (QPM)
```

### Step 2 — Sheet 1: Set Up Your Plan
1. Set **Project Type** = Fresh Development
2. Set **Delivery Process Model** = Agile-Scrum
3. Set **Project Category** = Fixed Price
4. Click **★ Auto-add All Mandatory (M) Metrics** to add the required metrics at once
5. Click **Finalize Plan** when done

### Step 3 — Sheet 2: Enter Test Data

Go to: `[Project] → KPI Plan → KPI Measures — Data Entry`

Use **Period Name = `June 2026`** for all inputs.

---

#### RECOMMENDED TEST SET — 6 CORE METRICS

Test these 6 metrics to cover all RAG scenarios:

---

**TEST 1: Gross Margin % → Expected GREEN**
- Metric: Gross Margin %
- Input: `50`
- Expected KPI: 50% | Expected RAG: **GREEN** ✅

---

**TEST 2: Effort Variance → Expected AMBER**
- Metric: Effort Variance
- M1 (Actual Effort): `600`
- M2 (Remaining Effort): `500`
- M3 (Planned Effort): `1000`
- Expected KPI: 10% | Expected RAG: **AMBER** 🟡

---

**TEST 3: Effort Variance → Expected RED**
*(Use a different period name: `May 2026`)*
- M1: `700` | M2: `500` | M3: `1000`
- Expected KPI: 20% | Expected RAG: **RED** 🔴

---

**TEST 4: Unit Test Coverage % → Expected GREEN**
- M1 (UT Size): `80`
- M2 (Delivered Size): `100`
- Expected KPI: 80% | Expected RAG: **GREEN** ✅

---

**TEST 5: Customer Satisfaction Index → Expected AMBER**
- Input: `3.5`
- Expected KPI: 3.5 | Expected RAG: **AMBER** 🟡

---

**TEST 6: SLA Adherence % Resolution → Expected RED**
- M1 (Within SLA): `80`
- M2 (Total resolved): `100`
- Expected KPI: 80% | Expected RAG: **RED** 🔴 (below LSL 90)

---

### Step 4 — Sheet 3: Verify Tracker
Navigate to **KPI Tracker**. You should see:
- All 6 metrics with actual values
- RAG badges (GREEN/AMBER/RED)
- Measure values shown in the Measure 1–4 columns

### Step 5 — Sheet 4: Verify Summary Dashboard
Navigate to **KPI Summary**. You should see:
- Donut chart showing GREEN/AMBER/RED counts
- Category-level RAG bars
- Metric cards with trend arrows
- Overall project RAG computed from category aggregation

### Step 6 — Sheet 5: Document Info
Fill in project name, PM name, customer name, issue date, and add a version history entry.

### Step 7 — Submit Plan to DH
Back on Sheet 2, scroll to bottom → Set PM Perception RAG = GREEN → Click **Submit KPI Plan to Delivery Head**

### Step 8 — Review as Delivery Head
```
Login: rajesh.dh@deliverypulse.ai / Demo@12345
Go to: Governance Reviews → Find your project → QPM Review
Approve or Reject with comments
```

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "No metrics in plan" on Sheet 2 | Sheet 1 has no metrics | Go to Sheet 1 and add metrics first |
| KPI shows 0 even with inputs | Measure name mismatch | The system auto-fetches required measures — don't rename them |
| 500 error on second submission | Was a known bug | Fixed — duplicate entries now upserted |
| RAG shows null/— | No thresholds set for that metric | The catalog defaults auto-populate; if blank, edit the plan metric to add Target/LSL/USL |
| "Cannot submit — current status" | Plan already submitted | Must be DRAFT or REJECTED to submit |

---

## Compliance Codes

| Code | Meaning |
|------|---------|
| M | Mandatory — must be measured |
| O | Optional — measure if applicable |
| C | Conditional — based on project type |
| R | Recommended |

---

*File location: `docs/metric_explanation.md`*  
*Last updated: June 2026*
