import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { OrgNode, Department, Employee } from '../types';
import { StatusPill } from '../components/StatusPill';
import { ReassignEmployeeModal } from '../components/ReassignEmployeeModal';
import {
  Network,
  Users,
  Building,
  Globe,
  ChevronDown,
  ChevronRight,
  UserCheck,
  Edit3,
  RefreshCw,
  Search,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  X,
  UserPlus,
  GitBranch,
} from 'lucide-react';

interface OrgChartPageProps {
  onSelectEmployee: (employeeId: string) => void;
}

interface TreeNodeCardProps {
  node: OrgNode;
  allEmployees: Employee[];
  onSelectEmployee: (id: string) => void;
  onOpenChangeManager: (employee: OrgNode) => void;
  onOpenReassign: (employee: OrgNode) => void;
  canReassign: boolean;
  collapsedIds: Set<string>;
  toggleCollapse: (id: string) => void;
  searchTerm: string;
}

const TreeNodeCard: React.FC<TreeNodeCardProps> = ({
  node,
  allEmployees,
  onSelectEmployee,
  onOpenChangeManager,
  onOpenReassign,
  canReassign,
  collapsedIds,
  toggleCollapse,
  searchTerm,
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isCollapsed = collapsedIds.has(node.id);
  const isMatch =
    searchTerm.trim() !== '' &&
    (node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.department_name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div
        id={`org-node-${node.id}`}
        className={`w-64 rounded-xl border transition-all duration-150 p-3.5 bg-[var(--bg-surface)] relative group shadow-2xs ${
          isMatch
            ? 'ring-2 ring-amber-500 border-amber-500/50 dark:border-amber-400/50'
            : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-stone-800 text-stone-100 dark:bg-stone-200 dark:text-stone-900 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              {node.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div
                onClick={() => onSelectEmployee(node.id)}
                className="text-xs font-bold text-[var(--text-primary)] truncate hover:text-[var(--accent-blue)] cursor-pointer"
                title={node.name}
              >
                {node.name}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] truncate" title={node.job_title}>
                {node.job_title}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {canReassign && (
              <button
                id={`org-reassign-btn-${node.id}`}
                onClick={() => onOpenReassign(node)}
                title="Reassign / Promote"
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--accent-blue)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              >
                <GitBranch className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onOpenChangeManager(node)}
              title="Reassign Reporting Manager"
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-opacity cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
          <div className="flex items-center gap-1 truncate max-w-[130px]">
            <Building className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
            <span className="truncate">{node.department_name}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Globe className="w-3 h-3 text-[var(--text-muted)]" />
            <span>{node.country}</span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1">
            <StatusPill status={node.status} size="sm" />
            {node.attrition_risk === 'high' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                Risk
              </span>
            )}
          </div>

          {hasChildren && (
            <button
              onClick={() => toggleCollapse(node.id)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
            >
              <Users className="w-3 h-3" />
              <span>{node.direct_reports_count || node.children.length}</span>
              {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Downward Connector Line */}
      {hasChildren && !isCollapsed && (
        <>
          <div className="w-px h-6 bg-[var(--border-strong)]" />
          <div className="flex items-start justify-center relative pt-4">
            {/* Horizontal branch bar spanning children if more than 1 */}
            {node.children.length > 1 && (
              <div
                className="absolute top-0 h-px bg-[var(--border-strong)]"
                style={{
                  left: 'calc(50% / ' + node.children.length + ')',
                  right: 'calc(50% / ' + node.children.length + ')',
                }}
              />
            )}
            <div className="flex items-start gap-8">
              {node.children.map((child) => (
                <div key={child.id} className="flex flex-col items-center relative">
                  {/* Top stem connector */}
                  <div className="w-px h-4 bg-[var(--border-strong)] -mt-4 mb-0" />
                  <TreeNodeCard
                    node={child}
                    allEmployees={allEmployees}
                    onSelectEmployee={onSelectEmployee}
                    onOpenChangeManager={onOpenChangeManager}
                    onOpenReassign={onOpenReassign}
                    canReassign={canReassign}
                    collapsedIds={collapsedIds}
                    toggleCollapse={toggleCollapse}
                    searchTerm={searchTerm}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const OrgChartPage: React.FC<OrgChartPageProps> = ({ onSelectEmployee }) => {
  const { authFetch, organization, role, subscribeToRealtime } = useAuth();
  const [treeNodes, setTreeNodes] = useState<OrgNode[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // Manager Reassignment Modal State
  const [targetEmployee, setTargetEmployee] = useState<OrgNode | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [updatingManager, setUpdatingManager] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Milestone 6: Full Reassign / Promotion Modal State
  const [reassignTargetNode, setReassignTargetNode] = useState<OrgNode | null>(null);
  const [reassignToast, setReassignToast] = useState<string | null>(null);

  const fetchChartData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedDepartment !== 'all') params.append('department_id', selectedDepartment);
      if (selectedCountry !== 'all') params.append('country', selectedCountry);

      const [resTree, resEmps, resDepts] = await Promise.all([
        authFetch(`/api/org-chart?${params.toString()}`),
        authFetch('/api/employees'),
        authFetch('/api/departments'),
      ]);

      if (resTree.ok) {
        const data = await resTree.json();
        setTreeNodes(data.root_nodes || []);
      } else {
        throw new Error('Failed to load organizational hierarchy');
      }

      if (resEmps.ok) {
        const empData = await resEmps.json();
        setAllEmployees(empData || []);
      }

      if (resDepts.ok) {
        const deptData = await resDepts.json();
        setDepartments(deptData || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading org chart');
    } finally {
      setLoading(false);
    }
  }, [authFetch, selectedDepartment, selectedCountry]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  // Realtime subscription
  useEffect(() => {
    const unsub = subscribeToRealtime((payload) => {
      if (
        payload.event === 'org_chart_updated' ||
        payload.event === 'employee_changed' ||
        payload.event === 'employee_created' ||
        payload.event === 'employee_updated'
      ) {
        fetchChartData();
      }
    });
    return unsub;
  }, [subscribeToRealtime, fetchChartData]);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => setCollapsedIds(new Set());
  const collapseAll = () => {
    const ids = new Set<string>();
    const traverse = (node: OrgNode) => {
      if (node.children && node.children.length > 0) {
        ids.add(node.id);
        node.children.forEach(traverse);
      }
    };
    treeNodes.forEach(traverse);
    setCollapsedIds(ids);
  };

  const handleOpenChangeManager = (node: OrgNode) => {
    setTargetEmployee(node);
    setSelectedManagerId(node.manager_id || '');
    setUpdateError(null);
  };

  const handleSaveManager = async () => {
    if (!targetEmployee) return;

    try {
      setUpdatingManager(true);
      setUpdateError(null);

      const res = await authFetch(`/api/employees/${targetEmployee.id}/manager`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manager_id: selectedManagerId || null }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update manager');
      }

      setTargetEmployee(null);
      fetchChartData();
    } catch (err: any) {
      setUpdateError(err.message);
    } finally {
      setUpdatingManager(false);
    }
  };

  // Extract unique countries
  const countries = Array.from(new Set(allEmployees.map((e) => e.country))).filter(Boolean);

  return (
    <div id="org-chart-page" className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
              Organizational Hierarchy & Tree
            </h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Visual reporting lines, department leaders, and direct report structures across {organization?.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Collapse All
          </button>
          <button
            onClick={fetchChartData}
            title="Refresh tree"
            className="p-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {reassignToast && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{reassignToast}</span>
          </div>
          <button
            onClick={() => setReassignToast(null)}
            className="text-xs hover:opacity-75 font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Control Bar: Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Building className="w-3.5 h-3.5" />
            <select
              id="filter-org-department"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-2.5 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)]"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Country Filter */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Globe className="w-3.5 h-3.5" />
            <select
              id="filter-org-country"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="px-2.5 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)]"
            >
              <option value="all">All Locations</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            id="org-search-input"
            type="text"
            placeholder="Highlight employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)]"
          />
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div
        id="org-chart-canvas"
        className="p-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] overflow-x-auto min-h-[480px] flex items-center justify-center"
      >
        {loading ? (
          <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            <span>Constructing organizational graph...</span>
          </div>
        ) : error ? (
          <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : treeNodes.length === 0 ? (
          <div className="text-center space-y-2 text-xs text-[var(--text-secondary)]">
            <Network className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
            <div>No matching organizational hierarchy found for the selected filters.</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8 min-w-max py-4">
            {treeNodes.map((root) => (
              <TreeNodeCard
                key={root.id}
                node={root}
                allEmployees={allEmployees}
                onSelectEmployee={onSelectEmployee}
                onOpenChangeManager={handleOpenChangeManager}
                onOpenReassign={(node) => setReassignTargetNode(node)}
                canReassign={role === 'hr_head'}
                collapsedIds={collapsedIds}
                toggleCollapse={toggleCollapse}
                searchTerm={searchTerm}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reassign Reporting Manager Modal */}
      {targetEmployee && (
        <div
          id="reassign-manager-modal"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--popover-shadow)] p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Reassign Reporting Line</h3>
              </div>
              <button
                onClick={() => setTargetEmployee(null)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-[var(--text-secondary)]">
              Specify who <strong className="text-[var(--text-primary)]">{targetEmployee.name}</strong> reports to
              within {organization?.name}.
            </div>

            {updateError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{updateError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-primary)]">Reporting Manager</label>
              <select
                id="select-reporting-manager"
                value={selectedManagerId}
                onChange={(e) => setSelectedManagerId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="">None (Top Executive / Independent Lead)</option>
                {allEmployees
                  .filter((e) => e.id !== targetEmployee.id && e.status !== 'offboarded')
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} — {e.job_title} ({e.country})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setTargetEmployee(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="save-reporting-manager-btn"
                onClick={handleSaveManager}
                disabled={updatingManager}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-stone-900 text-stone-100 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {updatingManager && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                <span>Save Reporting Line</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Reassign / Promotion Modal (HR Head only) */}
      {reassignTargetNode && role === 'hr_head' && (
        <ReassignEmployeeModal
          isOpen={!!reassignTargetNode}
          onClose={() => setReassignTargetNode(null)}
          employee={
            allEmployees.find((e) => e.id === reassignTargetNode.id) || {
              id: reassignTargetNode.id,
              company_id: organization?.id || '',
              name: reassignTargetNode.name,
              department_id: reassignTargetNode.department_id,
              job_title: reassignTargetNode.job_title,
              employment_type: 'full_time' as const,
              country: reassignTargetNode.country,
              start_date: new Date().toISOString().split('T')[0],
              status: reassignTargetNode.status,
              attrition_risk: reassignTargetNode.attrition_risk,
              manager_id: reassignTargetNode.manager_id,
            }
          }
          departments={departments}
          allEmployees={allEmployees}
          onReassigned={(reason) => {
            fetchChartData();
            setReassignToast(
              `Successfully updated role for ${reassignTargetNode.name} (${reason}).`
            );
            setTimeout(() => setReassignToast(null), 5000);
          }}
        />
      )}
    </div>
  );
};
