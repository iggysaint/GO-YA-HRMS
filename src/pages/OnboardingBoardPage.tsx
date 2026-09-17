import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { OnboardingTask, Employee } from '../types';
import { OnboardingDrawerModal } from '../components/OnboardingDrawerModal';
import { Card } from '../components/Card';
import { StatusPill } from '../components/StatusPill';
import {
  CheckCircle2,
  Clock,
  CircleDashed,
  User,
  ArrowRight,
  Filter,
  Plus,
  Search,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

interface OnboardingBoardItem {
  employee: {
    id: string;
    name: string;
    job_title: string;
    department_name: string;
    country: string;
    start_date: string;
    status: string;
  };
  column: 'to_do' | 'in_progress' | 'complete';
  percentage: number;
  total_tasks: number;
  completed_tasks: number;
  tasks: OnboardingTask[];
}

interface OnboardingBoardPageProps {
  onOpenAddEmployee: () => void;
  onSelectEmployee: (id: string) => void;
}

export const OnboardingBoardPage: React.FC<OnboardingBoardPageProps> = ({
  onOpenAddEmployee,
  onSelectEmployee,
}) => {
  const { authFetch, organization, role, subscribeToRealtime } = useAuth();
  const [boardItems, setBoardItems] = useState<OnboardingBoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemForDrawer, setSelectedItemForDrawer] = useState<OnboardingBoardItem | null>(null);

  const fetchOnboardingItems = useCallback(async () => {
    try {
      const res = await authFetch('/api/onboarding');
      if (res.ok) {
        const data: OnboardingBoardItem[] = await res.json();
        setBoardItems(data);
        setSelectedItemForDrawer((current) => {
          if (!current) return null;
          const matched = data.find((item) => item.employee?.id === current.employee?.id);
          return matched || current;
        });
      }
    } catch (err) {
      console.error('Failed to fetch onboarding board:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchOnboardingItems();
  }, [fetchOnboardingItems]);

  useEffect(() => {
    const unsubscribe = subscribeToRealtime((payload) => {
      if (
        payload.event === 'onboarding_task_updated' ||
        payload.event === 'onboarding_updated' ||
        payload.event === 'employee_created' ||
        payload.event === 'employee_updated'
      ) {
        fetchOnboardingItems();
      }
    });
    return unsubscribe;
  }, [subscribeToRealtime, fetchOnboardingItems]);

  const filteredItems = boardItems.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const empName = item.employee?.name || '';
    const jobTitle = item.employee?.job_title || '';
    const deptName = item.employee?.department_name || '';
    const country = item.employee?.country || '';
    return (
      empName.toLowerCase().includes(q) ||
      jobTitle.toLowerCase().includes(q) ||
      deptName.toLowerCase().includes(q) ||
      country.toLowerCase().includes(q)
    );
  });

  const todoItems = filteredItems.filter((i) => i.column === 'to_do');
  const inProgressItems = filteredItems.filter((i) => i.column === 'in_progress');
  const completeItems = filteredItems.filter((i) => i.column === 'complete');

  return (
    <div id="onboarding-board-page" className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Employee Onboarding
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
              Kanban Board
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Country-specific compliance checklists managed by HR on employee behalf ({organization?.country} statutory standard)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search hires..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] w-48"
            />
          </div>

          <button
            onClick={onOpenAddEmployee}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Hire</span>
          </button>
        </div>
      </div>

      {/* Kanban Board 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Column 1: To-do (0%) */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <CircleDashed className="w-4 h-4 text-stone-400" />
              <span className="text-xs font-bold text-[var(--text-primary)]">To-do</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] font-medium">
                {todoItems.length}
              </span>
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">0% completed</span>
          </div>

          <div className="space-y-3 min-h-[160px]">
            {todoItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                No employees awaiting onboarding start.
              </div>
            ) : (
              todoItems.map((item) => (
                <Card
                  key={item.employee.id}
                  id={`onboarding-card-${item.employee.id}`}
                  interactive
                  padding="normal"
                  onClick={() => setSelectedItemForDrawer(item)}
                  className="group space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors">
                        {item.employee?.name || 'Employee'}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {item.employee?.job_title || ''} · {item.employee?.department_name || ''}
                      </div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-muted)] shrink-0 font-medium">
                      {item.employee?.country || ''}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                      <span>{item.completed_tasks}/{item.total_tasks} tasks</span>
                      <span className="font-semibold text-[var(--text-primary)]">{item.percentage}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                      <div
                        className="h-full bg-stone-400 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-[var(--text-muted)]">
                    <span>Started {item.employee.start_date}</span>
                    <span className="text-xs text-[var(--text-primary)] font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Checklist
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Column 2: In progress (1% - 99%) */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-[var(--text-primary)]">In progress</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold">
                {inProgressItems.length}
              </span>
            </div>
            <span className="text-[11px] text-amber-600 dark:text-amber-400">1% - 99% done</span>
          </div>

          <div className="space-y-3 min-h-[160px]">
            {inProgressItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                No employees currently in progress.
              </div>
            ) : (
              inProgressItems.map((item) => (
                <Card
                  key={item.employee.id}
                  id={`onboarding-card-${item.employee.id}`}
                  interactive
                  padding="normal"
                  onClick={() => setSelectedItemForDrawer(item)}
                  className="group space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {item.employee?.name || 'Employee'}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {item.employee?.job_title || ''} · {item.employee?.department_name || ''}
                      </div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-muted)] shrink-0 font-medium">
                      {item.employee?.country || ''}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                      <span>{item.completed_tasks}/{item.total_tasks} tasks</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{item.percentage}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-[var(--text-muted)]">
                    <span>Started {item.employee?.start_date || ''}</span>
                    <span className="text-xs text-[var(--text-primary)] font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Checklist
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Complete (100%) */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-[var(--text-primary)]">Complete</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold">
                {completeItems.length}
              </span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">100% completed</span>
          </div>

          <div className="space-y-3 min-h-[160px]">
            {completeItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                No fully completed onboardings yet.
              </div>
            ) : (
              completeItems.map((item) => (
                <Card
                  key={item.employee?.id || Math.random()}
                  id={`onboarding-card-${item.employee?.id || 'unknown'}`}
                  interactive
                  padding="normal"
                  onClick={() => setSelectedItemForDrawer(item)}
                  className="group space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {item.employee?.name || 'Employee'}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {item.employee?.job_title || ''} · {item.employee?.department_name || ''}
                      </div>
                    </div>
                    <StatusPill variant="green" label="Done" />
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                      <span>{item.completed_tasks}/{item.total_tasks} tasks</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">100%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `100%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-[var(--text-muted)]">
                    <span>Active full-hire</span>
                    <span className="text-xs text-[var(--text-primary)] font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      View items
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Checklist Drawer Modal */}
      {selectedItemForDrawer && (
        <OnboardingDrawerModal
          isOpen={Boolean(selectedItemForDrawer)}
          onClose={() => setSelectedItemForDrawer(null)}
          employee={selectedItemForDrawer.employee}
          tasks={selectedItemForDrawer.tasks}
          onTaskUpdated={() => {
            fetchOnboardingItems();
          }}
        />
      )}
    </div>
  );
};
