import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  EmployeeWithDetails,
  Employee,
  Department,
  OnboardingTask,
  AttendanceStatus,
  LeaveType,
  LeaveRequestWithDetails,
  OffboardingRecord,
  EmployeeAttritionAnalysis,
  JobHistory,
  JobChangeReason,
  PerformanceReview,
  PDPGoal,
} from '../types';
import { StatusPill } from '../components/StatusPill';
import { EditEmployeeModal } from '../components/EditEmployeeModal';
import { EditCompensationModal } from '../components/EditCompensationModal';
import { StartOffboardingModal } from '../components/StartOffboardingModal';
import { RequestLeaveModal } from '../components/RequestLeaveModal';
import { JobHistoryBlock } from '../components/JobHistoryBlock';
import { ReassignEmployeeModal } from '../components/ReassignEmployeeModal';
import { PerformanceBlock } from '../components/PerformanceBlock';
import { ProbationBlock } from '../components/ProbationBlock';
import {
  ArrowLeft,
  Building,
  Calendar,
  Globe,
  Briefcase,
  DollarSign,
  Lock,
  Edit2,
  Trash2,
  Clock,
  FileText,
  Palmtree,
  ShieldAlert,
  Sparkles,
  AlertCircle,
  Check,
  CheckCircle2,
  Circle,
  Plus,
  UserX,
  ShieldCheck,
  CreditCard,
  Phone,
  BookOpen,
  Upload,
  UserCheck,
  Network,
  ChevronRight,
  ExternalLink,
  GitBranch,
} from 'lucide-react';

interface EmployeeProfilePageProps {
  employeeId: string;
  departments: Department[];
  onBack: () => void;
  onNavigateToDocuments?: () => void;
  onNavigateToConduct?: (employeeId: string) => void;
}

