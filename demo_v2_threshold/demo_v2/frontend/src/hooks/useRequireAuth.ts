import { useAuth } from "../contexts/AuthContext";

/** Convenience hook for components that need the current user (must be inside AuthProvider). */
export function useRequireAuth() {
  const auth = useAuth();
  return auth;
}
