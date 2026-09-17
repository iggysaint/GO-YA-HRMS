import React from 'react';
import { EmployeeStatus, AttritionRisk, Role, TaskPriority } from '../types';

export type PillVariant = 'green' | 'amber' | 'red' | 'gray';

export interface StatusPillProps {
  status?: string | EmployeeStatus;
  risk?: string | AttritionRisk;
  role?: string | Role;
  priority?: string | TaskPriority;
  variant?: PillVariant;
  label?: React.ReactNode;
  children?: React.ReactNode;
  pulseDot?: boolean;
  className?: string;
  id?: string;
  size?: 'sm' | 'md'; // Kept for backward compatibility, rendered consistently per spec
}

/**
 * Normalizes any status, risk, role or action string to one of the 4 strict color meanings:
 * - Green = active/compliant/complete/low-risk (approved, passed, resolved, confirmed, paid, reimbursed)
 * - Amber = pending/on-leave/medium-risk/in-progress (under_review, probation, extended, attention_needed, open, investigating)
 * - Red = overdue/non-compliant/high-risk/rejected (failed, terminated, expired, urgent, critical)
 * - Neutral gray = draft/inactive/not-started (offboarded, closed, cancelled, not_initialized, todo)
 */
export function resolveStatusVariant(rawStatus: string): PillVariant {
  const s = rawStatus.trim().toLowerCase().replace(/[-\s]/g, '_');

  // Green: active / compliant / complete / low-risk
  if (
    s === 'active' ||
    s === 'compliant' ||
    s === 'complete' ||
    s === 'completed' ||
    s === 'low' ||
    s === 'low_risk' ||
    s === 'approved' ||
    s === 'passed' ||
    s === 'confirmed' ||
    s === 'resolved' ||
    s === 'paid' ||
    s === 'reimbursed' ||
    s === 'audited' ||
    s === 'up_to_date' ||
    s === 'yes' ||
    s === 'success'
  ) {
    return 'green';
  }

  // Amber: pending / on-leave / medium-risk / in-progress
  if (
    s === 'pending' ||
    s === 'on_leave' ||
    s === 'onleave' ||
    s === 'leave' ||
    s === 'medium' ||
    s === 'medium_risk' ||
    s === 'in_progress' ||
    s === 'in_review' ||
    s === 'review' ||
    s === 'attention_needed' ||
    s === 'warning' ||
    s === 'expiring_soon' ||
    s === 'due_soon' ||
    s === 'probation' ||
    s === 'extended' ||
    s === 'extend' ||
    s === 'open' ||
    s === 'investigating' ||
    s === 'escalated' ||
    s === 'under_review' ||
    s === 'high_priority'
  ) {
    return 'amber';
  }

  // Red: overdue / non-compliant / high-risk / rejected
  if (
    s === 'overdue' ||
    s === 'non_compliant' ||
    s === 'noncompliant' ||
    s === 'high' ||
    s === 'high_risk' ||
    s === 'rejected' ||
    s === 'failed' ||
    s === 'expired' ||
    s === 'terminate' ||
    s === 'terminated' ||
    s === 'urgent' ||
    s === 'critical' ||
    s === 'written_warning' ||
    s === 'suspension' ||
    s === 'dismissal' ||
    s === 'disciplinary'
  ) {
    return 'red';
  }

  // Neutral gray: draft / inactive / not-started / offboarded
  return 'gray';
}

/**
 * User-friendly label formatting for status pills
 */
