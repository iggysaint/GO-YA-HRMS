import React from 'react';
import { TaskWithDetails, TaskStatus, TaskPriority } from '../types';
import {
  Calendar,
  User,
  AlertCircle,
  Clock,
  CheckCircle2,
  CircleDashed,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Card } from './Card';
import { StatusPill } from './StatusPill';

interface TaskCardProps {
  task: TaskWithDetails;
  onSelect: (task: TaskWithDetails) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onSelectEmployee?: (employeeId: string) => void;
  canEdit?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onSelect,
  onStatusChange,
  onSelectEmployee,
  canEdit = true,
}) => {
  const isComplete = task.status === 'complete';

  // Compute due date status
  let dueDateLabel = '';
  let isOverdue = false;
  let isDueToday = false;

  if (task.due_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.due_date);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      isOverdue = !isComplete;
      dueDateLabel = `${Math.abs(diffDays)}d overdue`;
    } else if (diffDays === 0) {
      isDueToday = true;
      dueDateLabel = 'Due today';
    } else if (diffDays === 1) {
      dueDateLabel = 'Tomorrow';
    } else {
      dueDateLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(due);
    }
  }

  const handleDragStart = (e: React.DragEvent) => {
    if (!canEdit) return;
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Card
      id={`task-card-${task.id}`}
      padding="sm"
      interactive={canEdit}
      draggable={canEdit}
      onDragStart={handleDragStart}
      onClick={() => onSelect(task)}
      className={`group relative select-none space-y-2.5 ${
        canEdit ? 'active:cursor-grabbing active:scale-[0.99]' : ''
      }`}
    >
      {/* Top row: Priority & Due date */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <StatusPill priority={task.priority} />
        </div>

        {task.due_date && (
          <div
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded ${
              isOverdue
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold'
                : isDueToday
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
                : 'text-[var(--text-muted)] bg-[var(--bg-subtle)]'
            }`}
            title={`Due date: ${task.due_date}`}
          >
            {isOverdue ? (
              <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
            ) : (
              <Calendar className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
            )}
            <span>{dueDateLabel}</span>
          </div>
        )}
      </div>

      {/* Task Title */}
      <div>
        <h4
          className={`text-xs font-semibold leading-snug group-hover:text-[var(--accent-blue)] transition-colors line-clamp-2 ${
            isComplete
              ? 'line-through text-[var(--text-muted)]'
              : 'text-[var(--text-primary)]'
          }`}
        >
          {task.title}
        </h4>

        {task.description && (
          <p className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed opacity-90">
            {task.description}
          </p>
        )}
      </div>

      {/* Linked Employee (if any) */}
      {task.related_employee_name && (
        <div
          onClick={(e) => {
            if (task.related_employee_id && onSelectEmployee) {
              e.stopPropagation();
              onSelectEmployee(task.related_employee_id);
            }
          }}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors max-w-full truncate"
          title={`Linked employee: ${task.related_employee_name}${
            task.related_employee_job_title ? ` (${task.related_employee_job_title})` : ''
          }`}
        >
          <User className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
          <span className="truncate font-medium">{task.related_employee_name}</span>
        </div>
      )}

      {/* Card Footer: Assignee & Creator info */}
      <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]/60 text-[11px] text-[var(--text-muted)]">
        <div
          className="flex items-center gap-1.5"
          title={`Assignee: ${task.assignee_email || task.assignee_name || 'Unassigned'}`}
        >
          <div className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-700 text-[var(--text-primary)] text-[10px] font-bold flex items-center justify-center shrink-0">
            {(task.assignee_name || task.assignee_email || 'U').charAt(0).toUpperCase()}
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] truncate max-w-[120px]">
            {task.assignee_name || task.assignee_email}
          </span>
        </div>

        {/* Quick status stepper button if canEdit */}
        {canEdit && onStatusChange && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const nextStatusMap: Record<TaskStatus, TaskStatus> = {
                todo: 'in_progress',
                in_progress: 'in_review',
                in_review: 'complete',
                complete: 'todo',
              };
              onStatusChange(task.id, nextStatusMap[task.status]);
            }}
            title="Advance task status"
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-opacity"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </Card>
  );
};
