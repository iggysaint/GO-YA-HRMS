import React, { useState, useEffect } from 'react';
import {
  Banknote,
  DollarSign,
  TrendingUp,
  Building2,
  Globe,
  Plus,
  History,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  FileSpreadsheet,
  ArrowUpRight,
  Sparkles,
  Info,
  Loader2,
  X,
  CreditCard,
  Building,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatusPill } from '../components/StatusPill';
import { ExportButton } from '../components/ExportButton';
import { ExportColumn } from '../utils/exportUtils';
import {
  PayrollSummary,
  EmployeeCompensation,
  Employee,
  Department,
  StatutoryDataGhana,
} from '../types';

interface PayrollSummaryPageProps {
  onNavigateToEmployee?: (id: string) => void;
}

export const PayrollSummaryPage: React.FC<PayrollSummaryPageProps> = ({
  onNavigateToEmployee,
}) => {
  const { role, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PayrollSummary | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [employeeHistory, setEmployeeHistory] = useState<EmployeeCompensation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form State for Add / Revise Compensation
  const [formData, setFormData] = useState({
    employee_id: '',
    salary: '',
    currency: 'GHS',
    effective_date: new Date().toISOString().split('T')[0],
    allowances: '',
    bonus: '',
    notes: '',
    // Ghana Statutory
    ssnit_number: '',
    pension_tier_2_3_provider: 'Enterprise Trustees Tier 2 Master Trust',
    tin: '',
    paye_band: 'Graduated 0%–35% Cumulative',
    // Non-Ghana / Custom
    custom_statutory_key1: 'ni_number',
    custom_statutory_val1: '',
    custom_statutory_key2: 'pension_provider',
    custom_statutory_val2: '',
    custom_statutory_key3: 'tax_code',
    custom_statutory_val3: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchPayroll = async () => {
    if (role !== 'hr_head') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [resPayroll, resEmp, resDept] = await Promise.all([
        fetch('/api/payroll/summary', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/employees', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/departments', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (resPayroll.ok) {
        const pData: PayrollSummary = await resPayroll.json();
        setData(pData);
      }
      if (resEmp.ok) {
        const empData = await resEmp.json();
        setEmployees(empData);
      }
      if (resDept.ok) {
        const deptData = await resDept.json();
        setDepartments(deptData);
      }
    } catch (err) {
      console.error('Failed to fetch payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [role, token]);

  const handleOpenAddModal = (preselectedEmpId?: string) => {
    const targetEmpId = preselectedEmpId || (employees[0]?.id ?? '');
    const emp = employees.find((e) => e.id === targetEmpId);
    const isGhana = emp ? emp.country.toLowerCase().includes('ghana') : true;

    const existingRecord = data?.records.find((r) => r.employee_id === targetEmpId);
    const existingStatutory: any = existingRecord?.statutory_data || {};

    setFormData({
      employee_id: targetEmpId,
      salary: existingRecord ? String(existingRecord.salary) : '',
      currency: existingRecord ? existingRecord.currency : isGhana ? 'GHS' : 'GBP',
      effective_date: new Date().toISOString().split('T')[0],
      allowances: existingRecord?.allowances ? String(existingRecord.allowances) : '',
      bonus: existingRecord?.bonus ? String(existingRecord.bonus) : '',
      notes: '',
      ssnit_number: existingStatutory.ssnit_number || '',
      pension_tier_2_3_provider: existingStatutory.pension_tier_2_3_provider || 'Enterprise Trustees Tier 2 Master Trust',
      tin: existingStatutory.tin || '',
      paye_band: existingStatutory.paye_band || 'Graduated 0%–35% Cumulative',
      custom_statutory_key1: 'ni_number',
      custom_statutory_val1: existingStatutory.ni_number || '',
      custom_statutory_key2: 'pension_provider',
      custom_statutory_val2: existingStatutory.pension_provider || '',
      custom_statutory_key3: 'tax_code',
      custom_statutory_val3: existingStatutory.tax_code || '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenHistoryModal = async (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);

    try {
      const res = await fetch(`/api/employees/${employeeId}/compensation/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setEmployeeHistory(json.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch compensation history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveCompensation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id || !formData.salary || !formData.effective_date) {
      setFeedback({ type: 'error', message: 'Please fill in all required fields (employee, salary, effective date).' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const targetEmp = employees.find((emp) => emp.id === formData.employee_id);
    const isGhana = targetEmp ? targetEmp.country.toLowerCase().includes('ghana') : true;

    let statutoryPayload: Record<string, any> = {};
    if (isGhana) {
      statutoryPayload = {
        ssnit_number: formData.ssnit_number.trim(),
        pension_tier_2_3_provider: formData.pension_tier_2_3_provider.trim(),
        tin: formData.tin.trim(),
        paye_band: formData.paye_band.trim(),
      };
    } else {
      if (formData.custom_statutory_key1 && formData.custom_statutory_val1) {
        statutoryPayload[formData.custom_statutory_key1] = formData.custom_statutory_val1.trim();
      }
      if (formData.custom_statutory_key2 && formData.custom_statutory_val2) {
        statutoryPayload[formData.custom_statutory_key2] = formData.custom_statutory_val2.trim();
      }
      if (formData.custom_statutory_key3 && formData.custom_statutory_val3) {
        statutoryPayload[formData.custom_statutory_key3] = formData.custom_statutory_val3.trim();
      }
    }

    try {
      const res = await fetch(`/api/employees/${formData.employee_id}/compensation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          salary: Number(formData.salary),
          currency: formData.currency,
          effective_date: formData.effective_date,
          allowances: Number(formData.allowances) || 0,
          bonus: Number(formData.bonus) || 0,
          statutory_data: statutoryPayload,
          notes: formData.notes,
        }),
      });

      if (res.ok) {
        setFeedback({ type: 'success', message: 'Compensation record created successfully!' });
        setIsAddModalOpen(false);
        fetchPayroll();
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Failed to save compensation revision.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error occurred.' });
    } finally {
      setSubmitting(false);
    }
  };

  // If user is not HR Head, enforce RLS restriction UI
  if (role !== 'hr_head') {
    return (
      <div id="payroll-restricted-view" className="p-8 max-w-4xl mx-auto">
        <div className="rounded-2xl bg-[var(--bg-surface)] border border-rose-200 dark:border-rose-900/50 p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  Restricted to HR Head Role
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                  RLS Security Policy
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Under the Go-Ya HRMS strict Row-Level Security policy (<code className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-xs font-mono">hr_head_only_compensation</code>), salary structures, individual compensation histories, and aggregated company payroll analytics are protected and exclusively accessible by the HR Head.
              </p>
              <div className="pt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Info className="w-4 h-4" />
                <span>If you require payroll or salary access for audits, please request role elevation from your workspace administrator.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
          <p className="text-sm text-[var(--text-secondary)]">Loading payroll & compensation analytics...</p>
        </div>
      </div>
    );
  }

  const records = data?.records || [];
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.department_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCountry = countryFilter === 'all' || r.country.toLowerCase().includes(countryFilter.toLowerCase());
    const matchesDept = departmentFilter === 'all' || r.department_name === departmentFilter;

    return matchesSearch && matchesCountry && matchesDept;
  });

  const payrollExportColumns: ExportColumn<PayrollSummary['records'][number]>[] = [
    { header: 'Employee Name', accessor: (r) => r.employee_name },
    { header: 'Job Title', accessor: (r) => r.job_title },
    { header: 'Department', accessor: (r) => r.department_name },
    { header: 'Country', accessor: (r) => r.country },
    { header: 'Currency', accessor: (r) => r.currency },
    { header: 'Base Annual Salary', accessor: (r) => r.salary },
    { header: 'Allowances', accessor: (r) => r.allowances || 0 },
    { header: 'Bonus / Variable', accessor: (r) => r.bonus || 0 },
    {
      header: 'Gross Total Compensation',
      accessor: (r) => (Number(r.salary) || 0) + (Number(r.allowances) || 0) + (Number(r.bonus) || 0),
    },
    { header: 'Effective Date', accessor: (r) => r.effective_date },
    {
      header: 'Statutory SSNIT / NI',
      accessor: (r) => {
        const stat: any = r.statutory_data || {};
        return stat.ssnit_number || stat.ni_number || '—';
      },
    },
    {
      header: 'Tax ID / TIN',
      accessor: (r) => {
        const stat: any = r.statutory_data || {};
        return stat.tin || stat.tax_code || '—';
      },
    },
    {
      header: 'Pension Provider',
      accessor: (r) => {
        const stat: any = r.statutory_data || {};
        return stat.pension_tier_2_3_provider || stat.pension_provider || '—';
      },
    },
  ];

  const selectedEmployeeName =
    employees.find((e) => e.id === selectedEmployeeId)?.name || 'Employee';

  return (
    <div id="payroll-summary-page" className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Notion-style Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                Payroll & Compensation
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Aggregated gross compensation, departmental cost distribution, and statutory tax parameters.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <ExportButton
            id="payroll-export-btn"
            filename="payroll-compensation-summary"
            columns={payrollExportColumns}
            data={filteredRecords}
            sheetName="Payroll Summary"
            label="Export"
          />

          <button
            id="add-compensation-revision-btn"
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium text-sm transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Compensation Revision</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          id="payroll-feedback-banner"
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

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider">
            <span>Total Monthly Cost</span>
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            GHS {data?.total_payroll_cost.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Includes base salaries, allowances & monthly bonuses
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider">
            <span>Total Base Salaries</span>
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            GHS {data?.total_base_salaries.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Active monthly fixed contract wages
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider">
            <span>Total Allowances</span>
            <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            GHS {data?.total_allowances.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Housing, transit, utility & stipend packages
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider">
            <span>Total Bonuses</span>
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            GHS {data?.total_bonuses.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Performance, merit & target incentives
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider">
            <span>Active Headcount</span>
            <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {data?.total_active_employees || 0} Staff
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Active full-time, part-time & probation staff
          </p>
        </div>
      </div>

      {/* Two Column Visual Breakdowns: Department & Country */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by Department */}
        <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[var(--brand-primary)]" />
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Cost Breakdown by Department
              </h3>
            </div>
            <span className="text-xs text-[var(--text-muted)] font-medium">
              {data?.cost_by_department.length || 0} Departments
            </span>
          </div>

          <div className="space-y-4">
            {data?.cost_by_department.map((dept) => (
              <div key={dept.department_id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {dept.department_name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text-muted)]">
                      {dept.employee_count} staff
                    </span>
                    <span className="font-bold text-[var(--text-primary)]">
                      GHS {dept.total_cost.toLocaleString()}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[10px] text-[var(--text-secondary)] font-mono">
                      {dept.percentage_of_total}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(4, dept.percentage_of_total)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cost by Country & Currency */}
        <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[var(--brand-primary)]" />
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Cost Breakdown by Country & Currency
              </h3>
            </div>
            <span className="text-xs text-[var(--text-muted)] font-medium">
              {data?.cost_by_country.length || 0} Jurisdictions
            </span>
          </div>

          <div className="space-y-4">
            {data?.cost_by_country.map((cnt) => (
              <div
                key={cnt.country}
                className="p-4 rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[var(--text-primary)]">
                      {cnt.country}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      {cnt.currency}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {cnt.employee_count} active team members in region
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-base font-bold text-[var(--text-primary)]">
                    {cnt.currency} {cnt.total_cost.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Base: {cnt.currency} {cnt.total_base_salary.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter and Table Section */}
      <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[var(--brand-primary)]" />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Active Employee Compensation Schedule
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
              {filteredRecords.length} Records
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff, role, dept..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
              />
            </div>

            {/* Country Filter */}
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
            >
              <option value="all">All Countries</option>
              <option value="Ghana">Ghana</option>
              <option value="United Kingdom">United Kingdom</option>
            </select>

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
                <th className="py-3 px-4 font-semibold">Employee</th>
                <th className="py-3 px-4 font-semibold">Department</th>
                <th className="py-3 px-4 font-semibold">Country</th>
                <th className="py-3 px-4 font-semibold">Base Salary</th>
                <th className="py-3 px-4 font-semibold">Allowances</th>
                <th className="py-3 px-4 font-semibold">Bonus</th>
                <th className="py-3 px-4 font-semibold">Gross Monthly</th>
                <th className="py-3 px-4 font-semibold">Statutory Parameters</th>
                <th className="py-3 px-4 font-semibold">Effective</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[var(--text-muted)]">
                    No compensation records match your query filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isGhana = r.country.toLowerCase().includes('ghana');
                  const stat: any = r.statutory_data || {};
                  const grossTotal = (r.salary || 0) + (r.allowances || 0) + (r.bonus || 0);

                  return (
                    <tr
                      key={r.employee_id}
                      className="hover:bg-[var(--bg-hover)] transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div
                          className="font-semibold hover:underline cursor-pointer flex items-center gap-1.5"
                          onClick={() => onNavigateToEmployee?.(r.employee_id)}
                        >
                          <span>{r.employee_name}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)]" />
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">{r.job_title}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                          {r.department_name}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span>{r.country}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-medium">
                        {r.currency} {r.salary.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-[var(--text-secondary)]">
                        {r.currency} {(r.allowances || 0).toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-[var(--text-secondary)]">
                        {r.currency} {(r.bonus || 0).toLocaleString()}
                      </td>

                      <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                        {r.currency} {grossTotal.toLocaleString()}
                      </td>

                      {/* Statutory Info */}
                      <td className="py-3 px-4">
                        {isGhana ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-[11px]">
                              <span className="text-[var(--text-muted)] font-mono">SSNIT:</span>
                              <span className="font-semibold">{stat.ssnit_number || 'Pending'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px]">
                              <span className="text-[var(--text-muted)] font-mono">TIN:</span>
                              <span>{stat.tin || 'Pending'}</span>
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[180px]">
                              {stat.pension_tier_2_3_provider || 'Tier 2 Master Trust'}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1 text-[11px]">
                            {stat.ni_number && (
                              <div>
                                <span className="text-[var(--text-muted)]">NI: </span>
                                <span className="font-semibold">{stat.ni_number}</span>
                              </div>
                            )}
                            {stat.tax_code && (
                              <div>
                                <span className="text-[var(--text-muted)]">Tax: </span>
                                <span>{stat.tax_code}</span>
                              </div>
                            )}
                            {stat.pension_provider && (
                              <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[180px]">
                                {stat.pension_provider}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-[var(--text-muted)] whitespace-nowrap">
                        {r.effective_date}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`view-history-btn-${r.employee_id}`}
                            onClick={() => handleOpenHistoryModal(r.employee_id)}
                            title="View Compensation Revisions History"
                            className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            id={`add-revision-btn-${r.employee_id}`}
                            onClick={() => handleOpenAddModal(r.employee_id)}
                            title="Add Salary Revision / Update"
                            className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 transition-colors cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
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

      {/* MODAL: Add / Revise Compensation */}
      {isAddModalOpen && (
        <div
          id="add-compensation-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    Add / Update Compensation Record
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Appends a new effective-date salary package to employee compensation history.
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

            <form onSubmit={handleSaveCompensation} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Employee Selector */}
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-secondary)]">
                    Employee *
                  </label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => {
                      const empId = e.target.value;
                      const emp = employees.find((x) => x.id === empId);
                      setFormData((prev) => ({
                        ...prev,
                        employee_id: empId,
                        currency: emp?.country.toLowerCase().includes('ghana') ? 'GHS' : 'GBP',
                      }));
                    }}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                    required
                  >
                    <option value="">Select an employee...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} — {emp.job_title} ({emp.country})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Effective Date */}
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-secondary)]">
                    Effective Date *
                  </label>
                  <input
                    type="date"
                    value={formData.effective_date}
                    onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                    required
                  />
                </div>

                {/* Base Salary */}
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-secondary)]">
                    Base Salary (Monthly) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 25000"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                    required
                  />
                </div>

                {/* Currency */}
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-secondary)]">
                    Currency *
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
                    required
                  >
                    <option value="GHS">GHS - Ghana Cedi (GH₵)</option>
                    <option value="USD">USD - US Dollar ($)</option>
                    <option value="GBP">GBP - British Pound (£)</option>
                    <option value="EUR">EUR - Euro (€)</option>
                    <option value="NGN">NGN - Nigerian Naira (₦)</option>
                    <option value="KES">KES - Kenyan Shilling</option>
                  </select>
                </div>

                {/* Allowances */}
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-secondary)]">
                    Monthly Allowances (Housing, Utilities, Transit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 3500"
                    value={formData.allowances}
                    onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                  />
                </div>

                {/* Bonus */}
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-secondary)]">
                    Target Monthly / Performance Bonus
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 1500"
                    value={formData.bonus}
                    onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                  />
                </div>
              </div>

              {/* Statutory Section */}
              <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span className="font-bold text-[var(--text-primary)] text-xs">
                    Statutory & Tax Compliance Parameters
                  </span>
                </div>

                {/* If selected employee is Ghana, show Ghana statutory fields */}
                {employees.find((e) => e.id === formData.employee_id)?.country.toLowerCase().includes('ghana') !== false ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-[var(--text-secondary)]">
                        SSNIT Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. C019823481234"
                        value={formData.ssnit_number}
                        onChange={(e) => setFormData({ ...formData, ssnit_number: e.target.value })}
                        className="w-full p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-[var(--text-secondary)]">
                        Tax Identification Number (TIN / Ghana Card PIN)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. P0002938471"
                        value={formData.tin}
                        onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                        className="w-full p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] text-[var(--text-secondary)]">
                        Pension Tier 2 / Tier 3 Trustee Provider
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Enterprise Trustees Tier 2 Master Trust"
                        value={formData.pension_tier_2_3_provider}
                        onChange={(e) => setFormData({ ...formData, pension_tier_2_3_provider: e.target.value })}
                        className="w-full p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] text-[var(--text-secondary)]">
                        PAYE Tax Bracket / Schedule
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Graduated 0%–35% Cumulative"
                        value={formData.paye_band}
                        onChange={(e) => setFormData({ ...formData, paye_band: e.target.value })}
                        className="w-full p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-[var(--text-secondary)]">
                        National Insurance / Social ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. QQ 12 34 56 A"
                        value={formData.custom_statutory_val1}
                        onChange={(e) => setFormData({ ...formData, custom_statutory_val1: e.target.value })}
                        className="w-full p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-[var(--text-secondary)]">
                        Tax Code / Band
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1257L Cumulative"
                        value={formData.custom_statutory_val3}
                        onChange={(e) => setFormData({ ...formData, custom_statutory_val3: e.target.value })}
                        className="w-full p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] text-[var(--text-secondary)]">
                        Pension Scheme Provider
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. NEST Workplace Pension"
                        value={formData.custom_statutory_val2}
                        onChange={(e) => setFormData({ ...formData, custom_statutory_val2: e.target.value })}
                        className="w-full p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Revision Notes */}
              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-secondary)]">
                  Revision Notes / Justification
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Annual merit progression, promotion to Engineering Lead, or cost of living adjustment"
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
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Save Compensation Revision</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View History */}
      {isHistoryModalOpen && (
        <div
          id="compensation-history-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    Compensation History
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {selectedEmployeeName} — Historical salary increments and revisions timeline.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
                <span className="text-xs text-[var(--text-secondary)]">Loading revision records...</span>
              </div>
            ) : employeeHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                No previous compensation revisions recorded for this employee.
              </div>
            ) : (
              <div className="space-y-4">
                {employeeHistory.map((comp, idx) => {
                  const gross = (comp.salary || 0) + (comp.allowances || 0) + (comp.bonus || 0);
                  const isLatest = idx === 0;

                  return (
                    <div
                      key={comp.id}
                      className={`p-4 rounded-xl border relative transition-all ${
                        isLatest
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                          : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[var(--text-primary)]">
                              {comp.currency} {gross.toLocaleString()} / mo
                            </span>
                            {isLatest && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                                Current Active Package
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)] pt-1">
                            Base: {comp.currency} {comp.salary.toLocaleString()}
                            {comp.allowances ? ` · Allowances: ${comp.currency} ${comp.allowances.toLocaleString()}` : ''}
                            {comp.bonus ? ` · Bonus: ${comp.currency} ${comp.bonus.toLocaleString()}` : ''}
                          </div>
                        </div>

                        <div className="text-right text-xs">
                          <div className="flex items-center gap-1 text-[var(--text-muted)] font-medium">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{comp.effective_date}</span>
                          </div>
                        </div>
                      </div>

                      {comp.notes && (
                        <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] italic">
                          "{comp.notes}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] font-medium text-xs transition-colors cursor-pointer"
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
