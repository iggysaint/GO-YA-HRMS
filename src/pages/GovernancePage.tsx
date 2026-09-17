import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GovernanceRecordWithDetails,
  GovernanceAuditStatus,
  Policy,
} from '../types';
import { StatusPill } from '../components/StatusPill';
import {
  Scale,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCheck,
  Edit2,
  Trash2,
  Bell,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  X,
  UserCheck,
  Check,
  Eye,
  Info,
} from 'lucide-react';

interface GovernancePageProps {
  onNavigateToPolicies?: () => void;
}

export const GovernancePage: React.FC<GovernancePageProps> = ({
  onNavigateToPolicies,
}) => {
  const { authFetch, role, subscribeToRealtime } = useAuth();
  const isHrHead = role === 'hr_head';

  const [records, setRecords] = useState<GovernanceRecordWithDetails[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | GovernanceAuditStatus>('all');
  const [distributedFilter, setDistributedFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [sortBy, setSortBy] = useState<'next_due_asc' | 'next_due_desc' | 'name_asc' | 'last_review_desc'>('next_due_asc');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GovernanceRecordWithDetails | null>(null);
  const [viewingRecord, setViewingRecord] = useState<GovernanceRecordWithDetails | null>(null);
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    policy_name: '',
    related_policy_id: '',
    last_review_date: '',
    next_review_due: '',
    reviewed_by: '',
    approved_by: '',
    distributed: false,
    audit_status: 'pending' as GovernanceAuditStatus,
  });

  const fetchRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await authFetch('/api/governance');
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (err) {
      // benign
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  const fetchPolicies = useCallback(async () => {
    try {
      const res = await authFetch('/api/policies');
      if (res.ok) {
        const data = await res.json();
        setPolicies(data);
      }
    } catch (err) {
      // benign
    }
  }, [authFetch]);

  useEffect(() => {
    fetchRecords();
    fetchPolicies();
  }, [fetchRecords, fetchPolicies]);

  // Subscribe to realtime updates
  useEffect(() => {
    const unsubscribe = subscribeToRealtime((payload) => {
      if (
        payload.event === 'governance_record_created' ||
        payload.event === 'governance_record_updated' ||
        payload.event === 'governance_record_deleted'
      ) {
        fetchRecords();
      }
    });
    return unsubscribe;
  }, [subscribeToRealtime, fetchRecords]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = records.length;
    const overdue = records.filter((r) => r.is_overdue || r.audit_status === 'overdue').length;
    const pending = records.filter((r) => !r.is_overdue && r.audit_status === 'pending').length;
    const completed = records.filter((r) => r.audit_status === 'completed').length;
    const distributedCount = records.filter((r) => r.distributed).length;
    const distributedPct = total > 0 ? Math.round((distributedCount / total) * 100) : 0;

    return { total, overdue, pending, completed, distributedCount, distributedPct };
  }, [records]);

  // Filtered and Sorted Records
  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.policy_name.toLowerCase().includes(q) ||
          r.reviewed_by.toLowerCase().includes(q) ||
          r.approved_by.toLowerCase().includes(q) ||
          (r.related_policy?.name && r.related_policy.name.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        result = result.filter((r) => r.is_overdue || r.audit_status === 'overdue');
      } else {
        result = result.filter((r) => r.audit_status === statusFilter && !r.is_overdue);
      }
    }

    if (distributedFilter !== 'all') {
      const isDist = distributedFilter === 'yes';
      result = result.filter((r) => r.distributed === isDist);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'next_due_asc') {
        return new Date(a.next_review_due).getTime() - new Date(b.next_review_due).getTime();
      }
      if (sortBy === 'next_due_desc') {
        return new Date(b.next_review_due).getTime() - new Date(a.next_review_due).getTime();
      }
      if (sortBy === 'name_asc') {
        return a.policy_name.localeCompare(b.policy_name);
      }
      if (sortBy === 'last_review_desc') {
        return new Date(b.last_review_date).getTime() - new Date(a.last_review_date).getTime();
      }
      return 0;
    });

    return result;
  }, [records, searchQuery, statusFilter, distributedFilter, sortBy]);

  // Trigger Audit Scan
  const handleRunAuditScan = async () => {
    setIsScanning(true);
    setActionAlert(null);
    try {
      const res = await authFetch('/api/governance/check-notifications', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setActionAlert({
          type: 'success',
          message: data.message || 'Audit scan completed and notifications verified.',
        });
        await fetchRecords();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to complete audit scan.');
      }
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Error executing audit scan.' });
    } finally {
      setIsScanning(false);
    }
  };

  // Quick Open Modal
  const handleOpenCreateModal = () => {
    if (!isHrHead) return;
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextYearStr = nextYear.toISOString().split('T')[0];

    setFormData({
      policy_name: '',
      related_policy_id: '',
      last_review_date: today,
      next_review_due: nextYearStr,
      reviewed_by: '',
      approved_by: 'Ignatius Arthur (Head of HR)',
      distributed: true,
      audit_status: 'pending',
    });
    setEditingRecord(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (rec: GovernanceRecordWithDetails) => {
    if (!isHrHead) return;
    setFormData({
      policy_name: rec.policy_name,
      related_policy_id: rec.related_policy_id || '',
      last_review_date: rec.last_review_date,
      next_review_due: rec.next_review_due,
      reviewed_by: rec.reviewed_by,
      approved_by: rec.approved_by,
      distributed: rec.distributed,
      audit_status: rec.audit_status,
    });
    setEditingRecord(rec);
    setIsCreateModalOpen(true);
  };

  // Calculate Next Review Date helpers
  const handleSetInterval = (months: number) => {
    const base = formData.last_review_date ? new Date(formData.last_review_date) : new Date();
    base.setMonth(base.getMonth() + months);
    setFormData((prev) => ({
      ...prev,
      next_review_due: base.toISOString().split('T')[0],
    }));
  };

  // Quick Select Policy from Milestone 20 to prefill
  const handleSelectRelatedPolicy = (policyId: string) => {
    const selected = policies.find((p) => p.id === policyId);
    setFormData((prev) => ({
      ...prev,
      related_policy_id: policyId,
      policy_name: selected && !prev.policy_name ? selected.name : prev.policy_name,
    }));
  };

  // Save Record
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.policy_name.trim() || !formData.last_review_date || !formData.next_review_due) {
      setActionAlert({ type: 'error', message: 'Please complete all required fields.' });
      return;
    }

    setIsSubmitting(true);
    setActionAlert(null);

    try {
      const payload = {
        policy_name: formData.policy_name.trim(),
        related_policy_id: formData.related_policy_id || null,
        last_review_date: formData.last_review_date,
        next_review_due: formData.next_review_due,
        reviewed_by: formData.reviewed_by.trim(),
        approved_by: formData.approved_by.trim(),
        distributed: formData.distributed,
        audit_status: formData.audit_status,
      };

      if (editingRecord) {
        const res = await authFetch(`/api/governance/${editingRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to update governance record');
        }
        setActionAlert({ type: 'success', message: `Governance record for "${payload.policy_name}" updated.` });
      } else {
        const res = await authFetch('/api/governance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to create governance record');
        }
        setActionAlert({ type: 'success', message: `Governance record for "${payload.policy_name}" initialized.` });
      }

      setIsCreateModalOpen(false);
      await fetchRecords();
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Error saving governance record.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Mark Completed
  const handleQuickMarkCompleted = async (rec: GovernanceRecordWithDetails, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isHrHead) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextDue = new Date();
      nextDue.setFullYear(nextDue.getFullYear() + 1);

      const res = await authFetch(`/api/governance/${rec.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          last_review_date: today,
          next_review_due: nextDue.toISOString().split('T')[0],
          audit_status: 'completed',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update status');
      }
      setActionAlert({
        type: 'success',
        message: `Marked "${rec.policy_name}" audit as completed. Next review set to 1 year out.`,
      });
      await fetchRecords();
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Failed to mark completed.' });
    }
  };

  // Delete Record
  const handleDeleteRecord = async (rec: GovernanceRecordWithDetails, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isHrHead) return;
    if (!window.confirm(`Are you sure you want to remove the governance record for "${rec.policy_name}"?`)) {
      return;
    }

    try {
      const res = await authFetch(`/api/governance/${rec.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete record');
      }
      setActionAlert({ type: 'success', message: `Governance record for "${rec.policy_name}" deleted.` });
      await fetchRecords();
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Failed to delete record.' });
    }
  };

  return (
    <div id="governance-page" className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                  HR Policy Governance
                </h1>
                {/* RLS Indicator Pill */}
                {isHrHead ? (
                  <span
                    id="rls-hr-head-badge"
                    className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                    title="HR Head role: Full governance write, review, and approval permissions"
                  >
                    HR Head • Write Access
                  </span>
                ) : (
                  <span
                    id="rls-hr-analyst-badge"
                    className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                    title="HR Analyst role: Read-only access to governance schedules and audit status"
                  >
                    HR Analyst • Read-Only
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Internal review, approval, and audit lifecycle management for corporate policy & process documents
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            id="run-audit-scan-btn"
            onClick={handleRunAuditScan}
            disabled={isScanning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Scan upcoming review dates and notify HR Head of overdue policies"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>Check Deadlines</span>
          </button>

          {isHrHead && (
            <button
              id="new-governance-record-btn"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Governance Record</span>
            </button>
          )}
        </div>
      </div>

      {/* Conceptual Scope Banner */}
      <div className="p-3.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-start gap-3">
        <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
          <span className="font-semibold text-[var(--text-primary)]">Governance vs. Acknowledgement:</span> Governance tracks the internal review cadence, leadership approval, and audit readiness of HR policies. Employee-facing distribution and sign-offs are managed separately under{' '}
          {onNavigateToPolicies ? (
            <button
              onClick={onNavigateToPolicies}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold inline-flex items-center gap-0.5 cursor-pointer"
            >
              <span>Policies & Acknowledgements</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          ) : (
            <span className="font-semibold text-blue-600 dark:text-blue-400">Policies & Acknowledgements</span>
          )}
          .
        </div>
      </div>

      {/* Action Alert Banner */}
      {actionAlert && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
            actionAlert.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionAlert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{actionAlert.message}</span>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="p-1 hover:opacity-75 cursor-pointer text-current"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Documents */}
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xs">
          <div className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Total Tracked
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {kpis.total}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Internal policies & SOPs
          </div>
        </div>

        {/* Overdue */}
        <div
          className={`p-4 rounded-xl border shadow-2xs transition-colors ${
            kpis.overdue > 0
              ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/30'
              : 'bg-[var(--bg-card)] border-[var(--border-subtle)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Overdue Audit
            </span>
            {kpis.overdue > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {kpis.overdue}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Requires immediate review
          </div>
        </div>

        {/* Pending Review */}
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xs">
          <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Pending / Upcoming
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {kpis.pending}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Cycle in progress
          </div>
        </div>

        {/* Completed */}
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xs">
          <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Compliant / Current
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {kpis.completed}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Audited and up to date
          </div>
        </div>

        {/* Distributed */}
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Staff Distribution
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {kpis.distributedPct}%
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {kpis.distributedCount} of {kpis.total} distributed
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Sorting */}
      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              id="search-governance-input"
              type="text"
              placeholder="Search policy name, reviewer, or approver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <select
                id="filter-status-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="overdue">Overdue for Audit</option>
                <option value="pending">Pending Review</option>
                <option value="completed">Completed / Up to Date</option>
              </select>
            </div>

            {/* Distribution Filter */}
            <select
              id="filter-distributed-select"
              value={distributedFilter}
              onChange={(e) => setDistributedFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Distributions</option>
              <option value="yes">Distributed to Staff (Y)</option>
              <option value="no">Internal Process (N)</option>
            </select>

            {/* Sort Order */}
            <select
              id="sort-order-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-medium"
            >
              <option value="next_due_asc">Sort: Next Review Due (Earliest / Overdue)</option>
              <option value="next_due_desc">Sort: Next Review Due (Furthest)</option>
              <option value="name_asc">Sort: Policy Name (A–Z)</option>
              <option value="last_review_desc">Sort: Last Review Date (Recent First)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Governance Table */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Loading governance records...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Scale className="w-10 h-10 mx-auto text-[var(--text-muted)] opacity-50" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              No governance records found
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all' || distributedFilter !== 'all'
                ? 'Try adjusting your search query or filters to find matching documents.'
                : 'Initialize your first policy governance record to begin tracking review lifecycles.'}
            </p>
            {isHrHead && (
              <button
                onClick={handleOpenCreateModal}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Record</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 text-[var(--text-muted)] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Policy / Document Name</th>
                  <th className="py-3 px-3">Last Review</th>
                  <th className="py-3 px-3">Next Review Due</th>
                  <th className="py-3 px-3">Reviewer</th>
                  <th className="py-3 px-3">Approver</th>
                  <th className="py-3 px-3 text-center">Distributed</th>
                  <th className="py-3 px-3">Audit Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-secondary)]">
                {filteredRecords.map((record) => {
                  const isOverdue = record.is_overdue || record.audit_status === 'overdue';
                  const isCompleted = record.audit_status === 'completed';

                  return (
                    <tr
                      key={record.id}
                      id={`gov-row-${record.id}`}
                      className={`hover:bg-[var(--bg-hover)]/60 transition-colors group ${
                        isOverdue ? 'bg-rose-500/5' : ''
                      }`}
                    >
                      {/* Policy Name & Link */}
                      <td className="py-3.5 px-4 font-medium text-[var(--text-primary)] max-w-xs">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-xs text-[var(--text-primary)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {record.policy_name}
                          </span>
                          {record.related_policy ? (
                            <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-normal">
                              <FileCheck className="w-3 h-3 shrink-0" />
                              <span className="truncate" title={`Linked to: ${record.related_policy.name}`}>
                                Linked Policy ({record.related_policy.version})
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[var(--text-muted)] font-normal">
                              Internal Process SOP
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Last Review Date */}
                      <td className="py-3.5 px-3 font-mono text-[11px] text-[var(--text-primary)]">
                        {record.last_review_date}
                      </td>

                      {/* Next Review Due + Days Badge */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`font-mono text-[11px] font-semibold ${
                              isOverdue
                                ? 'text-rose-600 dark:text-rose-400'
                                : record.days_until_due <= 14 && !isCompleted
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-[var(--text-primary)]'
                            }`}
                          >
                            {record.next_review_due}
                          </span>
                          {isCompleted ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              Audited & current
                            </span>
                          ) : isOverdue ? (
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                              {Math.abs(record.days_until_due)}d overdue
                            </span>
                          ) : record.days_until_due <= 14 ? (
                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              Due in {record.days_until_due}d
                            </span>
                          ) : (
                            <span className="text-[10px] text-[var(--text-muted)]">
                              In {record.days_until_due}d
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Reviewed By */}
                      <td className="py-3.5 px-3 text-xs text-[var(--text-primary)]">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                          <span className="truncate max-w-[140px]" title={record.reviewed_by}>
                            {record.reviewed_by}
                          </span>
                        </div>
                      </td>

                      {/* Approved By */}
                      <td className="py-3.5 px-3 text-xs text-[var(--text-primary)]">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate max-w-[140px]" title={record.approved_by}>
                            {record.approved_by}
                          </span>
                        </div>
                      </td>

                      {/* Distributed */}
                      <td className="py-3.5 px-3 text-center">
                        {record.distributed ? (
                          <StatusPill
                            id={`dist-pill-yes-${record.id}`}
                            variant="green"
                            label="Yes"
                          />
                        ) : (
                          <StatusPill
                            id={`dist-pill-no-${record.id}`}
                            variant="gray"
                            label="No (Internal)"
                          />
                        )}
                      </td>

                      {/* Audit Status Pill */}
                      <td className="py-3.5 px-3">
                        {isOverdue ? (
                          <StatusPill
                            id={`status-pill-overdue-${record.id}`}
                            variant="red"
                            label="Overdue"
                            pulseDot
                          />
                        ) : isCompleted ? (
                          <StatusPill
                            id={`status-pill-completed-${record.id}`}
                            variant="green"
                            label="Completed"
                          />
                        ) : (
                          <StatusPill
                            id={`status-pill-pending-${record.id}`}
                            variant="amber"
                            label="Pending Review"
                          />
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details (both roles) */}
                          <button
                            id={`view-gov-${record.id}-btn`}
                            onClick={() => setViewingRecord(record)}
                            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                            title="View Governance Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* HR Head Only Controls */}
                          {isHrHead ? (
                            <>
                              {!isCompleted && (
                                <button
                                  id={`quick-complete-gov-${record.id}-btn`}
                                  onClick={(e) => handleQuickMarkCompleted(record, e)}
                                  className="p-1 rounded text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                  title="Quick Mark Audit Completed (Sets next review +1 year)"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                id={`edit-gov-${record.id}-btn`}
                                onClick={() => handleOpenEditModal(record)}
                                className="p-1 rounded text-[var(--text-secondary)] hover:text-indigo-600 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                                title="Edit Governance Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                id={`delete-gov-${record.id}-btn`}
                                onClick={(e) => handleDeleteRecord(record, e)}
                                className="p-1 rounded text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span
                              className="text-[10px] text-[var(--text-muted)] italic"
                              title="HR Analyst role has read-only access"
                            >
                              Read-only
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create / Edit Governance Record (HR Head Only) */}
      {isCreateModalOpen && isHrHead && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    {editingRecord ? 'Edit Policy Governance Record' : 'New Policy Governance Record'}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Track approval, review interval, and audit status
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-4">
              {/* Link to Milestone 20 Policy */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Link to Existing Policy (Milestone 20)
                </label>
                <select
                  id="form-related-policy-select"
                  value={formData.related_policy_id}
                  onChange={(e) => handleSelectRelatedPolicy(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">None — Standalone Process / Internal SOP</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.version})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  Links this governance lifecycle directly to the employee acknowledgement record in Policies.
                </p>
              </div>

              {/* Policy Name */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Policy / Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  id="form-policy-name-input"
                  type="text"
                  required
                  placeholder="e.g. Anti-Harassment & Workplace Conduct Charter"
                  value={formData.policy_name}
                  onChange={(e) => setFormData({ ...formData, policy_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Dates Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Last Review Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="form-last-review-input"
                    type="date"
                    required
                    value={formData.last_review_date}
                    onChange={(e) => setFormData({ ...formData, last_review_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Next Review Due <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="form-next-review-input"
                    type="date"
                    required
                    value={formData.next_review_due}
                    onChange={(e) => setFormData({ ...formData, next_review_due: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Quick Interval Setters */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--text-muted)]">Set Next Review:</span>
                <button
                  type="button"
                  onClick={() => handleSetInterval(6)}
                  className="px-2 py-1 text-[10px] rounded bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] font-medium cursor-pointer"
                >
                  +6 Months
                </button>
                <button
                  type="button"
                  onClick={() => handleSetInterval(12)}
                  className="px-2 py-1 text-[10px] rounded bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] font-medium cursor-pointer"
                >
                  +1 Year
                </button>
                <button
                  type="button"
                  onClick={() => handleSetInterval(24)}
                  className="px-2 py-1 text-[10px] rounded bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] font-medium cursor-pointer"
                >
                  +2 Years
                </button>
              </div>

              {/* People: Reviewed By & Approved By */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Reviewed By <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="form-reviewed-by-input"
                    type="text"
                    required
                    placeholder="e.g. Kofi Mensah (People Lead)"
                    value={formData.reviewed_by}
                    onChange={(e) => setFormData({ ...formData, reviewed_by: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Approved By <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="form-approved-by-input"
                    type="text"
                    required
                    placeholder="e.g. Ignatius Arthur (Head of HR)"
                    value={formData.approved_by}
                    onChange={(e) => setFormData({ ...formData, approved_by: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Distributed & Audit Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Distributed to Staff (Y/N)
                  </label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
                      <input
                        type="radio"
                        name="distributed"
                        checked={formData.distributed === true}
                        onChange={() => setFormData({ ...formData, distributed: true })}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Yes (Active Distribution)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
                      <input
                        type="radio"
                        name="distributed"
                        checked={formData.distributed === false}
                        onChange={() => setFormData({ ...formData, distributed: false })}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>No (Internal SOP)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Audit Status
                  </label>
                  <select
                    id="form-audit-status-select"
                    value={formData.audit_status}
                    onChange={(e) => setFormData({ ...formData, audit_status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="pending">Pending Review</option>
                    <option value="completed">Completed / Up to Date</option>
                    <option value="overdue">Overdue for Audit</option>
                  </select>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-md border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-governance-form-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-bold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingRecord ? 'Save Changes' : 'Create Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Details (Available to both HR Head and HR Analyst) */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start justify-between border-b border-[var(--border-subtle)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    {viewingRecord.policy_name}
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Policy Governance & Audit Lifecycle Record
                </p>
              </div>
              <button
                onClick={() => setViewingRecord(null)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Status Header */}
              <div className="p-3 rounded-lg bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] flex items-center justify-between">
                <span className="font-medium text-[var(--text-secondary)]">Current Audit Status:</span>
                {viewingRecord.is_overdue || viewingRecord.audit_status === 'overdue' ? (
                  <StatusPill
                    variant="red"
                    label={`Overdue (${Math.abs(viewingRecord.days_until_due)} days)`}
                    pulseDot
                  />
                ) : viewingRecord.audit_status === 'completed' ? (
                  <StatusPill
                    variant="green"
                    label="Completed & Up to Date"
                  />
                ) : (
                  <StatusPill
                    variant="amber"
                    label={`Pending Review (Due in ${viewingRecord.days_until_due}d)`}
                  />
                )}
              </div>

              {/* Review Timeline */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-[var(--border-subtle)]">
                  <span className="text-[11px] text-[var(--text-muted)] block">Last Review Date</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)] mt-1 block">
                    {viewingRecord.last_review_date}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-[var(--border-subtle)]">
                  <span className="text-[11px] text-[var(--text-muted)] block">Next Review Due</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)] mt-1 block">
                    {viewingRecord.next_review_due}
                  </span>
                </div>
              </div>

              {/* Stakeholders */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-[var(--border-subtle)]">
                  <span className="text-[11px] text-[var(--text-muted)] block">Reviewed By</span>
                  <span className="font-medium text-[var(--text-primary)] mt-1 block">
                    {viewingRecord.reviewed_by}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-[var(--border-subtle)]">
                  <span className="text-[11px] text-[var(--text-muted)] block">Approved By</span>
                  <span className="font-medium text-[var(--text-primary)] mt-1 block">
                    {viewingRecord.approved_by}
                  </span>
                </div>
              </div>

              {/* Linked Policy Relation */}
              <div className="p-3 rounded-lg border border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--text-muted)] block">
                  Related Milestone 20 Policy
                </span>
                {viewingRecord.related_policy ? (
                  <div className="mt-1 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {viewingRecord.related_policy.name}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] ml-2">
                        ({viewingRecord.related_policy.version})
                      </span>
                    </div>
                    {onNavigateToPolicies && (
                      <button
                        onClick={() => {
                          setViewingRecord(null);
                          onNavigateToPolicies();
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Acknowledgements</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-[var(--text-secondary)] italic mt-1 block">
                    None — Standalone internal SOP / operational document
                  </span>
                )}
              </div>

              {/* Distribution Status */}
              <div className="p-3 rounded-lg border border-[var(--border-subtle)] flex items-center justify-between">
                <div>
                  <span className="font-medium text-[var(--text-primary)] block">Staff Distribution Status</span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Has this document been rolled out to workforce staff?
                  </span>
                </div>
                {viewingRecord.distributed ? (
                  <StatusPill variant="green" label="Distributed (Y)" />
                ) : (
                  <StatusPill variant="gray" label="Internal SOP (N)" />
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-subtle)]">
              {isHrHead && (
                <button
                  onClick={() => {
                    const rec = viewingRecord;
                    setViewingRecord(null);
                    handleOpenEditModal(rec);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                >
                  Edit Record
                </button>
              )}
              <button
                onClick={() => setViewingRecord(null)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-md border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
