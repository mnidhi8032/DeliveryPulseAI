# DeliveryPulse AI — Project Health Scoring Engine Reference Guide

This document serves as the official operational reference and mathematical blueprint for the **DeliveryPulse AI Project Health Scoring Engine**. It is designed to explain the "what," "how," and "why" behind the platform's health scoring algorithms to PMOs, senior directors, and executive leadership.

---

## 1. Executive Summary: The Need for Objective Governance

Traditional enterprise project status reporting suffers from **watermelon greenwashing**—where projects are reported as healthy (Green) up until the moment of critical failure. PMs naturally introduce subjective bias to protect their projects.

DeliveryPulse AI solves this by introducing a **deterministic, multi-dimensional, database-configured scoring engine**. 
* PMs enter factual operational inputs (e.g. defect counts, progress percentages, spending).
* The engine normalizes, aggregates, and classifies these metrics using mathematically sound algorithms.
* The system is fully configurable via database settings, removing hard-coded formulas and allowing real-time tuning.

---

## 2. Core Mathematical Models & Formulas

To aggregate diverse operational metrics (e.g., dollars, defect counts, days, percentages), the engine converts raw values into a standardized, dimensionless range of **$0$ to $100$**. It relies on two primary models.

### Model A: Granular Step-Penalty Tiers
Used for integer counts (e.g. defects, incidents, delays) where risk increases in discrete intervals. Instead of coarse three-step status groupings, we use a granular **5-tier scale ($100$/$75$/$50$/$25$/$0$)** to prevent information loss.

* **Formula & Resolution:**  
  The engine loads a custom JSON configuration array from the database `metric_definitions` table:
  $$\text{Sub-score} = \text{Score associated with the first threshold bracket breached by actual value.}$$
* **Why this is used:** It provides clear, actionable "safety zones" that PMs can easily target, while preserving granularity (e.g., $1$ active critical defect scores $75$, while $4$ defects drop the score immediately to $0$).

### Model B: Directional Min-Max Normalization
Used for continuous percentages and days. Instead of absolute deviations, we apply **directional logic** so that positive progress or savings are not falsely penalized.

#### 1. Direction: `MORE_IS_BETTER` (e.g. Test Pass Rate, Resource Availability)
* **Goal:** Value should be as high as possible.
* **Formula:**
  $$\text{Sub-score} = \begin{cases} 
  100.0 & \text{if } A \ge T \\
  0.0 & \text{if } A \le F \\
  \left( 1 - \frac{T - A}{T - F} \right) \times 100 & \text{otherwise}
  \end{cases}$$
  Where $A$ is actual value, $T$ is Target, and $F$ is Fail Limit.
* **Why this is used:** Ensures that falling below the target causes a smooth, predictable linear decay in score, rather than a steep cliff-edge drop.

#### 2. Direction: `LESS_IS_BETTER` (e.g. Billing Delay Days)
* **Goal:** Value should be as low as possible.
* **Formula:**
  $$\text{Sub-score} = \begin{cases} 
  100.0 & \text{if } A \le T \\
  0.0 & \text{if } A \ge F \\
  \left( 1 - \frac{A - T}{F - T} \right) \times 100 & \text{otherwise}
  \end{cases}$$
* **Why this is used:** Directly penalizes excessive delays while rewarding teams that process invoices/milestones under the target threshold.

---

## 3. Asymmetric & High-Leverage Adjustments (The Business "Why")

Certain business dimensions require **asymmetric scaling** to protect organizational profitability and timeline integrity.

### 1. Asymmetric Budget Overrun Curve (`ASYMMETRIC_BUDGET`)
* **The Business Reality:** Spending less than the planned budget (under-spending) is generally safe, whereas over-running the planned budget is a critical risk that destroys profit margins.
* **The Formula:**
  $$\text{Sub-score} = \begin{cases} 
  100.0 & \text{if } U \le 85.0\% \\
  100.0 - (U - 85.0) \times 1.0 & \text{if } 85.0\% < U \le 100.0\% \\
  \max(0.0, 85.0 - (U - 100.0) \times 4.0) & \text{if } U > 100.0\%
  \end{cases}$$
  Where $U = (\text{Budget Used} / \text{Planned Budget}) \times 100$.
