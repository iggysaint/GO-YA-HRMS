import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  EngagementSurveyWithMetrics,
  SurveyResultsResponse,
  Department,
  SurveyQuestionType,
} from '../types';
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
  Share2,
  ExternalLink,
  Trash2,
  BarChart3,
  Users,
  Building2,
  Calendar,
  Check,
  Copy,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  Award,
  Sparkles,
  HelpCircle,
  ListFilter,
  Percent,
} from 'lucide-react';

interface SurveysPageProps {
  onOpenPublicSurvey?: (surveyId: string) => void;
}

interface NewQuestionFormItem {
  id: string;
  question_text: string;
  question_type: SurveyQuestionType;
  options: string[];
}

export const SurveysPage: React.FC<SurveysPageProps> = ({ onOpenPublicSurvey }) => {
  const { authFetch, organization, role, subscribeToRealtime } = useAuth();

  // State
  const [surveys, setSurveys] = useState<EngagementSurveyWithMetrics[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);

  // Results drill-down state
  const [resultsData, setResultsData] = useState<SurveyResultsResponse | null>(null);
  const [isResultsLoading, setIsResultsLoading] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'closed'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Copy notification state
  const [copiedSurveyId, setCopiedSurveyId] = useState<string | null>(null);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTargetDeptId, setFormTargetDeptId] = useState<string>('');
  const [formIsAnonymous, setFormIsAnonymous] = useState(true);
  const [formOpensAt, setFormOpensAt] = useState(() => new Date().toISOString().split('T')[0]);
  const [formClosesAt, setFormClosesAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [formQuestions, setFormQuestions] = useState<NewQuestionFormItem[]>([
    {
      id: 'q_init_1',
      question_text: 'Overall, how energized and engaged do you feel in your role this quarter?',
      question_type: 'rating',
      options: [],
    },
    {
      id: 'q_init_2',
      question_text: 'My manager provides constructive feedback, clear priorities, and support.',
      question_type: 'rating',
      options: [],
    },
    {
      id: 'q_init_3',
      question_text: 'Which working arrangement best supports your productivity and wellbeing?',
      question_type: 'multiple_choice',
      options: [
        'Hybrid (2–3 days in-office)',
        'Primarily Office-based',
        'Fully Remote / Distributed',
        'Flexible Hours & Outcome-based',
      ],
    },
  ]);

  // Fetch surveys
  const fetchSurveys = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/surveys');
      if (res.ok) {
        const data = await res.json();
        setSurveys(data);
      }
    } catch (err) {
      console.error('Failed to fetch surveys:', err);
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    try {
      const res = await authFetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchSurveys();
    fetchDepartments();
  }, [fetchSurveys, fetchDepartments]);

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = subscribeToRealtime((payload) => {
      if (
        payload.event === 'survey_created' ||
        payload.event === 'survey_response_received' ||
        payload.event === 'survey_deleted'
      ) {
        fetchSurveys();
        if (selectedSurveyId && payload.survey_id === selectedSurveyId) {
          fetchSurveyResults(selectedSurveyId);
        }
      }
    });
    return unsubscribe;
  }, [subscribeToRealtime, fetchSurveys, selectedSurveyId]);

  // Fetch single survey results
  const fetchSurveyResults = async (surveyId: string) => {
    setIsResultsLoading(true);
    try {
      const res = await authFetch(`/api/surveys/${surveyId}/results`);
      if (res.ok) {
        const data: SurveyResultsResponse = await res.json();
        setResultsData(data);
      } else {
        console.error('Failed to fetch survey results');
      }
    } catch (err) {
      console.error('Error fetching survey results:', err);
    } finally {
      setIsResultsLoading(false);
    }
  };

  const handleOpenResults = (surveyId: string) => {
    setSelectedSurveyId(surveyId);
    fetchSurveyResults(surveyId);
  };

  const handleBackToList = () => {
    setSelectedSurveyId(null);
    setResultsData(null);
    fetchSurveys();
  };

  const handleDeleteSurvey = async (surveyId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}" and all its submitted responses? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await authFetch(`/api/surveys/${surveyId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedSurveyId === surveyId) {
          setSelectedSurveyId(null);
          setResultsData(null);
        }
        fetchSurveys();
      }
    } catch (err) {
      console.error('Failed to delete survey:', err);
    }
  };

  const handleCopyLink = (surveyId: string) => {
    const link = `${window.location.origin}?survey=${surveyId}`;
    navigator.clipboard.writeText(link);
    setCopiedSurveyId(surveyId);
    setTimeout(() => {
      setCopiedSurveyId(null);
    }, 2500);
  };

  // Question builder helpers
  const handleAddQuestion = (type: SurveyQuestionType = 'rating') => {
    setFormQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        question_text: '',
        question_type: type,
        options: type === 'multiple_choice' ? ['Option 1', 'Option 2'] : [],
      },
    ]);
  };

  const handleRemoveQuestion = (qId: string) => {
    if (formQuestions.length <= 1) {
      alert('A survey must contain at least one question.');
      return;
    }
    setFormQuestions((prev) => prev.filter((q) => q.id !== qId));
  };

  const handleUpdateQuestionText = (qId: string, text: string) => {
    setFormQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, question_text: text } : q))
    );
  };

  const handleUpdateQuestionType = (qId: string, type: SurveyQuestionType) => {
    setFormQuestions((prev) =>
      prev.map((q) => {
        if (q.id === qId) {
          return {
            ...q,
            question_type: type,
            options: type === 'multiple_choice' && q.options.length === 0 ? ['Option 1', 'Option 2'] : q.options,
          };
        }
        return q;
      })
    );
  };

  const handleAddOption = (qId: string) => {
    setFormQuestions((prev) =>
      prev.map((q) => {
        if (q.id === qId) {
          return { ...q, options: [...q.options, `Option ${q.options.length + 1}`] };
        }
        return q;
      })
    );
  };

  const handleUpdateOption = (qId: string, index: number, val: string) => {
    setFormQuestions((prev) =>
      prev.map((q) => {
        if (q.id === qId) {
          const newOpts = [...q.options];
          newOpts[index] = val;
          return { ...q, options: newOpts };
        }
        return q;
      })
    );
  };

  const handleRemoveOption = (qId: string, index: number) => {
    setFormQuestions((prev) =>
      prev.map((q) => {
        if (q.id === qId) {
          if (q.options.length <= 2) {
            alert('Multiple choice questions require at least two options.');
            return q;
          }
          const newOpts = q.options.filter((_, i) => i !== index);
          return { ...q, options: newOpts };
        }
        return q;
      })
    );
  };

  const handleInsertTemplate = (templateName: string) => {
    if (templateName === 'quick_pulse') {
      setFormQuestions([
        {
          id: `q_${Date.now()}_1`,
          question_text: 'Overall, how energized and valued do you feel at work this month?',
          question_type: 'rating',
          options: [],
        },
        {
          id: `q_${Date.now()}_2`,
          question_text: 'I have the autonomy and clarity required to do my best work.',
          question_type: 'rating',
          options: [],
        },
        {
          id: `q_${Date.now()}_3`,
          question_text: 'What primary area should team leadership optimize next?',
          question_type: 'multiple_choice',
          options: [
            'Clearer Goal Setting & Feedback',
            'Tooling & Infrastructure Reliability',
            'Workload & Sustainable Pacing',
            'Cross-department Communication',
          ],
        },
      ]);
    }
  };

  const handleCreateSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!formTitle.trim()) {
      setCreateError('Please enter a survey title.');
      return;
    }

    const validQuestions = formQuestions.filter((q) => q.question_text.trim().length > 0);
    if (validQuestions.length === 0) {
      setCreateError('Please provide at least one question with question text.');
      return;
    }

    // Check multiple choice options
    for (const q of validQuestions) {
      if (q.question_type === 'multiple_choice') {
        const cleanOpts = q.options.map((o) => o.trim()).filter(Boolean);
        if (cleanOpts.length < 2) {
          setCreateError(`Question "${q.question_text}" needs at least two choices.`);
          return;
        }
      }
    }

    setCreateSubmitting(true);
    try {
      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        target_department_id: formTargetDeptId ? formTargetDeptId : null,
        is_anonymous: formIsAnonymous,
        opens_at: new Date(formOpensAt).toISOString(),
        closes_at: new Date(formClosesAt + 'T23:59:59').toISOString(),
        questions: validQuestions.map((q) => ({
          question_text: q.question_text.trim(),
          question_type: q.question_type,
          options: q.question_type === 'multiple_choice' ? q.options.map((o) => o.trim()).filter(Boolean) : null,
        })),
      };

      const res = await authFetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create survey.');
      }

      setIsCreateModalOpen(false);
      setFormTitle('');
      setFormDescription('');
      setFormTargetDeptId('');
      fetchSurveys();
    } catch (err: any) {
      setCreateError(err.message || 'An error occurred while creating the survey.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Filtered surveys
  const filteredSurveys = useMemo(() => {
    return surveys.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (deptFilter !== 'all') {
        if (deptFilter === 'whole_company' && s.target_department_id !== null) return false;
        if (deptFilter !== 'whole_company' && s.target_department_id !== deptFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q)) ||
          (s.target_department_name && s.target_department_name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [surveys, statusFilter, deptFilter, searchQuery]);

  // Overall workspace survey statistics
  const totalSurveysCount = surveys.length;
  const activeSurveysCount = surveys.filter((s) => s.status === 'active').length;
  const totalResponsesCollected = surveys.reduce((acc, curr) => acc + curr.response_count, 0);
  const avgResponseRate =
    surveys.length > 0
      ? Math.round((surveys.reduce((acc, curr) => acc + curr.response_rate, 0) / surveys.length) * 10) / 10
      : 0;

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
    <div
      id="engagement-surveys-page"
      className="min-h-full bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col font-sans animate-in fade-in duration-150"
    >
      {/* Top Navigation / Breadcrumb Header */}
      <header className="p-4 sm:p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] sticky top-0 z-20 shadow-2xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {selectedSurveyId ? (
              <button
                id="back-to-surveys-btn"
                onClick={handleBackToList}
                className="p-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title="Back to Surveys List"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-sm border border-teal-500/20">
                <ClipboardCheck className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  {selectedSurveyId ? 'Survey Aggregate Results' : 'Engagement & Pulse Surveys'}
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/20">
                  Zeepay Pulse
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {selectedSurveyId
                  ? 'Aggregate feedback distribution with strict anonymity protection'
                  : 'Distribute anonymous workplace check-ins and measure team sentiment'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!selectedSurveyId ? (
              <button
                id="create-survey-btn"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Survey</span>
              </button>
            ) : (
              resultsData && (
                <div className="flex items-center gap-2">
                  <button
                    id="copy-results-survey-link-btn"
                    onClick={() => handleCopyLink(resultsData.survey.id)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedSurveyId === resultsData.survey.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-700 dark:text-emerald-300 font-semibold">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 opacity-70" />
                        <span>Copy Public Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`?survey=${resultsData.survey.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-xs font-medium flex items-center gap-1.5 border border-[var(--border-subtle)] transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                    <span>Open Public Form</span>
                  </a>
                </div>
              )
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        {/* VIEW 1: SURVEYS LIST */}
        {!selectedSurveyId && (
          <div className="space-y-6">
            {/* Metric KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xs">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Total Surveys</span>
                  <ClipboardCheck className="w-4 h-4 opacity-70 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="text-2xl font-bold text-[var(--text-primary)] mt-1.5">{totalSurveysCount}</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Workspace pulse history</div>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xs">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Active Now</span>
                  <Clock className="w-4 h-4 opacity-70 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">
                  {activeSurveysCount}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Accepting responses</div>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xs">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Avg Response Rate</span>
                  <Percent className="w-4 h-4 opacity-70 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-[var(--text-primary)] mt-1.5">{avgResponseRate}%</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Across active audiences</div>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xs">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Total Responses</span>
                  <Users className="w-4 h-4 opacity-70 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-[var(--text-primary)] mt-1.5">
                  {totalResponsesCollected}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Submitted pulse feedbacks</div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  id="survey-search-input"
                  placeholder="Search surveys by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:outline-none focus:ring-1 focus:ring-teal-500 text-[var(--text-primary)]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-0.5 rounded-lg border border-[var(--border-subtle)] text-xs">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    All ({surveys.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('active')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      statusFilter === 'active'
                        ? 'bg-[var(--bg-surface)] text-emerald-700 dark:text-emerald-400 shadow-2xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Active ({surveys.filter((s) => s.status === 'active').length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('upcoming')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      statusFilter === 'upcoming'
                        ? 'bg-[var(--bg-surface)] text-amber-700 dark:text-amber-400 shadow-2xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Upcoming
                  </button>
                  <button
                    onClick={() => setStatusFilter('closed')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      statusFilter === 'closed'
                        ? 'bg-[var(--bg-surface)] text-[var(--text-muted)] shadow-2xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Closed
                  </button>
                </div>

                {/* Department Filter */}
                <select
                  id="survey-dept-filter"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="all">All Audiences</option>
                  <option value="whole_company">Whole Company Only</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} Only
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Surveys Grid / List */}
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-xs text-[var(--text-secondary)] gap-2">
                <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading engagement surveys...</span>
              </div>
            ) : filteredSurveys.length === 0 ? (
              <div
                id="no-surveys-empty-state"
                className="p-12 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-stone-500/10 text-[var(--text-muted)] mx-auto flex items-center justify-center">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">No Surveys Found</h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'all' || deptFilter !== 'all'
                    ? 'No engagement surveys match the selected filters.'
                    : 'Create your first pulse survey to collect anonymous employee sentiment and track engagement.'}
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Survey</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSurveys.map((survey) => {
                  const isCopied = copiedSurveyId === survey.id;

                  return (
                    <div
                      key={survey.id}
                      id={`survey-card-${survey.id}`}
                      className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all shadow-2xs flex flex-col justify-between space-y-4"
                    >
                      {/* Card Top Metadata */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {/* Status Badge */}
                            {survey.status === 'active' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Active</span>
                              </span>
                            )}
                            {survey.status === 'upcoming' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                <Clock className="w-2.5 h-2.5" />
                                <span>Upcoming</span>
                              </span>
                            )}
                            {survey.status === 'closed' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-500/10 text-stone-600 dark:text-stone-400 border border-stone-500/20">
                                <span>Closed</span>
                              </span>
                            )}

                            {/* Audience Scope */}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                              <Building2 className="w-2.5 h-2.5 opacity-70" />
                              <span>{survey.target_department_name}</span>
                            </span>

                            {/* Anonymity */}
                            {survey.is_anonymous && (
                              <span
                                title="Responses are 100% anonymous"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20"
                              >
                                <Lock className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400" />
                                <span>Anonymous</span>
                              </span>
                            )}
                          </div>

                          {/* Delete Action */}
                          <button
                            id={`delete-survey-btn-${survey.id}`}
                            onClick={() => handleDeleteSurvey(survey.id, survey.title)}
                            className="p-1 rounded-md text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete survey"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h3 className="text-base font-semibold text-[var(--text-primary)] leading-snug">
                            {survey.title}
                          </h3>
                          {survey.description && (
                            <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                              {survey.description}
                            </p>
                          )}
                        </div>

                        {/* Timing Details */}
                        <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] pt-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 opacity-70" />
                            <span>
                              {formatDate(survey.opens_at)} — {formatDate(survey.closes_at)}
                            </span>
                          </div>
                          <span>•</span>
                          <span>{survey.question_count} questions</span>
                        </div>
                      </div>

                      {/* Response Rate Progress & Metrics */}
                      <div className="space-y-2 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">Response Rate</span>
                          <span className="font-bold text-[var(--text-primary)]">
                            {survey.response_rate}%{' '}
                            <span className="font-normal text-[var(--text-muted)]">
                              ({survey.response_count} of {survey.target_audience_count})
                            </span>
                          </span>
                        </div>
                        <div className="w-full bg-[var(--bg-surface)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                          <div
                            className={`h-full transition-all duration-300 ${
                              survey.response_rate >= 75
                                ? 'bg-emerald-500'
                                : survey.response_rate >= 40
                                ? 'bg-teal-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, survey.response_rate)}%` }}
                          />
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-subtle)]">
                        <button
                          id={`view-results-btn-${survey.id}`}
                          onClick={() => handleOpenResults(survey.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <BarChart3 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          <span>View Results</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            id={`copy-survey-link-${survey.id}`}
                            onClick={() => handleCopyLink(survey.id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-1 transition-colors cursor-pointer"
                            title="Copy public survey link"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-emerald-700 dark:text-emerald-300">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 opacity-70" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>

                          <a
                            href={`?survey=${survey.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                            title="Preview public response form"
                          >
                            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: DETAILED RESULTS VIEW */}
        {selectedSurveyId && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {isResultsLoading || !resultsData ? (
              <div className="py-24 flex flex-col items-center justify-center text-xs text-[var(--text-secondary)] gap-2">
                <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                <span>Aggregating survey responses...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Results Header Card */}
                <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          resultsData.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                            : resultsData.status === 'upcoming'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border border-stone-500/20'
                        }`}
                      >
                        {resultsData.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        <span className="capitalize">{resultsData.status}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                        <Building2 className="w-3 h-3 opacity-70" />
                        <span>Scope: {resultsData.target_department_name}</span>
                      </span>

                      {resultsData.survey.is_anonymous && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                          <Lock className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                          <span>Strict Anonymity Protected</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 opacity-70" />
                      <span>
                        {formatDate(resultsData.survey.opens_at)} — {formatDate(resultsData.survey.closes_at)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                      {resultsData.survey.title}
                    </h2>
                    {resultsData.survey.description && (
                      <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                        {resultsData.survey.description}
                      </p>
                    )}
                  </div>

                  {/* Summary Metric Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[var(--border-subtle)]">
                    <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                      <span className="text-[11px] text-[var(--text-muted)]">Response Rate</span>
                      <div className="text-xl font-bold text-[var(--text-primary)] mt-0.5">
                        {resultsData.response_rate}%
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                      <span className="text-[11px] text-[var(--text-muted)]">Total Submissions</span>
                      <div className="text-xl font-bold text-[var(--text-primary)] mt-0.5">
                        {resultsData.total_responses}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                      <span className="text-[11px] text-[var(--text-muted)]">Target Audience</span>
                      <div className="text-xl font-bold text-[var(--text-primary)] mt-0.5">
                        {resultsData.target_audience_count} staff
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                      <span className="text-[11px] text-[var(--text-muted)]">Questions Surveyed</span>
                      <div className="text-xl font-bold text-[var(--text-primary)] mt-0.5">
                        {resultsData.question_results.length}
                      </div>
                    </div>
                  </div>

                  {/* Anonymity Security Notice */}
                  {resultsData.survey.is_anonymous && (
                    <div className="p-3 rounded-xl bg-teal-500/8 dark:bg-teal-950/20 border border-teal-500/20 text-xs text-teal-800 dark:text-teal-300 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span>
                        <strong>Anonymity Guard:</strong> Individual respondent records are completely isolated and not
                        linked to employee profiles in the database. Aggregate tallies only.
                      </span>
                    </div>
                  )}
                </div>

                {/* Question Aggregate Breakdown */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <span>Question Aggregates & Breakdown</span>
                      <span className="text-xs font-normal text-[var(--text-muted)]">
                        ({resultsData.question_results.length} questions)
                      </span>
                    </h3>
                  </div>

                  {resultsData.question_results.map((item, idx) => {
                    const q = item.question;
                    const isRating = q.question_type === 'rating';
                    const ratingStats = item.rating_stats;
                    const choiceTallies = item.choice_tallies || [];

                    return (
                      <div
                        key={q.id}
                        id={`result-question-${q.id}`}
                        className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xs space-y-4"
                      >
                        {/* Question Title Bar */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div>
                              <h4 className="text-base font-semibold text-[var(--text-primary)] leading-snug">
                                {q.question_text}
                              </h4>
                              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                {isRating ? '1–5 Rating Scale question' : 'Multiple Choice question'} •{' '}
                                {item.total_answers} total answer(s)
                              </p>
                            </div>
                          </div>

                          {isRating && ratingStats && (
                            <div className="flex flex-col items-end shrink-0">
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-teal-700 dark:text-teal-400">
                                  {ratingStats.average_score.toFixed(2)}
                                </span>
                                <span className="text-xs text-[var(--text-muted)]">/ 5.00</span>
                              </div>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  ratingStats.average_score >= 4.0
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                    : ratingStats.average_score >= 3.0
                                    ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300'
                                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                }`}
                              >
                                {ratingStats.average_score >= 4.0
                                  ? 'High Satisfaction'
                                  : ratingStats.average_score >= 3.0
                                  ? 'Moderate Engagement'
                                  : 'Attention Needed'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Visual Breakdown: 1-5 Rating Scale */}
                        {isRating && ratingStats && (
                          <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                            {[5, 4, 3, 2, 1].map((score) => {
                              const count = ratingStats.distribution[score] || 0;
                              const pct = ratingStats.percentages[score] || 0;

                              return (
                                <div key={score} className="flex items-center gap-3 text-xs">
                                  <div className="w-16 flex items-center gap-1 shrink-0 font-medium text-[var(--text-secondary)]">
                                    <span>{score} star{score > 1 ? 's' : ''}</span>
                                  </div>

                                  <div className="flex-1 bg-[var(--bg-subtle)] h-3 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                                    <div
                                      className={`h-full transition-all duration-300 ${
                                        score >= 4
                                          ? 'bg-teal-600 dark:bg-teal-500'
                                          : score === 3
                                          ? 'bg-amber-500'
                                          : 'bg-rose-500'
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>

                                  <div className="w-20 text-right shrink-0 font-medium text-[var(--text-secondary)]">
                                    <span>{count}</span>{' '}
                                    <span className="text-[10px] text-[var(--text-muted)]">({pct}%)</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Visual Breakdown: Multiple Choice */}
                        {!isRating && choiceTallies && (
                          <div className="space-y-2.5 pt-2 border-t border-[var(--border-subtle)]">
                            {choiceTallies.map((choice, cIdx) => {
                              const isTopChoice = cIdx === 0 && choice.count > 0;

                              return (
                                <div
                                  key={cIdx}
                                  className={`p-3 rounded-xl border transition-all ${
                                    isTopChoice
                                      ? 'bg-teal-500/8 dark:bg-teal-950/20 border-teal-500/30'
                                      : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)]'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                                    <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                                      <span>{choice.option}</span>
                                      {isTopChoice && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-700 dark:text-teal-300 font-semibold">
                                          Top Choice
                                        </span>
                                      )}
                                    </div>
                                    <div className="font-bold text-[var(--text-primary)]">
                                      {choice.count}{' '}
                                      <span className="font-normal text-[var(--text-muted)]">
                                        ({choice.percentage}%)
                                      </span>
                                    </div>
                                  </div>

                                  <div className="w-full bg-[var(--bg-surface)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                                    <div
                                      className="bg-teal-600 dark:bg-teal-500 h-full transition-all duration-300"
                                      style={{ width: `${choice.percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CREATE SURVEY MODAL */}
      {isCreateModalOpen && (
        <div
          id="create-survey-modal-overlay"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            id="create-survey-modal-box"
            className="w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">Create Engagement Survey</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Setup a pulse survey for whole company or target department
                  </p>
                </div>
              </div>

              <button
                id="close-create-modal-btn"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSurvey} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {createError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Title & Description */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Survey Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="new-survey-title-input"
                    required
                    placeholder="e.g., Q3 2026 Engagement & Culture Pulse"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:ring-1 focus:ring-teal-500 focus:outline-none text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Description & Objectives
                  </label>
                  <textarea
                    id="new-survey-desc-input"
                    rows={2}
                    placeholder="Briefly explain the intent of this survey to respondents..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:ring-1 focus:ring-teal-500 focus:outline-none text-[var(--text-primary)] resize-none"
                  />
                </div>
              </div>

              {/* Scoping & Anonymity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Target Audience
                  </label>
                  <select
                    id="new-survey-dept-select"
                    value={formTargetDeptId}
                    onChange={(e) => setFormTargetDeptId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="">Whole Company (All Staff)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} Only
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col justify-center">
                  <label className="text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Anonymity Safeguard
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      id="new-survey-anonymous-checkbox"
                      checked={formIsAnonymous}
                      onChange={(e) => setFormIsAnonymous(e.target.checked)}
                      className="rounded border-[var(--border-strong)] text-teal-600 focus:ring-teal-500"
                    />
                    <span>Anonymous responses (Recommended)</span>
                  </label>
                  <span className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    Responses are decoupled from employee profiles at DB level.
                  </span>
                </div>
              </div>

              {/* Schedule Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Opens At <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="new-survey-opens-at-input"
                    required
                    value={formOpensAt}
                    onChange={(e) => setFormOpensAt(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Closes At <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="new-survey-closes-at-input"
                    required
                    value={formClosesAt}
                    onChange={(e) => setFormClosesAt(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>

              {/* Questions Section */}
              <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                      Survey Questions ({formQuestions.length})
                    </label>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Multiple choice or 1–5 rating scale questions
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      id="load-quick-pulse-btn"
                      onClick={() => handleInsertTemplate('quick_pulse')}
                      className="px-2 py-1 rounded-md text-[11px] font-medium border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-teal-700 dark:text-teal-300 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Use Standard Template</span>
                    </button>
                  </div>
                </div>

                {/* Questions List */}
                <div className="space-y-3">
                  {formQuestions.map((q, qIndex) => (
                    <div
                      key={q.id}
                      id={`builder-question-${q.id}`}
                      className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-[11px] font-bold flex items-center justify-center shrink-0">
                            {qIndex + 1}
                          </span>
                          <select
                            value={q.question_type}
                            onChange={(e) =>
                              handleUpdateQuestionType(q.id, e.target.value as SurveyQuestionType)
                            }
                            className="px-2 py-1 text-xs rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-medium cursor-pointer"
                          >
                            <option value="rating">1–5 Rating Scale</option>
                            <option value="multiple_choice">Multiple Choice</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(q.id)}
                          className="text-[var(--text-muted)] hover:text-rose-600 p-1 rounded transition-colors cursor-pointer text-xs"
                          title="Remove question"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Question Text Input */}
                      <input
                        type="text"
                        placeholder="Enter your question statement here..."
                        value={q.question_text}
                        onChange={(e) => handleUpdateQuestionText(q.id, e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:ring-1 focus:ring-teal-500 focus:outline-none text-[var(--text-primary)] font-medium"
                      />

                      {/* Multiple Choice Options Builder */}
                      {q.question_type === 'multiple_choice' && (
                        <div className="space-y-2 pl-2 border-l-2 border-teal-500/30">
                          <div className="text-[11px] font-semibold text-[var(--text-secondary)]">
                            Answer Choices:
                          </div>
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <span className="text-[10px] text-[var(--text-muted)] w-4 text-center">
                                {optIdx + 1}.
                              </span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleUpdateOption(q.id, optIdx, e.target.value)}
                                className="flex-1 px-2.5 py-1 text-xs rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(q.id, optIdx)}
                                className="text-[var(--text-muted)] hover:text-rose-600 p-1 text-xs cursor-pointer"
                                title="Remove option"
                              >
                                ✕
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => handleAddOption(q.id)}
                            className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer pt-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Choice</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Question Button */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    id="add-rating-question-btn"
                    onClick={() => handleAddQuestion('rating')}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add 1–5 Rating Question</span>
                  </button>

                  <button
                    type="button"
                    id="add-choice-question-btn"
                    onClick={() => handleAddQuestion('multiple_choice')}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Multiple Choice</span>
                  </button>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-xs font-medium text-[var(--text-secondary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  id="publish-survey-submit-btn"
                  disabled={createSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {createSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Publish Survey</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