export const EmployeeProfilePage: React.FC<EmployeeProfilePageProps> = ({
  employeeId,
  departments,
  onBack,
  onNavigateToDocuments,
  onNavigateToConduct,
}) => {
  const { authFetch, role, organization, subscribeToRealtime } = useAuth();
  const [employee, setEmployee] = useState<EmployeeWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Milestone 2 Specific Live State
  const [onboardingTasks, setOnboardingTasks] = useState<OnboardingTask[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestWithDetails[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [offboardingRecord, setOffboardingRecord] = useState<OffboardingRecord | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<{
    present: number;
    late: number;
    absent: number;
    on_leave: number;
    total: number;
  }>({ present: 0, late: 0, absent: 0, on_leave: 0, total: 0 });
  const [attritionDetails, setAttritionDetails] = useState<EmployeeAttritionAnalysis | null>(null);

  // Milestone 6 State
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [promotionPrompt, setPromotionPrompt] = useState<{
    isOpen: boolean;
    reason: JobChangeReason;
  } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCompensationModalOpen, setIsCompensationModalOpen] = useState(false);
  const [isOffboardingModalOpen, setIsOffboardingModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [settlementLoading, setSettlementLoading] = useState(false);

  // Milestone 17 Performance State
  const [performanceReviews, setPerformanceReviews] = useState<PerformanceReview[]>([]);
  const [pdpGoals, setPdpGoals] = useState<PDPGoal[]>([]);

  // Fetch core employee data
  const fetchEmployeeData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [empRes, allEmpsRes] = await Promise.all([
        authFetch(`/api/employees/${employeeId}`),
        authFetch('/api/employees'),
      ]);

      if (!empRes.ok) {
        if (empRes.status === 404) throw new Error('Employee record not found in this workspace.');
        throw new Error('Failed to load employee details.');
      }
      const data = await empRes.json();
      setEmployee(data);

      if (allEmpsRes.ok) {
        const empsData = await allEmpsRes.json();
        setAllEmployees(empsData || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch, employeeId]);

  // Fetch Milestone 2 related data
  const fetchMilestone2Data = useCallback(async () => {
    if (!employeeId) return;
    try {
      // 1. Onboarding Tasks
      const onbRes = await authFetch(`/api/onboarding/${employeeId}`);
      if (onbRes.ok) {
        const onbData = await onbRes.json();
        setOnboardingTasks(onbData.tasks || []);
      }

      // 2. Leave Balances & Requests
      const balRes = await authFetch(`/api/leave/balances/${employeeId}`);
      if (balRes.ok) {
        const balData = await balRes.json();
        setLeaveBalances(balData.balances || []);
      }

      const reqRes = await authFetch('/api/leave/requests');
      if (reqRes.ok) {
        const allReqs = await reqRes.json();
        setLeaveRequests(allReqs.filter((r: any) => r.employee_id === employeeId));
      }

      const ltRes = await authFetch('/api/leave/types');
      if (ltRes.ok) {
        setLeaveTypes(await ltRes.json());
      }

      // 3. Offboarding Record
      const offRes = await authFetch(`/api/offboarding/${employeeId}`);
      if (offRes.ok) {
        const offData = await offRes.json();
        setOffboardingRecord(offData);
      } else {
        setOffboardingRecord(null);
      }

      // 4. Monthly Attendance stats
      const now = new Date();
      const attRes = await authFetch(`/api/attendance/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
      if (attRes.ok) {
        const attData = await attRes.json();
        const found = (attData.summaries || []).find((s: any) => s.employee_id === employeeId);
        if (found) {
          setAttendanceSummary({
            present: found.present_days,
            late: found.late_days,
            absent: found.absent_days,
            on_leave: found.on_leave_days,
            total: found.total_recorded,
          });
        }
      }

      // 5. Attrition Diagnostic Analysis
      const attScoreRes = await authFetch('/api/attrition-score/analysis');
      if (attScoreRes.ok) {
        const scoreData = await attScoreRes.json();
        const myScore = (scoreData.scores || []).find((s: any) => s.employee_id === employeeId);
        if (myScore) {
          setAttritionDetails(myScore);
        }
      }
    } catch (err) {
      console.error('Failed to fetch M2 data:', err);
    }
  }, [authFetch, employeeId]);

  // Fetch Milestone 17 Performance Data
  const fetchPerformanceData = useCallback(async () => {
    if (!employeeId) return;
    try {
      const res = await authFetch(`/api/employees/${employeeId}/performance`);
      if (res.ok) {
        const data = await res.json();
        setPerformanceReviews(data.reviews || []);
        setPdpGoals(data.pdp_goals || []);
      }
    } catch (err) {
      console.error('Failed to load performance data', err);
    }
  }, [authFetch, employeeId]);

  useEffect(() => {
    fetchEmployeeData();
    fetchMilestone2Data();
    fetchPerformanceData();
  }, [fetchEmployeeData, fetchMilestone2Data, fetchPerformanceData]);

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = subscribeToRealtime((payload) => {
      fetchEmployeeData();
      fetchMilestone2Data();
      fetchPerformanceData();
    });
    return unsubscribe;
  }, [subscribeToRealtime, fetchEmployeeData, fetchMilestone2Data, fetchPerformanceData]);

  // Toggle Onboarding task
  const handleToggleTask = async (task: OnboardingTask) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    // Optimistic update
    setOnboardingTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await authFetch(`/api/onboarding/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchMilestone2Data();
      } else {
        // Revert on error
        setOnboardingTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
        );
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
      // Revert on error
      setOnboardingTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
    }
  };

  // Toggle Offboarding task step
  const handleToggleOffboardingTask = async (taskItem: any, index: number) => {
    if (!offboardingRecord) return;
    try {
      const isCompleted = taskItem.status === 'completed' || taskItem.completed === true;
      const newStatus = isCompleted ? 'pending' : 'completed';
      
      if (taskItem.id) {
        const res = await authFetch(`/api/offboarding/tasks/${taskItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
          fetchMilestone2Data();
        }
      } else {
        const updatedTasks = (offboardingRecord.tasks || []).map((t: any, idx: number) =>
          idx === index
            ? {
                ...t,
                completed: !isCompleted,
                status: newStatus,
                completed_at: !isCompleted ? new Date().toISOString() : undefined,
                completed_by: !isCompleted ? (role === 'hr_head' ? 'HR Head' : 'HR Analyst') : undefined,
              }
            : t
        );

        const res = await authFetch(`/api/offboarding/${offboardingRecord.id}/tasks`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks: updatedTasks }),
        });

        if (res.ok) {
          fetchMilestone2Data();
        }
      }
    } catch (err) {
      console.error('Failed to toggle offboarding task:', err);
    }
  };

  // Approve Final Settlement & Close Record (HR Head Only)
  const handleApproveSettlement = async () => {
    if (!offboardingRecord) return;
    if (role !== 'hr_head') {
      alert('Only HR Head can approve final settlement.');
      return;
    }

    try {
      setSettlementLoading(true);
      setActionError(null);
      const res = await authFetch(`/api/offboarding/${offboardingRecord.id}/approve-settlement`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve settlement');
      }

      fetchEmployeeData();
      fetchMilestone2Data();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSettlementLoading(false);
    }
  };

  // Delete employee (HR Head only)
  const handleDeleteEmployee = async () => {
    if (!employee) return;
    if (!confirm(`Are you sure you want to delete ${employee.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleteLoading(true);
      setActionError(null);
      const res = await authFetch(`/api/employees/${employee.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete employee record');
      }

      onBack();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatEmploymentType = (type?: string) => {
    switch (type) {
      case 'full_time':
        return 'Full-time';
      case 'part_time':
        return 'Part-time';
      case 'contract':
        return 'Contract';
      case 'intern':
        return 'Intern';
      default:
        return type || 'Full-time';
    }
  };

  const formatCurrency = (val?: number, curr?: string) => {
    if (val == null) return 'Not set';
    return `${curr || 'GHS'} ${val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (loading) {
    return (
      <div className="p-12 max-w-4xl mx-auto text-center text-xs text-[var(--text-secondary)]">
        Loading employee profile...
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <button
          onClick={onBack}
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Directory</span>
        </button>
        <div className="p-6 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error || 'Employee not found'}</span>
        </div>
      </div>
    );
  }

  const completedOnboardingCount = onboardingTasks.filter((t) => t.status === 'completed').length;
  const onboardingPct =
    onboardingTasks.length > 0 ? Math.round((completedOnboardingCount / onboardingTasks.length) * 100) : 0;

  return (
    <div id="employee-profile-page" className="p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <button
          id="profile-back-btn"
          onClick={onBack}
          className="px-2.5 py-1.5 -ml-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Employee Directory</span>
        </button>

        <div className="flex items-center gap-2">
          {role === 'hr_head' && onNavigateToConduct && (
            <button
              id="profile-conduct-tracker-btn"
              onClick={() => onNavigateToConduct(employee.id)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Open confidential Disciplinary Conduct Tracker filtered for this employee (HR Head only)"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              <span>Conduct Tracker</span>
            </button>
          )}

          {role === 'hr_head' ? (
            <button
              id="profile-reassign-btn"
              onClick={() => setIsReassignModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent-blue)] text-white hover:opacity-90 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Reassign / Promote</span>
            </button>
          ) : (
            <div
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-muted)] flex items-center gap-1.5 cursor-not-allowed"
              title="Only HR Head can reassign or promote employees"
            >
              <Lock className="w-3 h-3" />
              <span>Reassignment (HR Head only)</span>
            </div>
          )}

          <button
            id="profile-edit-btn"
            onClick={() => setIsEditModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>Edit Profile</span>
          </button>

          {role === 'hr_head' && (
            <button
              id="profile-delete-btn"
              onClick={handleDeleteEmployee}
              disabled={deleteLoading}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Delete employee (HR Head only)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{deleteLoading ? 'Deleting...' : 'Delete'}</span>
            </button>
          )}
        </div>
      </div>

      {successToast && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-xs hover:opacity-75 font-medium cursor-pointer"
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

      {/* Notion Page Cover & Title Header */}
      <div className="space-y-4 pt-2">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 flex items-center justify-center font-bold text-2xl shrink-0 shadow-xs">
            {employee.name.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight truncate">
              {employee.name}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {employee.job_title} · {employee.department_name}
            </p>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <StatusPill status={employee.status} size="sm" />
              <StatusPill risk={employee.attrition_risk} size="sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Stacked Notion Blocks */}
      <div className="space-y-6 pt-2">
        {/* Block 1: Employment Overview */}
        <div
          id="block-overview"
          className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Employment Overview</h3>
            <span className="text-[11px] text-[var(--text-muted)]">Core Record</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 text-xs">
            <div>
              <div className="text-[var(--text-muted)] font-medium mb-1">Department</div>
              <div className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span>{employee.department_name}</span>
              </div>
            </div>

            <div>
              <div className="text-[var(--text-muted)] font-medium mb-1">Employment Type</div>
              <div className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span>{formatEmploymentType(employee.employment_type)}</span>
              </div>
            </div>

            <div>
              <div className="text-[var(--text-muted)] font-medium mb-1">Country / Location</div>
              <div className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span>{employee.country}</span>
              </div>
            </div>

            <div>
              <div className="text-[var(--text-muted)] font-medium mb-1">Start Date</div>
              <div className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span>{employee.start_date}</span>
              </div>
            </div>

            <div>
              <div className="text-[var(--text-muted)] font-medium mb-1">Status</div>
              <StatusPill status={employee.status} size="sm" />
            </div>

            <div>
              <div className="text-[var(--text-muted)] font-medium mb-1">Attrition Risk</div>
              <StatusPill risk={employee.attrition_risk} size="sm" />
            </div>

            <div>
              <div className="text-[var(--text-muted)] font-medium mb-1">Reporting Manager</div>
              <div className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span>{employee.manager_name || 'None (Executive / Top Level)'}</span>
              </div>
            </div>

            <div>
              <div className="text-[var(--text-muted)] font-medium mb-1">Direct Reports</div>
              <div className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span>{employee.direct_reports_count || 0} direct reports</span>
              </div>
            </div>
          </div>
        </div>

        {/* Block 2: Job History & Role Progression (Milestone 6) */}
        <JobHistoryBlock
          history={employee.job_history || []}
          employee={employee}
          canReassign={role === 'hr_head'}
          onOpenReassign={() => setIsReassignModalOpen(true)}
        />

        {/* Block 3: Compensation Block (Strict RBAC & RLS Enforcement) */}
        <div
          id="block-compensation"
          className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs space-y-4 relative overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Compensation & Payroll</h3>
            </div>
            {role === 'hr_head' ? (
              <button
                id="edit-compensation-trigger-btn"
                onClick={() => setIsCompensationModalOpen(true)}
                className="px-2.5 py-1 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3 h-3 text-[var(--text-secondary)]" />
                <span>{employee.compensation ? 'Edit Compensation' : 'Set Compensation'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-medium border border-amber-500/20">
                <Lock className="w-3 h-3" />
                <span>Restricted to HR Head</span>
              </div>
            )}
          </div>

          {/* If HR Head: Full view */}
          {role === 'hr_head' ? (
            <div className="space-y-4">
              {employee.compensation ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                    <div className="text-[var(--text-muted)] mb-1">Monthly Base Salary</div>
                    <div className="text-base font-bold text-[var(--text-primary)]">
                      {formatCurrency(employee.compensation.salary, employee.compensation.currency)}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                    <div className="text-[var(--text-muted)] mb-1">Base Currency</div>
                    <div className="text-base font-semibold text-[var(--text-primary)]">
                      {employee.compensation.currency}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                    <div className="text-[var(--text-muted)] mb-1">Effective Date</div>
                    <div className="text-base font-semibold text-[var(--text-primary)]">
                      {employee.compensation.effective_date}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-[var(--border-strong)] rounded-lg space-y-2">
                  <div className="text-xs text-[var(--text-secondary)]">No compensation record set yet.</div>
                  <button
                    onClick={() => setIsCompensationModalOpen(true)}
                    className="text-xs font-medium text-[var(--accent-blue)] hover:underline cursor-pointer"
                  >
                    + Add salary and currency details
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* If HR Analyst: Visibly present but locked/blurred with explicit badge per spec */
            <div
              id="hr-analyst-compensation-locked"
              className="relative p-6 rounded-lg bg-[var(--bg-subtle)] border border-amber-500/20"
            >
              <div className="filter blur-sm select-none opacity-40 pointer-events-none grid grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-white dark:bg-stone-900 rounded border">
                  <div>Monthly Salary</div>
                  <div className="text-lg font-bold">GHS 28,500.00</div>
                </div>
                <div className="p-3 bg-white dark:bg-stone-900 rounded border">
                  <div>Currency</div>
                  <div className="text-lg font-bold">GHS</div>
                </div>
                <div className="p-3 bg-white dark:bg-stone-900 rounded border">
                  <div>Effective Date</div>
                  <div className="text-lg font-bold">2024-01-01</div>
                </div>
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-[var(--bg-surface)]/80 backdrop-blur-xs rounded-lg">
                <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">Restricted to HR Head</div>
                <div className="text-[11px] text-[var(--text-secondary)] max-w-sm mt-0.5">
                  HR Analyst role cannot view compensation data. This policy is enforced at the database level via Postgres RLS.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Milestone 17: Performance Management Block */}
        <PerformanceBlock
          employeeId={employee.id}
          employeeName={`${employee.first_name} ${employee.last_name}`}
          role={role}
          reviews={performanceReviews}
          pdpGoals={pdpGoals}
          onRefresh={fetchPerformanceData}
          authFetch={authFetch}
        />

        {/* Milestone 18: Probation & Confirmation Management Block */}
        <ProbationBlock
          employeeId={employee.id}
          employeeName={`${employee.first_name} ${employee.last_name}`}
          employeeStatus={employee.status}
          role={role}
          authFetch={authFetch}
          onRefreshEmployee={() => {
            fetchEmployeeData();
            fetchMilestone2Data();
          }}
        />

        {/* Block 3: Live Onboarding Checklist Block */}
        <div
          id="block-onboarding"
          className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Onboarding Compliance Checklist</h3>
            </div>
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {onboardingPct}% ({completedOnboardingCount}/{onboardingTasks.length} Done)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                onboardingPct === 100 ? 'bg-emerald-500' : 'bg-purple-500'
              }`}
              style={{ width: `${onboardingPct}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {onboardingTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => handleToggleTask(t)}
                className="p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer flex items-start gap-2.5 group"
              >
                <div className="mt-0.5 shrink-0">
                  {t.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-[var(--border-strong)] group-hover:text-[var(--text-primary)]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`font-medium ${
                      t.status === 'completed'
                        ? 'line-through text-[var(--text-muted)]'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {t.task}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] capitalize">
                    {t.category.replace('_', ' ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Block 4: Live Attendance & Work Hours Block */}
        <div
          id="block-attendance"
          className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Attendance & Work Hours (Current Month)
              </h3>
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">Live Tracking</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
              <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">Present</div>
              <div className="text-lg font-bold text-[var(--text-primary)]">{attendanceSummary.present} days</div>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
              <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">Late</div>
              <div className="text-lg font-bold text-[var(--text-primary)]">{attendanceSummary.late} days</div>
            </div>

            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
              <div className="text-[11px] text-red-700 dark:text-red-300 font-medium">Absent</div>
              <div className="text-lg font-bold text-[var(--text-primary)]">{attendanceSummary.absent} days</div>
            </div>

            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
              <div className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">On Leave</div>
              <div className="text-lg font-bold text-[var(--text-primary)]">{attendanceSummary.on_leave} days</div>
            </div>
          </div>
        </div>

        {/* Block 5: Live Leave Records & Balances Block */}
        <div
          id="block-leave"
          className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <Palmtree className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Leave Balances & Requests</h3>
            </div>
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="px-2.5 py-1 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3 text-[var(--text-secondary)]" />
              <span>Request Leave</span>
            </button>
          </div>

          {/* Statutory Balances Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {leaveBalances.map((b) => {
              const isNegative = b.remaining_days < 0;
              return (
                <div key={b.leave_type_id} className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                  <div className="text-[11px] text-[var(--text-muted)] truncate">{b.leave_type_name}</div>
                  <div className="text-base font-bold text-[var(--text-primary)] mt-0.5 flex items-baseline gap-1">
                    <span className={isNegative ? 'text-red-600 dark:text-red-400 font-bold' : ''}>
                      {b.remaining_days}
                    </span>
                    <span className="text-[11px] font-normal text-[var(--text-secondary)]">
                      / {b.total_allocated_days}d {isNegative ? '(deficit)' : ''}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">{b.used_days} days used</div>
                </div>
              );
            })}
          </div>

          {/* Recent Leave Requests */}
          {leaveRequests.length > 0 && (
            <div className="pt-2">
              <div className="text-xs font-semibold text-[var(--text-primary)] mb-2">Request History</div>
              <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                {leaveRequests.map((r) => (
                  <div key={r.id} className="p-3 flex items-center justify-between text-xs bg-[var(--bg-surface)]">
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">
                        {r.leave_type_name} ({r.days_requested} {r.days_requested === 1 ? 'day' : 'days'})
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {r.start_date} → {r.end_date} {r.reason ? `· "${r.reason}"` : ''}
                      </div>
                    </div>
                    <StatusPill status={r.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Block 6: Offboarding & Separation Workflow (Strict RBAC & Settlement Lock) */}
        <div
          id="block-offboarding"
          className="p-6 rounded-xl border border-red-500/20 bg-red-500/5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-red-500/20 pb-3">
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-red-600 dark:text-red-400" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Offboarding & Separation Workflow
              </h3>
            </div>
            {offboardingRecord ? (
              <StatusPill
                variant="red"
                label={offboardingRecord.status === 'completed' ? 'Offboarded (Settled)' : 'Offboarding Active'}
              />
            ) : (
              <StatusPill variant="green" label="Active Employee" />
            )}
          </div>

          {!offboardingRecord ? (
            <div className="flex items-center justify-between text-xs">
              <div className="text-[var(--text-secondary)]">
                Initiate voluntary resignation, termination, or retirement workflow with standard 5-step checklist.
              </div>
              <button
                id="start-offboarding-btn"
                onClick={() => setIsOffboardingModalOpen(true)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors cursor-pointer shrink-0"
              >
                Initiate Offboarding
              </button>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <div>
                  <div className="text-[var(--text-muted)]">Separation Reason</div>
                  <div className="font-semibold text-[var(--text-primary)] capitalize">
                    {offboardingRecord.reason.replace('_', ' ')}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text-muted)]">Last Working Day</div>
                  <div className="font-semibold text-[var(--text-primary)]">
                    {offboardingRecord.last_working_day}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text-muted)]">Status</div>
                  <div className="font-semibold text-[var(--text-primary)] capitalize">
                    {offboardingRecord.status.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* 5-Step Offboarding Checklist */}
              <div className="space-y-2">
                <div className="font-semibold text-[var(--text-primary)]">Separation Tasks Checklist:</div>
                <div className="space-y-1.5">
                  {(offboardingRecord.tasks || []).map((task: any, idx: number) => {
                    const isDone = task.status === 'completed' || task.completed === true;
                    const taskName = task.task || task.title || 'Task ' + (idx + 1);
                    return (
                      <div
                        key={task.id || idx}
                        onClick={() => handleToggleOffboardingTask(task, idx)}
                        className="p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer flex items-center justify-between text-xs group"
                      >
                        <div className="flex items-center gap-2.5">
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Circle className="w-4 h-4 text-[var(--border-strong)]" />
                          )}
                          <span className={isDone ? 'line-through text-[var(--text-muted)]' : 'font-medium text-[var(--text-primary)]'}>
                            {taskName}
                          </span>
                        </div>
                        {task.completed_by && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            {task.completed_by}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Final Settlement Approval (Strict RBAC check) */}
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Final Payroll Payout & Settlement Approval</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      Mandatory authorization step. Approving final settlement permanently transitions employee status to <code>offboarded</code>.
                    </p>
                  </div>

                  {offboardingRecord.settlement_approved ? (
                    <div className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Settlement Approved</span>
                    </div>
                  ) : null}
                </div>

                {!offboardingRecord.settlement_approved && (
                  <div>
                    {role === 'hr_head' ? (
                      <button
                        id="approve-settlement-btn"
                        onClick={handleApproveSettlement}
                        disabled={settlementLoading}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {settlementLoading ? 'Approving...' : 'Approve Settlement & Close Record'}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
                        <Lock className="w-4 h-4 shrink-0" />
                        <span>Settlement approval requires authorization from the <strong>HR Head</strong>.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Block 7: Predictive Attrition Risk Diagnostics (Milestone 4) */}
        {attritionDetails && (
          <div
            id="block-attrition-diagnostics"
            className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Predictive Attrition Risk Diagnostics
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Score: {attritionDetails.risk_score} / 100
                </span>
                <StatusPill risk={attritionDetails.attrition_risk} size="sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {attritionDetails.factors.map((factor) => (
                <div
                  key={factor.key}
                  className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                    factor.severity === 'high'
                      ? 'border-rose-500/30 bg-rose-500/5'
                      : factor.severity === 'medium'
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-[var(--text-primary)]">{factor.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        factor.severity === 'high'
                          ? 'bg-rose-500 text-white'
                          : factor.severity === 'medium'
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {factor.severity} (+{factor.score_impact} pts)
                    </span>
                  </div>

                  <p className="text-[11px] text-[var(--text-secondary)]">{factor.details}</p>

                  <div className="pt-1 text-[11px] text-[var(--text-primary)] font-medium flex items-start gap-1">
                    <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">💡 Recommendation:</span>
                    <span>{factor.investigation_recommendation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Block 8: Documents & Repository */}
        <div
          id="block-documents"
          className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center gap-2 font-semibold text-sm text-[var(--text-primary)]">
              <FileText className="w-4 h-4 text-stone-600 dark:text-stone-300" />
              <span>Documents & Employment Contracts</span>
            </div>
            {onNavigateToDocuments && (
              <button
                onClick={onNavigateToDocuments}
                className="text-xs font-semibold text-[var(--accent-blue)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Open in Documents Center</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Signed contracts, identity documents, and compliance forms associated with {employee.name}.
          </p>
        </div>
      </div>

      {/* Edit Employee Details Modal */}
      {isEditModalOpen && (
        <EditEmployeeModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          employee={employee}
          departments={departments}
          onEmployeeUpdated={() => {
            fetchEmployeeData();
            fetchMilestone2Data();
          }}
        />
      )}

      {/* Edit Compensation Modal (HR Head only) */}
      {isCompensationModalOpen && role === 'hr_head' && (
        <EditCompensationModal
          isOpen={isCompensationModalOpen}
          onClose={() => setIsCompensationModalOpen(false)}
          employeeId={employee.id}
          employeeName={employee.name}
          initialCompensation={employee.compensation}
          onCompensationUpdated={() => {
            fetchEmployeeData();
            fetchMilestone2Data();
          }}
        />
      )}

      {/* Start Offboarding Modal */}
      {isOffboardingModalOpen && (
        <StartOffboardingModal
          isOpen={isOffboardingModalOpen}
          onClose={() => setIsOffboardingModalOpen(false)}
          employeeId={employee.id}
          employeeName={employee.name}
          jobTitle={employee.job_title}
          onOffboardingStarted={() => {
            fetchEmployeeData();
            fetchMilestone2Data();
          }}
        />
      )}

      {/* Request Leave Modal */}
      {isLeaveModalOpen && (
        <RequestLeaveModal
          isOpen={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          employees={[employee]}
          leaveTypes={leaveTypes}
          preselectedEmployeeId={employee.id}
          onRequestSubmitted={() => {
            fetchMilestone2Data();
          }}
        />
      )}

      {/* Reassign / Promote Employee Modal (HR Head only) */}
      {isReassignModalOpen && role === 'hr_head' && (
        <ReassignEmployeeModal
          isOpen={isReassignModalOpen}
          onClose={() => setIsReassignModalOpen(false)}
          employee={employee}
          departments={departments}
          allEmployees={allEmployees}
          onReassigned={(reason) => {
            fetchEmployeeData();
            fetchMilestone2Data();
            const actionVerb =
              reason === 'promotion'
                ? 'Promoted'
                : reason === 'transfer'
                ? 'Transferred'
                : reason === 'restructure'
                ? 'Restructured'
                : 'Reassigned';
            setSuccessToast(`${actionVerb} ${employee.name} successfully.`);
            setTimeout(() => setSuccessToast(null), 5000);

            if (reason === 'promotion') {
              setPromotionPrompt({ isOpen: true, reason });
            }
          }}
        />
      )}

      {/* Promotion Compensation Shortcut Modal */}
      {promotionPrompt?.isOpen && role === 'hr_head' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-100">
          <div
            id="promotion-comp-shortcut-modal"
            className="w-full max-w-md bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] shadow-[var(--popover-shadow)] p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                  Promotion Recorded
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {employee.name} promoted to {employee.job_title}
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Would you like to log an updated compensation and salary package for this promotion now, using the employee compensation history?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
              <button
                id="skip-promotion-comp-btn"
                type="button"
                onClick={() => setPromotionPrompt(null)}
                className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors cursor-pointer"
              >
                Skip / Keep Current Salary
              </button>
              <button
                id="open-promotion-comp-btn"
                type="button"
                onClick={() => {
                  setPromotionPrompt(null);
                  setIsCompensationModalOpen(true);
                }}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Log Salary Increase</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
