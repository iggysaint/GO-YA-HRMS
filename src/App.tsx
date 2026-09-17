import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { DirectoryPage } from './pages/DirectoryPage';
import { EmployeeProfilePage } from './pages/EmployeeProfilePage';
import { OnboardingBoardPage } from './pages/OnboardingBoardPage';
import { AttendancePage } from './pages/AttendancePage';
import { LeaveManagementPage } from './pages/LeaveManagementPage';
import { PayrollSummaryPage } from './pages/PayrollSummaryPage';
import { ComplianceCenterPage } from './pages/ComplianceCenterPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { OrgChartPage } from './pages/OrgChartPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { TasksPage } from './pages/TasksPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { EventsPage } from './pages/EventsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ChatPage } from './pages/ChatPage';
import { AuthPage } from './pages/AuthPage';
import { LandingPage } from './pages/LandingPage';
import { PlatformAdminPage } from './pages/PlatformAdminPage';
import { BillingPage } from './pages/BillingPage';
import { ConductTrackerPage } from './pages/ConductTrackerPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { SurveysPage } from './pages/SurveysPage';
import { PublicSurveyPage } from './pages/PublicSurveyPage';
import { GovernancePage } from './pages/GovernancePage';
import { NotificationBell } from './components/NotificationBell';
import { ChatQuickButton } from './components/ChatQuickButton';
import { ManageDepartmentsModal } from './components/ManageDepartmentsModal';
import { AddEmployeeModal } from './components/AddEmployeeModal';
import { InviteMemberModal } from './components/InviteMemberModal';
import { CreateWorkspaceModal } from './components/CreateWorkspaceModal';
import { Department, AppView } from './types';
import { Menu } from 'lucide-react';

