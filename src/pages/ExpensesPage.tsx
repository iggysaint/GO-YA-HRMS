import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  Clock,
  CheckCircle2,
  XCircle,
  Tag,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  FileText,
  Shield,
  Layers,
  ArrowUpRight,
  User as UserIcon,
  Eye,
  Check,
  X,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  ExpenseWithDetails,
  ExpenseCategory,
  ExpenseDashboardSummary,
  ExpensePolicy,
  Employee,
} from '../types';
import { ExpenseModal } from '../components/expenses/ExpenseModal';
import { ExpenseDetailsModal } from '../components/expenses/ExpenseDetailsModal';
import { ExpensePolicyModal } from '../components/expenses/ExpensePolicyModal';
import { ManageCategoriesModal } from '../components/expenses/ManageCategoriesModal';
import { StatusPill } from '../components/StatusPill';
import { ExportButton } from '../components/ExportButton';
import { ExportColumn } from '../utils/exportUtils';

interface ExpensesPageProps {
  onNavigateToEmployee?: (employeeId: string) => void;
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({ onNavigateToEmployee }) => {
  const { user, organization, role, authFetch, subscribeToRealtime } = useAuth();

  // State
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summary, setSummary] = useState<ExpenseDashboardSummary | null>(null);
  const [policy, setPolicy] = useState<ExpensePolicy>({
    restrict_analyst_to_own_expenses: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('GHS');
  const [selectedPeriod, setSelectedPeriod] = useState<'1M' | '3M' | '6M' | '1Y'>('1M');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithDetails | null>(null);
  const [viewingExpense, setViewingExpense] = useState<ExpenseWithDetails | null>(null);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  const isHRHead = role === 'hr_head';

  // 1. Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await authFetch('/api/expenses/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, [authFetch]);

  // 2. Fetch Employees (for dropdowns)
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await authFetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  }, [authFetch]);

  // 3. Fetch Policy
  const fetchPolicy = useCallback(async () => {
    try {
      const res = await authFetch('/api/expenses/policy');
      if (res.ok) {
        const data = await res.json();
        setPolicy(data);
      }
    } catch (err) {
      console.error('Failed to fetch policy:', err);
    }
  }, [authFetch]);

