import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { homePathForRole } from "../routes/roleConfig";

export function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold text-slate-900">Unauthorized</h1>
      <p className="max-w-md text-center text-sm text-slate-600">
        You do not have permission to view this page.
      </p>
      {user ? (
        <Link
          to={homePathForRole(user.role_code)}
          className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          Go to your home
        </Link>
      ) : (
        <Link
          to="/login"
          className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}
