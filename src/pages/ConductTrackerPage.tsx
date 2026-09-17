import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ConductIncidentWithDetails,
  ConductIncidentSeverity,
  ConductIncidentStatus,
  ConductAuditLog,
  Employee,
  Department,
} from '../types';
import { Card } from '../components/Card';
import { StatusPill } from '../components/StatusPill';
import {
  ShieldAlert,
  Scale,
  Lock,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Building,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  ChevronRight,
  ArrowLeft,
  X,
  History,
  AlertCircle,
  ShieldCheck,
  Briefcase,
  UserCheck,
} from 'lucide-react';

interface ConductTrackerPageProps {
  initialEmployeeId?: string | null;
  initialIncidentId?: string | null;
  onNavigateToEmployeeProfile?: (employeeId: string) => void;
  onBackToDashboard?: () => void;
}

const INCIDENT_CATEGORIES = [
  'Harassment & Bullying',
  'Insubordination & Unprofessional Conduct',
  'Policy & Handbook Violation',
  'Fraud, Theft & Financial Misconduct',
  'Attendance & Punctuality Misconduct',
  'Conflict of Interest',
  'Health, Safety & Environment',
  'Data Breach & Confidentiality',
  'Other Disciplinary Concern',
];

const DISCIPLINARY_ACTIONS = [
  'Informal Counseling & Warning',
  'First Written Warning',
  'Final Written Warning',
  'Performance Improvement Plan (PIP)',
  'Temporary Suspension',
  'Exonerated / Allegation Unsubstantiated',
  'Employment Contract Termination',
];

