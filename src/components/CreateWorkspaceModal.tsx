import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Building2, AlertCircle } from 'lucide-react';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({ isOpen, onClose }) => {
  const { user, signup, refreshSession } = useAuth();
  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('Technology & Software');
  const [country, setCountry] = useState('Ghana');
  const [currency, setCurrency] = useState('GHS');
  const [timezone, setTimezone] = useState('Africa/Accra (GMT+0)');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};
    if (!orgName.trim()) {
      errors.orgName = 'Workspace name is required.';
    } else if (orgName.trim().length < 2) {
      errors.orgName = 'Workspace name must be at least 2 characters.';
    } else if (orgName.trim().length > 100) {
      errors.orgName = 'Workspace name cannot exceed 100 characters.';
    }

    if (!country.trim()) {
      errors.country = 'Country is required.';
    } else if (country.trim().length > 60) {
      errors.country = 'Country cannot exceed 60 characters.';
    }

    if (industry.trim().length > 60) {
      errors.industry = 'Industry cannot exceed 60 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Call signup endpoint to provision a new workspace
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `${user.email.split('@')[0]}+${Date.now()}@${user.email.split('@')[1] || 'example.com'}`,
          password: 'password123',
          org_name: orgName.trim(),
          industry: industry.trim(),
          country: country.trim(),
          currency,
          timezone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create workspace');

      localStorage.setItem('goya_auth_token', data.token);
      await refreshSession();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-100">
      <div
        id="create-workspace-modal"
        className="w-full max-w-md bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] shadow-[var(--popover-shadow)] overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-primary)]">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[var(--text-primary)]">Create Workspace</h3>
              <p className="text-xs text-[var(--text-secondary)]">Set up a new company environment</p>
            </div>
          </div>
          <button
            id="close-create-workspace-btn"
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="create-org-name-input" className="block text-xs font-medium text-[var(--text-secondary)]">
                  Company / Organization Name <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-[var(--text-muted)]">{orgName.length}/100</span>
              </div>
              <input
                id="create-org-name-input"
                type="text"
                required
                maxLength={100}
                placeholder="e.g. Accra Logistics Ltd"
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  if (fieldErrors.orgName) setFieldErrors((p) => ({ ...p, orgName: '' }));
                }}
                aria-invalid={!!fieldErrors.orgName}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                  fieldErrors.orgName
                    ? 'border-rose-500'
                    : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--accent-blue)]'
                }`}
              />
              {fieldErrors.orgName && (
                <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.orgName}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="create-country-input" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Country <span className="text-red-500">*</span>
                </label>
                <input
                  id="create-country-input"
                  type="text"
                  required
                  maxLength={60}
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    if (fieldErrors.country) setFieldErrors((p) => ({ ...p, country: '' }));
                  }}
                  aria-invalid={!!fieldErrors.country}
                  className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                    fieldErrors.country
                      ? 'border-rose-500'
                      : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--accent-blue)]'
                  }`}
                />
                {fieldErrors.country && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.country}</p>
                )}
              </div>

              <div>
                <label htmlFor="create-currency-select" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Base Currency
                </label>
                <select
                  id="create-currency-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                >
                  <option value="GHS">GHS (Ghana Cedi)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="GBP">GBP (British Pound)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="NGN">NGN (Nigerian Naira)</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="create-industry-input" className="block text-xs font-medium text-[var(--text-secondary)]">
                  Industry
                </label>
                <span className="text-[10px] text-[var(--text-muted)]">{industry.length}/60</span>
              </div>
              <input
                id="create-industry-input"
                type="text"
                maxLength={60}
                value={industry}
                onChange={(e) => {
                  setIndustry(e.target.value);
                  if (fieldErrors.industry) setFieldErrors((p) => ({ ...p, industry: '' }));
                }}
                aria-invalid={!!fieldErrors.industry}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                  fieldErrors.industry
                    ? 'border-rose-500'
                    : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--accent-blue)]'
                }`}
              />
              {fieldErrors.industry && (
                <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.industry}</p>
              )}
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
              id="confirm-create-workspace-btn"
              type="submit"
              disabled={loading || !orgName.trim()}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
            >
              {loading ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
