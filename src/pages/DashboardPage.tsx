import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { DashboardKPIs, AttentionItem } from '../types';
import { StatusPill } from '../components/StatusPill';
import {
  Users,
  UserCheck,
  CalendarDays,
  AlertTriangle,
  ArrowRight,
  Plus,
  Radio,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Building,
  Clock,
  Palmtree,
  CheckSquare,
  UserX,
  Network,
  BarChart3,
  Banknote,
  FolderKanban,
  Video,
  Globe,
  PartyPopper,
  GraduationCap,
  Briefcase,
} from 'lucide-react';
import { CompanyEventWithDetails, EventType } from '../types';

interface DashboardPageProps {
  onNavigateToDirectory: () => void;
  onNavigateToOnboarding: () => void;
  onNavigateToAttendance: () => void;
  onNavigateToLeave: () => void;
  onNavigateToPayroll?: () => void;
  onNavigateToCompliance?: () => void;
  onNavigateToDocuments?: () => void;
  onNavigateToOrgChart?: () => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToAIAssistant?: () => void;
  onNavigateToEvents?: () => void;
  onNavigateToConduct?: (incidentId?: string, employeeId?: string) => void;
  onOpenAddEmployee: () => void;
  onSelectEmployee: (empId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToDirectory,
  onNavigateToOnboarding,
  onNavigateToAttendance,
  onNavigateToLeave,
  onNavigateToPayroll,
  onNavigateToCompliance,
  onNavigateToDocuments,
  onNavigateToOrgChart,
  onNavigateToAnalytics,
  onNavigateToAIAssistant,
  onNavigateToEvents,
  onNavigateToConduct,
  onOpenAddEmployee,
  onSelectEmployee,
}) => {
  const { authFetch, organization, role, subscribeToRealtime, isRealtimeConnected } = useAuth();
  const [kpis, setKpis] = useState<DashboardKPIs>({
    total_employees: 0,
    active_count: 0,
    on_leave_count: 0,
    high_attrition_risk_count: 0,
  });
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CompanyEventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await authFetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        setKpis(data.kpis);
        setAttentionItems(data.attention_items || []);
        setUpcomingEvents(data.upcoming_events || []);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Subscribe to live realtime events
  useEffect(() => {
    const unsubscribe = subscribeToRealtime((payload) => {
      fetchDashboardData();
    });
    return unsubscribe;
  }, [subscribeToRealtime, fetchDashboardData]);

  const handleAttentionClick = (item: AttentionItem) => {
    if (item.type === 'conduct_incident' || item.action_type === 'conduct') {
      if (onNavigateToConduct) {
        onNavigateToConduct(item.metadata?.incident_id, item.employee_id);
      } else {
        onSelectEmployee(item.employee_id);
      }
    } else if (item.type === 'leave_request' || item.action_type === 'leave') {
      onNavigateToLeave();
    } else if (item.type === 'onboarding_task' || item.action_type === 'onboarding') {
      onNavigateToOnboarding();
    } else {
      onSelectEmployee(item.employee_id);
    }
  };

  const formatEventDate = (startIso: string, endIso: string) => {
    try {
      const start = new Date(startIso);
      const end = new Date(endIso);
      const month = start.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      const day = start.getDate();
      const weekday = start.toLocaleDateString('en-US', { weekday: 'short' });
      const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return { month, day, weekday, timeStr };
    } catch {
      return { month: '---', day: '--', weekday: '', timeStr: '' };
    }
  };

  const renderEventTypeBadge = (type: EventType) => {
    switch (type) {
      case 'holiday':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/70">
            <PartyPopper className="w-2.5 h-2.5" />
            <span>Holiday</span>
          </span>
        );
      case 'meeting':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/70">
            <Briefcase className="w-2.5 h-2.5" />
            <span>Meeting</span>
          </span>
        );
      case 'social':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Social</span>
          </span>
        );
      case 'training':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70">
            <GraduationCap className="w-2.5 h-2.5" />
            <span>Training</span>
          </span>
        );
    }
  };

  return (
    <div id="dashboard-page" className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Top Header / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Dashboard</h1>
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
            {organization?.name} · {organization?.country} ({organization?.currency}) · {role === 'hr_head' ? 'HR Head View' : 'HR Analyst View'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="dashboard-add-employee-btn"
            onClick={onOpenAddEmployee}
            className="px-3.5 py-2 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees */}
        <div
          id="kpi-card-total"
          onClick={onNavigateToDirectory}
          className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Employees</span>
            <div className="p-1.5 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-primary)] group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {loading ? '-' : kpis.total_employees}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center gap-1">
            <span>In current workspace</span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
          </div>
        </div>

        {/* Active Count */}
        <div
          id="kpi-card-active"
          onClick={onNavigateToDirectory}
          className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Count</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {loading ? '-' : kpis.active_count}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <span>Active & Probation</span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
          </div>
        </div>

        {/* On Leave Count */}
        <div
          id="kpi-card-on-leave"
          onClick={onNavigateToLeave}
          className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">On Leave Today</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <Palmtree className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {loading ? '-' : kpis.on_leave_count}
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
            <span>Away on statutory leave</span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
          </div>
        </div>

        {/* High Attrition Risk */}
        <div
          id="kpi-card-risk"
          onClick={onNavigateToDirectory}
          className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">High Attrition Risk</span>
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {loading ? '-' : kpis.high_attrition_risk_count}
          </div>
          <div className="text-[11px] text-red-600 dark:text-red-400 mt-1 flex items-center gap-1 font-medium">
            <span>{kpis.high_attrition_risk_count > 0 ? 'Requires attention' : 'Retention healthy'}</span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
          </div>
        </div>
      </div>

      {/* Empty State for Brand New Workspaces with 0 Employees */}
      {!loading && kpis.total_employees === 0 ? (
        <div
          id="dashboard-empty-state"
          className="p-10 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] text-center space-y-4 shadow-xs"
        >
          <div className="w-12 h-12 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-secondary)]">
            <Users className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-semibold text-base text-[var(--text-primary)]">
              Welcome to {organization?.name}!
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Your workspace is ready. Add your first employee to populate directory records, initialize onboarding checklists, and track real-time attendance.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button
              id="empty-state-add-first-employee-btn"
              onClick={onOpenAddEmployee}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add your first employee</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* "Needs your attention" List Block */}
          <div
            id="needs-attention-block"
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs flex flex-col"
          >
            <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[var(--text-primary)]">Needs your attention</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  {attentionItems.length} {attentionItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <span className="text-[11px] text-[var(--text-muted)]">
                Live updates via Realtime SSE
              </span>
            </div>

            <div className="divide-y divide-[var(--border-subtle)] flex-1">
              {attentionItems.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <div className="text-xs font-medium text-[var(--text-primary)]">All clear!</div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    No active retention warnings, pending leave requests, or settlement approvals requiring action.
                  </div>
                </div>
              ) : (
                attentionItems.map((item) => (
                  <div
                    key={item.id}
                    id={`attention-item-${item.id}`}
                    onClick={() => handleAttentionClick(item)}
                    className="px-6 py-3.5 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          item.severity === 'high'
                            ? 'bg-red-500 animate-pulse'
                            : item.severity === 'medium'
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] truncate">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors flex items-center gap-1">
                        {item.type === 'conduct_incident'
                          ? 'Review incident'
                          : item.type === 'pending_leave'
                          ? 'Review leave'
                          : item.type === 'incomplete_onboarding'
                          ? 'View onboarding'
                          : item.type === 'probation'
                          ? 'Review probation'
                          : 'View profile'}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* "Upcoming Events" Widget (Milestone 9) */}
          <div
            id="upcoming-events-widget"
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs flex flex-col"
          >
            <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[var(--text-secondary)]" />
                <span className="font-semibold text-sm text-[var(--text-primary)]">Upcoming Events</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  {upcomingEvents.length} {upcomingEvents.length === 1 ? 'event' : 'events'}
                </span>
              </div>
              {onNavigateToEvents && (
                <button
                  id="dashboard-view-all-events-btn"
                  onClick={onNavigateToEvents}
                  className="text-xs text-[var(--accent-blue)] hover:underline font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>View schedule</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="divide-y divide-[var(--border-subtle)] flex-1">
              {upcomingEvents.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <CalendarDays className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                  <div className="text-xs font-medium text-[var(--text-primary)]">No upcoming events</div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    All company and department schedules are clear for this period.
                  </div>
                  {onNavigateToEvents && (
                    <button
                      onClick={onNavigateToEvents}
                      className="mt-2 text-xs text-[var(--accent-blue)] hover:underline font-medium cursor-pointer"
                    >
                      Schedule an event
                    </button>
                  )}
                </div>
              ) : (
                upcomingEvents.map((evt) => {
                  const dt = formatEventDate(evt.start_datetime, evt.end_datetime);
                  return (
                    <div
                      key={evt.id}
                      id={`dashboard-event-${evt.id}`}
                      onClick={onNavigateToEvents}
                      className="px-6 py-3.5 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Date badge */}
                        <div className="shrink-0 w-11 py-1 px-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-center shadow-2xs">
                          <div className="text-[9px] uppercase font-bold text-[var(--accent-blue)]">
                            {dt.month}
                          </div>
                          <div className="text-sm font-extrabold text-[var(--text-primary)] leading-none mt-0.5">
                            {dt.day}
                          </div>
                        </div>

                        {/* Event Title & Metadata */}
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors truncate">
                              {evt.title}
                            </span>
                            {renderEventTypeBadge(evt.event_type)}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] flex-wrap">
                            <span>{dt.timeStr}</span>
                            <span>·</span>
                            {evt.visibility_scope === 'company' ? (
                              <span className="text-[var(--text-muted)]">Whole Company</span>
                            ) : (
                              <span className="text-cyan-700 dark:text-cyan-300 font-medium">
                                {evt.department_name || 'Department'}
                              </span>
                            )}
                            <span>·</span>
                            <span className="truncate max-w-[130px] text-[var(--text-muted)]">
                              {evt.location}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Ops Jump Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={onNavigateToAIAssistant}
          className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-amber-600" />
          </div>
          <div className="mt-2">
            <div className="font-bold text-xs text-[var(--text-primary)]">AI Assistant</div>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">
              Labor laws & Q&A
            </p>
          </div>
        </div>

        <div
          onClick={onNavigateToAnalytics}
          className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-1.5 rounded-lg bg-stone-500/10 text-stone-700 dark:text-stone-300">
              <BarChart3 className="w-4 h-4" />
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="mt-2">
            <div className="font-bold text-xs text-[var(--text-primary)]">Analytics</div>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">
              Turnover & headcount
            </p>
          </div>
        </div>

        <div
          onClick={onNavigateToOrgChart}
          className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-1.5 rounded-lg bg-stone-500/10 text-stone-700 dark:text-stone-300">
              <Network className="w-4 h-4" />
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="mt-2">
            <div className="font-bold text-xs text-[var(--text-primary)]">Org Chart</div>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">
              Visual tree & reports
            </p>
          </div>
        </div>

        <div
          onClick={onNavigateToOnboarding}
          className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <CheckSquare className="w-4 h-4" />
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="mt-2">
            <div className="font-bold text-xs text-[var(--text-primary)]">Onboarding</div>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">
              Kanban & checklists
            </p>
          </div>
        </div>

        <div
          onClick={onNavigateToAttendance}
          className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="mt-2">
            <div className="font-bold text-xs text-[var(--text-primary)]">Attendance</div>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">
              Daily clock & logs
            </p>
          </div>
        </div>

        <div
          onClick={onNavigateToLeave}
          className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Palmtree className="w-4 h-4" />
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="mt-2">
            <div className="font-bold text-xs text-[var(--text-primary)]">Leave & PTO</div>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">
              Statutory balances
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
