import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { RoleCode } from "../types/auth";
import { homePathForRole, isRoleAllowed } from "./roleConfig";

interface ProtectedRouteProps {
  allowedRoles: RoleCode[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isRoleAllowed(user.role_code, allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Loading...
      </div>
    );
  }

  const VALID_ROLES = ["PLATFORM_ADMIN", "CEO", "DELIVERY_HEAD", "DELIVERY_MANAGER", "PM", "DELIVERY_EXCELLENCE"];

  if (isAuthenticated && user && VALID_ROLES.includes(user.role_code)) {
    return <Navigate to={homePathForRole(user.role_code)} replace />;
  }

  return <Outlet />;
}
