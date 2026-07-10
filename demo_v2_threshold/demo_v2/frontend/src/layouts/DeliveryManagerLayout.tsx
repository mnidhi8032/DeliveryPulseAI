/**
 * Delivery Manager Layout — dark enterprise theme.
 * Custom layout so the dark background covers the full page including the header area.
 * Does not touch the shared Header/Sidebar components used by other roles.
 */
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { useAuth } from "../contexts/AuthContext";
import { useEffect, useRef, useState } from "react";
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  Notification,
} from "../services/notificationService";

/** Dark header — notification bell + user info, styled to match the dark theme */
function DMHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    if (!user) return;
    try {
      const [list, countRes] = await Promise.all([listNotifications(), getUnreadCount()]);
      setNotifications(list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setUnreadCount(countRes.unread_count);
    } catch {}
  };

  useEffect(() => {
    fetchNotifs();
    const id = setInterval(fetchNotifs, 30000);
    return () => clearInterval(id);
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNotifClick = async (n: Notification) => {
    try {
      if (!n.is_read) { await markAsRead(n.id); await fetchNotifs(); }
      setIsOpen(false);
      if (n.related_submission_id) {
        navigate(`/delivery-manager/submissions/${n.related_submission_id}`);
      }
    } catch {}
  };

  return (
    <header className="flex items-center justify-end px-8 py-4 border-b border-slate-700/50">
      <div className="flex items-center gap-4">
        {/* Bell */}
        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setIsOpen(!isOpen)}
            className="relative p-2 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-700/50 transition-colors cursor-pointer">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
          {/* Dropdown */}
          {isOpen && (
            <div className="absolute right-0 z-50 w-80 mt-2 rounded-2xl border border-slate-600 bg-[#1e1e35] shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                <p className="text-sm font-semibold text-slate-200">Notifications</p>
                {unreadCount > 0 && (
                  <button onClick={async () => { await markAllAsRead(); fetchNotifs(); }}
                    className="text-xs text-sky-400 hover:text-sky-300 cursor-pointer">Mark all read</button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-700/50">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-slate-500 text-center">No new notifications</p>
                ) : notifications.map(n => (
                  <div key={n.id} onClick={() => handleNotifClick(n)}
                    className={`px-4 py-3 cursor-pointer hover:bg-slate-700/30 transition-colors ${!n.is_read ? "bg-sky-900/20" : ""}`}>
                    <p className={`text-xs font-semibold ${!n.is_read ? "text-slate-100" : "text-slate-300"}`}>{n.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-slate-600" />

        {/* User info */}
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-200">{user?.full_name}</p>
          <p className="text-[10px] text-slate-500">{user?.role_code.replace("_", " ")}</p>
        </div>

        {/* Logout */}
        <button onClick={logout}
          className="p-1.5 text-slate-500 hover:text-slate-300 rounded-full hover:bg-slate-700/50 transition-colors cursor-pointer" title="Log out">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>
      </div>
    </header>
  );
}

export function DeliveryManagerLayout() {
  return (
    <div className="flex min-h-screen bg-[#1a1a2e]">
      <Sidebar title="Delivery Manager" role="DELIVERY_MANAGER" basePath="/delivery-manager" />
      <main className="flex-1 overflow-auto min-w-0 flex flex-col">
        <DMHeader />
        <div className="flex-1 px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
