"""Seed engagement_model_metric_mappings from the QPM Metrics Definition CSV.

Parses each metric's Project Type, Delivery Model, and Project Category columns
and creates a mapping row for each (engagement_item, catalog_metric) combination.

Safe to re-run — skips existing pairs.

Run from backend/:
    python scripts/seed_engagement_metric_mappings.py
"""
from __future__ import annotations
import sys, os, uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session
from app.core.settings import settings
from app.models.engagement_model_item import EngagementModelItem
from app.models.engagement_model_metric_mapping import EngagementModelMetricMapping
from app.models.qpm_catalog_metric import QPMCatalogMetric

# ---------------------------------------------------------------------------
# Source data parsed from OM-DEV-TM-71-QPM-Plan(MetricsDefinition).csv
# Each entry: (metric_name, [project_types], [delivery_models], [project_categories], compliance)
# compliance M = is_mandatory True, else False
# ---------------------------------------------------------------------------

ALL_TYPES = "Fresh Development,Testing,Infrastructure Management Services,Re-Engineering,Migration,Package Rollout,Package implementation,Production Support,Application Build,Helpdesk Services,Upgrade,Professional Services,Maintenance & Support"
ALL_MODELS = "Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,ITIL based Service Delivery,Traditional Maintenance & Support,Waterfall"
ALL_CATS   = "Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee,Cost-Plus"

def p(s): return [x.strip() for x in s.split(",") if x.strip()]

METRIC_MAPPINGS: list[tuple[str, list[str], list[str], list[str], str]] = [
    # (metric_name, project_types, delivery_models, project_categories, compliance)
    ("Gross Margin%",
     p(ALL_TYPES), p(ALL_MODELS), p(ALL_CATS), "M"),
    ("Revenue per employee",
     p(ALL_TYPES), p(ALL_MODELS + ",Staffing"), p(ALL_CATS), "M"),
    ("Average Resource Cost",
     p(ALL_TYPES), p(ALL_MODELS + ",Staffing"), p(ALL_CATS), "M"),
    ("Resource Utlization %",
     p(ALL_TYPES), p(ALL_MODELS),
     p("Time & Material,Fixed Capacity,Cost-Plus"), "O"),
    ("Billability%",
     p(ALL_TYPES), p(ALL_MODELS),
     p("Time & Material,Fixed Capacity,Cost-Plus"), "O"),
    ("Customer Satisfaction Index",
     p(ALL_TYPES), p(ALL_MODELS), p(ALL_CATS), "M"),
    ("Process Health Index",
     p(ALL_TYPES), p(ALL_MODELS), p(ALL_CATS), "O"),
    ("Effort Variance",
     p("Fresh Development,Testing,Re-Engineering,Migration,Package Rollout,Package implementation,Production Support,Application Build,Helpdesk Services,Upgrade,Professional Services,Maintenance & Support"),
     p("Waterfall,Iterative,Incremental,Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Agile-Scrum"),
     p("Fixed Price,Time & Material With Cap"), "M"),
    ("Schedule Variance",
     p("Fresh Development,Testing,Re-Engineering,Migration,Package Rollout,Package implementation,Production Support,Application Build,Helpdesk Services,Upgrade,Professional Services,Maintenance & Support"),
     p("Waterfall,Iterative,Incremental,Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support"),
     p("Fixed Price,Time & Material With Cap"), "M"),
]

