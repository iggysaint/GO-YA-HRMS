import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Building2, Shield, Lock, Mail, Globe, ArrowRight, CheckCircle2, AlertCircle, Sun, Moon, Sparkles, ArrowLeft } from 'lucide-react';
import { StatusPill } from '../components/StatusPill';

interface AuthPageProps {
  inviteToken?: string | null;
  initialMode?: 'login' | 'signup' | 'forgot_password' | 'invite';
  onBackToLanding?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  inviteToken: initialInviteToken,
  initialMode,
  onBackToLanding,
}) => {
  const { login, signup, acceptInvite } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Mode: 'login' | 'signup' | 'forgot_password' | 'invite'
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password' | 'invite'>(
    initialInviteToken ? 'invite' : initialMode || 'login'
  );

  useEffect(() => {
    if (initialMode && !initialInviteToken) {
      setMode(initialMode);
    }
  }, [initialMode, initialInviteToken]);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('Fintech & Software');
  const [country, setCountry] = useState('Ghana');
  const [currency, setCurrency] = useState('GHS');
  const [timezone, setTimezone] = useState('Africa/Accra (GMT+0)');

  // Invite state
  const [inviteToken, setInviteToken] = useState<string | null>(initialInviteToken || null);
  const [inviteDetails, setInviteDetails] = useState<{
    email: string;
    role: string;
    orgName: string;
  } | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check invite token if in URL or passed
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token') || initialInviteToken;

    if (tokenFromUrl) {
      setInviteToken(tokenFromUrl);
      setMode('invite');
      loadInviteDetails(tokenFromUrl);
    }
  }, [initialInviteToken]);

  const loadInviteDetails = async (token: string) => {
    try {
      setInviteLoading(true);
      setError(null);
      const res = await fetch(`/api/invites/${token}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired invite link.');
      }
      setInviteDetails({
        email: data.invite.email,
        role: data.invite.role,
        orgName: data.organization.name,
      });
      setEmail(data.invite.email);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      setError('Please provide a workspace / organization name.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await signup({
        email,
        password,
        org_name: orgName.trim(),
        industry,
        country,
        currency,
        timezone,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken) return;

    try {
      setLoading(true);
      setError(null);
      await acceptInvite(inviteToken, password);
      // Clean query params
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setSuccessMessage(data.message || 'Password reset link sent.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Logins
  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-3">
          {onBackToLanding && (
            <button
              id="auth-back-to-home-btn"
              type="button"
              onClick={onBackToLanding}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer flex items-center gap-1 text-xs"
              title="Return to Go-Ya HRMS home"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </button>
          )}

          <div
            onClick={onBackToLanding}
            className={`flex items-center gap-2.5 ${onBackToLanding ? 'cursor-pointer' : ''}`}
          >
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 flex items-center justify-center font-bold text-sm">
              G
            </div>
            <span className="font-bold text-base tracking-tight text-[var(--text-primary)]">
              Go-Ya HRMS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onBackToLanding && (
            <button
              id="auth-landing-explore-btn"
              type="button"
              onClick={onBackToLanding}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors cursor-pointer hidden md:inline-block"
            >
              View Public Features
            </button>
          )}

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Form Box */}
      <div className="w-full max-w-md mx-auto my-auto py-8">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-7 shadow-xs space-y-6">
          {/* Header Title depending on mode */}
          <div className="space-y-1 text-center">
            <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
              {mode === 'login' && 'Welcome to Go-Ya HRMS'}
              {mode === 'signup' && 'Create Your HR Workspace'}
              {mode === 'forgot_password' && 'Reset your password'}
              {mode === 'invite' && 'Accept HR Analyst Invitation'}
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {mode === 'login' && 'Sign in to access your company HR dashboard and directory'}
              {mode === 'signup' && 'Set up your organization as the workspace HR Head'}
              {mode === 'forgot_password' && 'Enter your email to receive recovery instructions'}
              {mode === 'invite' && inviteDetails && (
                <>Join <span className="font-semibold text-[var(--text-primary)]">{inviteDetails.orgName}</span></>
              )}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. Login Mode */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Email Address
                </label>
                <input
                  id="login-email-input"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode('forgot_password');
                    }}
                    className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="login-password-input"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                />
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                {loading ? 'Signing in...' : 'Sign In'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Quick Demo Pre-fills */}
              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
                <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider text-center">
                  Demo Accounts
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('ignatius@korapay.com')}
                    className="p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-left transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-[var(--text-primary)]">HR Head</div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate">ignatius@korapay.com</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('analyst@korapay.com')}
                    className="p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-left transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-[var(--text-primary)]">HR Analyst</div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate">analyst@korapay.com</div>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* 2. Sign Up Mode (HR Head First Signup) */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Work Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="signup-email-input"
                  type="email"
                  required
                  placeholder="headofhr@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="signup-password-input"
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                />
              </div>

              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-3">
                <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Company / Workspace Details
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="signup-org-name-input"
                    type="text"
                    required
                    placeholder="e.g. Kora Innovations Ltd"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Country
                    </label>
                    <input
                      id="signup-country-input"
                      type="text"
                      required
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Base Currency
                    </label>
                    <select
                      id="signup-currency-select"
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
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Industry
                  </label>
                  <input
                    id="signup-industry-input"
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                  />
                </div>
              </div>

              <button
                id="signup-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                {loading ? 'Creating workspace...' : 'Create Workspace & Sign Up as HR Head'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* 3. Accept Invite Mode (HR Analyst direct landing) */}
          {mode === 'invite' && (
            <div className="space-y-4">
              {inviteLoading ? (
                <div className="py-6 text-center text-xs text-[var(--text-secondary)]">
                  Verifying invitation token...
                </div>
              ) : inviteDetails ? (
                <form onSubmit={handleAcceptInvite} className="space-y-4">
                  <div className="p-3.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-secondary)]">Workspace:</span>
                      <span className="font-semibold text-[var(--text-primary)]">{inviteDetails.orgName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-secondary)]">Invited As:</span>
                      <StatusPill role="hr_analyst" size="sm" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-secondary)]">Invited Email:</span>
                      <span className="text-[var(--text-primary)] font-medium">{inviteDetails.email}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Set Your Account Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="invite-password-input"
                      type="password"
                      required
                      placeholder="Choose a secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                    />
                  </div>

                  <button
                    id="accept-invite-submit-btn"
                    type="submit"
                    disabled={loading || !password}
                    className="w-full py-2.5 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    {loading ? 'Joining workspace...' : 'Set Password & Enter Workspace'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <div className="text-center py-4 text-xs text-red-500 space-y-2">
                  <p>Invite link is invalid or expired.</p>
                  <button
                    onClick={() => setMode('login')}
                    className="text-xs text-[var(--accent-blue)] hover:underline cursor-pointer"
                  >
                    Go to login
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 4. Forgot Password Mode */}
          {mode === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Account Email
                </label>
                <input
                  id="forgot-email-input"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                {loading ? 'Sending...' : 'Send Reset Instructions'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMessage(null);
                    setMode('login');
                  }}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Back to sign in
                </button>
              </div>
            </form>
          )}

          {/* Footer toggle between Login and Signup */}
          {mode !== 'invite' && (
            <div className="text-center pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
              {mode === 'login' ? (
                <>
                  First time setting up a workspace?{' '}
                  <button
                    id="switch-to-signup-btn"
                    onClick={() => {
                      setError(null);
                      setSuccessMessage(null);
                      setMode('signup');
                    }}
                    className="font-semibold text-[var(--text-primary)] hover:underline cursor-pointer"
                  >
                    Create workspace (HR Head)
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    id="switch-to-login-btn"
                    onClick={() => {
                      setError(null);
                      setSuccessMessage(null);
                      setMode('login');
                    }}
                    className="font-semibold text-[var(--text-primary)] hover:underline cursor-pointer"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center text-[11px] text-[var(--text-muted)] max-w-5xl mx-auto">
        Go-Ya HRMS · Multi-Tenant HR Platform for Ghana and International Operations
      </div>
    </div>
  );
};
