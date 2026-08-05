# Spec 17 — Back Navigation Consistency

**Status:** Implemented ✅
**Priority:** Medium
**Created:** July 2026
**Revised:** July 2026 — full re-audit against actual file content; all 5 action items completed

---

## 1. Purpose

Every drill-in page — any page reached by clicking into a specific
project, review, or document — must offer an explicit in-app way back.
Enterprise users arrive at pages via notifications, direct links, and
bookmarks, not just by clicking through the app sequentially. Relying
solely on the browser back button is not acceptable in a production
governance tool: it fails on refresh, breaks on direct-link arrival,
and is invisible on mobile.

The existing pattern in this codebase is a small `← Label` link at the
top-left of the page content area. Fifteen pages already do this. This
spec documents the current state accurately, identifies the one real
gap, fixes one broken link, and proposes a shared component so future
pages don't each hand-code their own variation.

---

## 2. Complete Audit (verified against file contents — July 2026)

### 2.1 Sidebar-accessible top-level pages — no back link needed

These are reachable directly from the sidebar nav. They are destinations, not drill-ins.

| Page | Route | Sidebar role |
|---|---|---|
| DashboardShellPage | `/pm` (index) | PM |
| PMProjectsPage | `/pm/projects` | PM |
| PMSummaryPage | `/pm/summary` | PM |
| PMAllActionsPage | `/pm/actions` | PM |
| DMDashboardPage | `/delivery-manager` (index) | DM |
| DMActionItemsPage | `/delivery-manager/actions` | DM |
| DeliveryHeadDashboardPage | `/delivery-head` (index) | DH |
| DeliveryHeadProjectsPage | `/delivery-head/projects` | DH |
| PortfolioDashboardPage | `/platform`, `/ceo`, `/delivery-excellence` (index) | Platform Admin, CEO, DE |
| PlatformAdminBusinessUnitsPage | `/platform/business-units` | Platform Admin |
| PlatformAdminReportsPage | `/platform/reports`, `/ceo/reports` | Platform Admin, CEO |
| PlatformAdminSettingsPage | `/platform/settings` | Platform Admin |
| DECatalogPage | `/delivery-excellence/catalog` | DE |
| CEOBusinessUnitsPage | `/ceo/business-units` | CEO |
| CEOProjectsPage | `/ceo/projects` | CEO |

### 2.2 Drill-in pages — back nav verified present ✅

All of these already have a working `← Label` link or breadcrumb. No fix needed.

| Page | Route | Back nav implemented |
|---|---|---|
| DMProjectReviewPage | `/delivery-manager/projects/:id/review` | `← Dashboard` → `/delivery-manager` |
| DHProjectSummaryPage | `/delivery-head/projects/:id/summary` | Breadcrumb: `Dashboard / Projects / {name}` |
| DHProjectTimelinePage | `/delivery-head/projects/:id/timeline` | Back button (navigate -1 or fixed) |
| PlatformAdminBUAnalysisPage | `/platform/bu/:id` | `← Business Units` → `/platform/business-units` |
| ProjectSummaryReadOnlyPage | `*/projects/:id/summary` (3 roles) | `← Portfolio Dashboard` role-aware (`/platform`, `/ceo`, `/delivery-excellence`) |
| CEOBUDetailPage | `/ceo/business-units/:id` | `← Back to Business Units` |
| QPMPlanPage | `/pm/projects/:id/qpm` | `← Back to project` → `/pm/projects/:id` ⚠️ see 2.3 |
| QPMDataEntryPage | `/pm/projects/:id/qpm/entry` | `← Back to My Projects` → `/pm/projects` |
| QPMTrackerPage | `/pm/projects/:id/qpm/tracker` | Links back to Data Entry |
| QPMDocInfoPage | `/pm/projects/:id/qpm/doc-info` | `← KPI Plan` → `/pm/projects/:id/qpm` |
| PMSubmissionPage | `/pm/projects/:id/submissions/:submissionId` | `← Back to project` → `/pm/projects/:id` ⚠️ see 2.3 |
| ActionItemsPage | `/pm/projects/:id/actions` | `← Back to project` → `/pm/projects/:id` ⚠️ see 2.3 |
| ProjectPhasesPage | `/pm/projects/:id/phases` | `← Back to project` → `/pm/projects/:id` ⚠️ see 2.3 |
| ProjectHealthTimelinePage | `*/projects/:id/timeline` | Back navigation present |

### 2.3 Bug — back links point to an unrouted page ⚠️

`QPMPlanPage`, `PMSubmissionPage`, `ActionItemsPage`, and `ProjectPhasesPage` all link back to `/pm/projects/:projectId`. But `/pm/projects/:projectId` is **not registered** in `AppRoutes.tsx`. The file `PMProjectDetailPage.tsx` exists but has no route.

What actually happens today when a user clicks these back links: React Router renders the `*` route (NotFoundPage). The user gets a 404 instead of going back to their project.

**Fix:** Change all four back links from `/pm/projects/${projectId}` to `/pm/projects` (the My Projects list, which IS routed). This is the correct fallback in a governance tool — returning to the project list is the expected enterprise behaviour when a dedicated project detail page doesn't exist yet.

### 2.4 Real gap — QPMSummaryPage missing back-to-projects link ❌

