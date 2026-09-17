import React, { useState } from 'react';
import { Shield, Lock, Unlock, AlertCircle, Check } from 'lucide-react';
import { ExpensePolicy } from '../../types';

interface ExpensePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: ExpensePolicy;
  onSavePolicy: (policy: ExpensePolicy) => Promise<void>;
}

export const ExpensePolicyModal: React.FC<ExpensePolicyModalProps> = ({
  isOpen,
  onClose,
  policy,
  onSavePolicy,
}) => {
  const [restrictAnalyst, setRestrictAnalyst] = useState(
    policy.restrict_analyst_to_own_expenses ?? false
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSavePolicy({
        restrict_analyst_to_own_expenses: restrictAnalyst,
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to save policy', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="expense-policy-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Expense Governance & Restrictions
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                HR Head controls for analyst permissions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm p-1 rounded-md"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-lg p-3.5 text-xs text-[var(--text-secondary)] space-y-1.5">
            <div className="flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Role-Based Access Scope</span>
            </div>
            <p>
              By default, both HR Head and HR Analysts can submit, edit, and view
              all company expenses. As HR Head, you can activate restrictions below.
            </p>
          </div>

          <div className="border border-[var(--border-subtle)] rounded-lg p-4 space-y-3 bg-[var(--bg-card)]">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {restrictAnalyst ? (
                    <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Unlock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Restrict HR Analysts to Own Expenses
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  When enabled, HR Analysts can only view, edit, and manage expenses
                  they personally submitted. All company-wide claims and peer expenses
                  remain confidential to the HR Head.
                </p>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                id="toggle-restrict-analyst"
                role="switch"
                aria-checked={restrictAnalyst}
                onClick={() => setRestrictAnalyst(!restrictAnalyst)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  restrictAnalyst ? 'bg-amber-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    restrictAnalyst ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] flex items-center justify-between">
              <span>Current Status:</span>
              <span
                className={`font-medium px-2 py-0.5 rounded text-[10px] ${
                  restrictAnalyst
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {restrictAnalyst ? 'Strict Isolation Active' : 'Company-wide View Enabled'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-[var(--bg-subtle)] border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            id="save-policy-btn"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-2xs"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Policy Saved</span>
              </>
            ) : isSaving ? (
              <span>Saving...</span>
            ) : (
              <span>Update Policy</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
