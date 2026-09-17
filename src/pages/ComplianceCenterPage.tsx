import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  Filter,
  Search,
  Plus,
  RefreshCw,
  FileText,
  Building,
  User,
  ExternalLink,
  Trash2,
  Edit3,
  X,
  Loader2,
  HelpCircle,
  Award,
  FileCheck,
  Flame,
  Scale,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatusPill } from '../components/StatusPill';
import { ExportButton } from '../components/ExportButton';
import { ExportColumn } from '../utils/exportUtils';
import {
  ComplianceDashboardData,
  ComplianceItem,
  ComplianceCategory,
  ComplianceStatus,
  Employee,
} from '../types';

interface ComplianceCenterPageProps {
  onNavigateToEmployee?: (id: string) => void;
  onNavigateToDocuments?: () => void;
}

export const ComplianceCenterPage: React.FC<ComplianceCenterPageProps> = ({
  onNavigateToEmployee,
  onNavigateToDocuments,
}) => {
  const { token, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ComplianceDashboardData | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [evaluating, setEvaluating] = useState(false);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ComplianceItem | null>(null);
  const [formData, setFormData] = useState({
    category: 'statutory_tax' as ComplianceCategory,
    related_employee_id: '',
    title: '',
    deadline: '',
    status: 'compliant' as ComplianceStatus,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [resComp, resEmp] = await Promise.all([
        fetch('/api/compliance/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/employees', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (resComp.ok) {
        const cData: ComplianceDashboardData = await resComp.json();
        setData(cData);
      }
      if (resEmp.ok) {
        const empData = await resEmp.json();
        setEmployees(empData);
      }
    } catch (err) {
      console.error('Failed to load compliance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [token]);

  const handleAutoEvaluate = async () => {
    try {
      setEvaluating(true);
      const res = await fetch('/api/compliance/auto-evaluate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const cData = await res.json();
        setData(cData);
        setFeedback({ type: 'success', message: 'Compliance evaluation complete! All items synchronized.' });
      }
    } catch (err) {
      console.error('Failed to run compliance evaluation:', err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleOpenAddModal = (item?: ComplianceItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        category: item.category,
        related_employee_id: item.related_employee_id || '',
        title: item.title,
        deadline: item.deadline,
        status: item.status,
        notes: item.notes || '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        category: 'statutory_tax',
        related_employee_id: '',
        title: '',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'compliant',
        notes: '',
      });
    }
    setIsAddModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.deadline) {
      setFeedback({ type: 'error', message: 'Title and deadline are required.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const url = editingItem ? `/api/compliance/items/${editingItem.id}` : '/api/compliance/items';
      const method = editingItem ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: formData.category,
          related_employee_id: formData.related_employee_id || undefined,
          title: formData.title,
          deadline: formData.deadline,
          status: formData.status,
          notes: formData.notes,
        }),
      });

      if (res.ok) {
        setFeedback({
          type: 'success',
          message: editingItem ? 'Compliance item updated!' : 'New compliance tracker item created!',
        });
        setIsAddModalOpen(false);
        fetchDashboard();
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Failed to save compliance item.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error occurred.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this compliance item?')) return;

    try {
      const res = await fetch(`/api/compliance/items/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Compliance item deleted.' });
        fetchDashboard();
      }
    } catch (err) {
      console.error('Failed to delete compliance item:', err);
    }
  };

  const handleQuickResolve = async (item: ComplianceItem) => {
    try {
      const res = await fetch(`/api/compliance/items/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'compliant',
          notes: `${item.notes ? item.notes + ' · ' : ''}Resolved & verified on ${new Date().toISOString().split('T')[0]}`,
        }),
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: `Marked "${item.title}" as Compliant!` });
        fetchDashboard();
      }
    } catch (err) {
      console.error('Failed to resolve compliance item:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
          <p className="text-sm text-[var(--text-secondary)]">Analyzing organization compliance state...</p>
        </div>
      </div>
    );
  }

  const items = data?.items || [];
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.related_employee_name && item.related_employee_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const complianceExportColumns: ExportColumn<ComplianceItem>[] = [
    { header: 'Title / Obligation', accessor: (item) => item.title },
    {
      header: 'Category',
      accessor: (item) => {
        switch (item.category as string) {
          case 'statutory_tax':
            return 'Statutory Tax';
          case 'contracts_visas':
            return 'Contracts & Visas';
          case 'certifications':
            return 'Certifications';
          case 'workplace_safety':
            return 'Workplace Safety';
          default:
            return item.category || 'General';
        }
      },
    },
    { header: 'Related Employee', accessor: (item) => item.related_employee_name || 'Organization-wide' },
    {
      header: 'Status',
      accessor: (item) => {
        switch (item.status as string) {
          case 'compliant':
            return 'Compliant';
          case 'attention':
            return 'Requires Attention / Expiring';
          case 'non_compliant':
            return 'Non-Compliant';
          default:
            return item.status;
        }
      },
    },
    { header: 'Deadline', accessor: (item) => item.deadline },
    { header: 'Notes / Audit Log', accessor: (item) => item.notes || '' },
  ];

  const getCategoryIcon = (cat: ComplianceCategory) => {
    switch (cat) {
      case 'statutory_tax':
        return <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'contracts_visas':
        return <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'certifications':
        return <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'workplace_safety':
        return <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  const getDaysDiff = (deadline: string) => {
    const today = new Date().toISOString().split('T')[0];
    const diff = Math.ceil((new Date(deadline).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div id="compliance-center-page" className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Notion-style Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Compliance Center
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Statutory tax filings, employment contracts, visas, and organizational certifications tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <ExportButton
            id="compliance-export-btn"
            filename="compliance-obligations-report"
            columns={complianceExportColumns}
            data={filteredItems}
            sheetName="Compliance Items"
            label="Export"
          />

          <button
            id="run-compliance-eval-btn"
            onClick={handleAutoEvaluate}
            disabled={evaluating}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium text-xs border border-[var(--border-subtle)] transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${evaluating ? 'animate-spin text-[var(--brand-primary)]' : ''}`} />
            <span>{evaluating ? 'Evaluating...' : 'Auto-Evaluate Rules'}</span>
          </button>

          <button
            id="add-compliance-item-btn"
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium text-sm transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Compliance Item</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          id="compliance-feedback-banner"
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            ) : (
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Scorecard Banner */}
      <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Main Score Gauge */}
          <div className="flex items-center gap-5">
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
              <span
                className={`text-2xl font-black ${
                  (data?.overall_score || 0) >= 80
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : (data?.overall_score || 0) >= 50
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {data?.overall_score || 0}%
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  Overall Workspace Compliance Health
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    (data?.overall_score || 0) >= 80
                      ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                      : (data?.overall_score || 0) >= 50
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                      : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {(data?.overall_score || 0) >= 80 ? 'Healthy & Audited' : (data?.overall_score || 0) >= 50 ? 'Attention Needed' : 'At Risk'}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Evaluates statutory deadlines, contract renewals, visa checks, and certification expiries against today's date.
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 border-t lg:border-t-0 lg:border-l border-[var(--border-subtle)] pt-4 lg:pt-0 lg:pl-6">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Compliant</span>
              </div>
              <div className="text-xl font-bold text-[var(--text-primary)]">
                {data?.compliant_count || 0}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <Clock className="w-4 h-4" />
                <span>Due in 30 Days</span>
              </div>
              <div className="text-xl font-bold text-[var(--text-primary)]">
                {data?.attention_count || 0}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                <AlertTriangle className="w-4 h-4" />
                <span>Overdue / Expired</span>
              </div>
              <div className="text-xl font-bold text-[var(--text-primary)]">
                {data?.non_compliant_count || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Health Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {data?.categories.map((cat) => (
          <div
            key={cat.category}
            onClick={() => setCategoryFilter(cat.category === categoryFilter ? 'all' : cat.category)}
            className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
              categoryFilter === cat.category
                ? 'bg-[var(--bg-surface)] border-[var(--brand-primary)] shadow-sm ring-1 ring-[var(--brand-primary)]'
                : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--text-muted)]'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="p-2 rounded-xl bg-[var(--bg-subtle)]">
                {getCategoryIcon(cat.category)}
              </div>
              <span className="text-xs font-bold text-[var(--text-primary)] font-mono">
                {cat.score}%
              </span>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[var(--text-primary)] line-clamp-1">
                {cat.label}
              </h4>
              <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] pt-1">
                <span>{cat.total} total</span>
                {cat.attention > 0 && <span className="text-amber-600 font-medium">· {cat.attention} due</span>}
                {cat.non_compliant > 0 && <span className="text-rose-600 font-medium">· {cat.non_compliant} overdue</span>}
              </div>
            </div>

            <div className="w-full h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  cat.score >= 80 ? 'bg-emerald-500' : cat.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.max(6, cat.score)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Table Section */}
      <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--brand-primary)]" />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Compliance Tracking Items
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
              {filteredItems.length} Items
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rule, title, employee..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="statutory_tax">Statutory & Tax</option>
              <option value="contracts_visas">Contracts & Visas</option>
              <option value="certifications">Certifications</option>
              <option value="workplace_safety">Workplace Safety</option>
              <option value="other">General Governance</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="compliant">Compliant</option>
              <option value="attention">Attention Required (≤30d)</option>
              <option value="non_compliant">Non-Compliant (Overdue)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
                <th className="py-3 px-4 font-semibold">Compliance Item / Requirement</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Associated Scope / Employee</th>
                <th className="py-3 px-4 font-semibold">Deadline & Timing</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Notes & Audit Trail</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                    No compliance items match your current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const daysDiff = getDaysDiff(item.deadline);
                  const isOverdue = daysDiff < 0;
                  const isDueSoon = daysDiff >= 0 && daysDiff <= 30;

                  return (
                    <tr key={item.id} className="hover:bg-[var(--bg-hover)] transition-colors group">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                          <span>{item.title}</span>
                          {item.document_id && (
                            <button
                              onClick={onNavigateToDocuments}
                              title="Linked to Uploaded Document"
                              className="text-[var(--brand-primary)] hover:underline flex items-center gap-0.5 text-[10px]"
                            >
                              <FileText className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)] capitalize">
                          {item.category.replace('_', ' & ')}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {item.related_employee_id ? (
                          <div
                            className="font-medium hover:underline cursor-pointer flex items-center gap-1"
                            onClick={() => onNavigateToEmployee?.(item.related_employee_id!)}
                          >
                            <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            <span>{item.related_employee_name || 'Assigned Staff'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[var(--text-muted)]">
                            <Building className="w-3.5 h-3.5" />
                            <span>Workspace Wide</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-0.5 whitespace-nowrap">
                          <div className="font-mono text-[11px]">{item.deadline}</div>
                          <div>
                            {isOverdue ? (
                              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                Overdue by {Math.abs(daysDiff)} days
                              </span>
                            ) : isDueSoon ? (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                Due in {daysDiff} days
                              </span>
                            ) : (
                              <span className="text-[10px] text-[var(--text-muted)]">
                                In {daysDiff} days
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <StatusPill status={item.status} />
                      </td>

                      <td className="py-3 px-4 text-[var(--text-secondary)] max-w-xs">
                        <div className="line-clamp-2 text-[11px]">
                          {item.notes || '—'}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {item.status !== 'compliant' && (
                            <button
                              onClick={() => handleQuickResolve(item)}
                              title="Mark as Compliant"
                              className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenAddModal(item)}
                            title="Edit Item"
                            className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            title="Delete Item"
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* MODAL: Add / Edit Compliance Item */}
      {isAddModalOpen && (
        <div
          id="compliance-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {editingItem ? 'Edit Compliance Item' : 'New Compliance Requirement'}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Track statutory deadlines, certificates, visas, and organizational mandates.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-secondary)]">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ComplianceCategory })}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
                  required
                >
                  <option value="statutory_tax">Statutory & Tax Remittance</option>
                  <option value="contracts_visas">Contracts, Visas & Right to Work</option>
                  <option value="certifications">Certifications & Accreditations</option>
                  <option value="workplace_safety">Workplace Health & Safety</option>
                  <option value="other">General Governance & Policies</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-secondary)]">
                  Item Title / Requirement Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. GRA Monthly PAYE Remittance, AWS Security Renewal, BRP Expiry"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-secondary)]">
                    Associated Employee (Optional)
                  </label>
                  <select
                    value={formData.related_employee_id}
                    onChange={(e) => setFormData({ ...formData, related_employee_id: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="">Company-Wide / Workspace</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.job_title})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-secondary)]">
                    Deadline / Renewal Date *
                  </label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      const diff = getDaysDiff(newDate);
                      let newStatus: ComplianceStatus = 'compliant';
                      if (diff < 0) newStatus = 'non_compliant';
                      else if (diff <= 30) newStatus = 'attention';

                      setFormData({ ...formData, deadline: newDate, status: newStatus });
                    }}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-secondary)]">
                  Status Override
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ComplianceStatus })}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="compliant">Compliant</option>
                  <option value="attention">Attention Required (≤30 Days)</option>
                  <option value="non_compliant">Non-Compliant (Overdue / Action Needed)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-secondary)]">
                  Notes & Audit Details
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Filed via GRA Tax Portal ref #98234, or awaiting updated certificate from legal."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>{editingItem ? 'Update Item' : 'Create Compliance Item'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
