import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { WorkforceAnalyticsReport, EmployeeAttritionAnalysis, AttritionRisk } from '../types';
import { StatusPill } from '../components/StatusPill';
import { ExportButton } from '../components/ExportButton';
import { ExportColumn } from '../utils/exportUtils';
import {
  BarChart3,
  TrendingUp,
  Users,
  ShieldAlert,
  Palmtree,
  Calendar,
  Building,
  Globe,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Sparkles,
  Search,
  Zap,
} from 'lucide-react';

interface AnalyticsPageProps {
  onSelectEmployee: (employeeId: string) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onSelectEmployee }) => {
  const { authFetch, organization, role, subscribeToRealtime } = useAuth();
  const [report, setReport] = useState<WorkforceAnalyticsReport | null>(null);
  const [attritionData, setAttritionData] = useState<EmployeeAttritionAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Attrition Table filters & expand
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('all');
  const [attritionSearch, setAttritionSearch] = useState<string>('');
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [resReport, resAttrition] = await Promise.all([
        authFetch('/api/analytics/report'),
        authFetch('/api/attrition-score/analysis'),
      ]);

      if (resReport.ok) {
        const repData = await resReport.json();
        setReport(repData);
      } else {
        throw new Error('Failed to load workforce analytics report');
      }

      if (resAttrition.ok) {
        const attData = await resAttrition.json();
        setAttritionData(attData.scores || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading analytics');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    const unsub = subscribeToRealtime((payload) => {
      if (
        payload.event === 'attrition_recalculated' ||
        payload.event === 'employee_changed' ||
        payload.event === 'attendance_updated' ||
        payload.event === 'leave_request_updated'
      ) {
        fetchData();
      }
    });
    return unsub;
  }, [subscribeToRealtime, fetchData]);

  const handleRecalculateScores = async () => {
    try {
      setRecalculating(true);
      setError(null);
      setSuccessMessage(null);

      const res = await authFetch('/api/attrition-score/recalculate', {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to recalculate scores');
      }

      setAttritionData(data.scores || []);
      setSuccessMessage(`Recalculated retention scores across ${data.total_analyzed} active employees.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRecalculating(false);
    }
  };

  const filteredAttrition = attritionData.filter((item) => {
    const matchesRisk = selectedRiskFilter === 'all' || item.attrition_risk === selectedRiskFilter;
    const matchesSearch =
      attritionSearch.trim() === '' ||
      item.employee_name.toLowerCase().includes(attritionSearch.toLowerCase()) ||
      item.department_name.toLowerCase().includes(attritionSearch.toLowerCase()) ||
      item.job_title.toLowerCase().includes(attritionSearch.toLowerCase());
    return matchesRisk && matchesSearch;
  });

  // Export Columns Definition
  const executiveSummaryData = report
    ? [
        { metric: 'Total Workforce', value: report.total_workforce, details: `${report.active_headcount} active, ${report.probation_headcount} on probation` },
        { metric: 'Retention Rate', value: `${report.turnover.retention_rate}%`, details: `Annual turnover: ${report.turnover.annual_turnover_rate}%` },
        { metric: 'Voluntary Exits', value: report.turnover.voluntary_exits, details: 'In current analysis cycle' },
        { metric: 'Average Tenure', value: `${report.turnover.average_tenure_months} months`, details: `~${(report.turnover.average_tenure_months / 12).toFixed(1)} years` },
        { metric: 'High Attrition Risk Staff', value: attritionData.filter((a) => a.attrition_risk === 'high').length, details: `${attritionData.filter((a) => a.attrition_risk === 'medium').length} medium risk` },
        { metric: 'Average PTO Days / Staff', value: `${report.leave_utilization.average_days_per_employee} days`, details: 'Leave utilization benchmark' },
      ]
    : [];

  const executiveExportColumns: ExportColumn<any>[] = [
    { header: 'Key Metric', accessor: (r) => r.metric },
    { header: 'Value', accessor: (r) => r.value },
    { header: 'Details / Benchmark', accessor: (r) => r.details },
  ];

  const headcountExportColumns: ExportColumn<any>[] = [
    { header: 'Period', accessor: (p) => p.period },
    { header: 'Headcount', accessor: (p) => p.headcount },
    { header: 'New Hires', accessor: (p) => p.new_hires },
    { header: 'Departures', accessor: (p) => p.departures },
    { header: 'Net Growth', accessor: (p) => p.new_hires - p.departures },
  ];

  const leaveHealthExportColumns: ExportColumn<any>[] = [
    { header: 'Month', accessor: (m) => `${m.month} 2026` },
    { header: 'Attendance Rate (%)', accessor: (m) => `${m.attendance_rate_percentage}%` },
    { header: 'Annual Leave Days', accessor: (m) => m.annual_leave_days },
    { header: 'Sick Leave Days', accessor: (m) => m.sick_leave_days },
    { header: 'Other Leave Days', accessor: (m) => m.other_leave_days },
  ];

  const deptExportColumns: ExportColumn<any>[] = [
    { header: 'Department', accessor: (d) => d.department_name },
    { header: 'Headcount', accessor: (d) => d.headcount },
    { header: 'Workforce Share (%)', accessor: (d) => `${d.percentage_of_workforce}%` },
    { header: 'Active Staff', accessor: (d) => d.active_count },
    { header: 'On Probation', accessor: (d) => d.probation_count },
    { header: 'High Attrition Risk Count', accessor: (d) => d.high_attrition_count },
    { header: 'Average Tenure (Months)', accessor: (d) => d.average_tenure_months },
  ];

  const attritionExportColumns: ExportColumn<EmployeeAttritionAnalysis>[] = [
    { header: 'Employee Name', accessor: (a) => a.employee_name },
    { header: 'Job Title', accessor: (a) => a.job_title },
    { header: 'Department', accessor: (a) => a.department_name },
    { header: 'Tenure (Months)', accessor: (a) => a.tenure_months },
    { header: 'Risk Level', accessor: (a) => a.attrition_risk.toUpperCase() },
    { header: 'Risk Score (/100)', accessor: (a) => a.risk_score },
    {
      header: 'Absence Rate Impact',
      accessor: (a) => {
        const f = a.factors.find((x) => x.key === 'absence_rate');
        return f ? `${f.severity} (+${f.score_impact} pts) - ${f.details}` : '—';
      },
    },
    {
      header: 'Leave Pattern Impact',
      accessor: (a) => {
        const f = a.factors.find((x) => x.key === 'leave_pattern');
        return f ? `${f.severity} (+${f.score_impact} pts) - ${f.details}` : '—';
      },
    },
    {
      header: 'Tenure Progression Impact',
      accessor: (a) => {
        const f = a.factors.find((x) => x.key === 'tenure_progression');
        return f ? `${f.severity} (+${f.score_impact} pts) - ${f.details}` : '—';
      },
    },
    {
      header: 'Compensation Anomaly Impact',
      accessor: (a) => {
        const f = a.factors.find((x) => x.key === 'compensation_anomaly');
        return f ? `${f.severity} (+${f.score_impact} pts) - ${f.details}` : '—';
      },
    },
  ];

  if (loading && !report) {
    return (
      <div className="p-12 text-center text-xs text-[var(--text-secondary)] flex items-center justify-center gap-2">
        <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
        <span>Synthesizing organizational workforce analytics...</span>
      </div>
    );
  }

  return (
    <div id="analytics-page" className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
              Workforce Intelligence & Retention Analytics
            </h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Realtime talent retention indicators, headcount trajectories, and departmental performance across {organization?.name}.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ExportButton
            id="analytics-executive-export-btn"
            filename="workforce-executive-summary"
            columns={executiveExportColumns}
            data={executiveSummaryData}
            sheetName="Executive Summary"
            label="Export Summary"
          />

          <button
            id="recalculate-attrition-btn"
            onClick={handleRecalculateScores}
            disabled={recalculating}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-900 text-stone-100 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-400 ${recalculating ? 'animate-bounce' : ''}`} />
            <span>{recalculating ? 'Scoring...' : 'Recalculate Attrition Signals'}</span>
          </button>

          <button
            onClick={fetchData}
            title="Refresh analytics"
            className="p-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Top Cards */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
              <span>Total Workforce</span>
              <Users className="w-4 h-4 opacity-70" />
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{report.total_workforce}</div>
            <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 pt-1">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{report.active_headcount} active</span>
              <span>·</span>
              <span>{report.probation_headcount} probation</span>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
              <span>Annual Retention Rate</span>
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{report.turnover.retention_rate}%</div>
            <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 pt-1">
              <span>Turnover: {report.turnover.annual_turnover_rate}%</span>
              <span>·</span>
              <span>{report.turnover.voluntary_exits} voluntary exits</span>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
              <span>High Attrition Flags</span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {attritionData.filter((a) => a.attrition_risk === 'high').length}
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] pt-1">
              {attritionData.filter((a) => a.attrition_risk === 'medium').length} medium risk indicators
            </div>
          </div>

          <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
              <span>Average Tenure</span>
              <Calendar className="w-4 h-4 opacity-70" />
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {report.turnover.average_tenure_months} <span className="text-sm font-normal text-[var(--text-muted)]">mos</span>
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] pt-1">
              ~{(report.turnover.average_tenure_months / 12).toFixed(1)} years average across workspace
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Headcount Trajectory & Leave Patterns */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Headcount Progression Trend */}
          <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Headcount Progression</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Monthly workforce expansion & net talent additions</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-medium">
                  Last 6 Months
                </span>
                <ExportButton
                  id="export-headcount-trend-btn"
                  filename="headcount-progression-trend"
                  columns={headcountExportColumns}
                  data={report.headcount_trend}
                  sheetName="Headcount Trend"
                  label="Export"
                />
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {report.headcount_trend.map((point) => {
                const maxCount = Math.max(...report.headcount_trend.map((p) => p.headcount), 10);
                const barWidth = Math.round((point.headcount / maxCount) * 100);

                return (
                  <div key={point.period} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--text-primary)]">{point.period}</span>
                      <div className="flex items-center gap-3 text-[11px] text-[var(--text-secondary)]">
                        {point.new_hires > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            +{point.new_hires} hires
                          </span>
                        )}
                        {point.departures > 0 && (
                          <span className="text-rose-500 font-semibold">-{point.departures} exits</span>
                        )}
                        <span className="font-bold text-[var(--text-primary)]">{point.headcount} team members</span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                      <div
                        className="h-full bg-stone-800 dark:bg-stone-300 rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leave Utilization & Attendance Health */}
          <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Leave & PTO Health</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Monthly statutory days taken & attendance adherence</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                  Avg {report.leave_utilization.average_days_per_employee} days/staff
                </span>
                <ExportButton
                  id="export-leave-health-btn"
                  filename="leave-pto-health-report"
                  columns={leaveHealthExportColumns}
                  data={report.leave_utilization.monthly_utilization}
                  sheetName="Leave Utilization"
                  label="Export"
                />
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {report.leave_utilization.monthly_utilization.map((item) => (
                <div key={item.month} className="p-2.5 rounded-lg bg-[var(--bg-subtle)] text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-[var(--text-primary)]">{item.month} 2026</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {item.attendance_rate_percentage}% Attendance Rate
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                    <span>{item.annual_leave_days} Annual Leave Days</span>
                    <span>{item.sick_leave_days} Sick Leave Days</span>
                    <span>{item.other_leave_days} Other</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Department Breakdown Table */}
      {report && (
        <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Department Distribution & Health</h3>
              <p className="text-[11px] text-[var(--text-muted)]">Headcount weighting, probation rates, and retention velocity by unit</p>
            </div>
            <ExportButton
              id="export-department-breakdown-btn"
              filename="department-distribution-report"
              columns={deptExportColumns}
              data={report.department_breakdown}
              sheetName="Departments"
              label="Export"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-semibold">
                  <th className="pb-2.5">Department</th>
                  <th className="pb-2.5">Headcount</th>
                  <th className="pb-2.5">% of Workforce</th>
                  <th className="pb-2.5">Active</th>
                  <th className="pb-2.5">Probation</th>
                  <th className="pb-2.5">High Attrition Risk</th>
                  <th className="pb-2.5">Avg Tenure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
                {report.department_breakdown.map((dept) => (
                  <tr key={dept.department_id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="py-2.5 font-semibold flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      <span>{dept.department_name}</span>
                    </td>
                    <td className="py-2.5 font-bold">{dept.headcount}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${dept.percentage_of_workforce}%` }}
                          />
                        </div>
                        <span>{dept.percentage_of_workforce}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-emerald-600 dark:text-emerald-400 font-medium">{dept.active_count}</td>
                    <td className="py-2.5 text-amber-600 dark:text-amber-400">{dept.probation_count}</td>
                    <td className="py-2.5">
                      {dept.high_attrition_count > 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">
                          {dept.high_attrition_count} Flagged
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">0</span>
                      )}
                    </td>
                    <td className="py-2.5 text-[var(--text-secondary)]">{dept.average_tenure_months} mos</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attrition Risk Factor Analysis & Investigation Intelligence */}
      <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Predictive Attrition Risk & Factor Diagnostics
              </h3>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Rule-based scoring evaluating attendance regularity, leave burnout, tenure velocity, and compensation parity
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <ExportButton
              id="export-attrition-analysis-btn"
              filename="attrition-risk-analysis"
              columns={attritionExportColumns}
              data={filteredAttrition}
              sheetName="Attrition Risk"
              label="Export"
            />

            {/* Risk filter */}
            <select
              id="filter-attrition-risk"
              value={selectedRiskFilter}
              onChange={(e) => setSelectedRiskFilter(e.target.value)}
              className="px-2.5 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs focus:outline-none"
            >
              <option value="all">All Risk Levels</option>
              <option value="high">High Risk Only</option>
              <option value="medium">Medium Risk Only</option>
              <option value="low">Low Risk Only</option>
            </select>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Filter staff..."
                value={attritionSearch}
                onChange={(e) => setAttritionSearch(e.target.value)}
                className="pl-8 pr-3 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Attrition Table */}
        <div className="space-y-2">
          {filteredAttrition.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              No employee records match the selected attrition filters.
            </div>
          ) : (
            filteredAttrition.map((scoreItem) => {
              const isExpanded = expandedEmployeeId === scoreItem.employee_id;

              return (
                <div
                  key={scoreItem.employee_id}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] overflow-hidden transition-all"
                >
                  <div
                    onClick={() => setExpandedEmployeeId(isExpanded ? null : scoreItem.employee_id)}
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-stone-800 text-stone-100 dark:bg-stone-200 dark:text-stone-900 flex items-center justify-center font-bold text-xs shrink-0">
                        {scoreItem.employee_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {scoreItem.employee_name}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] truncate">
                          {scoreItem.job_title} · {scoreItem.department_name} ({scoreItem.tenure_months} mos tenure)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-extrabold text-[var(--text-primary)]">
                          {scoreItem.risk_score} <span className="text-[10px] font-normal text-[var(--text-muted)]">/ 100</span>
                        </div>
                        <StatusPill risk={scoreItem.attrition_risk} size="sm" />
                      </div>

                      <button
                        type="button"
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Factor Breakdown */}
                  {isExpanded && (
                    <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3 animate-in fade-in duration-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                          4-Factor Diagnostic Breakdown
                        </span>
                        <button
                          onClick={() => onSelectEmployee(scoreItem.employee_id)}
                          className="text-xs font-semibold text-[var(--accent-blue)] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open Full Employee Record</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {scoreItem.factors.map((factor) => (
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
                              <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">💡 Rec:</span>
                              <span>{factor.investigation_recommendation}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
