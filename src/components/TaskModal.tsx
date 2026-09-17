import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TaskWithDetails, TaskStatus, TaskPriority, Employee } from '../types';
import {
  X,
  Calendar,
  User,
  AlertCircle,
  Clock,
  Trash2,
  CheckCircle2,
  ListTodo,
} from 'lucide-react';

interface WorkspaceMember {
  user_id: string;
  email: string;
  role: string;
  is_current_user?: boolean;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: TaskWithDetails | null;
  initialStatus?: TaskStatus;
  employees: Employee[];
  members: WorkspaceMember[];
  onTaskSaved: () => void;
  onTaskDeleted?: (taskId: string) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  task,
  initialStatus = 'todo',
  employees,
  members,
  onTaskSaved,
  onTaskDeleted,
}) => {
  const { authFetch, user, role } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [relatedEmployeeId, setRelatedEmployeeId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Check if current user has edit permission for this task
  // HR Head can edit all tasks; HR Analyst can edit tasks assigned to or created by them
  const canEdit =
    !task ||
    role === 'hr_head' ||
    task.assignee_id === user?.id ||
    task.created_by === user?.id;

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setStatus(task.status || 'todo');
      setPriority(task.priority || 'medium');
      setAssigneeId(task.assignee_id || user?.id || '');
      setRelatedEmployeeId(task.related_employee_id || '');
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
    } else {
      setTitle('');
      setDescription('');
      setStatus(initialStatus);
      setPriority('medium');
      setAssigneeId(user?.id || (members[0]?.user_id || ''));
      setRelatedEmployeeId('');
      setDueDate('');
    }
    setError(null);
    setFieldErrors({});
  }, [task, initialStatus, user?.id, members]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side input validation
    const errors: Record<string, string> = {};
    if (!title.trim()) {
      errors.title = 'Task title is required.';
    } else if (title.trim().length > 120) {
      errors.title = 'Task title cannot exceed 120 characters.';
    }

    if (!assigneeId) {
      errors.assigneeId = 'Please select a workspace member to assign this task.';
    }

    if (description && description.length > 2000) {
      errors.description = 'Description cannot exceed 2,000 characters.';
    }

    if (dueDate) {
      const parsed = new Date(dueDate);
      if (isNaN(parsed.getTime())) {
        errors.dueDate = 'Please provide a valid due date.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        assignee_id: assigneeId,
        related_employee_id: relatedEmployeeId || null,
        due_date: dueDate || null,
      };

      let res: Response;
      if (task) {
        res = await authFetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await authFetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        onTaskSaved();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save task');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await authFetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        if (onTaskDeleted) onTaskDeleted(task.id);
        onTaskSaved();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete task');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      id="task-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        id="task-modal-container"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)]">
              <ListTodo className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {task ? 'Task Details' : 'Create New Task'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {task ? 'Update task progress and assignment' : 'Add a task to team workflows board'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="task-modal-close-btn"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* RLS View-Only Banner */}
        {!canEdit && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              View-only mode: Under workspace RLS policies, HR Analysts can only modify tasks assigned to or created by them.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="task-title-input" className="block text-xs font-semibold text-[var(--text-primary)]">
                Title <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-[var(--text-muted)]">
                {title.length}/120
              </span>
            </div>
            <input
              type="text"
              id="task-title-input"
              value={title}
              maxLength={120}
              onChange={(e) => {
                setTitle(e.target.value);
                if (fieldErrors.title) {
                  setFieldErrors((prev) => ({ ...prev, title: '' }));
                }
              }}
              disabled={!canEdit}
              placeholder="e.g. Q3 Compensation Review, Contract Rollover..."
              required
              aria-invalid={!!fieldErrors.title}
              aria-describedby={fieldErrors.title ? "task-title-error" : undefined}
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors disabled:opacity-60 ${
                fieldErrors.title
                  ? 'border-rose-500 focus:border-rose-600 focus:ring-1 focus:ring-rose-500/20'
                  : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
              }`}
            />
            {fieldErrors.title && (
              <p id="task-title-error" className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                <span>{fieldErrors.title}</span>
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="task-description-input" className="block text-xs font-semibold text-[var(--text-primary)]">
                Description
              </label>
              <span className="text-[10px] text-[var(--text-muted)]">
                {description.length}/2000
              </span>
            </div>
            <textarea
              id="task-description-input"
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (fieldErrors.description) {
                  setFieldErrors((prev) => ({ ...prev, description: '' }));
                }
              }}
              disabled={!canEdit}
              placeholder="Add key context, links, or instructions..."
              aria-invalid={!!fieldErrors.description}
              aria-describedby={fieldErrors.description ? "task-desc-error" : undefined}
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors disabled:opacity-60 resize-none ${
                fieldErrors.description
                  ? 'border-rose-500 focus:border-rose-600'
                  : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
              }`}
            />
            {fieldErrors.description && (
              <p id="task-desc-error" className="text-[11px] text-rose-500 font-medium mt-1">
                {fieldErrors.description}
              </p>
            )}
          </div>

          {/* Grid: Status & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-status-select" className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                Status
              </label>
              <select
                id="task-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                disabled={!canEdit}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)] disabled:opacity-60 cursor-pointer"
              >
                <option value="todo">To-do</option>
                <option value="in_progress">In progress</option>
                <option value="in_review">In review</option>
                <option value="complete">Complete</option>
              </select>
            </div>

            <div>
              <label htmlFor="task-priority-select" className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                Priority
              </label>
              <select
                id="task-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                disabled={!canEdit}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)] disabled:opacity-60 cursor-pointer"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Grid: Assignee & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-assignee-select" className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                Assignee <span className="text-rose-500">*</span>
              </label>
              <select
                id="task-assignee-select"
                value={assigneeId}
                onChange={(e) => {
                  setAssigneeId(e.target.value);
                  if (fieldErrors.assigneeId) {
                    setFieldErrors((prev) => ({ ...prev, assigneeId: '' }));
                  }
                }}
                disabled={!canEdit}
                required
                aria-invalid={!!fieldErrors.assigneeId}
                aria-describedby={fieldErrors.assigneeId ? "task-assignee-error" : undefined}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors disabled:opacity-60 cursor-pointer ${
                  fieldErrors.assigneeId
                    ? 'border-rose-500 focus:border-rose-600'
                    : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
                }`}
              >
                <option value="">Select assignee...</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.email} ({m.role === 'hr_head' ? 'HR Head' : 'HR Analyst'})
                    {m.user_id === user?.id ? ' (You)' : ''}
                  </option>
                ))}
              </select>
              {fieldErrors.assigneeId && (
                <p id="task-assignee-error" className="text-[11px] text-rose-500 font-medium mt-1">
                  {fieldErrors.assigneeId}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="task-due-date-input" className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                Due Date
              </label>
              <input
                type="date"
                id="task-due-date-input"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (fieldErrors.dueDate) {
                    setFieldErrors((prev) => ({ ...prev, dueDate: '' }));
                  }
                }}
                disabled={!canEdit}
                aria-invalid={!!fieldErrors.dueDate}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none transition-colors disabled:opacity-60 ${
                  fieldErrors.dueDate
                    ? 'border-rose-500 focus:border-rose-600'
                    : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
                }`}
              />
              {fieldErrors.dueDate && (
                <p id="task-duedate-error" className="text-[11px] text-rose-500 font-medium mt-1">
                  {fieldErrors.dueDate}
                </p>
              )}
            </div>
          </div>

          {/* Optional Linked Employee */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Linked Employee <span className="text-[var(--text-muted)] font-normal">(Optional)</span>
            </label>
            <select
              id="task-related-employee-select"
              value={relatedEmployeeId}
              onChange={(e) => setRelatedEmployeeId(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)] disabled:opacity-60 cursor-pointer"
            >
              <option value="">None (Workspace-wide task)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} — {emp.job_title} ({emp.country})
                </option>
              ))}
            </select>
          </div>

          {/* Footer Metadata (if editing existing task) */}
          {task && (
            <div className="pt-2 text-[11px] text-[var(--text-muted)] flex items-center justify-between border-t border-[var(--border-subtle)]">
              <span>
                Created by {task.creator_email || task.creator_name || 'HR Team'} on{' '}
                {new Date(task.created_at).toLocaleDateString()}
              </span>
              <span>ID: {task.id.substring(0, 10)}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {task && canEdit ? (
              <button
                type="button"
                id="task-delete-btn"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {canEdit && (
                <button
                  type="submit"
                  id="task-save-btn"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--text-primary)] text-[var(--bg-surface)] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  {saving ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
