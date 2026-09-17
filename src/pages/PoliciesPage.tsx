import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  PolicyWithDetails,
  PolicyAcknowledgementWithDetails,
  PolicyAcknowledgmentMethod,
  Department,
  AppDocument,
} from '../types';
import { StatusPill } from '../components/StatusPill';
import {
  FileCheck,
  Plus,
  Search,
  Filter,
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  FileText,
  Laptop,
  Mail,
  MoreVertical,
  Edit2,
  Trash2,
  ExternalLink,
  Users,
  Flag,
  RotateCcw,
  Check,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface PoliciesPageProps {
  onNavigateToEmployee?: (empId: string) => void;
  onNavigateToDocuments?: () => void;
}

export const PoliciesPage: React.FC<PoliciesPageProps> = ({
  onNavigateToEmployee,
  onNavigateToDocuments,
}) => {
  const { authFetch, organization, subscribeToRealtime } = useAuth();

  // State
  const [policies, setPolicies] = useState<PolicyWithDetails[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [acknowledgements, setAcknowledgements] = useState<PolicyAcknowledgementWithDetails[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAcksLoading, setIsAcksLoading] = useState(false);

  // Filters
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'acknowledged' | 'pending' | 'follow_up'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Forms
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    id: '',
    name: '',
    version: '',
    issue_date: new Date().toISOString().split('T')[0],
    document_id: '',
  });

  // Single employee acknowledgment record modal
  const [ackModalOpen, setAckModalOpen] = useState(false);
  const [selectedAckRecord, setSelectedAckRecord] = useState<PolicyAcknowledgementWithDetails | null>(null);
  const [ackForm, setAckForm] = useState<{
    date: string;
    method: PolicyAcknowledgmentMethod;
  }>({
    date: new Date().toISOString().split('T')[0],
    method: 'in_app',
  });

  // Batch Selection
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchForm, setBatchForm] = useState<{
    date: string;
    method: PolicyAcknowledgmentMethod;
  }>({
    date: new Date().toISOString().split('T')[0],
    method: 'in_app',
  });

  // Action status message
  const [actionAlert, setActionAlert] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-dismiss alerts
  useEffect(() => {
    if (actionAlert) {
      const timer = setTimeout(() => setActionAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionAlert]);

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    try {
      const res = await authFetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to fetch departments', e);
    }
  }, [authFetch]);

  // Fetch documents for linking
  const fetchDocuments = useCallback(async () => {
    try {
      const res = await authFetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to fetch documents', e);
    }
  }, [authFetch]);

  // Fetch policies
  const fetchPolicies = useCallback(async (selectFirst = false) => {
    setIsLoading(true);
    try {
      const url =
        selectedDepartment && selectedDepartment !== 'all'
          ? `/api/policies?department_id=${encodeURIComponent(selectedDepartment)}`
          : '/api/policies';
      const res = await authFetch(url);
      if (res.ok) {
        const data: PolicyWithDetails[] = await res.json();
        setPolicies(data);
        if (data.length > 0) {
          if (selectFirst || !selectedPolicyId || !data.some((p) => p.id === selectedPolicyId)) {
            setSelectedPolicyId(data[0].id);
          }
        } else {
          setSelectedPolicyId(null);
        }
      }
    } catch (e) {
      console.error('Failed to fetch policies', e);
    } finally {
      setIsLoading(false);
    }
  }, [authFetch, selectedDepartment, selectedPolicyId]);

  // Fetch acknowledgements for active policy
  const fetchAcknowledgements = useCallback(async () => {
    if (!selectedPolicyId) {
      setAcknowledgements([]);
      return;
    }
    setIsAcksLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDepartment !== 'all') params.append('department_id', selectedDepartment);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await authFetch(`/api/policies/${selectedPolicyId}/acknowledgements?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAcknowledgements(data);
      }
    } catch (e) {
      console.error('Failed to fetch acknowledgements', e);
    } finally {
      setIsAcksLoading(false);
    }
  }, [authFetch, selectedPolicyId, selectedDepartment, statusFilter, searchQuery]);

  // Initial load
  useEffect(() => {
    fetchDepartments();
    fetchDocuments();
    fetchPolicies(true);
  }, [fetchDepartments, fetchDocuments]);

  // Fetch when department filter changes
  useEffect(() => {
    fetchPolicies();
  }, [selectedDepartment]);

  // Fetch acknowledgements when selection or filters change
  useEffect(() => {
    fetchAcknowledgements();
    setSelectedEmpIds([]);
  }, [selectedPolicyId, selectedDepartment, statusFilter, searchQuery, fetchAcknowledgements]);

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = subscribeToRealtime((payload) => {
      if (
        payload.event === 'policy_created' ||
        payload.event === 'policy_updated' ||
        payload.event === 'policy_deleted' ||
        payload.event === 'policy_acknowledgement_updated'
      ) {
        fetchPolicies();
        fetchAcknowledgements();
      }
    });
    return unsubscribe;
  }, [subscribeToRealtime, fetchPolicies, fetchAcknowledgements]);

  // Active selected policy
  const currentPolicy = useMemo(() => {
    return policies.find((p) => p.id === selectedPolicyId) || null;
  }, [policies, selectedPolicyId]);

  // Summary KPIs across all policies
  const overallKPIs = useMemo(() => {
    if (policies.length === 0) {
      return { total: 0, avgRate: 0, totalPending: 0, totalFollowUp: 0 };
    }
    const total = policies.length;
    const totalAcks = policies.reduce((acc, p) => acc + p.acknowledged_count, 0);
    const totalEmps = policies.reduce((acc, p) => acc + p.total_employees, 0);
    const totalPending = policies.reduce((acc, p) => acc + p.pending_count, 0);
    const totalFollowUp = policies.reduce((acc, p) => acc + p.follow_up_count, 0);
    const avgRate = totalEmps > 0 ? Math.round((totalAcks / totalEmps) * 100) : 0;
    return { total, avgRate, totalPending, totalFollowUp };
  }, [policies]);

  // Handlers: Policy Create / Edit / Delete
  const handleOpenCreateModal = () => {
    setPolicyForm({
      id: '',
      name: '',
      version: 'v1.0',
      issue_date: new Date().toISOString().split('T')[0],
      document_id: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (p: PolicyWithDetails, e: React.MouseEvent) => {
    e.stopPropagation();
    setPolicyForm({
      id: p.id,
      name: p.name,
      version: p.version,
      issue_date: p.issue_date,
      document_id: p.document_id || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyForm.name.trim() || !policyForm.version.trim()) {
      setActionAlert({ type: 'error', message: 'Policy name and version are required.' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (policyForm.id) {
        // Update
        const res = await authFetch(`/api/policies/${policyForm.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: policyForm.name,
            version: policyForm.version,
            issue_date: policyForm.issue_date,
            document_id: policyForm.document_id || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to update policy');
        }
        setActionAlert({ type: 'success', message: `Updated "${policyForm.name}" successfully.` });
        setIsEditModalOpen(false);
      } else {
        // Create
        const res = await authFetch('/api/policies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: policyForm.name,
            version: policyForm.version,
            issue_date: policyForm.issue_date,
            document_id: policyForm.document_id || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to create policy');
        }
        const created = await res.json();
        setActionAlert({ type: 'success', message: `Created policy "${created.name}" and initialized roster.` });
        setIsCreateModalOpen(false);
        setSelectedPolicyId(created.id);
      }
      await fetchPolicies();
      await fetchAcknowledgements();
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Error saving policy.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePolicy = async (policyId: string, policyName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete policy "${policyName}"? This will also remove its associated acknowledgment audit records.`)) {
      return;
    }

    try {
      const res = await authFetch(`/api/policies/${policyId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setActionAlert({ type: 'info', message: `Policy "${policyName}" deleted.` });
        await fetchPolicies(true);
      } else {
        const err = await res.json();
        setActionAlert({ type: 'error', message: err.error || 'Failed to delete policy' });
      }
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Error deleting policy' });
    }
  };

  // Handler: Remind Outstanding Employees (Milestone 11)
  const handleRemindOutstanding = async () => {
    if (!currentPolicy) return;
    setIsSubmitting(true);
    try {
      const res = await authFetch(`/api/policies/${currentPolicy.id}/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department_id: selectedDepartment !== 'all' ? selectedDepartment : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setActionAlert({
          type: 'success',
          message: data.message || `Dispatched reminders to ${data.reminded_count} outstanding employee(s).`,
        });
        await fetchPolicies();
        await fetchAcknowledgements();
      } else {
        const err = await res.json();
        setActionAlert({ type: 'error', message: err.error || 'Failed to send reminders.' });
      }
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Error dispatching reminders.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Mark Single Acknowledgment
  const handleOpenAckModal = (rec: PolicyAcknowledgementWithDetails) => {
    setSelectedAckRecord(rec);
    setAckForm({
      date: rec.acknowledgment_date || new Date().toISOString().split('T')[0],
      method: rec.acknowledgment_method || 'in_app',
    });
    setAckModalOpen(true);
  };

  const handleSaveAcknowledgement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPolicy || !selectedAckRecord) return;

    setIsSubmitting(true);
    try {
      const res = await authFetch(
        `/api/policies/${currentPolicy.id}/acknowledgements/${selectedAckRecord.employee_id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            acknowledged: true,
            acknowledgment_date: ackForm.date,
            acknowledgment_method: ackForm.method,
          }),
        }
      );
      if (res.ok) {
        setActionAlert({
          type: 'success',
          message: `Recorded acknowledgment for ${selectedAckRecord.employee_name}.`,
        });
        setAckModalOpen(false);
        await fetchPolicies();
        await fetchAcknowledgements();
      } else {
        const err = await res.json();
        setActionAlert({ type: 'error', message: err.error || 'Failed to record acknowledgment' });
      }
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Error updating record.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Reset / Revoke Acknowledgment to Pending
  const handleResetAcknowledgement = async (rec: PolicyAcknowledgementWithDetails) => {
    if (!currentPolicy) return;
    if (!window.confirm(`Reset acknowledgment status for ${rec.employee_name} back to Pending?`)) {
      return;
    }

    try {
      const res = await authFetch(
        `/api/policies/${currentPolicy.id}/acknowledgements/${rec.employee_id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            acknowledged: false,
          }),
        }
      );
      if (res.ok) {
        setActionAlert({
          type: 'info',
          message: `Reset ${rec.employee_name}'s status to Pending.`,
        });
        await fetchPolicies();
        await fetchAcknowledgements();
      }
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Error updating record.' });
    }
  };

  // Handler: Toggle Follow-Up Required
  const handleToggleFollowUp = async (rec: PolicyAcknowledgementWithDetails) => {
    if (!currentPolicy) return;
    const newFlag = !rec.follow_up_required;
    try {
      const res = await authFetch(
        `/api/policies/${currentPolicy.id}/acknowledgements/${rec.employee_id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            follow_up_required: newFlag,
          }),
        }
      );
      if (res.ok) {
        setActionAlert({
          type: 'info',
          message: newFlag
            ? `Flagged ${rec.employee_name} for follow-up outreach.`
            : `Cleared follow-up flag for ${rec.employee_name}.`,
        });
        await fetchPolicies();
        await fetchAcknowledgements();
      }
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Error updating flag.' });
    }
  };

  // Batch Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedEmpIds.length === acknowledgements.length) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(acknowledgements.map((a) => a.employee_id));
    }
  };

  const handleToggleSelectEmp = (empId: string) => {
    setSelectedEmpIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const handleBatchAcknowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPolicy || selectedEmpIds.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await authFetch(`/api/policies/${currentPolicy.id}/batch-acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_ids: selectedEmpIds,
          acknowledgment_date: batchForm.date,
          acknowledgment_method: batchForm.method,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setActionAlert({
          type: 'success',
          message: data.message || `Recorded acknowledgment for ${selectedEmpIds.length} employee(s).`,
        });
        setIsBatchModalOpen(false);
        setSelectedEmpIds([]);
        await fetchPolicies();
        await fetchAcknowledgements();
      } else {
        const err = await res.json();
        setActionAlert({ type: 'error', message: err.error || 'Failed to record batch acknowledgments' });
      }
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Error processing batch.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export to CSV (Zeepay's Policy Acknowledgement sheet reference)
  const handleExportCSV = () => {
    if (!currentPolicy || acknowledgements.length === 0) {
      setActionAlert({ type: 'info', message: 'No policy acknowledgment data to export.' });
      return;
    }

    const headers = [
      'Policy Name',
      'Version',
      'Issue Date',
      'Employee ID',
      'Employee Name',
      'Department',
      'Job Title',
      'Country',
      'Acknowledged',
      'Acknowledgment Date',
      'Method',
      'Follow-up Required',
    ];

    const rows = acknowledgements.map((a) => [
      `"${currentPolicy.name.replace(/"/g, '""')}"`,
      `"${currentPolicy.version}"`,
      `"${currentPolicy.issue_date}"`,
      `"${a.employee_id}"`,
      `"${a.employee_name.replace(/"/g, '""')}"`,
      `"${a.department_name.replace(/"/g, '""')}"`,
      `"${a.job_title.replace(/"/g, '""')}"`,
      `"${a.country}"`,
      a.acknowledged ? 'Yes' : 'No',
      a.acknowledgment_date || '',
      a.acknowledgment_method || '',
      a.follow_up_required ? 'Yes' : 'No',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Policy_Ack_${currentPolicy.name.replace(/[^a-zA-Z0-9]/g, '_')}_${currentPolicy.version}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setActionAlert({
      type: 'success',
      message: `Exported policy acknowledgment audit sheet for "${currentPolicy.name}".`,
    });
  };

  const getMethodBadge = (method: PolicyAcknowledgmentMethod | null) => {
    switch (method) {
      case 'in_app':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-medium border border-sky-200 dark:border-sky-800">
            <Laptop className="w-3 h-3" />
            In-App
          </span>
        );
      case 'email':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200 dark:border-indigo-800">
            <Mail className="w-3 h-3" />
            Email
          </span>
        );
      case 'paper':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-medium border border-amber-200 dark:border-amber-800">
            <FileText className="w-3 h-3" />
            Signed Paper
          </span>
        );
      default:
        return <span className="text-xs text-[var(--text-muted)]">-</span>;
    }
  };

  return (
    <div id="policies-page-container" className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Alert Banner */}
      {actionAlert && (
        <div
          id="policy-action-alert"
          className={`p-3.5 rounded-lg flex items-center justify-between text-sm transition-all shadow-2xs ${
            actionAlert.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
              : actionAlert.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionAlert.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {actionAlert.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            {actionAlert.type === 'info' && <Bell className="w-4 h-4 text-blue-600 shrink-0" />}
            <span>{actionAlert.message}</span>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="text-xs font-semibold opacity-70 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                Policy Acknowledgements
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                Audit sign-offs, track compliance rates, and dispatch reminder notifications.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {currentPolicy && (
            <button
              id="export-policy-csv-btn"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Export Zeepay-style policy acknowledgement proof roster"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          )}

          <button
            id="create-policy-btn"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Policy</span>
          </button>
        </div>
      </div>

      {/* Metric Summary Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xs">
          <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Active Policies
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {overallKPIs.total}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            Tracked in compliance ledger
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xs">
          <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Avg Completion
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-[var(--text-primary)]">
              {overallKPIs.avgRate}%
            </span>
            <div className="flex-1 max-w-[80px] bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden self-center">
              <div
                className={`h-full rounded-full ${
                  overallKPIs.avgRate >= 80
                    ? 'bg-emerald-500'
                    : overallKPIs.avgRate >= 50
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${overallKPIs.avgRate}%` }}
              />
            </div>
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            Organization-wide rate
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xs">
          <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Pending Sign-offs
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {overallKPIs.totalPending}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            Awaiting employee acknowledgment
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xs">
          <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Follow-up Flagged
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {overallKPIs.totalFollowUp}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            Direct HR intervention needed
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Left Policies Sidebar / Right Acknowledgements Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Policy Cards List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Company Policies ({policies.length})
            </h2>
            {selectedDepartment !== 'all' && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium">
                Dept Filtered
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-[var(--text-muted)] bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]">
              Loading policies...
            </div>
          ) : policies.length === 0 ? (
            <div className="p-8 text-center bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] space-y-3">
              <FileCheck className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
              <p className="text-sm text-[var(--text-secondary)]">No policies created yet.</p>
              <button
                onClick={handleOpenCreateModal}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                + Create First Policy
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {policies.map((p) => {
                const isSelected = p.id === selectedPolicyId;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPolicyId(p.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-[var(--bg-card)] border-blue-500 shadow-sm ring-1 ring-blue-500/20'
                        : 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {p.name}
                          </h3>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-mono font-medium border border-[var(--border-subtle)]">
                            {p.version}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          Issued: {new Date(p.issue_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => handleOpenEditModal(p, e)}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                          title="Edit policy details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeletePolicy(p.id, p.name, e)}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete policy"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Linked Document Tag */}
                    {p.document_file_name ? (
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-1 rounded border border-blue-100 dark:border-blue-900/60 truncate">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{p.document_file_name}</span>
                        {onNavigateToDocuments && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToDocuments();
                            }}
                            className="ml-auto text-[10px] hover:underline shrink-0"
                            title="Open in Documents Repository"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-[var(--text-muted)] italic">
                        No attached document
                      </div>
                    )}

                    {/* Completion Meter Bar */}
                    <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)]">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {p.acknowledged_count}/{p.total_employees} acknowledged
                        </span>
                        <span
                          className={`font-bold ${
                            p.completion_rate >= 80
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : p.completion_rate >= 50
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {p.completion_rate}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            p.completion_rate >= 80
                              ? 'bg-emerald-500'
                              : p.completion_rate >= 50
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${p.completion_rate}%` }}
                        />
                      </div>

                      {p.follow_up_count > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                          <Flag className="w-3 h-3 shrink-0" />
                          <span>{p.follow_up_count} flagged for follow-up</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Policy Detail & Acknowledgements Roster (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {currentPolicy ? (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] shadow-2xs overflow-hidden">
              {/* Policy Header Box */}
              <div className="p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-[var(--text-primary)]">
                        {currentPolicy.name}
                      </h2>
                      <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {currentPolicy.version}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mt-1">
                      <span>Issued: {new Date(currentPolicy.issue_date).toLocaleDateString()}</span>
                      {currentPolicy.document_file_name && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <FileText className="w-3.5 h-3.5" />
                            {currentPolicy.document_file_name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* One-Click Remind Action */}
                  <div className="flex items-center gap-2">
                    <button
                      id="remind-outstanding-btn"
                      onClick={handleRemindOutstanding}
                      disabled={isSubmitting || currentPolicy.pending_count === 0}
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                        currentPolicy.pending_count > 0
                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-[var(--text-muted)] cursor-not-allowed'
                      }`}
                      title={
                        currentPolicy.pending_count > 0
                          ? `Send high-priority reminder notifications to ${currentPolicy.pending_count} pending employees`
                          : 'All employees have completed acknowledgment'
                      }
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>
                        Remind Outstanding ({currentPolicy.pending_count} pending)
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Filters Toolbar */}
              <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Search */}
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      id="search-acknowledgements-input"
                      type="text"
                      placeholder="Search employee by name, title, email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-md text-xs bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Department Filter */}
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    <select
                      id="department-filter-select"
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="px-2.5 py-1.5 rounded-md text-xs bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="all">All Departments</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status Tabs */}
                <div className="flex items-center gap-1 border-t border-[var(--border-subtle)] pt-2.5 overflow-x-auto">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-[var(--bg-active)] text-[var(--text-primary)] font-bold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    All ({currentPolicy.total_employees})
                  </button>
                  <button
                    onClick={() => setStatusFilter('acknowledged')}
                    className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      statusFilter === 'acknowledged'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    Acknowledged ({currentPolicy.acknowledged_count})
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      statusFilter === 'pending'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    Pending ({currentPolicy.pending_count})
                  </button>
                  <button
                    onClick={() => setStatusFilter('follow_up')}
                    className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      statusFilter === 'follow_up'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    Follow-up Required ({currentPolicy.follow_up_count})
                  </button>
                </div>
              </div>

              {/* Batch Actions Bar (when checkboxes selected) */}
              {selectedEmpIds.length > 0 && (
                <div
                  id="batch-actions-bar"
                  className="px-4 py-2 bg-blue-50 dark:bg-blue-950/70 border-b border-blue-200 dark:border-blue-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 font-medium text-blue-900 dark:text-blue-200">
                    <span className="font-bold">{selectedEmpIds.length}</span> employee(s) selected
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsBatchModalOpen(true)}
                      className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-2xs cursor-pointer"
                    >
                      Record Batch Acknowledgment
                    </button>
                    <button
                      onClick={() => setSelectedEmpIds([])}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline cursor-pointer"
                    >
                      Deselect
                    </button>
                  </div>
                </div>
              )}

              {/* Acknowledgements Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--bg-subtle)] text-[var(--text-muted)] uppercase tracking-wider font-semibold border-b border-[var(--border-subtle)]">
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            acknowledgements.length > 0 &&
                            selectedEmpIds.length === acknowledgements.length
                          }
                          onChange={handleToggleSelectAll}
                          className="rounded border-[var(--border-subtle)] text-blue-600 cursor-pointer"
                        />
                      </th>
                      <th className="p-3 font-semibold">Employee</th>
                      <th className="p-3 font-semibold">Department & Role</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold">Sign-off Date</th>
                      <th className="p-3 font-semibold">Method</th>
                      <th className="p-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {isAcksLoading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-[var(--text-muted)]">
                          Loading roster records...
                        </td>
                      </tr>
                    ) : acknowledgements.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-[var(--text-muted)]">
                          No employees match the specified filters.
                        </td>
                      </tr>
                    ) : (
                      acknowledgements.map((rec) => {
                        const isSelected = selectedEmpIds.includes(rec.employee_id);
                        return (
                          <tr
                            key={rec.id || rec.employee_id}
                            className={`hover:bg-[var(--bg-hover)] transition-colors ${
                              isSelected ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''
                            }`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectEmp(rec.employee_id)}
                                className="rounded border-[var(--border-subtle)] text-blue-600 cursor-pointer"
                              />
                            </td>

                            {/* Employee Name */}
                            <td className="p-3">
                              <div className="font-semibold text-[var(--text-primary)]">
                                {onNavigateToEmployee ? (
                                  <button
                                    onClick={() => onNavigateToEmployee(rec.employee_id)}
                                    className="hover:text-blue-600 hover:underline text-left cursor-pointer font-semibold"
                                  >
                                    {rec.employee_name}
                                  </button>
                                ) : (
                                  rec.employee_name
                                )}
                              </div>
                              <div className="text-[11px] text-[var(--text-muted)]">
                                {rec.work_email || `${rec.employee_id} • ${rec.country}`}
                              </div>
                            </td>

                            {/* Department & Role */}
                            <td className="p-3">
                              <div className="text-[var(--text-secondary)] font-medium">
                                {rec.job_title}
                              </div>
                              <div className="text-[11px] text-[var(--text-muted)]">
                                {rec.department_name}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="p-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {rec.acknowledged ? (
                                  <StatusPill variant="green" label="Acknowledged" />
                                ) : (
                                  <StatusPill variant="amber" label="Pending" />
                                )}

                                {!rec.acknowledged && rec.follow_up_required && (
                                  <StatusPill variant="red" label="Follow-up" />
                                )}
                              </div>
                            </td>

                            {/* Date */}
                            <td className="p-3 font-mono text-[11px] text-[var(--text-secondary)]">
                              {rec.acknowledgment_date
                                ? new Date(rec.acknowledgment_date).toLocaleDateString()
                                : '-'}
                            </td>

                            {/* Method */}
                            <td className="p-3">{getMethodBadge(rec.acknowledgment_method)}</td>

                            {/* Actions */}
                            <td className="p-3 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {!rec.acknowledged ? (
                                  <>
                                    <button
                                      onClick={() => handleOpenAckModal(rec)}
                                      className="px-2 py-1 rounded text-xs font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors cursor-pointer border border-blue-200 dark:border-blue-800"
                                      title="Record sign-off on employee's behalf"
                                    >
                                      Record Sign-off
                                    </button>

                                    <button
                                      onClick={() => handleToggleFollowUp(rec)}
                                      className={`p-1 rounded transition-colors cursor-pointer ${
                                        rec.follow_up_required
                                          ? 'text-rose-600 bg-rose-50 dark:bg-rose-950'
                                          : 'text-[var(--text-muted)] hover:text-rose-600 hover:bg-[var(--bg-hover)]'
                                      }`}
                                      title={
                                        rec.follow_up_required
                                          ? 'Clear follow-up flag'
                                          : 'Flag for immediate follow-up outreach'
                                      }
                                    >
                                      <Flag className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleOpenAckModal(rec)}
                                      className="px-2 py-1 rounded text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                                      title="Edit sign-off date or method"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleResetAcknowledgement(rec)}
                                      className="p-1 rounded text-[var(--text-muted)] hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                                      title="Reset status back to Pending"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
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
          ) : (
            <div className="p-12 text-center bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] space-y-3">
              <FileCheck className="w-12 h-12 text-[var(--text-muted)] mx-auto opacity-40" />
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Select a Policy
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                Choose a policy from the list on the left to review employee sign-offs, manage reminders, and export compliance proof sheets.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Create / Edit Policy */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl w-full max-w-md p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  {policyForm.id ? 'Edit Policy' : 'Create New Policy'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePolicy} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Policy Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026 Code of Conduct & Business Ethics"
                  value={policyForm.name}
                  onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-md text-xs bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Version <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. v2.1 or 2026.1"
                    value={policyForm.version}
                    onChange={(e) => setPolicyForm({ ...policyForm, version: e.target.value })}
                    className="w-full px-3 py-2 rounded-md text-xs bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Issue Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={policyForm.issue_date}
                    onChange={(e) => setPolicyForm({ ...policyForm, issue_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-md text-xs bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Link to Document (Milestone 3) */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Link Document (Milestone 3 Repository)
                </label>
                <select
                  value={policyForm.document_id}
                  onChange={(e) => setPolicyForm({ ...policyForm, document_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-md text-xs bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- No linked file --</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.file_name} ({doc.type})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Reuses stored files in the Documents repository via <code className="font-mono">document_id</code> without duplicating storage.
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-3.5 py-1.5 rounded-md text-xs font-medium border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-2xs"
                >
                  {isSubmitting ? 'Saving...' : policyForm.id ? 'Save Changes' : 'Create Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Single Employee Sign-off Record */}
      {ackModalOpen && selectedAckRecord && currentPolicy && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl w-full max-w-md p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Record Policy Acknowledgment
                </h3>
              </div>
              <button
                onClick={() => setAckModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-lg bg-[var(--bg-subtle)] space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Employee:</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {selectedAckRecord.employee_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Policy:</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {currentPolicy.name} ({currentPolicy.version})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Department:</span>
                <span className="text-[var(--text-secondary)]">
                  {selectedAckRecord.department_name}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveAcknowledgement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Acknowledgment Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={ackForm.date}
                  onChange={(e) => setAckForm({ ...ackForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-md text-xs bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Acknowledgment Method <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAckForm({ ...ackForm, method: 'in_app' })}
                    className={`p-2.5 rounded-lg border text-center text-xs font-medium flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      ackForm.method === 'in_app'
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-700 dark:text-sky-300 shadow-2xs font-semibold'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <Laptop className="w-4 h-4" />
                    <span>In-App</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAckForm({ ...ackForm, method: 'email' })}
                    className={`p-2.5 rounded-lg border text-center text-xs font-medium flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      ackForm.method === 'email'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAckForm({ ...ackForm, method: 'paper' })}
                    className={`p-2.5 rounded-lg border text-center text-xs font-medium flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      ackForm.method === 'paper'
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-700 dark:text-amber-300 shadow-2xs font-semibold'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Signed Paper</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAckModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-xs font-medium border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-2xs"
                >
                  {isSubmitting ? 'Confirming...' : 'Save Sign-off'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Batch Acknowledgment Modal */}
      {isBatchModalOpen && currentPolicy && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl w-full max-w-md p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Batch Record Acknowledgments
                </h3>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200">
              Applying sign-off to <strong>{selectedEmpIds.length}</strong> selected employee(s) for policy <strong>{currentPolicy.name} ({currentPolicy.version})</strong>.
            </div>

            <form onSubmit={handleBatchAcknowledge} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Acknowledgment Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={batchForm.date}
                  onChange={(e) => setBatchForm({ ...batchForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-md text-xs bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Acknowledgment Method <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBatchForm({ ...batchForm, method: 'in_app' })}
                    className={`p-2.5 rounded-lg border text-center text-xs font-medium flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      batchForm.method === 'in_app'
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-700 dark:text-sky-300 shadow-2xs font-semibold'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <Laptop className="w-4 h-4" />
                    <span>In-App</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBatchForm({ ...batchForm, method: 'email' })}
                    className={`p-2.5 rounded-lg border text-center text-xs font-medium flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      batchForm.method === 'email'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBatchForm({ ...batchForm, method: 'paper' })}
                    className={`p-2.5 rounded-lg border text-center text-xs font-medium flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      batchForm.method === 'paper'
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-700 dark:text-amber-300 shadow-2xs font-semibold'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Signed Paper</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-xs font-medium border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-2xs"
                >
                  {isSubmitting ? 'Recording...' : `Acknowledge All (${selectedEmpIds.length})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
