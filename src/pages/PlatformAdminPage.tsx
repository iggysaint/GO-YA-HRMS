import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  PlatformMetrics,
  PlatformWorkspaceSummary,
  DemoRequest,
} from '../types';
import {
  ShieldAlert,
  Building2,
  Users,
  CreditCard,
  MessageSquare,
  Search,
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
  LogOut,
  RefreshCw,
  HelpCircle,
  ExternalLink,
  Lock,
  Plus,
  Send,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Mail,
  Calendar,
  Globe,
} from 'lucide-react';

interface SupportNote {
  id: string;
  company_id: string;
  note: string;
  author_email: string;
  created_at: string;
}

interface WorkspaceDetailResponse {
  workspace: {
    id: string;
    name: string;
    industry: string;
    country: string;
    currency: string;
    timezone: string;
    leave_escalation_threshold_days: number;
    created_at: string;
  };
  subscription: {
    id: string;
    plan: 'free_trial' | 'starter' | 'professional' | 'enterprise';
    billing_cycle: 'monthly' | 'annual';
    employee_limit: number;
    status: 'active' | 'trialing' | 'past_due' | 'canceled';
    trial_ends_at: string | null;
    current_period_end: string;
  } | null;
  owner_email?: string;
  stats: {
    employee_count: number;
    departments_count: number;
    member_count: number;
  };
  support_notes: SupportNote[];
  data_access_boundary: {
    is_restricted: boolean;
    policy: string;
  };
}

interface PlatformAdminPageProps {
  onReturnToApp?: () => void;
}

