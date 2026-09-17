import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  Users,
  Calendar,
  Clock,
  DollarSign,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowUpRight,
  Globe,
  Building2,
  ChevronDown,
  ChevronUp,
  FileText,
  Check,
  AlertCircle,
  HelpCircle,
  Send,
  MessageSquare,
  Briefcase,
  Zap,
  Award,
  Sun,
  Moon,
  Menu,
  X,
  Landmark,
  Layers,
  Scale,
  TrendingUp,
} from 'lucide-react';

interface LandingPageProps {
  onNavigateToAuth: (mode: 'login' | 'signup') => void;
  onNavigateToPlatformAdmin?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToAuth, onNavigateToPlatformAdmin }) => {
  const { theme, toggleTheme } = useTheme();

  // Navigation & Interactive states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'compliance' | 'intelligence'>('overview');
  const [activeFeatureFilter, setActiveFeatureFilter] = useState<'all' | 'core' | 'compliance' | 'ai'>('all');

  // Lead capture / Demo request form state
  const [demoForm, setDemoForm] = useState({
    name: '',
    email: '',
    company_name: '',
    team_size: '25-100',
    message: '',
  });
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState<string | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDemoError(null);
    setDemoSuccess(null);

    if (!demoForm.name.trim() || !demoForm.email.trim() || !demoForm.company_name.trim()) {
      setDemoError('Please complete your name, work email, and company name.');
      return;
    }

    setDemoSubmitting(true);
    try {
      const res = await fetch('/api/demo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demoForm),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit demo request. Please try again.');
      }

      setDemoSuccess(
        data.message ||
          `Thank you, ${demoForm.name}! Your demo request has been received. An enterprise HR specialist will contact you at ${demoForm.email} within 24 hours.`
      );
      setDemoForm({
        name: '',
        email: '',
        company_name: '',
        team_size: '25-100',
        message: '',
      });
    } catch (err: any) {
      setDemoError(err.message || 'Network error submitting request. Please try again.');
    } finally {
      setDemoSubmitting(false);
    }
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Feature repository reflecting real capabilities built into Go-Ya HRMS
  const allFeatures = [
    {
      id: 'feat-dir',
      category: 'core',
      icon: Users,
      title: 'Workforce Directory & Architecture',
      description:
        'Unified employee profiles, department hierarchies, direct reports, emergency contacts, and banking details with multi-tenant role-based access control.',
      badge: 'Core HR',
    },
    {
      id: 'feat-att',
      category: 'core',
      icon: Clock,
      title: 'Rosters & Attendance Tracking',
      description:
        'Daily clock-in/clock-out capture, monthly employee timesheet records, late arrival monitoring, and real-time daily operational attendance summaries.',
      badge: 'Time & Attendance',
    },
    {
      id: 'feat-leave',
      category: 'compliance',
      icon: Calendar,
      title: 'Ghana Labour Act Leave Management',
      description:
        'Act 651 statutory leave rules, annual and sick allowances, maternity/paternity support, and automatic escalation to the HR Head for leaves exceeding threshold.',
      badge: 'Ghana Labour Act 651',
    },
    {
      id: 'feat-payroll',
      category: 'compliance',
      icon: DollarSign,
      title: 'Multi-Currency Compensation & Payroll',
      description:
        'Full support for GHS, USD, and GBP compensation packages with automated Ghana SSNIT Tier 1 & 2 deductions and GRA PAYE tax calculation logic.',
      badge: 'SSNIT & GRA PAYE',
    },
    {
      id: 'feat-comp',
      category: 'compliance',
      icon: ShieldCheck,
      title: 'Statutory Compliance & Expiry Audits',
      description:
        'Continuous compliance scoring, Ghana Card and TIN verification, expat work permit and visa tracking, and automated document expiration warnings.',
      badge: 'Compliance Center',
    },
    {
      id: 'feat-ai',
      category: 'ai',
      icon: Sparkles,
      title: 'Gemini AI People Operations Copilot',
      description:
        'Deeply integrated Gemini assistant for natural language HR policies, Ghana labour law inquiries, automated staff summaries, and instant document drafting.',
      badge: 'AI-Powered',
    },
    {
      id: 'feat-tasks',
      category: 'core',
      icon: Layers,
      title: 'Automated Onboarding & Task Kanban',
      description:
        'Country-specific onboarding checklists for Ghana, UK, and US hires, structured offboarding clearances, priority tagging, and workflow kanban boards.',
      badge: 'Lifecycle & Tasks',
    },
    {
      id: 'feat-exp',
      category: 'compliance',
      icon: TrendingUp,
      title: 'Expense Governance & Multi-Currency Claims',
      description:
        'Multi-currency employee expense claims (GHS/USD), PDF receipt validation, per-category budget policies, and multi-stage manager approval queues.',
      badge: 'Financial Governance',
    },
    {
      id: 'feat-rec',
      category: 'core',
      icon: Briefcase,
      title: 'Recruitment Pipeline & Candidate Scoring',
      description:
        'Stage-based talent pipeline, structured interview scorecards, candidate notes, and 1-click conversion from accepted offer directly into onboarding.',
      badge: 'Talent Acquisition',
    },
    {
      id: 'feat-events',
      category: 'core',
      icon: Landmark,
      title: 'Company Calendar & Statutory Holidays',
      description:
        'All-hands townhall scheduling, cross-country public holiday calendars (Ghana, United Kingdom, United States), and instant company-wide alerts.',
      badge: 'Organization',
    },
  ];

  const filteredFeatures =
    activeFeatureFilter === 'all'
      ? allFeatures
      : allFeatures.filter((f) => f.category === activeFeatureFilter);

  const faqItems = [
    {
      q: 'How does Go-Ya HRMS address Ghana statutory compliance requirements?',
      a: 'Go-Ya HRMS is built natively for Ghanaian employment law. It enforces Ghana Labour Act (Act 651) provisions for paid annual leave, notice periods, and overtime, while automatically calculating statutory SSNIT contributions (Tier 1 & Tier 2) and GRA PAYE progressive income tax bands. It also tracks mandatory national identity records including Ghana Card PINs and TINs.',
    },
    {
      q: 'Can international companies manage Ghana subsidiaries and pay in foreign currencies?',
      a: 'Yes. Go-Ya HRMS is purpose-built for international and multi-territory enterprises operating in Ghana. You can designate international parent organizations, configure contracts in USD, GBP, EUR, or GHS, track expatriate work permits and visas, and maintain statutory compliance for local Ghanaian staff simultaneously.',
    },
    {
      q: 'How does the Gemini AI Assistant protect confidential employee data?',
      a: 'The AI assistant operates strictly within tenant-isolated boundaries. It processes contextual queries through secure server-side API routes, strictly respecting role-based access control (RBAC). Sensitive data like personal compensation or banking details is never exposed across role boundaries or retained for external model training.',
    },
    {
      q: 'What is included in the 14-day free trial?',
      a: 'The 14-day free trial gives you full, unrestricted access to the complete Go-Ya HRMS suite — including workforce directory, automated attendance rosters, Ghana statutory leave tracking, multi-currency payroll calculations, and the Gemini AI copilot. No credit card is required to start.',
    },
    {
      q: 'How does team onboarding and data migration work?',
      a: 'You can immediately import existing employee lists via standard CSV spreadsheets or invite team members directly by email. New accounts come pre-configured with statutory Ghana leave types, statutory deduction templates, and standardized departmental structures so you can be operational in under 10 minutes.',
    },
    {
      q: 'Can we customize leave rules and managerial escalation thresholds?',
      a: 'Absolutely. While Go-Ya HRMS provides Ghana Labour Act statutory defaults out of the box, organization administrators can define custom leave types, set unique accrual policies, and configure leave escalation thresholds (e.g., auto-routing leave requests exceeding 3 days directly to the HR Head).',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col selection:bg-stone-900 selection:text-white dark:selection:bg-stone-100 dark:selection:text-stone-900 font-sans antialiased">
      {/* ------------------------------------------------------------- */}
      {/* 1. Top Navigation Bar                                         */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--border-subtle)] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Product Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 flex items-center justify-center font-bold text-base shadow-xs group-hover:scale-105 transition-transform">
                G
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-[var(--text-primary)] leading-tight">
                  Go-Ya HRMS
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] font-medium tracking-wide">
                  Ghana & Global HR Platform
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--text-secondary)]">
            <button
              onClick={() => scrollToSection('overview')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Overview
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('compliance')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center gap-1"
            >
              <Scale className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Ghana Compliance
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              FAQ
            </button>
            <button
              onClick={() => scrollToSection('demo')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Request Demo
            </button>
          </nav>

          {/* Right Action Controls: Theme + Auth CTAs */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <button
              id="landing-login-btn"
              onClick={() => onNavigateToAuth('login')}
              className="px-3.5 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors cursor-pointer"
            >
              Login
            </button>

            <button
              id="landing-signup-cta-nav"
              onClick={() => onNavigateToAuth('signup')}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 transition-colors shadow-xs cursor-pointer"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Mobile menu hamburger toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-4 space-y-2">
            <button
              onClick={() => scrollToSection('overview')}
              className="block w-full text-left py-2 px-3 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              Overview
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="block w-full text-left py-2 px-3 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('compliance')}
              className="block w-full text-left py-2 px-3 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              Ghana & Global Compliance
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="block w-full text-left py-2 px-3 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="block w-full text-left py-2 px-3 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              FAQ
            </button>
            <button
              onClick={() => scrollToSection('demo')}
              className="block w-full text-left py-2 px-3 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              Contact / Demo
            </button>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => onNavigateToAuth('signup')}
                className="w-full text-center py-2 text-sm font-semibold rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. Hero Section                                               */}
      {/* ------------------------------------------------------------- */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden border-b border-[var(--border-subtle)] bg-radial from-[var(--bg-subtle)] to-[var(--bg-primary)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Ghana Flag & Global Operations Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs mb-6 text-xs font-medium text-[var(--text-secondary)]">
            <span className="flex items-center gap-1 font-semibold text-[var(--text-primary)]">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Ghana First
            </span>
            <span className="text-[var(--border-subtle)]">|</span>
            <span>Labour Act 651 & SSNIT Compliant</span>
            <span className="text-[var(--border-subtle)]">|</span>
            <span className="flex items-center gap-1 text-[var(--text-primary)]">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              Global Teams (GHS, USD, GBP)
            </span>
          </div>

          {/* Main Title & One-Line Value Prop */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[var(--text-primary)] tracking-tight max-w-4xl mx-auto leading-tight">
            Ghana-focused, AI-native HR platform for local and international companies
          </h1>

          <p className="mt-5 text-base sm:text-lg lg:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto font-normal leading-relaxed">
            Eliminate compliance risk and automate people operations. Built natively for Ghana
            statutory regulations, multi-currency payroll, and intelligent workforce management.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
            <button
              id="hero-start-trial-cta"
              onClick={() => onNavigateToAuth('signup')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-stone-900 text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-all hover:translate-y-[-1px] cursor-pointer"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              id="hero-login-cta"
              onClick={() => onNavigateToAuth('login')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Login to Workspace</span>
            </button>
          </div>

          {/* Trust Highlights / Proof points */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>GRA PAYE & SSNIT Tier 1 & 2 ready</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Enterprise multi-tenant RBAC</span>
            </div>
          </div>

          {/* Interactive Hero Product Preview Card */}
          <div className="mt-12 max-w-5xl mx-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-lg overflow-hidden text-left">
            {/* Window Topbar */}
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400/80"></div>
                <span className="ml-2 text-xs font-mono text-[var(--text-secondary)]">
                  app.goyahrms.com/dashboard
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Live Tenant: KoraPay Ghana Ltd
                </span>
                <span className="text-[11px] font-mono text-[var(--text-secondary)]">Accra, GH</span>
              </div>
            </div>

            {/* Dashboard Content Mockup */}
            <div className="p-5 sm:p-6 space-y-6">
              {/* Stat Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                  <span className="text-xs text-[var(--text-secondary)] block">Active Workforce</span>
                  <div className="text-2xl font-bold text-[var(--text-primary)] mt-1 flex items-baseline gap-2">
                    <span>48</span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      +4 this mo
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                  <span className="text-xs text-[var(--text-secondary)] block">Today Attendance</span>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-baseline gap-2">
                    <span>95.8%</span>
                    <span className="text-xs text-[var(--text-secondary)] font-normal">2 on leave</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                  <span className="text-xs text-[var(--text-secondary)] block">Statutory Compliance</span>
                  <div className="text-2xl font-bold text-[var(--text-primary)] mt-1 flex items-baseline gap-2">
                    <span>98.4%</span>
                    <span className="text-[10px] uppercase font-bold text-blue-600">SSNIT / GRA</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                  <span className="text-xs text-[var(--text-secondary)] block">Multi-Currency Run</span>
                  <div className="text-2xl font-bold text-[var(--text-primary)] mt-1 flex items-baseline gap-1">
                    <span>GHS 184k</span>
                    <span className="text-xs text-[var(--text-secondary)] font-normal">/ $22k USD</span>
                  </div>
                </div>
              </div>

              {/* Sample Live Feature Panes */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Panel 1: Ghana Statutory Alerts */}
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Statutory Compliance Alerts
                    </span>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                          SSNIT Tier 1 & 2 Reconciled
                        </p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                          All 48 employee contributions validated for current cycle.
                        </p>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-amber-900 dark:text-amber-200">
                          Expat Visa Renewal (UK Specialist)
                        </p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300">
                          Ghana Immigration quota work permit expires in 28 days.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panel 2: Leave & Escalation Workflow */}
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Pending Approvals
                    </span>
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">Abena Osei (Engineering)</p>
                        <p className="text-[11px] text-[var(--text-secondary)]">Annual Leave • 4 Days</p>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Escalated to Head
                      </span>
                    </div>
                    <div className="p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">Kwame Mensah (Ops)</p>
                        <p className="text-[11px] text-[var(--text-secondary)]">Expense Claim • GHS 1,450</p>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Receipt Verified
                      </span>
                    </div>
                  </div>
                </div>

                {/* Panel 3: Gemini AI Copilot Query */}
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      Gemini Copilot
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono">
                      Ghana Labour Law
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 text-xs space-y-1.5">
                    <p className="font-medium text-purple-900 dark:text-purple-200">
                      "Under Act 651, what is our notice requirement for a 3-year contract engineer?"
                    </p>
                    <p className="text-[11px] text-purple-800 dark:text-purple-300 leading-normal">
                      <strong>AI Answer:</strong> Section 15(c) requires one month notice or one
                      month pay in lieu of notice for continuous employment exceeding three years.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. Product Overview / How It Works                            */}
      {/* ------------------------------------------------------------- */}
      <section id="overview" className="py-16 md:py-24 border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-blue)]">
              How It Works
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-[var(--text-primary)] mt-2 tracking-tight">
              A modern HR architecture tailored to African growth and global scale
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-3">
              Go-Ya HRMS replaces fragmented spreadsheets and generic foreign HR tools with a
              purpose-built platform that honors local statutory reality.
            </p>
          </div>

          {/* 3 Progressive Steps */}
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] relative group hover:border-stone-400 dark:hover:border-stone-600 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 flex items-center justify-center font-bold text-base mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Setup Workspace & Statutory Defaults
              </h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                Choose your local Ghanaian headquarters or international parent entity. Set your
                reporting currencies (GHS, USD, GBP), and let Go-Ya automatically initialize Ghana
                SSNIT, GRA PAYE, and Act 651 leave policies.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-[var(--text-secondary)]">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pre-loaded statutory deduction rates</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Custom department and hierarchy trees</span>
                </li>
              </ul>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] relative group hover:border-stone-400 dark:hover:border-stone-600 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 flex items-center justify-center font-bold text-base mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Streamline Workforce Operations
              </h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                Run daily attendance tracking, automated leave requests with managerial escalation,
                and document verification. Ensure all staff have valid Ghana Cards, TINs, and
                unexpired visas.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-[var(--text-secondary)]">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Automated multi-tier leave approvals</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Proactive document expiry notifications</span>
                </li>
              </ul>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] relative group hover:border-stone-400 dark:hover:border-stone-600 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 flex items-center justify-center font-bold text-base mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Unlock AI Intelligence & Instant Audits
              </h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                Ask the Gemini AI assistant to summarize complex regulatory documents, analyze team
                attrition risks, draft statutory employment contracts, and export clean audit reports
                for tax authorities and boards.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-[var(--text-secondary)]">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Interactive Gemini AI HR copilot</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1-click board and GRA audit exports</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. Complete Features Grid                                     */}
      {/* ------------------------------------------------------------- */}
      <section id="features" className="py-16 md:py-24 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-blue)]">
                Built For Real Operations
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold text-[var(--text-primary)] mt-2 tracking-tight">
                Everything required to run modern HR in Ghana
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Every feature below is fully implemented and live in the Go-Ya HRMS platform.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl self-start md:self-auto">
              <button
                onClick={() => setActiveFeatureFilter('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeFeatureFilter === 'all'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                All (10)
              </button>
              <button
                onClick={() => setActiveFeatureFilter('core')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeFeatureFilter === 'core'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Core HR
              </button>
              <button
                onClick={() => setActiveFeatureFilter('compliance')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeFeatureFilter === 'compliance'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Compliance & Pay
              </button>
              <button
                onClick={() => setActiveFeatureFilter('ai')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeFeatureFilter === 'ai'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                AI Copilot
              </button>
            </div>
          </div>

          {/* Grid of features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFeatures.map((feat) => {
              const IconComp = feat.icon;
              return (
                <div
                  key={feat.id}
                  className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-stone-400 dark:hover:border-stone-600 transition-all flex flex-col justify-between group shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] group-hover:scale-105 transition-transform">
                        <IconComp className="w-5 h-5 text-[var(--accent-blue)]" />
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                        {feat.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors">
                      {feat.title}
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                      {feat.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]/60 flex items-center text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors">
                    <span>Explore in trial</span>
                    <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5. Global & Ghana Statutory Compliance Section                */}
      {/* ------------------------------------------------------------- */}
      <section id="compliance" className="py-16 md:py-24 border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Narrative */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-4">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Ghana Labour Law & Statutory Authority Aligned</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
                Designed for Ghana's complex statutory framework and cross-border operations
              </h2>

              <p className="mt-4 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                Most international HR platforms treat Africa as an afterthought, forcing teams into
                dangerous manual spreadsheet reconciliations. Go-Ya HRMS builds local legal
                guarantees straight into your daily workflow.
              </p>

              <div className="mt-6 space-y-4">
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    Ghana Labour Act, 2003 (Act 651)
                  </h4>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Enforces statutory annual leave allocations (minimum 15 working days), lawful
                    maternity entitlements, overtime remuneration, and structured severance notice
                    periods.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-emerald-600" />
                    SSNIT Act 766 & Tier 1/2/3 Pension Schemes
                  </h4>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Calculates the 13.5% employer and 5.5% employee mandatory SSNIT contributions
                    with automated Tier 1 trust fund remissions and Tier 2 private custodian splits.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-600" />
                    International Companies With Ghana Operations
                  </h4>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Seamlessly manage UK, US, European, or Pan-African subsidiaries. Split contracts
                    between local GHS currency and international USD/GBP accounts, with automatic
                    expatriate visa and work permit tracking.
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => scrollToSection('demo')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-semibold text-xs shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <span>Request Compliance Consultation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right Statutory Matrix Card */}
            <div className="p-6 sm:p-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-md space-y-5">
              <h3 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-3 flex items-center justify-between">
                <span>Compliance Automation Matrix</span>
                <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">
                  ● Continuous Verification
                </span>
              </h3>

              <div className="space-y-3.5 text-xs">
                <div className="flex items-start justify-between p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                  <div>
                    <span className="font-semibold text-[var(--text-primary)]">Ghana Card PIN & TIN</span>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      GRA mandate requirement for payroll & PAYE
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Validated
                  </span>
                </div>

                <div className="flex items-start justify-between p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                  <div>
                    <span className="font-semibold text-[var(--text-primary)]">SSNIT Tier 1 & 2 Rates</span>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      13.5% employer / 5.5% employee split
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Automated
                  </span>
                </div>

                <div className="flex items-start justify-between p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                  <div>
                    <span className="font-semibold text-[var(--text-primary)]">Expat Work Quotas & Visas</span>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Ghana Immigration Service validity monitoring
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    Tracked
                  </span>
                </div>

                <div className="flex items-start justify-between p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                  <div>
                    <span className="font-semibold text-[var(--text-primary)]">Multi-Currency Payroll Run</span>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Concurrent GHS, USD, & GBP contract ledgers
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Supported
                  </span>
                </div>

                <div className="flex items-start justify-between p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                  <div>
                    <span className="font-semibold text-[var(--text-primary)]">Act 651 Leave Escalation</span>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Automated routing to HR Head when &gt; 3 days
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Active
                  </span>
                </div>
              </div>

              <div className="pt-2 text-center">
                <span className="text-[11px] text-[var(--text-secondary)]">
                  Full audit log exportable directly for Ghana Revenue Authority audits.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 6. Pricing Plans Section                                      */}
      {/* ------------------------------------------------------------- */}
      <section id="pricing" className="py-16 md:py-24 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-blue)]">
              Transparent Pricing
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-[var(--text-primary)] mt-2 tracking-tight">
              Predictable plans built for businesses of every size
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-3">
              Start with a 14-day free trial. Upgrade, downgrade, or cancel anytime with zero lock-in.
            </p>

            {/* Monthly / Annual Billing Toggle */}
            <div className="mt-8 inline-flex items-center gap-3 p-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  billingCycle === 'annual'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>Annual Billing</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Plan 1: Starter */}
            <div className="p-7 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Starter</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                    1 – 25 Employees
                  </span>
                </div>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  Essential workforce management and Ghana compliance for emerging companies.
                </p>

                <div className="mt-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)]">
                      {billingCycle === 'annual' ? 'GHS 280' : 'GHS 350'}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">/ month</span>
                  </div>
                  <span className="text-[11px] text-[var(--text-secondary)] block mt-0.5">
                    {billingCycle === 'annual' ? 'Billed annually (~$22 USD/mo)' : 'Billed monthly'}
                  </span>
                </div>

                <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] space-y-3 text-xs text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Complete Employee Directory & Profiles</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Daily Attendance & Timesheet Logs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Ghana Labour Act Leave Management</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Document Vault & Expiration Tracking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Standard Email Notifications</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  id="pricing-starter-cta"
                  onClick={() => onNavigateToAuth('signup')}
                  className="w-full py-2.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold text-xs transition-colors cursor-pointer"
                >
                  Start 14-Day Free Trial
                </button>
              </div>
            </div>

            {/* Plan 2: Professional (Featured) */}
            <div className="p-7 rounded-2xl border-2 border-stone-900 dark:border-stone-100 bg-[var(--bg-surface)] flex flex-col justify-between relative shadow-md">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-[10px] font-bold uppercase tracking-wider">
                Most Popular
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Professional</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    25 – 150 Employees
                  </span>
                </div>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  Full AI copilot, multi-currency payroll calculations, and expense governance.
                </p>

                <div className="mt-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)]">
                      {billingCycle === 'annual' ? 'GHS 680' : 'GHS 850'}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">/ month</span>
                  </div>
                  <span className="text-[11px] text-[var(--text-secondary)] block mt-0.5">
                    {billingCycle === 'annual' ? 'Billed annually (~$55 USD/mo)' : 'Billed monthly'}
                  </span>
                </div>

                <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] space-y-3 text-xs text-[var(--text-primary)]">
                  <div className="flex items-center gap-2 font-medium">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Everything in Starter, plus:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Multi-Currency Compensation (GHS, USD, GBP)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>SSNIT Tier 1/2 & GRA PAYE Calculation Engine</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Gemini AI HR Copilot & Policy Summarizer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Multi-Tier Expense Approvals & Receipt OCR</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Candidate Pipeline & Interview Scorecards</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Real-Time Internal Team Chat & Channels</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  id="pricing-pro-cta"
                  onClick={() => onNavigateToAuth('signup')}
                  className="w-full py-2.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Start 14-Day Free Trial
                </button>
              </div>
            </div>

            {/* Plan 3: Enterprise */}
            <div className="p-7 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Enterprise</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                    150+ Employees
                  </span>
                </div>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  For large multinational groups, banks, fintechs, and high-volume subsidiaries.
                </p>

                <div className="mt-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)]">
                      Custom
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--text-secondary)] block mt-0.5">
                    Tailored multi-subsidiary billing
                  </span>
                </div>

                <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] space-y-3 text-xs text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Everything in Professional, plus:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Multi-Tenant Group & Holding Structures</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Custom SSNIT / GRA Direct Bank Export Bridges</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Dedicated SLA & Priority 24/7 Support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Custom Role Permissions & Security Hardening</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  id="pricing-enterprise-cta"
                  onClick={() => scrollToSection('demo')}
                  className="w-full py-2.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold text-xs transition-colors cursor-pointer"
                >
                  Contact Sales & Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 7. Customer Testimonials Section                              */}
      {/* ------------------------------------------------------------- */}
      <section className="py-16 md:py-24 border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-blue)]">
              Trusted By People Leaders
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-[var(--text-primary)] mt-2 tracking-tight">
              Empowering HR teams across Accra, London, and beyond
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Testimonial 1 */}
            <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between shadow-xs">
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed italic">
                "Go-Ya HRMS transformed our Ghana payroll and SSNIT compliance. What used to take our
                finance and people team three days at the end of each month now completes in minutes,
                and our London headquarters has real-time visibility."
              </p>
              <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-stone-200 dark:bg-stone-800 text-[var(--text-primary)] flex items-center justify-center font-bold text-xs">
                  KM
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">Kofi Mensah</h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Head of People Ops, PayFlow Africa (Accra)
                  </p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between shadow-xs">
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed italic">
                "Managing multi-currency compensation between GBP and GHS was our biggest operational
                headache. The automated expat visa monitoring and Ghana Labour Act leave rules give our
                leadership complete statutory peace of mind."
              </p>
              <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-stone-200 dark:bg-stone-800 text-[var(--text-primary)] flex items-center justify-center font-bold text-xs">
                  SJ
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">Sarah Jenkins</h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    VP People & Culture, Horizon Logistics (UK & Ghana)
                  </p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between shadow-xs">
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed italic">
                "The built-in Gemini AI Copilot is like having a seasoned Ghanaian labour lawyer on call
                24/7. Our managers get instant, accurate citations on Act 651 without waiting for external
                counsel opinions."
              </p>
              <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-stone-200 dark:bg-stone-800 text-[var(--text-primary)] flex items-center justify-center font-bold text-xs">
                  EA
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    Dr. Elikem Adadevoh
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Operations Director, Volta Agritech Hub (Kumasi)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 8. Frequently Asked Questions (Accordion)                     */}
      {/* ------------------------------------------------------------- */}
      <section id="faq" className="py-16 md:py-24 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-blue)]">
              Got Questions?
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-[var(--text-primary)] mt-2 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              Learn how Go-Ya HRMS integrates with Ghanaian employment law and global corporate standards.
            </p>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, index) => {
              const isOpen = activeFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-semibold text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                  >
                    <span>{item.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)]/50">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 9. Contact / Lead Capture / Demo Request Form                 */}
      {/* ------------------------------------------------------------- */}
      <section id="demo" className="py-16 md:py-24 border-b border-[var(--border-subtle)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-md">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-blue)]">
                Enterprise Inquiries
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mt-1 tracking-tight">
                Request an Enterprise Demo & Ghana Statutory Audit
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2">
                Speak directly with an enterprise HR advisor about your multi-entity setup, SSNIT
                reconciliation, or cross-border compensation requirements.
              </p>
            </div>

            {demoSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                  Demo Request Received
                </h3>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-md mx-auto">
                  {demoSuccess}
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setDemoSuccess(null)}
                    className="text-xs font-semibold underline text-emerald-900 dark:text-emerald-200 hover:opacity-80 cursor-pointer"
                  >
                    Submit another inquiry
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4 max-w-2xl mx-auto">
                {demoError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{demoError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                      Your Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="demo-name"
                      type="text"
                      required
                      value={demoForm.name}
                      onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                      placeholder="e.g. Ama Asantewaa"
                      className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-stone-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                      Work Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="demo-email"
                      type="email"
                      required
                      value={demoForm.email}
                      onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                      placeholder="ama@company.com"
                      className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-stone-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="demo-company"
                      type="text"
                      required
                      value={demoForm.company_name}
                      onChange={(e) => setDemoForm({ ...demoForm, company_name: e.target.value })}
                      placeholder="e.g. Accra Logistics Ltd"
                      className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-stone-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                      Current Workforce Size
                    </label>
                    <select
                      id="demo-team-size"
                      value={demoForm.team_size}
                      onChange={(e) => setDemoForm({ ...demoForm, team_size: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-stone-400"
                    >
                      <option value="1-15">1 – 15 Employees</option>
                      <option value="16-50">16 – 50 Employees</option>
                      <option value="51-150">51 – 150 Employees</option>
                      <option value="150+">150+ Employees (Enterprise Group)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Specific Inquiries or Requirements (Optional)
                  </label>
                  <textarea
                    id="demo-message"
                    rows={3}
                    value={demoForm.message}
                    onChange={(e) => setDemoForm({ ...demoForm, message: e.target.value })}
                    placeholder="Tell us about your team setup, international subsidiaries, or current payroll pain points..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-stone-400"
                  />
                </div>

                <div className="pt-2">
                  <button
                    id="demo-submit-btn"
                    type="submit"
                    disabled={demoSubmitting}
                    className="w-full py-3 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-semibold text-xs shadow-xs hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {demoSubmitting ? (
                      <span>Submitting request...</span>
                    ) : (
                      <>
                        <span>Submit Demo Request</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-[var(--text-secondary)] mt-2">
                    We respect your privacy. No spam — strictly relevant enterprise HR consultations.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 10. Footer                                                    */}
      {/* ------------------------------------------------------------- */}
      <footer className="py-12 bg-[var(--bg-surface)] text-xs text-[var(--text-secondary)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 flex items-center justify-center font-bold text-sm">
                G
              </div>
              <div>
                <span className="font-bold text-sm text-[var(--text-primary)] block">Go-Ya HRMS</span>
                <span className="text-[11px]">
                  Ghana-focused, AI-native HR platform for local and international companies
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 font-medium">
              <button
                onClick={() => scrollToSection('overview')}
                className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Overview
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('compliance')}
                className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Ghana Compliance
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Pricing
              </button>
              <button
                onClick={() => onNavigateToAuth('login')}
                className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Login
              </button>
              <button
                onClick={() => onNavigateToAuth('signup')}
                className="text-[var(--text-primary)] font-bold hover:underline cursor-pointer"
              >
                Start Free Trial
              </button>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
            <div>
              © {new Date().getFullYear()} Go-Ya HRMS. All rights reserved. Accra, Ghana & International.
            </div>
            <div className="flex items-center gap-4">
              <span>Aligned with Ghana Labour Act (Act 651)</span>
              <span>•</span>
              <span>SSNIT Act 766 Ready</span>
              <span>•</span>
              <span>SOC2 Security Aligned</span>
              <span>•</span>
              {onNavigateToPlatformAdmin ? (
                <button
                  onClick={onNavigateToPlatformAdmin}
                  className="hover:text-[var(--text-primary)] transition underline cursor-pointer"
                >
                  Operator Console
                </button>
              ) : (
                <a href="/platform-admin" className="hover:text-[var(--text-primary)] transition underline">
                  Operator Console
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
