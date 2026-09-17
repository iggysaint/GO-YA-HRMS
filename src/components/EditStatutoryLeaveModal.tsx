import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LeaveType } from '../types';
import { X, ShieldCheck, AlertCircle, Sparkles, Check } from 'lucide-react';

interface EditStatutoryLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveType: LeaveType | null; // null if creating a new one
  onSaved: () => void;
}

export const EditStatutoryLeaveModal: React.FC<EditStatutoryLeaveModalProps> = ({
  isOpen,
  onClose,
  leaveType,
  onSaved,
}) => {
  const { authFetch, organization } = useAuth();

  const isEditing = Boolean(leaveType);
  const [name, setName] = useState('');
  const [defaultDays, setDefaultDays] = useState<number | string>(15);
  const [description, setDescription] = useState('');
  const [paid, setPaid] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (leaveType) {
      setName(leaveType.name);
      setDefaultDays(leaveType.default_entitlement_days);
      setDescription(leaveType.description || '');
      setPaid(leaveType.paid !== undefined ? leaveType.paid : true);
      setUpdateExisting(true);
    } else {
      setName('');
      setDefaultDays(15);
      setDescription('');
      setPaid(true);
      setUpdateExisting(true);
    }
    setError(null);
    setFieldErrors({});
  }, [leaveType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};
    const trimmedName = name.trim();
    if (!trimmedName) {
      errors.name = 'Please provide a statutory leave type name.';
    } else if (trimmedName.length < 2) {
      errors.name = 'Leave type name must be at least 2 characters.';
    } else if (trimmedName.length > 100) {
      errors.name = 'Leave type name cannot exceed 100 characters.';
    }

    const daysNum = Number(defaultDays);
    if (defaultDays === '' || isNaN(daysNum) || daysNum < 0) {
      errors.defaultDays = 'Default entitlement days must be a non-negative number.';
    } else if (daysNum > 365) {
      errors.defaultDays = 'Entitlement days cannot exceed 365 days per year.';
    }

    if (description.length > 1000) {
      errors.description = 'Description cannot exceed 1,000 characters.';
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
        name: trimmedName,
        default_entitlement_days: daysNum,
        description: description.trim(),
        paid,
        update_existing_balances: isEditing ? updateExisting : undefined,
      };

      const url = isEditing ? `/api/leave/types/${leaveType!.id}` : '/api/leave/types';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save statutory leave entitlement');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-xs animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-subtle)]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                {isEditing ? 'Edit Statutory Leave Entitlement' : 'Add Statutory Leave Type'}
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {organization?.country || 'Statutory'} labor standard baseline configuration
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Leave Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="statutory-leave-name" className="block text-xs font-semibold text-[var(--text-primary)]">
                Leave Entitlement Name <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-[var(--text-muted)]">{name.length}/100</span>
            </div>
            <input
              id="statutory-leave-name"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: '' }));
              }}
              placeholder="e.g. Annual Vacation, Statutory Sick Leave, Study Leave"
              aria-invalid={!!fieldErrors.name}
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                fieldErrors.name
                  ? 'border-rose-500'
                  : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--border-strong)]'
              }`}
            />
            {fieldErrors.name && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.name}</p>
            )}
          </div>

          {/* Statutory Days per year */}
          <div>
            <label htmlFor="statutory-leave-days" className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Statutory Baseline Allocation (Days / Year) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                id="statutory-leave-days"
                type="number"
                min={0}
                max={365}
                required
                value={defaultDays}
                onChange={(e) => {
                  setDefaultDays(e.target.value);
                  if (fieldErrors.defaultDays) setFieldErrors((p) => ({ ...p, defaultDays: '' }));
                }}
                aria-invalid={!!fieldErrors.defaultDays}
                className={`w-32 px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                  fieldErrors.defaultDays
                    ? 'border-rose-500'
                    : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--border-strong)]'
                }`}
              />
              <span className="text-xs text-[var(--text-secondary)]">working days per calendar year</span>
            </div>
            {fieldErrors.defaultDays && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.defaultDays}</p>
            )}
          </div>

          {/* Paid vs Unpaid */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              Payroll Compensation Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaid(true)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  paid
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-[var(--text-primary)] font-medium'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Paid Time Off</span>
                  {paid && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-1">
                  Salaried & basic payroll disbursements continue normally
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaid(false)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  !paid
                    ? 'border-amber-500/50 bg-amber-500/10 text-[var(--text-primary)] font-medium'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-600 dark:text-amber-400">Unpaid Leave</span>
                  {!paid && <Check className="w-3.5 h-3.5 text-amber-600" />}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-1">
                  Approved absence without payroll entitlement
                </div>
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="statutory-leave-desc" className="block text-xs font-semibold text-[var(--text-primary)]">
                Statutory Description & Guidelines
              </label>
              <span className="text-[10px] text-[var(--text-muted)]">{description.length}/1000</span>
            </div>
            <textarea
              id="statutory-leave-desc"
              rows={2}
              maxLength={1000}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (fieldErrors.description) setFieldErrors((p) => ({ ...p, description: '' }));
              }}
              placeholder="e.g. In accordance with Ghana Labour Act 2003 (Act 651) Section 20..."
              aria-invalid={!!fieldErrors.description}
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors resize-none ${
                fieldErrors.description
                  ? 'border-rose-500'
                  : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--border-strong)]'
              }`}
            />
            {fieldErrors.description && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.description}</p>
            )}
          </div>

          {/* Sync existing employees checkbox when editing */}
          {isEditing && (
            <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1.5">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                  className="mt-0.5 rounded text-[var(--text-primary)] focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="font-semibold text-[var(--text-primary)]">
                    Synchronize Active Employee Records
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Update baseline allocated days for all active employees and recalculate remaining balances (
                    <code>balance = new allocation - used days</code>). Recorded in audit ledger.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Actions */}
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
              {loading ? 'Saving Policy...' : isEditing ? 'Update Statutory Entitlement' : 'Create Leave Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
