import React, { useState } from 'react';
import { EmployeeCompensation } from '../types';
import { useAuth } from '../context/AuthContext';
import { X, DollarSign, AlertCircle } from 'lucide-react';

interface EditCompensationModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  initialCompensation?: EmployeeCompensation | null;
  onCompensationUpdated: () => void;
}

export const EditCompensationModal: React.FC<EditCompensationModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  initialCompensation,
  onCompensationUpdated,
}) => {
  const { authFetch, organization } = useAuth();
  const [salary, setSalary] = useState(initialCompensation?.salary?.toString() || '');
  const [currency, setCurrency] = useState(initialCompensation?.currency || organization?.currency || 'GHS');
  const [effectiveDate, setEffectiveDate] = useState(
    initialCompensation?.effective_date || new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen) {
      setSalary(initialCompensation?.salary?.toString() || '');
      setCurrency(initialCompensation?.currency || organization?.currency || 'GHS');
      setEffectiveDate(initialCompensation?.effective_date || new Date().toISOString().split('T')[0]);
      setError(null);
      setFieldErrors({});
    }
  }, [isOpen, initialCompensation, organization]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};
    const salaryNum = Number(salary);
    if (!salary || isNaN(salaryNum)) {
      errors.salary = 'Please enter a valid salary amount.';
    } else if (salaryNum < 0) {
      errors.salary = 'Salary cannot be negative.';
    } else if (salaryNum > 100000000) {
      errors.salary = 'Salary amount is unusually large (max 100,000,000).';
    }

    if (!effectiveDate) {
      errors.effectiveDate = 'Effective date is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    try {
      setLoading(true);
      setError(null);

      const res = await authFetch(`/api/employees/${employeeId}/compensation`, {
        method: 'PUT',
        body: JSON.stringify({
          salary: Number(salary),
          currency,
          effective_date: effectiveDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update compensation');
      }

      onCompensationUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-100">
      <div
        id="edit-compensation-modal"
        className="w-full max-w-md bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] shadow-[var(--popover-shadow)] overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[var(--text-primary)]">Edit Compensation</h3>
              <p className="text-xs text-[var(--text-secondary)]">{employeeName}</p>
            </div>
          </div>
          <button
            id="close-edit-compensation-btn"
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="edit-salary-input" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Monthly Base Salary <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-salary-input"
                type="number"
                required
                min="0"
                max="100000000"
                placeholder="e.g. 24000"
                value={salary}
                onChange={(e) => {
                  setSalary(e.target.value);
                  if (fieldErrors.salary) setFieldErrors((p) => ({ ...p, salary: '' }));
                }}
                aria-invalid={!!fieldErrors.salary}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                  fieldErrors.salary
                    ? 'border-rose-500'
                    : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--accent-blue)]'
                }`}
              />
              {fieldErrors.salary && (
                <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.salary}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-currency-select" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Currency
                </label>
                <select
                  id="edit-currency-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                >
                  <option value="GHS">GHS (Ghana Cedi)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="NGN">NGN (₦)</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-effective-date-input" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Effective Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit-effective-date-input"
                  type="date"
                  required
                  value={effectiveDate}
                  onChange={(e) => {
                    setEffectiveDate(e.target.value);
                    if (fieldErrors.effectiveDate) setFieldErrors((p) => ({ ...p, effectiveDate: '' }));
                  }}
                  aria-invalid={!!fieldErrors.effectiveDate}
                  className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                    fieldErrors.effectiveDate
                      ? 'border-rose-500'
                      : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--accent-blue)]'
                  }`}
                />
                {fieldErrors.effectiveDate && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.effectiveDate}</p>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-compensation-btn"
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
            >
              {loading ? 'Saving...' : 'Save Compensation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
