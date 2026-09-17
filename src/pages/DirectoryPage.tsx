import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Employee, Department, EmployeeStatus, EmploymentType } from '../types';
import { StatusPill } from '../components/StatusPill';
import { ExportButton } from '../components/ExportButton';
import { ExportColumn } from '../utils/exportUtils';
import {
  Search,
  Plus,
  Building,
  Filter,
  Users,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Edit2,
  Calendar,
  Globe,
  Briefcase,
  SlidersHorizontal,
  X,
} from 'lucide-react';

interface DirectoryPageProps {
  departments: Department[];
  onOpenAddEmployee: () => void;
  onOpenManageDepartments: () => void;
  onSelectEmployee: (empId: string) => void;
}

export const DirectoryPage: React.FC<DirectoryPageProps> = ({
  departments,
  onOpenAddEmployee,
  onOpenManageDepartments,
  onSelectEmployee,
}) => {
  const { authFetch, organization, role, subscribeToRealtime } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await authFetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Subscribe to live Realtime events
  useEffect(() => {
    const unsubscribe = subscribeToRealtime((payload) => {
      fetchEmployees();
    });
    return unsubscribe;
  }, [subscribeToRealtime, fetchEmployees]);

  // Unique countries from employees
  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.country) set.add(e.country);
    });
    return Array.from(set);
  }, [employees]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Search
      const searchMatch =
        searchTerm === '' ||
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.country.toLowerCase().includes(searchTerm.toLowerCase());

      if (!searchMatch) return false;

      // Department
      if (selectedDepartment !== 'all' && emp.department_id !== selectedDepartment) {
        return false;
      }

      // Status
      if (selectedStatus !== 'all' && emp.status !== selectedStatus) {
        return false;
      }

      // Employment Type
      if (selectedEmploymentType !== 'all' && emp.employment_type !== selectedEmploymentType) {
        return false;
      }

      // Country
      if (selectedCountry !== 'all' && emp.country !== selectedCountry) {
        return false;
      }

      return true;
    });
  }, [employees, searchTerm, selectedDepartment, selectedStatus, selectedEmploymentType, selectedCountry]);

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedDepartment !== 'all' ||
    selectedStatus !== 'all' ||
    selectedEmploymentType !== 'all' ||
    selectedCountry !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('all');
    setSelectedStatus('all');
    setSelectedEmploymentType('all');
    setSelectedCountry('all');
  };

  const getDepartmentName = (deptId: string) => {
    const dept = departments.find((d) => d.id === deptId);
    return dept ? dept.name : 'Unassigned';
  };

  const formatEmploymentType = (type: EmploymentType) => {
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
        return type;
    }
  };

  const exportColumns = useMemo<ExportColumn<Employee>[]>(
    () => [
      { header: 'Full Name', accessor: (emp) => emp.name },
      { header: 'Job Title', accessor: (emp) => emp.job_title },
      { header: 'Department', accessor: (emp) => getDepartmentName(emp.department_id) },
      { header: 'Country', accessor: (emp) => emp.country },
      { header: 'Employment Type', accessor: (emp) => formatEmploymentType(emp.employment_type) },
      { header: 'Status', accessor: (emp) => emp.status.toUpperCase() },
      { header: 'Start Date', accessor: (emp) => emp.start_date },
      { header: 'Attrition Risk', accessor: (emp) => emp.attrition_risk?.toUpperCase() || 'LOW' },
    ],
    [departments]
  );

  return (
    <div id="directory-page" className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Employee Directory
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] font-medium">
              {employees.length} {employees.length === 1 ? 'employee' : 'employees'}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Browse and manage all team members in {organization?.name}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <ExportButton
            id="directory-export-btn"
            filename={`employees-${organization?.name ? organization.name.toLowerCase().replace(/\s+/g, '-') : 'directory'}`}
            columns={exportColumns}
            data={filteredEmployees}
            sheetName="Employees"
            label="Export"
          />

          <button
            id="directory-manage-departments-btn"
            onClick={onOpenManageDepartments}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Building className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>Manage Departments</span>
          </button>

          <button
            id="directory-add-employee-btn"
            onClick={onOpenAddEmployee}
            className="px-3.5 py-2 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar (Notion Database Toolbar Style) */}
      <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
            <input
              id="directory-search-input"
              type="text"
              placeholder="Search by name, role, country..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
            />
          </div>

          {/* Department Filter */}
          <select
            id="filter-department-select"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            id="filter-status-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="probation">Probation</option>
            <option value="on_leave">On Leave</option>
            <option value="offboarded">Offboarded</option>
          </select>

          {/* Employment Type Filter */}
          <select
            id="filter-employment-type-select"
            value={selectedEmploymentType}
            onChange={(e) => setSelectedEmploymentType(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
          >
            <option value="all">All Types</option>
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="intern">Intern</option>
          </select>

          {/* Country Filter */}
          {availableCountries.length > 0 && (
            <select
              id="filter-country-select"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
            >
              <option value="all">All Countries</option>
              {availableCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {/* Clear Filters button */}
          {hasActiveFilters && (
            <button
              id="clear-filters-btn"
              onClick={clearFilters}
              className="px-2.5 py-1.5 text-xs rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Notion Database Table View */}
      {employees.length === 0 && !loading ? (
        /* Empty State for Brand New Workspace */
        <div
          id="directory-empty-state"
          className="p-12 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] text-center space-y-4 shadow-xs"
        >
          <div className="w-12 h-12 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-secondary)]">
            <Users className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-semibold text-base text-[var(--text-primary)]">
              No employees in this workspace yet
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Get started by adding your team members. You can organize them by department, track their probation or
              leave status, and manage their compensation securely.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button
              id="directory-empty-add-btn"
              onClick={onOpenAddEmployee}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add your first employee</span>
            </button>
          </div>
        </div>
      ) : filteredEmployees.length === 0 && !loading ? (
        /* Filter Zero State */
        <div className="p-8 text-center bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl space-y-2">
          <div className="text-xs font-semibold text-[var(--text-primary)]">No matching employees</div>
          <p className="text-xs text-[var(--text-secondary)]">
            No employees match the selected filters. Try adjusting your search query or clear filters.
          </p>
          <button
            onClick={clearFilters}
            className="text-xs text-[var(--accent-blue)] font-medium hover:underline pt-1 cursor-pointer"
          >
            Reset all filters
          </button>
        </div>
      ) : (
        /* Notion-Database Table */
        <div
          id="employee-table-container"
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-x-auto shadow-xs"
        >
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/70 text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Employment Type</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">Attrition Risk</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredEmployees.map((emp) => (
                <tr
                  key={emp.id}
                  id={`employee-row-${emp.id}`}
                  onClick={() => onSelectEmployee(emp.id)}
                  className="hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer group"
                >
                  {/* Name & Job Title */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-stone-200 dark:bg-stone-800 text-[var(--text-primary)] flex items-center justify-center font-bold text-xs shrink-0">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors truncate">
                          {emp.name}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] truncate">
                          {emp.job_title}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Department */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] text-[11px]">
                      {getDepartmentName(emp.department_id)}
                    </span>
                  </td>

                  {/* Status Pill */}
                  <td className="px-4 py-3">
                    <StatusPill status={emp.status} size="sm" />
                  </td>

                  {/* Employment Type */}
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {formatEmploymentType(emp.employment_type)}
                  </td>

                  {/* Country */}
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    <span className="inline-flex items-center gap-1">
                      <Globe className="w-3 h-3 text-[var(--text-muted)]" />
                      {emp.country}
                    </span>
                  </td>

                  {/* Start Date */}
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {emp.start_date}
                  </td>

                  {/* Attrition Risk Pill */}
                  <td className="px-4 py-3">
                    <StatusPill risk={emp.attrition_risk} size="sm" />
                  </td>

                  {/* Action Link */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-[11px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] font-medium inline-flex items-center gap-1 transition-colors">
                      View profile
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
