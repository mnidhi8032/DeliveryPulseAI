import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { homePathForRole } from "./roleConfig";
import * as authService from "../services/authService";

const VALID_ROLES = ["PLATFORM_ADMIN", "CEO", "BU_HEAD", "PM"];

export function RootRedirect() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Loading...
      </div>
    );
  }

  if (isAuthenticated && user) {
    // If the stored token has an old/removed role, force logout and go to login
    if (!VALID_ROLES.includes(user.role_code)) {
      authService.clearToken();
      logout();
      return <Navigate to="/login" replace />;
    }
    return <Navigate to={homePathForRole(user.role_code)} replace />;
  }

  return <Navigate to="/login" replace />;
}