`QPMSummaryPage` (`/pm/projects/:id/qpm/summary`) has a `← Back to Data Entry` link which is correct for sequential navigation. However it has no way to get back to the **project list** — the only options are back to Data Entry or to the PM Dashboard. An enterprise user who deep-links into a summary page from a notification has no way to reach their projects list without going via the sidebar.

**Fix:** Add a secondary `← My Projects` link alongside the existing `← Back to Data Entry`. Two navigation anchors at different levels is standard enterprise pattern (e.g. SAP, Salesforce, Jira all do this).

---

## 3. The Shared Component — consolidation

Fifteen pages already have working back links but each hand-writes its own version. Styles are slightly inconsistent (some use `Link`, some use `button + navigate`, different classNames). This is the right time to consolidate them into one component before the inconsistency grows.

### 3.1 Shared hook: `frontend/src/hooks/useSmartBack.ts`

```tsx
import { useNavigate } from "react-router-dom";

/**
 * Returns a back handler that uses real in-app history when available
 * (user navigated here via a click), and falls back to a fixed path
 * when history isn't available (refresh, direct link, notification click).
 *
 * window.history.state.idx is set by React Router — idx > 0 means
 * there is real in-app history to pop. idx === 0 or null means this
 * is the first entry in the session (fresh load / direct link).
 */
export function useSmartBack(fallbackPath: string) {
  const navigate = useNavigate();
  return () => {
    const hasHistory =
      typeof window !== "undefined" &&
      window.history.state != null &&
      window.history.state.idx > 0;
    if (hasHistory) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };
}
```

Why this matters in an enterprise app: a PM receiving a notification
deep-link arrives at the target page with no in-app history. `navigate(-1)`
in that case either does nothing or exits the app. The fallback handles
exactly this case without changing the behaviour for normal click-through
navigation.

### 3.2 Shared component: `frontend/src/components/BackLink.tsx`

```tsx
import { useSmartBack } from "../hooks/useSmartBack";

interface BackLinkProps {
  fallbackPath: string;
  label: string;
  className?: string;
}

export function BackLink({ fallbackPath, label, className }: BackLinkProps) {
  const goBack = useSmartBack(fallbackPath);
  return (
    <button
      type="button"
      onClick={goBack}
      className={
        className ??
        "text-xs text-slate-500 hover:text-slate-800 cursor-pointer bg-transparent border-none p-0"
      }
    >
      ← {label}
    </button>
  );
}
```

Visually identical to every existing back link in the codebase.
`className` prop allows role-specific theming (e.g. DM pages use inline
`style` objects, PM pages use Tailwind — either can be used).

---

## 4. Build Order

**Priority 1 — fix the bug (2.3) ✅ Done:**
Changed the four broken back links in `QPMPlanPage`, `PMSubmissionPage`,
`ActionItemsPage`, `ProjectPhasesPage` from `/pm/projects/${projectId}`
to `/pm/projects`. Also fixed the `navigate()` call inside
`handleDeleteDraft` in `PMSubmissionPage`.

**Priority 2 — fix the gap (2.4) ✅ Done:**
Replaced `QPMSummaryPage`'s single `← Back to Data Entry` with a
two-level breadcrumb: `← My Projects / Data Entry`. User can jump
directly to the project list or step back one level to Data Entry.

**Priority 3 — create the shared files (3.1, 3.2) ✅ Done:**
Created `src/hooks/useSmartBack.ts` and `src/components/BackLink.tsx`.

**Priority 4 — consolidation (optional, safe to defer):**
Migrate all 14 existing correct back links to use `BackLink`/`useSmartBack`.
This is purely a code-quality pass. Existing behaviour is correct. Defer
until a natural edit opens each file anyway.

---

## 5. Testing Checklist

For each of the 5 affected pages (4 bug fixes + 1 gap fix):

- [ ] Navigate in normally via click-through → back link lands on the correct page
- [ ] Refresh the page directly → back link uses the fallback path, not a 404 or blank
- [ ] Arrive via a notification deep-link → back link uses the fallback path correctly
- [ ] `QPMSummaryPage` specifically: both `← My Projects` and `← Back to Data Entry` work independently

---

## 6. Pages Not in AppRoutes — separate cleanup action

The following files exist in `src/pages/` but are **not registered** in
`AppRoutes.tsx`. They are unreachable from the running app. Do not add
back links to these — adding navigation to unreachable pages accomplishes
nothing. Confirm with the team whether each is safe to delete or is
mid-build before wiring in:

- `PMProjectDetailPage.tsx` (exists, orphaned — back links in 4 pages target its route)
- `CEODashboardPage.tsx`
- `PlatformAdminDashboardPage.tsx`
- `DeliveryHeadMyBUPage.tsx`
- `DHQPMReviewPage.tsx`
- `DHSubmissionReviewPage.tsx`
- `DHSubmissionsPage.tsx`
- `GovernanceReviewsPage.tsx`
- `DMSubmissionsPage.tsx`
- `ComplianceReportPage.tsx`

Note: `DMSubmissionReviewPage.tsx` was added to this list in a previous
spec version but **is** reachable — it is correctly routed. It stays in
the app.

---

## 7. What Does NOT Change

- No routing changes — all fixes use existing registered routes
- No new routes added
- No changes to sidebar navigation
- No changes to the 14 pages whose back links are already working correctly
  (unless Priority 4 consolidation is done, which is purely cosmetic)
- Multi-level breadcrumb navigation (jumping more than one level) is out
  of scope — worth its own spec if the app's nesting deepens further
