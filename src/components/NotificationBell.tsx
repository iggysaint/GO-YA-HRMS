import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppNotification, AppView } from '../types';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  Palmtree,
  CheckSquare,
  Receipt,
  ShieldAlert,
  Calendar,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

interface NotificationBellProps {
  onNavigate: (view: AppView) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
  const { authFetch, organization, subscribeToRealtime } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!organization?.id) return;
    try {
      setLoading(true);
      const res = await authFetch('/api/notifications?limit=20');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch, organization?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe to realtime notification updates
  useEffect(() => {
    const unsubscribe = subscribeToRealtime((payload) => {
      if (
        payload.event === 'notification_created' ||
        payload.event === 'notification_updated' ||
        payload.event === 'notifications_read'
      ) {
        fetchNotifications();
      }
    });
    return unsubscribe;
  }, [subscribeToRealtime, fetchNotifications]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await authFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      if (res.ok) {
        const data = await res.json();
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_at: data.notification.read_at } : n))
        );
        setUnreadCount(data.unread_count ?? Math.max(0, unreadCount - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await authFetch('/api/notifications/mark-all-read', { method: 'POST' });
      if (res.ok) {
        const now = new Date().toISOString();
        setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || now })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.read_at) {
      await handleMarkAsRead(notif.id);
    }
    setIsOpen(false);

    if (notif.link) {
      const targetView = notif.link as AppView;
      onNavigate(targetView);
    } else if (notif.type.startsWith('leave')) {
      onNavigate('leave');
    } else if (notif.type.startsWith('task')) {
      onNavigate('tasks');
    } else if (notif.type.startsWith('expense')) {
      onNavigate('expenses');
    } else if (notif.type.startsWith('compliance')) {
      onNavigate('compliance');
    } else if (notif.type.startsWith('event') || notif.type.startsWith('training')) {
      onNavigate('events');
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const renderIcon = (type: string) => {
    if (type.startsWith('leave')) {
      return (
        <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Palmtree className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (type.startsWith('task')) {
      return (
        <div className="w-7 h-7 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
          <CheckSquare className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (type.startsWith('expense')) {
      return (
        <div className="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <Receipt className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (type.startsWith('compliance')) {
      return (
        <div className="w-7 h-7 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (type.startsWith('training')) {
      return (
        <div className="w-7 h-7 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <GraduationCap className="w-3.5 h-3.5" />
        </div>
      );
    }
    return (
      <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
        <Calendar className="w-3.5 h-3.5" />
      </div>
    );
  };

  const displayedNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.read_at) : notifications;

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            id="notification-badge"
            className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[var(--bg-primary)] animate-in zoom-in-50"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          id="notification-popover"
          className="absolute right-0 mt-2 w-84 sm:w-96 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  id="mark-all-read-btn"
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 flex items-center gap-1 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                filter === 'unread'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border-subtle)]">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
                Loading notifications...
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="py-10 text-center text-xs text-[var(--text-secondary)] space-y-1">
                <Bell className="w-6 h-6 mx-auto text-[var(--text-tertiary)] stroke-1" />
                <p className="font-medium text-[var(--text-primary)]">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <p className="text-[11px]">
                  Updates on leave requests, tasks, expenses, and events will appear here.
                </p>
              </div>
            ) : (
              displayedNotifications.map((notif) => {
                const isUnread = !notif.read_at;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group ${
                      isUnread
                        ? 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                        : 'hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    {renderIcon(notif.type)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-xs truncate ${
                            isUnread
                              ? 'font-semibold text-[var(--text-primary)]'
                              : 'font-medium text-[var(--text-primary)]'
                          }`}
                        >
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">
                          {formatRelativeTime(notif.created_at)}
                        </span>
                      </div>

                      <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>

                      {notif.link && (
                        <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 mt-1 font-medium">
                          <span>View in {notif.link}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {isUnread && (
                        <>
                          <span
                            className="w-2 h-2 rounded-full bg-blue-600"
                            title="Unread"
                          />
                          <button
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex items-center justify-between text-xs">
            <button
              onClick={() => {
                setIsOpen(false);
                onNavigate('notifications');
              }}
              className="w-full py-1.5 text-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Open Notification Center & Email Logs</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
