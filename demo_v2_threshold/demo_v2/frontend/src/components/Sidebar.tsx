import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// ── SVG icon helpers ────────────────────────────────────────────────────────

function Icon({ d, className = "h-4 w-4" }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const ICONS = {
  dashboard:    "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  projects:     "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z",
  submissions:  "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  businessUnits:"M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  setup:        "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  reports:      "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  settings:     "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  chart:        "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  qpm:          "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  action:       "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  governance:   "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  compliance:   "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6m-6 4h6",
};

interface NavItem {
  label: string;
  to: string;
  end?: boolean;
  iconKey?: keyof typeof ICONS;
  badge?: string;
}

interface SidebarProps {
  title: string;
  role: "PM" | "CEO" | "DELIVERY_HEAD" | "DELIVERY_MANAGER" | "PLATFORM_ADMIN" | "DELIVERY_EXCELLENCE";
  basePath: string;
}

const NAV_ITEMS: Record<string, NavItem[]> = {
  PM: [
    { label: "Dashboard",    to: "/pm",               end: true,  iconKey: "dashboard" },
    { label: "My Projects",  to: "/pm/projects",      end: false, iconKey: "projects" },
    { label: "Summary",      to: "/pm/summary",       end: false, iconKey: "chart" },
  ],
  DELIVERY_EXCELLENCE: [
    { label: "Dashboard",      to: "/delivery-excellence",          end: true,  iconKey: "dashboard" },
    { label: "Metric Catalog", to: "/delivery-excellence/catalog",  end: false, iconKey: "qpm" },
  ],
  CEO: [
    { label: "Dashboard",      to: "/ceo",                    end: true,  iconKey: "dashboard" },
    { label: "Business Units", to: "/ceo/business-units",     end: false, iconKey: "businessUnits" },
    { label: "Projects",       to: "/ceo/projects",           end: false, iconKey: "projects" },
    { label: "Reports",        to: "/ceo/reports",            end: false, iconKey: "reports" },
  ],
  DELIVERY_HEAD: [
    { label: "Dashboard", to: "/delivery-head",           end: true,  iconKey: "dashboard" },
    { label: "Projects",  to: "/delivery-head/projects",  end: false, iconKey: "projects" },
  ],
  DELIVERY_MANAGER: [
    { label: "Dashboard",    to: "/delivery-manager",               end: true,  iconKey: "dashboard" },
    { label: "Action Items", to: "/delivery-manager/actions",       end: false, iconKey: "action" },
  ],
  PLATFORM_ADMIN: [
    { label: "Dashboard",      to: "/platform",                end: true,  iconKey: "dashboard" },
    { label: "Business Units", to: "/platform/business-units", end: false, iconKey: "businessUnits" },
    { label: "Reports",        to: "/platform/reports",        end: false, iconKey: "reports" },
    { label: "Settings",       to: "/platform/settings",       end: false, iconKey: "settings" },
  ],
};

export function Sidebar({ title, role }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = NAV_ITEMS[role] || [];

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const roleLabel: Record<string, string> = {
    PM:                   "Project Manager",
    CEO:                  "CEO",
    DELIVERY_HEAD:        "Delivery Head",
    DELIVERY_MANAGER:     "Delivery Manager",
    PLATFORM_ADMIN:       "Platform Admin",
    DELIVERY_EXCELLENCE:  "Delivery Excellence",
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800/60 bg-slate-950 text-slate-100">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-900/50">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold tracking-tight text-white">DeliveryPulse</p>
            <p className="text-[9px] text-indigo-400 font-semibold tracking-widest uppercase">AI Platform</p>
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-4 pt-4 pb-2">
        <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Signed in as</p>
          <p className="text-xs font-bold text-white mt-0.5">{roleLabel[role] || title}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end ?? false}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-indigo-600/15 text-white border border-indigo-500/30"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100 border border-transparent"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {item.iconKey && (
                  <span className={`flex-shrink-0 transition-colors ${isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}`}>
                    <Icon d={ICONS[item.iconKey]} />
                  </span>
                )}
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{item.badge}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User profile */}
      <div className="border-t border-slate-800/60 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 border border-indigo-500/30 text-xs font-bold text-indigo-300">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-semibold text-white">{user?.full_name}</p>
            <p className="truncate text-[10px] text-slate-500">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex-shrink-0"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
