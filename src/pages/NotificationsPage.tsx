import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppNotification, EmailDeliveryLog, AppView, NotificationType } from '../types';
import {
  Bell,
  Mail,
  CheckCheck,
  Check,
  Palmtree,
  CheckSquare,
  Receipt,
  ShieldAlert,
  Calendar,
  GraduationCap,
  Sparkles,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Send,
  AlertCircle,
  Inbox,
  Clock,
  Filter,
} from 'lucide-react';

interface NotificationsPageProps {
  onNavigate: (view: AppView) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigate }) => {
  const { authFetch, organization, role, isRealtimeConnected, subscribeToRealtime } = useAuth();
  const [activeTab, setActiveTab] = useState<'notifications' | 'email_logs'>('notifications');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailDeliveryLog[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [isTestingCompliance, setIsTestingCompliance] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!organization?.id) return;
    try {
      setLoading(true);
      const [notifsRes, emailRes] = await Promise.all([
        authFetch('/api/notifications?limit=100'),
        authFetch('/api/notifications/email-logs'),
      ]);

      if (notifsRes.ok) {
        const notifData = await notifsRes.json();
        setNotifications(notifData.notifications || []);
        setUnreadCount(notifData.unread_count || 0);
      }

      if (emailRes.ok) {
        const emailData = await emailRes.json();
        setEmailLogs(emailData.email_logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications data:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch, organization?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
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

  const handleMarkAsRead = async (id: string) => {
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
        showSuccess('All notifications marked as read');
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleTestComplianceCheck = async () => {
    try {
      setIsTestingCompliance(true);
      const res = await authFetch('/api/notifications/test-compliance-check', { method: 'POST' });
      if (res.ok) {
        await fetchNotifications();
        showSuccess('Automated compliance check ran: active alerts and Edge emails evaluated');
      }
    } catch (err) {
      console.error('Failed to trigger compliance check:', err);
    } finally {
      setIsTestingCompliance(false);
    }
  };

  const showSuccess = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => {
      setActionSuccessMsg(null);
    }, 4000);
  };

  const handleItemNavigation = (notif: AppNotification) => {
    if (!notif.read_at) {
      handleMarkAsRead(notif.id);
    }
    if (notif.link) {
      onNavigate(notif.link as AppView);
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

  // Filter notifications
  const filteredNotifications = notifications.filter((notif) => {
    if (unreadOnly && notif.read_at) return false;
    if (typeFilter !== 'all') {
      if (!notif.type.startsWith(typeFilter)) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = notif.title.toLowerCase().includes(q);
      const matchMsg = notif.message.toLowerCase().includes(q);
      if (!matchTitle && !matchMsg) return false;
    }
    return true;
  });

  const renderIcon = (type: string) => {
    if (type.startsWith('leave')) {
      return (
        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Palmtree className="w-4 h-4" />
        </div>
      );
    }
    if (type.startsWith('task')) {
      return (
        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
          <CheckSquare className="w-4 h-4" />
        </div>
      );
    }
    if (type.startsWith('expense')) {
      return (
        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <Receipt className="w-4 h-4" />
        </div>
      );
    }
    if (type.startsWith('compliance')) {
      return (
        <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-4 h-4" />
        </div>
      );
    }
    if (type.startsWith('training')) {
      return (
        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <GraduationCap className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
        <Calendar className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div id="notifications-page" className="p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Notifications & Email Delivery
            </h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isRealtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span>{isRealtimeConnected ? 'Realtime live' : 'Syncing'}</span>
            </div>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            In-app real-time event notifications and Edge Function email audit logs.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            id="test-compliance-btn"
            onClick={handleTestComplianceCheck}
            disabled={isTestingCompliance}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            title="Trigger scheduled compliance evaluation"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingCompliance ? 'animate-spin' : ''}`} />
            <span>{isTestingCompliance ? 'Checking...' : 'Check Compliance Deadlines'}</span>
          </button>

          {unreadCount > 0 && activeTab === 'notifications' && (
            <button
              id="page-mark-all-read-btn"
              onClick={handleMarkAllAsRead}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Primary Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)]">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 px-1 text-sm font-medium transition-colors cursor-pointer relative flex items-center gap-2 ${
            activeTab === 'notifications'
              ? 'text-[var(--text-primary)] font-semibold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>In-App Notifications</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
              {unreadCount}
            </span>
          )}
          {activeTab === 'notifications' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--text-primary)] rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('email_logs')}
          className={`pb-3 px-1 text-sm font-medium transition-colors cursor-pointer relative flex items-center gap-2 ${
            activeTab === 'email_logs'
              ? 'text-[var(--text-primary)] font-semibold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Email Delivery Logs (Edge Function)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
            {emailLogs.length}
          </span>
          {activeTab === 'email_logs' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--text-primary)] rounded-full" />
          )}
        </button>
      </div>

      {/* Tab 1: In-App Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {/* Controls / Filter Bar */}
          <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notifications..."
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)] w-48 sm:w-60"
                />
              </div>

              {/* Type Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'leave', label: 'Leave' },
                  { id: 'task', label: 'Tasks' },
                  { id: 'expense', label: 'Expenses' },
                  { id: 'compliance', label: 'Compliance' },
                  { id: 'event', label: 'Events' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setTypeFilter(cat.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      typeFilter === cat.id
                        ? 'bg-[var(--text-primary)] text-[var(--text-inverse)]'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Unread Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-[var(--border-subtle)] text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs text-[var(--text-secondary)] font-medium">
                Unread only ({unreadCount})
              </span>
            </label>
          </div>

          {/* Notifications List */}
          {loading && notifications.length === 0 ? (
            <div className="py-16 text-center text-xs text-[var(--text-secondary)]">
              Loading notification records...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-20 text-center rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 space-y-2">
              <Inbox className="w-8 h-8 mx-auto text-[var(--text-tertiary)] stroke-1" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {unreadOnly ? 'No unread notifications' : 'No notifications match your filters'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                Notifications are generated synchronously when leave requests, tasks, expenses, and events are processed.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notif) => {
                const isUnread = !notif.read_at;
                return (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isUnread
                        ? 'border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {renderIcon(notif.type)}

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <h4
                              className={`text-sm tracking-tight ${
                                isUnread
                                  ? 'font-bold text-[var(--text-primary)]'
                                  : 'font-semibold text-[var(--text-primary)]'
                              }`}
                            >
                              {notif.title}
                            </h4>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            )}
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[var(--text-tertiary)] bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                              {notif.type}
                            </span>
                          </div>

                          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            {notif.message}
                          </p>

                          <div className="flex items-center gap-3 pt-1 text-[11px] text-[var(--text-tertiary)]">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(notif.created_at).toLocaleString()}</span>
                            </span>
                            {notif.read_at && (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>Read {new Date(notif.read_at).toLocaleTimeString()}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isUnread && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors flex items-center gap-1 cursor-pointer border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3" />
                            <span>Mark read</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleItemNavigation(notif)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors flex items-center gap-1 cursor-pointer border border-blue-200 dark:border-blue-900/60"
                        >
                          <span>Open View</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Email Delivery Logs (Edge Function Simulation) */}
      {activeTab === 'email_logs' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Edge Function Transactional Email Service
              </h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              In accordance with spec requirements, <strong>Leave Decisions (Approved/Rejected)</strong> and <strong>Compliance-Deadline alerts</strong> trigger high-priority email notifications via the serverless Edge Function. All dispatched transactional communications are audited below.
            </p>
          </div>

          {emailLogs.length === 0 ? (
            <div className="py-20 text-center rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 space-y-2">
              <Mail className="w-8 h-8 mx-auto text-[var(--text-tertiary)] stroke-1" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">No email deliveries yet</h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                Approve or reject a leave request, or click "Check Compliance Deadlines" to trigger an automated Edge Function email.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {emailLogs.map((log) => {
                const isExpanded = expandedEmailId === log.id;
                return (
                  <div
                    key={log.id}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs"
                  >
                    {/* Summary row */}
                    <div
                      onClick={() => setExpandedEmailId(isExpanded ? null : log.id)}
                      className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-[var(--bg-subtle)]/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Send className="w-3.5 h-3.5" />
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                              {log.status}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[var(--text-tertiary)] bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                              {log.type}
                            </span>
                            <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                              {log.subject}
                            </span>
                          </div>

                          <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                            <span>To: &lt;{log.recipient_email}&gt;</span>
                            <span>·</span>
                            <span>{new Date(log.sent_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <span>{isExpanded ? 'Hide message' : 'View email body'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {/* Collapsible Email Preview */}
                    {isExpanded && (
                      <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 space-y-3 animate-in fade-in duration-150">
                        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-xs space-y-3">
                          <div className="space-y-1 pb-3 border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                            <div>
                              <span className="font-semibold text-[var(--text-primary)]">From:</span> Go-Ya HRMS Edge Worker &lt;notifications@go-ya-hrms.internal&gt;
                            </div>
                            <div>
                              <span className="font-semibold text-[var(--text-primary)]">To:</span> {log.recipient_email}
                            </div>
                            <div>
                              <span className="font-semibold text-[var(--text-primary)]">Date:</span> {new Date(log.sent_at).toUTCString()}
                            </div>
                            <div>
                              <span className="font-semibold text-[var(--text-primary)]">Subject:</span> {log.subject}
                            </div>
                          </div>

                          {/* Email Body */}
                          <div className="whitespace-pre-wrap leading-relaxed text-[var(--text-primary)] pt-1">
                            {log.body}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
