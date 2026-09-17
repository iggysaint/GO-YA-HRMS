import React, { useState, useEffect } from 'react';
import { PerformanceReview, PerformanceCycle, ReviewStatus } from '../types';
import { X, Award, AlertCircle, Lock, ExternalLink, CheckCircle2, FileText } from 'lucide-react';

interface RecordReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeId: string;
  employeeName: string;
  existingReview?: PerformanceReview | null;
  isHrHead: boolean;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const CYCLE_OPTIONS: { value: PerformanceCycle; label: string; description: string }[] = [
  { value: 'Q1', label: 'Q1 Review', description: 'First Quarter Performance' },
  { value: 'Q2', label: 'Q2 Review', description: 'Second Quarter Performance' },
  { value: 'mid_year', label: 'Mid-Year Rating', description: 'Comprehensive Mid-Year Evaluation' },
  { value: 'Q3', label: 'Q3 Review', description: 'Third Quarter Performance' },
  { value: 'Q4', label: 'Q4 Review', description: 'Fourth Quarter Performance' },
  { value: 'year_end', label: 'Year-End Rating', description: 'Annual Comprehensive Rating' },
];

export const RecordReviewModal: React.FC<RecordReviewModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  employeeId,
  employeeName,
  existingReview,
  isHrHead,
  authFetch,
}) => {
  const [cycle, setCycle] = useState<PerformanceCycle>('Q1');
  const [rating, setRating] = useState<number>(4.0);
  const [comments, setComments] = useState<string>('');
  const [bscCompleted, setBscCompleted] = useState<boolean>(false);
  const [bscDocumentUrl, setBscDocumentUrl] = useState<string>('');
  const [bscScore, setBscScore] = useState<string>('');
  const [status, setStatus] = useState<ReviewStatus>('draft');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingReview) {
      setCycle(existingReview.cycle);
      setRating(existingReview.rating);
      setComments(existingReview.comments || '');
      setBscCompleted(Boolean(existingReview.bsc_completed));
      setBscDocumentUrl(existingReview.bsc_document_url || '');
      setBscScore(existingReview.bsc_score !== undefined ? String(existingReview.bsc_score) : '');
      setStatus(existingReview.status);
    } else {
      setCycle('Q1');
      setRating(4.0);
      setComments('');
      setBscCompleted(false);
      setBscDocumentUrl('');
      setBscScore('');
      setStatus('draft');
    }
    setError(null);
    setFieldErrors({});
  }, [existingReview, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};
    if (!comments.trim()) {
      errors.comments = 'Please provide comments or evaluation feedback for this review.';
    } else if (comments.trim().length < 5) {
      errors.comments = 'Comments must be at least 5 characters.';
    } else if (comments.trim().length > 2000) {
      errors.comments = 'Comments cannot exceed 2,000 characters.';
    }

    if (bscCompleted) {
      if (bscScore.trim()) {
        const numScore = Number(bscScore);
        if (isNaN(numScore) || numScore < 0 || numScore > 100) {
          errors.bscScore = 'BSC score must be a number between 0 and 100.';
        }
      }
      if (bscDocumentUrl.trim()) {
        if (bscDocumentUrl.trim().length > 500) {
          errors.bscDocumentUrl = 'URL cannot exceed 500 characters.';
        } else if (!/^https?:\/\/.+/i.test(bscDocumentUrl.trim())) {
          errors.bscDocumentUrl = 'Please enter a valid web URL starting with http:// or https://';
        }
      }
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
        cycle,
        rating: Number(rating),
        comments: comments.trim(),
        bsc_completed: bscCompleted,
        bsc_document_url: bscCompleted && bscDocumentUrl.trim() ? bscDocumentUrl.trim() : undefined,
        bsc_score: bscCompleted && bscScore ? Number(bscScore) : undefined,
        status: isHrHead ? status : 'draft',
      };

      const url = existingReview
        ? `/api/performance/reviews/${existingReview.id}`
        : `/api/employees/${employeeId}/performance/reviews`;

      const method = existingReview ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save performance review');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRatingLabel = (val: number) => {
    if (val >= 4.5) return 'Outstanding / Exceeds Expectations';
    if (val >= 3.5) return 'Meets Expectations / Strong';
    if (val >= 2.5) return 'Needs Development / Improvement';
    return 'Unsatisfactory';
  };

  return (
    <div
      id="modal-record-review"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {existingReview ? 'Edit Performance Review' : 'Record Performance Review'}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Cycle Selector */}
          <div>
            <label className="block font-medium text-[var(--text-primary)] mb-1.5">
              Review Cycle <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CYCLE_OPTIONS.map((opt) => {
                const selected = cycle === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCycle(opt.value)}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      selected
                        ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] font-medium shadow-xs'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="font-semibold text-xs text-[var(--text-primary)]">{opt.label}</div>
                    <div className="text-[10px] text-[var(--text-muted)] line-clamp-1">{opt.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rating Score */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-medium text-[var(--text-primary)]">
                Performance Rating (1.0 to 5.0) <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--text-primary)]">
                <span className="px-2 py-0.5 rounded-md bg-[var(--accent-blue)] text-white font-mono">
                  {rating.toFixed(1)} / 5.0
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] font-normal">
                  ({getRatingLabel(rating)})
                </span>
              </div>
            </div>

            {/* Range Slider & Quick Presets */}
            <div className="space-y-2">
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.1"
                value={rating}
                onChange={(e) => setRating(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[var(--bg-subtle)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-blue)]"
              />
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] px-1">
                <span>1.0 (Unsatisfactory)</span>
                <span>2.0</span>
                <span>3.0 (Meets)</span>
                <span>4.0</span>
                <span>5.0 (Outstanding)</span>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                {[1.0, 2.0, 3.0, 3.5, 4.0, 4.5, 5.0].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRating(preset)}
                    className={`flex-1 py-1 rounded text-[11px] border font-mono transition-colors cursor-pointer ${
                      rating === preset
                        ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] font-bold'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {preset.toFixed(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Comments */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="review-comments-input" className="block font-medium text-[var(--text-primary)]">
                Review Comments & Qualitative Feedback <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-[var(--text-muted)]">{comments.length}/2000</span>
            </div>
            <textarea
              id="review-comments-input"
              rows={4}
              maxLength={2000}
              value={comments}
              onChange={(e) => {
                setComments(e.target.value);
                if (fieldErrors.comments) setFieldErrors((p) => ({ ...p, comments: '' }));
              }}
              placeholder="Detail accomplishments, core deliverables, strategic impact, and areas for ongoing professional development..."
              aria-invalid={!!fieldErrors.comments}
              className={`w-full px-3 py-2 rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors placeholder:text-[var(--text-muted)] resize-none ${
                fieldErrors.comments
                  ? 'border-rose-500'
                  : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
              }`}
              required
            />
            {fieldErrors.comments && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.comments}</p>
            )}
          </div>

          {/* Balanced Scorecard (BSC) Section */}
          <div className="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <div className="font-semibold text-xs text-[var(--text-primary)]">
                    Balanced Scorecard (BSC) Tracking
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Track cycle completion status and link external scorecard document
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bscCompleted}
                  onChange={(e) => setBscCompleted(e.target.checked)}
                  className="rounded border-[var(--border-subtle)] text-[var(--accent-blue)] focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-medium text-[var(--text-primary)]">Completed</span>
              </label>
            </div>

            {bscCompleted && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--border-subtle)] animate-in fade-in duration-150">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="review-bsc-url" className="block font-medium text-[var(--text-primary)] text-[11px]">
                      Linked Scorecard Document URL
                    </label>
                    <span className="text-[9px] text-[var(--text-muted)]">{bscDocumentUrl.length}/500</span>
                  </div>
                  <input
                    id="review-bsc-url"
                    type="url"
                    maxLength={500}
                    value={bscDocumentUrl}
                    onChange={(e) => {
                      setBscDocumentUrl(e.target.value);
                      if (fieldErrors.bscDocumentUrl) setFieldErrors((p) => ({ ...p, bscDocumentUrl: '' }));
                    }}
                    placeholder="https://docs.google.com/document/..."
                    aria-invalid={!!fieldErrors.bscDocumentUrl}
                    className={`w-full px-2.5 py-1.5 rounded-md border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none text-xs transition-colors ${
                      fieldErrors.bscDocumentUrl
                        ? 'border-rose-500'
                        : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
                    }`}
                  />
                  {fieldErrors.bscDocumentUrl && (
                    <p className="text-[10px] text-rose-500 font-medium mt-1">{fieldErrors.bscDocumentUrl}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="review-bsc-score" className="block font-medium text-[var(--text-primary)] mb-1 text-[11px]">
                    BSC Score / Index (%) (Optional)
                  </label>
                  <input
                    id="review-bsc-score"
                    type="number"
                    min="0"
                    max="100"
                    value={bscScore}
                    onChange={(e) => {
                      setBscScore(e.target.value);
                      if (fieldErrors.bscScore) setFieldErrors((p) => ({ ...p, bscScore: '' }));
                    }}
                    placeholder="e.g. 92"
                    aria-invalid={!!fieldErrors.bscScore}
                    className={`w-full px-2.5 py-1.5 rounded-md border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none text-xs transition-colors ${
                      fieldErrors.bscScore
                        ? 'border-rose-500'
                        : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
                    }`}
                  />
                  {fieldErrors.bscScore && (
                    <p className="text-[10px] text-rose-500 font-medium mt-1">{fieldErrors.bscScore}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Status & RLS Authorization */}
          <div className="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--text-primary)]">Review Status</span>
              {isHrHead ? (
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="draft"
                      checked={status === 'draft'}
                      onChange={() => setStatus('draft')}
                      className="text-[var(--accent-blue)] cursor-pointer"
                    />
                    <span className="text-xs text-[var(--text-secondary)]">Draft</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="finalized"
                      checked={status === 'finalized'}
                      onChange={() => setStatus('finalized')}
                      className="text-emerald-600 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Finalized (Locked)
                    </span>
                  </label>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px]">
                  <Lock className="w-3 h-3" />
                  <span>Draft Only (HR Analyst)</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-[var(--text-muted)]">
              {isHrHead ? (
                status === 'finalized' ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                    Strict RLS: Finalizing will permanently lock this review. It will become read-only for HR Analysts across the organization.
                  </span>
                ) : (
                  'Draft reviews can be updated or finalized later by an HR Head.'
                )
              ) : (
                'HR Analysts can record and update review entries while in draft. Only an HR Head can finalize and lock reviews.'
              )}
            </p>
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
              id="btn-submit-review"
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-[var(--accent-blue)] text-white font-medium hover:opacity-90 transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{existingReview ? 'Update Review' : status === 'finalized' ? 'Finalize Review' : 'Save Review Draft'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