function MainApp() {
  const { user, organization, role, isLoading, authFetch, subscribeToRealtime } = useAuth();

  // Navigation state: 'dashboard' | 'directory' | 'profile' | 'onboarding' | 'attendance' | 'leave' | 'payroll' | 'compliance' | 'documents'
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [pendingLeaveEmployeeId, setPendingLeaveEmployeeId] = useState<string | null>(null);
  const [documentsFilterEmployeeId, setDocumentsFilterEmployeeId] = useState<string | undefined>(undefined);
  const [conductFilterEmployeeId, setConductFilterEmployeeId] = useState<string | null>(null);
  const [conductSelectedIncidentId, setConductSelectedIncidentId] = useState<string | null>(null);

  // Departments state
  const [departments, setDepartments] = useState<Department[]>([]);

  // Modals state
  const [isManageDepartmentsOpen, setIsManageDepartmentsOpen] = useState(false);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);

  // Invite Token check from URL if not authenticated
  const [inviteToken, setInviteToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  });

  // Public survey token state (Milestone 21: unauthenticated public survey response form)
  const [surveyToken, setSurveyToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('survey');
  });

  // Surface state: 'app' (tenant HR workspace) | 'platform-admin' (SaaS operator console)
  const [activeSurface, setActiveSurface] = useState<'app' | 'platform-admin'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('surface') === 'platform-admin' || window.location.pathname === '/platform-admin') {
      return 'platform-admin';
    }
    return 'app';
  });

  // Public Landing vs Auth View state when unauthenticated
  const [unauthView, setUnauthView] = useState<'landing' | 'login' | 'signup' | 'invite'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('token')) return 'invite';
    const authParam = params.get('auth');
    if (authParam === 'login' || window.location.pathname === '/login') return 'login';
    if (authParam === 'signup' || window.location.pathname === '/signup') return 'signup';
    return 'landing';
  });

  const fetchDepartments = useCallback(async () => {
    if (!organization?.id) return;
    try {
      const res = await authFetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  }, [authFetch, organization?.id]);

  useEffect(() => {
    if (organization?.id) {
      fetchDepartments();
    }
  }, [organization?.id, fetchDepartments]);

  // Realtime subscription for department updates
  useEffect(() => {
    const unsubscribe = subscribeToRealtime((payload) => {
      if (payload.event === 'department_changed') {
        fetchDepartments();
      }
    });
    return unsubscribe;
  }, [subscribeToRealtime, fetchDepartments]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[var(--text-primary)] border-t-transparent rounded-full animate-spin" />
          <span>Loading Go-Ya HRMS...</span>
        </div>
      </div>
    );
  }

  // Milestone 21: Public unauthenticated survey response form (no login or shell required)
  if (surveyToken) {
    return (
      <PublicSurveyPage
        surveyToken={surveyToken}
        onBackToApp={() => {
          const url = new URL(window.location.href);
          url.searchParams.delete('survey');
          window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
          setSurveyToken(null);
        }}
      />
    );
  }

  // If operator surface is requested
  if (activeSurface === 'platform-admin') {
    if (!user) {
      return (
        <AuthPage
          inviteToken={null}
          initialMode="login"
          onBackToLanding={() => setActiveSurface('app')}
        />
      );
    }
    return <PlatformAdminPage onReturnToApp={() => setActiveSurface('app')} />;
  }

  // If unauthenticated on standard app surface, show Public Landing Page or Auth Page
  if (!user || !organization) {
    if (unauthView === 'landing') {
      return (
        <LandingPage
          onNavigateToAuth={(targetMode) => setUnauthView(targetMode)}
          onNavigateToPlatformAdmin={() => setActiveSurface('platform-admin')}
        />
      );
    }
    return (
      <AuthPage
        inviteToken={inviteToken}
        initialMode={unauthView === 'landing' ? 'login' : unauthView}
        onBackToLanding={() => setUnauthView('landing')}
      />
    );
  }

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    setCurrentView('profile');
  };

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
    if (view !== 'profile') {
      setSelectedEmployeeId(null);
    }
  };

  const handleNavigateToLeave = (employeeId?: string) => {
    if (employeeId) {
      setPendingLeaveEmployeeId(employeeId);
    }
    setCurrentView('leave');
    setSelectedEmployeeId(null);
  };

  const handleNavigateToDocuments = (employeeId?: string) => {
    setDocumentsFilterEmployeeId(employeeId);
    setCurrentView('documents');
  };

  const handleNavigateToConduct = (incidentId?: string, employeeId?: string) => {
    setConductSelectedIncidentId(incidentId || null);
    setConductFilterEmployeeId(employeeId || null);
    setCurrentView('conduct');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Notion-style Left Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenInviteModal={() => setIsInviteModalOpen(true)}
        onOpenCreateWorkspaceModal={() => setIsCreateWorkspaceOpen(true)}
        onNavigateToPlatformAdmin={() => setActiveSurface('platform-admin')}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Workspace Stage */}
      <main className="flex-1 h-screen flex flex-col overflow-hidden bg-[var(--bg-primary)]">
        {/* Mobile Top Header (< md) */}
        <div className="flex md:hidden items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0 z-30">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              id="mobile-hamburger-btn"
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer shrink-0"
              aria-label="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold text-sm tracking-tight text-[var(--text-primary)] truncate">
              {organization?.name || 'Go-Ya HRMS'}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {currentView !== 'chat' && <ChatQuickButton onNavigate={handleNavigate} />}
            <NotificationBell onNavigate={handleNavigate} />
          </div>
        </div>

        {/* Scrollable View Area */}
        <div className={`flex-1 ${currentView === 'chat' ? 'overflow-hidden' : 'overflow-y-auto'} relative`}>
          {/* Floating Top Quick Actions (Chat & Bell) on desktop */}
          <div className="absolute top-4 right-6 z-40 hidden md:flex items-center gap-1.5">
            {currentView !== 'chat' && <ChatQuickButton onNavigate={handleNavigate} />}
            <NotificationBell onNavigate={handleNavigate} />
          </div>

        {currentView === 'dashboard' && (
          <DashboardPage
            onNavigateToDirectory={() => handleNavigate('directory')}
            onNavigateToOnboarding={() => handleNavigate('onboarding')}
            onNavigateToAttendance={() => handleNavigate('attendance')}
            onNavigateToLeave={() => handleNavigateToLeave()}
            onNavigateToPayroll={() => handleNavigate('payroll')}
            onNavigateToCompliance={() => handleNavigate('compliance')}
            onNavigateToDocuments={() => handleNavigate('documents')}
            onNavigateToOrgChart={() => handleNavigate('org_chart')}
            onNavigateToAnalytics={() => handleNavigate('analytics')}
            onNavigateToAIAssistant={() => handleNavigate('ai_assistant')}
            onNavigateToEvents={() => handleNavigate('events')}
            onNavigateToConduct={handleNavigateToConduct}
            onOpenAddEmployee={() => setIsAddEmployeeOpen(true)}
            onSelectEmployee={handleSelectEmployee}
          />
        )}

        {currentView === 'directory' && (
          <DirectoryPage
            departments={departments}
            onOpenAddEmployee={() => setIsAddEmployeeOpen(true)}
            onOpenManageDepartments={() => setIsManageDepartmentsOpen(true)}
            onSelectEmployee={handleSelectEmployee}
          />
        )}

        {currentView === 'org_chart' && (
          <OrgChartPage onSelectEmployee={handleSelectEmployee} />
        )}

        {currentView === 'analytics' && (
          <AnalyticsPage onSelectEmployee={handleSelectEmployee} />
        )}

        {currentView === 'ai_assistant' && (
          <AIAssistantPage onSelectEmployee={handleSelectEmployee} />
        )}

        {currentView === 'tasks' && (
          <TasksPage onSelectEmployee={handleSelectEmployee} />
        )}

        {currentView === 'onboarding' && (
          <OnboardingBoardPage
            onOpenAddEmployee={() => setIsAddEmployeeOpen(true)}
            onSelectEmployee={handleSelectEmployee}
          />
        )}

        {currentView === 'attendance' && (
          <AttendancePage onNavigateToLeave={handleNavigateToLeave} />
        )}

        {currentView === 'leave' && (
          <LeaveManagementPage
            initialEmployeeId={pendingLeaveEmployeeId}
            onClearInitialEmployee={() => setPendingLeaveEmployeeId(null)}
          />
        )}

        {currentView === 'payroll' && (
          <PayrollSummaryPage onNavigateToEmployee={handleSelectEmployee} />
        )}

        {currentView === 'expenses' && (
          <ExpensesPage onNavigateToEmployee={handleSelectEmployee} />
        )}

        {currentView === 'events' && (
          <EventsPage departments={departments} />
        )}

        {currentView === 'notifications' && (
          <NotificationsPage onNavigate={handleNavigate} />
        )}

        {currentView === 'chat' && (
          <ChatPage />
        )}

        {currentView === 'compliance' && (
          <ComplianceCenterPage
            onNavigateToEmployee={handleSelectEmployee}
            onNavigateToDocuments={() => handleNavigate('documents')}
          />
        )}

        {currentView === 'documents' && (
          <DocumentsPage
            onNavigateToEmployee={handleSelectEmployee}
            onNavigateToCompliance={() => handleNavigate('compliance')}
            filterEmployeeId={documentsFilterEmployeeId}
          />
        )}

        {currentView === 'billing' && (
          <BillingPage onNavigateToDirectory={() => handleNavigate('directory')} />
        )}

        {currentView === 'conduct' && (
          <ConductTrackerPage
            initialEmployeeId={conductFilterEmployeeId}
            initialIncidentId={conductSelectedIncidentId}
            onNavigateToEmployeeProfile={handleSelectEmployee}
            onBackToDashboard={() => handleNavigate('dashboard')}
          />
        )}

        {currentView === 'policies' && (
          <PoliciesPage
            onNavigateToEmployee={handleSelectEmployee}
            onNavigateToDocuments={() => handleNavigate('documents')}
          />
        )}

        {currentView === 'surveys' && (
          <SurveysPage
            onOpenPublicSurvey={(surveyId) => {
              setSurveyToken(surveyId);
            }}
          />
        )}

        {currentView === 'governance' && (
          <GovernancePage
            onNavigateToPolicies={() => handleNavigate('policies')}
          />
        )}

        {currentView === 'profile' && selectedEmployeeId && (
          <EmployeeProfilePage
            employeeId={selectedEmployeeId}
            departments={departments}
            onBack={() => handleNavigate('directory')}
            onNavigateToDocuments={() => handleNavigateToDocuments(selectedEmployeeId)}
            onNavigateToConduct={(empId) => handleNavigateToConduct(undefined, empId)}
          />
        )}
        </div>
      </main>

      {/* Modals */}
      {isManageDepartmentsOpen && (
        <ManageDepartmentsModal
          isOpen={isManageDepartmentsOpen}
          onClose={() => setIsManageDepartmentsOpen(false)}
          departments={departments}
          onDepartmentChanged={fetchDepartments}
        />
      )}

      {isAddEmployeeOpen && (
        <AddEmployeeModal
          isOpen={isAddEmployeeOpen}
          onClose={() => setIsAddEmployeeOpen(false)}
          departments={departments}
          onEmployeeAdded={fetchDepartments}
          onOpenManageDepartments={() => setIsManageDepartmentsOpen(true)}
        />
      )}

      {isInviteModalOpen && (
        <InviteMemberModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
        />
      )}

      {isCreateWorkspaceOpen && (
        <CreateWorkspaceModal
          isOpen={isCreateWorkspaceOpen}
          onClose={() => setIsCreateWorkspaceOpen(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
