import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// ── Icons ────────────────────────────────────────────────────────────────────
const ICONS: Record<string, string> = {
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
  label: string; to: string; end?: boolean; iconKey?: keyof typeof ICONS; badge?: string;
}
interface SidebarProps {
  title: string;
  role: "PM"|"CEO"|"DELIVERY_HEAD"|"DELIVERY_MANAGER"|"PLATFORM_ADMIN"|"DELIVERY_EXCELLENCE";
  basePath: string;
}

const NAV_ITEMS: Record<string, NavItem[]> = {
  PM: [
    { label: "Dashboard",   to: "/pm",          end: true,  iconKey: "dashboard" },
    { label: "My Projects", to: "/pm/projects", end: false, iconKey: "projects"  },
    { label: "Summary",     to: "/pm/summary",  end: false, iconKey: "chart"     },
    { label: "Actions",     to: "/pm/actions",  end: false, iconKey: "action"    },
  ],
  DELIVERY_EXCELLENCE: [
    { label: "Dashboard",      to: "/delivery-excellence",         end: true,  iconKey: "dashboard" },
    { label: "Metric Catalog", to: "/delivery-excellence/catalog", end: false, iconKey: "qpm"       },
  ],
  CEO: [
    { label: "Dashboard",      to: "/ceo",                 end: true,  iconKey: "dashboard"     },
    { label: "Business Units", to: "/ceo/business-units",  end: false, iconKey: "businessUnits" },
    { label: "Projects",       to: "/ceo/projects",        end: false, iconKey: "projects"      },
    { label: "Reports",        to: "/ceo/reports",         end: false, iconKey: "reports"       },
  ],
  DELIVERY_HEAD: [
    { label: "Dashboard",          to: "/delivery-head",                    end: true,  iconKey: "dashboard"     },
    { label: "My BU",              to: "/delivery-head/business-unit",      end: false, iconKey: "businessUnits" },
    { label: "Projects",           to: "/delivery-head/projects",           end: false, iconKey: "projects"      },
    { label: "Submissions",        to: "/delivery-head/submissions",        end: false, iconKey: "submissions"   },
    { label: "Governance Reviews", to: "/delivery-head/governance-reviews", end: false, iconKey: "governance"    },
    { label: "Compliance",         to: "/delivery-head/compliance",         end: false, iconKey: "compliance"    },
  ],
  DELIVERY_MANAGER: [
    { label: "Dashboard",    to: "/delivery-manager",         end: true,  iconKey: "dashboard" },
    { label: "Action Items", to: "/delivery-manager/actions", end: false, iconKey: "action"    },
  ],
  PLATFORM_ADMIN: [
    { label: "Dashboard",      to: "/platform",                end: true,  iconKey: "dashboard"     },
    { label: "Business Units", to: "/platform/business-units", end: false, iconKey: "businessUnits" },
    { label: "Reports",        to: "/platform/reports",        end: false, iconKey: "reports"       },
    { label: "Settings",       to: "/platform/settings",       end: false, iconKey: "settings"      },
  ],
};

const roleLabel: Record<string, string> = {
  PM: "Project Manager", CEO: "CEO", DELIVERY_HEAD: "Delivery Head",
  DELIVERY_MANAGER: "Delivery Manager", PLATFORM_ADMIN: "Platform Admin",
  DELIVERY_EXCELLENCE: "Delivery Excellence",
};

// Collapsed = 64px, Expanded = 220px
const W_COLLAPSED = 64;
const W_EXPANDED  = 220;

