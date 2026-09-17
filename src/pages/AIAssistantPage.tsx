import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { AIAssistantMode, AIAssistantResponse, AIChatLog } from '../types';
import { StatusPill } from '../components/StatusPill';
import {
  Sparkles,
  Send,
  Trash2,
  Users,
  Building,
  ShieldCheck,
  Palmtree,
  DollarSign,
  Lock,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Bot,
  User,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface AIAssistantPageProps {
  onSelectEmployee: (employeeId: string) => void;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  mode?: AIAssistantMode;
  dataSources?: string[];
  suggestedFollowups?: string[];
  matchedEmployees?: AIAssistantResponse['matched_employees'];
  timestamp: string;
}

export const AIAssistantPage: React.FC<AIAssistantPageProps> = ({ onSelectEmployee }) => {
  const { authFetch, organization, role, user } = useAuth();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedMode, setSelectedMode] = useState<AIAssistantMode>('ask');
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load chat logs on mount
  const loadChatLogs = useCallback(async () => {
    try {
      const res = await authFetch('/api/ai-assistant/logs');
      if (res.ok) {
        const logs: AIChatLog[] = await res.json();
        const loaded: MessageItem[] = [];

        logs.forEach((log) => {
          loaded.push({
            id: `usr_${log.id}`,
            sender: 'user',
            content: log.question,
            timestamp: log.created_at,
          });
          loaded.push({
            id: `ast_${log.id}`,
            sender: 'assistant',
            content: log.answer,
            dataSources: log.data_sources_used,
            timestamp: log.created_at,
          });
        });

        if (loaded.length === 0) {
          // Add Welcome greeting
          loaded.push({
            id: 'welcome_msg',
            sender: 'assistant',
            content: `Hello ${user?.email?.split('@')[0] || 'there'}! I am your **Go-Ya HR Intelligence Assistant** for **${organization?.name}**.\n\nI have access to statutory labor frameworks, live attendance logs, leave balances, employee records, and regulatory compliance trackers.\n\nHow can I support your HR operations today?`,
            suggestedFollowups: [
              'What is statutory annual leave in Ghana?',
              'Find all employees currently on probation',
              'Who is flagged for high attrition risk?',
              'Summarize upcoming compliance deadlines',
            ],
            timestamp: new Date().toISOString(),
          });
        }

        setMessages(loaded);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  }, [authFetch, organization?.name, user?.email]);

  useEffect(() => {
    loadChatLogs();
  }, [loadChatLogs]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (promptToSend?: string) => {
    const query = (promptToSend || inputValue).trim();
    if (!query || loading) return;

    setError(null);
    setInputValue('');

    const userMessage: MessageItem = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      content: query,
      mode: selectedMode,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await authFetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          mode: selectedMode,
        }),
      });

      const data: AIAssistantResponse = await res.json();
      if (!res.ok) {
        throw new Error((data as any).error || 'Failed to process request');
      }

      const assistantMessage: MessageItem = {
        id: `ast_${Date.now()}`,
        sender: 'assistant',
        content: data.answer,
        mode: data.mode,
        dataSources: data.data_sources_used,
        suggestedFollowups: data.suggested_followups,
        matchedEmployees: data.matched_employees,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message || 'Error processing HR query');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      setClearing(true);
      const res = await authFetch('/api/ai-assistant/logs', { method: 'DELETE' });
      if (res.ok) {
        setMessages([
          {
            id: 'welcome_reset',
            sender: 'assistant',
            content: `Chat history cleared. How can I assist you with **${organization?.name}** HR workflows today?`,
            suggestedFollowups: [
              'What is Ghana statutory annual leave policy?',
              'Find all employees currently on probation',
              'Who is flagged for high attrition risk?',
            ],
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to clear chat logs:', err);
    } finally {
      setClearing(false);
    }
  };

  const samplePrompts = [
    { label: 'Statutory Leave Rules', prompt: 'What are the statutory annual and sick leave entitlements in Ghana?' },
    { label: 'Probation Check', prompt: 'List all employees currently in their statutory probation period.' },
    { label: 'Attrition Warnings', prompt: 'Who is currently flagged with high attrition risk indicators?' },
    { label: 'Compliance Audit', prompt: 'Summarize upcoming statutory compliance filings and tax deadlines.' },
    { label: 'Compensation & Payroll', prompt: 'What is the active monthly payroll expense across all departments?' },
  ];

  return (
    <div id="ai-assistant-page" className="flex flex-col h-full max-w-5xl mx-auto p-6 space-y-4 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                Go-Ya AI HR Assistant
              </h1>
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span>Company: <strong className="text-[var(--text-primary)]">{organization?.name}</strong></span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  Access Level:
                  <strong className="text-[var(--text-primary)] uppercase font-mono text-[10px]">
                    {role === 'hr_head' ? 'HR Head (Full Compensation Access)' : 'HR Analyst (Strict Compensation Redaction)'}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearHistory}
            disabled={clearing}
            title="Clear Chat History"
            className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-red-500 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 shrink-0">
        <button
          onClick={() => setSelectedMode('ask')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
            selectedMode === 'ask'
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-2xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Ask Policy & Data</span>
        </button>

        <button
          onClick={() => setSelectedMode('search')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
            selectedMode === 'search'
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-2xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Employee Search</span>
        </button>

        <button
          onClick={() => setSelectedMode('summarize')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
            selectedMode === 'summarize'
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-2xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Executive Summary</span>
        </button>
      </div>

      {/* Quick Prompts Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 no-scrollbar">
        <span className="text-[11px] text-[var(--text-muted)] font-medium shrink-0">Suggestions:</span>
        {samplePrompts.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(item.prompt)}
            className="px-2.5 py-1 rounded-full text-xs bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex gap-3 text-xs ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 font-bold mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 space-y-2.5 shadow-2xs ${
                  isUser
                    ? 'bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 rounded-tr-none'
                    : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-tl-none'
                }`}
              >
                {/* Content */}
                <div className="whitespace-pre-wrap leading-relaxed space-y-2">
                  {msg.content}
                </div>

                {/* Matched Employee Cards (if returned in search) */}
                {msg.matchedEmployees && msg.matchedEmployees.length > 0 && (
                  <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                    <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Matched Employee Profiles
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.matchedEmployees.map((emp) => (
                        <div
                          key={emp.id}
                          onClick={() => onSelectEmployee(emp.id)}
                          className="p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] transition-all cursor-pointer flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-[var(--text-primary)] truncate text-xs">{emp.name}</div>
                            <div className="text-[10px] text-[var(--text-secondary)] truncate">
                              {emp.job_title} · {emp.department_name}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <StatusPill status={emp.status} size="sm" />
                            <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source Data Tags & Follow-ups */}
                {!isUser && (
                  <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                    {msg.dataSources && msg.dataSources.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-[var(--text-muted)]">
                        <span>Data context verified:</span>
                        {msg.dataSources.map((src, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] font-mono"
                          >
                            {src}
                          </span>
                        ))}
                      </div>
                    )}

                    {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] text-[var(--text-muted)] font-medium">Follow-up:</span>
                        {msg.suggestedFollowups.map((fUp, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendMessage(fUp)}
                            className="px-2 py-0.5 rounded-md text-[11px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium transition-colors cursor-pointer"
                          >
                            {fUp}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-200 flex items-center justify-center shrink-0 font-bold mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 text-xs justify-start">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 font-bold mt-0.5">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="max-w-md rounded-2xl p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-tl-none flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              <span>Analyzing organization data and labor policies...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="relative shrink-0 pt-2"
      >
        <div className="flex items-center gap-2 p-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xs focus-within:ring-2 focus-within:ring-amber-500/30">
          <input
            id="ai-assistant-input"
            type="text"
            placeholder={
              selectedMode === 'search'
                ? 'Search employees by role, department, country, or status...'
                : selectedMode === 'summarize'
                ? 'Ask for executive summary of employee, department, or company...'
                : 'Ask anything about company leave policies, compliance, staff, or attendance...'
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading}
            className="flex-1 px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] bg-transparent focus:outline-none disabled:opacity-50"
          />

          <button
            type="submit"
            id="ai-assistant-send-btn"
            disabled={!inputValue.trim() || loading}
            className="p-2 rounded-xl bg-stone-900 text-stone-100 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] px-3 pt-1.5">
          <span>Go-Ya HR AI responds strictly based on workspace data and statutory labor laws.</span>
          <span>Role: {role === 'hr_head' ? 'HR Head' : 'HR Analyst'}</span>
        </div>
      </form>
    </div>
  );
};
