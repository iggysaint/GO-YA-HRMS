import React from 'react';
import { JobHistory, EmployeeWithDetails, JobChangeReason } from '../types';
import {
  History,
  GitBranch,
  ArrowUpRight,
  ArrowRightLeft,
  ArrowDown,
  Sparkles,
  Building2,
  User,
  Calendar,
  Lock,
  Clock,
  Briefcase,
  CheckCircle2,
} from 'lucide-react';

interface JobHistoryBlockProps {
  history: JobHistory[];
  employee: EmployeeWithDetails;
  canReassign: boolean;
  onOpenReassign: () => void;
}

const getReasonBadge = (reason: JobChangeReason) => {
  switch (reason) {
    case 'promotion':
      return {
        label: 'Promotion',
        icon: <ArrowUpRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />,
        className: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
        dotClass: 'bg-emerald-500',
      };
    case 'transfer':
      return {
        label: 'Transfer',
        icon: <ArrowRightLeft className="w-3 h-3 text-blue-600 dark:text-blue-400" />,
        className: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300',
        dotClass: 'bg-blue-500',
      };
    case 'restructure':
      return {
        label: 'Restructure',
        icon: <GitBranch className="w-3 h-3 text-amber-600 dark:text-amber-400" />,
        className: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300',
        dotClass: 'bg-amber-500',
      };
    case 'demotion':
      return {
        label: 'Demotion',
        icon: <ArrowDown className="w-3 h-3 text-rose-600 dark:text-rose-400" />,
        className: 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400',
        dotClass: 'bg-rose-500',
      };
    default:
      return {
        label: 'Role Change',
        icon: <Briefcase className="w-3 h-3 text-stone-500" />,
        className: 'bg-stone-500/10 border-stone-500/30 text-stone-700 dark:text-stone-300',
        dotClass: 'bg-stone-400',
      };
  }
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const JobHistoryBlock: React.FC<JobHistoryBlockProps> = ({
  history,
  employee,
  canReassign,
  onOpenReassign,
}) => {
  return (
    <div
      id="block-job-history"
      className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xs space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-primary)]">
            <History className="w-4 h-4 text-[var(--accent-blue)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                Job History & Role Progression
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-medium">
                {history.length} {history.length === 1 ? 'event' : 'events'}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Chronological record of titles, lateral transfers, and reporting lines
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div>
          {canReassign ? (
            <button
              id="reassign-promote-action-btn"
              onClick={onOpenReassign}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-blue)] text-white text-xs font-medium hover:opacity-90 transition-all shadow-xs cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Reassign / Promote</span>
            </button>
          ) : (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] cursor-not-allowed"
              title="Only HR Head can reassign or promote employees"
            >
              <Lock className="w-3 h-3" />
              <span>Read-only (HR Analyst)</span>
            </div>
          )}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="relative pl-6 ml-2 border-l-2 border-[var(--border-subtle)] space-y-6">
        {/* Node 1: Current Active Role */}
        <div className="relative group">
          {/* Timeline Node Bullet */}
          <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-[var(--bg-surface)] flex items-center justify-center shadow-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          </div>

          <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {employee.job_title}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  Current Role
                </span>
              </div>
              <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-emerald-600" />
                Active now
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                <span>Department: <strong className="text-[var(--text-primary)] font-medium">{employee.department_name || 'Unassigned'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                <span>Manager: <strong className="text-[var(--text-primary)] font-medium">{employee.manager_name || 'None (Top Level)'}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Historical Transitions */}
        {history.map((item) => {
          const badge = getReasonBadge(item.reason);
          const hasTitleChange = item.previous_job_title !== item.new_job_title;
          const hasDeptChange = item.previous_department_name !== item.new_department_name;
          const hasMgrChange = (item.previous_manager_name || 'None') !== (item.new_manager_name || 'None');

          return (
            <div key={item.id} id={`history-item-${item.id}`} className="relative group">
              {/* Timeline Bullet */}
              <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full ring-4 ring-[var(--bg-surface)] ${badge.dotClass}`} />

              <div className="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all space-y-2.5 shadow-2xs">
                {/* Milestone Header */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badge.className}`}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {item.new_job_title}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[var(--text-muted)]" />
                    <span>Effective {formatDate(item.effective_date)}</span>
                  </div>
                </div>

                {/* Transition Delta Breakdown */}
                <div className="space-y-1.5 text-xs">
                  {hasTitleChange && (
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Briefcase className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                      <span>Role:</span>
                      <span className="line-through text-[var(--text-muted)]">{item.previous_job_title}</span>
                      <span className="text-[var(--text-muted)]">→</span>
                      <span className="font-semibold text-[var(--text-primary)]">{item.new_job_title}</span>
                    </div>
                  )}

                  {hasDeptChange && (
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                      <span>Department:</span>
                      <span className="line-through text-[var(--text-muted)]">{item.previous_department_name}</span>
                      <span className="text-[var(--text-muted)]">→</span>
                      <span className="font-medium text-[var(--text-primary)]">{item.new_department_name}</span>
                    </div>
                  )}

                  {hasMgrChange && (
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <User className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                      <span>Reporting Line:</span>
                      <span className="line-through text-[var(--text-muted)]">{item.previous_manager_name || 'None'}</span>
                      <span className="text-[var(--text-muted)]">→</span>
                      <span className="font-medium text-[var(--text-primary)]">{item.new_manager_name || 'None'}</span>
                    </div>
                  )}

                  {!hasTitleChange && !hasDeptChange && !hasMgrChange && (
                    <div className="text-[var(--text-secondary)] text-[11px]">
                      Reassigned in {item.new_department_name} (Reports to {item.new_manager_name || 'None'})
                    </div>
                  )}
                </div>

                {/* Footer metadata */}
                <div className="pt-2 border-t border-[var(--border-subtle)]/60 text-[11px] text-[var(--text-muted)] flex items-center justify-between">
                  <span>Logged by {item.changed_by_name || item.changed_by_email || 'HR Administrator'}</span>
                  <span>{formatDate(item.created_at)}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Node Bottom: Initial Join / Appointment */}
        <div className="relative group">
          <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-stone-400 dark:bg-stone-600 ring-4 ring-[var(--bg-surface)] flex items-center justify-center">
            <CheckCircle2 className="w-2.5 h-2.5 text-white" />
          </div>

          <div className="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 space-y-1 text-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-semibold text-[var(--text-primary)]">
                Joined Company
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                {formatDate(employee.start_date)}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Official start date as {employee.job_title} ({employee.employment_type.replace('_', ' ')})
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
