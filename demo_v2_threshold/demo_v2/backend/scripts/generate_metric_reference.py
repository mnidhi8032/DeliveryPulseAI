"""
Generate METRIC_RAG_REFERENCE.md and METRIC_RAG_REFERENCE.csv

For each of the 83 metrics this shows:
  - What raw values to enter (input fields and what they mean)
  - Target / LSL / USL for reference
  - Plain-English GREEN / AMBER / RED conditions

Usage:  python scripts/generate_metric_reference.py
"""
from __future__ import annotations
import csv, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import text
from database.database import SessionLocal

DOCS_DIR = ROOT.parent / "docs"
DOCS_DIR.mkdir(exist_ok=True)
MD_FILE  = DOCS_DIR / "METRIC_RAG_REFERENCE.md"
CSV_FILE = DOCS_DIR / "METRIC_RAG_REFERENCE.csv"

# ── Per-metric input descriptions ─────────────────────────────────────────────
# Key = exact metric name from DB
# Value = list of input descriptions in order
# Metrics with a single direct value use ["Single value — enter the computed result directly"]
INPUTS: dict[str, list[str]] = {
    "% of Customer Rejected Candidates": [
        "Number of resources rejected by customer for a position",
        "Number of resource profiles qualified internally for the same position",
    ],
    "Defect Detection Efficiency %": [
        "Number of defects reported from testing",
        "Number of defects reported by customer or business",
    ],
    "Defect Leakage  %": [
        "Number of defects reported by customer or business",
        "Number of defects reported from testing",
    ],
    "Delivered Defect Density": [
        "Total Weighted Defects Leaked to Customer",
        "Delivered and Accepted Size",
    ],
    "First Time Fit  %": [
        "# of tickets resolved right first time",
        "# of tickets resolved",
    ],
    "First Time Fit  % - Enhancements": [
        "# of Enhancement tickets resolved right first time",
        "# of Enhancement tickets resolved",
    ],
    "First Time Fit  % - Incidents": [
        "# of Incident tickets resolved right first time",
        "# of Incident tickets resolved",
    ],
    "Regression Incident %": [
        "Number of Regression Incidents",
        "Total No of Incidents",
    ],
    "Availability %": ["Single value — enter the computed result directly"],
    "Billability%": ["Single value — enter the computed result directly"],
    "Code Review Delivery Rate": [
        "Effort spent for Code Review (person-hours)",
        "Total Size (size units)",
    ],
    "Coding Delivery Rate": [
        "Effort spent for Coding (person-hours)",
        "Total Size (size units)",
    ],
    "Cost per Fulfillment": ["Single value — enter the computed result directly"],
    "Cost Performance Index": [
        "Earned Value (EV)",
        "Actual Cost (AC)",
    ],
    "Design Delivery Rate": [
        "Effort spent for Design (person-hours)",
        "Total Size (size units)",
    ],
    "Effort Variance": [
        "Actual Effort for the Work till date (person-hours)",
        "Remaining Effort for completing the pending work (person-hours)",
        "Planned Effort (person-hours)",
    ],
    "Overall Delivery Rate": [
        "Total Actual Effort in Person-hours",
        "Delivered and Accepted Size",
    ],
    "Process Throughput": ["Single value — enter the computed result directly"],
    "Productivity": [
        "Delivered and Accepted Size",
        "Total Actual Effort in Person day",
    ],
    "Requirements Analysis Delivery Rate": [
        "Effort spent for Requirements Analysis (person-hours)",
        "Total Size (size units)",
    ],
    "Resource Utlization %": ["Single value — enter the computed result directly"],
    "Reuse Saving %": [
        "Actual Effort saving through Re-use (person-hours)",
        "Planned Effort (person-hours)",
    ],
    "Rework %": [
        "Rework Effort (person-hours)",
        "Total Effort (person-hours)",
    ],
    "Test Design Delivery Rate": [
        "Effort Spent for Test Design (person-hours)",
        "Total Size (size units)",
    ],
    "Test Design Productivity": [
        "Total Size (test cases / size units)",
        "Effort spent for Test Design in Person-days",
    ],
    "Test Design Review Delivery Rate": [
        "Effort Spent for Test Design Review (person-hours)",
        "Total Size (size units)",
    ],
    "Test Execution Delivery Rate": [
        "Effort Spent for Test Execution (person-hours)",
        "Total Size (size units)",
    ],
    "Test Execution Productivity": [
        "Total Size (test cases / size units)",
        "Effort spent for Test Execution in Person-days",
    ],
    "Average Resource Cost": ["Single value — enter the computed result directly"],
    "Gross Margin%": ["Single value — enter the computed result directly"],
    "Revenue per employee": ["Single value — enter the computed result directly"],
    "% of  Internally Rejected Candidates": [
        "Number of resources rejected internally for a position",
        "Number of resource profiles received for the same position",
    ],
    "First time Test Case Pass %": [
        "Number of Test Cases passed first time",
        "Number of test cases executed",
    ],
    "Percentage Code Review Effort": [
        "Effort spent on Code or Script Reviews (person-hours)",
        "Total Engineering Effort (person-hours)",
    ],
    "Percentage of valid defects %": [
        "Number of valid defects reported by testing team",
        "Total number of testing defects",
    ],
    "Process Health Index": ["Single value — enter the computed result directly"],
    "Review Coverage %": [
        "Size of code that is reviewed",
        "Delivered and Accepted Size",
    ],
    "Review Defect Density": [
        "Total weighted Review defects found",
        "Total Size reviewed",
    ],
    "Review Efficiency": [
        "Total weighted Review defects",
        "Review Effort in Person day",
    ],
    "Test Automation Rejection %": [
        "Number of automated Test script rejections",
        "Total no of automated Test Scripts",
    ],
    "Test Case per Size": [
        "Number of Test Cases",
        "Size Covered",
    ],
    "Test Efficiency": [
        "Total Weighted Defects Leaked to Customer",
        "Effort for Test Execution (person-days)",
    ],
    "Testing Defect Density": [
        "Total weighted defects from Testing",
        "Size Tested",
    ],
    "Total Defect Density": [
        "Total Weighted Defects Leaked to Customer",
        "Total Weighted defects from Internal testing",
        "Delivered and Accepted Size",
    ],
    "Unit Test Coverage %": [
        "Size of code that is unit tested",
        "Delivered and Accepted Size",
    ],
    "Cyclomatic Complexity": ["Single value — enter computed result from static analysis tool (e.g. SonarQube)"],
    "Technical Debt": ["Effort to fix all Code Smells (person-hours, from static analysis tool)"],
    "% of Screens meeting Response Time Target": [
        "Number of screens that met the Response Time Target",
        "Total number of screens in the application",
    ],
    "Application Throughput": [
        "Number of transactions handled",
        "Handling Time (unit of time)",
    ],
    "Ontime activation and deactivation %": ["Single value — enter the computed result directly"],
    "OWASP Compliance %": ["Single value — enter the computed result directly"],
    "Usability": ["Single value — enter the usability score % from testing"],
    "% of  unfulfilled Resource Requests": [
        "Number of resources not fulfilled as on date",
        "Number of resources requests raised",
    ],
    "Abandon Call rate": [
        "Number of Abandoned Calls",
        "Number of Incoming Calls",
    ],
    "Backlog Management Index": [
        "Number of tickets closed in a month",
        "Number of tickets reported in a month",
    ],
    "Billability % for Change Requests": [
        "Effort billed to customer towards Change Requests",
        "Effort spent for implementing Change Requests",
    ],
    "Change Impact %": [
        "Estimated or Actual Effort due to approved Change Requests",
        "Planned Effort",
    ],
    "Commitment to Delivery %": [
        "Delivered and Accepted Size",
        "Size of Items committed",
    ],
    "Requirements Change %": [
        "Number of Requirements changed after work start",
        "Total Number of Requirements",
    ],
    "Test Automation %": [
        "Number of test cases automated",
        "Total number of automatable test cases",
    ],
    "Test Coverage %": [
        "Number of test cases executed in a build or cycle",
        "Total number of Test cases planned for execution",
    ],
    "Customer Satisfaction Index": ["CSAT Score (e.g. 3.8 on a 5-point scale)"],
    "Average Resolution Time": ["Single value — enter directly (average hours or days to resolve)"],
    "Average Response Time": ["Single value — enter directly (average minutes or hours to respond)"],
    "Cycle Time": ["Single value — enter directly (hours or days per work item)"],
    "Ontime completion": [
        "# of items completed on time",
        "# items planned for completion",
    ],
    "Release Delay %": [
        "Number of Sprints planned for release scope",
        "Actual Number of sprints completed",
        "Expected number of sprints required for remaining Release Scope",
    ],
    "Schedule Performance Index": [
        "Earned Value (EV)",
        "Planned Value (PV)",
    ],
    "Schedule Variance": [
        "Actual End Date",
        "Planned End Date",
        "Planned Start Date",
    ],
    "SLA Adherance % -  Resolution": ["Single value — enter directly"],
    "SLA Adherance % - Response": ["Single value — enter directly"],
    "SLA Adherance % - P1 Resolution": [
        "# of P1 tickets resolved within SLA",
        "# of P1 tickets resolved",
    ],
    "SLA Adherance % - P1 Response": [
        "# of P1 tickets responded within SLA",
        "# of P1 tickets responded",
    ],
    "SLA Adherance % - P2 Resolution": [
        "# of P2 tickets resolved within SLA",
        "# of P2 tickets resolved",
    ],
    "SLA Adherance % - P2 Response": [
        "# of P2 tickets responded within SLA",
        "# of P2 tickets responded",
    ],
    "SLA Adherance % - P3 Resolution": [
        "# of P3 tickets resolved within SLA",
        "# of P3 tickets resolved",
    ],
    "SLA Adherance % - P3 Response": [
        "# of P3 tickets responded within SLA",
        "# of P3 tickets responded",
    ],
    "SLA Adherance % - P4 Resolution": [
        "# of P4 tickets resolved within SLA",
        "# of P4 tickets resolved",
    ],
    "SLA Adherance % - P4 Response": [
        "# of P4 tickets responded within SLA",
        "# of P4 tickets responded",
    ],
    "SLA Adherance % - P5 Resolution": [
        "# of P5 tickets resolved within SLA",
        "# of P5 tickets resolved",
    ],
    "SLA Adherance % - P5 Response": [
        "# of P5 tickets responded within SLA",
        "# of P5 tickets responded",
    ],
    "SLA Adherance % -  Resolution for Enhancements": [
        "# of Enhancement tickets resolved within SLA",
        "# of Enhancement tickets resolved",
    ],
    "SLA Adherance % -  Resolution for Incidents": [
        "# of Incident tickets resolved within SLA",
        "# of Incident tickets resolved",
    ],
    "SLA Adherance % Resolution for Enhancements P2": [
        "# of P2 Enhancement tickets resolved within SLA",
        "# of P2 Enhancement tickets resolved",
    ],
    "SLA Adherance % Resolution for Enhancements P3": [
        "# of P3 Enhancement tickets resolved within SLA",
        "# of P3 Enhancement tickets resolved",
    ],
    "SLA Adherance % Resolution for Enhancements P4": [
        "# of P4 Enhancement tickets resolved within SLA",
        "# of P4 Enhancement tickets resolved",
    ],
    "SLA Adherance % Resolution for Incidents P2": [
        "# of P2 Incident tickets resolved within SLA",
        "# of P2 Incident tickets resolved",
    ],
    "SLA Adherance % Resolution for Incidents P3": [
        "# of P3 Incident tickets resolved within SLA",
        "# of P3 Incident tickets resolved",
    ],
    "SLA Adherance % Resolution for Incidents P4": [
        "# of P4 Incident tickets resolved within SLA",
        "# of P4 Incident tickets resolved",
    ],
    "Time to Fill Requisition": ["Single value — enter directly (days taken to fill position)"],
    "Time to Market": ["Single value — enter directly (calendar days per 100 size units)"],
    "Velocity": ["Story Points delivered and accepted per Sprint"],
    "WIP": ["The sum of all WIP items currently in progress"],
}


