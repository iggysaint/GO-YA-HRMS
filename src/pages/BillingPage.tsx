import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Check,
  Zap,
  Shield,
  Clock,
  Users,
  Building2,
  Calendar,
  AlertTriangle,
  FileText,
  Download,
  Plus,
  Trash2,
  Star,
  CheckCircle2,
  X,
  Phone,
  Lock,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Building,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  Subscription,
  SubscriptionPlan,
  BillingCycle,
  Invoice,
  PaymentMethod,
  BillingDetailsResponse,
} from '../types';

interface BillingPageProps {
  onNavigateToDirectory?: () => void;
}

export const BillingPage: React.FC<BillingPageProps> = ({ onNavigateToDirectory }) => {
  const { role, organization, user, subscription, setSubscription, authFetch } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [billingData, setBillingData] = useState<BillingDetailsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Billing Cycle Toggle for upgrade matrix
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('annual');

  // Checkout Modal State
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [checkoutCycle, setCheckoutCycle] = useState<BillingCycle>('annual');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentChannel, setPaymentChannel] = useState<'card' | 'momo'>('card');
  const [momoNetwork, setMomoNetwork] = useState<'MTN' | 'Telecel' | 'Vodafone'>('MTN');
  const [momoNumber, setMomoNumber] = useState('0241234567');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardHolder, setCardHolder] = useState(user?.email?.split('@')[0] || 'Organization Admin');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('883');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Add Payment Method Modal State
  const [isAddPaymentMethodOpen, setIsAddPaymentMethodOpen] = useState(false);
  const [newPmChannel, setNewPmChannel] = useState<'card' | 'momo'>('card');
  const [newPmMomoNetwork, setNewPmMomoNetwork] = useState<'MTN' | 'Telecel' | 'Vodafone'>('MTN');
  const [newPmMomoNumber, setNewPmMomoNumber] = useState('');
  const [newPmCardNumber, setNewPmCardNumber] = useState('');
  const [newPmCardBrand, setNewPmCardBrand] = useState('Visa');

  // Cancel Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  // Enterprise Contact Sales Modal
  const [isContactSalesOpen, setIsContactSalesOpen] = useState(false);
  const [salesTeamSize, setSalesTeamSize] = useState('150 - 500');
  const [salesNotes, setSalesNotes] = useState('');
  const [isSubmittingSales, setIsSubmittingSales] = useState(false);

  // Invoice Preview Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Fetch complete billing details
  const fetchBillingDetails = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);

      const res = await authFetch('/api/billing/details');
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch billing details');
      }

      const data: BillingDetailsResponse = await res.json();
      setBillingData(data);
      if (data.subscription) {
        setSubscription(data.subscription);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (role === 'hr_head') {
      fetchBillingDetails();
    }
  }, [role]);

  // Open Paystack Checkout Modal for a specific tier
  const handleInitiateUpgrade = (plan: SubscriptionPlan) => {
    setCheckoutPlan(plan);
    setCheckoutCycle(selectedCycle);
    setPaymentError(null);
    setIsCheckoutOpen(true);
  };

  // Execute Paystack Verification
  const handleExecutePayment = async () => {
    if (!checkoutPlan || !['starter', 'professional'].includes(checkoutPlan)) return;

    try {
      setIsProcessingPayment(true);
      setPaymentError(null);

      // 1. Initialize reference with server
      const initRes = await authFetch('/api/billing/paystack/initialize', {
        method: 'POST',
        body: JSON.stringify({
          plan: checkoutPlan,
          billing_cycle: checkoutCycle,
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok) {
        throw new Error(initData.error || 'Failed to initialize Paystack transaction');
      }

      // 2. Complete payment via Paystack Verification Endpoint
      const verifyRes = await authFetch('/api/billing/paystack/verify', {
        method: 'POST',
        body: JSON.stringify({
          plan: checkoutPlan,
          billing_cycle: checkoutCycle,
          reference: initData.reference,
          payment_channel: paymentChannel,
          momo_network: paymentChannel === 'momo' ? momoNetwork : undefined,
          momo_number: paymentChannel === 'momo' ? momoNumber : undefined,
          card_brand: paymentChannel === 'card' ? 'Visa' : undefined,
          card_last4: paymentChannel === 'card' ? '4242' : undefined,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Payment verification failed');
      }

      // Update global context & local state
      if (verifyData.subscription) {
        setSubscription(verifyData.subscription);
      }

      setIsCheckoutOpen(false);
      setSuccessMessage(
        `Workspace upgraded successfully to ${checkoutPlan.charAt(0).toUpperCase() + checkoutPlan.slice(1)} Plan! Receipt ${verifyData.invoice?.invoice_number || ''} generated.`
      );

      // Refresh billing details
      await fetchBillingDetails(true);
    } catch (err: any) {
      setPaymentError(err.message || 'Payment processing failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Switch billing cycle for active subscription
  const handleChangeCycle = async (newCycle: BillingCycle) => {
    try {
      setRefreshing(true);
      const res = await authFetch('/api/billing/change-cycle', {
        method: 'POST',
        body: JSON.stringify({ billing_cycle: newCycle }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to switch billing cycle');
      }
      setSuccessMessage(`Billing cycle changed to ${newCycle}. Renewal rate updated.`);
      await fetchBillingDetails(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Cancel subscription
  const handleCancelSubscription = async () => {
    try {
      setIsCanceling(true);
      const res = await authFetch('/api/billing/cancel', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }
      setIsCancelModalOpen(false);
      setSuccessMessage(
        'Subscription canceled. Your workspace will remain active until the end of your billing period without data loss.'
      );
      await fetchBillingDetails(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCanceling(false);
    }
  };

  // Set default payment method
  const handleSetDefaultPaymentMethod = async (id: string) => {
    try {
      const res = await authFetch('/api/billing/payment-methods/default', {
        method: 'POST',
        body: JSON.stringify({ payment_method_id: id }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to set default payment method');
      }
      setSuccessMessage('Default payment method updated.');
      await fetchBillingDetails(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Delete payment method
  const handleDeletePaymentMethod = async (id: string) => {
    try {
      const res = await authFetch(`/api/billing/payment-methods/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete payment method');
      }
      setSuccessMessage('Payment method removed.');
      await fetchBillingDetails(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Submit Enterprise sales request
  const handleSubmitContactSales = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingSales(true);
      const res = await authFetch('/api/billing/contact-sales', {
        method: 'POST',
        body: JSON.stringify({
          team_size: salesTeamSize,
          message: salesNotes,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit inquiry');
      }
      setIsContactSalesOpen(false);
      setSuccessMessage('Enterprise inquiry submitted! An account executive will reach out within 24 hours.');
      setSalesNotes('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmittingSales(false);
    }
  };

  // Strict RLS Check: HR Head only
  if (role !== 'hr_head') {
    return (
      <div className="p-8 max-w-4xl mx-auto animate-in fade-in duration-200">
        <div className="p-8 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Access Restricted</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            Billing and subscription management is strictly reserved for Organization HR Heads. As an HR Analyst, you do not have permission to view or modify workspace billing credentials.
          </p>
        </div>
      </div>
    );
  }

  const currentSub = billingData?.subscription || subscription;
  const currentPlan = currentSub?.plan || 'free_trial';
  const employeeCount = billingData?.employee_count ?? 0;
  const employeeLimit = billingData?.employee_limit ?? (currentSub?.employee_limit || 10);
  const seatUsagePercent = Math.min(100, Math.round((employeeCount / Math.max(employeeLimit, 1)) * 100));
  const isAtSeatLimit = employeeCount >= employeeLimit;
  const trialDaysRemaining = billingData?.trial_days_remaining ?? 0;
  const isTrial = currentPlan === 'free_trial';
  const isCanceled = currentSub?.status === 'canceled';

  return (
    <div id="billing-page" className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Top Banner Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-200 text-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="p-1 rounded-md hover:bg-emerald-200/50 dark:hover:bg-emerald-900/50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 flex items-center justify-between gap-3 text-rose-800 dark:text-rose-200 text-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 rounded-md hover:bg-rose-200/50 dark:hover:bg-rose-900/50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Billing & Subscriptions</h1>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Manage your workspace plan, seat capacity, payment methods, and Ghana Cedis (GHS) invoices powered by Paystack.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="refresh-billing-btn"
            onClick={() => {
              setRefreshing(true);
              fetchBillingDetails(true);
            }}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-xs font-medium text-[var(--text-secondary)] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Current Plan Overview Card */}
      <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Plan Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Current Plan
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isTrial
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : currentSub?.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300'
                }`}
              >
                {isTrial ? '14-Day Free Trial' : `${currentPlan} (${currentSub?.billing_cycle || 'monthly'})`}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <h2 className="text-2xl font-extrabold text-[var(--text-primary)] capitalize">
                {currentPlan.replace('_', ' ')}
              </h2>
              {isCanceled && (
                <span className="text-xs px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-semibold">
                  Canceled (Active until period end)
                </span>
              )}
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {isTrial && trialDaysRemaining > 0 && (
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  {trialDaysRemaining} days remaining in trial.
                </span>
              )}
              {isTrial && trialDaysRemaining <= 0 && (
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  Trial expired. Employee additions are restricted until upgraded.
                </span>
              )}
              {!isTrial && currentSub?.current_period_end && (
                <span>
                  Next renewal:{' '}
                  <strong className="text-[var(--text-primary)]">
                    {new Date(currentSub.current_period_end).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </strong>
                </span>
              )}
            </p>

            {/* Billing Cycle Action */}
            {!isTrial && !isCanceled && (
              <div className="pt-2 flex items-center gap-2 text-xs">
                <span className="text-[var(--text-secondary)]">Cycle:</span>
                <span className="font-semibold capitalize text-[var(--text-primary)]">
                  {currentSub?.billing_cycle}
                </span>
                <button
                  onClick={() =>
                    handleChangeCycle(currentSub?.billing_cycle === 'annual' ? 'monthly' : 'annual')
                  }
                  className="text-amber-600 dark:text-amber-400 hover:underline font-medium ml-2 cursor-pointer"
                >
                  Switch to {currentSub?.billing_cycle === 'annual' ? 'Monthly' : 'Annual (Save 20%)'}
                </button>
              </div>
            )}
          </div>

          {/* Seat Capacity Bar */}
          <div className="space-y-3 lg:border-x lg:border-[var(--border-subtle)] lg:px-6">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                Seat Capacity
              </span>
              <span className="font-bold text-[var(--text-primary)]">
                {employeeCount} / {employeeLimit} seats ({seatUsagePercent}%)
              </span>
            </div>

            <div className="w-full bg-[var(--bg-subtle)] h-2.5 rounded-full overflow-hidden border border-[var(--border-subtle)]">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  seatUsagePercent >= 100
                    ? 'bg-rose-500'
                    : seatUsagePercent >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${seatUsagePercent}%` }}
              />
            </div>

            <p className="text-[11px] text-[var(--text-secondary)]">
              {isAtSeatLimit ? (
                <span className="text-rose-600 dark:text-rose-400 font-medium">
                  Seat limit reached. Upgrade your plan to add more team members.
                </span>
              ) : (
                <span>
                  {employeeLimit - employeeCount} seat{employeeLimit - employeeCount === 1 ? '' : 's'}{' '}
                  available on your current allocation.
                </span>
              )}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col justify-center gap-2.5">
            {isTrial || isAtSeatLimit || currentPlan === 'starter' ? (
              <button
                id="quick-upgrade-pro-btn"
                onClick={() => handleInitiateUpgrade('professional')}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 hover:opacity-90 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Upgrade to Professional</span>
              </button>
            ) : null}

            {isTrial && (
              <button
                id="quick-upgrade-starter-btn"
                onClick={() => handleInitiateUpgrade('starter')}
                className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Choose Starter Plan</span>
              </button>
            )}

            {!isTrial && !isCanceled && (
              <button
                id="cancel-sub-trigger-btn"
                onClick={() => setIsCancelModalOpen(true)}
                className="w-full py-2 px-3 text-[11px] text-[var(--text-muted)] hover:text-rose-600 transition-colors text-center cursor-pointer"
              >
                Cancel subscription
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Plan Matrix & Pricing Tiers */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Available Subscription Tiers</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              All plans include full Ghana Labour Act leave governance, directory records, and multi-tenant security.
            </p>
          </div>

          {/* Billing Cycle Switcher */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] self-start sm:self-auto">
            <button
              id="cycle-toggle-monthly"
              onClick={() => setSelectedCycle('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedCycle === 'monthly'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Monthly
            </button>
            <button
              id="cycle-toggle-annual"
              onClick={() => setSelectedCycle('annual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedCycle === 'annual'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>Annual</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* 3 Tier Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Plan 1: Starter */}
          <div
            className={`p-6 rounded-2xl border bg-[var(--bg-surface)] flex flex-col justify-between transition-all ${
              currentPlan === 'starter'
                ? 'border-emerald-500/60 ring-1 ring-emerald-500/30 shadow-xs'
                : 'border-[var(--border-subtle)] shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[var(--text-primary)]">Starter</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                  Up to 25 Seats
                </span>
              </div>
              <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                Core HR, employee records, attendance tracking, and Ghana leave management.
              </p>

              <div className="mt-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
                    {selectedCycle === 'annual' ? 'GHS 360' : 'GHS 450'}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">/ month</span>
                </div>
                <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                  {selectedCycle === 'annual'
                    ? 'Billed annually (GHS 4,320/yr)'
                    : 'Billed monthly (GHS 450/mo)'}
                </span>
              </div>

              <div className="mt-5 pt-5 border-t border-[var(--border-subtle)] space-y-2.5 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Up to 25 active employee seats</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Directory & Org Chart profiles</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Attendance & Ghana Labour Act Leave</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Document Vault & Expiration alerts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Tasks Board & Team Events</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
              {currentPlan === 'starter' ? (
                <button
                  disabled
                  className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-xs text-center cursor-default"
                >
                  Current Active Plan
                </button>
              ) : (
                <button
                  id="tier-select-starter-btn"
                  onClick={() => handleInitiateUpgrade('starter')}
                  className="w-full py-2.5 px-3 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold text-xs transition-colors cursor-pointer"
                >
                  Upgrade to Starter
                </button>
              )}
            </div>
          </div>

          {/* Plan 2: Professional (Featured) */}
          <div
            className={`p-6 rounded-2xl border-2 bg-[var(--bg-surface)] flex flex-col justify-between relative shadow-md ${
              currentPlan === 'professional'
                ? 'border-emerald-600 ring-2 ring-emerald-500/20'
                : 'border-stone-900 dark:border-stone-100'
            }`}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-[10px] font-bold uppercase tracking-wider">
              Most Popular
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[var(--text-primary)]">Professional</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Up to 50 Seats
                </span>
              </div>
              <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                Full AI Copilot, multi-currency payroll, and expense governance.
              </p>

              <div className="mt-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
                    {selectedCycle === 'annual' ? 'GHS 760' : 'GHS 950'}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">/ month</span>
                </div>
                <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                  {selectedCycle === 'annual'
                    ? 'Billed annually (GHS 9,120/yr)'
                    : 'Billed monthly (GHS 950/mo)'}
                </span>
              </div>

              <div className="mt-5 pt-5 border-t border-[var(--border-subtle)] space-y-2.5 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Everything in Starter, plus:</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Up to 50 active employee seats</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Multi-Currency Compensation (GHS, USD, GBP)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>SSNIT Tier 1/2 & GRA PAYE Engine</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Gemini AI HR Copilot & Policy Assistant</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Expense Management & Receipt Approvals</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Real-time Workspace Chat & Channels</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
              {currentPlan === 'professional' ? (
                <button
                  disabled
                  className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-xs text-center cursor-default"
                >
                  Current Active Plan
                </button>
              ) : (
                <button
                  id="tier-select-pro-btn"
                  onClick={() => handleInitiateUpgrade('professional')}
                  className="w-full py-2.5 px-3 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 hover:opacity-90 font-semibold text-xs transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>Upgrade to Professional</span>
                </button>
              )}
            </div>
          </div>

          {/* Plan 3: Enterprise */}
          <div
            className={`p-6 rounded-2xl border bg-[var(--bg-surface)] flex flex-col justify-between transition-all ${
              currentPlan === 'enterprise'
                ? 'border-purple-500/60 ring-1 ring-purple-500/30 shadow-xs'
                : 'border-[var(--border-subtle)] shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[var(--text-primary)]">Enterprise</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                  Unlimited Seats
                </span>
              </div>
              <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                Tailored for multi-entity conglomerates with custom integrations & SLAs.
              </p>

              <div className="mt-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">Custom</span>
                </div>
                <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                  Billed annually with dedicated invoice terms
                </span>
              </div>

              <div className="mt-5 pt-5 border-t border-[var(--border-subtle)] space-y-2.5 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>Unlimited employee capacity</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>Dedicated Ghanaian Account Manager</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>Custom Bank & Payroll Integrations</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>99.9% Uptime SLA & Priority Onboarding</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
              {currentPlan === 'enterprise' ? (
                <button
                  disabled
                  className="w-full py-2 px-3 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold text-xs text-center cursor-default"
                >
                  Current Active Plan
                </button>
              ) : (
                <button
                  id="tier-select-enterprise-btn"
                  onClick={() => setIsContactSalesOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold text-xs transition-colors cursor-pointer"
                >
                  Contact Sales
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods & Invoices Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payment Methods Section (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Payment Methods
            </h2>
            <button
              id="add-payment-method-btn"
              onClick={() => setIsAddPaymentMethodOpen(true)}
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {(!billingData?.payment_methods || billingData.payment_methods.length === 0) ? (
              <div className="p-5 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-center text-xs text-[var(--text-secondary)]">
                No payment methods saved yet. Upgrading will automatically store your card or Mobile Money wallet.
              </div>
            ) : (
              billingData.payment_methods.map((pm) => (
                <div
                  key={pm.id}
                  className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between gap-3 shadow-2xs hover:border-[var(--border-hover)] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0 font-bold text-xs border border-[var(--border-subtle)]">
                      {pm.brand.toLowerCase().includes('momo') || pm.brand.toLowerCase().includes('money') ? (
                        <Phone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <CreditCard className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {pm.brand} •••• {pm.last4}
                        </span>
                        {pm.is_default && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                            Default
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        Added {new Date(pm.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!pm.is_default && (
                      <button
                        onClick={() => handleSetDefaultPaymentMethod(pm.id)}
                        title="Set as Default"
                        className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer text-xs"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePaymentMethod(pm.id)}
                      title="Remove Payment Method"
                      className="p-1.5 rounded-md hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/30 border border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0 text-emerald-600 mt-0.5" />
            <span>
              Transactions are PCI-DSS Level 1 certified and processed through Paystack Payments Ghana.
            </span>
          </div>
        </div>

        {/* Invoices & History Section (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-stone-600 dark:text-stone-400" />
              Invoice History
            </h2>
            <span className="text-xs text-[var(--text-muted)]">
              All transactions in Ghana Cedis (GHS)
            </span>
          </div>

          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
            {(!billingData?.invoices || billingData.invoices.length === 0) ? (
              <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
                No invoices issued yet. Invoices are generated automatically upon successful payment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-muted)] font-semibold">
                      <th className="py-2.5 px-4">Invoice #</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4">Amount</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {billingData.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-[var(--text-primary)]">
                          {inv.invoice_number || inv.id}
                        </td>
                        <td className="py-3 px-4 text-[var(--text-secondary)]">
                          {new Date(inv.paid_at || inv.period_start).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-[var(--text-primary)] font-medium max-w-[220px] truncate">
                          {inv.description || 'Subscription renewal'}
                        </td>
                        <td className="py-3 px-4 font-bold text-[var(--text-primary)]">
                          GHS {inv.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            id={`view-invoice-${inv.id}`}
                            onClick={() => setSelectedInvoice(inv)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer"
                          >
                            <Download className="w-3 h-3 text-[var(--text-muted)]" />
                            <span>Receipt</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Paystack Checkout Modal */}
      {isCheckoutOpen && checkoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div
            id="paystack-checkout-modal"
            className="w-full max-w-lg bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--popover-shadow)] overflow-hidden my-6"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Checkout with Paystack
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Secure checkout in Ghana Cedis (GHS)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {paymentError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Order Summary */}
              <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Selected Plan</span>
                  <span className="font-bold text-[var(--text-primary)] capitalize">
                    {checkoutPlan} Tier ({checkoutCycle})
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Employee Seat Limit</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {checkoutPlan === 'starter' ? '25 seats' : '50 seats'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Billing Period</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {checkoutCycle === 'annual' ? '12 Months (20% Savings applied)' : '1 Month'}
                  </span>
                </div>
                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-baseline justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Total Due</span>
                  <span className="text-xl font-extrabold text-[var(--text-primary)]">
                    GHS{' '}
                    {(checkoutPlan === 'starter'
                      ? checkoutCycle === 'annual'
                        ? 4320
                        : 450
                      : checkoutCycle === 'annual'
                      ? 9120
                      : 950
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentChannel('card')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold transition-all cursor-pointer ${
                      paymentChannel === 'card'
                        ? 'border-amber-600 bg-amber-500/5 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20'
                        : 'border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Credit / Debit Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentChannel('momo')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold transition-all cursor-pointer ${
                      paymentChannel === 'momo'
                        ? 'border-amber-600 bg-amber-500/5 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20'
                        : 'border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                    <span>Mobile Money (MoMo)</span>
                  </button>
                </div>
              </div>

              {/* Card Inputs */}
              {paymentChannel === 'card' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                        Expiry
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                        CVV
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* MoMo Inputs */
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      Network Provider
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['MTN', 'Telecel', 'Vodafone'] as const).map((net) => (
                        <button
                          key={net}
                          type="button"
                          onClick={() => setMomoNetwork(net)}
                          className={`py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer ${
                            momoNetwork === net
                              ? 'border-amber-600 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                              : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
                          }`}
                        >
                          {net}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      Mobile Money Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 024 123 4567"
                      value={momoNumber}
                      onChange={(e) => setMomoNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                      A prompt will be sent to your phone to approve the debited GHS amount.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Paystack 256-bit SSL</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  disabled={isProcessingPayment}
                  className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-secondary)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="confirm-paystack-payment-btn"
                  type="button"
                  onClick={handleExecutePayment}
                  disabled={isProcessingPayment}
                  className="px-5 py-2 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-bold text-xs hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessingPayment ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying with Paystack...</span>
                    </>
                  ) : (
                    <span>
                      Pay GHS{' '}
                      {(checkoutPlan === 'starter'
                        ? checkoutCycle === 'annual'
                          ? 4320
                          : 450
                        : checkoutCycle === 'annual'
                        ? 9120
                        : 950
                      ).toLocaleString()}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Method Modal */}
      {isAddPaymentMethodOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--popover-shadow)] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Add Payment Method</h3>
              <button
                onClick={() => setIsAddPaymentMethodOpen(false)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Channel
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPmChannel('card')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer ${
                      newPmChannel === 'card'
                        ? 'border-amber-600 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPmChannel('momo')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer ${
                      newPmChannel === 'momo'
                        ? 'border-amber-600 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    Mobile Money
                  </button>
                </div>
              </div>

              {newPmChannel === 'card' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Card Brand
                    </label>
                    <select
                      value={newPmCardBrand}
                      onChange={(e) => setNewPmCardBrand(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)]"
                    >
                      <option value="Visa">Visa</option>
                      <option value="Mastercard">Mastercard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      placeholder="•••• •••• •••• 8832"
                      value={newPmCardNumber}
                      onChange={(e) => setNewPmCardNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] font-mono"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Provider
                    </label>
                    <select
                      value={newPmMomoNetwork}
                      onChange={(e) => setNewPmMomoNetwork(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)]"
                    >
                      <option value="MTN">MTN MoMo</option>
                      <option value="Telecel">Telecel Cash</option>
                      <option value="Vodafone">Vodafone Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      placeholder="024 123 4567"
                      value={newPmMomoNumber}
                      onChange={(e) => setNewPmMomoNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] font-mono"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddPaymentMethodOpen(false)}
                className="px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  // Simulate verification & add via verify endpoint
                  setIsAddPaymentMethodOpen(false);
                  setSuccessMessage('Payment method saved and verified via Paystack tokenization.');
                }}
                className="px-4 py-2 rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-bold cursor-pointer"
              >
                Save Method
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Viewer / Receipt Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            id="invoice-receipt-modal"
            className="w-full max-w-lg bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--popover-shadow)] p-6 space-y-6"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Tax Receipt & Invoice
                </span>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  {selectedInvoice.invoice_number || selectedInvoice.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Details */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[var(--bg-subtle)]">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Issued By</span>
                  <span className="font-bold text-[var(--text-primary)] block">Go-Ya HRMS Limited</span>
                  <span className="text-[11px] text-[var(--text-secondary)]">Accra, Ghana • TIN: C002948192</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Billed To</span>
                  <span className="font-bold text-[var(--text-primary)] block">{organization?.name || 'Workspace'}</span>
                  <span className="text-[11px] text-[var(--text-secondary)]">{organization?.country || 'Ghana'}</span>
                </div>
              </div>

              <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
                    <tr>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    <tr>
                      <td className="py-3 px-3 text-[var(--text-primary)]">
                        {selectedInvoice.description}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[var(--text-primary)]">
                        GHS {selectedInvoice.amount.toLocaleString()}
                      </td>
                    </tr>
                    <tr className="bg-[var(--bg-subtle)] font-bold">
                      <td className="py-2.5 px-3 text-[var(--text-primary)]">Total Paid (VAT Incl.)</td>
                      <td className="py-2.5 px-3 text-right text-[var(--text-primary)]">
                        GHS {selectedInvoice.amount.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                <span>Date: {new Date(selectedInvoice.paid_at || selectedInvoice.period_start).toLocaleDateString()}</span>
                <span>Payment Gateway: Paystack</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>Print / Download PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--popover-shadow)] p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Cancel Subscription?</h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                Your subscription will remain active until the end of the current billing period on{' '}
                <strong>
                  {currentSub?.current_period_end
                    ? new Date(currentSub.current_period_end).toLocaleDateString()
                    : 'renewal date'}
                </strong>
                . After that, your workspace will enter restricted read-only mode. No employee records or compensation data will be deleted.
              </p>
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isCanceling}
                className="px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] cursor-pointer"
              >
                Keep Subscription
              </button>
              <button
                id="confirm-cancel-subscription-btn"
                type="button"
                onClick={handleCancelSubscription}
                disabled={isCanceling}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer disabled:opacity-50"
              >
                {isCanceling ? 'Canceling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Sales Modal */}
      {isContactSalesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--popover-shadow)] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Contact Enterprise Sales</h3>
              <button
                onClick={() => setIsContactSalesOpen(false)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitContactSales} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Expected Organization Size
                </label>
                <select
                  value={salesTeamSize}
                  onChange={(e) => setSalesTeamSize(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)]"
                >
                  <option value="50 - 150">50 - 150 Employees</option>
                  <option value="150 - 500">150 - 500 Employees</option>
                  <option value="500+">500+ Employees (Multi-Entity)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Custom Requirements or Integration Notes
                </label>
                <textarea
                  rows={3}
                  value={salesNotes}
                  onChange={(e) => setSalesNotes(e.target.value)}
                  placeholder="e.g. Need bespoke Ecobank payroll file integration, SSO, custom onboarding."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsContactSalesOpen(false)}
                  className="px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-contact-sales-btn"
                  type="submit"
                  disabled={isSubmittingSales}
                  className="px-4 py-2 rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingSales ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
