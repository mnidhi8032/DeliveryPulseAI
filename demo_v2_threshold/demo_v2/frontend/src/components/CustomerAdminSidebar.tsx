import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const navItems = [
  { label: "Dashboard", to: "/customer-admin", end: true },
  { label: "Business Units", to: "/customer-admin/business-units", end: false },
  { label: "Projects", to: "/customer-admin/projects", end: false },
  { label: "Setup Workspace", to: "/customer-admin/setup", end: false },
] as const;

export function CustomerAdminSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-900 bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100 transition-all duration-300">
      <div className="border-b border-slate-900 px-5 py-6">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
          <p className="text-sm font-extrabold tracking-tight text-white uppercase">DeliveryPulse AI</p>
        </div>
        <span className="mt-1.5 inline-block rounded bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Customer Admin</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1.5 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `group flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                isActive
                  ? "bg-gradient-to-r from-indigo-600/20 to-violet-600/5 text-white border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                  : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-200 border border-transparent"
              }`
            }
          >
            <span>{item.label}</span>
            <svg className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-900 p-4 space-y-3">
        <div className="rounded-lg bg-slate-950/60 p-3 border border-slate-900/50">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Account</p>
          <p className="truncate text-xs font-semibold text-slate-300 mt-0.5">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg border border-slate-800 px-4 py-2.5 text-center text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-900 transition-all cursor-pointer"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
