import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Employee, LeaveType } from '../types';
import { X, Sliders, AlertCircle, Sparkles } from 'lucide-react';

interface AdjustLeaveBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  leaveTypes: LeaveType[];
  initialEmployeeId?: string | null;
  onAdjusted: () => void;
}

export const AdjustLeaveBalanceModal: React.FC<AdjustLeaveBalanceModalProps> = ({
  isOpen,
  onClose,
  employees,
  leaveTypes,
  initialEmployeeId,
  onAdjusted,
}) => {
  const { authFetch } = useAuth();

  const [employeeId, setEmployeeId] = useState(initialEmployeeId || '');
  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.id || '');
  const [adjustmentDays, setAdjustmentDays] = useState<number | string>(1);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialEmployeeId) {
      setEmployeeId(initialEmployeeId);
    } else if (employees.length > 0 && !employeeId) {
      setEmployeeId(employees[0].id);
    }
  }, [initialEmployeeId, employees, employeeId]);

  useEffect(() => {
    if (leaveTypes.length > 0 && !leaveTypeId) {
      setLeaveTypeId(leaveTypes[0].id);
    }
  }, [leaveTypes, leaveTypeId]);

  useEffect(() => {
    setError(null);
    setFieldErrors({});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};
    if (!employeeId) {
      errors.employeeId = 'Please select an employee.';
    }
    if (!leaveTypeId) {
      errors.leaveTypeId = 'Please select a leave type.';
    }
    const daysNum = Number(adjustmentDays);
    if (adjustmentDays === '' || isNaN(daysNum) || daysNum === 0) {
      errors.adjustmentDays = 'Adjustment days must be a non-zero number.';
    } else if (daysNum < -365 || daysNum > 365) {
      errors.adjustmentDays = 'Adjustment days must be between -365 and +365.';
    }

    if (!notes.trim()) {
      errors.notes = 'Audit reason / notes are required.';
    } else if (notes.trim().length < 3) {
      errors.notes = 'Audit reason must be at least 3 characters.';
    } else if (notes.trim().length > 500) {
      errors.notes = 'Audit reason cannot exceed 500 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    try {
      setLoading(true);
      setError(null);

      const res = await authFetch('/api/leave/balances/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          leave_type_id: leaveTypeId,
          adjustment_days: Number(adjustmentDays),
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to adjust balance');
      }

      onAdjusted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-xs animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-subtle)]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
              <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">Adjust Employee Leave Balance</h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Credit bonus days, carryover, or correct entitlement balance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="adjust-employee-select" className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Employee <span className="text-red-500">*</span>
            </label>
            <select
              id="adjust-employee-select"
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value);
                if (fieldErrors.employeeId) setFieldErrors((p) => ({ ...p, employeeId: '' }));
              }}
              aria-invalid={!!fieldErrors.employeeId}
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                fieldErrors.employeeId
                  ? 'border-rose-500'
                  : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--border-strong)]'
              }`}
            >
              <option value="">Select an employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.job_title})
                </option>
              ))}
            </select>
            {fieldErrors.employeeId && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.employeeId}</p>
            )}
          </div>

          <div>
            <label htmlFor="adjust-leave-type-select" className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Leave Type <span className="text-red-500">*</span>
            </label>
            <select
              id="adjust-leave-type-select"
              value={leaveTypeId}
              onChange={(e) => {
                setLeaveTypeId(e.target.value);
                if (fieldErrors.leaveTypeId) setFieldErrors((p) => ({ ...p, leaveTypeId: '' }));
              }}
              aria-invalid={!!fieldErrors.leaveTypeId}
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                fieldErrors.leaveTypeId
                  ? 'border-rose-500'
                  : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--border-strong)]'
              }`}
            >
              <option value="">Select leave type...</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name} (Statutory: {lt.default_entitlement_days}d)
                </option>
              ))}
            </select>
            {fieldErrors.leaveTypeId && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.leaveTypeId}</p>
            )}
          </div>

          <div>
            <label htmlFor="adjust-days-input" className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Adjustment Days (+ to credit, - to deduct) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                id="adjust-days-input"
                type="number"
                step="1"
                min="-365"
                max="365"
                required
                value={adjustmentDays}
                onChange={(e) => {
                  setAdjustmentDays(e.target.value);
                  if (fieldErrors.adjustmentDays) setFieldErrors((p) => ({ ...p, adjustmentDays: '' }));
                }}
                placeholder="+2 or -1"
                aria-invalid={!!fieldErrors.adjustmentDays}
                className={`w-32 px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                  fieldErrors.adjustmentDays
                    ? 'border-rose-500'
                    : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--border-strong)]'
                }`}
              />
              <span className="text-xs text-[var(--text-secondary)]">
                {Number(adjustmentDays) > 0
                  ? `Credits ${adjustmentDays} additional days`
                  : Number(adjustmentDays) < 0
                  ? `Deducts ${Math.abs(Number(adjustmentDays))} days`
                  : ''}
              </span>
            </div>
            {fieldErrors.adjustmentDays && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.adjustmentDays}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="adjust-notes-input" className="block text-xs font-semibold text-[var(--text-primary)]">
                Audit Reason / Notes <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-[var(--text-muted)]">{notes.length}/500</span>
            </div>
            <textarea
              id="adjust-notes-input"
              rows={2}
              maxLength={500}
              required
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (fieldErrors.notes) setFieldErrors((p) => ({ ...p, notes: '' }));
              }}
              placeholder="e.g. Approved carryover from previous financial year, or compensation day off"
              aria-invalid={!!fieldErrors.notes}
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors resize-none ${
                fieldErrors.notes
                  ? 'border-rose-500'
                  : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--border-strong)]'
              }`}
            />
            {fieldErrors.notes && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.notes}</p>
            )}
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Applying...' : 'Apply Balance Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
