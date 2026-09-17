import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { TaskWithDetails, TaskStatus, TaskPriority, TaskViewMode, Employee } from '../types';
import { TaskCard } from '../components/TaskCard';
import { TaskModal } from '../components/TaskModal';
import { Card } from '../components/Card';
import { StatusPill } from '../components/StatusPill';
import {
  ListTodo,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Users,
  Clock,
  CheckCircle2,
  CircleDashed,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Building,
  Layers,
  AlertCircle,
} from 'lucide-react';

interface TasksPageProps {
  onSelectEmployee?: (employeeId: string) => void;
}

interface ColumnConfig {
  id: TaskStatus;
  title: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  icon: React.ReactNode;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'todo',
    title: 'To-do',
    badgeBg: 'bg-stone-100 dark:bg-stone-800',
    badgeText: 'text-stone-700 dark:text-stone-300',
    borderColor: 'border-[var(--border-subtle)]',
    icon: <CircleDashed className="w-3.5 h-3.5 text-stone-500" />,
  },
  {
    id: 'in_progress',
    title: 'In progress',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    badgeText: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-500/20',
    icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  },
  {
    id: 'in_review',
    title: 'In review',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    borderColor: 'border-indigo-500/20',
    icon: <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />,
  },
  {
    id: 'complete',
    title: 'Complete',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-500/20',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  },
];

