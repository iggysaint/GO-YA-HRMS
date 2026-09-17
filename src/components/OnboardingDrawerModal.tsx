import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { OnboardingTask, OnboardingTaskCategory } from '../types';
import {
  X,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  CreditCard,
  Phone,
  Shield,
  Upload,
  BookOpen,
  User,
  Plus,
  Pencil,
  Trash2,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface OnboardingDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: {
    id: string;
    name: string;
    job_title: string;
    department_name: string;
    country: string;
    start_date: string;
  };
  tasks: OnboardingTask[];
  onTaskUpdated: () => void;
}

export const OnboardingDrawerModal: React.FC<OnboardingDrawerModalProps> = ({
  isOpen,
  onClose,
  employee,
  tasks,
  onTaskUpdated,
}) => {
  const { authFetch } = useAuth();
  const [localTasks, setLocalTasks] = useState<OnboardingTask[]>(tasks);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  // New task form state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<OnboardingTaskCategory>('personal_info');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Edit task state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<OnboardingTaskCategory>('personal_info');
  const [editNotes, setEditNotes] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Sync props.tasks to local state
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  if (!isOpen) return null;

  const completedCount = localTasks.filter((t) => t.status === 'completed').length;
  const totalTasksCount = localTasks.length;
  const percentage = totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 0;

  // Toggle single task status immediately (optimistic UI update)
  const toggleTaskStatus = async (task: OnboardingTask) => {
    const isCompleted = task.status === 'completed';
    const newStatus: 'completed' | 'pending' = isCompleted ? 'pending' : 'completed';

    // Instant optimistic update
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      setUpdatingTaskId(task.id);
      const res = await authFetch(`/api/onboarding/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        onTaskUpdated();
      } else {
        // Revert on server error
        setLocalTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
        );
      }
    } catch (err) {
      console.error('Failed to toggle task status:', err);
      // Revert on error
      setLocalTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Create new task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      setIsSubmittingNew(true);
      const res = await authFetch(`/api/onboarding/${employee.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: newTaskTitle.trim(),
          category: newTaskCategory,
          notes: newTaskNotes.trim() || undefined,
        }),
      });

      if (res.ok) {
        const createdTask: OnboardingTask = await res.json();
        setLocalTasks((prev) => [...prev, createdTask]);
        setNewTaskTitle('');
        setNewTaskNotes('');
        setIsAddingTask(false);
        onTaskUpdated();
      }
    } catch (err) {
      console.error('Failed to create onboarding task:', err);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Start editing a task
  const handleStartEdit = (task: OnboardingTask) => {
    setEditingTaskId(task.id);
    setEditTitle(task.task);
    setEditCategory(task.category);
    setEditNotes(task.notes || '');
  };

  // Save edited task
  const handleSaveEdit = async (taskId: string) => {
    if (!editTitle.trim()) return;

    try {
      setIsSubmittingEdit(true);
      // Optimistic update
      setLocalTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                task: editTitle.trim(),
                category: editCategory,
                notes: editNotes.trim() || undefined,
              }
            : t
        )
      );

      const res = await authFetch(`/api/onboarding/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: editTitle.trim(),
          category: editCategory,
          notes: editNotes.trim() || undefined,
        }),
      });

      if (res.ok) {
        setEditingTaskId(null);
        onTaskUpdated();
      }
    } catch (err) {
      console.error('Failed to save edited task:', err);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to remove this onboarding task?')) return;

    try {
      // Optimistic deletion
      setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));

      const res = await authFetch(`/api/onboarding/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        onTaskUpdated();
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const getCategoryIcon = (category: OnboardingTaskCategory) => {
    switch (category) {
      case 'personal_info':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'emergency_contact':
        return <Phone className="w-4 h-4 text-emerald-500" />;
      case 'payroll_bank':
        return <CreditCard className="w-4 h-4 text-amber-500" />;
      case 'statutory_info':
        return <Shield className="w-4 h-4 text-purple-500" />;
      case 'document_upload':
        return <Upload className="w-4 h-4 text-pink-500" />;
      case 'policy_acknowledgement':
        return <BookOpen className="w-4 h-4 text-indigo-500" />;
      default:
        return <FileText className="w-4 h-4 text-stone-500" />;
    }
  };

  const getCategoryLabel = (category: OnboardingTaskCategory) => {
    switch (category) {
      case 'personal_info':
        return 'Personal Info & Biodata';
      case 'emergency_contact':
        return 'Emergency Contact';
      case 'payroll_bank':
        return 'Payroll & Bank Setup';
      case 'statutory_info':
        return 'Statutory Info (SSNIT/TIN/ID)';
      case 'document_upload':
        return 'Document Upload';
      case 'policy_acknowledgement':
        return 'Policy Acknowledgement';
      default:
        return category;
    }
  };

  return (
    <div
      id="onboarding-drawer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-100"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--popover-shadow)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 flex items-center justify-center font-bold text-base shrink-0">
              {employee?.name ? employee.name.charAt(0).toUpperCase() : 'E'}
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">{employee?.name || 'Employee'}</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {employee?.job_title || ''} · {employee?.department_name || ''} ({employee?.country || ''})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAddingTask && (
              <button
                id="btn-add-onboarding-task"
                onClick={() => setIsAddingTask(true)}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Summary Bar */}
        <div className="px-6 py-3 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)] mb-1">
              <span>Onboarding Checklist Progress</span>
              <span id="onboarding-progress-text">
                {percentage}% ({completedCount}/{totalTasksCount} tasks)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--border-subtle)] overflow-hidden">
              <div
                id="onboarding-progress-fill"
                className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] shrink-0 hidden sm:block">
            Country: <strong>{employee?.country || 'Standard'}</strong>
          </div>
        </div>

        {/* Task List & Editable Forms */}
        <div className="p-6 space-y-3 overflow-y-auto flex-1 divide-y divide-[var(--border-subtle)]">
          {/* Add New Task Inline Form */}
          {isAddingTask && (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Add Custom Onboarding Task
                </span>
                <button
                  onClick={() => setIsAddingTask(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-3">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Task description (e.g. Setup company laptop & Slack)"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1">
                      Category
                    </label>
                    <select
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value as OnboardingTaskCategory)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="personal_info">Personal Info & Biodata</option>
                      <option value="emergency_contact">Emergency Contact</option>
                      <option value="payroll_bank">Payroll & Bank Setup</option>
                      <option value="statutory_info">Statutory Info (SSNIT/TIN/ID)</option>
                      <option value="document_upload">Document Upload</option>
                      <option value="policy_acknowledgement">Policy Acknowledgement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1">
                      Optional Guidance Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ensure signed form is attached"
                      value={newTaskNotes}
                      onChange={(e) => setNewTaskNotes(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    className="px-3 py-1 text-xs font-medium rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNew || !newTaskTitle.trim()}
                    className="px-3.5 py-1 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
                  >
                    {isSubmittingNew ? 'Saving...' : 'Add Task'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {localTasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)] space-y-2">
              <p>No tasks configured for this onboarding checklist.</p>
              <button
                onClick={() => setIsAddingTask(true)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-opacity cursor-pointer"
              >
                Add First Task
              </button>
            </div>
          ) : (
            localTasks.map((task) => {
              const isEditing = editingTaskId === task.id;
              const isCompleted = task.status === 'completed';

              if (isEditing) {
                return (
                  <div key={task.id} className="pt-3 first:pt-0 space-y-2.5 bg-[var(--bg-subtle)]/60 p-3 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary)]">Edit Task</span>
                      <span className="text-[10px] text-[var(--text-muted)]">ID: {task.id}</span>
                    </div>

                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)]"
                      placeholder="Task description"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Category</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as OnboardingTaskCategory)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none"
                        >
                          <option value="personal_info">Personal Info & Biodata</option>
                          <option value="emergency_contact">Emergency Contact</option>
                          <option value="payroll_bank">Payroll & Bank Setup</option>
                          <option value="statutory_info">Statutory Info (SSNIT/TIN/ID)</option>
                          <option value="document_upload">Document Upload</option>
                          <option value="policy_acknowledgement">Policy Acknowledgement</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Notes</label>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Optional guidance notes"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingTaskId(null)}
                        className="px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(task.id)}
                        disabled={isSubmittingEdit || !editTitle.trim()}
                        className="px-3 py-1 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={task.id}
                  id={`task-item-${task.id}`}
                  className="pt-3 first:pt-0 flex items-start justify-between gap-3 group transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Interactive Circular Status Indicator */}
                    <button
                      id={`task-toggle-${task.id}`}
                      type="button"
                      onClick={() => toggleTaskStatus(task)}
                      disabled={updatingTaskId === task.id}
                      aria-label={`Mark task ${task.task} as ${isCompleted ? 'pending' : 'completed'}`}
                      className="mt-0.5 p-1 -m-1 rounded-full cursor-pointer hover:bg-emerald-500/10 active:scale-90 transition-all text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/15" />
                      ) : (
                        <Circle className="w-5 h-5 text-[var(--border-strong)] group-hover:text-emerald-500 group-hover:border-emerald-500 transition-colors" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                          {getCategoryIcon(task.category)}
                          <span
                            onClick={() => toggleTaskStatus(task)}
                            className={`cursor-pointer select-none transition-all ${
                              isCompleted
                                ? 'line-through text-[var(--text-muted)]'
                                : 'hover:text-[var(--accent-blue)]'
                            }`}
                          >
                            {task.task}
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                        <span className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[10px]">
                          {getCategoryLabel(task.category)}
                        </span>
                      </div>

                      {task.notes && (
                        <div className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-subtle)]/50 p-1.5 rounded border border-[var(--border-subtle)] mt-1">
                          {task.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Badge */}
                  <div className="shrink-0 flex items-center gap-2 pt-0.5">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button
                        title="Edit task"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(task);
                        }}
                        className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Delete task"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task.id);
                        }}
                        className="p-1 rounded-md text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleTaskStatus(task)}
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium cursor-pointer transition-colors ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                      }`}
                    >
                      {isCompleted ? 'Done' : 'Pending'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>Click circle or status badge to toggle task completion.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-all cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