export function formatStatusLabel(rawStatus: string): string {
  const s = rawStatus.trim().toLowerCase().replace(/[-\s]/g, '_');

  const knownLabels: Record<string, string> = {
    active: 'Active',
    probation: 'Probation',
    on_leave: 'On Leave',
    offboarded: 'Offboarded',
    low: 'Low Risk',
    low_risk: 'Low Risk',
    medium: 'Medium Risk',
    medium_risk: 'Medium Risk',
    high: 'High Risk',
    high_risk: 'High Risk',
    compliant: 'Compliant',
    attention_needed: 'Attention Needed',
    non_compliant: 'Non-Compliant',
    approved: 'Approved',
    pending: 'Pending',
    rejected: 'Rejected',
    complete: 'Complete',
    completed: 'Completed',
    in_progress: 'In Progress',
    in_review: 'In Review',
    todo: 'To Do',
    not_started: 'Not Started',
    overdue: 'Overdue',
    draft: 'Draft',
    inactive: 'Inactive',
    paid: 'Paid',
    reimbursed: 'Reimbursed',
    confirmed: 'Confirmed',
    confirm: 'Confirmed',
    extend: 'Extended',
    extended: 'Extended',
    terminate: 'Terminated',
    terminated: 'Terminated',
    open: 'Open',
    investigating: 'Investigating',
    resolved: 'Resolved',
    closed: 'Closed',
    cancelled: 'Cancelled',
    not_initialized: 'Not Initialized',
    hr_head: 'HR Head',
    hr_analyst: 'HR Analyst',
  };

  if (knownLabels[s]) {
    return knownLabels[s];
  }

  return rawStatus
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Shared StatusPill Component
 * Strictly enforces design system rules:
 * - Rounded shape (rounded-full)
 * - Small colored dot + text label (never color-only, never text-only)
 * - Fixed 4-color semantic meaning: Green, Amber, Red, Neutral gray
 * - Exactly the same size, padding (px-2.5 py-0.5), font-weight (font-medium), and corner radius everywhere
 */
export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  risk,
  role,
  priority,
  variant: explicitVariant,
  label: explicitLabel,
  children,
  pulseDot,
  className = '',
  id,
}) => {
  // Determine variant
  let resolvedVariant: PillVariant = 'gray';
  let defaultLabel = '';
  let shouldPulse = pulseDot;

  if (explicitVariant) {
    resolvedVariant = explicitVariant;
  } else if (risk) {
    resolvedVariant = resolveStatusVariant(risk);
    defaultLabel = formatStatusLabel(risk);
    if (risk.toLowerCase() === 'high' || risk.toLowerCase() === 'high_risk') {
      shouldPulse = true;
    }
  } else if (priority) {
    const p = priority.toLowerCase();
    resolvedVariant = p === 'urgent' ? 'red' : p === 'high' ? 'amber' : p === 'medium' ? 'amber' : 'gray';
    defaultLabel = formatStatusLabel(priority);
    if (p === 'urgent') {
      shouldPulse = true;
    }
  } else if (status) {
    resolvedVariant = resolveStatusVariant(status);
    defaultLabel = formatStatusLabel(status);
    if (status.toLowerCase().includes('overdue') || status.toLowerCase().includes('urgent')) {
      shouldPulse = true;
    }
  } else if (role) {
    resolvedVariant = role === 'hr_head' ? 'amber' : 'green';
    defaultLabel = formatStatusLabel(role);
  }

  const finalLabel = explicitLabel ?? children ?? defaultLabel;

  // Semantic styles for the 4 colors
  const variantStyles = {
    green: {
      container: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20',
      dot: 'bg-emerald-500 dark:bg-emerald-400',
    },
    amber: {
      container: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20',
      dot: 'bg-amber-500 dark:bg-amber-400',
    },
    red: {
      container: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20',
      dot: 'bg-rose-500 dark:bg-rose-400',
    },
    gray: {
      container: 'bg-stone-500/10 text-stone-700 dark:text-stone-300 border border-stone-500/20',
      dot: 'bg-stone-400 dark:bg-stone-500',
    },
  }[resolvedVariant];

  const pillId =
    id ||
    (status
      ? `status-pill-${status}`
      : risk
      ? `risk-pill-${risk}`
      : role
      ? `role-pill-${role}`
      : undefined);

  return (
    <span
      id={pillId}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${variantStyles.container} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${variantStyles.dot} ${
          shouldPulse ? 'animate-pulse' : ''
        }`}
        aria-hidden="true"
      />
      <span>{finalLabel}</span>
    </span>
  );
};

export const Pill = StatusPill;
export const Badge = StatusPill;
