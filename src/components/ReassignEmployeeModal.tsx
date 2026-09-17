import React, { useState } from 'react';
import { Department, Employee, JobChangeReason } from '../types';
import { useAuth } from '../context/AuthContext';
import { X, GitBranch, ArrowRight, AlertCircle, Sparkles, Building2, User, Calendar, Briefcase } from 'lucide-react';

interface ReassignEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  departments: Department[];
  allEmployees: Employee[];
  onReassigned: (reason: JobChangeReason) => void;
}

export const ReassignEmployeeModal: React.FC<ReassignEmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
  departments,
  allEmployees,
  onReassigned,
}) => {
  const { authFetch } = useAuth();

  const [reason, setReason] = useState<JobChangeReason>('promotion');
  const [newDepartmentId, setNewDepartmentId] = useState<string>(employee.department_id);
  const [newJobTitle, setNewJobTitle] = useState<string>(employee.job_title);
  const [newManagerId, setNewManagerId] = useState<string>(employee.manager_id || '');
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen) {
      setReason('promotion');
      setNewDepartmentId(employee.department_id);
      setNewJobTitle(employee.job_title);
      setNewManagerId(employee.manager_id || '');
      setEffectiveDate(new Date().toISOString().split('T')[0]);
      setError(null);
      setFieldErrors({});
    }
  }, [isOpen, employee]);

  if (!isOpen) return null;

  // Filter eligible managers (exclude self)
  const eligibleManagers = allEmployees.filter((e) => e.id !== employee.id && e.status !== 'offboarded');
  const currentDept = departments.find((d) => d.id === employee.department_id);
  const currentManager = allEmployees.find((e) => e.id === employee.manager_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};
    const trimmedTitle = newJobTitle.trim();
    if (!trimmedTitle) {
      errors.newJobTitle = 'Please provide a valid job title.';
    } else if (trimmedTitle.length < 2) {
      errors.newJobTitle = 'Job title must be at least 2 characters.';
    } else if (trimmedTitle.length > 100) {
      errors.newJobTitle = 'Job title cannot exceed 100 characters.';
    }

    if (!newDepartmentId) {
      errors.newDepartmentId = 'Please select a department.';
    }
    if (!effectiveDate) {
      errors.effectiveDate = 'Please select an effective date.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    try {
      setLoading(true);
      setError(null);

      const res = await authFetch(`/api/employees/${employee.id}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_department_id: newDepartmentId,
          new_job_title: trimmedTitle,
          new_manager_id: newManagerId || null,
          effective_date: effectiveDate,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save reassignment');
      }

      onReassigned(reason);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving reassignment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-100 overflow-y-auto">
      <div
        id="reassign-employee-modal"
        className="w-full max-w-xl bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] shadow-[var(--popover-shadow)] overflow-hidden my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shadow-2xs">
              <GitBranch className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[var(--text-primary)]">Reassign / Promote Employee</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Record role changes, transfers, and manager updates for {employee.name}
              </p>
            </div>
          </div>
          <button
            id="close-reassign-employee-btn"
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current State Summary Card */}
        <div className="px-6 pt-5 pb-3">
          <div className="p-3.5 rounded-lg bg-[var(--bg-subtle)]/60 border border-[var(--border-subtle)] space-y-1.5 text-xs">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Current Assignment
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[var(--text-primary)]">
              <div className="flex items-center gap-1.5 truncate">
                <Briefcase className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                <span className="truncate font-medium">{employee.job_title}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                <span className="truncate">{currentDept?.name || 'Unassigned'}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <User className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                <span className="truncate">Reports to: {currentManager?.name || 'None'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Reason for Change */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Change Reason <span className="text-rose-500">*</span>
            </label>
            <select
              id="reassign-reason-select"
              value={reason}
              onChange={(e) => setReason(e.target.value as JobChangeReason)}
              className="w-full text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] transition-all cursor-pointer font-medium"
            >
              <option value="promotion">Promotion — Seniority elevation or title progression</option>
              <option value="transfer">Transfer — Lateral department or team shift</option>
              <option value="restructure">Restructure — Organizational or reporting realignment</option>
              <option value="demotion">Demotion — Scope adjustment or role reclassification</option>
            </select>
          </div>

          {/* Promotion Shortcut Callout */}
          {reason === 'promotion' && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Promotion compensation tie-in:</span> Upon saving, you'll be offered an optional shortcut to log an updated compensation package right away.
              </div>
            </div>
          )}

          {/* New Job Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="reassign-job-title-input" className="block text-xs font-semibold text-[var(--text-secondary)]">
                New Job Title <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-[var(--text-muted)]">{newJobTitle.length}/100</span>
            </div>
            <input
              id="reassign-job-title-input"
              type="text"
              required
              maxLength={100}
              value={newJobTitle}
              onChange={(e) => {
                setNewJobTitle(e.target.value);
                if (fieldErrors.newJobTitle) setFieldErrors((p) => ({ ...p, newJobTitle: '' }));
              }}
              placeholder="e.g. Lead Software Architect"
              aria-invalid={!!fieldErrors.newJobTitle}
              className={`w-full text-xs rounded-lg border bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-primary)] focus:outline-none transition-all ${
                fieldErrors.newJobTitle
                  ? 'border-rose-500'
                  : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--border-strong)]'
              }`}
            />
            {fieldErrors.newJobTitle && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.newJobTitle}</p>
            )}
          </div>

          {/* Department & Manager Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* New Department */}
            <div>
              <label htmlFor="reassign-department-select" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                New Department <span className="text-rose-500">*</span>
              </label>
              <select
                id="reassign-department-select"
                required
                value={newDepartmentId}
                onChange={(e) => {
                  setNewDepartmentId(e.target.value);
                  if (fieldErrors.newDepartmentId) setFieldErrors((p) => ({ ...p, newDepartmentId: '' }));
                }}
                aria-invalid={!!fieldErrors.newDepartmentId}
                className={`w-full text-xs rounded-lg border bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-primary)] focus:outline-none transition-all cursor-pointer ${
                  fieldErrors.newDepartmentId
                    ? 'border-rose-500'
                    : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--border-strong)]'
                }`}
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              {fieldErrors.newDepartmentId && (
                <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.newDepartmentId}</p>
              )}
            </div>

            {/* New Manager */}
            <div>
              <label htmlFor="reassign-manager-select" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                New Reporting Manager
              </label>
              <select
                id="reassign-manager-select"
                value={newManagerId}
                onChange={(e) => setNewManagerId(e.target.value)}
                className="w-full text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] transition-all cursor-pointer"
              >
                <option value="">None (Top Level / Executive)</option>
                {eligibleManagers.map((mgr) => (
                  <option key={mgr.id} value={mgr.id}>
                    {mgr.name} ({mgr.job_title})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Effective Date */}
          <div>
            <label htmlFor="reassign-effective-date-input" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Effective Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="reassign-effective-date-input"
                type="date"
                required
                value={effectiveDate}
                onChange={(e) => {
                  setEffectiveDate(e.target.value);
                  if (fieldErrors.effectiveDate) setFieldErrors((p) => ({ ...p, effectiveDate: '' }));
                }}
                aria-invalid={!!fieldErrors.effectiveDate}
                className={`w-full text-xs rounded-lg border bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-primary)] focus:outline-none transition-all ${
                  fieldErrors.effectiveDate
                    ? 'border-rose-500'
                    : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--border-strong)]'
                }`}
              />
            </div>
            {fieldErrors.effectiveDate ? (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.effectiveDate}</p>
            ) : (
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                The date when this role change, department transfer, or reporting transition takes official effect.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
            <button
              id="cancel-reassign-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-reassign-btn"
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[var(--accent-blue)] text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Save Reassignment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
