import React, { useState } from 'react';
import {
  Receipt,
  Calendar,
  DollarSign,
  Tag,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  ExternalLink,
  Edit2,
  Trash2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { ExpenseWithDetails } from '../../types';
import { StatusPill } from '../StatusPill';

interface ExpenseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: ExpenseWithDetails | null;
  userRole: 'hr_head' | 'hr_analyst';
  currentUserId: string;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  onEdit: (expense: ExpenseWithDetails) => void;
  onDelete: (id: string) => Promise<void>;
}

export const ExpenseDetailsModal: React.FC<ExpenseDetailsModalProps> = ({
  isOpen,
  onClose,
  expense,
  userRole,
  currentUserId,
  onApprove,
  onReject,
  onEdit,
  onDelete,
}) => {
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !expense) return null;

  const isHRHead = userRole === 'hr_head';
  const isOwner = expense.submitted_by === currentUserId;
  const canEdit = isHRHead || (isOwner && expense.status !== 'approved');
  const canDelete = isHRHead || (isOwner && expense.status !== 'approved');

  const handleApprove = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await onApprove(expense.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to approve expense');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejecting this claim');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await onReject(expense.id, rejectionReason.trim());
      setIsRejecting(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reject expense');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this expense claim?')) return;
    setActionLoading(true);
    setError(null);
    try {
      await onDelete(expense.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete expense');
    } finally {
      setActionLoading(false);
    }
  };

  const isPdf =
    expense.receipt_url?.startsWith('data:application/pdf') ||
    expense.receipt_name?.toLowerCase().endsWith('.pdf');

  return (
    <div
      id="expense-details-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl w-full max-w-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Expense Claim #{expense.id.slice(-6).toUpperCase()}
                </h2>
                <StatusPill
                  status={expense.status}
                  label={
                    expense.status === 'pending'
                      ? 'Pending Review'
                      : expense.status.charAt(0).toUpperCase() + expense.status.slice(1)
                  }
                />
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Recorded on {new Date(expense.date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm p-1 rounded-md cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Main Key Highlights Box */}
          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Total Monetary Claim
              </p>
              <div className="text-xl font-bold text-[var(--text-primary)] mt-0.5">
                {expense.currency}{' '}
                {expense.amount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                <Tag className="w-3 h-3 text-indigo-500" />
                <span>{expense.category_name}</span>
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <h4 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Business Purpose
            </h4>
            <p className="text-xs text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg p-3 leading-relaxed">
              {expense.description}
            </p>
          </div>

          {/* Detailed Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-1">
              <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                <UserIcon className="w-3 h-3" />
                <span>Submitted By</span>
              </div>
              <p className="font-medium text-[var(--text-primary)]">
                {expense.submitted_by_name || 'System User'}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)]">
                {expense.submitted_by_email || 'Authenticated Account'}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-1">
              <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                <UserIcon className="w-3 h-3 text-indigo-500" />
                <span>Related Employee / Beneficiary</span>
              </div>
              {expense.related_employee_name ? (
                <>
                  <p className="font-medium text-[var(--text-primary)]">
                    {expense.related_employee_name}
                  </p>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    {expense.related_employee_job_title || 'Employee'}
                    {expense.related_employee_department && ` • ${expense.related_employee_department}`}
                  </p>
                </>
              ) : (
                <p className="font-medium text-[var(--text-muted)]">
                  Company-wide / General Overhead
                </p>
              )}
            </div>
          </div>

          {/* Approval & Audit Details */}
          {expense.status === 'approved' && expense.approved_by_name && (
            <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approved by {expense.approved_by_name}</span>
              </div>
              {expense.approved_at && (
                <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                  Approved on {new Date(expense.approved_at).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Rejection Details */}
          {expense.status === 'rejected' && (
            <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-rose-700 dark:text-rose-300">
                <XCircle className="w-3.5 h-3.5" />
                <span>Rejection Notice from HR Head</span>
              </div>
              <p className="text-[11px] text-rose-600 dark:text-rose-400">
                "{expense.rejection_notes || 'Expense did not meet governance policy.'}"
              </p>
            </div>
          )}

          {/* Rejection Prompt Form (if HR Head clicked Reject) */}
          {isRejecting && (
            <div className="p-4 rounded-lg border border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 space-y-3 animate-in fade-in duration-150">
              <div className="font-semibold text-rose-700 dark:text-rose-300 text-xs">
                Provide Rejection Feedback
              </div>
              <textarea
                rows={2}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Specify reasons for denial (e.g. missing invoice breakdown, exceeded quarterly cap)..."
                className="w-full px-3 py-2 rounded border border-rose-300 dark:border-rose-800 bg-[var(--bg-card)] text-xs text-[var(--text-primary)] focus:outline-none"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRejecting(false)}
                  className="px-3 py-1 rounded text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="px-3 py-1 rounded text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}

          {/* Receipt Proof Section */}
          <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                <span>Attached Receipt Document</span>
              </h4>
              {expense.receipt_url && (
                <div className="flex items-center gap-2">
                  <a
                    href={expense.receipt_url}
                    download={expense.receipt_name || 'expense_receipt.pdf'}
                    className="inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </a>
                  <a
                    href={expense.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open in new tab</span>
                  </a>
                </div>
              )}
            </div>

            {expense.receipt_url ? (
              <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden bg-zinc-900/5 dark:bg-zinc-900/40 p-2">
                {isPdf ? (
                  <div className="space-y-2">
                    <iframe
                      src={expense.receipt_url}
                      title="Receipt Preview"
                      className="w-full h-72 rounded border border-[var(--border-subtle)] bg-white"
                    />
                    <p className="text-[11px] text-center text-[var(--text-muted)]">
                      {expense.receipt_name || 'Receipt Document (PDF)'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-2">
                    <img
                      src={expense.receipt_url}
                      alt={expense.receipt_name || 'Receipt'}
                      className="max-h-72 object-contain rounded border border-[var(--border-subtle)]"
                    />
                    <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                      {expense.receipt_name || 'Receipt Image'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-dashed border-[var(--border-subtle)] text-center text-[var(--text-muted)]">
                No receipt or invoice was attached to this claim.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-[var(--bg-subtle)] border-t border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {canDelete && (
              <button
                type="button"
                id="delete-expense-btn"
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                id="edit-expense-btn"
                onClick={() => {
                  onClose();
                  onEdit(expense);
                }}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Approval Controls for HR Head on pending expenses */}
            {isHRHead && expense.status === 'pending' && !isRejecting && (
              <>
                <button
                  type="button"
                  id="reject-expense-prompt-btn"
                  onClick={() => setIsRejecting(true)}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
                <button
                  type="button"
                  id="approve-expense-action-btn"
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve Claim</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
