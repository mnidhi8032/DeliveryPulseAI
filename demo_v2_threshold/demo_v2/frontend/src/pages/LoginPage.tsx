import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { homePathForRole } from "../routes/roleConfig";

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  const [email, setEmail] = useState("buhead1@deliverypulse.ai");
  const [password, setPassword] = useState("Demo@12345");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  if (isAuthenticated && user) {
    const dest = from ?? homePathForRole(user.role_code);
    const VALID_PATHS = ["/platform", "/ceo", "/delivery-head", "/delivery-manager", "/pm", "/delivery-excellence"];
    if (!dest || !VALID_PATHS.some(p => dest.startsWith(p))) {
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

  const quickLogin = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
    setError(null);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12"
      style={{ background: "var(--bg)" }}>
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "4s" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "6s", animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-violet-400/10 to-fuchsia-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "8s", animationDelay: "2s" }} />
      </div>

      {/* Main card container */}
      <div className="relative w-full max-w-md">
        {/* Glassmorphic card */}
        <div className="relative rounded-3xl shadow-2xl shadow-slate-900/10"
          style={{ border: "1px solid var(--border)", background: "var(--surface)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
          {/* Top gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-3xl" />
          
          <div className="p-8 sm:p-10">
            {/* Logo & Brand */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/50">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 to-transparent" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight"
                    style={{ color: "var(--text)" }}>
                    DeliveryPulse
                  </h1>
                  <p className="text-[10px] font-bold text-indigo-600 tracking-[0.2em] uppercase">AI PLATFORM</p>
                </div>
              </div>
            </div>

            {/* Welcome message */}
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Welcome Back</h2>
              <p className="text-sm text-slate-500">Sign in to access your workspace</p>
            </div>

            {/* Login form */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 flex items-start gap-3">
                  <svg className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm font-medium text-rose-800">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-size-200 bg-pos-0 hover:bg-pos-100 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-500 transform hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundSize: "200% 100%" }}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                )}
              </button>
            </form>

            {/* Demo credentials toggle */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowCredentials(!showCredentials)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors group"
              >
                <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900">Demo Accounts</span>
                <svg 
                  className={`h-4 w-4 text-slate-400 transition-transform ${showCredentials ? "rotate-180" : ""}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showCredentials && (
                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  {[
                    { role: "Platform Admin",       email: "admin@deliverypulse.ai",   color: "purple" },
                    { role: "CEO",                  email: "ceo@deliverypulse.ai",     color: "rose"   },
                    { role: "Delivery Head (BU 1)", email: "buhead1@deliverypulse.ai", color: "sky"    },
                    { role: "Delivery Head (BU 2)", email: "buhead2@deliverypulse.ai", color: "sky"    },
                    { role: "Delivery Head (BU 3)", email: "buhead3@deliverypulse.ai", color: "sky"    },
                    { role: "Delivery Manager 1",   email: "dm1@deliverypulse.ai",     color: "teal"   },
                    { role: "Project Manager 1",    email: "pm1@deliverypulse.ai",     color: "indigo" },
                    { role: "Project Manager 2",    email: "pm2@deliverypulse.ai",     color: "indigo" },
                    { role: "Project Manager 3",    email: "pm3@deliverypulse.ai",     color: "indigo" },
                    { role: "Delivery Excellence",  email: "de@deliverypulse.ai",      color: "amber"  },
                  ].map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => quickLogin(account.email, account.email === "admin@deliverypulse.ai" ? "Admin@123" : "Demo@12345")}
                      className="w-full text-left px-3 py-2.5 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">{account.role}</p>
                          <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">{account.email}</p>
                        </div>
                        <svg className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition-colors shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            © 2026 DeliveryPulse AI. Enterprise Project Governance Platform.
          </p>
        </div>
      </div>
    </div>
  );
}
