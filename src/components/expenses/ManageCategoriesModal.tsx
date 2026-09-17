import React, { useState } from 'react';
import { Tag, Plus, Edit2, Trash2, Check, X, AlertCircle } from 'lucide-react';
import { ExpenseCategory } from '../../types';

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ExpenseCategory[];
  onAddCategory: (name: string) => Promise<void>;
  onEditCategory: (id: string, name: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onAddCategory(newCategoryName.trim());
      setNewCategoryName('');
    } catch (err: any) {
      setError(err.message || 'Failed to add category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (cat: ExpenseCategory) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setError(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onEditCategory(id, editingName.trim());
      setEditingId(null);
      setEditingName('');
    } catch (err: any) {
      setError(err.message || 'Failed to update category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? Existing expenses will be safely moved to "Other".`)) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onDeleteCategory(id);
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="manage-categories-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Expense Categories
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Configure corporate ledger categories for spend classification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm p-1 rounded-md"
          >
            ✕
          </button>
        </div>

        {/* Error message if any */}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Add New Category form */}
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              id="new-category-input"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Software & Subscriptions, Per Diem..."
              className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 focus:bg-[var(--bg-card)] transition-colors"
            />
            <button
              type="submit"
              id="add-category-btn"
              disabled={isSubmitting || !newCategoryName.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>

          {/* List of categories */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider px-1">
              Existing Categories ({categories.length})
            </div>

            <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-lg overflow-hidden bg-[var(--bg-card)]">
              {categories.map((cat) => {
                const isEditing = editingId === cat.id;
                const isOther = cat.name.toLowerCase() === 'other';

                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 hover:bg-[var(--bg-hover)]/40 transition-colors"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 px-2.5 py-1 rounded border border-indigo-500 bg-[var(--bg-card)] text-xs text-[var(--text-primary)] focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(cat.id)}
                          disabled={isSubmitting || !editingName.trim()}
                          className="p-1 rounded text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-500/60" />
                        <span className="text-xs font-medium text-[var(--text-primary)]">
                          {cat.name}
                        </span>
                        {isOther && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                            Default fallback
                          </span>
                        )}
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(cat)}
                          className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                          title="Rename Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!isOther && (
                          <button
                            type="button"
                            onClick={() => handleDelete(cat.id, cat.name)}
                            className="p-1.5 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[var(--bg-subtle)] border-t border-[var(--border-subtle)] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