# ── Suggested thresholds for metrics with no catalog values ───────────────────
# Format: metric_name -> (target, lsl, usl, source)
# source: "catalog" | "suggested" | "project-specific"
# "—" means not applicable for that metric's intent
THRESHOLDS: dict[str, tuple] = {
    # Delivered Quality
    "% of Customer Rejected Candidates":       (5,     "—",  10,    "suggested"),
    "Delivered Defect Density":                (1,     "—",  3,     "suggested"),
    # Efficiency
    "Availability %":                          (99.50, 99,   "—",   "suggested"),
    "Code Review Delivery Rate":               (0.50,  0.30, 0.80,  "suggested"),
    "Coding Delivery Rate":                    (0.80,  0.50, 1.50,  "suggested"),
    "Cost per Fulfillment":                    ("PM sets", "—", "—", "project-specific"),
    "Cost Performance Index":                  (1,     0.90, 1.10,  "suggested"),
    "Design Delivery Rate":                    (0.60,  0.40, 1,     "suggested"),
    "Overall Delivery Rate":                   (1,     "—",  1.50,  "suggested"),
    "Process Throughput":                      ("PM sets", "—", "—", "project-specific"),
    "Productivity":                            ("PM sets", "—", "—", "project-specific"),
    "Requirements Analysis Delivery Rate":     (0.40,  0.20, 0.70,  "suggested"),
    "Resource Utlization %":                   (85,    75,   "—",   "suggested"),
    "Reuse Saving %":                          (20,    10,   "—",   "suggested"),
    "Rework %":                                (5,     "—",  15,    "suggested"),
    "Test Design Delivery Rate":               (0.50,  0.30, 0.80,  "suggested"),
    "Test Design Productivity":                (5,     3,    "—",   "suggested"),
    "Test Design Review Delivery Rate":        (0.30,  0.20, 0.60,  "suggested"),
    "Test Execution Delivery Rate":            (0.30,  0.20, 0.50,  "suggested"),
    "Test Execution Productivity":             (10,    7,    "—",   "suggested"),
    # Financial
    "Average Resource Cost":                   ("PM sets", "—", "—", "project-specific"),
    "Revenue per employee":                    ("PM sets", "—", "—", "project-specific"),
    # Internal Quality
    "% of  Internally Rejected Candidates":   (5,     "—",  10,    "suggested"),
    "First time Test Case Pass %":             (90,    80,   "—",   "suggested"),
    "Percentage Code Review Effort":           (15,    10,   25,    "suggested"),
    "Review Coverage %":                       (90,    80,   "—",   "suggested"),
    "Review Defect Density":                   (2,     0.50, 5,     "suggested"),
    "Review Efficiency":                       (3,     1.50, "—",   "suggested"),
    "Test Case per Size":                      (5,     3,    "—",   "suggested"),
    "Test Efficiency":                         (2,     1,    "—",   "suggested"),
    "Testing Defect Density":                  (3,     1,    8,     "suggested"),
    "Total Defect Density":                    (2,     "—",  5,     "suggested"),
    # Non-functional
    "Cyclomatic Complexity":                   (10,    "—",  20,    "suggested"),
    "Technical Debt":                          ("PM sets", "—", "—", "project-specific"),
    "% of Screens meeting Response Time Target": (95,  90,   "—",   "suggested"),
    "Application Throughput":                  ("PM sets", "—", "—", "project-specific"),
    "Ontime activation and deactivation %":    (100,   95,   "—",   "suggested"),
    "OWASP Compliance %":                      (100,   95,   "—",   "suggested"),
    "Usability":                               (80,    70,   "—",   "suggested"),
    # Scope
    "% of  unfulfilled Resource Requests":    (5,     "—",  15,    "suggested"),
    "Abandon Call rate":                       (3,     "—",  8,     "suggested"),
    "Billability % for Change Requests":       (90,    80,   "—",   "suggested"),
    "Change Impact %":                         (10,    "—",  25,    "suggested"),
    "Requirements Change %":                   (10,    "—",  25,    "suggested"),
    # Time & Speed
    "Average Resolution Time":                 (4,     "—",  8,     "suggested"),
    "Average Response Time":                   (2,     "—",  5,     "suggested"),
    "Cycle Time":                              ("PM sets", "—", "—", "project-specific"),
    "Release Delay %":                         (0,     "—",  10,    "suggested"),
    "Schedule Performance Index":              (1,     0.90, 1.10,  "suggested"),
    "SLA Adherance % - P1 Response":           (100,   95,   "—",   "suggested"),
    "SLA Adherance % - P2 Response":           (98,    90,   "—",   "suggested"),
    "SLA Adherance % - P3 Response":           (95,    85,   "—",   "suggested"),
    "SLA Adherance % - P4 Response":           (90,    80,   "—",   "suggested"),
    "SLA Adherance % - P5 Response":           (85,    75,   "—",   "suggested"),
    "SLA Adherance % - Response":              (95,    85,   "—",   "suggested"),
    "Time to Fill Requisition":                (15,    "—",  30,    "suggested"),
    "Time to Market":                          ("PM sets", "—", "—", "project-specific"),
    "Velocity":                                ("PM sets", "—", "—", "project-specific"),
    "WIP":                                     ("PM sets", "—", "—", "project-specific"),
}


