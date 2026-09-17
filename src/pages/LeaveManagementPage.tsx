import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { LeaveRequestWithDetails, LeaveType, LeaveBalance, Employee, LeaveAuditLog } from '../types';
import { RequestLeaveModal } from '../components/RequestLeaveModal';
import { EditStatutoryLeaveModal } from '../components/EditStatutoryLeaveModal';
import { AdjustLeaveBalanceModal } from '../components/AdjustLeaveBalanceModal';
import { ExportButton } from '../components/ExportButton';
import { ExportColumn } from '../utils/exportUtils';
import { Card } from '../components/Card';
import { StatusPill } from '../components/StatusPill';
import {
  Palmtree,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Plus,
  Search,
  Filter,
  AlertCircle,
  Edit2,
  Save,
  ChevronRight,
  Sparkles,
  Lock,
  History,
  Sliders,
  ShieldCheck,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  Trash2,
  Loader2,
} from 'lucide-react';

interface LeaveManagementPageProps {
  initialEmployeeId?: string | null;
  onClearInitialEmployee?: () => void;
}

export const LeaveManagementPage: React.FC<LeaveManagementPageProps> = ({
  initialEmployeeId,
  onClearInitialEmployee,
}) => {
  const { authFetch, organization, role, subscribeToRealtime } = useAuth();

  // Active Tab: 'requests' | 'balances' | 'policies' | 'audit'
  const [activeTab, setActiveTab] = useState<'requests' | 'balances' | 'policies' | 'audit'>('requests');

  // Requests state
  const [requests, setRequests] = useState<LeaveRequestWithDetails[]>([]);
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [searchRequests, setSearchRequests] = useState('');

  // Balances state
  const [balances, setBalances] = useState<
    Array<{
      employee: {
        id: string;
        name: string;
        job_title: string;
        department_name: string;
        status: string;
      };
      balances: Array<{
        leave_type_id: string;
        leave_type_name: string;
        total_allocated_days: number;
        used_days: number;
        remaining_days: number;
      }>;
    }>
  >([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [searchBalances, setSearchBalances] = useState('');

  // Policy & Statutory Types state
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [escalationThreshold, setEscalationThreshold] = useState<number>(
    organization?.leave_escalation_threshold_days ?? 3
  );
  const [thresholdSaving, setThresholdSaving] = useState(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<LeaveAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');

  // Modals & Actions
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [modalEmployeeId, setModalEmployeeId] = useState<string | null>(null);
  const [pendingDraftEmployeeId, setPendingDraftEmployeeId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Statutory Leave Edit Modal
  const [isEditStatutoryModalOpen, setIsEditStatutoryModalOpen] = useState(false);
  const [selectedLeaveTypeForEdit, setSelectedLeaveTypeForEdit] = useState<LeaveType | null>(null);

  // Adjust Balance Modal
  const [isAdjustBalanceModalOpen, setIsAdjustBalanceModalOpen] = useState(false);
  const [adjustEmployeeId, setAdjustEmployeeId] = useState<string | null>(null);

  // Handle incoming initialEmployeeId from Attendance
  useEffect(() => {
    if (initialEmployeeId) {
      setModalEmployeeId(initialEmployeeId);
      setPendingDraftEmployeeId(initialEmployeeId);
      setIsRequestModalOpen(true);
    }
  }, [initialEmployeeId]);

  // Fetch Requests
  const fetchRequests = useCallback(async () => {
    try {
      setRequestsLoading(true);
      const res = await authFetch('/api/leave/requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error('Failed to fetch leave requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  }, [authFetch]);

  // Fetch Balances
  const fetchBalances = useCallback(async () => {
    try {
      setBalancesLoading(true);
      const res = await authFetch('/api/leave/balances');
      if (res.ok) {
        const data = await res.json();
        setBalances(data);
      }
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    } finally {
      setBalancesLoading(false);
    }
  }, [authFetch]);

  // Fetch Leave Types
  const fetchLeaveTypes = useCallback(async () => {
    try {
      setTypesLoading(true);
      const res = await authFetch('/api/leave/types');
      if (res.ok) {
        const data = await res.json();
        setLeaveTypes(data);
      }
    } catch (err) {
      console.error('Failed to fetch leave types:', err);
    } finally {
      setTypesLoading(false);
    }
  }, [authFetch]);

  // Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      setAuditLoading(true);
      const res = await authFetch('/api/leave/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch leave audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  }, [authFetch]);

  // Fetch Employees for modal
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

  useEffect(() => {
    fetchRequests();
    fetchLeaveTypes();
    fetchEmployees();
  }, [fetchRequests, fetchLeaveTypes, fetchEmployees]);

  useEffect(() => {
    if (activeTab === 'balances') {
      fetchBalances();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, fetchBalances, fetchAuditLogs]);

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = subscribeToRealtime((payload) => {
      if (
        payload.event === 'leave_request_created' ||
        payload.event === 'leave_request_updated' ||
        payload.event === 'leave_balance_updated' ||
        payload.event === 'leave_type_changed'
      ) {
        fetchRequests();
        fetchLeaveTypes();
        if (activeTab === 'balances') fetchBalances();
        if (activeTab === 'audit') fetchAuditLogs();
      }
    });
    return unsubscribe;
  }, [subscribeToRealtime, activeTab, fetchRequests, fetchBalances, fetchLeaveTypes, fetchAuditLogs]);

  // Approve Request with Automated Deduction
  const handleApprove = async (reqObj: LeaveRequestWithDetails) => {
    try {
      setActionLoadingId(reqObj.id);
      setActionError(null);

      const res = await authFetch(`/api/leave/requests/${reqObj.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision_notes: 'Approved via HR Portal' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || `Failed to approve leave request (${res.status})`);
      }

      setSuccessBanner(
        `Leave request approved for ${reqObj.employee_name}. Automatically deducted ${reqObj.days_requested} ${reqObj.days_requested === 1 ? 'day' : 'days'} from ${reqObj.leave_type_name} balance.`
      );

      // Refresh all dependent lists immediately
      fetchRequests();
      fetchBalances();
      fetchAuditLogs();

      setTimeout(() => {
        setSuccessBanner((prev) => (prev?.includes(reqObj.employee_name) ? null : prev));
      }, 7000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve leave request');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reject Request
  const handleReject = async (requestId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    try {
      setActionLoadingId(requestId);
      setActionError(null);

      const res = await authFetch(`/api/leave/requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejected by HR/Manager' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || `Failed to reject leave request (${res.status})`);
      }

      fetchRequests();
      if (activeTab === 'balances') fetchBalances();
      if (activeTab === 'audit') fetchAuditLogs();
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject leave request');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete Leave Request (mistake correction)
  const handleDelete = async (reqObj: LeaveRequestWithDetails, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const isApproved = reqObj.status === 'approved';

    try {
      setActionLoadingId(reqObj.id);
      setActionError(null);

      // Instant optimistic UI removal
      setRequests((prev) => prev.filter((r) => r.id !== reqObj.id));

      const res = await authFetch(`/api/leave/requests/${reqObj.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to delete leave request');
      }

      setSuccessBanner(
        `Leave request for ${reqObj.employee_name} (${reqObj.leave_type_name}) was deleted successfully.${
          isApproved ? ` Restored ${reqObj.days_requested} days to balance.` : ''
        }`
      );

      fetchRequests();
      if (activeTab === 'balances') fetchBalances();
      if (activeTab === 'audit') fetchAuditLogs();

      setTimeout(() => {
        setSuccessBanner((prev) => (prev?.includes(reqObj.employee_name) ? null : prev));
      }, 6000);
    } catch (err: any) {
      fetchRequests();
      setActionError(err.message || 'Failed to delete leave request');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Update Escalation Threshold
  const handleSaveThreshold = async () => {
    try {
      setThresholdSaving(true);
      const res = await authFetch('/api/organization/policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leave_escalation_threshold_days: Number(escalationThreshold),
        }),
      });

      if (res.ok) {
        fetchRequests();
      }
    } catch (err) {
      console.error('Failed to update escalation policy:', err);
    } finally {
      setThresholdSaving(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    if (requestFilter !== 'all' && r.status !== requestFilter) return false;
    if (!searchRequests) return true;
    const q = searchRequests.toLowerCase();
    return (
      r.employee_name.toLowerCase().includes(q) ||
      r.leave_type_name.toLowerCase().includes(q) ||
      r.department_name.toLowerCase().includes(q)
    );
  });

  // Filter audit logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditActionFilter !== 'all' && log.action !== auditActionFilter) return false;
    if (!auditSearch) return true;
    const q = auditSearch.toLowerCase();
    return (
      log.employee_name?.toLowerCase().includes(q) ||
      log.leave_type_name?.toLowerCase().includes(q) ||
      log.performed_by?.toLowerCase().includes(q) ||
      log.notes?.toLowerCase().includes(q)
    );
  });

  // Filtered Balances
  const filteredBalances = balances.filter((b: any) => {
    if (!searchBalances) return true;
    const q = searchBalances.toLowerCase();
    const empName = b.employee?.name || b.employee_name || '';
    const deptName = b.employee?.department_name || b.department_name || '';
    return empName.toLowerCase().includes(q) || deptName.toLowerCase().includes(q);
  });

  const requestExportColumns: ExportColumn<LeaveRequestWithDetails>[] = [
    { header: 'Employee Name', accessor: (r) => r.employee_name },
    { header: 'Department', accessor: (r) => r.department_name },
    { header: 'Leave Type', accessor: (r) => r.leave_type_name },
    { header: 'Start Date', accessor: (r) => r.start_date },
    { header: 'End Date', accessor: (r) => r.end_date },
    { header: 'Days Requested', accessor: (r) => r.days_requested },
    { header: 'Status', accessor: (r) => r.status.toUpperCase() },
    { header: 'Reason / Notes', accessor: (r) => r.reason || '' },
    { header: 'Date Submitted', accessor: (r) => r.created_at || '' },
  ];

  const balanceExportColumns: ExportColumn<any>[] = [
    { header: 'Employee Name', accessor: (b) => b.employee?.name || b.employee_name || 'Employee' },
    { header: 'Job Title', accessor: (b) => b.employee?.job_title || b.job_title || '' },
    { header: 'Department', accessor: (b) => b.employee?.department_name || b.department_name || 'Unassigned' },
    {
      header: 'Annual Leave (Remaining / Allocated)',
      accessor: (b) => {
        const item = (b.balances || []).find((x: any) => x.leave_type_name?.toLowerCase().includes('annual'));
        return item ? `${item.remaining_days ?? item.balance_days ?? 0} / ${item.total_allocated_days ?? item.allocated_days ?? 0} days` : '—';
      },
    },
    {
      header: 'Sick Leave (Remaining / Allocated)',
      accessor: (b) => {
        const item = (b.balances || []).find((x: any) => x.leave_type_name?.toLowerCase().includes('sick'));
        return item ? `${item.remaining_days ?? item.balance_days ?? 0} / ${item.total_allocated_days ?? item.allocated_days ?? 0} days` : '—';
      },
    },
    {
      header: 'Maternity / Paternity (Remaining / Allocated)',
      accessor: (b) => {
        const item = (b.balances || []).find((x: any) =>
          x.leave_type_name?.toLowerCase().includes('maternity') || x.leave_type_name?.toLowerCase().includes('paternity')
        );
        return item ? `${item.remaining_days ?? item.balance_days ?? 0} / ${item.total_allocated_days ?? item.allocated_days ?? 0} days` : '—';
      },
    },
    {
      header: 'Compassionate Leave (Remaining / Allocated)',
      accessor: (b) => {
        const item = (b.balances || []).find((x: any) => x.leave_type_name?.toLowerCase().includes('compassionate'));
        return item ? `${item.remaining_days ?? item.balance_days ?? 0} / ${item.total_allocated_days ?? item.allocated_days ?? 0} days` : '—';
      },
    },
  ];

  const auditExportColumns: ExportColumn<LeaveAuditLog>[] = [
    { header: 'Employee Name', accessor: (l) => l.employee_name || '' },
    { header: 'Leave Type', accessor: (l) => l.leave_type_name || '' },
    { header: 'Action', accessor: (l) => l.action.toUpperCase() },
    { header: 'Days Changed', accessor: (l) => l.days_changed },
    { header: 'Performed By', accessor: (l) => l.performed_by || '' },
    { header: 'Notes', accessor: (l) => l.notes || '' },
    { header: 'Timestamp', accessor: (l) => l.timestamp || '' },
  ];

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const pendingEmployeeObj = employees.find((e) => e.id === pendingDraftEmployeeId);

  return (
    <div id="leave-management-page" className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Leave Management
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
              Statutory PTO & Automated Balances
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Manage employee time off, statutory entitlement policies, automatic approval deductions, and balance audit trail ({organization?.country} statutory standard)
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <ExportButton
            id="leave-export-btn"
            filename={
              activeTab === 'balances'
                ? 'leave-balances'
                : activeTab === 'audit'
                ? 'leave-audit-ledger'
                : 'leave-requests'
            }
            columns={
              (activeTab === 'balances'
                ? balanceExportColumns
                : activeTab === 'audit'
                ? auditExportColumns
                : requestExportColumns) as ExportColumn<any>[]
            }
            data={
              (activeTab === 'balances'
                ? filteredBalances
                : activeTab === 'audit'
                ? filteredAuditLogs
                : filteredRequests) as any[]
            }
            sheetName={
              activeTab === 'balances'
                ? 'Leave Balances'
                : activeTab === 'audit'
                ? 'Audit Log'
                : 'Leave Requests'
            }
            label="Export"
          />

          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Submit Leave Request</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-start justify-between gap-3 shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Pending Draft / Incomplete Leave Request Banner */}
      {pendingEmployeeObj && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Incomplete Leave Request · Pending Details
                </span>
                <StatusPill variant="amber" label="Ready for Completion" />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Initiated from Attendance for <strong className="text-[var(--text-primary)]">{pendingEmployeeObj.name}</strong> ({pendingEmployeeObj.job_title}). Please complete the leave form (select type, dates, and reason) to finalize.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setModalEmployeeId(pendingEmployeeObj.id);
                setIsRequestModalOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-all cursor-pointer shadow-xs"
            >
              Complete Leave Form
            </button>
            <button
              onClick={() => {
                setPendingDraftEmployeeId(null);
                setModalEmployeeId(null);
                onClearInitialEmployee?.();
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] w-fit flex-wrap">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'requests'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <span>Leave Requests & Approvals</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('balances')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'balances'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Leave Balances Directory
        </button>

        <button
          onClick={() => setActiveTab('policies')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'policies'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Policy & Statutory Entitlements
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit Ledger & Deductions</span>
        </button>
      </div>

      {/* TAB 1: Leave Requests & Approvals */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Controls bar */}
          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xs">
            {/* Filter pills */}
            <div className="flex items-center gap-1.5">
              {(['pending', 'all', 'approved', 'rejected'] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setRequestFilter(filterKey)}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer capitalize ${
                    requestFilter === filterKey
                      ? 'bg-[var(--text-primary)] text-[var(--text-inverse)]'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {filterKey}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchRequests}
                onChange={(e) => setSearchRequests(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] w-48"
              />
            </div>
          </div>

          {/* Table of Requests */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 text-[var(--text-muted)] font-semibold">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Dates & Duration</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status & Escalation</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {requestsLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-[var(--text-muted)]">
                        Loading leave requests...
                      </td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-[var(--text-muted)]">
                        No leave requests found for this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => {
                      const threshold = organization?.leave_escalation_threshold_days ?? 3;
                      const isEscalated = req.escalated_to_head || req.days_requested > threshold;
                      const isAnalystForbidden = role === 'hr_analyst' && isEscalated;

                      return (
                        <tr key={req.id} className="hover:bg-[var(--bg-subtle)]/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[var(--text-primary)]">{req.employee_name}</div>
                            <div className="text-[11px] text-[var(--text-secondary)]">{req.department_name}</div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] font-medium text-[11px]">
                              {req.leave_type_name}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-[var(--text-primary)]">
                              {req.days_requested} {req.days_requested === 1 ? 'day' : 'days'}
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                              <span>{req.start_date}</span>
                              <span>→</span>
                              <span>{req.end_date}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 max-w-xs truncate text-[var(--text-secondary)]">
                            {req.reason || '—'}
                          </td>

                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <StatusPill
                                variant={
                                  req.status === 'approved'
                                    ? 'green'
                                    : req.status === 'rejected'
                                    ? 'red'
                                    : 'amber'
                                }
                                label={
                                  req.status === 'approved'
                                    ? 'Approved · Deducted'
                                    : req.status === 'rejected'
                                    ? 'Rejected'
                                    : 'Pending Approval'
                                }
                              />

                              {isEscalated && req.status === 'pending' && (
                                <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                                  <Clock className="w-3 h-3" />
                                  <span>Escalated to HR Head (&gt;{threshold}d)</span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            {req.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Approve button with automatic deduction */}
                                {isAnalystForbidden ? (
                                  <div
                                    title="Requests exceeding 3 days require HR Head approval per policy"
                                    className="px-2.5 py-1 text-[11px] rounded-md bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)] flex items-center gap-1 cursor-not-allowed"
                                  >
                                    <Lock className="w-3 h-3" />
                                    <span>HR Head Only</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleApprove(req)}
                                    disabled={actionLoadingId === req.id}
                                    title="Approve request and automatically deduct days from leave balance"
                                    className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-2xs"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Approve & Deduct</span>
                                  </button>
                                )}

                                {/* Reject button */}
                                <button
                                  type="button"
                                  onClick={(e) => handleReject(req.id, e)}
                                  disabled={actionLoadingId === req.id}
                                  className="px-2.5 py-1 text-[11px] font-medium rounded-md text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span>Reject</span>
                                </button>

                                {/* Delete button */}
                                <button
                                  type="button"
                                  onClick={(e) => handleDelete(req, e)}
                                  disabled={actionLoadingId === req.id}
                                  title="Delete leave request"
                                  aria-label={`Delete leave request for ${req.employee_name}`}
                                  className="p-1.5 text-xs font-medium rounded-md text-[var(--text-muted)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/15 border border-transparent hover:border-red-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                  {actionLoadingId === req.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-[11px] text-[var(--text-muted)]">
                                  {req.approved_by ? `By ${req.approved_by}` : 'Processed'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleDelete(req, e)}
                                  disabled={actionLoadingId === req.id}
                                  title="Delete leave request (restores balance if approved)"
                                  aria-label={`Delete leave request for ${req.employee_name}`}
                                  className="p-1.5 text-xs font-medium rounded-md text-[var(--text-muted)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/15 border border-transparent hover:border-red-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                  {actionLoadingId === req.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            )}
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
      )}

      {/* TAB 2: Leave Balances Directory */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-xs">
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)]">Employee Leave Balance Records</div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Real-time statutory balance tracking. Deductions apply automatically upon leave request approval.
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search balances..."
                  value={searchBalances}
                  onChange={(e) => setSearchBalances(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] w-48"
                />
              </div>

              {(role === 'hr_head' || role === 'hr_analyst') && (
                <button
                  onClick={() => {
                    setAdjustEmployeeId(null);
                    setIsAdjustBalanceModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Adjust Balance</span>
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 text-[var(--text-muted)] font-semibold">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Annual Leave</th>
                    <th className="py-3 px-4">Sick Leave</th>
                    <th className="py-3 px-4">Maternity / Paternity</th>
                    <th className="py-3 px-4">Compassionate</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {balancesLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-[var(--text-muted)]">
                        Loading balances...
                      </td>
                    </tr>
                  ) : balances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-[var(--text-muted)]">
                        No employee balances available.
                      </td>
                    </tr>
                  ) : (
                    balances
                      .filter((b: any) => {
                        if (!searchBalances) return true;
                        const q = searchBalances.toLowerCase();
                        const empName = b.employee?.name || b.employee_name || '';
                        const deptName = b.employee?.department_name || b.department_name || '';
                        return empName.toLowerCase().includes(q) || deptName.toLowerCase().includes(q);
                      })
                      .map((b: any) => {
                        const empId = b.employee?.id || b.employee_id || '';
                        const empName = b.employee?.name || b.employee_name || 'Employee';
                        const empJob = b.employee?.job_title || b.job_title || '';
                        const empDept = b.employee?.department_name || b.department_name || 'Unassigned';
                        const bList = b.balances || [];

                        const renderLeavePill = (pattern: string, colorClass: string) => {
                          const item = bList.find((x: any) => x.leave_type_name?.toLowerCase().includes(pattern));
                          if (!item) return <span className="text-[var(--text-muted)]">—</span>;

                          const rem = item.remaining_days ?? item.balance_days ?? 0;
                          const alloc = item.total_allocated_days ?? item.allocated_days ?? 0;
                          const used = item.used_days ?? 0;
                          const isNegative = rem < 0;

                          return (
                            <div>
                              <span
                                className={`font-bold ${
                                  isNegative
                                    ? 'text-red-600 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded'
                                    : colorClass
                                }`}
                              >
                                {rem} {isNegative ? '(deficit)' : 'days'}
                              </span>
                              <span className="text-[11px] text-[var(--text-muted)]">
                                {' '}
                                / {alloc}d ({used} used)
                              </span>
                            </div>
                          );
                        };

                        return (
                          <tr key={empId} className="hover:bg-[var(--bg-subtle)]/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-[var(--text-primary)]">{empName}</div>
                              <div className="text-[11px] text-[var(--text-secondary)]">{empJob}</div>
                            </td>

                            <td className="py-3 px-4 text-[var(--text-secondary)]">{empDept}</td>

                            <td className="py-3 px-4">{renderLeavePill('annual', 'text-emerald-600 dark:text-emerald-400')}</td>
                            <td className="py-3 px-4">{renderLeavePill('sick', 'text-blue-600 dark:text-blue-400')}</td>
                            <td className="py-3 px-4">{renderLeavePill('maternity', 'text-purple-600 dark:text-purple-400')}</td>
                            <td className="py-3 px-4">{renderLeavePill('compassionate', 'text-amber-600 dark:text-amber-400')}</td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setAdjustEmployeeId(empId);
                                    setIsAdjustBalanceModalOpen(true);
                                  }}
                                  className="px-2 py-1 text-[11px] font-medium rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                                >
                                  Adjust
                                </button>
                                <button
                                  onClick={() => {
                                    setAuditSearch(empName);
                                    setActiveTab('audit');
                                  }}
                                  className="px-2 py-1 text-[11px] font-medium rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                                >
                                  Ledger
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
      )}

      {/* TAB 3: Policy & Statutory Entitlements */}
      {activeTab === 'policies' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Statutory Leave Types */}
          <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Statutory Leave Entitlements</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Standard baseline allocations automatically credited to employees
                </p>
              </div>
              {role === 'hr_head' && (
                <button
                  onClick={() => {
                    setSelectedLeaveTypeForEdit(null);
                    setIsEditStatutoryModalOpen(true);
                  }}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Type</span>
                </button>
              )}
            </div>

            <div className="divide-y divide-[var(--border-subtle)]">
              {leaveTypes.map((lt) => (
                <div key={lt.id} className="py-3.5 flex items-start justify-between gap-4 text-xs group">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text-primary)] text-sm">{lt.name}</span>
                      <StatusPill
                        variant={lt.paid !== false ? 'green' : 'amber'}
                        label={lt.paid !== false ? 'Paid' : 'Unpaid'}
                      />
                    </div>
                    {lt.description && (
                      <p className="text-[11px] text-[var(--text-muted)] max-w-sm line-clamp-2">{lt.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-bold text-sm text-[var(--text-primary)]">
                        {lt.default_entitlement_days} <span className="text-xs font-normal text-[var(--text-secondary)]">days/yr</span>
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">Statutory standard</div>
                    </div>

                    {role === 'hr_head' && (
                      <button
                        onClick={() => {
                          setSelectedLeaveTypeForEdit(lt);
                          setIsEditStatutoryModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                        title="Edit Statutory Entitlement & Sync to active employees"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leave Escalation Policy Setting (Strict RBAC) */}
          <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Approval Escalation Policy</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Duration threshold triggering mandatory HR Head sign-off
                </p>
              </div>
              {role !== 'hr_head' && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-medium border border-amber-500/20">
                  <Lock className="w-3 h-3" />
                  <span>HR Head Only</span>
                </div>
              )}
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-[var(--text-secondary)]">
                Leave requests exceeding this duration cannot be approved by HR Analysts and will be automatically
                escalated to the HR Head in accordance with company policy.
              </p>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Escalation Threshold (Days)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    disabled={role !== 'hr_head'}
                    value={escalationThreshold}
                    onChange={(e) => setEscalationThreshold(Number(e.target.value))}
                    className="w-28 px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] disabled:opacity-50"
                  />
                  <span className="text-xs text-[var(--text-secondary)]">consecutive working days</span>

                  {role === 'hr_head' && (
                    <button
                      onClick={handleSaveThreshold}
                      disabled={thresholdSaving}
                      className="px-3.5 py-2 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {thresholdSaving ? 'Saving...' : 'Save Policy'}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Requests ≤ <strong>{escalationThreshold} days</strong> can be approved by either HR Analysts or the
                  HR Head. Requests &gt; <strong>{escalationThreshold} days</strong> require HR Head authorization.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Audit Ledger & Deductions */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-xs">
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)]">Leave Deduction & Audit Trail</div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Permanent ledger recording automatic approval deductions, statutory modifications, and balance adjustments.
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Action Filter */}
              <div className="flex items-center gap-1">
                {(['all', 'deduction', 'allocation_adjustment', 'statutory_update'] as const).map((act) => (
                  <button
                    key={act}
                    onClick={() => setAuditActionFilter(act)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                      auditActionFilter === act
                        ? 'bg-[var(--text-primary)] text-[var(--text-inverse)]'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {act === 'all'
                      ? 'All Logs'
                      : act === 'deduction'
                      ? 'Deductions'
                      : act === 'allocation_adjustment'
                      ? 'Adjustments'
                      : 'Statutory'}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search ledger..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] w-48"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 text-[var(--text-muted)] font-semibold">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Impact</th>
                    <th className="py-3 px-4">Balance Transition</th>
                    <th className="py-3 px-4">Authorized By</th>
                    <th className="py-3 px-4">Audit Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {auditLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-[var(--text-muted)]">
                        Loading audit logs...
                      </td>
                    </tr>
                  ) : filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-[var(--text-muted)]">
                        No leave deduction or audit records found.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => {
                      const isDeduction = log.days_changed < 0;

                      return (
                        <tr key={log.id} className="hover:bg-[var(--bg-subtle)]/40 transition-colors">
                          <td className="py-3 px-4 text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>

                          <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                            {log.employee_name}
                          </td>

                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] font-medium text-[11px]">
                              {log.leave_type_name}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <StatusPill
                              variant={
                                log.action === 'deduction'
                                  ? 'amber'
                                  : log.action === 'statutory_update'
                                  ? 'green'
                                  : 'gray'
                              }
                              label={
                                log.action === 'deduction'
                                  ? 'Approval Deduction'
                                  : log.action === 'statutory_update'
                                  ? 'Statutory Update'
                                  : 'Manual Adjustment'
                              }
                            />
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`font-bold flex items-center gap-1 ${
                                isDeduction
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {isDeduction ? (
                                <TrendingDown className="w-3.5 h-3.5" />
                              ) : (
                                <TrendingUp className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {log.days_changed > 0 ? `+${log.days_changed}` : log.days_changed} days
                              </span>
                            </span>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-[var(--text-muted)]">{log.previous_balance}d</span>
                              <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
                              <span
                                className={`font-bold ${
                                  log.new_balance < 0 ? 'text-red-500' : 'text-[var(--text-primary)]'
                                }`}
                              >
                                {log.new_balance}d {log.new_balance < 0 ? '(deficit)' : ''}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-[11px] text-[var(--text-secondary)] whitespace-nowrap">
                            {log.performed_by}
                          </td>

                          <td className="py-3 px-4 text-[var(--text-secondary)] max-w-xs truncate">
                            {log.notes || '—'}
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
      )}

      {/* Modals */}
      {isRequestModalOpen && (
        <RequestLeaveModal
          isOpen={isRequestModalOpen}
          onClose={() => {
            setIsRequestModalOpen(false);
          }}
          employees={employees}
          leaveTypes={leaveTypes}
          preselectedEmployeeId={modalEmployeeId}
          onRequestSubmitted={() => {
            setPendingDraftEmployeeId(null);
            setModalEmployeeId(null);
            onClearInitialEmployee?.();
            fetchRequests();
            if (activeTab === 'balances') fetchBalances();
            if (activeTab === 'audit') fetchAuditLogs();
          }}
        />
      )}

      {isEditStatutoryModalOpen && (
        <EditStatutoryLeaveModal
          isOpen={isEditStatutoryModalOpen}
          onClose={() => {
            setIsEditStatutoryModalOpen(false);
            setSelectedLeaveTypeForEdit(null);
          }}
          leaveType={selectedLeaveTypeForEdit}
          onSaved={() => {
            fetchLeaveTypes();
            fetchBalances();
            fetchAuditLogs();
            setSuccessBanner('Statutory leave entitlement updated successfully.');
            setTimeout(() => setSuccessBanner(null), 5000);
          }}
        />
      )}

      {isAdjustBalanceModalOpen && (
        <AdjustLeaveBalanceModal
          isOpen={isAdjustBalanceModalOpen}
          onClose={() => {
            setIsAdjustBalanceModalOpen(false);
            setAdjustEmployeeId(null);
          }}
          employees={employees}
          leaveTypes={leaveTypes}
          initialEmployeeId={adjustEmployeeId}
          onAdjusted={() => {
            fetchBalances();
            fetchAuditLogs();
            setSuccessBanner('Employee leave balance adjusted and logged in audit ledger.');
            setTimeout(() => setSuccessBanner(null), 5000);
          }}
        />
      )}
    </div>
  );
};