* **Why this is calibrated this way:** Under-spending up to $85\%$ of plan is fully buffered to account for waves of payments. However, once the budget exceeds $100\%$, a **steeper multiplier of $4.0$** is applied. A $15\%$ cost overrun instantly drops the score to **$25.0$** (Red), forcing financial PMO review.

### 2. Asymmetric Schedule Slippage Curve (`SCHEDULE_VARIANCE`)
* **The Business Reality:** Being ahead of schedule is positive, but over-accelerating can indicate resource over-allocation or quality shortcuts. Falling behind schedule, however, carries severe deadline breach risks.
* **The Formula:**
  $$\text{Sub-score} = \begin{cases} 
  \min(100.0, 80.0 + V \times 2.0) & \text{if } V \ge 0.0\% \\
  \max(0.0, 80.0 - |V| \times 4.0) & \text{if } V < 0.0\%
  \end{cases}$$
  Where $V = \text{Actual Progress} - \text{Planned Progress}$.
* **Why this is calibrated this way:** Delivering exactly on schedule ($V = 0\%$) earns a solid Green baseline score of **$80.0$** (the expected operational norm). Being ahead earns a mild bonus ($+2$ points per $1\%$ ahead), whereas falling behind is penalized aggressively ($-4$ points per $1\%$ behind). A $10\%$ schedule delay drops the score immediately to **$40.0$** (Red) to prompt Delivery Head intervention.

---

## 4. End-to-End Calculations: Three Practical Scenarios

Let's calculate the exact overall health scores under three different project scenarios to see the engine in action.

---

### Scenario 1: Highly Efficient "GREEN" Project

This project represents high operational efficiency, stable requirements, and on-time progress.

#### Raw PM Inputs:
* **Schedule:** Planned Progress = $70.0\%$, Actual Progress = $72.0\%$ (Ahead!), Dependency Delays = $0$
* **Quality:** Critical Defects = $0$, Test Pass Rate = $98.0\%$, Production Incidents = $0$
* **Scope:** Scope Change Requests = $0$, Requirement Stability = $95.0\%$
* **Finance:** Budget Used = \$80,000, Planned Budget = \$100,000 (Under-budget!), Billing Delay = $5$ days
* **People & Delivery:** Resource Availability = $95.0\%$, Team Attrition = $0$

#### Step 1: Metric Sub-score Normalization
* **Schedule Variance** ($V = +2\%$): $\min(100.0, 80.0 + 2 \times 2.0) = \mathbf{84.00}$
* **Progress Alignment:** $(70 + 72) / 2.0 = \mathbf{71.00}$
* **Dependency Delays** ($D = 0$): **$100.00$**
* **Critical Defects** ($0$): **$100.00$**
* **Test Pass Rate** ($98\% \ge 95\%$): **$100.00$**
* **Prod Incidents** ($0$): **$100.00$**
* **Scope Change Requests** ($0 \le 1$): **$100.00$**
* **Requirement Stability** ($95\% \ge 90\%$): **$100.00$**
* **Budget Utilization** (Utilization = $80\%$): Since $80\% \le 85\%$, it returns **$100.00$**
* **Billing Delay Days** ($5$ days $\le 7$ days target): **$100.00$**
* **Resource Availability** ($95\% \ge 90\%$): **$100.00$**
* **Team Attrition** ($0$): **$100.00$**

#### Step 2: Dimension Aggregations
* **Schedule Dimension Score:**
  $$\text{Schedule} = (0.40 \times 71.00) + (0.35 \times 84.00) + (0.25 \times 100.00) = 28.40 + 29.40 + 25.00 = \mathbf{82.80}$$
* **Quality Dimension Score:**
  $$\text{Quality} = (0.40 \times 100.00) + (0.35 \times 100.00) + (0.25 \times 100.00) = \mathbf{100.00}$$
* **Scope Dimension Score:**
  $$\text{Scope} = (0.50 \times 100.00) + (0.50 \times 100.00) = \mathbf{100.00}$$
* **Finance Dimension Score:**
  $$\text{Finance} = (0.50 \times 100.00) + (0.50 \times 100.00) = \mathbf{100.00}$$
* **People Dimension Score:**
  $$\text{People} = (0.55 \times 100.00) + (0.45 \times 100.00) = \mathbf{100.00}$$

