import React, { useState } from 'react';
import {
  PerformanceReview,
  PDPGoal,
  Role,
  PerformanceCycle,
  ReviewStatus,
  PDPStatus,
} from '../types';
import { RecordReviewModal } from './RecordReviewModal';
import { AddPDPGoalModal } from './AddPDPGoalModal';
import {
  Award,
  Target,
  Plus,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Circle,
  ExternalLink,
  Edit2,
  Trash2,
  AlertCircle,
  FileText,
  Star,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

interface PerformanceBlockProps {
  employeeId: string;
  employeeName: string;
  role: Role;
  reviews: PerformanceReview[];
  pdpGoals: PDPGoal[];
  onRefresh: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export const PerformanceBlock: React.FC<PerformanceBlockProps> = ({
  employeeId,
  employeeName,
  role,
  reviews,
  pdpGoals,
  onRefresh,
  authFetch,
}) => {
  const isHrHead = role === 'hr_head';

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<PerformanceReview | null>(null);
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<PDPGoal | null>(null);

  // Confirmation modals state
  const [finalizingReview, setFinalizingReview] = useState<PerformanceReview | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Quick stats
  const finalizedReviews = reviews.filter((r) => r.status === 'finalized');
  const avgRating =
    finalizedReviews.length > 0
      ? (
          finalizedReviews.reduce((sum, r) => sum + r.rating, 0) / finalizedReviews.length
        ).toFixed(1)
      : reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const completedGoalsCount = pdpGoals.filter((g) => g.status === 'complete').length;

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      return new Date(isoStr).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  const getCycleLabel = (cycle: PerformanceCycle) => {
    switch (cycle) {
      case 'Q1':
        return 'Q1 Review';
      case 'Q2':
        return 'Q2 Review';
      case 'mid_year':
        return 'Mid-Year Rating';
      case 'Q3':
        return 'Q3 Review';
      case 'Q4':
        return 'Q4 Review';
      case 'year_end':
        return 'Year-End Rating';
      default:
        return cycle;
    }
  };

  const getRatingBadge = (rating: number) => {
    if (rating >= 4.5) {
      return {
        label: 'Outstanding',
        className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
      };
    }
    if (rating >= 3.5) {
      return {
        label: 'Meets Expectations',
        className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
      };
    }
    if (rating >= 2.5) {
      return {
        label: 'Needs Development',
        className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
      };
    }
    return {
      label: 'Unsatisfactory',
      className: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
    };
  };

  const getGoalStatusBadge = (status: PDPStatus) => {
    switch (status) {
      case 'complete':
        return {
          label: 'Completed',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />,
          className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
        };
      case 'in_progress':
        return {
          label: 'In Progress',
          icon: <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />,
          className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
        };
      case 'not_started':
      default:
        return {
          label: 'Not Started',
          icon: <Circle className="w-3 h-3 text-stone-500" />,
          className: 'bg-stone-500/10 text-stone-700 dark:text-stone-400 border-stone-500/20',
        };
    }
  };

  // Finalize review handler (Strict RLS: Only HR Head)
  const handleFinalizeConfirm = async () => {
    if (!finalizingReview) return;
    try {
      setActionLoading(true);
      setActionError(null);

      const res = await authFetch(`/api/performance/reviews/${finalizingReview.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'finalized' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to finalize review');
      }

      setFinalizingReview(null);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to finalize review');
    } finally {
      setActionLoading(false);
    }
  };

  // Revert review to draft (HR Head only)
  const handleRevertToDraft = async (review: PerformanceReview) => {
    if (!isHrHead) return;
    try {
      setActionLoading(true);
      setActionError(null);

      const res = await authFetch(`/api/performance/reviews/${review.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to revert review to draft');
      }

      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to revert review');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete review handler
  const handleDeleteReview = async (review: PerformanceReview) => {
    if (review.status === 'finalized' && !isHrHead) {
      setActionError('Only HR Head can delete finalized reviews.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this performance review record?')) {
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);

      const res = await authFetch(`/api/performance/reviews/${review.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete review');
      }

      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete review');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick toggle goal status
  const handleToggleGoalStatus = async (goal: PDPGoal) => {
    const nextStatus: PDPStatus =
      goal.status === 'not_started'
        ? 'in_progress'
        : goal.status === 'in_progress'
        ? 'complete'
        : 'not_started';

    try {
      const res = await authFetch(`/api/performance/pdp-goals/${goal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to update goal status', err);
    }
  };

  // Delete goal handler
  const handleDeleteGoal = async (goal: PDPGoal) => {
    if (!window.confirm('Are you sure you want to delete this PDP goal?')) {
      return;
    }

    try {
      const res = await authFetch(`/api/performance/pdp-goals/${goal.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to delete goal', err);
    }
  };

  return (
    <div
      id="block-performance"
      className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs space-y-6"
    >
      {/* Block Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Performance Management & Reviews
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-medium">
                {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Quarterly review cycles (Q1–Q4), Mid-Year/Year-End ratings, Balanced Scorecards (BSC), and Personal Development Plans (PDP)
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="btn-add-pdp-goal"
            onClick={() => {
              setEditingGoal(null);
              setIsAddGoalModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <Target className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>+ Add PDP Goal</span>
          </button>
          <button
            id="btn-record-review"
            onClick={() => {
              setEditingReview(null);
              setIsRecordModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-blue)] text-white text-xs font-medium hover:opacity-90 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Record Review</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-xs underline hover:no-underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
          <div className="text-[var(--text-muted)] text-[11px] font-medium">Average Rating</div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-[var(--text-primary)] font-mono">
              {avgRating ? `${avgRating} / 5.0` : '—'}
            </span>
            {avgRating && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
          <div className="text-[var(--text-muted)] text-[11px] font-medium">Finalized Cycles</div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-[var(--text-primary)] font-mono">
              {finalizedReviews.length}
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              of {reviews.length} total
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
          <div className="text-[var(--text-muted)] text-[11px] font-medium">BSC Completion</div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-[var(--text-primary)] font-mono">
              {reviews.filter((r) => r.bsc_completed).length}
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              scorecards linked
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
          <div className="text-[var(--text-muted)] text-[11px] font-medium">PDP Milestones</div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-[var(--text-primary)] font-mono">
              {completedGoalsCount} / {pdpGoals.length}
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">achieved</span>
          </div>
        </div>
      </div>

      {/* 1. Review History Over Time */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--accent-blue)]" />
            <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
              Rating History & Evaluation Cycles
            </h4>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Finalized reviews are read-only except for HR Head</span>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-[var(--border-strong)] rounded-lg space-y-2">
            <div className="text-xs text-[var(--text-secondary)]">
              No performance reviews recorded for this employee yet.
            </div>
            <button
              onClick={() => {
                setEditingReview(null);
                setIsRecordModalOpen(true);
              }}
              className="text-xs font-medium text-[var(--accent-blue)] hover:underline cursor-pointer"
            >
              + Record Q1, Mid-Year, or quarterly review
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => {
              const ratingBadge = getRatingBadge(review.rating);
              const isFinalized = review.status === 'finalized';

              return (
                <div
                  key={review.id}
                  id={`review-item-${review.id}`}
                  className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all space-y-3 shadow-2xs"
                >
                  {/* Top Bar: Cycle, Rating, Status, Actions */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Cycle Badge */}
                      <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                        {getCycleLabel(review.cycle)}
                      </span>

                      {/* Rating Score */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${ratingBadge.className}`}
                      >
                        <Star className="w-3 h-3 fill-current" />
                        <span className="font-mono">{review.rating.toFixed(1)}</span>
                        <span>•</span>
                        <span>{ratingBadge.label}</span>
                      </span>

                      {/* Status Pill */}
                      {isFinalized ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          <Lock className="w-3 h-3" />
                          <span>Finalized & Locked</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" />
                          <span>Draft (In Progress)</span>
                        </span>
                      )}

                      {/* BSC Scorecard Pill */}
                      {review.bsc_completed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          <FileText className="w-3 h-3" />
                          <span>BSC Completed</span>
                          {review.bsc_score !== undefined && (
                            <span className="font-mono font-bold">({review.bsc_score}%)</span>
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-stone-500/10 text-stone-600 dark:text-stone-400 border border-stone-500/20">
                          <span>BSC Not Attached</span>
                        </span>
                      )}
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-1.5">
                      {/* If review is Draft: both Analyst and Head can edit */}
                      {!isFinalized && (
                        <>
                          <button
                            onClick={() => {
                              setEditingReview(review);
                              setIsRecordModalOpen(true);
                            }}
                            className="px-2 py-1 text-xs rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors flex items-center gap-1 cursor-pointer"
                            title="Edit draft evaluation"
                          >
                            <Edit2 className="w-3 h-3 text-[var(--text-secondary)]" />
                            <span>Edit Draft</span>
                          </button>

                          {/* Finalize button: Only for HR Head */}
                          {isHrHead ? (
                            <button
                              onClick={() => setFinalizingReview(review)}
                              className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1 font-medium shadow-2xs cursor-pointer"
                              title="Authorize and lock review permanently"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Finalize & Lock</span>
                            </button>
                          ) : (
                            <div
                              className="px-2 py-1 text-[10px] rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-muted)] flex items-center gap-1"
                              title="Only HR Head can authorize and finalize reviews"
                            >
                              <Lock className="w-2.5 h-2.5" />
                              <span>Finalize (HR Head only)</span>
                            </div>
                          )}

                          <button
                            onClick={() => handleDeleteReview(review)}
                            className="p-1 text-xs rounded border border-[var(--border-subtle)] hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                            title="Delete draft review"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}

                      {/* If review is Finalized: Strictly enforced RLS */}
                      {isFinalized && (
                        <>
                          {isHrHead ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                                HR Head Override
                              </span>
                              <button
                                onClick={() => {
                                  setEditingReview(review);
                                  setIsRecordModalOpen(true);
                                }}
                                className="px-2 py-1 text-xs rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors flex items-center gap-1 cursor-pointer"
                                title="HR Head override edit"
                              >
                                <Edit2 className="w-3 h-3 text-[var(--text-secondary)]" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleRevertToDraft(review)}
                                className="px-2 py-1 text-xs rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors flex items-center gap-1 cursor-pointer"
                                title="Revert to draft to allow editing"
                              >
                                <Unlock className="w-3 h-3" />
                                <span>Unlock</span>
                              </button>
                              <button
                                onClick={() => handleDeleteReview(review)}
                                className="p-1 text-xs rounded border border-[var(--border-subtle)] hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                                title="Delete finalized review"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] cursor-not-allowed"
                              title="Finalized reviews are locked and read-only for HR Analysts"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Read-only (Finalized by HR Head)</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Review Comments Body */}
                  <div className="p-3 rounded-md bg-[var(--bg-subtle)] border-l-2 border-[var(--accent-blue)] text-xs text-[var(--text-primary)] leading-relaxed">
                    <p className="whitespace-pre-line">{review.comments}</p>
                  </div>

                  {/* Balanced Scorecard (BSC) Document link if available */}
                  {review.bsc_completed && review.bsc_document_url && (
                    <div className="flex items-center justify-between p-2.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-medium text-[var(--text-primary)]">
                          Attached Balanced Scorecard (BSC):
                        </span>
                        <span className="text-[var(--text-secondary)] truncate max-w-xs font-mono text-[11px]">
                          {review.bsc_document_url}
                        </span>
                      </div>
                      <a
                        href={review.bsc_document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[var(--accent-blue)] hover:underline font-medium text-xs shrink-0"
                      >
                        <span>Open Document</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* Review Metadata Footer */}
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)] flex-wrap gap-2">
                    <div>
                      <span>Reviewed by </span>
                      <strong className="text-[var(--text-secondary)]">{review.reviewed_by}</strong>
                      <span> on {formatDate(review.created_at)}</span>
                    </div>

                    {isFinalized && review.finalized_by && (
                      <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>
                          Finalized by {review.finalized_by}{' '}
                          {review.finalized_at && `on ${formatDate(review.finalized_at)}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Personal Development Plan (PDP) Goals */}
      <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
              Personal Development Plan (PDP) Goals
            </h4>
          </div>
          <button
            onClick={() => {
              setEditingGoal(null);
              setIsAddGoalModalOpen(true);
            }}
            className="text-xs font-medium text-[var(--accent-blue)] hover:underline cursor-pointer"
          >
            + Add New Goal
          </button>
        </div>

        {pdpGoals.length === 0 ? (
          <div className="p-5 text-center border border-dashed border-[var(--border-strong)] rounded-lg space-y-1.5">
            <div className="text-xs text-[var(--text-secondary)]">
              No personal development goals assigned yet.
            </div>
            <button
              onClick={() => {
                setEditingGoal(null);
                setIsAddGoalModalOpen(true);
              }}
              className="text-xs font-medium text-[var(--accent-blue)] hover:underline cursor-pointer"
            >
              + Create first development goal
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {pdpGoals.map((goal) => {
              const statusBadge = getGoalStatusBadge(goal.status);
              const isPastDue =
                goal.status !== 'complete' &&
                new Date(goal.target_date).getTime() < new Date().setHours(0, 0, 0, 0);

              return (
                <div
                  key={goal.id}
                  id={`pdp-goal-${goal.id}`}
                  className="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleGoalStatus(goal)}
                      className="mt-0.5 text-[var(--text-muted)] hover:text-[var(--accent-blue)] transition-colors cursor-pointer shrink-0"
                      title="Click to toggle status"
                    >
                      {statusBadge.icon}
                    </button>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div
                        className={`text-xs font-medium text-[var(--text-primary)] leading-snug ${
                          goal.status === 'complete' ? 'line-through text-[var(--text-muted)]' : ''
                        }`}
                      >
                        {goal.goal}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[var(--text-muted)]" />
                          <span>Target: {formatDate(goal.target_date)}</span>
                        </span>
                        {isPastDue && (
                          <span className="text-rose-600 dark:text-rose-400 font-medium">
                            (Past target date)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Button & Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleGoalStatus(goal)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border cursor-pointer transition-colors ${statusBadge.className}`}
                      title="Click to cycle status"
                    >
                      <span>{statusBadge.label}</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingGoal(goal);
                        setIsAddGoalModalOpen(true);
                      }}
                      className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                      title="Edit goal"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => handleDeleteGoal(goal)}
                      className="p-1 rounded text-[var(--text-secondary)] hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete goal"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Finalize Confirmation Modal for HR Head */}
      {finalizingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Authorize & Finalize Review
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {getCycleLabel(finalizingReview.cycle)} for {employeeName}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-[var(--text-secondary)] space-y-2">
              <p>
                <strong className="text-[var(--text-primary)]">Strict RLS Lock Notice:</strong> Once
                finalized, this performance evaluation cycle becomes <strong>strictly read-only</strong> for
                all HR Analysts in the organization.
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Only an HR Head will have override privileges to unlock or modify this historical
                rating.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFinalizingReview(null)}
                className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleFinalizeConfirm}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {actionLoading ? (
                  <span>Locking...</span>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Confirm & Lock Review</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record / Edit Review Modal */}
      <RecordReviewModal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setEditingReview(null);
        }}
        onSuccess={() => {
          onRefresh();
        }}
        employeeId={employeeId}
        employeeName={employeeName}
        existingReview={editingReview}
        isHrHead={isHrHead}
        authFetch={authFetch}
      />

      {/* Add / Edit PDP Goal Modal */}
      <AddPDPGoalModal
        isOpen={isAddGoalModalOpen}
        onClose={() => {
          setIsAddGoalModalOpen(false);
          setEditingGoal(null);
        }}
        onSuccess={() => {
          onRefresh();
        }}
        employeeId={employeeId}
        employeeName={employeeName}
        existingGoal={editingGoal}
        authFetch={authFetch}
      />
    </div>
  );
};