METRIC_MAPPINGS += [
    ("Delivered Defect Density",
     p("Fresh Development,Re-Engineering,Migration,Custom Enhancements,Package implementation,Upgrade,Maintenance & Support"),
     p("Waterfall,Iterative,Incremental,Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Agile-Scrum,Agile-Kanban,Agile Sure Step"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "M"),
    ("Total Defect Density",
     p("Fresh Development,Re-Engineering,Migration,Custom Enhancements,Package implementation,Upgrade"),
     p("Waterfall,Iterative,Incremental,Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Agile-Scrum,Agile-Kanban,Agile Sure Step"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("% of Screens meeting Response Time Target",
     p("Fresh Development,Re-Engineering,Migration,Custom Enhancements,Package implementation,Upgrade"),
     p("Waterfall,Iterative,Incremental,Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Agile-Scrum,Agile-Kanban,Agile Sure Step"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Application Throughput",
     p("Fresh Development,Testing,Re-Engineering,Migration,Custom Enhancements,Package implementation,Upgrade,Maintenance & Support"),
     p("Waterfall,Iterative,Incremental,Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Agile-Scrum,Agile-Kanban,Agile Sure Step"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("OWASP Compliance %",
     p("Fresh Development,Maintenance,Testing,Re-Engineering,Migration,Custom Enhancements,Package implementation,Upgrade"),
     p("Waterfall,Iterative,Incremental,Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Agile-Scrum,Agile-Kanban,Agile Sure Step"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Ontime activation and deactivation %",
     p("Fresh Development,Maintenance & Support,Testing,Infrastructure Management Services,Re-Engineering,Migration,Package Rollout,Package implementation,Production Support,Application Build,Helpdesk Services,Upgrade,Professional Services"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,ITIL based Service Delivery,Traditional Maintenance & Support,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Usability",
     p("Fresh Development,Maintenance & Support,Testing,Re-Engineering,Migration,Custom Enhancements,Package implementation,Upgrade"),
     p("Waterfall,Iterative,Incremental,Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Agile-Scrum,Agile-Kanban,Agile Sure Step"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Technical Debt",
     p("Fresh Development,Maintenance & Support,Testing,Re-Engineering,Migration,Custom Enhancements,Package implementation,Upgrade"),
     p("Waterfall,Iterative,Incremental,Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Agile-Scrum,Agile-Kanban,Agile Sure Step"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Cyclomatic Complexity",
     p("Fresh Development,Maintenance & Support,Testing,Re-Engineering,Migration,Custom Enhancements,Package implementation,Upgrade"),
     p("Waterfall,Iterative,Incremental,Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Agile-Scrum,Agile-Kanban,Agile Sure Step"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
]

METRIC_MAPPINGS += [
    ("Productivity",
     p("Fresh Development,Testing,Re-Engineering,Migration,Package implementation,Upgrade,Maintenance & Support"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Waterfall,ITIL based Service Delivery"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "M"),
    ("Overall Delivery Rate",
     p("Fresh Development,Testing,Re-Engineering,Migration,Package implementation,Upgrade,Maintenance & Support"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Waterfall,ITIL based Service Delivery"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "M"),
    ("Time to Market",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Rework %",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Reuse Saving %",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration,Maintenance"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Requirements Change %",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Waterfall"),
     p("Fixed Price,Time & Material With Cap"), "O"),
    ("Change Impact %",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Waterfall"),
     p("Fixed Price,Time & Material With Cap"), "O"),
    ("Schedule Performance Index",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration,Maintenance"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Waterfall"),
     p("Fixed Price,Time & Material With Cap"), "O"),
    ("Cost Performance Index",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration,Maintenance"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Waterfall"),
     p("Fixed Price,Time & Material With Cap"), "O"),
    ("Billability % for Change Requests",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration,Maintenance & Support"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Waterfall"),
     p("Fixed Price,Time & Material With Cap"), "M"),
]

METRIC_MAPPINGS += [
    ("Percentage Code Review Effort",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration,Maintenance & Support"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Review Efficiency",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration,Maintenance & Support"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Test Efficiency",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration,Maintenance & Support"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Unit Test Coverage %",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Maintenance & Support"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Review Coverage %",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Maintenance & Support"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Test Case per Size",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration,Maintenance & Support"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Review Defect Density",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration,Maintenance & Support"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "M"),
    ("Testing Defect Density",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration,Maintenance & Support"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "M"),
    ("First time Test Case Pass %",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration,Maintenance & Support"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
]

METRIC_MAPPINGS += [
    # Sub-process delivery rates
    ("Requirements Analysis Delivery Rate",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration,Maintenance & Support,Testing"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Design Delivery Rate",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration,Maintenance & Support"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Coding Delivery Rate",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration,Maintenance & Support"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Code Review Delivery Rate",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration,Maintenance & Support"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "M"),
    ("Test Design Delivery Rate",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration,Maintenance & Support,Testing"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Test Design Review Delivery Rate",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration,Maintenance & Support,Testing"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "M"),
    ("Test Execution Delivery Rate",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration,Maintenance & Support,Testing"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Sure Step,Agile Sure Step,ASAP,Oracle AIM,Traditional Maintenance & Support,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    # Agile-specific
    ("Velocity",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration,Maintenance & Support"),
     p("Agile-Scrum,Agile Sure Step"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "M"),
    ("Commitment to Delivery %",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration,Maintenance & Support"),
     p("Agile-Scrum,Agile Sure Step"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "M"),
    ("Release Delay %",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Upgrade,Migration,Maintenance & Support"),
     p("Agile-Scrum,Agile Sure Step"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
]

METRIC_MAPPINGS += [
    # Kanban-specific
    ("WIP",
     p("Fresh Development,Maintenance & Support,Re-Engineering"),
     p("Agile-Kanban"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "M"),
    ("Process Throughput",
     p("Fresh Development,Maintenance & Support,Re-Engineering"),
     p("Agile-Kanban"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "M"),
    ("Cycle Time",
     p("Fresh Development,Maintenance & Support,Re-Engineering"),
     p("Agile-Kanban"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "M"),
    # ITIL / Service delivery
    ("SLA Adherance % -  Resolution",
     p("Maintenance & Support,Infrastructure Management Services,Production Support,Application Build,Helpdesk Services"),
     p("ITIL based Service Delivery,Traditional Maintenance & Support"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "M"),
    ("SLA Adherance % - P1 Resolution",
     p("Maintenance & Support,Infrastructure Management Services,Production Support,Application Build,Helpdesk Services"),
     p("ITIL based Service Delivery,Traditional Maintenance & Support"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("SLA Adherance % - P2 Resolution",
     p("Maintenance & Support,Infrastructure Management Services,Production Support,Application Build,Helpdesk Services"),
     p("ITIL based Service Delivery,Traditional Maintenance & Support"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("SLA Adherance % - P3 Resolution",
     p("Maintenance & Support,Infrastructure Management Services,Production Support,Application Build,Helpdesk Services"),
     p("ITIL based Service Delivery,Traditional Maintenance & Support"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("SLA Adherance % - P4 Resolution",
     p("Maintenance & Support,Infrastructure Management Services,Production Support,Application Build,Helpdesk Services"),
     p("ITIL based Service Delivery,Traditional Maintenance & Support"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("SLA Adherance % - P5 Resolution",
     p("Maintenance & Support,Infrastructure Management Services,Production Support,Application Build,Helpdesk Services"),
     p("ITIL based Service Delivery,Traditional Maintenance & Support"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("SLA Adherance % - Response",
     p("Maintenance & Support,Infrastructure Management Services,Production Support,Application Build,Helpdesk Services"),
     p("ITIL based Service Delivery,Traditional Maintenance & Support"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "M"),
    ("SLA Adherance % - P1 Response",
     p("Maintenance & Support,Infrastructure Management Services,Production Support,Application Build,Helpdesk Services"),
     p("ITIL based Service Delivery,Traditional Maintenance & Support"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("SLA Adherance % - P2 Response",
     p("Maintenance & Support,Infrastructure Management Services,Production Support,Application Build,Helpdesk Services"),
     p("ITIL based Service Delivery,Traditional Maintenance & Support"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("SLA Adherance % - P3 Response",
     p("Maintenance & Support,Infrastructure Management Services,Production Support,Application Build,Helpdesk Services"),
     p("ITIL based Service Delivery,Traditional Maintenance & Support"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("SLA Adherance % - P4 Response",
     p("Maintenance & Support,Infrastructure Management Services,Production Support,Application Build,Helpdesk Services"),
     p("ITIL based Service Delivery,Traditional Maintenance & Support"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("SLA Adherance % - P5 Response",
     p("Maintenance & Support,Infrastructure Management Services,Production Support,Application Build,Helpdesk Services"),
     p("ITIL based Service Delivery,Traditional Maintenance & Support"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("First Time Fit  %",
     p("Maintenance & Support,Infrastructure Management Services,Production Support,Application Build,Helpdesk Services"),
     p("ITIL based Service Delivery,Traditional Maintenance & Support"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "M"),
    ("Backlog Management Index",
     p("Maintenance & Support,Infrastructure Management Services,Production Support,Application Build,Helpdesk Services"),
     p("ITIL based Service Delivery,Traditional Maintenance & Support"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Ontime completion",
     p("Maintenance & Support,Infrastructure Management Services,Production Support,Application Build,Helpdesk Services"),
     p("Traditional Maintenance & Support,Waterfall,Iterative,Sure Step,Incremental"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Average Resolution Time",
     p("Infrastructure Management Services,Production Support,Helpdesk Services"),
     p("ITIL based Service Delivery,Traditional Maintenance & Support"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Average Response Time",
     p("Infrastructure Management Services,Production Support,Helpdesk Services"),
     p("ITIL based Service Delivery,Traditional Maintenance & Support"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Availability %",
     p("Infrastructure Management Services,Production Support,Helpdesk Services"),
     p("ITIL based Service Delivery,Traditional Maintenance & Support"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Abandon Call rate",
     p("Infrastructure Management Services,Production Support,Helpdesk Services,Application Build"),
     p("ITIL based Service Delivery,Traditional Maintenance & Support"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
]

METRIC_MAPPINGS += [
    # Testing-specific
    ("Test Design Productivity",
     p("Testing"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "M"),
    ("Test Execution Productivity",
     p("Testing"),
     p("Iterative,Incremental,Agile-Scrum,Agile-Kanban,Waterfall"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "M"),
    ("Test Coverage %",
     p("Fresh Development,Testing,Re-Engineering,Custom Enhancements,Package implementation"),
     p("Waterfall,Iterative,Incremental,Agile-Scrum,Agile Sure Step"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Test Automation %",
     p("Fresh Development,Testing,Re-Engineering,Custom Enhancements,Package implementation"),
     p("Waterfall,Iterative,Incremental,Agile-Scrum,Agile Sure Step"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Percentage of valid defects %",
     p("Fresh Development,Testing,Re-Engineering,Custom Enhancements,Package implementation"),
     p("Waterfall,Iterative,Incremental,Agile-Scrum,Agile Sure Step"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "M"),
    ("Test Automation Rejection %",
     p("Fresh Development,Testing,Re-Engineering,Custom Enhancements,Package implementation"),
     p("Waterfall,Iterative,Incremental,Agile-Scrum,Agile Sure Step"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "O"),
    ("Defect Leakage  %",
     p("Fresh Development,Testing,Re-Engineering,Custom Enhancements,Package implementation"),
     p("Waterfall,Iterative,Incremental,Agile-Scrum,Agile Sure Step,Sure Step,ASAP,Oracle AIM"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "M"),
    ("Defect Detection Efficiency %",
     p("Fresh Development,Testing,Re-Engineering,Custom Enhancements,Package implementation"),
     p("Waterfall,Iterative,Incremental,Agile-Scrum,Agile Sure Step,Sure Step,ASAP,Oracle AIM"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "M"),
    ("Regression Incident %",
     p("Fresh Development,Re-Engineering,Custom Enhancements,Package implementation,Production Support,Migration,Maintenance,Upgrade,Infrastructure Management Services"),
     p("Waterfall,Iterative,Incremental,Agile-Scrum,Agile Sure Step,Sure Step,ASAP,Oracle AIM"),
     p("Fixed Price,Time & Material With Cap,Time & Material,Fixed Capacity,Outcome based Fee"), "M"),
    # Staffing-specific
    ("Time to Fill Requisition",
     p("Professional Services"),
     p("Staffing"),
     p("Time & Material,Fixed Capacity"), "M"),
    ("% of  unfulfilled Resource Requests",
     p("Professional Services"),
     p("Staffing"),
     p("Time & Material,Fixed Capacity"), "M"),
    ("Cost per Fulfillment",
     p("Professional Services"),
     p("Staffing"),
     p("Time & Material,Fixed Capacity"), "M"),
    ("% of Customer Rejected Candidates",
     p("Professional Services"),
     p("Staffing"),
     p("Time & Material,Fixed Capacity"), "M"),
    ("% of  Internally Rejected Candidates",
     p("Professional Services"),
     p("Staffing"),
     p("Time & Material,Fixed Capacity"), "M"),
]


# ---------------------------------------------------------------------------
# Seeding engine
# ---------------------------------------------------------------------------

def seed(session: Session) -> None:
    now = datetime.now(timezone.utc)
    inserted = 0
    skipped_missing_item = 0
    skipped_missing_metric = 0
    skipped_existing = 0

    # Build lookup caches
    all_items = session.execute(select(EngagementModelItem)).scalars().all()
    item_lookup: dict[tuple[str, str], str] = {}
    for item in all_items:
        item_lookup[(item.item_type, item.value)] = str(item.id)

    all_metrics_rows = session.execute(
        text("SELECT id::text, name FROM qpm_catalog_metrics")
    ).fetchall()
    metric_lookup: dict[str, str] = {r[1]: r[0] for r in all_metrics_rows}

    existing = session.execute(
        select(EngagementModelMetricMapping.engagement_item_id,
               EngagementModelMetricMapping.catalog_metric_id)
    ).fetchall()
    existing_set: set[tuple[str, str]] = {
        (str(r[0]), str(r[1])) for r in existing
    }

    TYPE_MAP = {
        "project_types":     "PROJECT_TYPE",
        "delivery_models":   "DELIVERY_MODEL",
        "project_categories": "PROJECT_CATEGORY",
    }

    for metric_name, project_types, delivery_models, project_categories, compliance in METRIC_MAPPINGS:
        metric_id = metric_lookup.get(metric_name)
        if not metric_id:
            print(f"  ⚠  Metric not found in catalog: {metric_name!r}")
            skipped_missing_metric += 1
            continue

        is_mandatory = (compliance == "M")

        for item_type_key, values in [
            ("PROJECT_TYPE", project_types),
            ("DELIVERY_MODEL", delivery_models),
            ("PROJECT_CATEGORY", project_categories),
        ]:
            for value in values:
                item_id = item_lookup.get((item_type_key, value))
                if not item_id:
                    skipped_missing_item += 1
                    continue
                pair = (item_id, metric_id)
                if pair in existing_set:
                    skipped_existing += 1
                    continue
                session.add(EngagementModelMetricMapping(
                    id=uuid.uuid4(),
                    engagement_item_id=uuid.UUID(item_id),
                    catalog_metric_id=uuid.UUID(metric_id),
                    is_mandatory=is_mandatory,
                    created_at=now,
                ))
                existing_set.add(pair)
                inserted += 1

    session.commit()

    print(f"\n{'='*60}")
    print(f"  Inserted           : {inserted}")
    print(f"  Skipped (existing) : {skipped_existing}")
    print(f"  Skipped (no item)  : {skipped_missing_item}")
    print(f"  Skipped (no metric): {skipped_missing_metric}")
    print(f"{'='*60}")


if __name__ == "__main__":
    engine = create_engine(settings.sqlalchemy_database_uri)
    with Session(engine) as session:
        print("Seeding engagement model metric mappings from CSV data…")
        seed(session)
