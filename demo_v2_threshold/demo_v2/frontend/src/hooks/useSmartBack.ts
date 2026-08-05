import { useNavigate } from "react-router-dom";

/**
 * Returns a back handler that uses real in-app history when available
 * (user navigated here by clicking through the app), and falls back to
 * a fixed path when history isn't available — i.e. the user arrived via
 * a direct link, bookmark, notification click, or page refresh.
 *
 * React Router sets window.history.state.idx on every navigation.
 * idx > 0 means there is real in-app history to pop back through.
 * idx === 0 or null means this is the first entry in the session —
 * calling navigate(-1) in that case either does nothing or exits the app.
 */
export function useSmartBack(fallbackPath: string): () => void {
  const navigate = useNavigate();

  return () => {
    const hasInAppHistory =
      typeof window !== "undefined" &&
      window.history.state != null &&
      (window.history.state as { idx?: number }).idx != null &&
      (window.history.state as { idx: number }).idx > 0;

    if (hasInAppHistory) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };
}
