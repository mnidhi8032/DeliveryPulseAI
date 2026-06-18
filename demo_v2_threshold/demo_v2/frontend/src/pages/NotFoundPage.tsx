import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { homePathForRole } from "../routes/roleConfig";

export function NotFoundPage() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold text-slate-900">Page not found</h1>
      <p className="text-sm text-slate-600">The page you requested does not exist.</p>
      <Link
        to={isAuthenticated && user ? homePathForRole(user.role_code) : "/login"}
        className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
      >
        Go home
      </Link>
    </div>
  );
}
