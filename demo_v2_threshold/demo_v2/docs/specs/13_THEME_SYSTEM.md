# Spec 13 — Theme System (Light / Dark)

**Status:** Implemented ✅  
**Version:** 1.0  
**Last Updated:** July 2026

---

## Overview

DeliveryPulse AI supports a toggleable light/dark theme using CSS custom properties (variables). The active theme is persisted in `localStorage` and applied via a `data-theme` attribute on the `<html>` element.

---

## CSS Variables

Defined in `frontend/src/index.css`:

| Variable | Light Value | Dark Value | Usage |
|---|---|---|---|
| `--bg` | `#f0f2ff` | `#0f0f17` | Page background |
| `--surface` | `#ffffff` | `#1a1a2e` | Cards, panels, modals |
| `--border` | `#e8e6ff` | `#2d2b6e` | Dividers, card borders |
| `--text` | `#1a1a2e` | `#e0e7ff` | Primary text |
| `--muted` | `#6b7280` | `#94a3b8` | Secondary text, labels |
| `--primary` | `#6c63ff` | `#818cf8` | Buttons, links, accents |
| `--shadow` | `0 2px 16px rgba(108,99,255,0.10)` | `0 2px 20px rgba(0,0,0,0.5)` | Card shadows |

---

## Theme Toggle

**Component:** `Header.tsx` (included in `RoleShellLayout` — used by all roles)  
**Context:** `ThemeContext` — exposes `{ theme, toggleTheme }`

The toggle is a custom pill switch in the header bar:
- Light mode: pill background = `var(--border)`, thumb = `#6c63ff`, label "LIGHT"
- Dark mode: pill background = `#6c63ff`, thumb = `var(--surface)`, label "DARK"
- Smooth CSS transition: `left 0.25s cubic-bezier(.4,0,.2,1)` on thumb position

---

## Theme Persistence

```typescript
// ThemeContext saves to localStorage
localStorage.setItem("deliverypulse_theme", theme);

// On app load: reads saved preference or defaults to "light"
const saved = localStorage.getItem("deliverypulse_theme") ?? "light";
```

On every theme change: `document.documentElement.setAttribute("data-theme", theme)`

---

## Tailwind Class Overrides (dark-theme.css)

`frontend/src/dark-theme.css` is imported after Tailwind CSS in `index.css`. It patches Tailwind utility classes that would otherwise show white backgrounds in dark mode:

| What it overrides | Effect in dark mode |
|---|---|
| `.bg-white`, `.bg-slate-50/100`, `.bg-gray-50/100` | → `var(--surface)` |
| `.rounded-xl/2xl/lg/3xl` (non-colored) | → `var(--surface)` background + `var(--text)` color |
| `.border-slate-*`, `.border-gray-*` | → `var(--border)` |
| `.text-slate-900/800`, `.text-gray-900/800` | → `var(--text)` |
| `.text-slate-500/400/700/600` | → `var(--muted)` |
| `thead`, `th`, `.bg-slate-50` | → `rgba(255,255,255,0.04)` |
| `input`, `select`, `textarea` | → `var(--surface)` bg, `var(--text)` text, `var(--border)` border |
| `[data-theme="dark"] .text-indigo-600/700` | → `var(--primary)` |
| Colored stat tiles (`bg-violet`, `bg-emerald`, `bg-orange`, etc.) | Intentionally **not** overridden — keep their brand colors |

---

## Inline Style Usage Rule

**All page components use CSS variables for theming via inline `style` props** — NOT hardcoded hex values for backgrounds, text, borders, or shadows.

✅ Correct:
```tsx
<div style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}>
```

❌ Incorrect (breaks dark mode):
```tsx
<div style={{ background: "#ffffff", color: "#1a1a2e", border: "1px solid #e8e6ff" }}>
```

The only permitted hardcoded hex values in inline styles are:
- RAG status colors (`#22c55e`, `#f59e0b`, `#ef4444`) — always shown in their semantic color
- Stat card gradient backgrounds — always colored regardless of theme
- rgba-based RAG pill backgrounds (e.g. `rgba(34,197,94,0.12)`) — work correctly in both themes

---

## Affected Pages

All pages that use inline `style` props have been updated to use CSS variables:

| Page | Updated |
|---|---|
| `PortfolioDashboardPage` (Platform Admin / CEO / DE) | ✅ |
| `ProjectSummaryReadOnlyPage` | ✅ |
| `DashboardShellPage` (PM) | ✅ |
| `DMDashboardPage` | ✅ |
| `DMProjectReviewPage` | ✅ |
| `DMActionItemsPage` | ✅ |
| `DeliveryHeadDashboardPage` (Tailwind classes) | ✅ — dark-theme.css handles |
