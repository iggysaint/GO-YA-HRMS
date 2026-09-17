import React, { useState, useEffect, useRef } from 'react';
import {
  Receipt,
  Upload,
  FileText,
  X,
  AlertCircle,
  Calendar,
  DollarSign,
  User as UserIcon,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { ExpenseCategory, ExpenseWithDetails, Employee } from '../../types';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (expenseData: any) => Promise<void>;
  categories: ExpenseCategory[];
  employees: Employee[];
  initialData?: ExpenseWithDetails | null;
  userRole: 'hr_head' | 'hr_analyst';
  defaultCurrency?: string;
  onOpenManageCategories?: () => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categories,
  employees,
  initialData,
  userRole,
  defaultCurrency = 'GHS',
  onOpenManageCategories,
}) => {
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [relatedEmployeeId, setRelatedEmployeeId] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState<string | null>(null);
  const [approveImmediately, setApproveImmediately] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset form
  useEffect(() => {
    if (initialData) {
      setCategoryId(initialData.category_id || (categories[0]?.id ?? ''));
      setAmount(String(initialData.amount || ''));
      setCurrency(initialData.currency || defaultCurrency);
      setDate(initialData.date || new Date().toISOString().split('T')[0]);
      setDescription(initialData.description || '');
      setRelatedEmployeeId(initialData.related_employee_id || '');
      setReceiptUrl(initialData.receipt_url || null);
      setReceiptName(initialData.receipt_name || null);
      setApproveImmediately(initialData.status === 'approved');
    } else {
      setCategoryId(categories[0]?.id ?? '');
      setAmount('');
      setCurrency(defaultCurrency);
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setRelatedEmployeeId('');
      setReceiptUrl(null);
      setReceiptName(null);
      setApproveImmediately(userRole === 'hr_head');
    }
    setError(null);
    setFieldErrors({});
  }, [initialData, isOpen, categories, defaultCurrency, userRole]);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('Receipt file size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setReceiptUrl(reader.result as string);
      setReceiptName(file.name);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read receipt file');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleAttachSampleReceipt = () => {
    // Generate valid lightweight PDF receipt data
    const samplePdfData =
      'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iagozIDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMiAwIFIKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KL0NvbnRlbnRzIDQgMCBSCj4+CmVuZG9iago0IDAgb2JqCjw8Ci9MZW5ndGggNzgKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoxMDAgNzAwIFRECihtcGVsbG8gLSBHby1ZYSBIUk1TIFNlY3VyZSBFbXBsb3llZSBEb2N1bWVudCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA2MCAwMDAwMCBuIAowMDAwMDAwMTE3IDAwMDAwIG4gCjAwMDAwMDAyMDEgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA1Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgoxMzQ5CiUlRU9GCg==';
    setReceiptUrl(samplePdfData);
    setReceiptName('Official_Corporate_Receipt_Proof.pdf');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};

    if (!categoryId) {
      errors.categoryId = 'Please select an expense category.';
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      errors.amount = 'Please enter a valid amount greater than zero.';
    } else if (numAmount > 10000000) {
      errors.amount = 'Amount exceeds maximum allowable threshold (10,000,000).';
    }

    if (!date) {
      errors.date = 'Please provide the expenditure date.';
    }

    if (!description.trim()) {
      errors.description = 'Please provide a business description or purpose.';
    } else if (description.trim().length > 500) {
      errors.description = 'Description cannot exceed 500 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    setIsSubmitting(true);
    try {
      await onSubmit({
        category_id: categoryId,
        amount: numAmount,
        currency: currency.toUpperCase().trim(),
        date,
        description: description.trim(),
        related_employee_id: relatedEmployeeId || null,
        receipt_url: receiptUrl,
        receipt_name: receiptName,
        status: userRole === 'hr_head' && approveImmediately ? 'approved' : 'pending',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save expense claim');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="expense-form-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl w-full max-w-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {initialData ? 'Edit Expense Claim' : 'Record New Expense'}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {initialData
                  ? 'Update expenditure details, category, or documentation'
                  : 'Submit corporate spend claim with supporting documentation'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Category & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="expense-category-select" className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>Category *</span>
                </label>
                {userRole === 'hr_head' && onOpenManageCategories && (
                  <button
                    type="button"
                    onClick={onOpenManageCategories}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    + Manage
                  </button>
                )}
              </div>
              <select
                id="expense-category-select"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  if (fieldErrors.categoryId) setFieldErrors((p) => ({ ...p, categoryId: '' }));
                }}
                required
                aria-invalid={!!fieldErrors.categoryId}
                className={`w-full px-3 py-1.5 rounded-lg border bg-[var(--bg-subtle)] text-xs text-[var(--text-primary)] focus:outline-none transition-colors ${
                  fieldErrors.categoryId
                    ? 'border-rose-500'
                    : 'border-[var(--border-subtle)] focus:border-indigo-500 focus:bg-[var(--bg-card)]'
                }`}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {fieldErrors.categoryId && (
                <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.categoryId}</p>
              )}
            </div>

            <div>
              <label htmlFor="expense-date-input" className="font-medium text-[var(--text-primary)] flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>Expenditure Date *</span>
              </label>
              <input
                type="date"
                id="expense-date-input"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (fieldErrors.date) setFieldErrors((p) => ({ ...p, date: '' }));
                }}
                required
                aria-invalid={!!fieldErrors.date}
                className={`w-full px-3 py-1.5 rounded-lg border bg-[var(--bg-subtle)] text-xs text-[var(--text-primary)] focus:outline-none transition-colors ${
                  fieldErrors.date
                    ? 'border-rose-500'
                    : 'border-[var(--border-subtle)] focus:border-indigo-500 focus:bg-[var(--bg-card)]'
                }`}
              />
              {fieldErrors.date && (
                <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.date}</p>
              )}
            </div>
          </div>

          {/* Amount & Currency Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="expense-amount-input" className="font-medium text-[var(--text-primary)] flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>Amount *</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="10000000"
                id="expense-amount-input"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (fieldErrors.amount) setFieldErrors((p) => ({ ...p, amount: '' }));
                }}
                placeholder="0.00"
                required
                aria-invalid={!!fieldErrors.amount}
                className={`w-full px-3 py-1.5 rounded-lg border bg-[var(--bg-subtle)] text-xs text-[var(--text-primary)] font-semibold focus:outline-none transition-colors ${
                  fieldErrors.amount
                    ? 'border-rose-500'
                    : 'border-[var(--border-subtle)] focus:border-indigo-500 focus:bg-[var(--bg-card)]'
                }`}
              />
              {fieldErrors.amount && (
                <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.amount}</p>
              )}
            </div>

            <div>
              <label htmlFor="expense-currency-select" className="font-medium text-[var(--text-primary)] mb-1 block">
                Currency
              </label>
              <select
                id="expense-currency-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-primary)] font-semibold focus:outline-none focus:border-indigo-500 focus:bg-[var(--bg-card)] transition-colors"
              >
                <option value="GHS">GHS (Ghanaian Cedi)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="GBP">GBP (British Pound)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="NGN">NGN (Nigerian Naira)</option>
                <option value="KES">KES (Kenyan Shilling)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="expense-description-input" className="font-medium text-[var(--text-primary)] block">
                Business Purpose & Description *
              </label>
              <span className="text-[10px] text-[var(--text-muted)]">{description.length}/500</span>
            </div>
            <textarea
              id="expense-description-input"
              rows={2}
              maxLength={500}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (fieldErrors.description) setFieldErrors((p) => ({ ...p, description: '' }));
              }}
              placeholder="e.g. Flight to Lagos for West Africa Tech Summit & Developer Keynote..."
              required
              aria-invalid={!!fieldErrors.description}
              className={`w-full px-3 py-2 rounded-lg border bg-[var(--bg-subtle)] text-xs text-[var(--text-primary)] focus:outline-none transition-colors resize-none ${
                fieldErrors.description
                  ? 'border-rose-500'
                  : 'border-[var(--border-subtle)] focus:border-indigo-500 focus:bg-[var(--bg-card)]'
              }`}
            />
            {fieldErrors.description && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.description}</p>
            )}
          </div>

          {/* Related Employee */}
          <div>
            <label className="font-medium text-[var(--text-primary)] flex items-center gap-1.5 mb-1">
              <UserIcon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>Related Employee (Optional)</span>
            </label>
            <select
              id="expense-employee-select"
              value={relatedEmployeeId}
              onChange={(e) => setRelatedEmployeeId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 focus:bg-[var(--bg-card)] transition-colors"
            >
              <option value="">General Workspace / Overhead (None)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} — {emp.job_title}
                </option>
              ))}
            </select>
          </div>

          {/* Receipt Upload Box */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>Proof / Receipt (Image or PDF)</span>
              </label>
              {!receiptUrl && (
                <button
                  type="button"
                  onClick={handleAttachSampleReceipt}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Use Sample PDF Receipt
                </button>
              )}
            </div>

            {receiptUrl ? (
              <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                      {receiptName || 'Receipt Attached'}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      Ready for review & audit
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptUrl(null);
                      setReceiptName(null);
                    }}
                    className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Remove receipt"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/10'
                    : 'border-[var(--border-subtle)] hover:border-zinc-400 dark:hover:border-zinc-600 bg-[var(--bg-subtle)]/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Upload className="w-5 h-5 mx-auto text-[var(--text-muted)] mb-1.5" />
                <p className="text-xs font-medium text-[var(--text-primary)]">
                  Click to upload receipt, or drag and drop
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  PDF, PNG, JPG, or WEBP up to 10MB
                </p>
              </div>
            )}
          </div>

          {/* If HR Head: Direct Approval Option */}
          {userRole === 'hr_head' && (
            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="expense-direct-approve-checkbox"
                  checked={approveImmediately}
                  onChange={(e) => setApproveImmediately(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-0 focus:ring-offset-0"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Approve immediately upon submission</span>
                  </span>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    As HR Head, mark this expense as approved without entering the review queue.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Footer inside form */}
          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-expense-btn"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <span>{initialData ? 'Save Changes' : 'Submit Claim'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
