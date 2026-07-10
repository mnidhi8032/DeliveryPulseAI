/**
 * DHHeader — dark-themed header for the Delivery Head layout.
 * Same notification + user functionality as Header, restyled for dark canvas.
 */
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  type Notification,
} from "../services/notificationService";

export function DHHeader() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [isOpen, setIsOpen]               = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    if (!user) return;
    try {
      const [list, countRes] = await Promise.all([listNotifications(), getUnreadCount()]);
      setNotifications(list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setUnreadCount(countRes.unread_count);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchNotifs();
    const t = setInterval(fetchNotifs, 30000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNotifClick = async (n: Notification) => {
    if (!n.is_read) { await markAsRead(n.id); await fetchNotifs(); }
    setIsOpen(false);
  };

  const formatAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const initials = user?.full_name
    ? user.full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "DH";

  return (
    <header className="flex items-center justify-end gap-4 pb-6 mb-6 border-b border-white/5">

      {/* Bell */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer focus:outline-none"
          aria-label="Notifications"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 min-w-[16px] flex items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white px-0.5 ring-1 ring-[#13131f]">
              {unreadCount}
            </span>
          )}
        </button>

        {/* dropdown */}
        {isOpen && (
          <div className="absolute right-0 z-50 mt-2 w-88 rounded-2xl border border-white/10 bg-[#1e1e2e] shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div>
                <p className="text-sm font-semibold text-white">Notifications</p>
                <p className="text-[10px] text-slate-500">{unreadCount} unread</p>
              </div>
              {unreadCount > 0 && (
                <button onClick={async () => { await markAllAsRead(); await fetchNotifs(); }}
                  className="text-[10px] font-semibold text-violet-400 hover:text-violet-300 cursor-pointer">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">No notifications</p>
              ) : notifications.map(n => (
                <div key={n.id} onClick={() => handleNotifClick(n)}
                  className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors ${!n.is_read ? "bg-violet-900/10" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${!n.is_read ? "text-white" : "text-slate-300"} line-clamp-1`}>{n.title}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500 line-clamp-2">{n.message}</p>
                    <p className="mt-1 text-[9px] text-slate-600">{formatAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-violet-500 mt-1 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* divider */}
      <div className="h-5 w-px bg-white/10" />

      {/* user info */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-xs font-semibold text-white">{user?.full_name}</p>
          <p className="text-[10px] text-slate-500">Delivery Head</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
          {initials}
        </div>
        <button onClick={logout} title="Sign out"
          className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
        </button>
      </div>
    </header>
  );
}
