import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { OffboardingReason } from '../types';
import { X, AlertTriangle, ShieldCheck, Calendar, FileText, AlertCircle } from 'lucide-react';

interface StartOffboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  onOffboardingStarted: () => void;
}

export const StartOffboardingModal: React.FC<StartOffboardingModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  jobTitle,
  onOffboardingStarted,
}) => {
  const { authFetch, role } = useAuth();
  const [reason, setReason] = useState<OffboardingReason>('resignation');
  const [lastWorkingDay, setLastWorkingDay] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [exitInterviewNotes, setExitInterviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};
    if (!reason) {
      errors.reason = 'Please select a separation reason.';
    }
    if (!lastWorkingDay) {
      errors.lastWorkingDay = 'Last working day is required.';
    }
    if (exitInterviewNotes.length > 2000) {
      errors.exitInterviewNotes = 'Exit interview notes cannot exceed 2,000 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    try {
      setSubmitting(true);
      setError(null);

      const res = await authFetch(`/api/employees/${employeeId}/offboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          last_working_day: lastWorkingDay,
          exit_interview_notes: exitInterviewNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start offboarding process');
      }

      onOffboardingStarted();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="start-offboarding-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-100"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--popover-shadow)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--text-primary)]">Initiate Offboarding</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                Workflow
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Starting structured checklist for <strong>{employeeName}</strong> ({jobTitle})
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

          {/* Separation Reason */}
          <div>
            <label htmlFor="offboarding-reason-select" className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Separation Reason <span className="text-red-500">*</span>
            </label>
            <select
              id="offboarding-reason-select"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value as OffboardingReason);
                if (fieldErrors.reason) setFieldErrors((p) => ({ ...p, reason: '' }));
              }}
              aria-invalid={!!fieldErrors.reason}
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                fieldErrors.reason
                  ? 'border-rose-500'
                  : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--border-strong)]'
              }`}
              required
            >
              <option value="resignation">Voluntary Resignation</option>
              <option value="termination">Contract Termination</option>
              <option value="retirement">Retirement</option>
              <option value="contract_expiry">End of Fixed-Term Contract</option>
            </select>
            {fieldErrors.reason && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.reason}</p>
            )}
          </div>

          {/* Last Working Day */}
          <div>
            <label htmlFor="offboarding-last-day" className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Last Working Day <span className="text-red-500">*</span>
            </label>
            <input
              id="offboarding-last-day"
              type="date"
              value={lastWorkingDay}
              onChange={(e) => {
                setLastWorkingDay(e.target.value);
                if (fieldErrors.lastWorkingDay) setFieldErrors((p) => ({ ...p, lastWorkingDay: '' }));
              }}
              aria-invalid={!!fieldErrors.lastWorkingDay}
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                fieldErrors.lastWorkingDay
                  ? 'border-rose-500'
                  : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--border-strong)]'
              }`}
              required
            />
            {fieldErrors.lastWorkingDay && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.lastWorkingDay}</p>
            )}
          </div>

          {/* Exit Interview Notes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="offboarding-exit-notes" className="block text-xs font-semibold text-[var(--text-primary)]">
                Initial Exit Interview / Handover Notes
              </label>
              <span className="text-[10px] text-[var(--text-muted)]">{exitInterviewNotes.length}/2000</span>
            </div>
            <textarea
              id="offboarding-exit-notes"
              rows={3}
              maxLength={2000}
              value={exitInterviewNotes}
              onChange={(e) => {
                setExitInterviewNotes(e.target.value);
                if (fieldErrors.exitInterviewNotes) setFieldErrors((p) => ({ ...p, exitInterviewNotes: '' }));
              }}
              placeholder="e.g. Reason for departure, project transition handover point of contact..."
              aria-invalid={!!fieldErrors.exitInterviewNotes}
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors resize-none ${
                fieldErrors.exitInterviewNotes
                  ? 'border-rose-500'
                  : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--border-strong)]'
              }`}
            />
            {fieldErrors.exitInterviewNotes && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.exitInterviewNotes}</p>
            )}
          </div>

          {/* Checklist Preview Box */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-2 text-xs">
            <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Standard 5-Step Offboarding Checklist Generated:</span>
            </div>
            <ul className="space-y-1 text-[11px] text-[var(--text-secondary)] pl-2 list-disc list-inside">
              <li>Confirm last working day & notice period</li>
              <li>Conduct exit interview & document notes</li>
              <li>Asset & equipment recovery (laptop, security tokens)</li>
              <li>Access revocation (Slack, Google Workspace, AWS credentials)</li>
              <li>
                <strong>Final leave balance payout & settlement calculation</strong> (Approved by HR Head)
              </li>
            </ul>
            <div className="text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
              Note: Employee record is retained as <code>offboarded</code>, never deleted.
            </div>
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
              id="confirm-start-offboarding-btn"
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {submitting ? 'Initiating...' : 'Start Offboarding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