export const ConductTrackerPage: React.FC<ConductTrackerPageProps> = ({
  initialEmployeeId,
  initialIncidentId,
  onNavigateToEmployeeProfile,
  onBackToDashboard,
}) => {
  const { authFetch, role, user, organization, subscribeToRealtime } = useAuth();

  // State
  const [incidents, setIncidents] = useState<ConductIncidentWithDetails[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>(initialEmployeeId || 'all');

  // Selected incident for detail view / drawer
  const [selectedIncident, setSelectedIncident] = useState<ConductIncidentWithDetails | null>(null);
  const [auditLogs, setAuditLogs] = useState<ConductAuditLog[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  // Modals
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<ConductIncidentWithDetails | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Status transition state in details drawer
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [newStatusChoice, setNewStatusChoice] = useState<ConductIncidentStatus | null>(null);
  const [transitionNotes, setTransitionNotes] = useState('');
  const [actionTakenInput, setActionTakenInput] = useState('');

  // Fetch initial data
  const fetchIncidents = useCallback(async () => {
    if (role !== 'hr_head') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [resInc, resEmp, resDept] = await Promise.all([
        authFetch('/api/conduct-incidents'),
        authFetch('/api/employees'),
        authFetch('/api/departments'),
      ]);

      if (!resInc.ok) {
        if (resInc.status === 403) {
          throw new Error('Access Denied: You do not have HR Head clearance to access employee conduct records.');
        }
        throw new Error('Failed to load employee conduct incidents');
      }

      const incidentsData = await resInc.json();
      const empData = resEmp.ok ? await resEmp.json() : [];
      const deptData = resDept.ok ? await resDept.json() : [];

      setIncidents(incidentsData);
      setEmployees(empData);
      setDepartments(deptData);

      // Auto-select initial incident if requested
      if (initialIncidentId) {
        const found = incidentsData.find((i: ConductIncidentWithDetails) => i.id === initialIncidentId);
        if (found) {
          setSelectedIncident(found);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error loading conduct tracker');
    } finally {
      setLoading(false);
    }
  }, [authFetch, role, initialIncidentId]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = subscribeToRealtime((payload) => {
      if (
        payload.event === 'conduct_incident_created' ||
        payload.event === 'conduct_incident_updated' ||
        payload.event === 'conduct_incident_deleted'
      ) {
        fetchIncidents();
        if (selectedIncident && payload.data?.incident?.id === selectedIncident.id) {
          setSelectedIncident((prev) => (prev ? { ...prev, ...payload.data.incident } : null));
          fetchAuditLogs(selectedIncident.id);
        }
      }
    });
    return unsubscribe;
  }, [subscribeToRealtime, fetchIncidents, selectedIncident]);

  // Fetch audit logs for selected incident
  const fetchAuditLogs = async (incidentId: string) => {
    try {
      setLoadingAuditLogs(true);
      const res = await authFetch(`/api/conduct-incidents/${incidentId}/audit-logs`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  const handleOpenDetail = (incident: ConductIncidentWithDetails) => {
    setSelectedIncident(incident);
    setActionTakenInput(incident.action_taken || '');
    setNewStatusChoice(null);
    setTransitionNotes('');
    fetchAuditLogs(incident.id);
  };

  const handleStatusTransition = async (newStatus: ConductIncidentStatus) => {
    if (!selectedIncident) return;

    try {
      setIsTransitioning(true);
      const res = await authFetch(`/api/conduct-incidents/${selectedIncident.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          status_change_notes: transitionNotes || `Status updated to ${newStatus.toUpperCase()} by HR Head.`,
          action_taken: actionTakenInput || selectedIncident.action_taken,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update incident status');
      }

      const updated = await res.json();
      setSelectedIncident(updated);
      setIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setActionSuccess(`Case status moved to ${newStatus.toUpperCase()}`);
      setNewStatusChoice(null);
      setTransitionNotes('');
      fetchAuditLogs(updated.id);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleSaveActionTaken = async () => {
    if (!selectedIncident) return;

    try {
      setIsTransitioning(true);
      const res = await authFetch(`/api/conduct-incidents/${selectedIncident.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_taken: actionTakenInput,
          status_change_notes: `Documented disciplinary outcome: "${actionTakenInput}"`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save action');
      }

      const updated = await res.json();
      setSelectedIncident(updated);
      setIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setActionSuccess('Disciplinary action recorded successfully');
      fetchAuditLogs(updated.id);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update action');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleDeleteIncident = async (incidentId: string) => {
    if (!confirm('Are you sure you want to permanently delete this confidential conduct record? This action will be audited and cannot be undone.')) {
      return;
    }

    try {
      const res = await authFetch(`/api/conduct-incidents/${incidentId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete incident');
      }

      setIncidents((prev) => prev.filter((i) => i.id !== incidentId));
      if (selectedIncident?.id === incidentId) {
        setSelectedIncident(null);
      }
      setActionSuccess('Conduct record permanently deleted');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error deleting incident');
    }
  };

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((i) => {
      // Employee filter
      if (employeeFilter !== 'all' && i.related_employee_id !== employeeFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && i.status !== statusFilter) {
        return false;
      }
      // Severity filter
      if (severityFilter !== 'all' && i.severity !== severityFilter) {
        return false;
      }
      // Category filter
      if (typeFilter !== 'all' && i.incident_type.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const empName = i.employee_name?.toLowerCase() || '';
        const desc = i.description?.toLowerCase() || '';
        const reporter = i.reporter?.toLowerCase() || '';
        const witnesses = i.witnesses?.toLowerCase() || '';
        const action = i.action_taken?.toLowerCase() || '';
        const category = i.incident_type?.toLowerCase() || '';
        return (
          empName.includes(q) ||
          desc.includes(q) ||
          reporter.includes(q) ||
          witnesses.includes(q) ||
          action.includes(q) ||
          category.includes(q)
        );
      }
      return true;
    });
  }, [incidents, employeeFilter, statusFilter, severityFilter, typeFilter, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const total = incidents.length;
    const openAndInvestigating = incidents.filter((i) => i.status === 'open' || i.status === 'investigating').length;
    const highSeverity = incidents.filter((i) => i.severity === 'high').length;
    const resolvedOrClosed = incidents.filter((i) => i.status === 'resolved' || i.status === 'closed').length;
    return { total, openAndInvestigating, highSeverity, resolvedOrClosed };
  }, [incidents]);

  // Strict role check barrier
  if (role !== 'hr_head') {
    return (
      <div className="p-12 max-w-2xl mx-auto text-center space-y-6 animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
            Restricted Confidential Module
          </h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
            The Employee Conduct & Disciplinary Tracker is strictly confidential and restricted to the{' '}
            <span className="font-semibold text-rose-600 dark:text-rose-400">HR Head</span>. HR Analysts and
            standard team members cannot view, query, or log disciplinary records.
          </p>
        </div>
        {onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Return to Dashboard
          </button>
        )}
      </div>
    );
  }

  return (
    <div id="conduct-tracker-page" className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Employee Conduct Tracker
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300">
              <Lock className="w-3 h-3" />
              <span>HR Head Clearance Only</span>
            </div>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Confidential disciplinary case management, workplace investigations, and statutory audit records for {organization?.name}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onBackToDashboard && (
            <button
              id="conduct-back-dashboard-btn"
              onClick={onBackToDashboard}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
          )}

          <button
            id="conduct-log-incident-btn"
            onClick={() => setIsLogModalOpen(true)}
            className="px-3.5 py-2 text-xs font-medium rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Conduct Incident</span>
          </button>
        </div>
      </div>

      {/* Action Toast */}
      {actionSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-xs font-medium hover:opacity-75 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cases */}
        <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Recorded</span>
            <div className="p-1.5 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-primary)]">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {loading ? '-' : metrics.total}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">
            Lifetime logged cases
          </div>
        </div>

        {/* Open & Under Investigation */}
        <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Investigations</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {loading ? '-' : metrics.openAndInvestigating}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">
            Open or investigating
          </div>
        </div>

        {/* High Severity */}
        <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">High Severity</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {loading ? '-' : metrics.highSeverity}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">
            Requiring immediate escalation
          </div>
        </div>

        {/* Resolved / Closed */}
        <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Resolved & Closed</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {loading ? '-' : metrics.resolvedOrClosed}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">
            Action documented & audited
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="conduct-search-input"
              type="text"
              placeholder="Search description, employee, reporter, witnesses, or disciplinary action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)]"
            />
          </div>

          {/* Quick Filter Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Employee Filter */}
            <select
              id="conduct-filter-employee"
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="all">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.job_title})
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              id="conduct-filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            {/* Severity Filter */}
            <select
              id="conduct-filter-severity"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="all">All Severities</option>
              <option value="high">High Severity</option>
              <option value="medium">Medium Severity</option>
              <option value="low">Low Severity</option>
            </select>

            {/* Category Filter */}
            <select
              id="conduct-filter-category"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none cursor-pointer max-w-[200px]"
            >
              <option value="all">All Categories</option>
              {INCIDENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {(employeeFilter !== 'all' || statusFilter !== 'all' || severityFilter !== 'all' || typeFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setEmployeeFilter('all');
                  setStatusFilter('all');
                  setSeverityFilter('all');
                  setTypeFilter('all');
                  setSearchQuery('');
                }}
                className="px-2 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] rounded-lg transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {employeeFilter !== 'all' && (
          <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-subtle)] text-xs text-[var(--accent-blue)]">
            <span>Filtered for employee:</span>
            <span className="font-semibold">
              {employees.find((e) => e.id === employeeFilter)?.name || employeeFilter}
            </span>
            <button
              onClick={() => setEmployeeFilter('all')}
              className="ml-auto text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Show all employees
            </button>
          </div>
        )}
      </div>

      {/* Main Incidents Table */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <h2 className="font-semibold text-sm text-[var(--text-primary)]">Disciplinary Incident Records</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] font-medium">
              {filteredIncidents.length} {filteredIncidents.length === 1 ? 'case' : 'cases'}
            </span>
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">
            Ordered by report date (newest first)
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--text-secondary)]">
            Loading confidential conduct records...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-red-500 space-y-2">
            <AlertCircle className="w-6 h-6 mx-auto text-red-500" />
            <div>{error}</div>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
            <div className="text-sm font-semibold text-[var(--text-primary)]">No Conduct Incidents Found</div>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
              There are no conduct or disciplinary records matching your selected filter criteria.
            </p>
            <button
              onClick={() => setIsLogModalOpen(true)}
              className="mt-2 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log First Incident</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)] uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="px-6 py-3">Case / Severity</th>
                  <th className="px-4 py-3">Related Employee</th>
                  <th className="px-4 py-3">Category & Summary</th>
                  <th className="px-4 py-3">Reporter & Date</th>
                  <th className="px-4 py-3">Investigation Status</th>
                  <th className="px-4 py-3">Disciplinary Outcome</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredIncidents.map((incident) => {
                  const isHigh = incident.severity === 'high';
                  const isMedium = incident.severity === 'medium';
                  const isOpen = incident.status === 'open';
                  const isInvestigating = incident.status === 'investigating';
                  const isResolved = incident.status === 'resolved';

                  return (
                    <tr
                      key={incident.id}
                      id={`conduct-row-${incident.id}`}
                      className="hover:bg-[var(--bg-subtle)] transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetail(incident)}
                    >
                      {/* Case ID & Severity */}
                      <td className="px-6 py-4 align-top whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="font-mono text-[11px] text-[var(--text-muted)]">
                            #{incident.id.slice(-6).toUpperCase()}
                          </div>
                          <StatusPill
                            variant={isHigh ? 'red' : isMedium ? 'amber' : 'green'}
                            label={incident.severity.toUpperCase()}
                          />
                        </div>
                      </td>

                      {/* Related Employee */}
                      <td className="px-4 py-4 align-top whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors flex items-center gap-1.5">
                            <span>{incident.employee_name}</span>
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)]">
                            {incident.employee_job_title}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            {incident.department_name}
                          </div>
                        </div>
                      </td>

                      {/* Category & Description preview */}
                      <td className="px-4 py-4 align-top max-w-[280px]">
                        <div className="space-y-1">
                          <span className="inline-block text-[11px] font-medium text-[var(--text-primary)] bg-[var(--bg-subtle)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                            {incident.incident_type}
                          </span>
                          <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                            {incident.description}
                          </p>
                        </div>
                      </td>

                      {/* Reporter & Date */}
                      <td className="px-4 py-4 align-top whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-medium text-[var(--text-primary)]">
                            {incident.date_reported}
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] truncate max-w-[150px]">
                            By: {incident.reporter}
                          </div>
                          {incident.witnesses && (
                            <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[150px]">
                              Witness: {incident.witnesses}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 align-top whitespace-nowrap">
                        <StatusPill
                          variant={
                            isResolved
                              ? 'green'
                              : isOpen || isInvestigating
                              ? 'amber'
                              : 'gray'
                          }
                          label={incident.status.toUpperCase()}
                          pulseDot={isInvestigating}
                        />
                        <div className="text-[10px] text-[var(--text-muted)] mt-1 truncate max-w-[130px]">
                          Lead: {incident.investigation_owner.split('@')[0]}
                        </div>
                      </td>

                      {/* Action Taken */}
                      <td className="px-4 py-4 align-top max-w-[200px]">
                        {incident.action_taken ? (
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg line-clamp-2">
                            {incident.action_taken}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[var(--text-muted)] italic">
                            Pending investigation outcome
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 align-top text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`conduct-view-btn-${incident.id}`}
                            onClick={() => handleOpenDetail(incident)}
                            className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                            title="Open case dossier & audit trail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`conduct-edit-btn-${incident.id}`}
                            onClick={() => {
                              setEditingIncident(incident);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                            title="Edit incident details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`conduct-delete-btn-${incident.id}`}
                            onClick={() => handleDeleteIncident(incident.id)}
                            className="p-1.5 rounded-md hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                            title="Delete incident"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Case Dossier & Audit History Modal / Drawer */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div
            id="conduct-detail-modal"
            className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden my-8"
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-subtle)]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      Case #{selectedIncident.id.slice(-6).toUpperCase()} — {selectedIncident.incident_type}
                    </h3>
                    <StatusPill
                      variant={
                        selectedIncident.severity === 'high'
                          ? 'red'
                          : selectedIncident.severity === 'medium'
                          ? 'amber'
                          : 'green'
                      }
                      label={`${selectedIncident.severity.toUpperCase()} SEVERITY`}
                    />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Reported on {selectedIncident.date_reported} by {selectedIncident.reporter}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedIncident(null)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Employee & Case Context Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                    Subject Employee
                  </span>
                  <div className="font-bold text-sm text-[var(--text-primary)] mt-0.5 flex items-center gap-1.5">
                    <span>{selectedIncident.employee_name}</span>
                    {onNavigateToEmployeeProfile && (
                      <button
                        onClick={() => onNavigateToEmployeeProfile(selectedIncident.related_employee_id)}
                        className="text-xs text-[var(--accent-blue)] hover:underline cursor-pointer"
                        title="View employee profile"
                      >
                        (Profile)
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {selectedIncident.employee_job_title} · {selectedIncident.department_name}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                    Investigation Lead
                  </span>
                  <div className="font-semibold text-xs text-[var(--text-primary)] mt-0.5">
                    {selectedIncident.investigation_owner}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Logged by: {selectedIncident.created_by_email?.split('@')[0]}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                    Witnesses & Evidence
                  </span>
                  <div className="text-xs text-[var(--text-primary)] mt-0.5">
                    {selectedIncident.witnesses || 'None documented'}
                  </div>
                </div>
              </div>

              {/* Full Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Incident Description & Occurrence Summary
                </h4>
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                  {selectedIncident.description}
                </div>
              </div>

              {/* Investigation Workflow Progression */}
              <div className="space-y-3 p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>Investigation Workflow Stage</span>
                  </h4>
                  <StatusPill
                    variant={
                      selectedIncident.status === 'resolved'
                        ? 'green'
                        : selectedIncident.status === 'open' || selectedIncident.status === 'investigating'
                        ? 'amber'
                        : 'gray'
                    }
                    label={`Current: ${selectedIncident.status.toUpperCase()}`}
                    pulseDot={selectedIncident.status === 'investigating'}
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {(['open', 'investigating', 'resolved', 'closed'] as ConductIncidentStatus[]).map((st) => {
                    const isCurrent = selectedIncident.status === st;
                    return (
                      <button
                        key={st}
                        id={`status-btn-${st}`}
                        disabled={isCurrent || isTransitioning}
                        onClick={() => setNewStatusChoice(st)}
                        className={`p-2.5 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer disabled:cursor-default ${
                          isCurrent
                            ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold shadow-2xs'
                            : newStatusChoice === st
                            ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold'
                            : 'border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <div className="capitalize">{st}</div>
                        {isCurrent && <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">Active</div>}
                      </button>
                    );
                  })}
                </div>

                {/* Transition confirmation box if user clicked a new status */}
                {newStatusChoice && newStatusChoice !== selectedIncident.status && (
                  <div className="mt-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3 animate-in fade-in">
                    <div className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Transition Case Status to: {newStatusChoice.toUpperCase()}</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                        Reason / Progress Note (Will be saved to permanent audit log)
                      </label>
                      <input
                        type="text"
                        placeholder="E.g., Preliminary witness statements taken; formal inquiry concluded."
                        value={transitionNotes}
                        onChange={(e) => setTransitionNotes(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => {
                          setNewStatusChoice(null);
                          setTransitionNotes('');
                        }}
                        className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleStatusTransition(newStatusChoice)}
                        disabled={isTransitioning}
                        className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isTransitioning ? 'Updating...' : `Confirm Move to ${newStatusChoice.toUpperCase()}`}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Documented Disciplinary Action Taken */}
              <div className="space-y-3 p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Disciplinary & Corrective Outcome</span>
                  </h4>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-[var(--text-muted)]">Quick standard outcomes:</span>
                    {DISCIPLINARY_ACTIONS.slice(0, 4).map((act) => (
                      <button
                        key={act}
                        type="button"
                        onClick={() => setActionTakenInput(act)}
                        className="px-2 py-0.5 text-[10px] rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        {act}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Document the formal disciplinary decision, sanction, warning notice, or remediation plan..."
                    value={actionTakenInput}
                    onChange={(e) => setActionTakenInput(e.target.value)}
                    className="w-full p-3 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)]"
                  />

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveActionTaken}
                      disabled={isTransitioning || actionTakenInput === (selectedIncident.action_taken || '')}
                      className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-all cursor-pointer disabled:opacity-40"
                    >
                      Save Disciplinary Action
                    </button>
                  </div>
                </div>
              </div>

              {/* Audit Log Timeline */}
              <div className="space-y-3 p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-purple-500" />
                    <span>Case Audit History & Progression Timeline</span>
                  </h4>
                  <span className="text-[10px] text-[var(--text-muted)]">Permanent tamper-evident trail</span>
                </div>

                {loadingAuditLogs ? (
                  <div className="p-4 text-center text-xs text-[var(--text-secondary)]">
                    Loading audit trail...
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[var(--text-muted)] italic">
                    No prior state transitions recorded.
                  </div>
                ) : (
                  <div className="space-y-3 divide-y divide-[var(--border-subtle)]">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="pt-3 first:pt-0 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[var(--text-primary)]">
                              {log.actor_name}
                            </span>
                            <StatusPill role={log.actor_role} label={log.actor_role.toUpperCase()} />
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div className="text-xs text-[var(--text-secondary)]">
                          {log.previous_status ? (
                            <span>
                              Changed status from <strong className="uppercase">{log.previous_status}</strong> to{' '}
                              <strong className="uppercase text-blue-600 dark:text-blue-400">{log.new_status}</strong>
                            </span>
                          ) : (
                            <span>Initial incident logged (Status: <strong className="uppercase">{log.new_status}</strong>)</span>
                          )}
                        </div>

                        {log.notes && (
                          <div className="text-[11px] text-[var(--text-muted)] italic bg-[var(--bg-subtle)] p-2 rounded-md">
                            "{log.notes}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-subtle)]">
              <button
                onClick={() => handleDeleteIncident(selectedIncident.id)}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Record</span>
              </button>

              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-all cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Conduct Incident Modal */}
      {isLogModalOpen && (
        <LogIncidentModal
          employees={employees}
          departments={departments}
          currentUserEmail={user?.email || ''}
          onClose={() => setIsLogModalOpen(false)}
          onSuccess={(created) => {
            setIncidents((prev) => [created, ...prev]);
            setIsLogModalOpen(false);
            setActionSuccess(`Conduct incident #${created.id.slice(-6).toUpperCase()} logged successfully.`);
            setTimeout(() => setActionSuccess(null), 4000);
          }}
        />
      )}

      {/* Edit Conduct Incident Modal */}
      {isEditModalOpen && editingIncident && (
        <EditIncidentModal
          incident={editingIncident}
          departments={departments}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingIncident(null);
          }}
          onSuccess={(updated) => {
            setIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            if (selectedIncident?.id === updated.id) {
              setSelectedIncident(updated);
            }
            setIsEditModalOpen(false);
            setEditingIncident(null);
            setActionSuccess(`Incident #${updated.id.slice(-6).toUpperCase()} updated.`);
            setTimeout(() => setActionSuccess(null), 4000);
          }}
        />
      )}
    </div>
  );
};

// ======================================================================
// Modal: Log Conduct Incident
// ======================================================================

interface LogIncidentModalProps {
  employees: Employee[];
  departments: Department[];
  currentUserEmail: string;
  onClose: () => void;
  onSuccess: (incident: ConductIncidentWithDetails) => void;
}

const LogIncidentModal: React.FC<LogIncidentModalProps> = ({
  employees,
  departments,
  currentUserEmail,
  onClose,
  onSuccess,
}) => {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [relatedEmployeeId, setRelatedEmployeeId] = useState('');
  const [dateReported, setDateReported] = useState(new Date().toISOString().split('T')[0]);
  const [reporter, setReporter] = useState('');
  const [witnesses, setWitnesses] = useState('');
  const [incidentType, setIncidentType] = useState(INCIDENT_CATEGORIES[0]);
  const [customIncidentType, setCustomIncidentType] = useState('');
  const [severity, setSeverity] = useState<ConductIncidentSeverity>('medium');
  const [description, setDescription] = useState('');
  const [investigationOwner, setInvestigationOwner] = useState(currentUserEmail);
  const [initialStatus, setInitialStatus] = useState<ConductIncidentStatus>('open');
  const [actionTaken, setActionTaken] = useState('');

  // Auto-detect department when employee is selected
  const handleEmployeeChange = (empId: string) => {
    setRelatedEmployeeId(empId);
    if (fieldErrors.relatedEmployeeId) {
      setFieldErrors((prev) => ({ ...prev, relatedEmployeeId: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side field validations
    const errors: Record<string, string> = {};
    if (!relatedEmployeeId) {
      errors.relatedEmployeeId = 'Please select the employee involved.';
    }

    if (!dateReported) {
      errors.dateReported = 'Please specify the date this incident was reported.';
    }

    if (!reporter.trim()) {
      errors.reporter = 'Please provide the reporter name or role.';
    } else if (reporter.trim().length > 100) {
      errors.reporter = 'Reporter cannot exceed 100 characters.';
    }

    if (witnesses && witnesses.length > 200) {
      errors.witnesses = 'Witnesses details cannot exceed 200 characters.';
    }

    if (incidentType === 'Other Disciplinary Concern' && !customIncidentType.trim()) {
      errors.customIncidentType = 'Please specify the custom incident category.';
    } else if (customIncidentType && customIncidentType.length > 100) {
      errors.customIncidentType = 'Category cannot exceed 100 characters.';
    }

    if (!description.trim()) {
      errors.description = 'Please provide a thorough description of the incident.';
    } else if (description.trim().length > 3000) {
      errors.description = 'Description cannot exceed 3,000 characters.';
    }

    if (investigationOwner && investigationOwner.length > 120) {
      errors.investigationOwner = 'Investigation lead cannot exceed 120 characters.';
    }

    if (actionTaken && actionTaken.length > 1000) {
      errors.actionTaken = 'Action taken cannot exceed 1,000 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    const typeFinal = incidentType === 'Other Disciplinary Concern' && customIncidentType.trim()
      ? customIncidentType.trim()
      : incidentType;

    try {
      setLoading(true);
      setError(null);

      const res = await authFetch('/api/conduct-incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          related_employee_id: relatedEmployeeId,
          date_reported: dateReported,
          reporter: reporter.trim(),
          witnesses: witnesses.trim(),
          incident_type: typeFinal,
          severity,
          description: description.trim(),
          status: initialStatus,
          investigation_owner: investigationOwner.trim() || currentUserEmail,
          action_taken: actionTaken.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to log conduct incident');
      }

      onSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Error logging incident');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-[var(--text-primary)]">Log Workplace Conduct Incident</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Employee & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="log-conduct-employee-select" className="text-xs font-semibold text-[var(--text-primary)]">
                Subject Employee <span className="text-red-500">*</span>
              </label>
              <select
                id="log-conduct-employee-select"
                value={relatedEmployeeId}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                required
                aria-invalid={!!fieldErrors.relatedEmployeeId}
                aria-describedby={fieldErrors.relatedEmployeeId ? "log-conduct-employee-error" : undefined}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                  fieldErrors.relatedEmployeeId
                    ? 'border-rose-500 focus:border-rose-600'
                    : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
                }`}
              >
                <option value="">Select Employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — {emp.job_title} ({emp.country})
                  </option>
                ))}
              </select>
              {fieldErrors.relatedEmployeeId && (
                <p id="log-conduct-employee-error" className="text-[11px] text-rose-500 font-medium mt-0.5">
                  {fieldErrors.relatedEmployeeId}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="log-conduct-date" className="text-xs font-semibold text-[var(--text-primary)]">
                Date Reported <span className="text-red-500">*</span>
              </label>
              <input
                id="log-conduct-date"
                type="date"
                value={dateReported}
                onChange={(e) => {
                  setDateReported(e.target.value);
                  if (fieldErrors.dateReported) {
                    setFieldErrors((prev) => ({ ...prev, dateReported: '' }));
                  }
                }}
                required
                aria-invalid={!!fieldErrors.dateReported}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                  fieldErrors.dateReported
                    ? 'border-rose-500 focus:border-rose-600'
                    : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
                }`}
              />
              {fieldErrors.dateReported && (
                <p id="log-conduct-date-error" className="text-[11px] text-rose-500 font-medium mt-0.5">
                  {fieldErrors.dateReported}
                </p>
              )}
            </div>
          </div>

          {/* Reporter & Witnesses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="log-conduct-reporter" className="text-xs font-semibold text-[var(--text-primary)]">
                  Reported By <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-[var(--text-muted)]">{reporter.length}/100</span>
              </div>
              <input
                id="log-conduct-reporter"
                type="text"
                maxLength={100}
                placeholder="E.g., Anonymous Whistleblower, Jane Doe, Line Manager"
                value={reporter}
                onChange={(e) => {
                  setReporter(e.target.value);
                  if (fieldErrors.reporter) {
                    setFieldErrors((prev) => ({ ...prev, reporter: '' }));
                  }
                }}
                required
                aria-invalid={!!fieldErrors.reporter}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                  fieldErrors.reporter
                    ? 'border-rose-500 focus:border-rose-600'
                    : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
                }`}
              />
              {fieldErrors.reporter && (
                <p id="log-conduct-reporter-error" className="text-[11px] text-rose-500 font-medium mt-0.5">
                  {fieldErrors.reporter}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="log-conduct-witnesses" className="text-xs font-semibold text-[var(--text-primary)]">
                  Witnesses / Corroborating Evidence
                </label>
                <span className="text-[10px] text-[var(--text-muted)]">{witnesses.length}/200</span>
              </div>
              <input
                id="log-conduct-witnesses"
                type="text"
                maxLength={200}
                placeholder="E.g., Team Members during Standup, CCTV logs"
                value={witnesses}
                onChange={(e) => {
                  setWitnesses(e.target.value);
                  if (fieldErrors.witnesses) {
                    setFieldErrors((prev) => ({ ...prev, witnesses: '' }));
                  }
                }}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                  fieldErrors.witnesses
                    ? 'border-rose-500 focus:border-rose-600'
                    : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
                }`}
              />
              {fieldErrors.witnesses && (
                <p id="log-conduct-witnesses-error" className="text-[11px] text-rose-500 font-medium mt-0.5">
                  {fieldErrors.witnesses}
                </p>
              )}
            </div>
          </div>

          {/* Category & Severity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="log-conduct-category" className="text-xs font-semibold text-[var(--text-primary)]">
                Incident Category <span className="text-red-500">*</span>
              </label>
              <select
                id="log-conduct-category"
                value={incidentType}
                onChange={(e) => {
                  setIncidentType(e.target.value);
                  if (fieldErrors.customIncidentType) {
                    setFieldErrors((prev) => ({ ...prev, customIncidentType: '' }));
                  }
                }}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
              >
                {INCIDENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {incidentType === 'Other Disciplinary Concern' && (
                <div>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="Specify custom incident category..."
                    value={customIncidentType}
                    onChange={(e) => {
                      setCustomIncidentType(e.target.value);
                      if (fieldErrors.customIncidentType) {
                        setFieldErrors((prev) => ({ ...prev, customIncidentType: '' }));
                      }
                    }}
                    className={`w-full mt-1.5 px-3 py-1.5 text-xs rounded-lg border bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none ${
                      fieldErrors.customIncidentType
                        ? 'border-rose-500'
                        : 'border-[var(--border-subtle)]'
                    }`}
                  />
                  {fieldErrors.customIncidentType && (
                    <p className="text-[11px] text-rose-500 font-medium mt-0.5">
                      {fieldErrors.customIncidentType}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-primary)]">
                Severity Rating <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as ConductIncidentSeverity[]).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    className={`py-2 text-xs font-bold uppercase rounded-lg border transition-all cursor-pointer ${
                      severity === sev
                        ? sev === 'high'
                          ? 'border-red-500 bg-red-500/15 text-red-700 dark:text-red-300'
                          : sev === 'medium'
                          ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : 'border-slate-500 bg-slate-500/15 text-slate-700 dark:text-slate-300'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="log-conduct-description" className="text-xs font-semibold text-[var(--text-primary)]">
                Thorough Occurrence Description <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-[var(--text-muted)]">{description.length}/3000</span>
            </div>
            <textarea
              id="log-conduct-description"
              rows={4}
              required
              maxLength={3000}
              placeholder="State the detailed factual account of what transpired, locations, times, statements made, and immediate actions taken..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (fieldErrors.description) {
                  setFieldErrors((prev) => ({ ...prev, description: '' }));
                }
              }}
              aria-invalid={!!fieldErrors.description}
              className={`w-full p-3 text-xs rounded-xl border bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none leading-relaxed ${
                fieldErrors.description
                  ? 'border-rose-500 focus:border-rose-600'
                  : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
              }`}
            />
            {fieldErrors.description && (
              <p id="log-conduct-desc-error" className="text-[11px] text-rose-500 font-medium mt-0.5">
                {fieldErrors.description}
              </p>
            )}
          </div>

          {/* Owner & Initial Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="log-conduct-owner" className="text-xs font-semibold text-[var(--text-primary)]">
                  Investigation Lead / Owner
                </label>
                <span className="text-[10px] text-[var(--text-muted)]">{investigationOwner.length}/120</span>
              </div>
              <input
                id="log-conduct-owner"
                type="text"
                maxLength={120}
                value={investigationOwner}
                onChange={(e) => {
                  setInvestigationOwner(e.target.value);
                  if (fieldErrors.investigationOwner) {
                    setFieldErrors((prev) => ({ ...prev, investigationOwner: '' }));
                  }
                }}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none ${
                  fieldErrors.investigationOwner
                    ? 'border-rose-500'
                    : 'border-[var(--border-subtle)] focus:border-[var(--accent-blue)]'
                }`}
              />
              {fieldErrors.investigationOwner && (
                <p className="text-[11px] text-rose-500 font-medium mt-0.5">
                  {fieldErrors.investigationOwner}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="log-conduct-initial-status" className="text-xs font-semibold text-[var(--text-primary)]">
                Initial Workflow Status
              </label>
              <select
                id="log-conduct-initial-status"
                value={initialStatus}
                onChange={(e) => setInitialStatus(e.target.value as ConductIncidentStatus)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
              >
                <option value="open">Open (Unassigned / Pending Preliminary Review)</option>
                <option value="investigating">Investigating (Active Inquiry)</option>
              </select>
            </div>
          </div>

          {/* Initial Action Taken (Optional) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-primary)]">
              Immediate Sanction or Action Taken (Optional)
            </label>
            <input
              type="text"
              placeholder="E.g., System access revoked pending inquiry; verbal counseling given."
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
            />
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Logging Incident...' : 'Record Conduct Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ======================================================================
// Modal: Edit Conduct Incident
// ======================================================================

interface EditIncidentModalProps {
  incident: ConductIncidentWithDetails;
  departments: Department[];
  onClose: () => void;
  onSuccess: (updated: ConductIncidentWithDetails) => void;
}

const EditIncidentModal: React.FC<EditIncidentModalProps> = ({
  incident,
  departments,
  onClose,
  onSuccess,
}) => {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [dateReported, setDateReported] = useState(incident.date_reported);
  const [reporter, setReporter] = useState(incident.reporter);
  const [witnesses, setWitnesses] = useState(incident.witnesses || '');
  
  const isKnownCategory = INCIDENT_CATEGORIES.includes(incident.incident_type);
  const [categorySelect, setCategorySelect] = useState(isKnownCategory ? incident.incident_type : 'Other Disciplinary Concern');
  const [customCategory, setCustomCategory] = useState(isKnownCategory ? '' : incident.incident_type);

  const [severity, setSeverity] = useState<ConductIncidentSeverity>(incident.severity);
  const [description, setDescription] = useState(incident.description);
  const [investigationOwner, setInvestigationOwner] = useState(incident.investigation_owner);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!dateReported) {
      errors.dateReported = 'Please specify the date reported.';
    }

    if (!reporter.trim()) {
      errors.reporter = 'Reporter name/role is required.';
    } else if (reporter.trim().length > 100) {
      errors.reporter = 'Reporter cannot exceed 100 characters.';
    }

    if (witnesses && witnesses.length > 200) {
      errors.witnesses = 'Witnesses cannot exceed 200 characters.';
    }

    if (categorySelect === 'Other Disciplinary Concern' && !customCategory.trim()) {
      errors.category = 'Please specify the custom category.';
    } else if (customCategory && customCategory.length > 100) {
      errors.category = 'Category cannot exceed 100 characters.';
    }

    if (!description.trim()) {
      errors.description = 'Occurrence description is required.';
    } else if (description.trim().length > 3000) {
      errors.description = 'Description cannot exceed 3,000 characters.';
    }

    if (!investigationOwner.trim()) {
      errors.investigationOwner = 'Investigation lead is required.';
    } else if (investigationOwner.trim().length > 120) {
      errors.investigationOwner = 'Investigation lead cannot exceed 120 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    const finalCategory = categorySelect === 'Other Disciplinary Concern' && customCategory.trim()
      ? customCategory.trim()
      : categorySelect;

    try {
      setLoading(true);
      setError(null);

      const res = await authFetch(`/api/conduct-incidents/${incident.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_reported: dateReported,
          reporter: reporter.trim(),
          witnesses: witnesses.trim(),
          incident_type: finalCategory,
          severity,
          description: description.trim(),
          investigation_owner: investigationOwner.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update incident');
      }

      onSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Error updating incident');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-xl shadow-xl overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-subtle)]">
          <h3 className="font-bold text-sm text-[var(--text-primary)]">
            Edit Case #{incident.id.slice(-6).toUpperCase()} Details
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="edit-conduct-date" className="text-xs font-semibold text-[var(--text-primary)]">Date Reported</label>
              <input
                id="edit-conduct-date"
                type="date"
                value={dateReported}
                onChange={(e) => {
                  setDateReported(e.target.value);
                  if (fieldErrors.dateReported) {
                    setFieldErrors((prev) => ({ ...prev, dateReported: '' }));
                  }
                }}
                required
                aria-invalid={!!fieldErrors.dateReported}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none ${
                  fieldErrors.dateReported ? 'border-rose-500' : 'border-[var(--border-subtle)]'
                }`}
              />
              {fieldErrors.dateReported && (
                <p className="text-[11px] text-rose-500 font-medium mt-0.5">{fieldErrors.dateReported}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-conduct-severity" className="text-xs font-semibold text-[var(--text-primary)]">Severity</label>
              <select
                id="edit-conduct-severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as ConductIncidentSeverity)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="edit-conduct-reporter" className="text-xs font-semibold text-[var(--text-primary)]">Reported By</label>
              <span className="text-[10px] text-[var(--text-muted)]">{reporter.length}/100</span>
            </div>
            <input
              id="edit-conduct-reporter"
              type="text"
              maxLength={100}
              value={reporter}
              onChange={(e) => {
                setReporter(e.target.value);
                if (fieldErrors.reporter) {
                  setFieldErrors((prev) => ({ ...prev, reporter: '' }));
                }
              }}
              required
              aria-invalid={!!fieldErrors.reporter}
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none ${
                fieldErrors.reporter ? 'border-rose-500' : 'border-[var(--border-subtle)]'
              }`}
            />
            {fieldErrors.reporter && (
              <p className="text-[11px] text-rose-500 font-medium mt-0.5">{fieldErrors.reporter}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="edit-conduct-witnesses" className="text-xs font-semibold text-[var(--text-primary)]">Witnesses</label>
              <span className="text-[10px] text-[var(--text-muted)]">{witnesses.length}/200</span>
            </div>
            <input
              id="edit-conduct-witnesses"
              type="text"
              maxLength={200}
              value={witnesses}
              onChange={(e) => {
                setWitnesses(e.target.value);
                if (fieldErrors.witnesses) {
                  setFieldErrors((prev) => ({ ...prev, witnesses: '' }));
                }
              }}
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none ${
                fieldErrors.witnesses ? 'border-rose-500' : 'border-[var(--border-subtle)]'
              }`}
            />
            {fieldErrors.witnesses && (
              <p className="text-[11px] text-rose-500 font-medium mt-0.5">{fieldErrors.witnesses}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="edit-conduct-category" className="text-xs font-semibold text-[var(--text-primary)]">Category</label>
            <select
              id="edit-conduct-category"
              value={categorySelect}
              onChange={(e) => {
                setCategorySelect(e.target.value);
                if (fieldErrors.category) {
                  setFieldErrors((prev) => ({ ...prev, category: '' }));
                }
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none"
            >
              {INCIDENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {categorySelect === 'Other Disciplinary Concern' && (
              <div>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Specify custom incident category..."
                  value={customCategory}
                  onChange={(e) => {
                    setCustomCategory(e.target.value);
                    if (fieldErrors.category) {
                      setFieldErrors((prev) => ({ ...prev, category: '' }));
                    }
                  }}
                  className={`w-full mt-1.5 px-3 py-1.5 text-xs rounded-lg border bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none ${
                    fieldErrors.category ? 'border-rose-500' : 'border-[var(--border-subtle)]'
                  }`}
                />
                {fieldErrors.category && (
                  <p className="text-[11px] text-rose-500 font-medium mt-0.5">{fieldErrors.category}</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="edit-conduct-description" className="text-xs font-semibold text-[var(--text-primary)]">Occurrence Description</label>
              <span className="text-[10px] text-[var(--text-muted)]">{description.length}/3000</span>
            </div>
            <textarea
              id="edit-conduct-description"
              rows={4}
              maxLength={3000}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (fieldErrors.description) {
                  setFieldErrors((prev) => ({ ...prev, description: '' }));
                }
              }}
              required
              aria-invalid={!!fieldErrors.description}
              className={`w-full p-3 text-xs rounded-xl border bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none ${
                fieldErrors.description ? 'border-rose-500' : 'border-[var(--border-subtle)]'
              }`}
            />
            {fieldErrors.description && (
              <p className="text-[11px] text-rose-500 font-medium mt-0.5">{fieldErrors.description}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="edit-conduct-owner" className="text-xs font-semibold text-[var(--text-primary)]">Investigation Owner</label>
              <span className="text-[10px] text-[var(--text-muted)]">{investigationOwner.length}/120</span>
            </div>
            <input
              id="edit-conduct-owner"
              type="text"
              maxLength={120}
              value={investigationOwner}
              onChange={(e) => {
                setInvestigationOwner(e.target.value);
                if (fieldErrors.investigationOwner) {
                  setFieldErrors((prev) => ({ ...prev, investigationOwner: '' }));
                }
              }}
              required
              aria-invalid={!!fieldErrors.investigationOwner}
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none ${
                fieldErrors.investigationOwner ? 'border-rose-500' : 'border-[var(--border-subtle)]'
              }`}
            />
            {fieldErrors.investigationOwner && (
              <p className="text-[11px] text-rose-500 font-medium mt-0.5">{fieldErrors.investigationOwner}</p>
            )}
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
