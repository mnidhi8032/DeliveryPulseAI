import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
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

  // Helper to format category badges
  const getCategoryStyles = (category: string) => {
    switch (category.toUpperCase()) {
      case "RISK":
        return "bg-rose-50 text-rose-600 border border-rose-100";
      case "APPROVAL":
        return "bg-amber-50 text-amber-600 border border-amber-100";
      case "WORKFLOW":
        return "bg-indigo-50 text-indigo-600 border border-indigo-100";
      case "SYSTEM":
      default:
        return "bg-slate-50 text-slate-600 border border-slate-100";
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
    <header className="flex items-center justify-between pb-6 mb-6 border-b border-slate-150 gap-4">
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

      {/* Right side: notification bell + user info + logout */}
      <div className="flex items-center gap-4">
        {/* Notification Bell with Badge & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="animate-bell relative p-2 text-slate-500 transition-all rounded-full hover:bg-slate-50 hover:text-slate-700 focus:outline-none cursor-pointer"
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
              <span className="absolute top-1 right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Glassmorphic Dropdown Drawer */}
          {isOpen && (
            <div className="absolute right-0 z-50 w-96 mt-3 origin-top-right rounded-2xl border border-white/20 bg-white/80 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 focus:outline-none transition-all duration-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100/50">
                <div>
                  <h3 className="font-semibold text-slate-800">Notifications</h3>
                  <p className="text-[11px] text-slate-400">
                    {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100/50">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.2}
                      stroke="currentColor"
                      className="w-12 h-12 mb-2 text-slate-300"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.143 17.082a24.248 24.248 0 0 0 3.844.148 24.252 24.252 0 0 0 3.844-.148m-7.688 0a24.277 24.277 0 0 1 7.688 0m-7.688 0a24.255 24.255 0 0 1-1.388-6.022 8.966 8.966 0 0 1 12.113 0c.012 2.112.553 4.103 1.51 5.822M9.143 17.082a24.255 24.255 0 0 1-1.047 0m1.047 0c.732.063 1.464.095 2.197.095m0 0c.733 0 1.465-.032 2.197-.095m-2.197.095a24.253 24.253 0 0 0 2.197-.095"
                      />
                    </svg>
                    <p className="text-sm">No new notifications</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`flex gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50/50 transition-colors ${
                        !notif.is_read ? "bg-indigo-50/10" : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${getCategoryStyles(
                              notif.category
                            )}`}
                          >
                            {notif.category}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatTimeAgo(notif.created_at)}
                          </span>
                        </div>
                        <h4 className={`text-xs font-semibold text-slate-800 ${!notif.is_read ? "font-bold text-slate-900" : ""}`}>
                          {notif.title}
                        </h4>
                        <p className="mt-0.5 text-xs text-slate-500 leading-normal line-clamp-2">
                          {notif.message}
                        </p>
                      </div>

                      <div className="flex items-center">
                        {!notif.is_read && (
                          <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0" />
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
        <div className="h-6 w-[1px] bg-slate-200" />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-700">
              {user?.full_name}
            </p>
            <p className="text-[10px] text-slate-400 capitalize">
              {user?.role_code.replace("_", " ")}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
            title="Log out"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