#### Step 3: Overall Composite Score
Using standard dimension weights ($25\%$ Schedule, $25\%$ Quality, $15\%$ Scope, $20\%$ Finance, $15\%$ People):
$$\text{Overall Score} = (82.80 \times 0.25) + (100.0 \times 0.25) + (100.0 \times 0.15) + (100.0 \times 0.20) + (100.0 \times 0.15)$$
$$\text{Overall Score} = 20.70 + 25.00 + 15.00 + 20.00 + 15.00 = \mathbf{95.70}$$

* **Final Score:** **$95.70$**
* **RAG Status:** **GREEN** (Healthy execution)

---

### Scenario 2: Moderately Slipping "AMBER" Project

This project represents average operational execution with mild timeline delay and slightly rising costs.

#### Raw PM Inputs:
* **Schedule:** Planned Progress = $60.0\%$, Actual Progress = $54.0\%$ (Slipped $6\%$), Dependency Delays = $2$
* **Quality:** Critical Defects = $1$, Test Pass Rate = $90.0\%$, Production Incidents = $1$
* **Scope:** Scope Change Requests = $3$, Requirement Stability = $82.0\%$
* **Finance:** Budget Used = \$92,000, Planned Budget = \$100,000 (92% spend), Billing Delay = $12$ days
* **People & Delivery:** Resource Availability = $85.0\%$, Team Attrition = $1$

#### Step 1: Metric Sub-score Normalization
* **Schedule Variance** ($V = -6\%$): $80.0 - (6 \times 4.0) = \mathbf{56.00}$
* **Progress Alignment:** $(60 + 54) / 2.0 = \mathbf{57.00}$
* **Dependency Delays** ($D = 2$): **$70.00$**
* **Critical Defects** ($1$): **$75.00$**
* **Test Pass Rate** (Rate = $90\%$): Since $90 \ge 85$, it decays to **$70.00$**
* **Prod Incidents** ($1$): **$75.00$**
* **Scope Change Requests** ($3$): **$70.00$**
* **Requirement Stability** (Stability = $82\%$): Since $82 \ge 80$, it decays to **$75.00$**
* **Budget Utilization** (Utilization = $92\%$): $100.0 - (92.0 - 85.0) \times 1.0 = 100.0 - 7.0 = \mathbf{93.00}$
* **Billing Delay Days** ($12$ days $\le 15$ days bracket): **$75.00$**
* **Resource Availability** (Availability = $85\%$): Since $85 \ge 80$, it decays to **$75.00$**
* **Team Attrition** ($1$): **$80.00$**

#### Step 2: Dimension Aggregations
* **Schedule Dimension Score:**
  $$\text{Schedule} = (0.40 \times 57.00) + (0.35 \times 56.00) + (0.25 \times 70.00) = 22.80 + 19.60 + 17.50 = \mathbf{59.90}$$
* **Quality Dimension Score:**
  $$\text{Quality} = (0.40 \times 75.00) + (0.35 \times 70.00) + (0.25 \times 75.00) = 30.00 + 24.50 + 18.75 = \mathbf{73.25}$$
* **Scope Dimension Score:**
  $$\text{Scope} = (0.50 \times 70.00) + (0.50 \times 75.00) = 35.00 + 37.50 = \mathbf{72.50}$$
* **Finance Dimension Score:**
  $$\text{Finance} = (0.50 \times 93.00) + (0.50 \times 75.00) = 46.50 + 37.50 = \mathbf{84.00}$$
* **People Dimension Score:**
  $$\text{People} = (0.55 \times 75.00) + (0.45 \times 80.00) = 41.25 + 36.00 = \mathbf{77.25}$$

#### Step 3: Overall Composite Score
$$\text{Overall Score} = (59.90 \times 0.25) + (73.25 \times 0.25) + (72.50 \times 0.15) + (84.00 \times 0.20) + (77.25 \times 0.15)$$
$$\text{Overall Score} = 14.975 + 18.3125 + 10.875 + 16.80 + 11.5875 = \mathbf{72.55}$$

* **Final Score:** **$72.55$**
* **RAG Status:** **AMBER** (Moderate execution risk)

---

### Scenario 3: Failing "RED" Project (Triggering Cap Override)

