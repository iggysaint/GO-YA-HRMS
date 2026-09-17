import React, { useState } from 'react';
import { Department, EmployeeStatus, EmploymentType, AttritionRisk } from '../types';
import { useAuth } from '../context/AuthContext';
import { X, UserPlus, AlertCircle, Building, DollarSign } from 'lucide-react';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  onEmployeeAdded: () => void;
  onOpenManageDepartments: () => void;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  departments,
  onEmployeeAdded,
  onOpenManageDepartments,
}) => {
  const { authFetch, role, organization } = useAuth();
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('full_time');
  const [country, setCountry] = useState(organization?.country || 'Ghana');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<EmployeeStatus>('active');
  const [attritionRisk, setAttritionRisk] = useState<AttritionRisk>('low');

  // Compensation fields (available to HR Head only)
  const [salary, setSalary] = useState('');
  const [currency, setCurrency] = useState(organization?.currency || 'GHS');

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
        errors.startDate = 'Please enter a valid date.';
      }
    }

    if (role === 'hr_head' && salary) {
      const numSalary = Number(salary);
      if (isNaN(numSalary) || numSalary < 0) {
        errors.salary = 'Please enter a valid non-negative number for salary.';
      } else if (numSalary > 100000000) {
        errors.salary = 'Salary exceeds sensible limit.';
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

      const body: any = {
        name: name.trim(),
        department_id: departmentId,
        job_title: jobTitle.trim(),
        employment_type: employmentType,
        country: country.trim(),
        start_date: startDate,
        status,
        attrition_risk: attritionRisk,
      };

      if (role === 'hr_head' && salary) {
        body.salary = Number(salary);
        body.currency = currency;
      }

      const res = await authFetch('/api/employees', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create employee');
      }

      // Reset form
      setName('');
      setJobTitle('');
      setSalary('');
      setFieldErrors({});
      onEmployeeAdded();
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
        id="add-employee-modal"
        className="w-full max-w-lg bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] shadow-[var(--popover-shadow)] overflow-hidden my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-primary)]">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[var(--text-primary)]">Add New Employee</h3>
              <p className="text-xs text-[var(--text-secondary)]">Create an employee record in {organization?.name}</p>
            </div>
          </div>
          <button
            id="close-add-employee-btn"
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Full Name */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="employee-name-input" className="block text-xs font-medium text-[var(--text-secondary)]">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-[var(--text-muted)]">{name.length}/100</span>
              </div>
              <input
                id="employee-name-input"
                type="text"
                maxLength={100}
                required
                placeholder="e.g. Kwame Mensah"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: '' }));
                }}
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? "employee-name-error" : undefined}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                  fieldErrors.name
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--accent-blue)]'
                }`}
              />
              {fieldErrors.name && (
                <p id="employee-name-error" className="text-[11px] text-rose-500 font-medium mt-1">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Department Picker with quick manage link */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="employee-department-select" className="block text-xs font-medium text-[var(--text-secondary)]">
                  Department <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenManageDepartments();
                  }}
                  className="text-[11px] text-[var(--accent-blue)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Building className="w-3 h-3" />
                  <span>Manage Departments</span>
                </button>
              </div>

              {departments.length === 0 ? (
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                  <span>No departments exist yet. Please create a department first.</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenManageDepartments();
                    }}
                    className="font-medium underline ml-2 shrink-0 cursor-pointer"
                  >
                    Add Department
                  </button>
                </div>
              ) : (
                <select
                  id="employee-department-select"
                  required
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value);
                    if (fieldErrors.departmentId) setFieldErrors((p) => ({ ...p, departmentId: '' }));
                  }}
                  aria-invalid={!!fieldErrors.departmentId}
                  aria-describedby={fieldErrors.departmentId ? "employee-dept-error" : undefined}
                  className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                    fieldErrors.departmentId
                      ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--accent-blue)]'
                  }`}
                >
                  <option value="">Select a department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
              {fieldErrors.departmentId && (
                <p id="employee-dept-error" className="text-[11px] text-rose-500 font-medium mt-1">
                  {fieldErrors.departmentId}
                </p>
              )}
            </div>

            {/* Job Title & Employment Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="employee-job-title-input" className="block text-xs font-medium text-[var(--text-secondary)]">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-[var(--text-muted)]">{jobTitle.length}/100</span>
                </div>
                <input
                  id="employee-job-title-input"
                  type="text"
                  maxLength={100}
                  required
                  placeholder="e.g. Software Engineer"
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
                <label htmlFor="employee-type-select" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Employment Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="employee-type-select"
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

            {/* Country & Start Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="employee-country-input" className="block text-xs font-medium text-[var(--text-secondary)]">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-[var(--text-muted)]">{country.length}/80</span>
                </div>
                <input
                  id="employee-country-input"
                  type="text"
                  maxLength={80}
                  required
                  placeholder="e.g. Ghana"
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
                <label htmlFor="employee-start-date-input" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="employee-start-date-input"
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

            {/* Status & Attrition Risk */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="employee-status-select" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Initial Status <span className="text-red-500">*</span>
                </label>
                <select
                  id="employee-status-select"
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
                <label htmlFor="employee-attrition-select" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Attrition Risk <span className="text-red-500">*</span>
                </label>
                <select
                  id="employee-attrition-select"
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

            {/* Compensation Section (Conditional on HR Head Role) */}
            {role === 'hr_head' ? (
              <div className="pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-[var(--text-primary)]">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Compensation Details (HR Head only)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="employee-salary-input" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Monthly Salary / Rate
                    </label>
                    <input
                      id="employee-salary-input"
                      type="number"
                      placeholder="e.g. 18000"
                      min="0"
                      max="100000000"
                      value={salary}
                      onChange={(e) => {
                        setSalary(e.target.value);
                        if (fieldErrors.salary) setFieldErrors((p) => ({ ...p, salary: '' }));
                      }}
                      aria-invalid={!!fieldErrors.salary}
                      className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                        fieldErrors.salary
                          ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                          : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--accent-blue)]'
                      }`}
                    />
                    {fieldErrors.salary && (
                      <p className="text-[11px] text-rose-500 font-medium mt-1">
                        {fieldErrors.salary}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="employee-currency-select" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Currency
                    </label>
                    <select
                      id="employee-currency-select"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                    >
                      <option value="GHS">GHS (Ghanaian Cedi)</option>
                      <option value="USD">USD (US Dollar)</option>
                      <option value="GBP">GBP (British Pound)</option>
                      <option value="EUR">EUR (Euro)</option>
                      <option value="NGN">NGN (Nigerian Naira)</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-2 text-[11px] text-[var(--text-muted)] italic">
                * Compensation records are restricted to HR Head role and will be configured separately.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="submit-add-employee-btn"
              type="submit"
              disabled={loading || departments.length === 0}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer flex items-center gap-1.5"
            >
              {loading ? 'Adding...' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