export function Sidebar({ title, role }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const navItems = NAV_ITEMS[role] || [];

  const handleLogout = () => { logout(); navigate("/login", { replace: true }); };

  const initials = user?.full_name
    ? user.full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const w = expanded ? W_EXPANDED : W_COLLAPSED;

  return (
    <>
      {/* Inject sidebar transition CSS once */}
      <style>{`
        .sb-label {
          overflow: hidden;
          white-space: nowrap;
          transition: max-width 0.25s ease, opacity 0.20s ease;
        }
        .sb-collapsed .sb-label { max-width: 0; opacity: 0; }
        .sb-expanded  .sb-label { max-width: 160px; opacity: 1; }
        .sb-nav-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 18px; border-radius: 12px;
          text-decoration: none; cursor: pointer;
          transition: background 0.15s;
          border: none; width: 100%; box-sizing: border-box;
        }
        .sb-collapsed .sb-nav-item { justify-content: center; padding: 10px 0; }
        .sb-expanded  .sb-nav-item { justify-content: flex-start; padding: 10px 14px; }
        .sb-nav-item:hover { background: rgba(255,255,255,0.12) !important; }
        .sb-icon-wrap {
          flex-shrink: 0; width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 8px;
          transition: background 0.15s;
        }
        .sb-tooltip {
          position: absolute; left: calc(100% + 10px); top: 50%;
          transform: translateY(-50%); z-index: 100;
          background: #1a1a2e; color: #fff; font-size: 12px; font-weight: 600;
          padding: 5px 10px; border-radius: 8px; white-space: nowrap;
          pointer-events: none; opacity: 0;
          transition: opacity 0.15s;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .sb-nav-item:hover .sb-tooltip { opacity: 1; }
      `}</style>

      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={expanded ? "sb-expanded" : "sb-collapsed"}
        style={{
          width: w, flexShrink: 0, display: "flex", flexDirection: "column",
          background: "#3730a3",
          minHeight: "100vh",
          transition: "width 0.25s cubic-bezier(.4,0,.2,1)",
          overflow: "hidden",
          position: "relative",
          zIndex: 40,
        }}
      >
        {/* Brand */}
        <div style={{
          height: 64, display: "flex", alignItems: "center",
          justifyContent: expanded ? "flex-start" : "center",
          padding: expanded ? "0 16px" : "0",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
          flexShrink: 0, gap: 10,
          transition: "padding 0.25s ease, justify-content 0.25s ease",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            background: "rgba(255,255,255,0.20)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="sb-label" style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>
            DeliveryPulse
          </span>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end ?? false}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: expanded ? 12 : 0,
                padding: expanded ? "10px 14px" : "10px 0",
                justifyContent: expanded ? "flex-start" : "center",
                borderRadius: 12,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "#fff" : "rgba(255,255,255,0.70)",
                background: isActive ? "#4f46e5" : "transparent",
                boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.20)" : "none",
                transition: "background 0.15s, padding 0.25s, gap 0.25s",
                position: "relative",
                width: "100%",
                boxSizing: "border-box",
              })}
            >
              {({ isActive }) => (
                <>
                  {/* Icon */}
                  <span style={{
                    flexShrink: 0, width: 28, height: 28,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: 8,
                    background: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                  }}>
                    {item.iconKey && (
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24"
                        stroke={isActive ? "#fff" : "rgba(255,255,255,0.75)"} strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[item.iconKey]} />
                      </svg>
                    )}
                  </span>

                  {/* Label — only visible when expanded */}
                  <span className="sb-label" style={{ fontSize: 13, fontWeight: isActive ? 700 : 500 }}>
                    {item.label}
                  </span>

                  {/* Tooltip — only when collapsed */}
                  {!expanded && (
                    <span style={{
                      position: "absolute", left: "calc(100% + 12px)", top: "50%",
                      transform: "translateY(-50%)", zIndex: 100,
                      background: "#1a1a2e", color: "#fff", fontSize: 12, fontWeight: 600,
                      padding: "5px 10px", borderRadius: 8, whiteSpace: "nowrap",
                      pointerEvents: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                      opacity: 0,
                      transition: "opacity 0.15s",
                    }}
                      className="sb-tooltip"
                    >
                      {item.label}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User avatar + info */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.10)",
          padding: expanded ? "14px 12px" : "14px 0",
          display: "flex", alignItems: "center",
          justifyContent: expanded ? "flex-start" : "center",
          gap: expanded ? 10 : 0,
          flexShrink: 0,
          transition: "padding 0.25s, gap 0.25s",
        }}>
          {/* Avatar */}
          <div style={{
            width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
            background: "rgba(0,0,0,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800, color: "#fff",
            border: "2px solid rgba(255,255,255,0.25)",
            cursor: "pointer",
          }}
            title={!expanded ? (user?.full_name ?? "") : undefined}
          >
            {initials}
          </div>

          {/* Name + logout — only when expanded */}
          <div className="sb-label" style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.full_name}
            </p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {roleLabel[role] || title}
            </p>
          </div>

          {/* Logout — only when expanded */}
          <div className="sb-label" style={{ flexShrink: 0 }}>
            <button type="button" onClick={handleLogout} title="Sign out"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: "rgba(255,255,255,0.55)", display: "flex" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.20)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