export const PlatformAdminPage: React.FC<PlatformAdminPageProps> = ({ onReturnToApp }) => {
  const { user, token, logout, isPlatformAdmin, authFetch } = useAuth();

  const [activeTab, setActiveTab] = useState<'metrics' | 'workspaces' | 'demos'>('metrics');
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [workspaces, setWorkspaces] = useState<PlatformWorkspaceSummary[]>([]);
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter for workspaces
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected workspace for Support Dossier modal/drawer
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [workspaceDetail, setWorkspaceDetail] = useState<WorkspaceDetailResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [newSupportNote, setNewSupportNote] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);

  // Initial load
  const loadPlatformData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [metricsRes, workspacesRes, demosRes] = await Promise.all([
        authFetch('/api/platform/metrics'),
        authFetch('/api/platform/workspaces'),
        authFetch('/api/platform/demo-requests'),
      ]);

      if (metricsRes.status === 403 || workspacesRes.status === 403) {
        throw new Error('Access denied: User account is not registered in platform_admins.');
      }

      if (!metricsRes.ok || !workspacesRes.ok || !demosRes.ok) {
        throw new Error('Failed to retrieve platform administrative telemetry.');
      }

      const metricsData = await metricsRes.json();
      const workspacesData = await workspacesRes.json();
      const demosData = await demosRes.json();

      setMetrics(metricsData);
      setWorkspaces(workspacesData.workspaces || []);
      setDemoRequests(demosData.demo_requests || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred while connecting to the Platform Admin API.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlatformData();
  }, []);

  // Fetch workspace support dossier
  const handleOpenWorkspace = async (id: string) => {
    setSelectedWorkspaceId(id);
    setIsLoadingDetail(true);
    try {
      const res = await authFetch(`/api/platform/workspaces/${id}`);
      if (res.ok) {
        const data = await res.json();
        setWorkspaceDetail(data);
      }
    } catch (err) {
      console.error('Failed to load workspace detail', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Submit support note
  const handleAddSupportNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspaceId || !newSupportNote.trim()) return;

    setIsSubmittingNote(true);
    try {
      const res = await authFetch(`/api/platform/workspaces/${selectedWorkspaceId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: newSupportNote.trim() }),
      });
      if (res.ok) {
        const result = await res.json();
        setWorkspaceDetail((prev) =>
          prev
            ? {
                ...prev,
                support_notes: [result.note, ...prev.support_notes],
              }
            : null
        );
        setNewSupportNote('');
      }
    } catch (err) {
      console.error('Failed to save support note', err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Filtered workspaces
  const filteredWorkspaces = workspaces.filter((ws) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ws.name.toLowerCase().includes(q) ||
      ws.id.toLowerCase().includes(q) ||
      (ws.industry && ws.industry.toLowerCase().includes(q)) ||
      (ws.country && ws.country.toLowerCase().includes(q)) ||
      (ws.owner_email && ws.owner_email.toLowerCase().includes(q))
    );
  });

  // Access check guard
  if (!isPlatformAdmin && !isLoading && error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-red-800/60 rounded-xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-red-950/80 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-400">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Platform Admin Restricted</h1>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              This surface is strictly reserved for Go-Ya HRMS Platform Operators and is separated by design
              from tenant workspace roles.
            </p>
          </div>
          <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3 text-xs text-red-300 font-mono text-left">
            RLS Policy: platform_admins_only (Denied for user: {user?.email || 'unauthorized'})
          </div>
          <div className="pt-2 flex flex-col gap-3">
            {onReturnToApp && (
              <button
                onClick={onReturnToApp}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition"
              >
                Return to Workspace
              </button>
            )}
            <button
              onClick={logout}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 1. Global Operator Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-lg">
                G
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white tracking-tight">Go-Ya HRMS</span>
                  <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-purple-900/50 text-purple-300 border border-purple-700/50 rounded-full">
                    Platform Operator
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">SaaS Operations & Tenant Support Console</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-full text-xs text-slate-300">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Restricted Surface: Tenant HR Data Locked by Policy</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 hidden sm:inline-block font-mono">
                {user?.email}
              </span>
              {onReturnToApp && (
                <button
                  onClick={onReturnToApp}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 rounded-lg transition flex items-center gap-1.5"
                  title="Switch to internal workspace"
                >
                  <span>App Shell</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
              <button
                onClick={logout}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg transition"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 border-t border-slate-800/60">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
              activeTab === 'metrics'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/30'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Platform Metrics
          </button>
          <button
            onClick={() => setActiveTab('workspaces')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
              activeTab === 'workspaces'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/30'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Tenant Workspaces ({workspaces.length})
          </button>
          <button
            onClick={() => setActiveTab('demos')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
              activeTab === 'demos'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/30'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Mail className="w-4 h-4" />
            Demo Inquiries ({demoRequests.length})
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Security Policy Notice Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-xl p-4 flex items-start gap-3 shadow-lg">
          <Lock className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs space-y-1">
            <span className="font-semibold text-indigo-200">Zero-Tenant-Access Architecture Enforced:</span>
            <p className="text-slate-400 leading-relaxed">
              Platform Admin is isolated from tenant data models. Operators can inspect workspace health, subscription
              limits, and operational audit metadata. No employee profiles, payroll figures, or Ghana Card records are
              queryable through this surface.
            </p>
          </div>
        </div>

        {/* Tab 1: Metrics */}
        {activeTab === 'metrics' && (
          <div className="space-y-8">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                  <span>Total Workspaces</span>
                  <Building2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-white">
                    {metrics?.total_workspaces ?? '—'}
                  </span>
                  <span className="text-xs text-emerald-400 font-medium">Across Africa</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Active business accounts in registry</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                  <span>Active Subscriptions</span>
                  <CreditCard className="w-4 h-4 text-blue-400" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-white">
                    {metrics?.active_subscriptions_count ?? '—'}
                  </span>
                  <span className="text-xs text-blue-400 font-medium">100% active</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Paid tiers + trials in good standing</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                  <span>Demo Inbound Leads</span>
                  <Mail className="w-4 h-4 text-purple-400" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-white">
                    {metrics?.total_demo_requests ?? '—'}
                  </span>
                  <span className="text-xs text-purple-400 font-medium">From Landing</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Milestone 14 marketing inquiries</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                  <span>Platform Accounts</span>
                  <Users className="w-4 h-4 text-amber-400" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-white">
                    {metrics?.total_registered_users ?? '—'}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Total Users</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Authenticated operators & members</p>
              </div>
            </div>

            {/* Subscriptions by Plan Breakdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Active Subscriptions by Plan</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Breakdown of current customer tiers across enterprise and SME segments
                  </p>
                </div>
                <button
                  onClick={loadPlatformData}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition"
                  title="Refresh Telemetry"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Free Trial</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                      14-day limit
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-white">
                    {metrics?.subscriptions_by_plan.free_trial ?? 0}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Up to 10 employees</p>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Starter</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950 text-blue-300 border border-blue-900/50">
                      GHS 450/mo
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-white">
                    {metrics?.subscriptions_by_plan.starter ?? 0}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Up to 25 employees</p>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Professional</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-900/50">
                      GHS 950/mo
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-white">
                    {metrics?.subscriptions_by_plan.professional ?? 0}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Up to 50 employees</p>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Enterprise</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950 text-purple-300 border border-purple-900/50">
                      Custom SLA
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-white">
                    {metrics?.subscriptions_by_plan.enterprise ?? 0}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">200+ employees, AI Copilot</p>
                </div>
              </div>
            </div>

            {/* Inbound Leads Preview */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Recent Inbound Demo Requests</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Leads received via the public landing page form</p>
                </div>
                <button
                  onClick={() => setActiveTab('demos')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                >
                  <span>View All Inquiries</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {demoRequests.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">No inbound demo requests received yet.</p>
              ) : (
                <div className="space-y-3">
                  {demoRequests.slice(0, 3).map((demo) => (
                    <div
                      key={demo.id}
                      className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{demo.company_name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
                            {demo.team_size} staff
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {demo.name} &bull; <span className="font-mono text-slate-300">{demo.email}</span>
                        </p>
                        {demo.message && (
                          <p className="text-xs text-slate-500 italic line-clamp-1 mt-1">"{demo.message}"</p>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(demo.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Tenant Workspaces & Support Directory */}
        {activeTab === 'workspaces' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Tenant Workspaces Directory</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Metadata and operational support directory across all registered tenants
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search workspace, industry, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Workspace / Organization</th>
                      <th className="py-3 px-4">Plan & Status</th>
                      <th className="py-3 px-4">Capacity</th>
                      <th className="py-3 px-4">Primary Contact</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4 text-right">Support</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredWorkspaces.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No matching tenant workspaces found.
                        </td>
                      </tr>
                    ) : (
                      filteredWorkspaces.map((ws) => {
                        const planBadgeColor =
                          ws.subscription?.plan === 'enterprise'
                            ? 'bg-purple-950/80 text-purple-300 border-purple-800/60'
                            : ws.subscription?.plan === 'professional'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                            : ws.subscription?.plan === 'starter'
                            ? 'bg-blue-950/80 text-blue-300 border-blue-800/60'
                            : 'bg-slate-800 text-slate-300 border-slate-700';

                        return (
                          <tr key={ws.id} className="hover:bg-slate-850/50 transition">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-white">{ws.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {ws.id}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded border ${planBadgeColor}`}
                                >
                                  {ws.subscription?.plan || 'trial'}
                                </span>
                                <span className="text-[11px] text-slate-400 capitalize">
                                  ({ws.subscription?.billing_cycle || 'monthly'})
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-slate-200 font-medium">
                                {ws.employee_count} / {ws.subscription?.employee_limit ?? 25} staff
                              </div>
                              <div className="text-[10px] text-slate-500">{ws.member_count} app logins</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-mono text-slate-300">{ws.owner_email || '—'}</div>
                              <div className="text-[10px] text-slate-500">{ws.industry || 'General Business'}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div>{ws.country || 'Ghana'}</div>
                              <div className="text-[10px] text-slate-500">{ws.currency} &bull; {ws.timezone}</div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleOpenWorkspace(ws.id)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium transition inline-flex items-center gap-1"
                              >
                                <span>Support Dossier</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Demo Inquiries Pipeline */}
        {activeTab === 'demos' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Public Demo Requests Pipeline</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Leads submitted through the public marketing landing page (Milestone 14)
                </p>
              </div>
              <div className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                Total Leads: <span className="font-bold text-white">{demoRequests.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {demoRequests.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-xl">
                  No demo requests received yet. Inbound inquiries will appear here automatically.
                </div>
              ) : (
                demoRequests.map((lead) => (
                  <div
                    key={lead.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-white text-sm">{lead.company_name}</h3>
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/60 rounded">
                          {lead.team_size} team
                        </span>
                      </div>

                      <div className="text-xs text-slate-300">
                        <div className="font-medium text-slate-200">{lead.name}</div>
                        <a
                          href={`mailto:${lead.email}`}
                          className="font-mono text-emerald-400 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Mail className="w-3 h-3" />
                          <span>{lead.email}</span>
                        </a>
                      </div>

                      {lead.message && (
                        <div className="p-3 bg-slate-950 border border-slate-800/80 rounded text-xs text-slate-400 leading-relaxed italic">
                          "{lead.message}"
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                      </div>
                      <a
                        href={`mailto:${lead.email}?subject=Go-Ya HRMS Demo & Discussion`}
                        className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
                      >
                        <span>Contact Lead</span>
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Support Dossier Modal/Drawer */}
      {selectedWorkspaceId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {workspaceDetail?.workspace.name || 'Workspace Support Dossier'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">ID: {selectedWorkspaceId}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedWorkspaceId(null);
                  setWorkspaceDetail(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {isLoadingDetail ? (
                <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Loading workspace dossier...</span>
                </div>
              ) : (
                <>
                  {/* Strict Boundary Callout */}
                  <div className="bg-indigo-950/30 border border-indigo-900/60 rounded-lg p-4 flex items-start gap-3">
                    <Lock className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <div className="font-semibold text-indigo-300">Strict RLS Isolation Active</div>
                      <p className="text-slate-400 leading-relaxed text-[11px]">
                        {workspaceDetail?.data_access_boundary.policy}
                      </p>
                    </div>
                  </div>

                  {/* Operational Telemetry Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                      <div className="text-slate-500 text-[10px] uppercase font-semibold">Current Plan</div>
                      <div className="text-sm font-bold text-white capitalize mt-0.5">
                        {workspaceDetail?.subscription?.plan || 'Free Trial'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {workspaceDetail?.subscription?.billing_cycle || 'monthly'} cycle
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                      <div className="text-slate-500 text-[10px] uppercase font-semibold">Capacity</div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {workspaceDetail?.stats.employee_count} / {workspaceDetail?.subscription?.employee_limit ?? 25}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Employees active</div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                      <div className="text-slate-500 text-[10px] uppercase font-semibold">Primary Contact</div>
                      <div className="text-xs font-mono text-slate-200 truncate mt-1">
                        {workspaceDetail?.owner_email || '—'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">HR Head</div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                      <div className="text-slate-500 text-[10px] uppercase font-semibold">Country & Currency</div>
                      <div className="text-xs font-semibold text-white mt-1">
                        {workspaceDetail?.workspace.country} ({workspaceDetail?.workspace.currency})
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{workspaceDetail?.workspace.timezone}</div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                      <div className="text-slate-500 text-[10px] uppercase font-semibold">Leave Escalation</div>
                      <div className="text-xs font-semibold text-white mt-1">
                        {workspaceDetail?.workspace.leave_escalation_threshold_days ?? 3} Days
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Analyst approval max</div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                      <div className="text-slate-500 text-[10px] uppercase font-semibold">Onboarding Date</div>
                      <div className="text-xs font-semibold text-white mt-1">
                        {workspaceDetail?.workspace.created_at
                          ? new Date(workspaceDetail.workspace.created_at).toLocaleDateString()
                          : '—'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Workspace initialized</div>
                    </div>
                  </div>

                  {/* Support Activity / Operator Notes */}
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                        Operator Support Notes & History
                      </h4>
                      <span className="text-[10px] text-slate-500">Internal to Platform Operators</span>
                    </div>

                    {/* Add note form */}
                    <form onSubmit={handleAddSupportNote} className="space-y-2">
                      <textarea
                        value={newSupportNote}
                        onChange={(e) => setNewSupportNote(e.target.value)}
                        placeholder="Log internal support ticket notes, billing updates, or compliance checks..."
                        className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 p-3 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none h-20"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={!newSupportNote.trim() || isSubmittingNote}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-lg text-xs transition flex items-center gap-1.5"
                        >
                          <Send className="w-3 h-3" />
                          <span>{isSubmittingNote ? 'Saving...' : 'Add Support Note'}</span>
                        </button>
                      </div>
                    </form>

                    {/* List of existing notes */}
                    <div className="space-y-2 pt-2">
                      {workspaceDetail?.support_notes.length === 0 ? (
                        <p className="text-slate-500 text-[11px] italic py-2">
                          No support notes recorded for this workspace yet.
                        </p>
                      ) : (
                        workspaceDetail?.support_notes.map((note) => (
                          <div key={note.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="font-mono text-slate-300">{note.author_email}</span>
                              <span>
                                {new Date(note.created_at).toLocaleDateString()} at{' '}
                                {new Date(note.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-200 leading-relaxed">{note.note}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => {
                  setSelectedWorkspaceId(null);
                  setWorkspaceDetail(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
