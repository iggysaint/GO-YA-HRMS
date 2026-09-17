import React, { useState, useEffect } from 'react';
import { Department } from '../types';
import { useAuth } from '../context/AuthContext';
import { X, Plus, Edit2, Trash2, Check, Building, AlertCircle } from 'lucide-react';

interface ManageDepartmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  onDepartmentChanged: () => void;
}

export const ManageDepartmentsModal: React.FC<ManageDepartmentsModalProps> = ({
  isOpen,
  onClose,
  departments,
  onDepartmentChanged,
}) => {
  const { authFetch } = useAuth();
  const [newDeptName, setNewDeptName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = newDeptName.trim();
    if (!trimmed) {
      setFieldErrors({ newDeptName: 'Department name is required.' });
      return;
    }
    if (trimmed.length < 2) {
      setFieldErrors({ newDeptName: 'Department name must be at least 2 characters.' });
      return;
    }
    if (trimmed.length > 60) {
      setFieldErrors({ newDeptName: 'Department name cannot exceed 60 characters.' });
      return;
    }

    setFieldErrors({});

    try {
      setLoading(true);
      setError(null);
      const res = await authFetch('/api/departments', {
        method: 'POST',
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add department');

      setNewDeptName('');
      onDepartmentChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDepartment = async (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setFieldErrors({ editingName: 'Department name is required.' });
      return;
    }
    if (trimmed.length < 2) {
      setFieldErrors({ editingName: 'Department name must be at least 2 characters.' });
      return;
    }
    if (trimmed.length > 60) {
      setFieldErrors({ editingName: 'Department name cannot exceed 60 characters.' });
      return;
    }

    setFieldErrors({});

    try {
      setLoading(true);
      setError(null);
      const res = await authFetch(`/api/departments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update department');

      setEditingId(null);
      setEditingName('');
      onDepartmentChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the department "${name}"?`)) return;

    try {
      setLoading(true);
      setError(null);
      const res = await authFetch(`/api/departments/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete department');

      onDepartmentChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-100">
      <div
        id="manage-departments-modal"
        className="w-full max-w-md bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] shadow-[var(--popover-shadow)] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-[var(--text-secondary)]" />
            <h3 className="font-semibold text-base text-[var(--text-primary)]">Manage Departments</h3>
          </div>
          <button
            id="close-departments-modal-btn"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Add Department Input */}
          <div>
            <form onSubmit={handleAddDepartment} className="flex gap-2">
              <input
                id="new-department-input"
                type="text"
                maxLength={60}
                placeholder="e.g. Finance & Accounting"
                value={newDeptName}
                onChange={(e) => {
                  setNewDeptName(e.target.value);
                  if (fieldErrors.newDeptName) setFieldErrors((p) => ({ ...p, newDeptName: '' }));
                }}
                aria-invalid={!!fieldErrors.newDeptName}
                className={`flex-1 px-3 py-2 text-xs rounded-lg border bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                  fieldErrors.newDeptName
                    ? 'border-rose-500'
                    : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--accent-blue)]'
                }`}
              />
              <button
                id="add-department-btn"
                type="submit"
                disabled={loading || !newDeptName.trim()}
                className="px-3 py-2 rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-50 text-xs font-medium flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
            {fieldErrors.newDeptName && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.newDeptName}</p>
            )}
          </div>

          {/* Departments List */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">
              Active Departments ({departments.length})
            </div>

            {departments.length === 0 ? (
              <div className="py-6 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-subtle)] rounded-lg">
                No departments added yet. Add one above to start organizing employees.
              </div>
            ) : (
              departments.map((dept) => (
                <div
                  key={dept.id}
                  id={`department-row-${dept.id}`}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] transition-colors text-xs"
                >
                  {editingId === dept.id ? (
                    <div className="flex flex-col flex-1 mr-2 gap-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={60}
                          value={editingName}
                          onChange={(e) => {
                            setEditingName(e.target.value);
                            if (fieldErrors.editingName) setFieldErrors((p) => ({ ...p, editingName: '' }));
                          }}
                          autoFocus
                          aria-invalid={!!fieldErrors.editingName}
                          className={`flex-1 px-2 py-1 text-xs rounded border bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                            fieldErrors.editingName
                              ? 'border-rose-500'
                              : 'border-[var(--border-strong)]'
                          }`}
                        />
                        <button
                          onClick={() => handleUpdateDepartment(dept.id)}
                          disabled={loading}
                          className="p-1 text-emerald-600 hover:bg-emerald-500/10 rounded cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            if (fieldErrors.editingName) setFieldErrors((p) => ({ ...p, editingName: '' }));
                          }}
                          className="p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] rounded cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {fieldErrors.editingName && (
                        <p className="text-[10px] text-rose-500 font-medium">{fieldErrors.editingName}</p>
                      )}
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-[var(--text-primary)] truncate">{dept.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          id={`edit-dept-btn-${dept.id}`}
                          onClick={() => {
                            setEditingId(dept.id);
                            setEditingName(dept.name);
                          }}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                          title="Rename department"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`delete-dept-btn-${dept.id}`}
                          onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-red-600 hover:bg-red-500/10 transition-colors"
                          title="Delete department"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 flex justify-end">
          <button
            id="done-departments-modal-btn"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-opacity cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