  // 4. Fetch Dashboard Summary
  const fetchSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        currency: selectedCurrency,
        period: selectedPeriod,
      });
      const res = await authFetch(`/api/expenses/dashboard?${params.toString()}`);
      if (res.ok) {
        const data: ExpenseDashboardSummary = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to fetch expense summary:', err);
    }
  }, [authFetch, selectedCurrency, selectedPeriod]);

  // 5. Fetch Expenses List
  const fetchExpenses = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category_id', categoryFilter);
      if (employeeFilter !== 'all') params.set('employee_id', employeeFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (selectedCurrency) params.set('currency', selectedCurrency);

      const res = await authFetch(`/api/expenses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setIsLoading(false);
    }
  }, [authFetch, statusFilter, categoryFilter, employeeFilter, searchQuery, selectedCurrency]);

  // Initial load
  useEffect(() => {
    if (organization?.currency) {
      setSelectedCurrency(organization.currency);
    }
    fetchCategories();
    fetchEmployees();
    fetchPolicy();
  }, [organization?.currency, fetchCategories, fetchEmployees, fetchPolicy]);

  useEffect(() => {
    fetchSummary();
    fetchExpenses();
  }, [fetchSummary, fetchExpenses]);

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = subscribeToRealtime((payload) => {
      if (
        payload.event === 'expense_created' ||
        payload.event === 'expense_updated' ||
        payload.event === 'expense_approved' ||
        payload.event === 'expense_rejected' ||
        payload.event === 'expense_deleted'
      ) {
        fetchExpenses();
        fetchSummary();
      }
      if (
        payload.event === 'expense_category_created' ||
        payload.event === 'expense_category_updated' ||
        payload.event === 'expense_category_deleted'
      ) {
        fetchCategories();
        fetchExpenses();
        fetchSummary();
      }
      if (payload.event === 'expense_policy_updated') {
        fetchPolicy();
        fetchExpenses();
        fetchSummary();
      }
    });
    return unsubscribe;
  }, [subscribeToRealtime, fetchExpenses, fetchSummary, fetchCategories, fetchPolicy]);

  // Handle Save Policy
  const handleSavePolicy = async (newPolicy: ExpensePolicy) => {
    const res = await authFetch('/api/expenses/policy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPolicy),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update policy');
    }
    setPolicy(newPolicy);
    fetchExpenses();
    fetchSummary();
  };

  // Handle Add Category
  const handleAddCategory = async (name: string) => {
    const res = await authFetch('/api/expenses/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to add category');
    }
    await fetchCategories();
  };

  // Handle Edit Category
  const handleEditCategory = async (id: string, name: string) => {
    const res = await authFetch(`/api/expenses/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update category');
    }
    await fetchCategories();
  };

  // Handle Delete Category
  const handleDeleteCategory = async (id: string) => {
    const res = await authFetch(`/api/expenses/categories/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete category');
    }
    await fetchCategories();
  };

  // Handle Submit Expense (Create or Edit)
  const handleSubmitExpense = async (expenseData: any) => {
    if (editingExpense) {
      const res = await authFetch(`/api/expenses/${editingExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update expense');
      }
    } else {
      const res = await authFetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create expense');
      }
    }
    fetchExpenses();
    fetchSummary();
  };

  // Quick Approval (HR Head)
  const handleQuickApprove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await authFetch(`/api/expenses/${id}/approve`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchExpenses();
        fetchSummary();
      }
    } catch (err) {
      console.error('Failed to approve expense:', err);
    }
  };

  // Quick Reject (HR Head)
  const handleQuickReject = async (id: string, reason: string) => {
    const res = await authFetch(`/api/expenses/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejection_notes: reason }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to reject expense');
    }
    fetchExpenses();
    fetchSummary();
  };

  // Delete Expense
  const handleDeleteExpense = async (id: string) => {
    const res = await authFetch(`/api/expenses/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete expense');
    }
    fetchExpenses();
    fetchSummary();
  };

  const pendingCount = expenses.filter((e) => e.status === 'pending').length;

  const expenseExportColumns: ExportColumn<ExpenseWithDetails>[] = [
    { header: 'Date', accessor: (e) => e.date },
    { header: 'Description', accessor: (e) => e.description },
    { header: 'Category', accessor: (e) => e.category_name || 'General' },
    { header: 'Amount', accessor: (e) => e.amount },
    { header: 'Currency', accessor: (e) => e.currency },
    {
      header: 'Status',
      accessor: (e) => {
        switch (e.status) {
          case 'approved':
            return 'Approved';
          case 'rejected':
            return 'Rejected';
          case 'pending':
            return 'Pending Review';
          default:
            return e.status;
        }
      },
    },
    { header: 'Submitted By', accessor: (e) => e.submitted_by_name || e.submitted_by_email || 'Staff' },
    { header: 'Related Employee', accessor: (e) => e.related_employee_name || '—' },
    { header: 'Approved / Reviewed By', accessor: (e) => e.approved_by_name || e.approved_by_email || '—' },
    { header: 'Rejection Notes', accessor: (e) => e.rejection_notes || '' },
  ];

  return (
    <div id="expenses-page" className="min-h-full flex flex-col bg-[var(--bg-primary)] animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Expenses & Spend Governance
              </h1>
              {policy.restrict_analyst_to_own_expenses && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Analyst Isolation Active</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Corporate expenditure tracking, receipt auditing, and approval workflows
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Export Button */}
            <ExportButton
              id="expenses-export-btn"
              filename={`expenses-report-${selectedPeriod}`}
              columns={expenseExportColumns}
              data={expenses}
              sheetName="Expenses"
              label="Export"
            />

            {/* HR Head Category Management Button */}
            {isHRHead && (
              <button
                type="button"
                id="open-manage-categories-btn"
                onClick={() => setIsCategoriesModalOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Tag className="w-3.5 h-3.5 text-indigo-500" />
                <span>Categories</span>
              </button>
            )}

            {/* HR Head Governance Policy Button */}
            {isHRHead && (
              <button
                type="button"
                id="open-policy-modal-btn"
                onClick={() => setIsPolicyModalOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                <span>Policy & Restrictions</span>
              </button>
            )}

            {/* Record New Expense Button (Both HR Head and Analyst can submit) */}
            <button
              type="button"
              id="record-expense-btn"
              onClick={() => {
                setEditingExpense(null);
                setIsCreateModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Expense</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 space-y-6 max-w-7xl">
        {/* Ledger Controls Bar: Currency Selector + Period Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3 shadow-2xs">
          {/* Currency Isolation Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--text-muted)]">Active Ledger:</span>
            <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
              {(summary?.available_currencies || ['GHS', 'USD']).map((curr) => {
                const isActive = selectedCurrency === curr;
                return (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setSelectedCurrency(curr)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-2xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {curr}
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] text-[var(--text-muted)] hidden md:inline">
              (Multi-currency isolated)
            </span>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--text-muted)]">Timeline Window:</span>
            <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
              {(['1M', '3M', '6M', '1Y'] as const).map((p) => {
                const isActive = selectedPeriod === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedPeriod(p)}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold shadow-2xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3-Panel Metric Dashboard (Ledger-style) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Panel 1: Total Approved Spend */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Approved Spend
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="my-3">
              <div className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                {selectedCurrency}{' '}
                {(summary?.total_spent_approved ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>

              {/* Percentage Change Indicator */}
              <div className="flex items-center gap-2 mt-1">
                {(summary?.percentage_change ?? 0) >= 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                    <TrendingUp className="w-3 h-3" />
                    +{summary?.percentage_change}%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <TrendingDown className="w-3 h-3" />
                    {summary?.percentage_change}%
                  </span>
                )}
                <span className="text-[11px] text-[var(--text-muted)]">
                  vs previous {selectedPeriod === '1M' ? '30 days' : selectedPeriod}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-2 flex items-center justify-between">
              <span>Prior Period:</span>
              <span className="font-medium text-[var(--text-secondary)]">
                {selectedCurrency}{' '}
                {(summary?.previous_period_spent ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Panel 2: Pending Approvals */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Pending Approval
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  {summary?.pending_count ?? 0}
                </div>
                <span className="text-xs text-[var(--text-secondary)] font-medium">
                  claim{summary?.pending_count === 1 ? '' : 's'} awaiting HR Head review
                </span>
              </div>

              <div className="text-sm font-semibold text-amber-600 dark:text-amber-400 mt-1">
                {selectedCurrency}{' '}
                {(summary?.pending_total_amount ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>

            <div className="text-[11px] text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-2 flex items-center justify-between">
              <span>Role Authority:</span>
              <span className="font-medium text-amber-700 dark:text-amber-300">
                HR Head Final Sign-off
              </span>
            </div>
          </div>

          {/* Panel 3: Category Allocation */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Category Allocations
              </span>
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Top Category Mini Bars */}
            <div className="space-y-2 flex-1 justify-center flex flex-col">
              {(summary?.category_breakdown || [])
                .slice(0, 3)
                .map((cat) => (
                  <div key={cat.category_id} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-[var(--text-primary)] truncate max-w-[130px]">
                        {cat.category_name}
                      </span>
                      <span className="text-[var(--text-muted)]">
                        {cat.percentage}% ({selectedCurrency} {cat.amount.toLocaleString()})
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(4, cat.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              {(!summary?.category_breakdown || summary.category_breakdown.length === 0) && (
                <p className="text-xs text-[var(--text-muted)] text-center py-2">
                  No approved claims in this window
                </p>
              )}
            </div>

            <div className="text-[11px] text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-2 flex items-center justify-between">
              <span>Total Recorded:</span>
              <span className="font-medium text-[var(--text-secondary)]">
                {summary?.total_expenses_count ?? 0} items
              </span>
            </div>
          </div>
        </div>

        {/* Spend-Over-Time Bar Visualizer (Ledger Style) */}
        {summary?.time_series && summary.time_series.length > 0 && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                  Spend Over Time ({selectedPeriod})
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Approved disbursements vs pending claims in {selectedCurrency}
                </p>
              </div>

              <div className="flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-xs bg-emerald-600" />
                  <span className="text-[var(--text-secondary)]">Approved</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
                  <span className="text-[var(--text-secondary)]">Pending</span>
                </div>
              </div>
            </div>

            {/* Bar Visualization Canvas */}
            <div className="pt-4">
              {(() => {
                const maxVal = Math.max(
                  ...summary.time_series.map((pt) => pt.spent + pt.pending),
                  1
                );

                return (
                  <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-36 pt-2 border-b border-[var(--border-subtle)]">
                    {summary.time_series.map((pt, idx) => {
                      const approvedPct = Math.round((pt.spent / maxVal) * 100);
                      const pendingPct = Math.round((pt.pending / maxVal) * 100);

                      return (
                        <div
                          key={idx}
                          className="flex flex-col items-center justify-end h-full group relative cursor-pointer"
                        >
                          {/* Tooltip on hover */}
                          <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                            <div className="bg-zinc-900 text-white text-[10px] rounded px-2 py-1 shadow-lg whitespace-nowrap">
                              <p className="font-bold">{pt.label}</p>
                              <p className="text-emerald-300">
                                Approved: {selectedCurrency} {pt.spent.toLocaleString()}
                              </p>
                              <p className="text-amber-300">
                                Pending: {selectedCurrency} {pt.pending.toLocaleString()}
                              </p>
                            </div>
                            <div className="w-1.5 h-1.5 bg-zinc-900 rotate-45 -mt-1" />
                          </div>

                          {/* Stacked Bars */}
                          <div className="w-full max-w-[32px] flex flex-col justify-end items-center h-full">
                            {pendingPct > 0 && (
                              <div
                                style={{ height: `${pendingPct}%` }}
                                className="w-full bg-amber-500/80 rounded-t-xs transition-all duration-300"
                              />
                            )}
                            {approvedPct > 0 && (
                              <div
                                style={{ height: `${approvedPct}%` }}
                                className={`w-full bg-emerald-600 transition-all duration-300 ${
                                  pendingPct > 0 ? '' : 'rounded-t-xs'
                                }`}
                              />
                            )}
                            {approvedPct === 0 && pendingPct === 0 && (
                              <div className="h-1 w-full bg-[var(--bg-subtle)] rounded-t-xs" />
                            )}
                          </div>

                          {/* Axis Label */}
                          <span className="text-[10px] text-[var(--text-muted)] mt-2 truncate w-full text-center">
                            {pt.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Expenses List & Filter Area */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl shadow-2xs overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-[var(--border-subtle)] space-y-3">
            {/* Status Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-0.5 rounded-lg border border-[var(--border-subtle)] text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold shadow-2xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  All Claims ({expenses.length})
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                    statusFilter === 'pending'
                      ? 'bg-[var(--bg-card)] text-amber-700 dark:text-amber-300 font-semibold shadow-2xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>Pending Review</span>
                  {pendingCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                      {pendingCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('approved')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    statusFilter === 'approved'
                      ? 'bg-[var(--bg-card)] text-emerald-700 dark:text-emerald-300 font-semibold shadow-2xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Approved
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('rejected')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    statusFilter === 'rejected'
                      ? 'bg-[var(--bg-card)] text-rose-700 dark:text-rose-300 font-semibold shadow-2xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Rejected
                </button>
              </div>

              {/* Subtitle / Counter */}
              <div className="text-xs text-[var(--text-muted)] font-medium">
                Showing {expenses.length} claim{expenses.length === 1 ? '' : 's'}
              </div>
            </div>

            {/* Search and Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
              {/* Search input */}
              <div className="sm:col-span-2 relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  id="expense-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search description, employee, category..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 focus:bg-[var(--bg-card)] transition-colors"
                />
              </div>

              {/* Category Dropdown */}
              <div>
                <select
                  id="category-filter-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 focus:bg-[var(--bg-card)] transition-colors"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee Dropdown */}
              <div>
                <select
                  id="employee-filter-select"
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 focus:bg-[var(--bg-card)] transition-colors"
                >
                  <option value="all">All Beneficiaries</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 text-[var(--text-muted)] uppercase tracking-wider font-semibold text-[10px]">
                  <th className="p-3 pl-4">Date</th>
                  <th className="p-3">Category & Description</th>
                  <th className="p-3">Beneficiary Employee</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Receipt</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[var(--text-muted)]">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span>Loading expense claims...</span>
                      </div>
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-[var(--text-muted)]">
                      <div className="max-w-xs mx-auto space-y-2">
                        <Receipt className="w-8 h-8 mx-auto text-[var(--text-muted)] opacity-50" />
                        <p className="font-semibold text-[var(--text-primary)] text-sm">
                          No expense claims found
                        </p>
                        <p className="text-[11px] leading-relaxed">
                          {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                            ? 'Try clearing or resetting active search filters.'
                            : 'Click "Record Expense" above to submit your first corporate claim.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => {
                    const isPending = exp.status === 'pending';
                    const isApproved = exp.status === 'approved';
                    const isRejected = exp.status === 'rejected';

                    return (
                      <tr
                        key={exp.id}
                        onClick={() => setViewingExpense(exp)}
                        className="hover:bg-[var(--bg-hover)]/60 cursor-pointer transition-colors group"
                      >
                        {/* Date */}
                        <td className="p-3 pl-4 whitespace-nowrap text-[var(--text-secondary)] font-medium">
                          {new Date(exp.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Category & Description */}
                        <td className="p-3 max-w-xs">
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                              <Tag className="w-2.5 h-2.5 text-indigo-500" />
                              <span>{exp.category_name}</span>
                            </span>
                            <p className="font-medium text-[var(--text-primary)] line-clamp-1">
                              {exp.description}
                            </p>
                          </div>
                        </td>

                        {/* Beneficiary Employee */}
                        <td className="p-3 whitespace-nowrap">
                          {exp.related_employee_name ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                                {exp.related_employee_name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="truncate">
                                <span className="font-medium text-[var(--text-primary)]">
                                  {exp.related_employee_name}
                                </span>
                                {exp.related_employee_department && (
                                  <p className="text-[10px] text-[var(--text-muted)]">
                                    {exp.related_employee_department}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[var(--text-muted)] italic">
                              General Overhead
                            </span>
                          )}
                        </td>

                        {/* Amount & Currency */}
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-bold text-[var(--text-primary)]">
                            {exp.currency}{' '}
                            {exp.amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            by {exp.submitted_by_name}
                          </span>
                        </td>

                        {/* Receipt */}
                        <td className="p-3 whitespace-nowrap">
                          {exp.receipt_url ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                              <FileText className="w-3 h-3" />
                              <span>Attached</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-[var(--text-muted)]">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3 whitespace-nowrap">
                          <StatusPill
                            status={exp.status}
                            label={exp.status.charAt(0).toUpperCase() + exp.status.slice(1)}
                          />
                        </td>

                        {/* Actions */}
                        <td className="p-3 pr-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* HR Head quick approve / reject buttons */}
                            {isHRHead && isPending && (
                              <>
                                <button
                                  type="button"
                                  title="Approve claim"
                                  onClick={(e) => handleQuickApprove(exp.id, e)}
                                  className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-pointer transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Reject claim"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingExpense(exp);
                                  }}
                                  className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 cursor-pointer transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {/* View details */}
                            <button
                              type="button"
                              title="View details"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingExpense(exp);
                              }}
                              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Expense Modal (Create & Edit) */}
      {isCreateModalOpen && (
        <ExpenseModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingExpense(null);
          }}
          onSubmit={handleSubmitExpense}
          categories={categories}
          employees={employees}
          initialData={editingExpense}
          userRole={role}
          defaultCurrency={selectedCurrency}
          onOpenManageCategories={() => {
            setIsCreateModalOpen(false);
            setIsCategoriesModalOpen(true);
          }}
        />
      )}

      {/* Expense Details & Receipt Viewer Modal */}
      {viewingExpense && (
        <ExpenseDetailsModal
          isOpen={Boolean(viewingExpense)}
          onClose={() => setViewingExpense(null)}
          expense={viewingExpense}
          userRole={role}
          currentUserId={user?.id || ''}
          onApprove={async (id) => {
            await authFetch(`/api/expenses/${id}/approve`, { method: 'POST' });
            fetchExpenses();
            fetchSummary();
          }}
          onReject={handleQuickReject}
          onEdit={(exp) => {
            setEditingExpense(exp);
            setIsCreateModalOpen(true);
          }}
          onDelete={handleDeleteExpense}
        />
      )}

      {/* Governance & Policy Modal (HR Head only) */}
      {isPolicyModalOpen && (
        <ExpensePolicyModal
          isOpen={isPolicyModalOpen}
          onClose={() => setIsPolicyModalOpen(false)}
          policy={policy}
          onSavePolicy={handleSavePolicy}
        />
      )}

      {/* Category Management Modal (HR Head only) */}
      {isCategoriesModalOpen && (
        <ManageCategoriesModal
          isOpen={isCategoriesModalOpen}
          onClose={() => setIsCategoriesModalOpen(false)}
          categories={categories}
          onAddCategory={handleAddCategory}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      )}
    </div>
  );
};