This project has excellent timeline and financial metrics, but has experienced a severe drop in software quality and stability, leading to multiple outages.

#### Raw PM Inputs:
* **Schedule:** Planned Progress = $80.0\%$, Actual Progress = $80.0\%$ (Perfect schedule), Dependency Delays = $0$
* **Quality:** Critical Defects = **$5$** (Critical quality leak!), Test Pass Rate = **$60.0\%$**, Production Incidents = **$4$** (outages)
* **Scope:** Scope Change Requests = $0$, Requirement Stability = $98.0\%$
* **Finance:** Budget Used = \$90,000, Planned Budget = \$100,000, Billing Delay = $2$ days
* **People & Delivery:** Resource Availability = $95.0\%$, Team Attrition = $0$

#### Step 1: Metric Sub-score Normalization
* **Schedule Variance** ($V = 0\%$): **$80.00$**
* **Progress Alignment:** $(80 + 80) / 2.0 = \mathbf{80.00}$
* **Dependency Delays** ($0$): **$100.00$**
* **Critical Defects** ($5$ active defects $\ge 4$ fail limit): **$0.00$**
* **Test Pass Rate** ($60\% \le 70\%$ fail limit): **$0.00$**
* **Prod Incidents** ($4$ outages $\ge 4$ fail limit): **$10.00$**
* **Scope Change Requests** ($0$): **$100.00$**
* **Requirement Stability** ($98\%$): **$100.00$**
* **Budget Utilization** (Utilization = $90\%$): $100.0 - (90.0 - 85.0) \times 1.0 = \mathbf{95.00}$
* **Billing Delay Days** ($2$ days): **$100.00$**
* **Resource Availability** ($95\%$): **$100.00$**
* **Team Attrition** ($0$): **$100.00$**

#### Step 2: Dimension Aggregations
* **Schedule Dimension Score:**
  $$\text{Schedule} = (0.40 \times 80.00) + (0.35 \times 80.00) + (0.25 \times 100.00) = 32.00 + 28.00 + 25.00 = \mathbf{85.00} \quad \text{(GREEN)}$$
* **Quality Dimension Score (The Failure):**
  $$\text{Quality} = (0.40 \times 0.00) + (0.35 \times 0.00) + (0.25 \times 10.00) = 0.0 + 0.0 + 2.50 = \mathbf{2.50} \quad \text{(CRITICAL RED)}$$
* **Scope Dimension Score:**
  $$\text{Scope} = (0.50 \times 100.00) + (0.50 \times 100.00) = \mathbf{100.00} \quad \text{(GREEN)}$$
* **Finance Dimension Score:**
  $$\text{Finance} = (0.50 \times 95.00) + (0.50 \times 100.00) = 47.50 + 50.00 = \mathbf{97.50} \quad \text{(GREEN)}$$
* **People Dimension Score:**
  $$\text{People} = (0.55 \times 100.00) + (0.45 \times 100.00) = \mathbf{100.00} \quad \text{(GREEN)}$$

#### Step 3: Overall Composite Score (Before Cap)
$$\text{Standard Weighted Score} = (85.00 \times 0.25) + (2.50 \times 0.25) + (100.00 \times 0.15) + (97.50 \times 0.20) + (100.00 \times 0.15)$$
$$\text{Standard Weighted Score} = 21.25 + 0.625 + 15.00 + 19.50 + 15.00 = \mathbf{71.38}$$

* **Observation:** Without a safety override, this project would be scored as **$71.38$ (AMBER)**. An executive reviewing the portfolio would see a moderately healthy Amber project, completely unaware that the software is unstable, failing quality checks, and experiencing operational outages.

#### Step 4: Apply the RED Dimension Cap Override
* The **Quality** dimension scored **$2.50$** (which is strictly below the $50.0$ Red threshold).
* The **Red Dimension Cap Override** triggers:
  $$\text{Final Score} = \min(\text{Standard Weighted Score}, \text{RED\_DIMENSION\_CAP})$$
  $$\text{Final Score} = \min(71.38, 79.00) = 71.38$$
* **Final RAG Status:** **RED** (Escalated due to the critical Quality dimension failing below 50.0). Capping the overall score ensures that severe isolated risks are instantly flagged at the portfolio level, protecting the organization from "Watermelon" masking.
