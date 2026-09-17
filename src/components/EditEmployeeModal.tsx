import React, { useState } from 'react';
import { Department, Employee, EmployeeStatus, EmploymentType, AttritionRisk } from '../types';
import { useAuth } from '../context/AuthContext';
import { X, Edit3, AlertCircle } from 'lucide-react';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  departments: Department[];
  onEmployeeUpdated: () => void;
}

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
  departments,
  onEmployeeUpdated,
}) => {
  const { authFetch } = useAuth();
  const [name, setName] = useState(employee.name);
  const [departmentId, setDepartmentId] = useState(employee.department_id);
  const [jobTitle, setJobTitle] = useState(employee.job_title);
  const [employmentType, setEmploymentType] = useState<EmploymentType>(employee.employment_type);
  const [country, setCountry] = useState(employee.country);
  const [startDate, setStartDate] = useState(employee.start_date);
  const [status, setStatus] = useState<EmployeeStatus>(employee.status);
  const [attritionRisk, setAttritionRisk] = useState<AttritionRisk>(employee.attrition_risk);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = 'Full name is required.';
    } else if (name.trim().length > 100) {
      errors.name = 'Full name cannot exceed 100 characters.';
    }

    if (!departmentId) {
      errors.departmentId = 'Please select a department.';
    }

    if (!jobTitle.trim()) {
      errors.jobTitle = 'Job title is required.';
    } else if (jobTitle.trim().length > 100) {
      errors.jobTitle = 'Job title cannot exceed 100 characters.';
    }

    if (!country.trim()) {
      errors.country = 'Country is required.';
    } else if (country.trim().length > 80) {
      errors.country = 'Country cannot exceed 80 characters.';
    }

    if (!startDate) {
      errors.startDate = 'Start date is required.';
    } else {
      const d = new Date(startDate);
      if (isNaN(d.getTime())) {
        errors.startDate = 'Please enter a valid start date.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    try {
      setLoading(true);
      setError(null);

      const res = await authFetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          department_id: departmentId,
          job_title: jobTitle.trim(),
          employment_type: employmentType,
          country: country.trim(),
          start_date: startDate,
          status,
          attrition_risk: attritionRisk,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update employee');
      }

      onEmployeeUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-100 overflow-y-auto">
      <div
        id="edit-employee-modal"
        className="w-full max-w-lg bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] shadow-[var(--popover-shadow)] overflow-hidden my-8"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-primary)]">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[var(--text-primary)]">Edit Employee Details</h3>
              <p className="text-xs text-[var(--text-secondary)]">Update profile for {employee.name}</p>
            </div>
          </div>
          <button
            id="close-edit-employee-btn"
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="edit-employee-name" className="block text-xs font-medium text-[var(--text-secondary)]">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-[var(--text-muted)]">{name.length}/100</span>
              </div>
              <input
                id="edit-employee-name"
                type="text"
                maxLength={100}
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: '' }));
                }}
                aria-invalid={!!fieldErrors.name}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                  fieldErrors.name
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--accent-blue)]'
                }`}
              />
              {fieldErrors.name && (
                <p className="text-[11px] text-rose-500 font-medium mt-1">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="edit-employee-department" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                id="edit-employee-department"
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  if (fieldErrors.departmentId) setFieldErrors((p) => ({ ...p, departmentId: '' }));
                }}
                aria-invalid={!!fieldErrors.departmentId}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                  fieldErrors.departmentId
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--accent-blue)]'
                }`}
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {fieldErrors.departmentId && (
                <p className="text-[11px] text-rose-500 font-medium mt-1">
                  {fieldErrors.departmentId}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="edit-employee-job-title" className="block text-xs font-medium text-[var(--text-secondary)]">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-[var(--text-muted)]">{jobTitle.length}/100</span>
                </div>
                <input
                  id="edit-employee-job-title"
                  type="text"
                  maxLength={100}
                  required
                  value={jobTitle}
                  onChange={(e) => {
                    setJobTitle(e.target.value);
                    if (fieldErrors.jobTitle) setFieldErrors((p) => ({ ...p, jobTitle: '' }));
                  }}
                  aria-invalid={!!fieldErrors.jobTitle}
                  className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                    fieldErrors.jobTitle
                      ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--accent-blue)]'
                  }`}
                />
                {fieldErrors.jobTitle && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1">
                    {fieldErrors.jobTitle}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="edit-employee-type" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Employment Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="edit-employee-type"
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                >
                  <option value="full_time">Full-time</option>
                  <option value="part_time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="intern">Intern</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="edit-employee-country" className="block text-xs font-medium text-[var(--text-secondary)]">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-[var(--text-muted)]">{country.length}/80</span>
                </div>
                <input
                  id="edit-employee-country"
                  type="text"
                  maxLength={80}
                  required
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    if (fieldErrors.country) setFieldErrors((p) => ({ ...p, country: '' }));
                  }}
                  aria-invalid={!!fieldErrors.country}
                  className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                    fieldErrors.country
                      ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--accent-blue)]'
                  }`}
                />
                {fieldErrors.country && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1">
                    {fieldErrors.country}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="edit-employee-start-date" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit-employee-start-date"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (fieldErrors.startDate) setFieldErrors((p) => ({ ...p, startDate: '' }));
                  }}
                  aria-invalid={!!fieldErrors.startDate}
                  className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                    fieldErrors.startDate
                      ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--accent-blue)]'
                  }`}
                />
                {fieldErrors.startDate && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1">
                    {fieldErrors.startDate}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Status
                </label>
                <select
                  id="edit-employee-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                >
                  <option value="active">Active</option>
                  <option value="probation">Probation</option>
                  <option value="on_leave">On Leave</option>
                  <option value="offboarded">Offboarded</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Attrition Risk
                </label>
                <select
                  id="edit-employee-attrition"
                  value={attritionRisk}
                  onChange={(e) => setAttritionRisk(e.target.value as AttritionRisk)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                >
                  <option value="low">Low Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">High Risk</option>
                </select>
              </div>
            </div>
          </div>

          <div className="px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-edit-employee-btn"
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