# ── RAG condition text builders ────────────────────────────────────────────────
def _fmt(v) -> str:
    if v == "—" or v is None:
        return "—"
    if v == "PM sets":
        return "PM sets per project"
    try:
        f = float(v)
        return str(int(f)) if f == int(f) else str(f)
    except (TypeError, ValueError):
        return str(v)


def _rag_text(intent: str, target, lsl, usl):
    t = _fmt(target)
    l = _fmt(lsl)
    u = _fmt(usl)
    no_t = t in ("—", "PM sets per project")

    if intent == "Higher the better":
        if no_t:
            return ("Actual meets or exceeds target", "Actual below target but not critical", "Actual significantly below target")
        green = f"Actual \u2265 {t}"
        if l != "—":
            amber = f"LSL ({l}) \u2264 Actual < Target ({t})"
            red   = f"Actual < {l} (below LSL)"
        else:
            amber = "Actual below target but not critical"
            red   = "Actual significantly below target"
        return (green, amber, red)

    elif intent == "Lower the better":
        if no_t:
            return ("Actual at or below target", "Actual above target but not critical", "Actual significantly above target")
        green = f"Actual \u2264 {t}"
        if u != "—":
            amber = f"Target ({t}) < Actual \u2264 USL ({u})"
            red   = f"Actual > {u} (above USL)"
        else:
            amber = "Actual above target but not critical"
            red   = "Actual significantly above target"
        return (green, amber, red)

    elif intent == "Within Limits":
        if l != "—" and u != "—":
            green = f"LSL ({l}) \u2264 Actual \u2264 USL ({u})"
            amber = "Not applicable \u2014 binary (within limits = GREEN, outside = RED)"
            red   = f"Actual < {l} or Actual > {u}"
        else:
            green = "Actual within defined limits"
            amber = "Not applicable"
            red   = "Actual outside defined limits"
        return (green, amber, red)

    elif intent in ("Nominal the best", "Nominal The Best"):
        if no_t:
            return ("Actual close to nominal target", "Actual outside 5% of target but within spec limits", "Actual far from nominal")
        green = f"Actual within 5% of Target ({t})"
        amber = f"Actual outside 5% of target but within spec limits"
        if l != "—" and u != "—":
            red = f"Actual > USL ({u}) or < LSL ({l})"
        elif u != "—":
            red = f"Actual > USL ({u})"
        elif l != "—":
            red = f"Actual < LSL ({l})"
        else:
            red = "Actual significantly away from target"
        return (green, amber, red)

    else:  # Not Applicable / unknown
        if no_t:
            return ("Actual meets target", "Actual within 10% of target", "Actual more than 10% away from target")
        green = f"Actual meets Target ({t})"
        amber = "Actual within 10% of target"
        red   = "Actual more than 10% away from target"
        return (green, amber, red)


