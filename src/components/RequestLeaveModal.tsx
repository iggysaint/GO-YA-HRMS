import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Employee, LeaveType } from '../types';
import { X, Calendar, AlertCircle, Sparkles, Check, Clock, UserCheck } from 'lucide-react';

interface RequestLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  leaveTypes: LeaveType[];
  preselectedEmployeeId?: string | null;
  onRequestSubmitted: () => void;
}

export const RequestLeaveModal: React.FC<RequestLeaveModalProps> = ({
  isOpen,
  onClose,
  employees,
  leaveTypes,
  preselectedEmployeeId,
  onRequestSubmitted,
}) => {
  const { authFetch, organization } = useAuth();
  const [employeeId, setEmployeeId] = useState<string>('');
  const [leaveTypeId, setLeaveTypeId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Reset fields when opened, keeping employee selected if provided, and all detailed fields completely blank
  useEffect(() => {
    if (isOpen) {
      if (preselectedEmployeeId) {
        setEmployeeId(preselectedEmployeeId);
      } else if (employees.length > 0) {
        setEmployeeId('');
      }
      setLeaveTypeId('');
      setStartDate('');
      setEndDate('');
      setReason('');
      setError(null);
      setFieldErrors({});
    }
  }, [isOpen, preselectedEmployeeId, employees]);

  if (!isOpen) return null;

  // Calculate requested days only when dates are selected
  let calculatedDays = 0;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
      const diffTime = Math.max(0, end.getTime() - start.getTime());
      calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
  }

  const threshold = organization?.leave_escalation_threshold_days ?? 3;
  const isEscalated = calculatedDays > threshold;

  const selectedEmployee = employees.find((e) => e.id === employeeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!employeeId) {
      errors.employeeId = 'Please select an employee.';
    }
    if (!leaveTypeId) {
      errors.leaveTypeId = 'Please select a leave type.';
    }
    if (!startDate) {
      errors.startDate = 'Start date is required.';
    }
    if (!endDate) {
      errors.endDate = 'End date is required.';
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        errors.endDate = 'End date cannot be earlier than start date.';
      }
    }

    if (reason && reason.length > 1000) {
      errors.reason = 'Reason cannot exceed 1,000 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    try {
      setSubmitting(true);
      setError(null);

      const res = await authFetch('/api/leave/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          leave_type_id: leaveTypeId,
          start_date: startDate,
          end_date: endDate,
          reason: reason.trim(),
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (err) {
        // Safe fallback
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit leave request');
      }

      onRequestSubmitted();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="request-leave-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-100"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--popover-shadow)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Submit Leave Request</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {selectedEmployee ? (
                <span>
                  Recording time off for <strong className="text-[var(--text-primary)]">{selectedEmployee.name}</strong>
                </span>
              ) : (
                'Select employee and fill in leave parameters'
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Employee Selection */}
          <div>
            <label htmlFor="leave-employee-select" className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Employee <span className="text-red-500">*</span>
            </label>
            <select
              id="leave-employee-select"
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value);
                if (fieldErrors.employeeId) setFieldErrors((p) => ({ ...p, employeeId: '' }));
              }}
              aria-invalid={!!fieldErrors.employeeId}
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                fieldErrors.employeeId ? 'border-rose-500' : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--border-strong)]'
              }`}
              required
            >
              <option value="">-- Select Employee --</option>
              {employees
                .filter((e) => e.status !== 'offboarded')
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.job_title})
                  </option>
                ))}
            </select>
            {fieldErrors.employeeId && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.employeeId}</p>
            )}
          </div>

          {/* Leave Type Selection - completely blank by default */}
          <div>
            <label htmlFor="leave-type-select" className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Leave Type <span className="text-red-500">*</span>
            </label>
            <select
              id="leave-type-select"
              value={leaveTypeId}
              onChange={(e) => {
                setLeaveTypeId(e.target.value);
                if (fieldErrors.leaveTypeId) setFieldErrors((p) => ({ ...p, leaveTypeId: '' }));
              }}
              aria-invalid={!!fieldErrors.leaveTypeId}
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                fieldErrors.leaveTypeId ? 'border-rose-500' : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--border-strong)]'
              }`}
              required
            >
              <option value="">-- Select Leave Type --</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name} ({lt.default_entitlement_days} days statutory)
                </option>
              ))}
            </select>
            {fieldErrors.leaveTypeId && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.leaveTypeId}</p>
            )}
          </div>

          {/* Date Range - completely blank by default */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="leave-start-date" className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                id="leave-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (fieldErrors.startDate) setFieldErrors((p) => ({ ...p, startDate: '' }));
                }}
                aria-invalid={!!fieldErrors.startDate}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                  fieldErrors.startDate ? 'border-rose-500' : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--border-strong)]'
                }`}
                required
              />
              {fieldErrors.startDate && (
                <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.startDate}</p>
              )}
            </div>
            <div>
              <label htmlFor="leave-end-date" className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                id="leave-end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  if (fieldErrors.endDate) setFieldErrors((p) => ({ ...p, endDate: '' }));
                }}
                aria-invalid={!!fieldErrors.endDate}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                  fieldErrors.endDate ? 'border-rose-500' : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--border-strong)]'
                }`}
                required
              />
              {fieldErrors.endDate && (
                <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.endDate}</p>
              )}
            </div>
          </div>

          {/* Duration & Policy Routing */}
          <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)] font-medium">Duration:</span>
              <span className="font-bold text-[var(--text-primary)]">
                {calculatedDays > 0
                  ? `${calculatedDays} ${calculatedDays === 1 ? 'Working Day' : 'Working Days'}`
                  : '— (Select dates)'}
              </span>
            </div>

            {calculatedDays > 0 ? (
              isEscalated ? (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 pt-1 font-medium">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Exceeds {threshold}-day threshold · Requires authorization from <strong>HR Head</strong>.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 pt-1 font-medium">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Within {threshold}-day threshold · Can be approved by HR Analyst or HR Head.</span>
                </div>
              )
            ) : (
              <p className="text-[11px] text-[var(--text-muted)] pt-0.5">
                Select start and end dates to calculate duration and statutory approval routing.
              </p>
            )}
          </div>

          {/* Reason / Notes - completely blank by default */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="leave-reason-input" className="block text-xs font-semibold text-[var(--text-primary)]">
                Reason / Justification
              </label>
              <span className="text-[10px] text-[var(--text-muted)]">{reason.length}/1000</span>
            </div>
            <textarea
              id="leave-reason-input"
              rows={3}
              maxLength={1000}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (fieldErrors.reason) setFieldErrors((p) => ({ ...p, reason: '' }));
              }}
              placeholder="e.g. Annual scheduled vacation, medical checkup, personal obligation..."
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors resize-none ${
                fieldErrors.reason ? 'border-rose-500' : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--border-strong)]'
              }`}
            />
            {fieldErrors.reason && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.reason}</p>
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="submit-leave-request-btn"
              type="submit"
              disabled={submitting || !employeeId || !leaveTypeId || calculatedDays <= 0}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
