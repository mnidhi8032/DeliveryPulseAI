# Spec 12 — PM Dashboard

**Status:** Implemented ✅  
**Version:** 1.0  
**Last Updated:** July 2026

---

## Overview

The PM Dashboard (`DashboardShellPage`) is the home page for Project Managers. It provides a personalised workspace showing project health at a glance, quick navigation links, and a project card grid.

**Route:** `/pm` (index)  
**Component:** `DashboardShellPage`  
**Theme:** Light purple — CSS variables with purple gradient hero

---

## Page Sections

### 1. Hero Banner

Full-width gradient banner (`#6c63ff → #9333ea`):
- "PM WORKSPACE" label (uppercase, subdued)
- Greeting: "Good [Morning/Afternoon/Evening], [First Name] 👋" (time-aware)
- Current date
- Amber alert badge: "X projects need attention" (shows only if AMBER + RED > 0)
- "+ New Project" button (white, links to `/pm/projects?create=1`)

---

### 2. Stat Cards (4 cards)

All stat cards are **clickable** — clicking opens a filtered project modal.

| Card | Color | Filter | Sub-label |
|---|---|---|---|
| Total Projects | Purple `#6c63ff` | All projects | "Assigned to you" |
| Green Health | Green `#22c55e` | `current_rag = GREEN` | "X of Y healthy" + percentage |
| Needs Attention | Orange `#f97316` | `current_rag = AMBER` or `RED` or `CRITICAL` | "X amber · Y red" |
| Awaiting Score | Blue `#3b82f6` | `current_rag = null` | "No metrics yet" |

Cards also link to `/pm/projects` for Total and Awaiting Score (both navigable).

---

### 3. Stat Card → Project Modal (PM-specific)

Each clickable stat card opens a modal overlay. PM modals differ from executive modals by including **two action buttons per project row**:

| Button | Style | Action |
|---|---|---|
| Summary | Outline (border, `var(--primary)` text) | Navigate to `/pm/projects/{id}/qpm/summary` |
| Data Entry | Solid purple (`#6c63ff` background, white text) | Navigate to `/pm/projects/{id}/qpm/entry` |

**Modal filter mapping:**
| Card clicked | Filter key | Projects shown |
|---|---|---|
| Total Projects | ALL | All PM's projects |
| Green Health | GREEN | `current_rag = GREEN` |
| Needs Attention | ATTENTION | `current_rag = AMBER / RED / CRITICAL` |
| Awaiting Score | NO_SCORE | `current_rag = null` |

**Modal design** (same as portfolio modals):
- Fixed overlay `rgba(0,0,0,0.45)`, modal max-width 640px
- Colored header bar matching stat card color
- Project count badge, title, ✕ close button
- Slide-up + fade-in animation
- Close on backdrop click or ✕

---

### 4. Quick Actions (2×2 grid)

Navigable shortcut cards:

| Action | Route | Icon Color |
|---|---|---|
| My Projects | `/pm/projects` | Purple |
| KPI Summary | `/pm/summary` | Green |
| Create Project | `/pm/projects?create=1` | Dark purple |
| Enter KPI Data | `/pm/projects/{first_project}/qpm/entry` | Orange |

Each card: icon + label + description + right arrow chevron. Hover: lifts + deeper shadow.

---

### 5. Portfolio Health Panel (right column)

Displayed alongside Quick Actions (3-column layout):
- Title: "Portfolio Health"
- Three horizontal bar rows: Green / Amber / Red/Critical — each shows count + percentage + colored bar
- Bottom row: "No Score" count
- Scrollable progress bars with smooth width transition (`0.7s`)

---

### 6. Your Projects Section

Full-width grid of Project Cards at the bottom.

**Project Card:**
- Top border: colored by RAG status
- Project code (monospace) + status badge
- Project name (bold, 2-line clamp)
- Account + BU names (with icons)
- Start → End date (if set)
- RAG badge (bottom-left)
- "View KPI →" text (bottom-right)

**Click:** Navigates to `/pm/projects/{id}/qpm/summary`

**Empty state:** "No projects yet" with Create First Project CTA button.

**Layout:**
- Loading: 3 shimmer skeletons
- Loaded: `grid-cols-2 xl:grid-cols-3` responsive grid
- "View all →" link to `/pm/projects`

---

## Project Creation from Dashboard

PMs can create a project directly from the dashboard via:
1. The "+ New Project" button in the hero banner → `/pm/projects?create=1`
2. The "Create Project" quick action card → `/pm/projects?create=1`

Both open the project creation form on the My Projects page.

---

## Data Loading

```typescript
useEffect(() => {
  listProjects()
    .then(data => setProjects(data.sort(...)))
    .catch(() => setError(true))
    .finally(() => setLoading(false));
}, []);
```

Single API call: `GET /api/v1/projects` (scoped to PM's projects by backend).  
No separate plan fetch on the dashboard — stat cards count from `current_rag` only.
