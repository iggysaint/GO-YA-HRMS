import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { PublicSurveyData } from '../types';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Sun,
  Moon,
  ArrowRight,
  Sparkles,
  Lock,
  Building2,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';

interface PublicSurveyPageProps {
  surveyToken: string;
  onBackToApp?: () => void;
}

export const PublicSurveyPage: React.FC<PublicSurveyPageProps> = ({
  surveyToken,
  onBackToApp,
}) => {
  const { theme, toggleTheme } = useTheme();

  const [survey, setSurvey] = useState<PublicSurveyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state: question_id -> answer_value
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch survey public data
  useEffect(() => {
    let isMounted = true;
    const fetchSurvey = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/public/surveys/${encodeURIComponent(surveyToken)}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Survey not found or invalid link.');
        }
        const data: PublicSurveyData = await res.json();
        if (isMounted) {
          setSurvey(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load survey.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSurvey();
    return () => {
      isMounted = false;
    };
  }, [surveyToken]);

  const handleRatingSelect = (questionId: string, value: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: String(value),
    }));
    setValidationError(null);
  };

  const handleChoiceSelect = (questionId: string, option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
    setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey) return;

    // Check that all questions are answered
    const unanswered = survey.questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      setValidationError(`Please answer all questions before submitting (${unanswered.length} remaining).`);
      // Scroll to first unanswered question
      const el = document.getElementById(`question-card-${unanswered[0].id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);
    setValidationError(null);

    try {
      const payloadAnswers = Object.entries(answers).map(([question_id, answer_value]) => ({
        question_id,
        answer_value,
      }));

      const res = await fetch(`/api/public/surveys/${encodeURIComponent(surveyToken)}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: payloadAnswers,
          // When anonymous is true, backend will guarantee respondent_employee_id is null!
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit survey responses.');
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setValidationError(err.message || 'An error occurred while submitting your responses.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalQuestions = survey?.questions.length || 0;
  const answeredCount = Object.keys(answers).filter((qId) => answers[qId] !== undefined).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col font-sans transition-colors duration-200">
      {/* Top Header Bar */}
      <header
        id="public-survey-header"
        className="w-full bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] sticky top-0 z-30 shadow-2xs"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 flex items-center justify-center font-bold text-sm shadow-xs">
              G
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight">Go-Ya HRMS</span>
              <span className="text-[10px] text-[var(--text-muted)] -mt-0.5">Workforce Engagement</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {survey?.is_anonymous && (
              <span
                id="survey-anonymous-badge"
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-500/20"
              >
                <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Anonymous Survey</span>
              </span>
            )}

            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              title="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {onBackToApp && (
              <button
                id="back-to-app-btn"
                onClick={onBackToApp}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline cursor-pointer"
              >
                Return to Workspace
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar (Visible while taking survey) */}
        {!isLoading && !error && survey?.isOpen && !isSubmitted && (
          <div className="w-full bg-[var(--bg-subtle)] h-1">
            <div
              className="bg-teal-600 dark:bg-teal-500 h-1 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--text-secondary)]">Loading engagement survey...</p>
          </div>
        )}

        {/* Error / Not Found State */}
        {!isLoading && error && (
          <div
            id="survey-error-card"
            className="p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center shadow-xs space-y-4 max-w-lg mx-auto"
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Survey Not Available</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{error}</p>
            <div className="pt-2">
              <button
                onClick={() => (window.location.href = '/')}
                className="px-4 py-2 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] font-medium text-xs hover:opacity-90 transition-opacity cursor-pointer"
              >
                Go to Go-Ya Home
              </button>
            </div>
          </div>
        )}

        {/* Upcoming Survey State */}
        {!isLoading && !error && survey && survey.isUpcoming && (
          <div
            id="survey-upcoming-card"
            className="p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center shadow-xs space-y-4 max-w-lg mx-auto"
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Survey Scheduled</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              <strong>{survey.title}</strong> has not opened yet. Submissions will be accepted starting on{' '}
              <span className="font-semibold text-[var(--text-primary)]">{formatDate(survey.opens_at)}</span>.
            </p>
            <div className="pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-xs font-medium transition-colors cursor-pointer"
              >
                Refresh Page
              </button>
            </div>
          </div>
        )}

        {/* Closed Survey State */}
        {!isLoading && !error && survey && survey.isClosed && (
          <div
            id="survey-closed-card"
            className="p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center shadow-xs space-y-4 max-w-lg mx-auto"
          >
            <div className="w-12 h-12 rounded-full bg-stone-500/10 text-stone-600 dark:text-stone-400 mx-auto flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Survey Closed</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              <strong>{survey.title}</strong> closed on{' '}
              <span className="font-semibold text-[var(--text-primary)]">{formatDate(survey.closes_at)}</span> and is no
              longer accepting responses. Thank you for your interest!
            </p>
          </div>
        )}

        {/* Submitted Confirmation State */}
        {!isLoading && !error && survey && isSubmitted && (
          <div
            id="survey-submitted-card"
            className="p-8 sm:p-12 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center shadow-sm space-y-5 max-w-xl mx-auto animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                Thank You for Your Feedback!
              </h2>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                Your response has been safely submitted.
                {survey.is_anonymous && (
                  <span>
                    {' '}
                    Your answers were recorded <strong>100% anonymously</strong> with no link to your employee identity.
                  </span>
                )}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] flex items-center justify-center gap-2 max-w-md mx-auto">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>Conducted securely on Go-Ya HRMS for {survey.company_name}</span>
            </div>

            <div className="pt-3">
              <button
                id="close-tab-btn"
                onClick={() => {
                  if (onBackToApp) {
                    onBackToApp();
                  } else {
                    window.location.href = '/';
                  }
                }}
                className="px-5 py-2.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Active Open Survey Form */}
        {!isLoading && !error && survey && survey.isOpen && !isSubmitted && (
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
            {/* Survey Header Banner */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span className="font-semibold text-[var(--text-primary)]">{survey.company_name}</span>
                  {survey.target_department_name && (
                    <>
                      <span>•</span>
                      <span>Target: {survey.target_department_name}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 opacity-70" />
                  <span>Closes {formatDate(survey.closes_at)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                  {survey.title}
                </h1>
                {survey.description && (
                  <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                    {survey.description}
                  </p>
                )}
              </div>

              {/* Anonymity Banner */}
              <div
                id="anonymity-assurance-banner"
                className="p-3.5 rounded-xl bg-emerald-500/8 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Strictly Anonymous:</strong>
                  {survey.is_anonymous ? (
                    <span>
                      {' '}
                      Your responses are decoupled from your identity at the database level. Leadership and HR see only
                      aggregated scores and tally statistics.
                    </span>
                  ) : (
                    <span> This survey is designated as non-anonymous.</span>
                  )}
                </div>
              </div>

              {/* Progress counter */}
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
                <span>
                  Question {answeredCount} of {totalQuestions} answered
                </span>
                <span className="font-medium text-[var(--text-primary)]">{progressPercent}% complete</span>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-5">
              {survey.questions.map((question, index) => {
                const isAnswered = Boolean(answers[question.id]);
                const selectedValue = answers[question.id];

                return (
                  <div
                    key={question.id}
                    id={`question-card-${question.id}`}
                    className={`p-6 sm:p-7 rounded-2xl bg-[var(--bg-surface)] border transition-all duration-200 ${
                      isAnswered
                        ? 'border-[var(--border-subtle)] shadow-2xs'
                        : 'border-[var(--border-subtle)] shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <div className="space-y-1 flex-1">
                        <h3 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] leading-snug">
                          {question.question_text}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)]">
                          {question.question_type === 'rating'
                            ? 'Select a score from 1 (Strongly Disagree / Very Poor) to 5 (Strongly Agree / Excellent)'
                            : 'Select one option below'}
                        </p>
                      </div>
                    </div>

                    {/* Question Type: 1-5 Rating Scale */}
                    {question.question_type === 'rating' && (
                      <div className="mt-5 space-y-2">
                        <div className="grid grid-cols-5 gap-2 sm:gap-3">
                          {[1, 2, 3, 4, 5].map((score) => {
                            const isSelected = selectedValue === String(score);
                            return (
                              <button
                                key={score}
                                type="button"
                                id={`btn-q-${question.id}-score-${score}`}
                                onClick={() => handleRatingSelect(question.id, score)}
                                className={`py-3.5 sm:py-4 px-2 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer select-none ${
                                  isSelected
                                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm ring-2 ring-teal-500/30'
                                    : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:border-teal-500/40'
                                }`}
                              >
                                <span className="text-lg sm:text-xl font-bold">{score}</span>
                                <span className="text-[10px] sm:text-[11px] font-medium opacity-85 text-center line-clamp-1">
                                  {score === 1 && 'Poor'}
                                  {score === 2 && 'Fair'}
                                  {score === 3 && 'Neutral'}
                                  {score === 4 && 'Good'}
                                  {score === 5 && 'Great'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex justify-between px-1 text-[11px] text-[var(--text-muted)]">
                          <span>1 = Strongly Disagree</span>
                          <span>5 = Strongly Agree</span>
                        </div>
                      </div>
                    )}

                    {/* Question Type: Multiple Choice */}
                    {question.question_type === 'multiple_choice' && (
                      <div className="mt-5 space-y-2.5">
                        {(question.options || []).map((option, optIdx) => {
                          const isSelected = selectedValue === option;
                          return (
                            <label
                              key={optIdx}
                              id={`label-q-${question.id}-opt-${optIdx}`}
                              onClick={() => handleChoiceSelect(question.id, option)}
                              className={`flex items-center gap-3.5 p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer select-none ${
                                isSelected
                                  ? 'bg-teal-500/10 dark:bg-teal-950/20 border-teal-600 dark:border-teal-500 text-[var(--text-primary)] shadow-2xs'
                                  : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'border-teal-600 dark:border-teal-400 bg-teal-600 dark:bg-teal-500'
                                    : 'border-[var(--border-strong)] bg-[var(--bg-surface)]'
                                }`}
                              >
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <span className="text-sm font-medium leading-normal">{option}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Validation Error Banner */}
            {validationError && (
              <div
                id="submit-validation-error"
                className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Submission Action Bar */}
            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-[var(--text-secondary)] text-center sm:text-left">
                <span>
                  {answeredCount === totalQuestions
                    ? 'All questions answered. Ready to submit!'
                    : `${totalQuestions - answeredCount} question(s) remaining`}
                </span>
              </div>

              <button
                type="submit"
                id="submit-survey-btn"
                disabled={submitting}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white font-semibold text-sm transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting responses...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Anonymous Feedback</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-6 border-t border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)]">
        <p>Go-Ya HRMS • Privacy-First Workforce Operations</p>
      </footer>
    </div>
  );
};