def _format_inputs(name: str, inputs: list[str]) -> str:
    """Format input list into readable reference string."""
    if not inputs:
        return "Single value — enter the computed result directly"
    if len(inputs) == 1:
        return inputs[0]
    lines = []
    for i, inp in enumerate(inputs, 1):
        lines.append(f"[{i}] {inp}")
    return " → ".join(lines)


# ── Main generator ─────────────────────────────────────────────────────────────
def generate():
    with SessionLocal() as session:
        rows = session.execute(text("""
            SELECT category, name, uom, intent, frequency, compliance,
                   default_target, default_lsl, default_usl
            FROM   qpm_catalog_metrics
            WHERE  is_active = true
            ORDER  BY category, name
        """)).fetchall()

    print(f"Loaded {len(rows)} active metrics.")

    records = []
    for row in rows:
        cat, name, uom, intent, freq, comp, db_t, db_lsl, db_usl = row

        # Determine thresholds: catalog > suggested > project-specific
        if db_t is not None or db_lsl is not None or db_usl is not None:
            t   = float(db_t)   if db_t   is not None else "—"
            lsl = float(db_lsl) if db_lsl is not None else "—"
            usl = float(db_usl) if db_usl is not None else "—"
            source = "catalog"
        elif name in THRESHOLDS:
            t, lsl, usl, source = THRESHOLDS[name]
        else:
            t, lsl, usl, source = "PM sets", "—", "—", "project-specific"

        green, amber, red = _rag_text(intent or "", t, lsl, usl)

        inputs_list = INPUTS.get(name, [])
        input_str   = _format_inputs(name, inputs_list)

        compliance_label = "Mandatory" if comp == "M" else "Optional"

        records.append({
            "Category":        cat,
            "Metric Name":     name,
            "UOM":             uom or "—",
            "Intent":          intent or "—",
            "Frequency":       freq or "—",
            "Compliance":      compliance_label,
            "Target":          _fmt(t),
            "LSL":             _fmt(lsl),
            "USL":             _fmt(usl),
            "Threshold Source": source,
            "Input Values (what to enter)": input_str,
            "GREEN When":      green,
            "AMBER When":      amber,
            "RED When":        red,
        })

    return records