export const TasksPage: React.FC<TasksPageProps> = ({ onSelectEmployee }) => {
  const { authFetch, user, role, isRealtimeConnected, subscribeToRealtime } = useAuth();

  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View switch: 'company' | 'my' | 'timeline'
  const [activeView, setActiveView] = useState<TaskViewMode>('company');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Drag and drop state
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [modalInitialStatus, setModalInitialStatus] = useState<TaskStatus>('todo');

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      const res = await authFetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  // Fetch employees and workspace members for modal dropdowns
  const fetchContextData = useCallback(async () => {
    try {
      const [resEmp, resMembers] = await Promise.all([
        authFetch('/api/employees'),
        authFetch('/api/workspace/members'),
      ]);

      if (resEmp.ok) {
        const data = await resEmp.json();
        setEmployees(data);
      }

      if (resMembers.ok) {
        const data = await resMembers.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('Failed to fetch context data:', err);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchTasks();
    fetchContextData();
  }, [fetchTasks, fetchContextData]);

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = subscribeToRealtime((payload) => {
      if (
        payload.event === 'task_created' ||
        payload.event === 'task_updated' ||
        payload.event === 'task_moved' ||
        payload.event === 'task_deleted'
      ) {
        fetchTasks();
      }
    });
    return unsubscribe;
  }, [subscribeToRealtime, fetchTasks]);

  // Filter tasks based on view mode (Company vs My)
  const viewFilteredTasks = useMemo(() => {
    if (activeView === 'my') {
      return tasks.filter((t) => t.assignee_id === user?.id);
    }
    return tasks;
  }, [tasks, activeView, user?.id]);

  // Secondary filters (search, priority)
  const filteredTasks = useMemo(() => {
    return viewFilteredTasks.filter((task) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = task.description ? task.description.toLowerCase().includes(q) : false;
        const matchAssignee = task.assignee_email
          ? task.assignee_email.toLowerCase().includes(q)
          : false;
        const matchEmp = task.related_employee_name
          ? task.related_employee_name.toLowerCase().includes(q)
          : false;

        if (!matchTitle && !matchDesc && !matchAssignee && !matchEmp) return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }

      return true;
    });
  }, [viewFilteredTasks, searchQuery, priorityFilter]);

  // Handle Drag & Drop move
  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    // Check RLS permissions: HR Head can edit all, Analyst only assigned/created
    const canEdit =
      role === 'hr_head' || task.assignee_id === user?.id || task.created_by === user?.id;

    if (!canEdit) {
      alert('RLS Policy: HR Analysts can only move tasks assigned to or created by them.');
      return;
    }

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );

    try {
      const res = await authFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!res.ok) {
        // Revert on error
        fetchTasks();
      }
    } catch (err) {
      fetchTasks();
    }
  };

  // Quick status update from card stepper
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const canEdit =
      role === 'hr_head' || task.assignee_id === user?.id || task.created_by === user?.id;

    if (!canEdit) {
      alert('RLS Policy: HR Analysts can only update tasks assigned to or created by them.');
      return;
    }

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await authFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      fetchTasks();
    }
  };

  const handleOpenCreateModal = (status: TaskStatus = 'todo') => {
    setSelectedTask(null);
    setModalInitialStatus(status);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: TaskWithDetails) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  // Grouping for Timeline View
  const timelineGroups = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue: TaskWithDetails[] = [];
    const dueToday: TaskWithDetails[] = [];
    const thisWeek: TaskWithDetails[] = [];
    const upcoming: TaskWithDetails[] = [];
    const noDueDate: TaskWithDetails[] = [];

    // Sort tasks by due date ascending
    const sorted = [...filteredTasks].sort((a, b) => {
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    sorted.forEach((task) => {
      if (!task.due_date) {
        noDueDate.push(task);
        return;
      }

      const due = new Date(task.due_date);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0 && task.status !== 'complete') {
        overdue.push(task);
      } else if (diffDays === 0) {
        dueToday.push(task);
      } else if (diffDays > 0 && diffDays <= 7) {
        thisWeek.push(task);
      } else {
        upcoming.push(task);
      }
    });

    return [
      { id: 'overdue', label: 'Overdue', color: 'text-rose-600 dark:text-rose-400', items: overdue },
      { id: 'today', label: 'Today', color: 'text-amber-600 dark:text-amber-400', items: dueToday },
      { id: 'this_week', label: 'This Week', color: 'text-blue-600 dark:text-blue-400', items: thisWeek },
      { id: 'upcoming', label: 'Upcoming / Later', color: 'text-[var(--text-primary)]', items: upcoming },
      { id: 'no_due_date', label: 'No Due Date', color: 'text-[var(--text-muted)]', items: noDueDate },
    ];
  }, [filteredTasks]);

  // Counts for tabs
  const myTasksCount = tasks.filter((t) => t.assignee_id === user?.id && t.status !== 'complete').length;

  return (
    <div id="tasks-page-view" className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Tasks</h1>
            <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] font-semibold">
              Workflows
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Internal HR workflow board for task tracking, deadlines, and employee operations.
          </p>
        </div>

        {/* Top actions: New Task button */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            id="create-task-header-btn"
            onClick={() => handleOpenCreateModal('todo')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--text-primary)] text-[var(--bg-surface)] hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* View Switcher & Filters Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        {/* Saved Views Tabs (Company tasks / My tasks / Timeline) */}
        <div id="task-views-nav" className="flex items-center gap-1 bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-subtle)]">
          <button
            type="button"
            id="view-company-tasks-tab"
            onClick={() => setActiveView('company')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeView === 'company'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Building className="w-3.5 h-3.5 opacity-70" />
            <span>Company tasks</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] font-medium">
              {tasks.length}
            </span>
          </button>

          <button
            type="button"
            id="view-my-tasks-tab"
            onClick={() => setActiveView('my')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeView === 'my'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <User className="w-3.5 h-3.5 opacity-70" />
            <span>My tasks</span>
            {myTasksCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                {myTasksCount}
              </span>
            )}
          </button>

          <button
            type="button"
            id="view-timeline-tab"
            onClick={() => setActiveView('timeline')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeView === 'timeline'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 opacity-70" />
            <span>Timeline</span>
          </button>
        </div>

        {/* Search and Priority Filter Controls */}
        <div className="flex items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              id="tasks-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks or assignee..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)] w-48 sm:w-56"
            />
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <select
              id="tasks-priority-filter"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)] cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Role Banner / Context */}
      {role === 'hr_analyst' && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>HR Analyst Access:</strong> In accordance with workspace security policies, you see and edit tasks assigned to you or created by you.
            </span>
          </div>
          {activeView !== 'my' && (
            <button
              onClick={() => setActiveView('my')}
              className="underline font-semibold cursor-pointer shrink-0"
            >
              Switch to My Tasks
            </button>
          )}
        </div>
      )}

      {/* Main Content: Board View vs Timeline View */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[var(--text-muted)]">
          Loading workspace tasks...
        </div>
      ) : activeView === 'timeline' ? (
        /* TIMELINE VIEW (Date-ordered structured view) */
        <div id="tasks-timeline-view" className="space-y-6">
          {timelineGroups.every((g) => g.items.length === 0) ? (
            <div className="py-16 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-2xl p-8">
              No tasks found matching your filters. Click &quot;New Task&quot; to add one.
            </div>
          ) : (
            timelineGroups.map(
              (group) =>
                group.items.length > 0 && (
                  <div key={group.id} className="space-y-2.5">
                    <div className="flex items-center gap-2 pb-1 border-b border-[var(--border-subtle)]">
                      <h3 className={`text-xs font-bold uppercase tracking-wider ${group.color}`}>
                        {group.label}
                      </h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)] font-bold">
                        {group.items.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {group.items.map((task) => {
                        const canEdit =
                          role === 'hr_head' ||
                          task.assignee_id === user?.id ||
                          task.created_by === user?.id;

                        return (
                          <Card
                            key={task.id}
                            id={`timeline-task-row-${task.id}`}
                            interactive
                            padding="sm"
                            onClick={() => handleOpenEditModal(task)}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                          >
                            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                              {/* Quick checkbox or status indicator */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(
                                    task.id,
                                    task.status === 'complete' ? 'todo' : 'complete'
                                  );
                                }}
                                disabled={!canEdit}
                                title={task.status === 'complete' ? 'Mark incomplete' : 'Mark complete'}
                                className={`w-4 h-4 rounded mt-0.5 sm:mt-0 flex items-center justify-center border transition-colors shrink-0 ${
                                  task.status === 'complete'
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'border-[var(--border-strong)] hover:border-[var(--text-primary)]'
                                }`}
                              >
                                {task.status === 'complete' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`text-xs font-semibold group-hover:text-[var(--accent-blue)] transition-colors ${
                                      task.status === 'complete'
                                        ? 'line-through text-[var(--text-muted)]'
                                        : 'text-[var(--text-primary)]'
                                    }`}
                                  >
                                    {task.title}
                                  </span>

                                  {/* Priority Chip */}
                                  <StatusPill priority={task.priority} />

                                  {/* Status badge */}
                                  <StatusPill status={task.status} />
                                </div>

                                {task.description && (
                                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Right details: Linked employee, Assignee, Due date */}
                            <div className="flex items-center gap-3 shrink-0 text-xs">
                              {task.related_employee_name && (
                                <div
                                  onClick={(e) => {
                                    if (task.related_employee_id && onSelectEmployee) {
                                      e.stopPropagation();
                                      onSelectEmployee(task.related_employee_id);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                >
                                  <User className="w-3 h-3 text-[var(--text-muted)]" />
                                  <span>{task.related_employee_name}</span>
                                </div>
                              )}

                              <div
                                className="flex items-center gap-1.5"
                                title={`Assigned to: ${task.assignee_email || task.assignee_name}`}
                              >
                                <div className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-700 text-[10px] font-bold flex items-center justify-center">
                                  {(task.assignee_name || task.assignee_email || 'U').charAt(0).toUpperCase()}
                                </div>
                                <span className="text-[11px] text-[var(--text-secondary)] truncate max-w-[100px]">
                                  {task.assignee_name || task.assignee_email}
                                </span>
                              </div>

                              {task.due_date && (
                                <div className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] font-medium">
                                  <Calendar className="w-3 h-3" />
                                  <span>{task.due_date}</span>
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )
            )
          )}
        </div>
      ) : (
        /* KANBAN BOARD VIEW (To-do / In progress / In review / Complete) */
        <div
          id="tasks-kanban-board"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start"
        >
          {COLUMNS.map((col) => {
            const columnTasks = filteredTasks.filter((t) => t.status === col.id);
            const isDraggingOver = dragOverColumn === col.id;

            return (
              <div
                key={col.id}
                id={`task-column-${col.id}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverColumn(col.id);
                }}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col rounded-2xl border transition-all duration-150 ${
                  isDraggingOver
                    ? 'border-[var(--accent-blue)] bg-blue-500/5 ring-2 ring-blue-500/20'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40'
                } p-3.5 space-y-3 min-h-[460px]`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    {col.icon}
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">
                      {col.title}
                    </h3>
                    <span
                      id={`column-count-${col.id}`}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${col.badgeBg} ${col.badgeText}`}
                    >
                      {columnTasks.length}
                    </span>
                  </div>

                  {/* Add task button in header */}
                  <button
                    type="button"
                    onClick={() => handleOpenCreateModal(col.id)}
                    title={`Add task to ${col.title}`}
                    className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Task Cards Container */}
                <div className="flex-1 space-y-2.5 overflow-y-auto">
                  {columnTasks.length === 0 ? (
                    <div
                      onClick={() => handleOpenCreateModal(col.id)}
                      className="py-12 border border-dashed border-[var(--border-subtle)] rounded-xl flex flex-col items-center justify-center text-center p-4 hover:border-[var(--border-strong)] transition-colors cursor-pointer group"
                    >
                      <span className="text-[11px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                        No tasks in {col.title.toLowerCase()}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] mt-1 flex items-center gap-1 font-medium">
                        <Plus className="w-3 h-3" /> Click to add
                      </span>
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const canEdit =
                        role === 'hr_head' ||
                        task.assignee_id === user?.id ||
                        task.created_by === user?.id;

                      return (
                        <TaskCard
                          key={task.id}
                          task={task}
                          canEdit={canEdit}
                          onSelect={handleOpenEditModal}
                          onStatusChange={handleStatusChange}
                          onSelectEmployee={onSelectEmployee}
                        />
                      );
                    })
                  )}
                </div>

                {/* Bottom "+ Add Task" button */}
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal(col.id)}
                  className="w-full py-1.5 px-2 rounded-lg text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-dashed border-transparent hover:border-[var(--border-subtle)] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add task</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Create / Edit Modal */}
      {isModalOpen && (
        <TaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          task={selectedTask}
          initialStatus={modalInitialStatus}
          employees={employees}
          members={members}
          onTaskSaved={fetchTasks}
          onTaskDeleted={() => fetchTasks()}
        />
      )}
    </div>
  );
};
