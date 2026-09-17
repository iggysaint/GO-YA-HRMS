import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Mail, Copy, Check, Shield, Users, AlertCircle, Sparkles, ExternalLink } from 'lucide-react';
import { StatusPill } from './StatusPill';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MemberInfo {
  user_id: string;
  email: string;
  role: 'hr_head' | 'hr_analyst';
  is_current_user: boolean;
}

interface PendingInvite {
  id: string;
  email: string;
  role: 'hr_head' | 'hr_analyst';
  token: string;
  created_at: string;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ isOpen, onClose }) => {
  const { authFetch, organization } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [activeTab, setActiveTab] = useState<'invite' | 'members'>('invite');

  const fetchWorkspaceMembers = async () => {
    try {
      const res = await authFetch('/api/workspace/members');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setPendingInvites(data.pending_invites || []);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWorkspaceMembers();
      setGeneratedInviteUrl(null);
      setError(null);
      setFieldErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = 'Invitee email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address (e.g. analyst@company.com).';
    } else if (trimmedEmail.length > 100) {
      errors.email = 'Email address cannot exceed 100 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    try {
      setLoading(true);
      setError(null);

      const res = await authFetch('/api/invites', {
        method: 'POST',
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invite');
      }

      const fullUrl = `${window.location.origin}${data.invite_url}`;
      setGeneratedInviteUrl(fullUrl);
      setEmail('');
      fetchWorkspaceMembers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedInviteUrl) return;
    navigator.clipboard.writeText(generatedInviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-100">
      <div
        id="invite-member-modal"
        className="w-full max-w-lg bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] shadow-[var(--popover-shadow)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[var(--text-primary)]">Invite Team Member</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Add an HR Analyst to {organization?.name}
              </p>
            </div>
          </div>
          <button
            id="close-invite-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-[var(--border-subtle)] px-6 pt-2 gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('invite')}
            className={`pb-2 transition-colors relative ${
              activeTab === 'invite'
                ? 'text-[var(--text-primary)] border-b-2 border-[var(--accent-blue)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Send Invite
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-2 transition-colors relative ${
              activeTab === 'members'
                ? 'text-[var(--text-primary)] border-b-2 border-[var(--accent-blue)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Workspace Members ({members.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {activeTab === 'invite' ? (
            <>
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Role explanation */}
              <div className="p-3.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                  <span>Assigned Role:</span>
                  <StatusPill role="hr_analyst" size="sm" />
                </div>
                <p>
                  The invitee will receive access to manage employees and departments in this workspace. Per RBAC
                  policies, compensation fields will be locked and blurred for HR Analysts.
                </p>
              </div>

              {/* Invite Form */}
              <form onSubmit={handleInvite} className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="invite-email-input" className="block text-xs font-medium text-[var(--text-secondary)]">
                      Invitee Email Address <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-[var(--text-muted)]">{email.length}/100</span>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
                    <input
                      id="invite-email-input"
                      type="email"
                      required
                      maxLength={100}
                      placeholder="analyst@company.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
                      }}
                      aria-invalid={!!fieldErrors.email}
                      className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none transition-colors ${
                        fieldErrors.email
                          ? 'border-rose-500'
                          : 'border-[var(--border-subtle)] focus:ring-1 focus:ring-[var(--accent-blue)]'
                      }`}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                <button
                  id="send-invite-btn"
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-2 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {loading ? 'Creating Invitation...' : 'Generate Magic Invite Link'}
                </button>
              </form>

              {/* Generated Magic Link */}
              {generatedInviteUrl && (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Invite Created Successfully!</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Share this magic link with your HR Analyst. When they open it, they will set their password and
                    land directly in this workspace.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      readOnly
                      value={generatedInviteUrl}
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-md bg-white dark:bg-stone-900 border border-emerald-500/30 text-[var(--text-primary)] select-all"
                    />
                    <button
                      id="copy-invite-link-btn"
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1 shrink-0 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Current Members
              </div>
              <div className="space-y-1.5">
                {members.map((m) => (
                  <div
                    key={m.user_id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-stone-300 dark:bg-stone-700 flex items-center justify-center font-bold text-[10px] text-[var(--text-primary)]">
                        {m.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-[var(--text-primary)]">{m.email}</span>
                      {m.is_current_user && (
                        <span className="text-[10px] text-[var(--text-muted)]">(You)</span>
                      )}
                    </div>
                    <StatusPill role={m.role} size="sm" />
                  </div>
                ))}
              </div>

              {pendingInvites.length > 0 && (
                <div className="pt-3">
                  <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Pending Invites ({pendingInvites.length})
                  </div>
                  <div className="space-y-1.5">
                    {pendingInvites.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-2 rounded-lg border border-dashed border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]"
                      >
                        <div className="truncate">
                          <span className="font-medium text-[var(--text-primary)]">{inv.email}</span>
                          <span className="text-[10px] text-[var(--text-muted)] ml-2">Invite pending</span>
                        </div>
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/invite?token=${inv.token}`;
                            navigator.clipboard.writeText(url);
                            alert('Invite link copied to clipboard!');
                          }}
                          className="text-[11px] text-[var(--accent-blue)] hover:underline flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Link</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 flex justify-end">
          <button
            id="close-invite-modal-action-btn"
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
