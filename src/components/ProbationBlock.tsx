import React, { useState, useEffect, useCallback } from 'react';
import { ProbationRecord, Role } from '../types';
import { RecordProbationReviewModal } from './RecordProbationReviewModal';
import { Card } from './Card';
import { StatusPill } from './StatusPill';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  UserCheck,
  UserX,
  Lock,
  Edit2,
  Calendar,
  FileText,
  Plus,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface ProbationBlockProps {
  employeeId: string;
  employeeName: string;
  employeeStatus: string;
  role: Role;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onRefreshEmployee?: () => void;
}

export const ProbationBlock: React.FC<ProbationBlockProps> = ({
  employeeId,
  employeeName,
  employeeStatus,
  role,
  authFetch,
  onRefreshEmployee,
}) => {
  const isHrHead = role === 'hr_head';
  const [record, setRecord] = useState<ProbationRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'mid_review' | 'end_review' | 'initialize'>('mid_review');

  const fetchProbationData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/employees/${employeeId}/probation`);
      if (!res.ok) throw new Error('Failed to load probation records');
      const data = await res.json();
      setRecord(data.record);
    } catch (err: any) {
      console.error('Error fetching probation data:', err);
      setError(err.message || 'Could not fetch probation details');
    } finally {
      setLoading(false);
    }
  }, [employeeId, authFetch]);

  useEffect(() => {
    fetchProbationData();
  }, [fetchProbationData]);

  const handleModalSuccess = () => {
    fetchProbationData();
    if (onRefreshEmployee) onRefreshEmployee();
  };

  const getStatusBadge = () => {
    if (!record) {
      if (employeeStatus === 'active') {
        return <StatusPill variant="green" label="Confirmed Permanent" />;
      }
      return <StatusPill variant="gray" label="Not Initialized" />;
    }

    if (record.outcome === 'confirm') {
      return <StatusPill variant="green" label="Confirmed Permanent" />;
    }

    if (record.outcome === 'terminate') {
      return <StatusPill variant="red" label="Probation Terminated" />;
    }

    if (record.outcome === 'extend') {
      return <StatusPill variant="amber" label={`Extended (+${record.extension_months} mo)`} />;
    }

    const days = record.days_remaining ?? 0;
    if (days < 0) {
      return <StatusPill variant="red" label={`Review Overdue (${Math.abs(days)}d)`} pulseDot />;
    }

    if (days <= 14) {
      return <StatusPill variant="amber" label={`Review Approaching (${days}d left)`} />;
    }

    return <StatusPill variant="green" label={`Active (${days}d left)`} />;
  };

  return (
    <Card
      id="block-probation"
      padding="lg"
      className="space-y-4"
    >
      {/* Block Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Probation & Confirmation Management
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {!record && (
            <button
              onClick={() => {
                setModalMode('initialize');
                setModalOpen(true);
              }}
              className="px-2.5 py-1 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3 text-[var(--text-secondary)]" />
              <span>Configure Probation</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-[var(--text-muted)] animate-pulse">
          Loading probation tracking data...
        </div>
      ) : error ? (
        <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : !record ? (
        <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] flex items-center justify-between">
          <div>
            This employee is currently confirmed as permanent or has no active probation record tracked in the system.
          </div>
          <button
            onClick={() => {
              setModalMode('initialize');
              setModalOpen(true);
            }}
            className="text-xs font-semibold text-[var(--accent-blue)] hover:underline cursor-pointer shrink-0 ml-4"
          >
            Start Probation Tracking
          </button>
        </div>
      ) : (
        <div className="space-y-4 text-xs">
          {/* Timeline & Duration Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
            <div>
              <div className="text-[11px] text-[var(--text-muted)]">Probation Period</div>
              <div className="font-bold text-[var(--text-primary)] mt-0.5">
                {record.probation_period_months} Months
                {record.extension_months > 0 && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold ml-1">
                    (+{record.extension_months}m ext)
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-[var(--text-muted)]">Start Date</div>
              <div className="font-bold text-[var(--text-primary)] mt-0.5">
                {record.probation_start}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-[var(--text-muted)]">Target End Date</div>
              <div className="font-bold text-[var(--text-primary)] mt-0.5">
                {record.probation_end}
              </div>
              {record.original_probation_end &&
                record.original_probation_end !== record.probation_end && (
                  <div className="text-[10px] text-[var(--text-muted)]">
                    Orig: {record.original_probation_end}
                  </div>
                )}
            </div>

            <div>
              <div className="text-[11px] text-[var(--text-muted)]">Remaining / Status</div>
              <div className="font-bold text-[var(--text-primary)] mt-0.5 flex items-center gap-1.5">
                {record.outcome === 'confirm' ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Permanent ({record.confirmation_date || 'Confirmed'})
                  </span>
                ) : record.outcome === 'terminate' ? (
                  <span className="text-red-600 dark:text-red-400">Terminated</span>
                ) : (record.days_remaining ?? 0) < 0 ? (
                  <span className="text-rose-600 dark:text-rose-400">
                    Overdue by {Math.abs(record.days_remaining ?? 0)} days
                  </span>
                ) : (
                  <span
                    className={
                      (record.days_remaining ?? 0) <= 14
                        ? 'text-amber-600 dark:text-amber-400 font-bold'
                        : 'text-[var(--text-primary)]'
                    }
                  >
                    {record.days_remaining} days remaining
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Reviews Sub-Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1: Mid-Probation Review */}
            <div
              id="mid-probation-review-card"
              className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${
                        record.mid_review_date ? 'text-emerald-500' : 'text-[var(--border-strong)]'
                      }`}
                    />
                    <span>1. Mid-Probation Review</span>
                  </div>
                  {record.mid_review_date ? (
                    <StatusPill variant="green" label="Completed" />
                  ) : (
                    <StatusPill variant="amber" label="Pending" />
                  )}
                </div>

                {record.mid_review_date ? (
                  <div className="space-y-2 mt-2.5">
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                      <span>Date: {record.mid_review_date}</span>
                      <span>Reviewer: {record.mid_reviewer || 'HR / Manager'}</span>
                    </div>
                    {record.mid_review_notes ? (
                      <div className="p-2.5 rounded-md bg-[var(--bg-subtle)] text-[var(--text-primary)] text-[11px] leading-relaxed whitespace-pre-wrap">
                        "{record.mid_review_notes}"
                      </div>
                    ) : (
                      <div className="text-[11px] italic text-[var(--text-muted)]">
                        No review notes entered.
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--text-secondary)] mt-2.5 leading-relaxed">
                    Check-in evaluation halfway through the probation cycle to discuss progress, milestones, feedback, and mutual expectations.
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  id="record-mid-review-btn"
                  onClick={() => {
                    setModalMode('mid_review');
                    setModalOpen(true);
                  }}
                  className="w-full py-1.5 px-3 text-xs font-semibold rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3 text-[var(--text-secondary)]" />
                  <span>{record.mid_review_date ? 'Update Mid-Review' : 'Record Mid-Review'}</span>
                </button>
              </div>
            </div>

            {/* Step 2: End-of-Probation Review & Final Outcome Decision */}
            <div
              id="end-probation-review-card"
              className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                    <ShieldCheck
                      className={`w-3.5 h-3.5 ${
                        record.outcome ? 'text-emerald-500' : 'text-[var(--border-strong)]'
                      }`}
                    />
                    <span>2. End-of-Probation Decision</span>
                  </div>
                  {record.outcome ? (
                    <StatusPill
                      variant={
                        record.outcome === 'confirm'
                          ? 'green'
                          : record.outcome === 'terminate'
                          ? 'red'
                          : 'amber'
                      }
                      label={record.outcome.toUpperCase()}
                    />
                  ) : (
                    <StatusPill variant="amber" label="Decision Due" />
                  )}
                </div>

                {record.outcome ? (
                  <div className="space-y-2 mt-2.5">
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                      <span>Reviewed: {record.end_review_date || 'Completed'}</span>
                      <span>Reviewer: {record.end_reviewer || 'HR Head'}</span>
                    </div>

                    <div className="p-2.5 rounded-md bg-[var(--bg-subtle)] text-[11px] space-y-1">
                      <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                        {record.outcome === 'confirm' && (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Employment Confirmed Permanently</span>
                          </>
                        )}
                        {record.outcome === 'extend' && (
                          <>
                            <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                            <span>Extended by {record.extension_months} Month(s)</span>
                          </>
                        )}
                        {record.outcome === 'terminate' && (
                          <>
                            <UserX className="w-3.5 h-3.5 text-red-500" />
                            <span>Employment Terminated</span>
                          </>
                        )}
                      </div>
                      {record.remarks && (
                        <p className="text-[var(--text-secondary)] italic pt-1">"{record.remarks}"</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2.5 space-y-2">
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      Final evaluation determining permanent confirmation, extension, or termination of employment.
                    </p>
                    {!isHrHead && (
                      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <Lock className="w-3 h-3 shrink-0" />
                        <span>Outcome decision requires authorization from <strong>HR Head</strong>.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  id="record-end-review-btn"
                  onClick={() => {
                    setModalMode('end_review');
                    setModalOpen(true);
                  }}
                  className={`w-full py-1.5 px-3 text-xs font-semibold rounded-lg border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    isHrHead && !record.outcome
                      ? 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]'
                  }`}
                >
                  <FileText className="w-3 h-3 text-[var(--text-secondary)]" />
                  <span>
                    {record.outcome
                      ? isHrHead
                        ? 'Update End Review / Outcome'
                        : 'Update Review Remarks'
                      : isHrHead
                      ? 'Set Final Outcome (HR Head)'
                      : 'Record End Review Notes'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Probation Review Modal */}
      {modalOpen && (
        <RecordProbationReviewModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={handleModalSuccess}
          employeeId={employeeId}
          employeeName={employeeName}
          mode={modalMode}
          probationRecord={record}
          role={role}
          authFetch={authFetch}
        />
      )}
    </Card>
  );
};
