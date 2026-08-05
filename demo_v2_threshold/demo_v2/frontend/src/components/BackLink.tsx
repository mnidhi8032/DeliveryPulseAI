import { useSmartBack } from "../hooks/useSmartBack";

interface BackLinkProps {
  /** Fixed fallback route used when there is no real in-app history
   *  (direct link, notification click, page refresh). */
  fallbackPath: string;
  /** Label text shown after the ← arrow. */
  label: string;
  /** Optional Tailwind class override. Defaults to the standard
   *  back-link style used throughout the app. */
  className?: string;
}

/**
 * Consistent back-navigation link used across all drill-in pages.
 *
 * Behaviour:
 * - If the user navigated here by clicking through the app,
 *   clicking Back goes to the actual previous page (navigate(-1)).
 * - If the user arrived via a direct link, bookmark, or notification,
 *   clicking Back navigates to `fallbackPath` instead of doing nothing
 *   or leaving the app.
 *
 * Usage:
 *   <BackLink fallbackPath="/pm/projects" label="My Projects" />
 *   <BackLink fallbackPath="/delivery-manager" label="Dashboard" />
 */
export function BackLink({ fallbackPath, label, className }: BackLinkProps) {
  const goBack = useSmartBack(fallbackPath);

  return (
    <button
      type="button"
      onClick={goBack}
      className={
        className ??
        "text-xs text-slate-500 hover:text-slate-800 cursor-pointer bg-transparent border-none p-0 inline-flex items-center gap-1"
      }
    >
      ← {label}
    </button>
  );
}
