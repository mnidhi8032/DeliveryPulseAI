import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  Notification,
} from "../services/notificationService";
import { getSubmission } from "../services/submissionService";

export function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const fetchNotificationsData = async () => {
    if (!user) return;
    try {
      const [list, countRes] = await Promise.all([
        listNotifications(),
        getUnreadCount(),
      ]);
      // Sort notifications with newest first
      setNotifications(list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setUnreadCount(countRes.unread_count);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotificationsData();
    // Poll notifications every 30 seconds for real-time feel
    const interval = setInterval(fetchNotificationsData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      await fetchNotificationsData();
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    try {
      if (!notif.is_read) {
        await markAsRead(notif.id);
        await fetchNotificationsData();
      }
      setIsOpen(false);

      // ACTION_ITEM_CREATED — deep-link PM to the consolidated actions page, filtered by project
      if (notif.type === "ACTION_ITEM_CREATED" && notif.related_project_id && user?.role_code === "PM") {
        navigate(`/pm/actions?project=${notif.related_project_id}`);
        return;
      }

      // Deep link routing based on role and notification context
      if (notif.related_submission_id) {
        try {
          // Verify that the submission draft still exists in the database
          await getSubmission(notif.related_submission_id);

          if (user?.role_code === "PM") {
            navigate(`/pm/submissions/${notif.related_submission_id}`);
          } else if (user?.role_code === "DELIVERY_HEAD") {
            navigate(`/delivery-head/submissions/${notif.related_submission_id}`);
          }
        } catch {
          // Gracefully handle deleted or reset references
          alert("This submission draft has been deleted.");
        }
      }
    } catch (err) {
      console.error("Failed to process notification click:", err);
    }
  };

  // Helper to render friendly relative time
  const formatTimeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <header className="flex items-center justify-between pb-6 mb-6 gap-4" style={{ borderBottom: "1px solid var(--border)" }}>
      <style>{`
        @keyframes bell-wiggle {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(10deg); }
          30% { transform: rotate(-10deg); }
          45% { transform: rotate(5deg); }
          60% { transform: rotate(-5deg); }
          75% { transform: rotate(2deg); }
          90% { transform: rotate(-2deg); }
        }
        .animate-bell:hover svg {
          animation: bell-wiggle 1s ease-in-out;
          transform-origin: top center;
        }
      `}</style>

      {/* Page title — rendered by each page's own h1, this is a spacer */}
      <div className="flex-1" />

      {/* Right side: theme toggle + notification bell + user info + logout */}
      <div className="flex items-center gap-4">

        {/* Dark / Light mode toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            borderRadius: 999, padding: "5px 14px 5px 10px",
            background: theme === "dark" ? "#1e1e2e" : "var(--bg)",
            border: theme === "dark" ? "1.5px solid #2d2b6e" : "1.5px solid #e8e6ff",
            cursor: "pointer",
            transition: "background 0.25s, border-color 0.25s",
            boxShadow: "0 1px 6px rgba(108,99,255,0.12)",
            position: "relative",
          }}
        >
          {/* Toggle track */}
          <span style={{
            position: "relative",
            width: 36, height: 20, borderRadius: 999, display: "inline-flex", alignItems: "center",
            background: theme === "dark" ? "#6c63ff" : "var(--border)",
            transition: "background 0.25s",
            flexShrink: 0,
          }}>
            {/* Thumb */}
            <span style={{
              position: "absolute",
              width: 14, height: 14, borderRadius: "50%",
              background: theme === "dark" ? "var(--surface)" : "#6c63ff",
              left: theme === "dark" ? 20 : 2,
              transition: "left 0.25s cubic-bezier(.4,0,.2,1), background 0.25s",
              boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
            }} />
          </span>
          {/* Label */}
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: theme === "dark" ? "#c7d2fe" : "#6c63ff",
            letterSpacing: "0.04em",
            userSelect: "none",
          }}>
            {theme === "dark" ? "DARK" : "LIGHT"}
          </span>
        </button>

        {/* Notification Bell with Badge & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="animate-bell relative p-2 transition-all rounded-full focus:outline-none cursor-pointer"
            style={{ color: "var(--muted)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(148,163,184,0.15)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
            aria-label="View notifications"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="w-6 h-6 transition-transform"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
              />
            </svg>

            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white animate-pulse"
                style={{ boxShadow: "0 0 0 2px var(--surface)" }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Glassmorphic Dropdown Drawer */}
          {isOpen && (
            <div className="absolute right-0 z-50 w-96 mt-3 origin-top-right rounded-2xl shadow-2xl ring-1 ring-black/5 focus:outline-none transition-all duration-200"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                <div>
                  <h3 style={{ color: "var(--text)" }} className="font-semibold">Notifications</h3>
                  <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                    {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)", background: "none", border: "none", cursor: "pointer" }}
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100/50">
                {notifications.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", color: "var(--muted)" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" style={{ width: 48, height: 48, marginBottom: 8, color: "var(--border)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.143 17.082a24.248 24.248 0 0 0 3.844.148 24.252 24.252 0 0 0 3.844-.148m-7.688 0a24.277 24.277 0 0 1 7.688 0m-7.688 0a24.255 24.255 0 0 1-1.388-6.022 8.966 8.966 0 0 1 12.113 0c.012 2.112.553 4.103 1.51 5.822M9.143 17.082a24.255 24.255 0 0 1-1.047 0m1.047 0c.732.063 1.464.095 2.197.095m0 0c.733 0 1.465-.032 2.197-.095m-2.197.095a24.253 24.253 0 0 0 2.197-.095" />
                    </svg>
                    <p style={{ fontSize: 13, color: "var(--muted)" }}>No new notifications</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      style={{
                        display: "flex", gap: 12, padding: "16px 20px",
                        cursor: "pointer", borderBottom: "1px solid var(--border)",
                        background: !notif.is_read ? "rgba(99,102,241,0.06)" : "transparent",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.08)")}
                      onMouseLeave={e => (e.currentTarget.style.background = !notif.is_read ? "rgba(99,102,241,0.06)" : "transparent")}
                    >
                      <div className="flex-1 min-w-0">
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{
                            padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700,
                            textTransform: "uppercase", letterSpacing: "0.06em",
                            background: notif.category === "RISK" ? "rgba(244,63,94,0.12)" :
                                        notif.category === "APPROVAL" ? "rgba(245,158,11,0.12)" :
                                        notif.category === "WORKFLOW" ? "rgba(99,102,241,0.12)" :
                                        "rgba(148,163,184,0.12)",
                            color: notif.category === "RISK" ? "#f43f5e" :
                                   notif.category === "APPROVAL" ? "#f59e0b" :
                                   notif.category === "WORKFLOW" ? "#818cf8" :
                                   "var(--muted)",
                          }}>
                            {notif.category}
                          </span>
                          <span style={{ fontSize: 10, color: "var(--muted)" }}>
                            {formatTimeAgo(notif.created_at)}
                          </span>
                        </div>
                        <h4 style={{
                          fontSize: 12, fontWeight: notif.is_read ? 600 : 700,
                          color: "var(--text)", margin: 0,
                        }}>
                          {notif.title}
                        </h4>
                        <p style={{ marginTop: 3, fontSize: 11, color: "var(--muted)", lineHeight: 1.45,
                          overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as "vertical" }}>
                          {notif.message}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {!notif.is_read && (
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#818cf8", flexShrink: 0 }} />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Info & Logout */}
        <div style={{ width: 1, height: 24, background: "var(--border)" }} />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
              {user?.full_name}
            </p>
            <p style={{ fontSize: 10, color: "var(--muted)", textTransform: "capitalize" }}>
              {user?.role_code.replace("_", " ")}
            </p>
          </div>
          <button
            onClick={logout}
            style={{ padding: 6, borderRadius: "50%", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(148,163,184,0.15)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
            title="Log out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: 20, height: 20 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
