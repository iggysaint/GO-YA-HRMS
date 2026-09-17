import React, { useState, useEffect } from 'react';
import { ProbationRecord, ProbationOutcome, Role } from '../types';
import {
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserX,
  Lock,
  Calendar,
  UserCheck,
  AlertCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';

interface RecordProbationReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeId: string;
  employeeName: string;
  mode: 'mid_review' | 'end_review' | 'initialize';
  probationRecord: ProbationRecord | null;
  role: Role;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export const RecordProbationReviewModal: React.FC<RecordProbationReviewModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  employeeId,
  employeeName,
  mode,
  probationRecord,
  role,
  authFetch,
}) => {
  const isHrHead = role === 'hr_head';

  // Initialize fields
  const [probationMonths, setProbationMonths] = useState<number>(3);
  const [probationStart, setProbationStart] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [initRemarks, setInitRemarks] = useState<string>('');

  // Mid review fields
  const [midReviewDate, setMidReviewDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [midReviewer, setMidReviewer] = useState<string>('');
  const [midNotes, setMidNotes] = useState<string>('');

  // End review fields
  const [endReviewDate, setEndReviewDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [endReviewer, setEndReviewer] = useState<string>('');
  const [endRemarks, setEndRemarks] = useState<string>('');
  const [outcome, setOutcome] = useState<ProbationOutcome | ''>('');
  const [extensionMonths, setExtensionMonths] = useState<number>(1);
  const [confirmationDate, setConfirmationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (probationRecord) {
      setProbationMonths(probationRecord.probation_period_months || 3);
      setProbationStart(probationRecord.probation_start);
      setInitRemarks(probationRecord.remarks || '');

      setMidReviewDate(probationRecord.mid_review_date || new Date().toISOString().split('T')[0]);
      setMidReviewer(probationRecord.mid_reviewer || '');
      setMidNotes(probationRecord.mid_review_notes || '');

      setEndReviewDate(probationRecord.end_review_date || new Date().toISOString().split('T')[0]);
      setEndReviewer(probationRecord.end_reviewer || '');
      setEndRemarks(probationRecord.remarks || '');
      setOutcome(probationRecord.outcome || '');
      setExtensionMonths(probationRecord.extension_months || 1);
      setConfirmationDate(
        probationRecord.confirmation_date || new Date().toISOString().split('T')[0]
      );
    } else {
      setProbationMonths(3);
      setProbationStart(new Date().toISOString().split('T')[0]);
      setInitRemarks('');
      setMidReviewDate(new Date().toISOString().split('T')[0]);
      setMidReviewer('');
      setMidNotes('');
      setEndReviewDate(new Date().toISOString().split('T')[0]);
      setEndReviewer('');
      setEndRemarks('');
      setOutcome('');
      setExtensionMonths(1);
      setConfirmationDate(new Date().toISOString().split('T')[0]);
    }
    setError(null);
    setFieldErrors({});
  }, [probationRecord, isOpen, mode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};

    if (mode === 'initialize') {
      if (!probationStart) {
        errors.probationStart = 'Probation start date is required.';
      }
      if (initRemarks.length > 1000) {
        errors.initRemarks = 'Remarks cannot exceed 1,000 characters.';
      }
    } else if (mode === 'mid_review') {
      if (!midReviewDate) {
        errors.midReviewDate = 'Review date is required.';
      }
      if (midReviewer.length > 100) {
        errors.midReviewer = 'Reviewer name cannot exceed 100 characters.';
      }
      if (!midNotes.trim()) {
        errors.midNotes = 'Mid-point review notes are required.';
      } else if (midNotes.trim().length < 5) {
        errors.midNotes = 'Notes must be at least 5 characters.';
      } else if (midNotes.trim().length > 2000) {
        errors.midNotes = 'Notes cannot exceed 2,000 characters.';
      }
    } else if (mode === 'end_review') {
      if (!endReviewDate) {
        errors.endReviewDate = 'End review date is required.';
      }
      if (endReviewer.length > 100) {
        errors.endReviewer = 'Reviewer name cannot exceed 100 characters.';
      }
      if (endRemarks.length > 2000) {
        errors.endRemarks = 'Remarks cannot exceed 2,000 characters.';
      }
      if (isHrHead && outcome === 'confirm' && !confirmationDate) {
        errors.confirmationDate = 'Permanent confirmation date is required.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      if (mode === 'initialize') {
        const res = await authFetch(`/api/employees/${employeeId}/probation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            probation_period_months: probationMonths,
            probation_start: probationStart,
            remarks: initRemarks.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to initialize probation record');
      } else if (mode === 'mid_review') {
        const res = await authFetch(`/api/employees/${employeeId}/probation/mid-review`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mid_review_date: midReviewDate,
            mid_reviewer: midReviewer.trim(),
            mid_review_notes: midNotes.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to record mid-probation review');
      } else if (mode === 'end_review') {
        // Enforce role check on client as well, backed up by backend RLS
        if (outcome && !isHrHead) {
          throw new Error(
            'Permission Denied: Only HR Head can set the final probation outcome (confirm, extend, or terminate).'
          );
        }

        const payload: any = {
          end_review_date: endReviewDate,
          end_reviewer: endReviewer.trim(),
          remarks: endRemarks.trim(),
        };

        if (outcome && isHrHead) {
          payload.outcome = outcome;
          if (outcome === 'extend') {
            payload.extension_months = extensionMonths;
          } else if (outcome === 'confirm') {
            payload.confirmation_date = confirmationDate;
          }
        }

        const res = await authFetch(`/api/employees/${employeeId}/probation/end-review`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to record end-of-probation review');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving probation review:', err);
      setError(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="probation-review-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
    >
      <div
        id="probation-review-modal"
        className="w-full max-w-lg rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden animate-scale-up"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {mode === 'initialize'
                  ? 'Set Probation Terms'
                  : mode === 'mid_review'
                  ? 'Record Mid-Probation Review'
                  : 'End-of-Probation Review & Decision'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">{employeeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div
              id="probation-modal-error"
              className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode 1: Initialize Probation */}
          {mode === 'initialize' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Probation Duration (Months)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 6, 9].map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setProbationMonths(m)}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        probationMonths === m
                          ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] font-bold'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      {m} Months
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="probation-start-date" className="text-xs font-semibold text-[var(--text-primary)]">
                  Probation Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  id="probation-start-date"
                  type="date"
                  value={probationStart}
                  onChange={(e) => {
                    setProbationStart(e.target.value);
                    if (fieldErrors.probationStart) setFieldErrors((p) => ({ ...p, probationStart: '' }));
                  }}
                  required
                  aria-invalid={!!fieldErrors.probationStart}
                  className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                    fieldErrors.probationStart
                      ? 'border-rose-500'
                      : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
                  }`}
                />
                {fieldErrors.probationStart && (
                  <p className="text-[11px] text-rose-500 font-medium">{fieldErrors.probationStart}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="probation-init-remarks" className="text-xs font-semibold text-[var(--text-primary)]">
                    Initial Remarks & Evaluation Focus (Optional)
                  </label>
                  <span className="text-[10px] text-[var(--text-muted)]">{initRemarks.length}/1000</span>
                </div>
                <textarea
                  id="probation-init-remarks"
                  rows={3}
                  maxLength={1000}
                  value={initRemarks}
                  onChange={(e) => {
                    setInitRemarks(e.target.value);
                    if (fieldErrors.initRemarks) setFieldErrors((p) => ({ ...p, initRemarks: '' }));
                  }}
                  placeholder="Key milestones, onboarding objectives, or specific criteria required for permanent confirmation..."
                  aria-invalid={!!fieldErrors.initRemarks}
                  className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors placeholder:text-[var(--text-muted)] resize-none ${
                    fieldErrors.initRemarks
                      ? 'border-rose-500'
                      : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
                  }`}
                />
                {fieldErrors.initRemarks && (
                  <p className="text-[11px] text-rose-500 font-medium">{fieldErrors.initRemarks}</p>
                )}
              </div>
            </>
          )}

          {/* Mode 2: Mid-Probation Review */}
          {mode === 'mid_review' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="mid-review-date" className="text-xs font-semibold text-[var(--text-primary)]">
                    Review Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="mid-review-date"
                    type="date"
                    value={midReviewDate}
                    onChange={(e) => {
                      setMidReviewDate(e.target.value);
                      if (fieldErrors.midReviewDate) setFieldErrors((p) => ({ ...p, midReviewDate: '' }));
                    }}
                    required
                    aria-invalid={!!fieldErrors.midReviewDate}
                    className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                      fieldErrors.midReviewDate
                        ? 'border-rose-500'
                        : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
                    }`}
                  />
                  {fieldErrors.midReviewDate && (
                    <p className="text-[11px] text-rose-500 font-medium">{fieldErrors.midReviewDate}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="mid-reviewer" className="text-xs font-semibold text-[var(--text-primary)]">
                      Reviewer Name or Email
                    </label>
                    <span className="text-[10px] text-[var(--text-muted)]">{midReviewer.length}/100</span>
                  </div>
                  <input
                    id="mid-reviewer"
                    type="text"
                    maxLength={100}
                    value={midReviewer}
                    onChange={(e) => {
                      setMidReviewer(e.target.value);
                      if (fieldErrors.midReviewer) setFieldErrors((p) => ({ ...p, midReviewer: '' }));
                    }}
                    placeholder="e.g. Lead Engineer / HR"
                    aria-invalid={!!fieldErrors.midReviewer}
                    className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors placeholder:text-[var(--text-muted)] ${
                      fieldErrors.midReviewer
                        ? 'border-rose-500'
                        : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
                    }`}
                  />
                  {fieldErrors.midReviewer && (
                    <p className="text-[11px] text-rose-500 font-medium">{fieldErrors.midReviewer}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="mid-review-notes" className="text-xs font-semibold text-[var(--text-primary)]">
                    Mid-Point Review Notes & Feedback <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-[var(--text-muted)]">{midNotes.length}/2000</span>
                </div>
                <textarea
                  id="mid-review-notes"
                  rows={4}
                  maxLength={2000}
                  value={midNotes}
                  onChange={(e) => {
                    setMidNotes(e.target.value);
                    if (fieldErrors.midNotes) setFieldErrors((p) => ({ ...p, midNotes: '' }));
                  }}
                  required
                  placeholder="Document progress against initial expectations, team collaboration, technical skills, attendance, areas for improvement before final review..."
                  aria-invalid={!!fieldErrors.midNotes}
                  className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors placeholder:text-[var(--text-muted)] resize-none ${
                    fieldErrors.midNotes
                      ? 'border-rose-500'
                      : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
                  }`}
                />
                {fieldErrors.midNotes && (
                  <p className="text-[11px] text-rose-500 font-medium">{fieldErrors.midNotes}</p>
                )}
                <p className="text-[11px] text-[var(--text-muted)]">
                  Both HR Head and HR Analyst can record and update mid-probation notes.
                </p>
              </div>
            </>
          )}

          {/* Mode 3: End-of-Probation Review & Final Decision */}
          {mode === 'end_review' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="end-review-date" className="text-xs font-semibold text-[var(--text-primary)]">
                    End Review Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="end-review-date"
                    type="date"
                    value={endReviewDate}
                    onChange={(e) => {
                      setEndReviewDate(e.target.value);
                      if (fieldErrors.endReviewDate) setFieldErrors((p) => ({ ...p, endReviewDate: '' }));
                    }}
                    required
                    aria-invalid={!!fieldErrors.endReviewDate}
                    className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                      fieldErrors.endReviewDate
                        ? 'border-rose-500'
                        : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
                    }`}
                  />
                  {fieldErrors.endReviewDate && (
                    <p className="text-[11px] text-rose-500 font-medium">{fieldErrors.endReviewDate}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="end-reviewer" className="text-xs font-semibold text-[var(--text-primary)]">
                      Reviewer Name or Email
                    </label>
                    <span className="text-[10px] text-[var(--text-muted)]">{endReviewer.length}/100</span>
                  </div>
                  <input
                    id="end-reviewer"
                    type="text"
                    maxLength={100}
                    value={endReviewer}
                    onChange={(e) => {
                      setEndReviewer(e.target.value);
                      if (fieldErrors.endReviewer) setFieldErrors((p) => ({ ...p, endReviewer: '' }));
                    }}
                    placeholder="e.g. ignatius@korapay.com"
                    aria-invalid={!!fieldErrors.endReviewer}
                    className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors placeholder:text-[var(--text-muted)] ${
                      fieldErrors.endReviewer
                        ? 'border-rose-500'
                        : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
                    }`}
                  />
                  {fieldErrors.endReviewer && (
                    <p className="text-[11px] text-rose-500 font-medium">{fieldErrors.endReviewer}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="end-review-remarks" className="text-xs font-semibold text-[var(--text-primary)]">
                    Evaluation Remarks & Summary
                  </label>
                  <span className="text-[10px] text-[var(--text-muted)]">{endRemarks.length}/2000</span>
                </div>
                <textarea
                  id="end-review-remarks"
                  rows={3}
                  maxLength={2000}
                  value={endRemarks}
                  onChange={(e) => {
                    setEndRemarks(e.target.value);
                    if (fieldErrors.endRemarks) setFieldErrors((p) => ({ ...p, endRemarks: '' }));
                  }}
                  placeholder="Summary of performance during probation period, alignment with company values, deliverables achieved..."
                  aria-invalid={!!fieldErrors.endRemarks}
                  className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors placeholder:text-[var(--text-muted)] resize-none ${
                    fieldErrors.endRemarks
                      ? 'border-rose-500'
                      : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
                  }`}
                />
                {fieldErrors.endRemarks && (
                  <p className="text-[11px] text-rose-500 font-medium">{fieldErrors.endRemarks}</p>
                )}
              </div>

              {/* Strict RBAC & Database RLS Policy Banner for Outcome Decision */}
              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <span>Final Probation Outcome</span>
                    {!isHrHead && <Lock className="w-3.5 h-3.5 text-amber-500" />}
                  </label>
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                    {isHrHead ? 'HR Head Authorized' : 'HR Head Restricted'}
                  </span>
                </div>

                {!isHrHead && (
                  <div
                    id="hr-analyst-probation-outcome-locked"
                    className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5"
                  >
                    <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Restricted Decision Power</div>
                      <div className="text-[11px] mt-0.5 leading-relaxed">
                        Only the <strong>HR Head</strong> can set the final probation outcome (confirm, extend, or terminate). This policy is strictly enforced at the database level via Postgres RLS. HR Analysts can save review remarks only.
                      </div>
                    </div>
                  </div>
                )}

                {/* Outcome Options Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Option 1: Confirm */}
                  <div
                    onClick={() => {
                      if (isHrHead) setOutcome('confirm');
                    }}
                    className={`p-3 rounded-lg border transition-all text-xs flex flex-col justify-between ${
                      !isHrHead
                        ? 'opacity-50 cursor-not-allowed border-[var(--border-subtle)] bg-[var(--bg-subtle)]'
                        : outcome === 'confirm'
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-xs cursor-pointer'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Confirm</span>
                      </span>
                      {outcome === 'confirm' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      Confirm permanent employment status. Employee status switches to Active.
                    </p>
                  </div>

                  {/* Option 2: Extend */}
                  <div
                    onClick={() => {
                      if (isHrHead) setOutcome('extend');
                    }}
                    className={`p-3 rounded-lg border transition-all text-xs flex flex-col justify-between ${
                      !isHrHead
                        ? 'opacity-50 cursor-not-allowed border-[var(--border-subtle)] bg-[var(--bg-subtle)]'
                        : outcome === 'extend'
                        ? 'border-amber-500 bg-amber-500/10 shadow-xs cursor-pointer'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Extend</span>
                      </span>
                      {outcome === 'extend' && (
                        <CheckCircle2 className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      Extend probation period by additional months to allow further evaluation.
                    </p>
                  </div>

                  {/* Option 3: Terminate */}
                  <div
                    onClick={() => {
                      if (isHrHead) setOutcome('terminate');
                    }}
                    className={`p-3 rounded-lg border transition-all text-xs flex flex-col justify-between ${
                      !isHrHead
                        ? 'opacity-50 cursor-not-allowed border-[var(--border-subtle)] bg-[var(--bg-subtle)]'
                        : outcome === 'terminate'
                        ? 'border-red-500 bg-red-500/10 shadow-xs cursor-pointer'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-red-700 dark:text-red-400 flex items-center gap-1">
                        <UserX className="w-3.5 h-3.5" />
                        <span>Terminate</span>
                      </span>
                      {outcome === 'terminate' && (
                        <CheckCircle2 className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      End employment relationship upon probation conclusion. Status moves to Offboarded.
                    </p>
                  </div>
                </div>

                {/* Conditional fields for Confirm */}
                {isHrHead && outcome === 'confirm' && (
                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                    <label className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      Permanent Confirmation Effective Date
                    </label>
                    <input
                      type="date"
                      value={confirmationDate}
                      onChange={(e) => setConfirmationDate(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 text-xs rounded border border-emerald-500/30 bg-[var(--bg-surface)] text-[var(--text-primary)]"
                    />
                  </div>
                )}

                {/* Conditional fields for Extend */}
                {isHrHead && outcome === 'extend' && (
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-2">
                    <label className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                      Extension Duration (Months)
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 6].map((m) => (
                        <button
                          type="button"
                          key={m}
                          onClick={() => setExtensionMonths(m)}
                          className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors cursor-pointer ${
                            extensionMonths === m
                              ? 'border-amber-500 bg-amber-500 text-white'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                          }`}
                        >
                          +{m} Month{m > 1 ? 's' : ''}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      The probation end date will automatically be extended and tracked accordingly.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="submit-probation-review-btn"
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[var(--accent-blue)] hover:opacity-90 text-white transition-opacity cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading && <Clock className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {mode === 'initialize'
                  ? 'Save Probation Terms'
                  : mode === 'mid_review'
                  ? 'Save Mid-Review Notes'
                  : isHrHead && outcome
                  ? `Confirm ${outcome.charAt(0).toUpperCase() + outcome.slice(1)} Decision`
                  : 'Save Review Remarks'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
