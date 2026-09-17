import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, ChevronDown, Check, Plus, Globe, Shield, Sparkles } from 'lucide-react';
import { StatusPill } from './StatusPill';

interface WorkspaceSwitcherProps {
  onOpenInviteModal?: () => void;
  onOpenCreateWorkspaceModal?: () => void;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  onOpenInviteModal,
  onOpenCreateWorkspaceModal,
}) => {
  const { organization, role, availableWorkspaces, switchWorkspace } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitch = async (orgId: string) => {
    if (orgId === organization?.id) {
      setIsOpen(false);
      return;
    }
    try {
      setIsSwitching(true);
      await switchWorkspace(orgId);
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to switch:', err);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        id="workspace-switcher-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-left group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
            {organization?.name ? organization.name.charAt(0).toUpperCase() : 'G'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm truncate text-[var(--text-primary)]">
                {organization?.name || 'Go-Ya HRMS'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)] truncate">
              <span>{organization?.country || 'Ghana'}</span>
              <span>·</span>
              <span>{role === 'hr_head' ? 'HR Head' : 'HR Analyst'}</span>
            </div>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          id="workspace-dropdown-menu"
          className="absolute left-0 top-full mt-1.5 w-72 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--popover-shadow)] z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Current Workspace Info */}
          <div className="px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50">
            <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Active Workspace
            </div>
            <div className="font-medium text-sm text-[var(--text-primary)]">{organization?.name}</div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5 flex flex-col gap-0.5">
              <span>Industry: {organization?.industry || 'General'}</span>
              <span>Base Currency: {organization?.currency || 'GHS'} ({organization?.timezone || 'GMT'})</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Your Role:</span>
              <StatusPill role={role || 'hr_head'} size="sm" />
            </div>
          </div>

          {/* Switchable Workspaces */}
          <div className="py-1">
            <div className="px-3 py-1 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Workspaces ({availableWorkspaces.length})
            </div>
            {availableWorkspaces.map(({ organization: org, role: memberRole }) => {
              const isSelected = org.id === organization?.id;
              return (
                <button
                  key={org.id}
                  id={`switch-workspace-${org.id}`}
                  disabled={isSwitching}
                  onClick={() => handleSwitch(org.id)}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs hover:bg-[var(--bg-hover)] transition-colors ${
                    isSelected ? 'bg-[var(--bg-subtle)] font-medium' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded bg-stone-200 dark:bg-stone-800 text-[var(--text-primary)] flex items-center justify-center font-semibold text-xs shrink-0">
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="text-[var(--text-primary)] truncate">{org.name}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {org.country} · {memberRole === 'hr_head' ? 'HR Head' : 'HR Analyst'}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent-blue)] shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          {/* Workspace Actions */}
          <div className="pt-1 mt-1 border-t border-[var(--border-subtle)]">
            {role === 'hr_head' && onOpenInviteModal && (
              <button
                id="workspace-invite-member-btn"
                onClick={() => {
                  setIsOpen(false);
                  onOpenInviteModal();
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Invite HR Analyst to {organization?.name}</span>
              </button>
            )}

            {onOpenCreateWorkspaceModal && (
              <button
                id="workspace-create-new-btn"
                onClick={() => {
                  setIsOpen(false);
                  onOpenCreateWorkspaceModal();
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span>Create another workspace</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
