import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { AttendanceStatus, DailyAttendanceSummary } from '../types';
import { ExportButton } from '../components/ExportButton';
import { ExportColumn } from '../utils/exportUtils';
import {
  Calendar,
  CheckCircle2,
  Clock,
  UserX,
  Palmtree,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
  Search,
  Check,
  AlertCircle,
  Filter,
} from 'lucide-react';

interface AttendanceRecordItem {
  employee_id: string;
  employee_name: string;
  job_title: string;
  department_name: string;
  date: string;
  status: AttendanceStatus;
  notes: string;
  record_id: string | null;
}

interface MonthlySummaryItem {
  employee_id: string;
  employee_name: string;
  job_title: string;
  department_name: string;
  status: string;
  present_days: number;
  late_days: number;
  absent_days: number;
  on_leave_days: number;
  total_recorded: number;
}

interface AttendancePageProps {
  onNavigateToLeave?: (employeeId?: string) => void;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({ onNavigateToLeave }) => {
  const { authFetch, organization, role, subscribeToRealtime } = useAuth();

  // Tab: 'daily' | 'monthly'
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');

  // Daily state
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
  });
  const [dailyRecords, setDailyRecords] = useState<AttendanceRecordItem[]>([]);
  const [dailySummary, setDailySummary] = useState<DailyAttendanceSummary | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [searchDaily, setSearchDaily] = useState('');

  // Monthly state
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummaryItem[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [searchMonthly, setSearchMonthly] = useState('');

  // Saving state
  const [savingEmpId, setSavingEmpId] = useState<string | null>(null);

  // Fetch Daily Attendance
  const fetchDailyAttendance = useCallback(async () => {
    try {
      setDailyLoading(true);
      const res = await authFetch(`/api/attendance?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setDailyRecords(data.records || []);
        setDailySummary(data.summary || null);
      }
    } catch (err) {
      console.error('Failed to fetch daily attendance:', err);
    } finally {
      setDailyLoading(false);
    }
  }, [authFetch, selectedDate]);

  // Fetch Monthly Attendance
  const fetchMonthlyAttendance = useCallback(async () => {
    try {
      setMonthlyLoading(true);
      const res = await authFetch(`/api/attendance/monthly?year=${selectedYear}&month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setMonthlySummaries(data.summaries || []);
      }
    } catch (err) {
      console.error('Failed to fetch monthly attendance:', err);
    } finally {
      setMonthlyLoading(false);
    }
  }, [authFetch, selectedYear, selectedMonth]);

  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyAttendance();
    } else {
      fetchMonthlyAttendance();
    }
  }, [activeTab, fetchDailyAttendance, fetchMonthlyAttendance]);

  // Subscribe to realtime updates
  useEffect(() => {
    const unsubscribe = subscribeToRealtime((payload) => {
      if (payload.event === 'attendance_updated' || payload.event === 'leave_request_updated') {
        if (activeTab === 'daily') {
          fetchDailyAttendance();
        } else {
          fetchMonthlyAttendance();
        }
      }
    });
    return unsubscribe;
  }, [subscribeToRealtime, activeTab, fetchDailyAttendance, fetchMonthlyAttendance]);

  // Update Status for single employee
  const handleUpdateStatus = async (employeeId: string, newStatus: AttendanceStatus, notes?: string) => {
    try {
      setSavingEmpId(employeeId);
      const res = await authFetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          date: selectedDate,
          status: newStatus,
          notes: notes !== undefined ? notes : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDailyRecords((prev) =>
          prev.map((r) =>
            r.employee_id === employeeId ? { ...r, status: newStatus, notes: notes ?? r.notes } : r
          )
        );
        if (data.summary) {
          setDailySummary(data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to update attendance:', err);
    } finally {
      setSavingEmpId(null);
    }
  };

  // Batch Mark All Present
  const handleBatchMarkAll = async (status: AttendanceStatus) => {
    try {
      setDailyLoading(true);
      const res = await authFetch('/api/attendance/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, status }),
      });

      if (res.ok) {
        fetchDailyAttendance();
      }
    } catch (err) {
      console.error('Failed to batch update:', err);
    } finally {
      setDailyLoading(false);
    }
  };

  // Date Navigation Helpers
  const shiftDate = (offsetDays: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + offsetDays);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const isToday = () => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    return selectedDate === todayStr;
  };

  // Smart Navigation to Leave tab for employee
  const handleLeaveAction = async (employeeId: string) => {
    await handleUpdateStatus(employeeId, 'on_leave');
    if (onNavigateToLeave) {
      onNavigateToLeave(employeeId);
    }
  };

  const filteredDaily = dailyRecords.filter((r) => {
    if (!searchDaily) return true;
    const q = searchDaily.toLowerCase();
    return (
      r.employee_name.toLowerCase().includes(q) ||
      r.job_title.toLowerCase().includes(q) ||
      r.department_name.toLowerCase().includes(q)
    );
  });

  const filteredMonthly = monthlySummaries.filter((s) => {
    if (!searchMonthly) return true;
    const q = searchMonthly.toLowerCase();
    return (
      s.employee_name.toLowerCase().includes(q) ||
      s.job_title.toLowerCase().includes(q) ||
      s.department_name.toLowerCase().includes(q)
    );
  });

  const dailyExportColumns: ExportColumn<AttendanceRecordItem>[] = [
    { header: 'Employee Name', accessor: (r) => r.employee_name },
    { header: 'Job Title', accessor: (r) => r.job_title },
    { header: 'Department', accessor: (r) => r.department_name },
    { header: 'Date', accessor: (r) => r.date },
    {
      header: 'Status',
      accessor: (r) => {
        switch (r.status as string) {
          case 'present':
            return 'Present';
          case 'late':
            return 'Late';
          case 'absent':
            return 'Absent';
          case 'on_leave':
            return 'On Leave';
          case 'not_logged':
            return 'Not Logged';
          default:
            return r.status;
        }
      },
    },
    { header: 'Notes', accessor: (r) => r.notes || '' },
  ];

  const monthlyExportColumns: ExportColumn<MonthlySummaryItem>[] = [
    { header: 'Employee Name', accessor: (s) => s.employee_name },
    { header: 'Job Title', accessor: (s) => s.job_title },
    { header: 'Department', accessor: (s) => s.department_name },
    { header: 'Present Days', accessor: (s) => s.present_days },
    { header: 'Late Days', accessor: (s) => s.late_days },
    { header: 'Absent Days', accessor: (s) => s.absent_days },
    { header: 'On Leave Days', accessor: (s) => s.on_leave_days },
    { header: 'Total Recorded Days', accessor: (s) => s.total_recorded },
  ];

  return (
    <div id="attendance-page" className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Attendance Tracking
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
              Manual Logger & Roster
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Log daily workplace presence, track punctuality, and view monthly attendance trends
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <ExportButton
            id="attendance-export-btn"
            filename={
              activeTab === 'daily'
                ? `attendance-daily-${selectedDate}`
                : `attendance-monthly-${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
            }
            columns={(activeTab === 'daily' ? dailyExportColumns : monthlyExportColumns) as ExportColumn<any>[]}
            data={(activeTab === 'daily' ? filteredDaily : filteredMonthly) as any[]}
            sheetName={
              activeTab === 'daily'
                ? `Attendance-${selectedDate}`
                : `Summary-${selectedYear}-${selectedMonth}`
            }
            label="Export"
          />

          {/* Tab Controls */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'daily'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Daily Logger
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'monthly'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Monthly Summary
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'daily' ? (
        <div className="space-y-6">
          {/* Daily Date Selector & Batch Bar */}
          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xs">
            {/* Date Navigator */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftDate(-1)}
                className="p-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)]"
                />
                {!isToday() && (
                  <button
                    onClick={() => {
                      const now = new Date();
                      setSelectedDate(
                        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
                          now.getDate()
                        ).padStart(2, '0')}`
                      );
                    }}
                    className="px-2 py-1 text-[11px] font-medium rounded-md bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                  >
                    Jump to Today
                  </button>
                )}
              </div>

              <button
                onClick={() => shiftDate(1)}
                className="p-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions & Search */}
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Filter roster..."
                  value={searchDaily}
                  onChange={(e) => setSearchDaily(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] w-40"
                />
              </div>

              <button
                onClick={() => handleBatchMarkAll('present')}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600/20 border border-emerald-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark All Present</span>
              </button>
            </div>
          </div>

          {/* Daily KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Present</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-[var(--text-primary)]">
                {dailySummary?.present_count ?? 0}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Late</span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-[var(--text-primary)]">
                {dailySummary?.late_count ?? 0}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5">
              <div className="flex items-center justify-between text-red-700 dark:text-red-400 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Absent</span>
                <UserX className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-[var(--text-primary)]">
                {dailySummary?.absent_count ?? 0}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5">
              <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">On Leave</span>
                <Palmtree className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-[var(--text-primary)]">
                {dailySummary?.on_leave_count ?? 0}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
              <div className="flex items-center justify-between text-[var(--text-secondary)] mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Not Logged</span>
                <Users className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-[var(--text-primary)]">
                {dailySummary?.not_logged_count ?? 0}
              </div>
            </div>
          </div>

          {/* Daily Table of Employees */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 text-[var(--text-muted)] font-semibold">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Status on {selectedDate}</th>
                    <th className="py-3 px-4">Notes / Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {dailyLoading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-xs text-[var(--text-muted)]">
                        Loading attendance records...
                      </td>
                    </tr>
                  ) : filteredDaily.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-xs text-[var(--text-muted)]">
                        No employees found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredDaily.map((row) => (
                      <tr key={row.employee_id} className="hover:bg-[var(--bg-subtle)]/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[var(--text-primary)]">{row.employee_name}</div>
                          <div className="text-[11px] text-[var(--text-secondary)]">{row.job_title}</div>
                        </td>

                        <td className="py-3 px-4 text-[var(--text-secondary)]">
                          {row.department_name}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Present */}
                            <button
                              onClick={() => handleUpdateStatus(row.employee_id, 'present')}
                              disabled={savingEmpId === row.employee_id}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                                row.status === 'present'
                                  ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-emerald-500/20 hover:text-emerald-700 dark:hover:text-emerald-300'
                              }`}
                            >
                              Present
                            </button>

                            {/* Late */}
                            <button
                              onClick={() => handleUpdateStatus(row.employee_id, 'late')}
                              disabled={savingEmpId === row.employee_id}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                                row.status === 'late'
                                  ? 'bg-amber-600 text-white font-semibold shadow-2xs'
                                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-amber-500/20 hover:text-amber-700 dark:hover:text-amber-300'
                              }`}
                            >
                              Late
                            </button>

                            {/* Absent */}
                            <button
                              onClick={() => handleUpdateStatus(row.employee_id, 'absent')}
                              disabled={savingEmpId === row.employee_id}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                                row.status === 'absent'
                                  ? 'bg-red-600 text-white font-semibold shadow-2xs'
                                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-red-500/20 hover:text-red-700 dark:hover:text-red-300'
                              }`}
                            >
                              Absent
                            </button>

                            {/* On Leave */}
                            <button
                              onClick={() => handleLeaveAction(row.employee_id)}
                              disabled={savingEmpId === row.employee_id}
                              title="Set On Leave & open Leave Request form"
                              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                                row.status === 'on_leave'
                                  ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-blue-500/20 hover:text-blue-700 dark:hover:text-blue-300'
                              }`}
                            >
                              On Leave
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <input
                            type="text"
                            defaultValue={row.notes}
                            placeholder="Add reason/note..."
                            onBlur={(e) => {
                              if (e.target.value !== row.notes) {
                                handleUpdateStatus(row.employee_id, row.status, e.target.value);
                              }
                            }}
                            className="w-full max-w-xs px-2 py-1 text-xs rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)]"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Monthly Breakdown View */
        <div className="space-y-6">
          {/* Month/Year Filter Bar */}
          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text-primary)]">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] font-medium"
                >
                  <option value={1}>January</option>
                  <option value={2}>February</option>
                  <option value={3}>March</option>
                  <option value={4}>April</option>
                  <option value={5}>May</option>
                  <option value={6}>June</option>
                  <option value={7}>July</option>
                  <option value={8}>August</option>
                  <option value={9}>September</option>
                  <option value={10}>October</option>
                  <option value={11}>November</option>
                  <option value={12}>December</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text-primary)]">Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] font-medium"
                >
                  <option value={2023}>2023</option>
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchMonthly}
                onChange={(e) => setSearchMonthly(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] w-48"
              />
            </div>
          </div>

          {/* Monthly Table */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 text-[var(--text-muted)] font-semibold">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-emerald-600 dark:text-emerald-400">Present Days</th>
                    <th className="py-3 px-4 text-amber-600 dark:text-amber-400">Late Days</th>
                    <th className="py-3 px-4 text-red-600 dark:text-red-400">Absent Days</th>
                    <th className="py-3 px-4 text-blue-600 dark:text-blue-400">On Leave Days</th>
                    <th className="py-3 px-4">Total Logged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {monthlyLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-[var(--text-muted)]">
                        Loading monthly summaries...
                      </td>
                    </tr>
                  ) : filteredMonthly.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-[var(--text-muted)]">
                        No employees found matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredMonthly.map((summary) => (
                      <tr key={summary.employee_id} className="hover:bg-[var(--bg-subtle)]/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[var(--text-primary)]">{summary.employee_name}</div>
                          <div className="text-[11px] text-[var(--text-secondary)]">{summary.job_title}</div>
                        </td>

                        <td className="py-3 px-4 text-[var(--text-secondary)]">
                          {summary.department_name}
                        </td>

                        <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                          {summary.present_days}
                        </td>

                        <td className="py-3 px-4 font-semibold text-amber-600 dark:text-amber-400">
                          {summary.late_days}
                        </td>

                        <td className="py-3 px-4 font-semibold text-red-600 dark:text-red-400">
                          {summary.absent_days}
                        </td>

                        <td className="py-3 px-4 font-semibold text-blue-600 dark:text-blue-400">
                          {summary.on_leave_days}
                        </td>

                        <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                          {summary.total_recorded} days
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