def write_markdown(records):
    lines = [
        "# DeliveryPulse AI \u2014 Metric RAG Reference",
        "",
        "> Auto-generated from `qpm_catalog_metrics` table.",
        "> Re-run `python scripts/generate_metric_reference.py` to refresh.",
        f"> Generated: 2026-07-02",
        "",
        "## RAG Logic Rules",
        "",
        "| Intent | GREEN | AMBER | RED |",
        "|--------|-------|-------|-----|",
        "| Higher is better | Actual \u2265 Target | LSL \u2264 Actual < Target | Actual < LSL |",
        "| Lower is better  | Actual \u2264 Target | Target < Actual \u2264 USL | Actual > USL |",
        "| Within Limits    | LSL \u2264 Actual \u2264 USL | N/A | Actual < LSL or > USL |",
        "| Nominal the best | Within 5% of Target | Outside 5% but within limits | < LSL or > USL |",
        "| No thresholds    | Meets target | Within 10% of target | >10% away from target |",
        "",
        "> **Note on Thresholds:** Columns marked *(suggested)* are industry-standard defaults.",
        "> They are for reference only \u2014 PM sets project-specific values during KPI Plan setup.",
        "> Columns with `\u2014` have no standard default and must always be set per project.",
        "",
        "---",
        "",
    ]

    # Group by category
    by_cat: dict[str, list] = {}
    for r in records:
        by_cat.setdefault(r["Category"], []).append(r)

    for cat, recs in by_cat.items():
        lines.append(f"## {cat}")
        lines.append("")
        lines.append("| Metric | UOM | Intent | Freq | Comp | Target | LSL | USL | Source | Input Values (what to enter) | GREEN when | AMBER when | RED when |")
        lines.append("|--------|-----|--------|------|------|--------|-----|-----|--------|------------------------------|-----------|-----------|---------|")
        for r in recs:
            src_icon = {"catalog": "\U0001f4cb catalog", "suggested": "\U0001f4a1 suggested", "project-specific": "\u2699\ufe0f project"}.get(r["Threshold Source"], r["Threshold Source"])
            lines.append(
                f"| {r['Metric Name']} | {r['UOM']} | {r['Intent']} | {r['Frequency']} | {r['Compliance']} "
                f"| {r['Target']} | {r['LSL']} | {r['USL']} | {src_icon} "
                f"| {r['Input Values (what to enter)']} "
                f"| {r['GREEN When']} | {r['AMBER When']} | {r['RED When']} |"
            )
        lines.append("")

    lines += [
        "---",
        "",
        "## Legend",
        "- \U0001f4cb **catalog** \u2014 threshold from the standard QPM catalog (authoritative)",
        "- \U0001f4a1 **suggested** \u2014 industry-standard default; PM should validate per project",
        "- \u2699\ufe0f **project-specific** \u2014 no standard exists; PM must set during KPI Plan setup",
        "",
        "*End of Metric RAG Reference*",
    ]

    MD_FILE.write_text("\n".join(lines), encoding="utf-8")
    print(f"\u2705 Markdown written  \u2192 {MD_FILE}")


def write_csv(records):
    fields = [
        "Category", "Metric Name", "UOM", "Intent", "Frequency", "Compliance",
        "Target", "LSL", "USL", "Threshold Source",
        "Input Values (what to enter)",
        "GREEN When", "AMBER When", "RED When",
    ]
    with open(CSV_FILE, "w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(records)
    print(f"\u2705 CSV written        \u2192 {CSV_FILE}")
    print(f"Total metrics documented: {len(records)}")


if __name__ == "__main__":
    data = generate()
    write_markdown(data)
    write_csv(data)
