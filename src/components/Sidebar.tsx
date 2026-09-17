import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { StatusPill } from './StatusPill';
import { AppView } from '../types';
import {
  LayoutDashboard,
  Users,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  UserPlus,
  Sparkles,
  CheckSquare,
  Clock,
  Palmtree,
  Banknote,
  ShieldCheck,
  FolderKanban,
  Lock,
  Network,
  BarChart3,
  ListTodo,
  Receipt,
  CalendarDays,
  Bell,
  MessageSquare,
  ShieldAlert,
  CreditCard,
  Scale,
  FileCheck,
  ClipboardCheck,
  Gavel,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenInviteModal: () => void;
  onOpenCreateWorkspaceModal: () => void;
  onNavigateToPlatformAdmin?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  onOpenInviteModal,
  onOpenCreateWorkspaceModal,
  onNavigateToPlatformAdmin,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const handleNavClick = (view: AppView) => {
    onNavigate(view);
    onCloseMobile?.();
  };

  const {
    user,
    organization,
    role,
    subscription,
    logout,
    isRealtimeConnected,
    isPlatformAdmin,
    authFetch,
    subscribeToRealtime,
  } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Persistent sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('goya_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('goya_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const [peopleGroupExpanded, setPeopleGroupExpanded] = useState(true);
  const [workflowsGroupExpanded, setWorkflowsGroupExpanded] = useState(true);
  const [financeGroupExpanded, setFinanceGroupExpanded] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [complianceAlertCount, setComplianceAlertCount] = useState(0);
  const [activeTaskCount, setActiveTaskCount] = useState(0);
  const [pendingExpenseCount, setPendingExpenseCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [overdueGovernanceCount, setOverdueGovernanceCount] = useState(0);

  // Plan Gating: Hidden, not greyed out
  const currentPlan = subscription?.plan || 'free_trial';
  const isStarter = currentPlan === 'starter';

  // Fetch pending badge counts
  const fetchBadgeCounts = async () => {
    try {
      const [resLeave, resComp, resTasks, resExp, resNotif, resGov] = await Promise.all([
        authFetch('/api/leave/requests'),
        authFetch('/api/compliance/dashboard'),
        authFetch('/api/tasks'),
        authFetch('/api/expenses?status=pending'),
        authFetch('/api/notifications/unread-count'),
        authFetch('/api/governance'),
      ]);

      if (resLeave.ok) {
        const data = await resLeave.json();
        const pending = data.filter((r: any) => r.status === 'pending').length;
        setPendingLeaveCount(pending);
      }

      if (resComp.ok) {
        const cData = await resComp.json();
        const alerts = (cData.attention_count || 0) + (cData.non_compliant_count || 0);
        setComplianceAlertCount(alerts);
      }

      if (resTasks.ok) {
        const tData = await resTasks.json();
        const activeTasks = (tData.tasks || []).filter((t: any) => t.status !== 'complete').length;
        setActiveTaskCount(activeTasks);
      }

      if (resExp.ok) {
        const expData = await resExp.json();
        setPendingExpenseCount(Array.isArray(expData) ? expData.length : 0);
      }

      if (resNotif.ok) {
        const notifData = await resNotif.json();
        setUnreadNotificationCount(notifData.unread_count || 0);
      }

      if (resGov.ok) {
        const govData = await resGov.json();
        const overdue = Array.isArray(govData)
          ? govData.filter((r: any) => r.is_overdue || r.audit_status === 'overdue').length
          : 0;
        setOverdueGovernanceCount(overdue);
      }
    } catch {
      // benign
    }
  };

  useEffect(() => {
    fetchBadgeCounts();
  }, [organization?.id]);

  useEffect(() => {
    const unsubscribe = subscribeToRealtime((payload) => {
      if (
        payload.event === 'leave_request_created' ||
        payload.event === 'leave_request_updated' ||
        payload.event === 'compliance_updated' ||
        payload.event === 'document_uploaded' ||
        payload.event === 'document_deleted' ||
        payload.event === 'task_created' ||
        payload.event === 'task_updated' ||
        payload.event === 'task_moved' ||
        payload.event === 'task_deleted' ||
        payload.event === 'expense_created' ||
        payload.event === 'expense_updated' ||
        payload.event === 'expense_approved' ||
        payload.event === 'expense_rejected' ||
        payload.event === 'expense_deleted' ||
        payload.event === 'notification_created' ||
        payload.event === 'notification_updated' ||
        payload.event === 'notifications_read' ||
        payload.event?.startsWith('governance_')
      ) {
        fetchBadgeCounts();
      }
    });
    return unsubscribe;
  }, [subscribeToRealtime]);

  // Render individual navigation item (supporting expanded & collapsed icon-only rail with tooltips)
  const renderNavItem = (
    id: string,
    view: AppView,
    label: string,
    icon: React.ReactNode,
    badgeCount?: number,
    badgeLabel?: string,
    isAi?: boolean,
    customActiveCheck?: boolean
  ) => {
    const isActive = customActiveCheck !== undefined ? customActiveCheck : currentView === view;

    if (isCollapsed) {
      return (
        <div key={id} className="relative group flex justify-center">
          <button
            id={id}
            onClick={() => handleNavClick(view)}
            title={label}
            aria-label={label}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer relative ${
              isActive
                ? isAi
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold shadow-2xs'
                  : 'bg-[var(--bg-active)] text-[var(--text-primary)] font-semibold shadow-2xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="shrink-0">{icon}</span>

            {/* Notification Dot / Badge on icon */}
            {badgeCount !== undefined && badgeCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-[var(--bg-sidebar)]" />
            )}
          </button>

          {/* Collapsed Tooltip on Hover */}
          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-medium rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none hidden group-hover:flex items-center gap-2 animate-in fade-in zoom-in-95 duration-75">
            <span>{label}</span>
            {badgeCount !== undefined && badgeCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
            {badgeLabel && !badgeCount && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                {badgeLabel}
              </span>
            )}
          </div>
        </div>
      );
    }

    return (
      <button
        key={id}
        id={id}
        onClick={() => handleNavClick(view)}
        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
          isActive
            ? isAi
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold shadow-2xs'
              : 'bg-[var(--bg-active)] text-[var(--text-primary)] font-semibold shadow-2xs'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="shrink-0 opacity-80">{icon}</span>
          <span className="truncate">{label}</span>
        </div>

        {badgeCount !== undefined && badgeCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-600 text-white font-bold animate-in zoom-in shrink-0">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}

        {badgeLabel && (!badgeCount || badgeCount === 0) && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] font-medium shrink-0">
            {badgeLabel}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          id="mobile-sidebar-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-150"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-50 md:static md:z-auto ${
          isCollapsed ? 'w-64 md:w-16' : 'w-64'
        } h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex flex-col shrink-0 select-none transition-all duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header: Workspace Switcher / Compact Avatar + Collapse Toggle */}
        <div className="p-3 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
          {isCollapsed ? (
            <div className="w-full flex flex-col items-center gap-2">
              <div
                title={`Workspace: ${organization?.name || 'Go-Ya Workspace'}`}
                className="w-9 h-9 rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] flex items-center justify-center font-bold text-sm shadow-xs cursor-default"
              >
                {(organization?.name || 'G').charAt(0).toUpperCase()}
              </div>
              <button
                id="sidebar-expand-toggle"
                onClick={toggleCollapse}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer flex items-center justify-center"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <WorkspaceSwitcher
                  onOpenInviteModal={onOpenInviteModal}
                  onOpenCreateWorkspaceModal={onOpenCreateWorkspaceModal}
                />
              </div>

              {/* Desktop Collapse Toggle */}
              <button
                id="sidebar-collapse-toggle"
                onClick={toggleCollapse}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer hidden md:flex items-center justify-center shrink-0"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>

              {/* Mobile Close Button */}
              {onCloseMobile && (
                <button
                  id="close-mobile-sidebar-btn"
                  onClick={onCloseMobile}
                  className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] md:hidden transition-colors cursor-pointer shrink-0"
                  aria-label="Close navigation"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Navigation Groups */}
        <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2 py-3 space-y-3' : 'px-2 py-3 space-y-4'}`}>
          {/* Main Navigation Items */}
          <div className="space-y-0.5">
            {renderNavItem(
              'nav-dashboard-btn',
              'dashboard',
              'Dashboard',
              <LayoutDashboard className="w-4 h-4" />
            )}
            {renderNavItem(
              'nav-notifications-btn',
              'notifications',
              'Notifications',
              <Bell className="w-4 h-4" />,
              unreadNotificationCount
            )}
            {renderNavItem(
              'nav-chat-btn',
              'chat',
              'Internal Chat',
              <MessageSquare className="w-4 h-4" />,
              undefined,
              '1:1 & Groups'
            )}
            {renderNavItem(
              'nav-ai-assistant-btn',
              'ai_assistant',
              'Go-Ya AI Assistant',
              <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
              undefined,
              'AI',
              true
            )}
          </div>

          {/* People & Operations Group */}
          <div>
            {!isCollapsed && (
              <div
                onClick={() => setPeopleGroupExpanded(!peopleGroupExpanded)}
                className="flex items-center justify-between px-3 py-1 text-xs font-semibold text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] transition-colors group"
              >
                <span className="uppercase tracking-wider">People & Operations</span>
                {peopleGroupExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                )}
              </div>
            )}

            {isCollapsed && <div className="my-1.5 mx-2 border-t border-[var(--border-subtle)]" />}

            {peopleGroupExpanded && (
              <div className={`mt-1 space-y-0.5 ${isCollapsed ? '' : 'pl-1'}`}>
                {renderNavItem(
                  'nav-directory-btn',
                  'directory',
                  'Employee Directory',
                  <Users className="w-4 h-4" />,
                  undefined,
                  undefined,
                  false,
                  currentView === 'directory' || currentView === 'profile'
                )}
                {renderNavItem('nav-org-chart-btn', 'org_chart', 'Org Chart', <Network className="w-4 h-4" />)}
                {renderNavItem(
                  'nav-onboarding-btn',
                  'onboarding',
                  'Onboarding',
                  <CheckSquare className="w-4 h-4" />,
                  undefined,
                  'Kanban'
                )}
                {renderNavItem(
                  'nav-attendance-btn',
                  'attendance',
                  'Attendance',
                  <Clock className="w-4 h-4" />
                )}
                {renderNavItem(
                  'nav-leave-btn',
                  'leave',
                  'Leave & PTO',
                  <Palmtree className="w-4 h-4" />,
                  pendingLeaveCount
                )}
                {renderNavItem(
                  'nav-events-btn',
                  'events',
                  'Events',
                  <CalendarDays className="w-4 h-4" />,
                  undefined,
                  'Schedule'
                )}
              </div>
            )}
          </div>

          {/* Workflows Group */}
          <div>
            {!isCollapsed && (
              <div
                onClick={() => setWorkflowsGroupExpanded(!workflowsGroupExpanded)}
                className="flex items-center justify-between px-3 py-1 text-xs font-semibold text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] transition-colors group"
              >
                <span className="uppercase tracking-wider">Workflows</span>
                {workflowsGroupExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                )}
              </div>
            )}

            {isCollapsed && <div className="my-1.5 mx-2 border-t border-[var(--border-subtle)]" />}

            {workflowsGroupExpanded && (
              <div className={`mt-1 space-y-0.5 ${isCollapsed ? '' : 'pl-1'}`}>
                {renderNavItem(
                  'nav-tasks-btn',
                  'tasks',
                  'Tasks',
                  <ListTodo className="w-4 h-4" />,
                  activeTaskCount
                )}
                {renderNavItem(
                  'nav-surveys-btn',
                  'surveys',
                  'Surveys',
                  <ClipboardCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
                  undefined,
                  'Pulse'
                )}
              </div>
            )}
          </div>

          {/* Governance & Finance Group */}
          <div>
            {!isCollapsed && (
              <div
                onClick={() => setFinanceGroupExpanded(!financeGroupExpanded)}
                className="flex items-center justify-between px-3 py-1 text-xs font-semibold text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] transition-colors group"
              >
                <span className="uppercase tracking-wider">Governance & Finance</span>
                {financeGroupExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                )}
              </div>
            )}

            {isCollapsed && <div className="my-1.5 mx-2 border-t border-[var(--border-subtle)]" />}

            {financeGroupExpanded && (
              <div className={`mt-1 space-y-0.5 ${isCollapsed ? '' : 'pl-1'}`}>
                {renderNavItem(
                  'nav-payroll-btn',
                  'payroll',
                  'Payroll & Comp',
                  <Banknote className="w-4 h-4" />,
                  undefined,
                  role === 'hr_head' ? 'HR Head' : undefined
                )}

                {!isStarter &&
                  renderNavItem(
                    'nav-expenses-btn',
                    'expenses',
                    'Expenses',
                    <Receipt className="w-4 h-4" />,
                    pendingExpenseCount
                  )}

                {renderNavItem(
                  'nav-compliance-btn',
                  'compliance',
                  'Compliance',
                  <ShieldCheck className="w-4 h-4" />,
                  complianceAlertCount
                )}

                {renderNavItem(
                  'nav-documents-btn',
                  'documents',
                  'Documents',
                  <FolderKanban className="w-4 h-4" />
                )}

                {renderNavItem(
                  'nav-policies-btn',
                  'policies',
                  'Policies',
                  <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
                  undefined,
                  'Ack'
                )}

                {renderNavItem(
                  'nav-governance-btn',
                  'governance',
                  'HR Governance',
                  <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
                  overdueGovernanceCount,
                  overdueGovernanceCount === 0 ? 'Audit' : undefined
                )}

                {!isStarter &&
                  renderNavItem(
                    'nav-analytics-btn',
                    'analytics',
                    'Analytics & Reports',
                    <BarChart3 className="w-4 h-4" />
                  )}

                {role === 'hr_head' &&
                  renderNavItem(
                    'nav-billing-btn',
                    'billing',
                    'Billing & Plan',
                    <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
                    undefined,
                    currentPlan === 'free_trial' ? 'Trial' : currentPlan
                  )}

                {role === 'hr_head' &&
                  renderNavItem(
                    'nav-conduct-btn',
                    'conduct',
                    'Conduct Tracker',
                    <Gavel className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
                    undefined,
                    'HR Head'
                  )}
              </div>
            )}
          </div>

          {/* Realtime Status Indicator */}
          {!isCollapsed && (
            <div className="px-3 pt-2">
              <div
                id="realtime-status-banner"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isRealtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="truncate">
                  {isRealtimeConnected ? 'Realtime sync active' : 'Connecting to workspace...'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer / User Profile & Settings */}
        <div className="p-3 border-t border-[var(--border-subtle)] relative">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                id="user-profile-summary-collapsed"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                title={`Signed in as ${user?.email || 'User'} (${role === 'hr_head' ? 'HR Head' : 'HR Analyst'})`}
                className="w-8 h-8 rounded-full bg-stone-300 dark:bg-stone-700 text-[var(--text-primary)] flex items-center justify-center font-bold text-xs cursor-pointer hover:ring-2 hover:ring-[var(--border-strong)] transition-all"
              >
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>

              <button
                id="theme-toggle-btn-collapsed"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div
                id="user-profile-summary"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 min-w-0 flex-1 p-1 rounded-md hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-stone-300 dark:bg-stone-700 text-[var(--text-primary)] flex items-center justify-center font-bold text-xs shrink-0">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {user?.email}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <StatusPill role={role || 'hr_head'} />
                  </div>
                </div>
              </div>

              <button
                id="theme-toggle-btn"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0 cursor-pointer"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* User Popover Menu */}
          {isUserMenuOpen && (
            <div
              id="user-popover-menu"
              className={`absolute bottom-full ${
                isCollapsed ? 'left-full ml-3 w-56' : 'left-3 right-3'
              } mb-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--popover-shadow)] py-1 z-50 animate-in fade-in zoom-in-95 duration-100`}
            >
              <div className="px-3 py-1.5 border-b border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
                Signed in as <span className="font-medium text-[var(--text-primary)]">{user?.email}</span>
              </div>

              {role === 'hr_head' && (
                <>
                  <button
                    id="user-menu-invite-btn"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenInviteModal();
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Invite HR Analyst</span>
                  </button>

                  <button
                    id="user-menu-billing-btn"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleNavClick('billing');
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Billing & Subscriptions</span>
                  </button>
                </>
              )}

              <button
                id="user-menu-theme-btn"
                onClick={() => {
                  toggleTheme();
                  setIsUserMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              >
                {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                <span>{theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}</span>
              </button>

              {isPlatformAdmin && onNavigateToPlatformAdmin && (
                <button
                  id="user-menu-platform-admin-btn"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onNavigateToPlatformAdmin();
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-purple-500" />
                  <span className="font-semibold">Operator Console</span>
                </button>
              )}

              <div className="border-t border-[var(--border-subtle)] my-1" />

              <button
                id="user-menu-logout-btn"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  logout();
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
