import React, { useState, useEffect } from 'react';
import { PDPGoal, PDPStatus } from '../types';
import { X, Target, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';

interface AddPDPGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeId: string;
  employeeName: string;
  existingGoal?: PDPGoal | null;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const STATUS_OPTIONS: { value: PDPStatus; label: string; description: string }[] = [
  { value: 'not_started', label: 'Not Started', description: 'Planned for upcoming cycle' },
  { value: 'in_progress', label: 'In Progress', description: 'Active development / milestone tracking' },
  { value: 'complete', label: 'Complete', description: 'Successfully accomplished and verified' },
];

export const AddPDPGoalModal: React.FC<AddPDPGoalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  employeeId,
  employeeName,
  existingGoal,
  authFetch,
}) => {
  const [goal, setGoal] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');
  const [status, setStatus] = useState<PDPStatus>('not_started');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingGoal) {
      setGoal(existingGoal.goal);
      setTargetDate(existingGoal.target_date);
      setStatus(existingGoal.status);
    } else {
      setGoal('');
      // Default to 3 months from today
      const defaultDate = new Date();
      defaultDate.setMonth(defaultDate.getMonth() + 3);
      setTargetDate(defaultDate.toISOString().split('T')[0]);
      setStatus('not_started');
    }
    setError(null);
    setFieldErrors({});
  }, [existingGoal, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};
    if (!goal.trim()) {
      errors.goal = 'Please provide a goal description.';
    } else if (goal.trim().length < 5) {
      errors.goal = 'Goal description must be at least 5 characters.';
    } else if (goal.trim().length > 500) {
      errors.goal = 'Goal description cannot exceed 500 characters.';
    }

    if (!targetDate) {
      errors.targetDate = 'Target completion date is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    try {
      setLoading(true);
      setError(null);

      const payload = {
        goal: goal.trim(),
        target_date: targetDate,
        status,
      };

      const url = existingGoal
        ? `/api/performance/pdp-goals/${existingGoal.id}`
        : `/api/employees/${employeeId}/performance/pdp-goals`;

      const method = existingGoal ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save PDP goal');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="modal-add-pdp-goal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {existingGoal ? 'Edit PDP Goal' : 'Add Personal Development Plan (PDP) Goal'}
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Employee: <strong className="text-[var(--text-primary)]">{employeeName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Goal Statement */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="pdp-goal-statement" className="block font-medium text-[var(--text-primary)]">
                Development Goal Statement <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-[var(--text-muted)]">{goal.length}/500</span>
            </div>
            <textarea
              id="pdp-goal-statement"
              rows={3}
              maxLength={500}
              value={goal}
              onChange={(e) => {
                setGoal(e.target.value);
                if (fieldErrors.goal) setFieldErrors((p) => ({ ...p, goal: '' }));
              }}
              placeholder="e.g. Complete AWS Solutions Architect certification, or lead cross-functional architecture reviews..."
              aria-invalid={!!fieldErrors.goal}
              className={`w-full px-3 py-2 rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors placeholder:text-[var(--text-muted)] resize-none ${
                fieldErrors.goal
                  ? 'border-rose-500'
                  : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
              }`}
              required
            />
            {fieldErrors.goal && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.goal}</p>
            )}
          </div>

          {/* Target Completion Date */}
          <div>
            <label htmlFor="pdp-target-date" className="block font-medium text-[var(--text-primary)] mb-1">
              Target Completion Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="pdp-target-date"
                type="date"
                value={targetDate}
                onChange={(e) => {
                  setTargetDate(e.target.value);
                  if (fieldErrors.targetDate) setFieldErrors((p) => ({ ...p, targetDate: '' }));
                }}
                aria-invalid={!!fieldErrors.targetDate}
                className={`w-full px-3 py-2 rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                  fieldErrors.targetDate
                    ? 'border-rose-500'
                    : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
                }`}
                required
              />
            </div>
            {fieldErrors.targetDate && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.targetDate}</p>
            )}
          </div>

          {/* Status Selection */}
          <div>
            <label className="block font-medium text-[var(--text-primary)] mb-1.5">
              Goal Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const selected = status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                      selected
                        ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] font-semibold shadow-xs'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="text-xs">{opt.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-submit-pdp-goal"
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-[var(--accent-blue)] text-white font-medium hover:opacity-90 transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{existingGoal ? 'Update Goal' : 'Add PDP Goal'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
