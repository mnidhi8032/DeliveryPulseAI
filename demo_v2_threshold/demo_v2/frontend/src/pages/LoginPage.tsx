import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { homePathForRole } from "../routes/roleConfig";

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  const [email, setEmail] = useState("admin@deliverypulse.ai");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated && user) {
    const dest = from ?? homePathForRole(user.role_code);
    // Guard against stale tokens with removed roles (e.g. DELIVERY_HEAD, CUSTOMER_ADMIN)
    const VALID_PATHS = ["/platform", "/ceo", "/bu-head", "/pm", "/delivery-excellence"];
    if (!dest || !VALID_PATHS.some(p => dest.startsWith(p))) {
      // Force logout and stay on login
      return null;
    }
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedIn = await login({ email, password });
      const dest = from ?? homePathForRole(loggedIn.role_code) ?? "/login";
      navigate(dest, { replace: true });
    } catch {
      setError("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">DeliveryPulse AI</h1>
        <p className="mt-1 text-sm text-slate-600">Sign in to continue</p>
        <p className="mt-2 text-xs text-slate-500">
          Platform Admin: <span className="font-mono">admin@deliverypulse.ai</span> / <span className="font-mono">Admin@123</span><br />
          Delivery Excellence: <span className="font-mono">de@deliverypulse.ai</span> / <span className="font-mono">Demo@12345</span><br />
          CEO: <span className="font-mono">ceo@deliverypulse.ai</span> / <span className="font-mono">Demo@12345</span><br />
          BU Head: <span className="font-mono">buhead1@deliverypulse.ai</span> / <span className="font-mono">Demo@12345</span><br />
          PM: <span className="font-mono">pm1@deliverypulse.ai</span> / <span className="font-mono">Demo@12345</span>
        </p>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
