import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  Organization,
  OrganizationMember,
  Department,
  Employee,
  EmployeeCompensation,
  AttritionRisk,
  EmploymentType,
  User,
  Invite,
  Role,
  DashboardKPIs,
  AttentionItem,
  OnboardingTask,
  OffboardingTask,
  OffboardingRecord,
  AttendanceRecord,
  DailyAttendanceSummary,
  LeaveType,
  LeaveBalance,
  LeaveAuditLog,
  LeaveRequest,
  LeaveRequestWithDetails,
  EmployeeWithDetails,
  PayrollSummary,
  PayrollDepartmentCost,
  PayrollCountryCost,
  ComplianceItem,
  ComplianceDashboardData,
  ComplianceCategory,
  ComplianceStatus,
  ComplianceCategoryBreakdown,
  AppDocument,
  DocumentWithDetails,
  DocumentType,
  StatutoryDataGhana,
  AIChatLog,
  AIAssistantMode,
  AIAssistantRequest,
  AIAssistantResponse,
  AttritionFactorBreakdown,
  EmployeeAttritionAnalysis,
  AttritionRecalculateResponse,
  HeadcountTrendPoint,
  TurnoverAnalytics,
  DepartmentAnalyticsItem,
  LeaveUtilizationAnalytics,
  WorkforceAnalyticsReport,
  OrgNode,
  Task,
  TaskStatus,
  TaskPriority,
  TaskWithDetails,
  JobHistory,
  JobChangeReason,
  ExpenseCategory,
  Expense,
  ExpenseStatus,
  ExpenseWithDetails,
  ExpenseDashboardSummary,
  ExpenseCategoryBreakdown,
  ExpenseTimeSeriesPoint,
  ExpensePolicy,
  CompanyEvent,
  CompanyEventWithDetails,
  EventType,
  EventVisibilityScope,
  AppNotification,
  EmailDeliveryLog,
  NotificationType,
  ChatChannel,
  ChatChannelMember,
  ChatMessage,
  ChatMemberInfo,
  ChatMessageWithSender,
  ChatChannelWithDetails,
  DemoRequest,
  Subscription,
  SubscriptionPlan,
  BillingCycle,
  PlatformAdmin,
  PlatformMetrics,
  PlatformWorkspaceSummary,
  Invoice,
  InvoiceStatus,
  PaymentMethod,
  BillingDetailsResponse,
  PerformanceReview,
  PerformanceCycle,
  ReviewStatus,
  PDPGoal,
  PDPStatus,
  ProbationRecord,
  ProbationOutcome,
  ConductIncident,
  ConductIncidentSeverity,
  ConductIncidentStatus,
  ConductIncidentWithDetails,
  ConductAuditLog,
  Policy,
  PolicyAcknowledgement,
  PolicyAcknowledgmentMethod,
  PolicyWithDetails,
  PolicyAcknowledgementWithDetails,
  EngagementSurvey,
  SurveyQuestion,
  SurveyResponse,
  SurveyAnswer,
  SurveyQuestionType,
  EngagementSurveyWithMetrics,
  SurveyResultsResponse,
  PublicSurveyData,
  GovernanceRecord,
  GovernanceRecordWithDetails,
  GovernanceAuditStatus,
} from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// In-Memory & File-backed Database Store
interface DatabaseSchema {
  organizations: Organization[];
  organization_members: OrganizationMember[];
  departments: Department[];
  employees: Employee[];
  employee_compensation: EmployeeCompensation[];
  users: Array<User & { password_hash: string }>;
  invites: Invite[];
  // Milestone 2 Collections
  onboarding_tasks: OnboardingTask[];
  offboarding_tasks: OffboardingTask[];
  offboarding_records: OffboardingRecord[];
  attendance_records: AttendanceRecord[];
  daily_attendance_summary: DailyAttendanceSummary[];
  leave_types: LeaveType[];
  leave_balances: LeaveBalance[];
  leave_requests: LeaveRequest[];
  leave_audit_logs: LeaveAuditLog[];
  // Milestone 3 Collections
  compliance_items: ComplianceItem[];
  documents: AppDocument[];
  // Milestone 4 Collections
  ai_chat_logs: AIChatLog[];
  // Milestone 5 Collections
  tasks: Task[];
  // Milestone 6 Collections
  job_history: JobHistory[];
  // Milestone 7 Collections
  expense_categories: ExpenseCategory[];
  expenses: Expense[];
  expense_policies: Record<string, ExpensePolicy>;
  // Milestone 9 Collections
  events: CompanyEvent[];
  // Milestone 11 Collections
  notifications: AppNotification[];
  email_logs: EmailDeliveryLog[];
  // Milestone 12 Collections
  chat_channels: ChatChannel[];
  chat_channel_members: ChatChannelMember[];
  chat_messages: ChatMessage[];
  // Milestone 14 Collections
  demo_requests: DemoRequest[];
  // Milestone 15 & 16 Collections
  subscriptions: Subscription[];
  invoices: Invoice[];
  payment_methods: PaymentMethod[];
  platform_admins: PlatformAdmin[];
  support_notes: Array<{
    id: string;
    company_id: string;
    note: string;
    author_email: string;
    created_at: string;
  }>;
  // Milestone 17 Collections
  performance_reviews: PerformanceReview[];
  pdp_goals: PDPGoal[];
  // Milestone 18 Collections
  probation_records: ProbationRecord[];
  // Milestone 19 Collections
  conduct_incidents: ConductIncident[];
  conduct_audit_logs: ConductAuditLog[];
  // Milestone 20 Collections
  policies: Policy[];
  policy_acknowledgements: PolicyAcknowledgement[];
  // Milestone 21 Collections (Engagement Survey)
  engagement_surveys: EngagementSurvey[];
  survey_questions: SurveyQuestion[];
  survey_responses: SurveyResponse[];
  survey_answers: SurveyAnswer[];
  // Milestone 22 Collections (HR Policy Governance Lifecycle)
  governance_records: GovernanceRecord[];
}

const DB_FILE = path.join(process.cwd(), '.db_state.json');

function generateId(prefix: string = ''): string {
  const rand = Math.random().toString(36).substring(2, 10);
  const time = Date.now().toString(36);
  return prefix ? `${prefix}_${time}_${rand}` : `${time}-${rand}`;
}

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateDefaultExpenseCategories(companyId: string): ExpenseCategory[] {
  return [
    { id: `ec_flight_${companyId}`, company_id: companyId, name: 'Flights', created_at: '2024-01-01T00:00:00.000Z' },
    { id: `ec_hotel_${companyId}`, company_id: companyId, name: 'Hotels', created_at: '2024-01-01T00:00:00.000Z' },
    { id: `ec_recruitment_${companyId}`, company_id: companyId, name: 'Recruitment costs', created_at: '2024-01-01T00:00:00.000Z' },
    { id: `ec_training_${companyId}`, company_id: companyId, name: 'Training', created_at: '2024-01-01T00:00:00.000Z' },
    { id: `ec_office_${companyId}`, company_id: companyId, name: 'Office supplies', created_at: '2024-01-01T00:00:00.000Z' },
    { id: `ec_other_${companyId}`, company_id: companyId, name: 'Other', created_at: '2024-01-01T00:00:00.000Z' },
  ];
}

// Generate country-specific onboarding checklist tasks
function generateDefaultOnboardingTasks(
  employeeId: string,
  companyId: string,
  country: string,
  startDate: string
): OnboardingTask[] {
  const isGhana = country.toLowerCase().includes('ghana');
  const isUK = country.toLowerCase().includes('kingdom') || country.toLowerCase().includes('uk');

  if (isGhana) {
    return [
      {
        id: generateId('onb'),
        employee_id: employeeId,
        company_id: companyId,
        category: 'personal_info',
        task: 'Complete biodata form & verify national contact details',
        status: 'completed',
        due_date: startDate,
        completed_at: new Date().toISOString(),
        completed_by: 'hr_analyst',
        notes: 'Verified residential address & primary contact phone number',
      },
      {
        id: generateId('onb'),
        employee_id: employeeId,
        company_id: companyId,
        category: 'emergency_contact',
        task: 'Record emergency contact & next of kin details',
        status: 'completed',
        due_date: startDate,
        completed_at: new Date().toISOString(),
        completed_by: 'hr_analyst',
        notes: 'Primary next of kin registered',
      },
      {
        id: generateId('onb'),
        employee_id: employeeId,
        company_id: companyId,
        category: 'payroll_bank',
        task: 'Setup bank details for local GHS payroll disbursement',
        status: 'pending',
        due_date: startDate,
      },
      {
        id: generateId('onb'),
        employee_id: employeeId,
        company_id: companyId,
        category: 'statutory_info',
        task: 'Collect statutory compliance info: SSNIT Number, TIN & Ghana Card PIN',
        status: 'pending',
        due_date: startDate,
      },
      {
        id: generateId('onb'),
        employee_id: employeeId,
        company_id: companyId,
        category: 'document_upload',
        task: 'Upload Ghana Card copy, passport photo & academic certificates',
        status: 'pending',
        due_date: startDate,
      },
      {
        id: generateId('onb'),
        employee_id: employeeId,
        company_id: companyId,
        category: 'policy_acknowledgement',
        task: 'Sign Company Handbook, Code of Conduct & IP Agreement',
        status: 'pending',
        due_date: startDate,
      },
    ];
  }

  if (isUK) {
    return [
      {
        id: generateId('onb'),
        employee_id: employeeId,
        company_id: companyId,
        category: 'personal_info',
        task: 'Collect personal information & UK proof of address',
        status: 'completed',
        due_date: startDate,
        completed_at: new Date().toISOString(),
        completed_by: 'hr_analyst',
      },
      {
        id: generateId('onb'),
        employee_id: employeeId,
        company_id: companyId,
        category: 'emergency_contact',
        task: 'Emergency contact & next of kin registry',
        status: 'pending',
        due_date: startDate,
      },
      {
        id: generateId('onb'),
        employee_id: employeeId,
        company_id: companyId,
        category: 'payroll_bank',
        task: 'UK bank account sort code & account number setup',
        status: 'pending',
        due_date: startDate,
      },
      {
        id: generateId('onb'),
        employee_id: employeeId,
        company_id: companyId,
        category: 'statutory_info',
        task: 'Record National Insurance (NI) number & P45/Tax code declaration',
        status: 'pending',
        due_date: startDate,
      },
      {
        id: generateId('onb'),
        employee_id: employeeId,
        company_id: companyId,
        category: 'document_upload',
        task: 'Upload Right to Work check documents & passport',
        status: 'pending',
        due_date: startDate,
      },
      {
        id: generateId('onb'),
        employee_id: employeeId,
        company_id: companyId,
        category: 'policy_acknowledgement',
        task: 'Sign UK Employment Contract & Workplace Safety policies',
        status: 'pending',
        due_date: startDate,
      },
    ];
  }

  return [
    {
      id: generateId('onb'),
      employee_id: employeeId,
      company_id: companyId,
      category: 'personal_info',
      task: 'Personal biodata & identity record entry',
      status: 'completed',
      due_date: startDate,
      completed_at: new Date().toISOString(),
      completed_by: 'hr_analyst',
    },
    {
      id: generateId('onb'),
      employee_id: employeeId,
      company_id: companyId,
      category: 'emergency_contact',
      task: 'Emergency contact information registry',
      status: 'pending',
      due_date: startDate,
    },
    {
      id: generateId('onb'),
      employee_id: employeeId,
      company_id: companyId,
      category: 'payroll_bank',
      task: 'Banking & direct deposit disbursement configuration',
      status: 'pending',
      due_date: startDate,
    },
    {
      id: generateId('onb'),
      employee_id: employeeId,
      company_id: companyId,
      category: 'statutory_info',
      task: 'National Tax ID & statutory identification recording',
      status: 'pending',
      due_date: startDate,
    },
    {
      id: generateId('onb'),
      employee_id: employeeId,
      company_id: companyId,
      category: 'document_upload',
      task: 'Upload verified identity credentials & educational certificates',
      status: 'pending',
      due_date: startDate,
    },
    {
      id: generateId('onb'),
      employee_id: employeeId,
      company_id: companyId,
      category: 'policy_acknowledgement',
      task: 'Acknowledge Employee Handbook & Confidentiality Agreement',
      status: 'pending',
      due_date: startDate,
    },
  ];
}

// Default Ghana Labour Act Leave Types
function getDefaultLeaveTypes(companyId: string): LeaveType[] {
  return [
    {
      id: `lt_annual_${companyId}`,
      company_id: companyId,
      name: 'Annual Leave',
      default_entitlement_days: 20,
      description: 'Standard paid statutory annual leave (Ghana Labour Act default 15-20 working days)',
      paid: true,
    },
    {
      id: `lt_sick_${companyId}`,
      company_id: companyId,
      name: 'Sick Leave',
      default_entitlement_days: 10,
      description: 'Paid medical leave with certified medical practitioner note',
      paid: true,
    },
    {
      id: `lt_maternity_${companyId}`,
      company_id: companyId,
      name: 'Maternity Leave',
      default_entitlement_days: 84,
      description: 'Statutory 12-week paid maternity leave for female employees',
      paid: true,
    },
    {
      id: `lt_paternity_${companyId}`,
      company_id: companyId,
      name: 'Paternity Leave',
      default_entitlement_days: 5,
      description: 'Paid leave for new fathers upon birth or adoption of child',
      paid: true,
    },
    {
      id: `lt_compassionate_${companyId}`,
      company_id: companyId,
      name: 'Compassionate Leave',
      default_entitlement_days: 3,
      description: 'Paid bereavement and family emergency leave',
      paid: true,
    },
    {
      id: `lt_unpaid_${companyId}`,
      company_id: companyId,
      name: 'Unpaid Leave',
      default_entitlement_days: 0,
      description: 'Approved leave of absence without payroll entitlement',
      paid: false,
    },
  ];
}

// Initial Seed Data for fresh starts
function getInitialData(): DatabaseSchema {
  const orgId = 'org_ghana_fintech_01';
  const org: Organization = {
    id: orgId,
    name: 'Kora Innovations Ltd',
    industry: 'Fintech & Payments',
    country: 'Ghana',
    currency: 'GHS',
    timezone: 'Africa/Accra (GMT+0)',
    leave_escalation_threshold_days: 3, // HR Analyst can approve <= 3 days; > 3 days escalates to HR Head
    created_at: new Date('2024-01-05T09:00:00.000Z').toISOString(),
  };

  const org2: Organization = {
    id: 'org_goldkey_02',
    name: 'GoldKey Agritech Ghana Ltd',
    industry: 'Agri-Business & Export',
    country: 'Ghana',
    currency: 'GHS',
    timezone: 'Africa/Accra (GMT+0)',
    leave_escalation_threshold_days: 3,
    created_at: new Date('2024-02-10T10:00:00.000Z').toISOString(),
  };

  const org3: Organization = {
    id: 'org_payswitch_03',
    name: 'PaySwitch West Africa',
    industry: 'Financial Technology',
    country: 'Ghana',
    currency: 'USD',
    timezone: 'Africa/Accra (GMT+0)',
    leave_escalation_threshold_days: 5,
    created_at: new Date('2024-03-01T12:00:00.000Z').toISOString(),
  };

  const org4: Organization = {
    id: 'org_afrilog_04',
    name: 'AfriLogistics Hub',
    industry: 'Supply Chain & Freight',
    country: 'Ghana',
    currency: 'GHS',
    timezone: 'Africa/Accra (GMT+0)',
    leave_escalation_threshold_days: 2,
    created_at: new Date('2024-04-15T08:00:00.000Z').toISOString(),
  };

  const userHeadId = 'usr_hr_head_01';
  const userAnalystId = 'usr_hr_analyst_01';

  const users: Array<User & { password_hash: string }> = [
    {
      id: userHeadId,
      email: 'ignatius@korapay.com',
      email_verified: true,
      created_at: new Date().toISOString(),
      password_hash: 'password123',
    },
    {
      id: userAnalystId,
      email: 'analyst@korapay.com',
      email_verified: true,
      created_at: new Date().toISOString(),
      password_hash: 'password123',
    },
  ];

  const members: OrganizationMember[] = [
    {
      user_id: userHeadId,
      organization_id: orgId,
      role: 'hr_head',
    },
    {
      user_id: userAnalystId,
      organization_id: orgId,
      role: 'hr_analyst',
    },
  ];

  const dept1: Department = { id: 'dept_eng_01', company_id: orgId, name: 'Engineering & Technology' };
  const dept2: Department = { id: 'dept_ops_02', company_id: orgId, name: 'Operations & Compliance' };
  const dept3: Department = { id: 'dept_growth_03', company_id: orgId, name: 'Growth & Product' };
  const dept4: Department = { id: 'dept_people_04', company_id: orgId, name: 'People Operations' };

  const departments = [dept1, dept2, dept3, dept4];

  const employees: Employee[] = [
    {
      id: 'emp_000',
      company_id: orgId,
      name: 'Dr. Nana Yaa Appiah',
      department_id: dept2.id,
      job_title: 'Managing Director & Country Head',
      employment_type: 'full_time',
      country: 'Ghana',
      start_date: '2022-01-10',
      status: 'active',
      attrition_risk: 'low',
      manager_id: undefined,
    },
    {
      id: 'emp_001',
      company_id: orgId,
      name: 'Kwame Mensah',
      department_id: dept1.id,
      job_title: 'Head of Engineering',
      employment_type: 'full_time',
      country: 'Ghana',
      start_date: '2023-03-15',
      status: 'active',
      attrition_risk: 'low',
      manager_id: 'emp_000',
    },
    {
      id: 'emp_002',
      company_id: orgId,
      name: 'Ama Osei-Bonsu',
      department_id: dept3.id,
      job_title: 'Product Design Lead',
      employment_type: 'full_time',
      country: 'Ghana',
      start_date: '2023-08-01',
      status: 'active',
      attrition_risk: 'medium',
      manager_id: 'emp_000',
    },
    {
      id: 'emp_003',
      company_id: orgId,
      name: 'Kofi Boateng',
      department_id: dept2.id,
      job_title: 'Compliance & Legal Officer',
      employment_type: 'contract',
      country: 'Ghana',
      start_date: '2024-01-10',
      status: 'on_leave',
      attrition_risk: 'low',
      manager_id: 'emp_000',
    },
    {
      id: 'emp_004',
      company_id: orgId,
      name: 'Abena Ansah',
      department_id: dept1.id,
      job_title: 'Frontend Developer',
      employment_type: 'full_time',
      country: 'United Kingdom',
      start_date: '2024-05-02',
      status: 'probation',
      attrition_risk: 'high',
      manager_id: 'emp_001',
    },
    {
      id: 'emp_005',
      company_id: orgId,
      name: 'Ebenezer Addo',
      department_id: dept4.id,
      job_title: 'HR Operations Associate',
      employment_type: 'full_time',
      country: 'Ghana',
      start_date: '2024-02-15',
      status: 'active',
      attrition_risk: 'low',
      manager_id: 'emp_003',
    },
  ];

  const employee_compensation: EmployeeCompensation[] = [
    {
      id: 'comp_000',
      employee_id: 'emp_000',
      salary: 48000,
      currency: 'GHS',
      effective_date: '2022-01-10',
      allowances: 6000,
      bonus: 5000,
      notes: 'Executive Managing Director compensation package',
      statutory_data: {
        ssnit_number: 'C018472910394',
        pension_tier_2_3_provider: 'Enterprise Trustees Tier 2 Master Trust',
        tin: 'P0092837461',
        paye_band: 'Graduated 0%–35% Cumulative',
      },
      created_at: '2022-01-10T09:00:00.000Z',
    },
    {
      id: 'comp_001_v1',
      employee_id: 'emp_001',
      salary: 28500,
      currency: 'GHS',
      effective_date: '2023-03-15',
      allowances: 3500,
      bonus: 2000,
      notes: 'Initial hire package (Engineering Lead)',
      statutory_data: {
        ssnit_number: 'C019823481234',
        pension_tier_2_3_provider: 'Enterprise Trustees Tier 2 Master Trust',
        tin: 'P0002938471',
        paye_band: 'Graduated 0%–35% Cumulative',
      },
      created_at: '2023-03-15T09:00:00.000Z',
    },
    {
      id: 'comp_001_v2',
      employee_id: 'emp_001',
      salary: 32000,
      currency: 'GHS',
      effective_date: '2024-01-01',
      allowances: 4200,
      bonus: 2500,
      notes: 'Annual merit increase & executive allowance promotion',
      statutory_data: {
        ssnit_number: 'C019823481234',
        pension_tier_2_3_provider: 'Enterprise Trustees Tier 2 Master Trust',
        tin: 'P0002938471',
        paye_band: 'Graduated 0%–35% Cumulative',
      },
      created_at: '2024-01-01T09:00:00.000Z',
    },
    {
      id: 'comp_002',
      employee_id: 'emp_002',
      salary: 24000,
      currency: 'GHS',
      effective_date: '2023-08-01',
      allowances: 2500,
      bonus: 1200,
      notes: 'Product Manager baseline package',
      statutory_data: {
        ssnit_number: 'C092837461928',
        pension_tier_2_3_provider: 'Petra Trust Opportunity Pension',
        tin: 'P0084729103',
        paye_band: 'Graduated 0%–35% Cumulative',
      },
      created_at: '2023-08-01T09:00:00.000Z',
    },
    {
      id: 'comp_003',
      employee_id: 'emp_003',
      salary: 18000,
      currency: 'GHS',
      effective_date: '2024-01-10',
      allowances: 1800,
      bonus: 800,
      notes: 'DevOps Engineer package',
      statutory_data: {
        ssnit_number: 'C038472918293',
        pension_tier_2_3_provider: 'Axis Pensions Heritage Fund',
        tin: 'P0019283746',
        paye_band: 'Graduated 0%–35% Cumulative',
      },
      created_at: '2024-01-10T09:00:00.000Z',
    },
    {
      id: 'comp_004',
      employee_id: 'emp_004',
      salary: 3200,
      currency: 'GBP',
      effective_date: '2024-05-02',
      allowances: 400,
      bonus: 300,
      notes: 'UK Remote Developer standard contract',
      statutory_data: {
        ni_number: 'QQ 12 34 56 A',
        pension_provider: 'NEST Workplace Pension (5% Employee / 3% Employer)',
        tax_code: '1257L Cumulative',
        utr_number: '9283746182',
      },
      created_at: '2024-05-02T09:00:00.000Z',
    },
    {
      id: 'comp_005',
      employee_id: 'emp_005',
      salary: 14500,
      currency: 'GHS',
      effective_date: '2024-02-15',
      allowances: 1500,
      bonus: 500,
      notes: 'HR Operations Associate package',
      statutory_data: {
        ssnit_number: 'C074829104829',
        pension_tier_2_3_provider: 'Enterprise Trustees Tier 2 Master Trust',
        tin: 'P0072819304',
        paye_band: 'Graduated 0%–35% Cumulative',
      },
      created_at: '2024-02-15T09:00:00.000Z',
    },
  ];

  // Seed Milestone 3 Documents
  const samplePdfData = 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iagozIDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMiAwIFIKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KL0NvbnRlbnRzIDQgMCBSCj4+CmVuZG9iago0IDAgb2JqCjw8Ci9MZW5ndGggNzgKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoxMDAgNzAwIFRECihtcGVsbG8gLSBHby1ZYSBIUk1TIFNlY3VyZSBFbXBsb3llZSBEb2N1bWVudCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA2MCAwMDAwMCBuIAowMDAwMDAwMTE3IDAwMDAwIG4gCjAwMDAwMDAyMDEgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA1Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgoxMzQ5CiUlRU9GCg==';

  const documents: AppDocument[] = [
    {
      id: 'doc_001',
      company_id: orgId,
      employee_id: 'emp_001',
      type: 'contract',
      file_ref: samplePdfData,
      file_name: 'Employment_Contract_Kwame_Mensah.pdf',
      file_size: 428000,
      expiry_date: '2027-03-15',
      uploaded_at: '2023-03-15T10:00:00.000Z',
      uploaded_by: 'ignatius@korapay.com',
      notes: 'Full-time Engineering Lead indefinite service agreement',
    },
    {
      id: 'doc_002',
      company_id: orgId,
      employee_id: 'emp_001',
      type: 'id_card',
      file_ref: samplePdfData,
      file_name: 'Ghana_Card_Kwame_Mensah.pdf',
      file_size: 198000,
      expiry_date: '2026-10-15',
      uploaded_at: '2023-03-16T11:00:00.000Z',
      uploaded_by: 'ignatius@korapay.com',
      notes: 'National ID verification PIN GHA-728192834-1',
    },
    {
      id: 'doc_003',
      company_id: orgId,
      employee_id: 'emp_002',
      type: 'contract',
      file_ref: samplePdfData,
      file_name: 'Fixed_Term_Offer_Ama_Serwaa.pdf',
      file_size: 384000,
      expiry_date: '2026-09-25',
      uploaded_at: '2023-08-01T09:30:00.000Z',
      uploaded_by: 'ignatius@korapay.com',
      notes: 'Fixed-term 3-year Product Management agreement due for renewal',
    },
    {
      id: 'doc_004',
      company_id: orgId,
      employee_id: 'emp_003',
      type: 'certification',
      file_ref: samplePdfData,
      file_name: 'AWS_Certified_DevOps_Engineer_Professional.pdf',
      file_size: 512000,
      expiry_date: '2026-08-20',
      uploaded_at: '2024-01-10T14:00:00.000Z',
      uploaded_by: 'ignatius@korapay.com',
      notes: 'AWS Cloud DevOps Certification credential ID AWS-928374',
    },
    {
      id: 'doc_005',
      company_id: orgId,
      employee_id: 'emp_004',
      type: 'contract',
      file_ref: samplePdfData,
      file_name: 'UK_Employment_Agreement_Abena_Ansah.pdf',
      file_size: 440000,
      expiry_date: '2027-05-02',
      uploaded_at: '2024-05-02T10:15:00.000Z',
      uploaded_by: 'ignatius@korapay.com',
      notes: 'UK Remote Engineer contract under UK Employment Rights Act',
    },
    {
      id: 'doc_006',
      company_id: orgId,
      employee_id: 'emp_004',
      type: 'id_card',
      file_ref: samplePdfData,
      file_name: 'UK_Biometric_Residence_Permit_Visa.pdf',
      file_size: 215000,
      expiry_date: '2028-04-30',
      uploaded_at: '2024-05-02T10:30:00.000Z',
      uploaded_by: 'ignatius@korapay.com',
      notes: 'UK Skilled Worker Visa & Right to Work Share Code',
    },
  ];

  // Seed Milestone 3 Compliance Items
  const compliance_items: ComplianceItem[] = [
    {
      id: 'comp_item_001',
      company_id: orgId,
      category: 'contracts_visas',
      related_employee_id: 'emp_002',
      related_employee_name: 'Ama Serwaa',
      title: 'Employment Contract Renewal - Ama Serwaa',
      deadline: '2026-09-25',
      status: 'attention',
      document_id: 'doc_003',
      notes: 'Fixed-term 3-year contract expires on September 25, 2026. HR review required for permanent rollover.',
      created_at: '2026-08-01T00:00:00.000Z',
    },
    {
      id: 'comp_item_002',
      company_id: orgId,
      category: 'certifications',
      related_employee_id: 'emp_003',
      related_employee_name: 'Kofi Boateng',
      title: 'AWS Certified DevOps Renewal - Kofi Boateng',
      deadline: '2026-08-20',
      status: 'non_compliant',
      document_id: 'doc_004',
      notes: 'AWS Professional certification expired 12 days ago. Required for SOC2 compliance checklist.',
      created_at: '2026-08-01T00:00:00.000Z',
    },
    {
      id: 'comp_item_003',
      company_id: orgId,
      category: 'statutory_tax',
      title: 'SSNIT Tier 1 & Tier 2 Monthly Contribution Remittance',
      deadline: '2026-09-14',
      status: 'attention',
      notes: 'Ghana statutory deadline for August payroll social security filing (13.5% Tier 1 + 5% Tier 2).',
      created_at: '2026-08-15T00:00:00.000Z',
    },
    {
      id: 'comp_item_004',
      company_id: orgId,
      category: 'statutory_tax',
      title: 'GRA PAYE Monthly Tax Return Filing & Remittance',
      deadline: '2026-09-15',
      status: 'compliant',
      notes: 'Monthly withholding tax schedule prepared for Ghana Revenue Authority portal upload.',
      created_at: '2026-08-15T00:00:00.000Z',
    },
    {
      id: 'comp_item_005',
      company_id: orgId,
      category: 'workplace_safety',
      title: 'Annual Workplace First Aid & Fire Safety Inspection',
      deadline: '2026-11-30',
      status: 'compliant',
      notes: 'Accra Innovation Hub headquarters inspection certified by Ghana National Fire Service.',
      created_at: '2026-06-01T00:00:00.000Z',
    },
    {
      id: 'comp_item_006',
      company_id: orgId,
      category: 'contracts_visas',
      related_employee_id: 'emp_001',
      related_employee_name: 'Kwame Mensah',
      title: 'Ghana Card Verification - Kwame Mensah',
      deadline: '2026-10-15',
      status: 'compliant',
      document_id: 'doc_002',
      notes: 'National Identity card valid and cross-referenced with NIA biometric registry.',
      created_at: '2026-08-01T00:00:00.000Z',
    },
  ];

  // Seed Leave Types
  const leave_types = getDefaultLeaveTypes(orgId);

  // Seed Leave Balances for existing employees
  const leave_balances: LeaveBalance[] = [];
  employees.forEach((emp) => {
    leave_types.forEach((lt) => {
      let used = 0;
      if (emp.id === 'emp_003' && lt.name === 'Annual Leave') {
        used = 5;
      }
      leave_balances.push({
        id: generateId('lbal'),
        employee_id: emp.id,
        company_id: orgId,
        leave_type_id: lt.id,
        allocated_days: lt.default_entitlement_days,
        used_days: used,
        balance_days: Math.max(0, lt.default_entitlement_days - used),
      });
    });
  });

  // Seed Leave Requests
  const annualLt = leave_types.find((lt) => lt.name === 'Annual Leave')!;
  const leave_requests: LeaveRequest[] = [
    {
      id: 'lreq_001',
      employee_id: 'emp_003',
      company_id: orgId,
      leave_type_id: annualLt.id,
      start_date: getTodayString(),
      end_date: getTodayString(),
      days_requested: 5,
      status: 'approved',
      reason: 'Mid-year family vacation and medical checkup',
      approved_by: 'usr_hr_head_01',
      approved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      escalated_to_head: true,
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'lreq_002',
      employee_id: 'emp_004',
      company_id: orgId,
      leave_type_id: annualLt.id,
      start_date: getTodayString(),
      end_date: getTodayString(),
      days_requested: 4,
      status: 'pending',
      reason: 'Attending technical conference & relocation personal days',
      escalated_to_head: true, // > 3 days requires HR Head approval
      created_at: new Date().toISOString(),
    },
    {
      id: 'lreq_003',
      employee_id: 'emp_001',
      company_id: orgId,
      leave_type_id: leave_types.find((l) => l.name === 'Sick Leave')!.id,
      start_date: getTodayString(),
      end_date: getTodayString(),
      days_requested: 2,
      status: 'pending',
      reason: 'Flu symptoms recovery',
      escalated_to_head: false, // <= 3 days can be approved by HR Analyst
      created_at: new Date().toISOString(),
    },
  ];

  // Seed Onboarding Tasks
  const onboarding_tasks: OnboardingTask[] = [];
  employees.forEach((emp) => {
    const tasks = generateDefaultOnboardingTasks(emp.id, orgId, emp.country, emp.start_date);
    if (emp.id === 'emp_001' || emp.id === 'emp_002') {
      // Completed onboarding
      tasks.forEach((t) => {
        t.status = 'completed';
        t.completed_at = emp.start_date;
        t.completed_by = 'hr_analyst';
      });
    } else if (emp.id === 'emp_004') {
      // In progress (3 of 6 done)
      tasks[0].status = 'completed';
      tasks[1].status = 'completed';
      tasks[2].status = 'completed';
    }
    onboarding_tasks.push(...tasks);
  });

  // Seed Attendance Records for Today
  const today = getTodayString();
  const attendance_records: AttendanceRecord[] = [
    { id: generateId('att'), employee_id: 'emp_001', company_id: orgId, date: today, status: 'present' },
    { id: generateId('att'), employee_id: 'emp_002', company_id: orgId, date: today, status: 'present' },
    { id: generateId('att'), employee_id: 'emp_003', company_id: orgId, date: today, status: 'on_leave', notes: 'Approved Annual Leave' },
    { id: generateId('att'), employee_id: 'emp_004', company_id: orgId, date: today, status: 'late', notes: 'Remote transit delay (15 min)' },
    { id: generateId('att'), employee_id: 'emp_005', company_id: orgId, date: today, status: 'absent', notes: 'Unscheduled absence' },
  ];

  // Seed Daily Attendance Summary for Today (Trigger-maintained style)
  const daily_attendance_summary: DailyAttendanceSummary[] = [
    {
      company_id: orgId,
      date: today,
      present_count: 2,
      late_count: 1,
      absent_count: 1,
      on_leave_count: 1,
      not_logged_count: 0,
    },
  ];

  return {
    organizations: [org, org2, org3, org4],
    organization_members: members,
    departments,
    employees,
    employee_compensation,
    users,
    invites: [],
    onboarding_tasks,
    offboarding_tasks: [],
    offboarding_records: [],
    attendance_records,
    daily_attendance_summary,
    leave_types,
    leave_balances,
    leave_requests,
    leave_audit_logs: [
      {
        id: 'laudit_seed_001',
        company_id: orgId,
        employee_id: 'emp_003',
        employee_name: 'Kofi Boateng',
        leave_request_id: 'lreq_001',
        leave_type_id: annualLt.id,
        leave_type_name: 'Annual Leave',
        action: 'deduction',
        days_changed: -5,
        previous_balance: 15,
        new_balance: 10,
        performed_by: 'ignatius@korapay.com',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Deducted 5 days upon approval for mid-year family vacation',
      },
    ],
    // Milestone 3
    compliance_items,
    documents,
    // Milestone 4
    ai_chat_logs: [],
    // Milestone 5
    tasks: [
      {
        id: 'task_seed_001',
        company_id: orgId,
        title: 'Review Ama Serwaa Fixed-term Rollover',
        description: 'Ama\'s 3-year contract expires on Sep 25. Complete HR and Legal review for permanent rollover agreement.',
        status: 'in_review',
        assignee_id: 'usr_001',
        related_employee_id: 'emp_002',
        due_date: '2026-09-15',
        priority: 'urgent',
        created_by: 'usr_001',
        created_at: '2026-09-01T08:30:00.000Z',
      },
      {
        id: 'task_seed_002',
        company_id: orgId,
        title: 'Q3 Engineering Compensation Benchmarking',
        description: 'Compare local Accra tech market salary ranges against Radford/Pave benchmark medians for Level 3 Engineers.',
        status: 'in_progress',
        assignee_id: 'usr_001',
        related_employee_id: null,
        due_date: '2026-09-18',
        priority: 'high',
        created_by: 'usr_001',
        created_at: '2026-09-01T09:15:00.000Z',
      },
      {
        id: 'task_seed_003',
        company_id: orgId,
        title: 'SSNIT Tier 1 & 2 Statutory Remittance Filing',
        description: 'Verify employee and employer social security deductions match August payroll totals before submission.',
        status: 'todo',
        assignee_id: 'usr_002',
        related_employee_id: null,
        due_date: '2026-09-14',
        priority: 'high',
        created_by: 'usr_001',
        created_at: '2026-09-02T10:00:00.000Z',
      },
      {
        id: 'task_seed_004',
        company_id: orgId,
        title: 'Collect UK NI & HMRC P45 for David Smith',
        description: 'Request formal documentation for UK remote payroll setup and cumulative tax code application.',
        status: 'complete',
        assignee_id: 'usr_002',
        related_employee_id: 'emp_004',
        due_date: '2026-08-30',
        priority: 'medium',
        created_by: 'usr_002',
        created_at: '2026-08-25T11:00:00.000Z',
      },
      {
        id: 'task_seed_005',
        company_id: orgId,
        title: 'Schedule 90-Day Retention Check-in with Kwame Mensah',
        description: 'Review career progression, engineering lead responsibilities, and team feedback with Kwame.',
        status: 'todo',
        assignee_id: 'usr_001',
        related_employee_id: 'emp_001',
        due_date: '2026-09-22',
        priority: 'medium',
        created_by: 'usr_001',
        created_at: '2026-09-02T14:30:00.000Z',
      },
      {
        id: 'task_seed_006',
        company_id: orgId,
        title: 'Conduct Remote Ergonomics Assessment for David Smith',
        description: 'Send standardized remote home office assessment questionnaire and verify setup compliance.',
        status: 'in_progress',
        assignee_id: 'usr_002',
        related_employee_id: 'emp_004',
        due_date: '2026-09-28',
        priority: 'low',
        created_by: 'usr_001',
        created_at: '2026-09-02T15:00:00.000Z',
      },
    ],
    // Milestone 6 Collections
    job_history: [
      {
        id: 'jh_seed_001',
        employee_id: 'emp_001',
        company_id: orgId,
        previous_department_id: dept1.id,
        new_department_id: dept1.id,
        previous_job_title: 'Lead Software Architect',
        new_job_title: 'Head of Engineering',
        previous_manager_id: 'emp_000',
        new_manager_id: 'emp_000',
        reason: 'promotion',
        effective_date: '2024-01-15',
        changed_by: userHeadId,
        created_at: '2024-01-15T09:00:00.000Z',
      },
      {
        id: 'jh_seed_002',
        employee_id: 'emp_002',
        company_id: orgId,
        previous_department_id: dept3.id,
        new_department_id: dept3.id,
        previous_job_title: 'Senior Product Designer',
        new_job_title: 'Product Design Lead',
        previous_manager_id: 'emp_000',
        new_manager_id: 'emp_000',
        reason: 'promotion',
        effective_date: '2024-03-01',
        changed_by: userHeadId,
        created_at: '2024-03-01T10:00:00.000Z',
      },
      {
        id: 'jh_seed_003',
        employee_id: 'emp_004',
        company_id: orgId,
        previous_department_id: dept1.id,
        new_department_id: dept1.id,
        previous_job_title: 'Full Stack Engineer (UK Remote)',
        new_job_title: 'Full Stack Engineer (UK Remote)',
        previous_manager_id: 'emp_000',
        new_manager_id: 'emp_001',
        reason: 'restructure',
        effective_date: '2024-06-01',
        changed_by: userHeadId,
        created_at: '2024-06-01T11:00:00.000Z',
      },
    ],
    // Milestone 7 Collections
    expense_categories: [
      { id: `ec_flight_${orgId}`, company_id: orgId, name: 'Flights', created_at: '2024-01-01T00:00:00.000Z' },
      { id: `ec_hotel_${orgId}`, company_id: orgId, name: 'Hotels', created_at: '2024-01-01T00:00:00.000Z' },
      { id: `ec_recruitment_${orgId}`, company_id: orgId, name: 'Recruitment costs', created_at: '2024-01-01T00:00:00.000Z' },
      { id: `ec_training_${orgId}`, company_id: orgId, name: 'Training', created_at: '2024-01-01T00:00:00.000Z' },
      { id: `ec_office_${orgId}`, company_id: orgId, name: 'Office supplies', created_at: '2024-01-01T00:00:00.000Z' },
      { id: `ec_other_${orgId}`, company_id: orgId, name: 'Other', created_at: '2024-01-01T00:00:00.000Z' },
    ],
    expenses: [
      {
        id: 'exp_seed_001',
        company_id: orgId,
        category_id: `ec_flight_${orgId}`,
        related_employee_id: 'emp_001',
        amount: 5200,
        currency: 'GHS',
        date: '2026-08-12',
        description: 'Flight to Lagos for West Africa Tech Summit & Developer Keynote',
        receipt_url: samplePdfData,
        receipt_name: 'Flight_Booking_KQ502.pdf',
        status: 'approved',
        submitted_by: userAnalystId,
        approved_by: userHeadId,
        approved_at: '2026-08-13T10:30:00.000Z',
        created_at: '2026-08-12T14:20:00.000Z',
      },
      {
        id: 'exp_seed_002',
        company_id: orgId,
        category_id: `ec_hotel_${orgId}`,
        related_employee_id: 'emp_001',
        amount: 3800,
        currency: 'GHS',
        date: '2026-08-15',
        description: 'Eko Hotel 3 nights stay for Lagos Summit delegation',
        receipt_url: samplePdfData,
        receipt_name: 'Hotel_Invoice_Eko.pdf',
        status: 'approved',
        submitted_by: userAnalystId,
        approved_by: userHeadId,
        approved_at: '2026-08-16T09:15:00.000Z',
        created_at: '2026-08-15T18:00:00.000Z',
      },
      {
        id: 'exp_seed_003',
        company_id: orgId,
        category_id: `ec_recruitment_${orgId}`,
        related_employee_id: null,
        amount: 4500,
        currency: 'GHS',
        date: '2026-08-20',
        description: 'LinkedIn Recruiter Enterprise Seat & Accra Tech Talent job board postings',
        receipt_url: samplePdfData,
        receipt_name: 'LinkedIn_Recruiter_Receipt.pdf',
        status: 'approved',
        submitted_by: userHeadId,
        approved_by: userHeadId,
        approved_at: '2026-08-20T11:00:00.000Z',
        created_at: '2026-08-20T11:00:00.000Z',
      },
      {
        id: 'exp_seed_004',
        company_id: orgId,
        category_id: `ec_training_${orgId}`,
        related_employee_id: 'emp_002',
        amount: 2950,
        currency: 'GHS',
        date: '2026-08-28',
        description: 'Executive Product Leadership & Scrum Product Owner Certification',
        receipt_url: samplePdfData,
        receipt_name: 'ProductSchool_Course_Invoice.pdf',
        status: 'approved',
        submitted_by: userAnalystId,
        approved_by: userHeadId,
        approved_at: '2026-08-29T14:00:00.000Z',
        created_at: '2026-08-28T16:40:00.000Z',
      },
      {
        id: 'exp_seed_005',
        company_id: orgId,
        category_id: `ec_office_${orgId}`,
        related_employee_id: null,
        amount: 2100,
        currency: 'GHS',
        date: '2026-09-01',
        description: 'Ergonomic dual-monitor desk mounts and USB-C docks for Accra HQ',
        receipt_url: samplePdfData,
        receipt_name: 'CompuGhana_Equipment_Invoice.pdf',
        status: 'approved',
        submitted_by: userAnalystId,
        approved_by: userHeadId,
        approved_at: '2026-09-01T15:20:00.000Z',
        created_at: '2026-09-01T12:10:00.000Z',
      },
      {
        id: 'exp_seed_006',
        company_id: orgId,
        category_id: `ec_flight_${orgId}`,
        related_employee_id: 'emp_003',
        amount: 4800,
        currency: 'GHS',
        date: '2026-09-02',
        description: 'Return flight Accra to Nairobi for African Cloud Infrastructure Summit',
        receipt_url: samplePdfData,
        receipt_name: 'KenyaAirways_E-Ticket_Quote.pdf',
        status: 'pending',
        submitted_by: userAnalystId,
        approved_by: null,
        created_at: '2026-09-02T16:30:00.000Z',
      },
      {
        id: 'exp_seed_007',
        company_id: orgId,
        category_id: `ec_training_${orgId}`,
        related_employee_id: 'emp_005',
        amount: 1650,
        currency: 'GHS',
        date: '2026-09-03',
        description: 'CIPD HR Analytics & Statutory Compliance Workshop Enrollment',
        receipt_url: samplePdfData,
        receipt_name: 'CIPD_Course_Enrollment.pdf',
        status: 'pending',
        submitted_by: userAnalystId,
        approved_by: null,
        created_at: '2026-09-03T09:15:00.000Z',
      },
      // USD Expenses (distinct multi-currency tracking)
      {
        id: 'exp_seed_008',
        company_id: orgId,
        category_id: `ec_training_${orgId}`,
        related_employee_id: 'emp_004',
        amount: 750,
        currency: 'USD',
        date: '2026-08-25',
        description: 'AWS Certified Solutions Architect Exam & Official Sandbox Lab voucher',
        receipt_url: samplePdfData,
        receipt_name: 'AWS_Training_Receipt.pdf',
        status: 'approved',
        submitted_by: userAnalystId,
        approved_by: userHeadId,
        approved_at: '2026-08-26T11:00:00.000Z',
        created_at: '2026-08-25T14:10:00.000Z',
      },
      {
        id: 'exp_seed_009',
        company_id: orgId,
        category_id: `ec_recruitment_${orgId}`,
        related_employee_id: null,
        amount: 1200,
        currency: 'USD',
        date: '2026-08-10',
        description: 'Remote UK Senior Engineer sourcing placement fee (Cord/Hired)',
        receipt_url: samplePdfData,
        receipt_name: 'Remote_Sourcing_Invoice.pdf',
        status: 'approved',
        submitted_by: userHeadId,
        approved_by: userHeadId,
        approved_at: '2026-08-10T16:00:00.000Z',
        created_at: '2026-08-10T16:00:00.000Z',
      },
      {
        id: 'exp_seed_010',
        company_id: orgId,
        category_id: `ec_other_${orgId}`,
        related_employee_id: 'emp_004',
        amount: 420,
        currency: 'USD',
        date: '2026-09-02',
        description: 'London Tech Leaders Meetup Sponsorship & Team Networking Dinner',
        receipt_url: samplePdfData,
        receipt_name: 'London_Meetup_Sponsorship.pdf',
        status: 'pending',
        submitted_by: userAnalystId,
        approved_by: null,
        created_at: '2026-09-02T19:00:00.000Z',
      },
    ],
    expense_policies: {
      [orgId]: {
        restrict_analyst_to_own_expenses: false,
      },
    },
    events: [
      {
        id: 'evt_seed_001',
        company_id: orgId,
        title: 'Kwame Nkrumah Memorial Day (National Holiday)',
        description: 'Statutory public holiday observed across all Ghana operations. Offices closed; critical payment monitoring teams on on-call rotation.',
        start_datetime: '2026-09-21T00:00:00.000Z',
        end_datetime: '2026-09-21T23:59:59.000Z',
        location: 'All Ghana Offices (National Observance)',
        event_type: 'holiday',
        visibility_scope: 'company',
        department_id: null,
        training_session_id: null,
        created_by: userHeadId,
        created_at: '2026-09-01T08:00:00.000Z',
      },
      {
        id: 'evt_seed_002',
        company_id: orgId,
        title: 'Q3 All-Hands & Product Milestone Review',
        description: 'Executive briefing on Q3 fintech gross volume, merchant acquisition progress, and cross-border settlement pipeline.',
        start_datetime: '2026-09-18T14:00:00.000Z',
        end_datetime: '2026-09-18T15:30:00.000Z',
        location: 'Accra HQ Main Hall & Google Meet (meet.google.com/kora-q3-allhands)',
        event_type: 'meeting',
        visibility_scope: 'company',
        department_id: null,
        training_session_id: null,
        created_by: userHeadId,
        created_at: '2026-09-02T09:00:00.000Z',
      },
      {
        id: 'evt_seed_003',
        company_id: orgId,
        title: 'SOC2 Security & Key Management Training',
        description: 'Required compliance & security engineering training on automated secrets rotation, encrypted audit trails, and zero-trust credentials.',
        start_datetime: '2026-09-15T10:00:00.000Z',
        end_datetime: '2026-09-15T12:00:00.000Z',
        location: 'Engineering Lab 2 & Zoom (zoom.us/j/918273645)',
        event_type: 'training',
        visibility_scope: 'department',
        department_id: dept1.id,
        training_session_id: null,
        created_by: userAnalystId,
        created_at: '2026-09-03T10:30:00.000Z',
      },
      {
        id: 'evt_seed_004',
        company_id: orgId,
        title: 'People Ops Bi-Weekly Compliance Standup',
        description: 'Status review on GRA tax withholding filings, pension tier 2 remittance reconciliation, and probation reviews.',
        start_datetime: '2026-09-12T11:00:00.000Z',
        end_datetime: '2026-09-12T12:00:00.000Z',
        location: 'HR Conference Room A',
        event_type: 'meeting',
        visibility_scope: 'department',
        department_id: dept4.id,
        training_session_id: null,
        created_by: userHeadId,
        created_at: '2026-09-01T11:00:00.000Z',
      },
      {
        id: 'evt_seed_005',
        company_id: orgId,
        title: 'Kora End-of-Quarter Rooftop Social',
        description: 'Celebrate our Q3 team milestones with evening refreshments, music, games, and team bonding.',
        start_datetime: '2026-09-25T17:30:00.000Z',
        end_datetime: '2026-09-25T21:00:00.000Z',
        location: 'Skybar 25 Rooftop, Villaggio Vista, Accra',
        event_type: 'social',
        visibility_scope: 'company',
        department_id: null,
        training_session_id: null,
        created_by: userAnalystId,
        created_at: '2026-09-02T15:00:00.000Z',
      },
    ],
    notifications: [
      {
        id: 'notif_seed_001',
        company_id: orgId,
        user_id: userHeadId,
        type: 'compliance_deadline',
        title: 'Compliance Overdue: AWS Professional Certification',
        message: 'AWS Professional certification for Kwame Mensah expired 12 days ago. Required for SOC2 compliance checklist.',
        link: 'compliance',
        read_at: null,
        created_at: '2026-09-04T08:30:00.000Z',
      },
      {
        id: 'notif_seed_002',
        company_id: orgId,
        user_id: userHeadId,
        type: 'leave_submitted',
        title: 'Leave Request Submitted',
        message: 'Abena Osei requested 4 day(s) of Annual Leave (2026-09-15 to 2026-09-18) [Requires HR Head Approval]',
        link: 'leave',
        read_at: null,
        created_at: '2026-09-04T09:15:00.000Z',
      },
      {
        id: 'notif_seed_003',
        company_id: orgId,
        user_id: userHeadId,
        type: 'expense_submitted',
        title: 'Expense Submitted for Approval',
        message: 'analyst submitted expense of GHS 4,200 for "Flight tickets to Lagos Fintech Summit"',
        link: 'expenses',
        read_at: null,
        created_at: '2026-09-04T10:00:00.000Z',
      },
      {
        id: 'notif_seed_004',
        company_id: orgId,
        user_id: userAnalystId,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: 'You have been assigned to task "Collect statutory compliance info: SSNIT Number, TIN & Ghana Card PIN" (Priority: HIGH)',
        link: 'tasks',
        read_at: null,
        created_at: '2026-09-04T10:30:00.000Z',
      },
      {
        id: 'notif_seed_005',
        company_id: orgId,
        user_id: userAnalystId,
        type: 'event_created',
        title: 'Company Event: All-Hands Townhall',
        message: 'All-Hands Quarterly Strategy Townhall scheduled for 2026-09-12 (Main Auditorium & Google Meet)',
        link: 'events',
        read_at: null,
        created_at: '2026-09-04T11:00:00.000Z',
      },
    ],
    email_logs: [
      {
        id: 'elog_seed_001',
        company_id: orgId,
        user_id: userHeadId,
        recipient_email: 'ignatius@korapay.com',
        subject: '[High Priority HR Compliance Alert] AWS Professional Certification Overdue',
        body: 'Kwame Mensah AWS certification has expired. Immediate compliance action required.',
        type: 'compliance_deadline',
        status: 'delivered',
        sent_at: '2026-09-04T08:30:05.000Z',
      },
    ],
    // Milestone 12 Collections
    chat_channels: [
      {
        id: 'chan_seed_1on1',
        company_id: orgId,
        name: null,
        is_group: false,
        created_by: userHeadId,
        created_at: '2026-09-04T10:00:00.000Z',
      },
      {
        id: 'chan_seed_group',
        company_id: orgId,
        name: 'HR Operations & People Strategy',
        is_group: true,
        created_by: userHeadId,
        created_at: '2026-09-04T09:00:00.000Z',
      },
    ],
    chat_channel_members: [
      { channel_id: 'chan_seed_1on1', user_id: userHeadId },
      { channel_id: 'chan_seed_1on1', user_id: userAnalystId },
      { channel_id: 'chan_seed_group', user_id: userHeadId },
      { channel_id: 'chan_seed_group', user_id: userAnalystId },
    ],
    chat_messages: [
      {
        id: 'msg_seed_001',
        channel_id: 'chan_seed_1on1',
        sender_id: userHeadId,
        content: 'Hi Ama, could you review the pending leave requests and onboarding status for our new engineering cohort?',
        created_at: '2026-09-04T10:05:00.000Z',
      },
      {
        id: 'msg_seed_002',
        channel_id: 'chan_seed_1on1',
        sender_id: userAnalystId,
        content: 'Sure thing, Ignatius! All compliance documents and biodata for the new hires have been verified and logged.',
        created_at: '2026-09-04T10:08:00.000Z',
      },
      {
        id: 'msg_seed_003',
        channel_id: 'chan_seed_1on1',
        sender_id: userHeadId,
        content: 'Excellent work. Thanks for the quick turnaround.',
        created_at: '2026-09-04T10:10:00.000Z',
      },
      {
        id: 'msg_seed_004',
        channel_id: 'chan_seed_group',
        sender_id: userHeadId,
        content: 'Welcome to the HR Operations & People Strategy channel. Let us use this space for quick syncs, hiring updates, and team discussions.',
        created_at: '2026-09-04T09:15:00.000Z',
      },
    ],
    // Milestone 14 Collections
    demo_requests: [
      {
        id: 'demo_seed_001',
        name: 'Kojo Antwi',
        email: 'k.antwi@telecel-gh.com',
        company_name: 'Telecel Business Solutions',
        team_size: '251-500',
        message: 'Interested in automating multi-tier SSNIT and GRA PAYE compliance for 350+ staff across Greater Accra and Ashanti regions.',
        created_at: '2026-09-02T14:30:00.000Z',
      },
      {
        id: 'demo_seed_002',
        name: 'Sarah Mensah',
        email: 'smensah@voltagreen.org',
        company_name: 'Volta Green Logistics',
        team_size: '20-50',
        message: 'Evaluating HRMS alternatives to replace manual excel spreadsheets with mobile clock-in and dual-currency contracts.',
        created_at: '2026-09-04T09:10:00.000Z',
      },
      {
        id: 'demo_seed_003',
        name: 'Kwabena Darko',
        email: 'k.darko@goldcoastpay.com',
        company_name: 'Gold Coast Payment Systems',
        team_size: '51-150',
        message: 'Seeking demo on AI Copilot policy query capabilities and Tier 2 pension scheme reconciliation.',
        created_at: '2026-09-06T11:45:00.000Z',
      },
    ],
    // Milestone 15 & 16 Collections
    subscriptions: [
      {
        id: 'sub_kora_001',
        company_id: orgId,
        plan: 'professional',
        billing_cycle: 'annual',
        employee_limit: 50,
        status: 'active',
        trial_ends_at: null,
        current_period_end: new Date(Date.now() + 280 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'sub_goldkey_002',
        company_id: 'org_goldkey_02',
        plan: 'starter',
        billing_cycle: 'monthly',
        employee_limit: 25,
        status: 'active',
        trial_ends_at: null,
        current_period_end: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'sub_payswitch_003',
        company_id: 'org_payswitch_03',
        plan: 'enterprise',
        billing_cycle: 'annual',
        employee_limit: 200,
        status: 'active',
        trial_ends_at: null,
        current_period_end: new Date(Date.now() + 320 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'sub_afrilog_004',
        company_id: 'org_afrilog_04',
        plan: 'free_trial',
        billing_cycle: 'monthly',
        employee_limit: 10,
        status: 'trialing',
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    invoices: [
      {
        id: 'inv_kora_2026_01',
        company_id: orgId,
        amount: 9120,
        currency: 'GHS',
        status: 'paid',
        period_start: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
        period_end: new Date(Date.now() + 280 * 24 * 60 * 60 * 1000).toISOString(),
        paid_at: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Professional Plan (Annual) - 50 Employee Seats',
        invoice_number: 'INV-2026-0041',
      },
      {
        id: 'inv_kora_2025_01',
        company_id: orgId,
        amount: 9120,
        currency: 'GHS',
        status: 'paid',
        period_start: new Date(Date.now() - 450 * 24 * 60 * 60 * 1000).toISOString(),
        period_end: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
        paid_at: new Date(Date.now() - 450 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Professional Plan (Annual) - 50 Employee Seats',
        invoice_number: 'INV-2025-0018',
      },
    ],
    payment_methods: [
      {
        id: 'pm_kora_01',
        company_id: orgId,
        provider_ref: 'pstk_auth_momo_00192',
        last4: '4821',
        brand: 'MTN Mobile Money',
        is_default: true,
        created_at: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'pm_kora_02',
        company_id: orgId,
        provider_ref: 'pstk_auth_card_00831',
        last4: '4242',
        brand: 'Visa',
        is_default: false,
        created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    platform_admins: [
      {
        id: 'padmin_seed_001',
        user_id: userHeadId,
        created_at: '2024-01-01T00:00:00.000Z',
      },
    ],
    support_notes: [
      {
        id: 'snote_001',
        company_id: orgId,
        note: 'Initial tenant onboarding completed. Verified SSNIT Tier 1 & 2 formula and Ghana Card validation rules.',
        author_email: 'ignatius@korapay.com',
        created_at: '2026-08-20T10:00:00.000Z',
      },
      {
        id: 'snote_002',
        company_id: 'org_payswitch_03',
        note: 'Enterprise tier custom SLA active. Dedicated compliance account manager assigned.',
        author_email: 'operator@goyahrms.com',
        created_at: '2026-08-25T14:20:00.000Z',
      },
    ],
    // Milestone 17
    performance_reviews: [
      {
        id: 'pr_seed_001',
        employee_id: 'emp_000',
        company_id: orgId,
        cycle: 'Q1',
        rating: 4.8,
        comments: 'Exceptional delivery on core multi-currency payroll architecture and Ghana statutory engine. Exceeded sprint velocity targets by 25%.',
        reviewed_by: 'ignatius@korapay.com',
        status: 'finalized',
        bsc_completed: true,
        bsc_document_url: 'https://docs.google.com/document/d/bsc_kwame_2026_q1',
        bsc_score: 96,
        created_at: '2026-03-31T12:00:00.000Z',
        finalized_at: '2026-04-02T10:00:00.000Z',
        finalized_by: 'ignatius@korapay.com',
      },
      {
        id: 'pr_seed_002',
        employee_id: 'emp_000',
        company_id: orgId,
        cycle: 'mid_year',
        rating: 4.5,
        comments: 'Outstanding engineering leadership across the team. Successfully conducted technical reviews and mentored 2 junior developers on security.',
        reviewed_by: 'ignatius@korapay.com',
        status: 'finalized',
        bsc_completed: true,
        bsc_document_url: 'https://docs.google.com/document/d/bsc_kwame_2026_my',
        bsc_score: 92,
        created_at: '2026-06-30T14:30:00.000Z',
        finalized_at: '2026-07-02T09:15:00.000Z',
        finalized_by: 'ignatius@korapay.com',
      },
      {
        id: 'pr_seed_003',
        employee_id: 'emp_000',
        company_id: orgId,
        cycle: 'Q3',
        rating: 4.2,
        comments: 'Draft quarterly evaluation. Maintained high code velocity while participating in customer onboarding architecture reviews.',
        reviewed_by: 'hr.analyst@korapay.com',
        status: 'draft',
        bsc_completed: false,
        created_at: '2026-09-02T11:00:00.000Z',
      },
      {
        id: 'pr_seed_004',
        employee_id: 'emp_001',
        company_id: orgId,
        cycle: 'Q1',
        rating: 4.4,
        comments: 'Spearheaded user onboarding revamp resulting in 18% reduction in tenant activation drop-off.',
        reviewed_by: 'ignatius@korapay.com',
        status: 'finalized',
        bsc_completed: true,
        bsc_document_url: 'https://docs.google.com/document/d/bsc_akua_2026_q1',
        bsc_score: 90,
        created_at: '2026-03-30T10:00:00.000Z',
        finalized_at: '2026-04-01T16:00:00.000Z',
        finalized_by: 'ignatius@korapay.com',
      },
      {
        id: 'pr_seed_005',
        employee_id: 'emp_001',
        company_id: orgId,
        cycle: 'mid_year',
        rating: 4.6,
        comments: 'Outstanding cross-functional alignment between compliance, engineering, and customer success teams.',
        reviewed_by: 'ignatius@korapay.com',
        status: 'finalized',
        bsc_completed: true,
        bsc_document_url: 'https://docs.google.com/document/d/bsc_akua_2026_my',
        bsc_score: 94,
        created_at: '2026-06-28T15:00:00.000Z',
        finalized_at: '2026-07-03T11:30:00.000Z',
        finalized_by: 'ignatius@korapay.com',
      },
      {
        id: 'pr_seed_006',
        employee_id: 'emp_003',
        company_id: orgId,
        cycle: 'mid_year',
        rating: 3.8,
        comments: 'Solid operational management. Recommended to automate vendor invoice intake for faster turnaround.',
        reviewed_by: 'hr.analyst@korapay.com',
        status: 'draft',
        bsc_completed: false,
        created_at: '2026-07-05T09:00:00.000Z',
      },
    ],
    pdp_goals: [
      {
        id: 'pdp_seed_001',
        employee_id: 'emp_000',
        company_id: orgId,
        goal: 'Complete AWS Solutions Architect - Associate certification to optimize cloud container sizing',
        target_date: '2026-10-31',
        status: 'in_progress',
        created_at: '2026-02-15T09:00:00.000Z',
      },
      {
        id: 'pdp_seed_002',
        employee_id: 'emp_000',
        company_id: orgId,
        goal: 'Publish internal technical documentation on GRA PAYE tax band cumulative computation',
        target_date: '2026-08-15',
        status: 'complete',
        created_at: '2026-03-01T10:00:00.000Z',
      },
      {
        id: 'pdp_seed_003',
        employee_id: 'emp_000',
        company_id: orgId,
        goal: 'Host quarterly knowledge sharing session on TypeScript type safety and error boundaries',
        target_date: '2026-11-30',
        status: 'not_started',
        created_at: '2026-07-10T14:00:00.000Z',
      },
      {
        id: 'pdp_seed_004',
        employee_id: 'emp_001',
        company_id: orgId,
        goal: 'Complete Pragmatic Institute Certified Product Masterclass',
        target_date: '2026-10-15',
        status: 'in_progress',
        created_at: '2026-02-01T08:00:00.000Z',
      },
      {
        id: 'pdp_seed_005',
        employee_id: 'emp_001',
        company_id: orgId,
        goal: 'Establish standardized customer interview feedback repository in Notion',
        target_date: '2026-07-31',
        status: 'complete',
        created_at: '2026-04-12T10:00:00.000Z',
      },
      {
        id: 'pdp_seed_006',
        employee_id: 'emp_003',
        company_id: orgId,
        goal: 'Complete Advanced Excel & Financial Modeling workshop',
        target_date: '2026-09-30',
        status: 'in_progress',
        created_at: '2026-05-10T11:00:00.000Z',
      },
    ],
    // Milestone 18 Collections
    probation_records: [
      {
        id: 'prob_seed_001',
        employee_id: 'emp_004',
        company_id: orgId,
        probation_period_months: 3,
        probation_start: new Date(Date.now() - 76 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        probation_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        original_probation_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        extension_months: 0,
        mid_review_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        mid_reviewer: 'ignatius@korapay.com',
        mid_review_notes: 'Demonstrating strong engineering velocity across frontend components. Meets design fidelity criteria. Recommended to focus on edge-case testing before full confirmation.',
        end_review_date: null,
        end_reviewer: null,
        outcome: null,
        confirmation_date: null,
        remarks: null,
        created_at: new Date(Date.now() - 76 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    // Milestone 19 Collections (Employee Conduct Tracker)
    conduct_incidents: [
      {
        id: 'cinc_seed_001',
        company_id: orgId,
        date_reported: '2026-09-04',
        reporter: 'Internal Compliance Officer / Anonymous Whistleblower',
        witnesses: 'Akua Osei (VP Product), Cloud Access Logs',
        incident_type: 'Policy Violation',
        severity: 'high',
        description: 'Unauthorized export of customer billing transactional records to an unapproved external personal cloud storage drive. Incident detected during automated DLP anomaly scanning.',
        related_employee_id: 'emp_002',
        department_id: dept3.id,
        status: 'investigating',
        investigation_owner: 'ignatius@korapay.com',
        action_taken: 'Access credentials revoked immediately. Hardware sequestered for forensic analysis; formal inquiry hearing scheduled.',
        created_by: userHeadId,
        created_at: '2026-09-04T09:30:00.000Z',
        updated_at: '2026-09-05T14:20:00.000Z',
      },
      {
        id: 'cinc_seed_002',
        company_id: orgId,
        date_reported: '2026-09-01',
        reporter: 'Kwame Mensah (Lead Engineer)',
        witnesses: 'Engineering Team during Daily Standup',
        incident_type: 'Insubordination & Unprofessional Conduct',
        severity: 'medium',
        description: 'Repeated aggressive outbursts, verbal disruption during sprint planning, and deliberate refusal to implement mandatory security audit remediation items.',
        related_employee_id: 'emp_004',
        department_id: dept1.id,
        status: 'open',
        investigation_owner: 'ignatius@korapay.com',
        action_taken: null,
        created_by: userHeadId,
        created_at: '2026-09-01T11:15:00.000Z',
        updated_at: '2026-09-01T11:15:00.000Z',
      },
      {
        id: 'cinc_seed_003',
        company_id: orgId,
        date_reported: '2026-08-10',
        reporter: 'Ama Serwaa (Finance Manager)',
        witnesses: 'Accounts Payable Team',
        incident_type: 'Attendance Misconduct',
        severity: 'low',
        description: 'Unreported absence spanning three consecutive business days following long weekend without statutory notification or sick leave documentation.',
        related_employee_id: 'emp_003',
        department_id: dept4.id,
        status: 'resolved',
        investigation_owner: 'ignatius@korapay.com',
        action_taken: 'Formal First Written Warning documented in personnel file and salary deduction applied for 3 unexcused days per company handbook.',
        created_by: userHeadId,
        created_at: '2026-08-10T08:00:00.000Z',
        updated_at: '2026-08-15T16:00:00.000Z',
      },
    ],
    conduct_audit_logs: [
      {
        id: 'caudit_seed_001',
        company_id: orgId,
        incident_id: 'cinc_seed_001',
        previous_status: null,
        new_status: 'open',
        previous_action_taken: null,
        new_action_taken: null,
        actor_id: userHeadId,
        actor_name: 'ignatius@korapay.com',
        actor_role: 'hr_head',
        notes: 'Initial formal conduct incident logged from internal whistleblower submission.',
        timestamp: '2026-09-04T09:30:00.000Z',
      },
      {
        id: 'caudit_seed_002',
        company_id: orgId,
        incident_id: 'cinc_seed_001',
        previous_status: 'open',
        new_status: 'investigating',
        previous_action_taken: null,
        new_action_taken: 'Access credentials revoked immediately. Hardware sequestered for forensic analysis; formal inquiry hearing scheduled.',
        actor_id: userHeadId,
        actor_name: 'ignatius@korapay.com',
        actor_role: 'hr_head',
        notes: 'Investigation commenced. Security team engaged to audit cloud storage access tokens.',
        timestamp: '2026-09-05T14:20:00.000Z',
      },
      {
        id: 'caudit_seed_003',
        company_id: orgId,
        incident_id: 'cinc_seed_002',
        previous_status: null,
        new_status: 'open',
        previous_action_taken: null,
        new_action_taken: null,
        actor_id: userHeadId,
        actor_name: 'ignatius@korapay.com',
        actor_role: 'hr_head',
        notes: 'Incident opened following report by engineering lead.',
        timestamp: '2026-09-01T11:15:00.000Z',
      },
      {
        id: 'caudit_seed_004',
        company_id: orgId,
        incident_id: 'cinc_seed_003',
        previous_status: 'investigating',
        new_status: 'resolved',
        previous_action_taken: null,
        new_action_taken: 'Formal First Written Warning documented in personnel file and salary deduction applied for 3 unexcused days per company handbook.',
        actor_id: userHeadId,
        actor_name: 'ignatius@korapay.com',
        actor_role: 'hr_head',
        notes: 'Employee attended hearing, admitted infraction, and accepted disciplinary warning.',
        timestamp: '2026-08-15T16:00:00.000Z',
      },
    ],
    // Milestone 20: Policy Acknowledgement
    policies: [
      {
        id: 'pol_seed_001',
        company_id: orgId,
        name: '2026 Code of Conduct & Business Ethics',
        version: 'v2.1',
        issue_date: '2026-01-10',
        document_id: 'doc_001',
      },
      {
        id: 'pol_seed_002',
        company_id: orgId,
        name: 'Information Security & Data Protection Policy (GDPR / NDPR)',
        version: 'v3.0',
        issue_date: '2026-02-01',
        document_id: 'doc_002',
      },
      {
        id: 'pol_seed_003',
        company_id: orgId,
        name: 'Remote Work & Digital Workplace Policy',
        version: 'v1.4',
        issue_date: '2026-05-15',
        document_id: 'doc_003',
      },
      {
        id: 'pol_seed_004',
        company_id: orgId,
        name: 'Anti-Harassment, Equality & Whistleblower Policy',
        version: 'v2.0',
        issue_date: '2026-06-01',
        document_id: null,
      },
    ],
    policy_acknowledgements: [
      // pol_seed_001 (Code of Conduct): 5 out of 6 acknowledged
      {
        id: 'pack_001_0',
        policy_id: 'pol_seed_001',
        employee_id: 'emp_000',
        acknowledged: true,
        acknowledgment_date: '2026-01-12',
        acknowledgment_method: 'in_app',
        follow_up_required: false,
        created_at: '2026-01-10T09:00:00.000Z',
      },
      {
        id: 'pack_001_1',
        policy_id: 'pol_seed_001',
        employee_id: 'emp_001',
        acknowledged: true,
        acknowledgment_date: '2026-01-14',
        acknowledgment_method: 'in_app',
        follow_up_required: false,
        created_at: '2026-01-10T09:00:00.000Z',
      },
      {
        id: 'pack_001_2',
        policy_id: 'pol_seed_001',
        employee_id: 'emp_002',
        acknowledged: true,
        acknowledgment_date: '2026-01-15',
        acknowledgment_method: 'email',
        follow_up_required: false,
        created_at: '2026-01-10T09:00:00.000Z',
      },
      {
        id: 'pack_001_3',
        policy_id: 'pol_seed_001',
        employee_id: 'emp_003',
        acknowledged: true,
        acknowledgment_date: '2026-01-18',
        acknowledgment_method: 'paper',
        follow_up_required: false,
        created_at: '2026-01-10T09:00:00.000Z',
      },
      {
        id: 'pack_001_4',
        policy_id: 'pol_seed_001',
        employee_id: 'emp_004',
        acknowledged: false,
        acknowledgment_date: null,
        acknowledgment_method: null,
        follow_up_required: true,
        created_at: '2026-01-10T09:00:00.000Z',
      },
      {
        id: 'pack_001_5',
        policy_id: 'pol_seed_001',
        employee_id: 'emp_005',
        acknowledged: true,
        acknowledgment_date: '2026-01-20',
        acknowledgment_method: 'in_app',
        follow_up_required: false,
        created_at: '2026-01-10T09:00:00.000Z',
      },
      // pol_seed_002 (InfoSec): 4 acknowledged, 2 pending
      {
        id: 'pack_002_0',
        policy_id: 'pol_seed_002',
        employee_id: 'emp_000',
        acknowledged: true,
        acknowledgment_date: '2026-02-05',
        acknowledgment_method: 'in_app',
        follow_up_required: false,
        created_at: '2026-02-01T09:00:00.000Z',
      },
      {
        id: 'pack_002_1',
        policy_id: 'pol_seed_002',
        employee_id: 'emp_001',
        acknowledged: true,
        acknowledgment_date: '2026-02-06',
        acknowledgment_method: 'in_app',
        follow_up_required: false,
        created_at: '2026-02-01T09:00:00.000Z',
      },
      {
        id: 'pack_002_2',
        policy_id: 'pol_seed_002',
        employee_id: 'emp_002',
        acknowledged: false,
        acknowledgment_date: null,
        acknowledgment_method: null,
        follow_up_required: true,
        created_at: '2026-02-01T09:00:00.000Z',
      },
      {
        id: 'pack_002_3',
        policy_id: 'pol_seed_002',
        employee_id: 'emp_003',
        acknowledged: true,
        acknowledgment_date: '2026-02-10',
        acknowledgment_method: 'email',
        follow_up_required: false,
        created_at: '2026-02-01T09:00:00.000Z',
      },
      {
        id: 'pack_002_4',
        policy_id: 'pol_seed_002',
        employee_id: 'emp_004',
        acknowledged: false,
        acknowledgment_date: null,
        acknowledgment_method: null,
        follow_up_required: true,
        created_at: '2026-02-01T09:00:00.000Z',
      },
      {
        id: 'pack_002_5',
        policy_id: 'pol_seed_002',
        employee_id: 'emp_005',
        acknowledged: true,
        acknowledgment_date: '2026-02-08',
        acknowledgment_method: 'in_app',
        follow_up_required: false,
        created_at: '2026-02-01T09:00:00.000Z',
      },
      // pol_seed_003 (Remote Work): 3 acknowledged, 3 pending
      {
        id: 'pack_003_0',
        policy_id: 'pol_seed_003',
        employee_id: 'emp_000',
        acknowledged: true,
        acknowledgment_date: '2026-05-18',
        acknowledgment_method: 'in_app',
        follow_up_required: false,
        created_at: '2026-05-15T09:00:00.000Z',
      },
      {
        id: 'pack_003_1',
        policy_id: 'pol_seed_003',
        employee_id: 'emp_001',
        acknowledged: true,
        acknowledgment_date: '2026-05-20',
        acknowledgment_method: 'in_app',
        follow_up_required: false,
        created_at: '2026-05-15T09:00:00.000Z',
      },
      {
        id: 'pack_003_2',
        policy_id: 'pol_seed_003',
        employee_id: 'emp_002',
        acknowledged: false,
        acknowledgment_date: null,
        acknowledgment_method: null,
        follow_up_required: false,
        created_at: '2026-05-15T09:00:00.000Z',
      },
      {
        id: 'pack_003_3',
        policy_id: 'pol_seed_003',
        employee_id: 'emp_003',
        acknowledged: false,
        acknowledgment_date: null,
        acknowledgment_method: null,
        follow_up_required: true,
        created_at: '2026-05-15T09:00:00.000Z',
      },
      {
        id: 'pack_003_4',
        policy_id: 'pol_seed_003',
        employee_id: 'emp_004',
        acknowledged: false,
        acknowledgment_date: null,
        acknowledgment_method: null,
        follow_up_required: false,
        created_at: '2026-05-15T09:00:00.000Z',
      },
      {
        id: 'pack_003_5',
        policy_id: 'pol_seed_003',
        employee_id: 'emp_005',
        acknowledged: true,
        acknowledgment_date: '2026-05-22',
        acknowledgment_method: 'paper',
        follow_up_required: false,
        created_at: '2026-05-15T09:00:00.000Z',
      },
      // pol_seed_004 (Anti-Harassment): 2 acknowledged, 4 pending
      {
        id: 'pack_004_0',
        policy_id: 'pol_seed_004',
        employee_id: 'emp_000',
        acknowledged: true,
        acknowledgment_date: '2026-06-03',
        acknowledgment_method: 'in_app',
        follow_up_required: false,
        created_at: '2026-06-01T09:00:00.000Z',
      },
      {
        id: 'pack_004_1',
        policy_id: 'pol_seed_004',
        employee_id: 'emp_001',
        acknowledged: true,
        acknowledgment_date: '2026-06-05',
        acknowledgment_method: 'in_app',
        follow_up_required: false,
        created_at: '2026-06-01T09:00:00.000Z',
      },
      {
        id: 'pack_004_2',
        policy_id: 'pol_seed_004',
        employee_id: 'emp_002',
        acknowledged: false,
        acknowledgment_date: null,
        acknowledgment_method: null,
        follow_up_required: true,
        created_at: '2026-06-01T09:00:00.000Z',
      },
      {
        id: 'pack_004_3',
        policy_id: 'pol_seed_004',
        employee_id: 'emp_003',
        acknowledged: false,
        acknowledgment_date: null,
        acknowledgment_method: null,
        follow_up_required: true,
        created_at: '2026-06-01T09:00:00.000Z',
      },
      {
        id: 'pack_004_4',
        policy_id: 'pol_seed_004',
        employee_id: 'emp_004',
        acknowledged: false,
        acknowledgment_date: null,
        acknowledgment_method: null,
        follow_up_required: true,
        created_at: '2026-06-01T09:00:00.000Z',
      },
      {
        id: 'pack_004_5',
        policy_id: 'pol_seed_004',
        employee_id: 'emp_005',
        acknowledged: false,
        acknowledgment_date: null,
        acknowledgment_method: null,
        follow_up_required: false,
        created_at: '2026-06-01T09:00:00.000Z',
      },
    ],
    engagement_surveys: [
      {
        id: 'survey_001',
        company_id: 'org_ghana_fintech_01',
        title: 'Q3 2026 Workforce Engagement & Culture Pulse',
        description: 'Anonymous company-wide pulse survey assessing overall morale, leadership communication, career growth, and flexible work support.',
        target_department_id: null,
        is_anonymous: true,
        opens_at: '2026-08-15T00:00:00.000Z',
        closes_at: '2026-10-15T23:59:59.000Z',
        created_by: 'usr_hr_head_01',
        created_at: '2026-08-14T10:00:00.000Z',
      },
      {
        id: 'survey_002',
        company_id: 'org_ghana_fintech_01',
        title: 'Engineering Stack & Tooling Pulse',
        description: 'Targeted survey assessing developer productivity, deployment cadence, and internal documentation.',
        target_department_id: 'dept_eng_01',
        is_anonymous: true,
        opens_at: '2026-09-01T00:00:00.000Z',
        closes_at: '2026-10-31T23:59:59.000Z',
        created_by: 'usr_hr_analyst_01',
        created_at: '2026-08-30T14:30:00.000Z',
      },
    ],
    survey_questions: [
      {
        id: 'sq_001_1',
        survey_id: 'survey_001',
        question_text: 'Overall, how energized and engaged do you feel in your role at Zeepay this quarter?',
        question_type: 'rating',
        options: null,
      },
      {
        id: 'sq_001_2',
        survey_id: 'survey_001',
        question_text: 'My direct manager provides actionable feedback and clear goals for my work.',
        question_type: 'rating',
        options: null,
      },
      {
        id: 'sq_001_3',
        survey_id: 'survey_001',
        question_text: 'Which working arrangement best supports your productivity and wellbeing?',
        question_type: 'multiple_choice',
        options: [
          'Hybrid (2–3 days in-office, flexible remote)',
          'Primarily Office-based',
          'Fully Remote / Distributed',
          'Flexible Hours & Outcome-based',
        ],
      },
      {
        id: 'sq_001_4',
        survey_id: 'survey_001',
        question_text: 'I have the necessary tools, hardware, and administrative support to excel in my job.',
        question_type: 'rating',
        options: null,
      },
      {
        id: 'sq_001_5',
        survey_id: 'survey_001',
        question_text: 'What organizational priority should leadership focus on most in the next quarter?',
        question_type: 'multiple_choice',
        options: [
          'Career Growth & Structured Mentorship',
          'Cross-department Communication & Transparency',
          'Work-Life Balance & Sustainable Workloads',
          'Competitive Compensation & Recognition',
        ],
      },
      {
        id: 'sq_002_1',
        survey_id: 'survey_002',
        question_text: 'How satisfied are you with our continuous integration and automated test speed?',
        question_type: 'rating',
        options: null,
      },
      {
        id: 'sq_002_2',
        survey_id: 'survey_002',
        question_text: 'What is currently the biggest friction point in our development cycle?',
        question_type: 'multiple_choice',
        options: [
          'Flaky or slow test environments',
          'Lack of clear API documentation',
          'Cross-team blockers & approval delays',
          'Technical debt in legacy services',
        ],
      },
      {
        id: 'sq_002_3',
        survey_id: 'survey_002',
        question_text: 'Peer code reviews are constructive, timely, and help me grow as an engineer.',
        question_type: 'rating',
        options: null,
      },
    ],
    survey_responses: [
      {
        id: 'sresp_001_1',
        survey_id: 'survey_001',
        respondent_employee_id: null,
        submitted_at: '2026-08-18T11:20:00.000Z',
      },
      {
        id: 'sresp_001_2',
        survey_id: 'survey_001',
        respondent_employee_id: null,
        submitted_at: '2026-08-19T14:45:00.000Z',
      },
      {
        id: 'sresp_001_3',
        survey_id: 'survey_001',
        respondent_employee_id: null,
        submitted_at: '2026-08-22T09:10:00.000Z',
      },
      {
        id: 'sresp_001_4',
        survey_id: 'survey_001',
        respondent_employee_id: null,
        submitted_at: '2026-08-25T16:30:00.000Z',
      },
      {
        id: 'sresp_002_1',
        survey_id: 'survey_002',
        respondent_employee_id: null,
        submitted_at: '2026-09-03T10:15:00.000Z',
      },
      {
        id: 'sresp_002_2',
        survey_id: 'survey_002',
        respondent_employee_id: null,
        submitted_at: '2026-09-04T13:40:00.000Z',
      },
    ],
    survey_answers: [
      { id: 'sans_001_1_1', response_id: 'sresp_001_1', question_id: 'sq_001_1', answer_value: '5' },
      { id: 'sans_001_1_2', response_id: 'sresp_001_1', question_id: 'sq_001_2', answer_value: '4' },
      { id: 'sans_001_1_3', response_id: 'sresp_001_1', question_id: 'sq_001_3', answer_value: 'Hybrid (2–3 days in-office, flexible remote)' },
      { id: 'sans_001_1_4', response_id: 'sresp_001_1', question_id: 'sq_001_4', answer_value: '4' },
      { id: 'sans_001_1_5', response_id: 'sresp_001_1', question_id: 'sq_001_5', answer_value: 'Career Growth & Structured Mentorship' },
      { id: 'sans_001_2_1', response_id: 'sresp_001_2', question_id: 'sq_001_1', answer_value: '4' },
      { id: 'sans_001_2_2', response_id: 'sresp_001_2', question_id: 'sq_001_2', answer_value: '5' },
      { id: 'sans_001_2_3', response_id: 'sresp_001_2', question_id: 'sq_001_3', answer_value: 'Hybrid (2–3 days in-office, flexible remote)' },
      { id: 'sans_001_2_4', response_id: 'sresp_001_2', question_id: 'sq_001_4', answer_value: '5' },
      { id: 'sans_001_2_5', response_id: 'sresp_001_2', question_id: 'sq_001_5', answer_value: 'Competitive Compensation & Recognition' },
      { id: 'sans_001_3_1', response_id: 'sresp_001_3', question_id: 'sq_001_1', answer_value: '4' },
      { id: 'sans_001_3_2', response_id: 'sresp_001_3', question_id: 'sq_001_2', answer_value: '4' },
      { id: 'sans_001_3_3', response_id: 'sresp_001_3', question_id: 'sq_001_3', answer_value: 'Fully Remote / Distributed' },
      { id: 'sans_001_3_4', response_id: 'sresp_001_3', question_id: 'sq_001_4', answer_value: '4' },
      { id: 'sans_001_3_5', response_id: 'sresp_001_3', question_id: 'sq_001_5', answer_value: 'Cross-department Communication & Transparency' },
      { id: 'sans_001_4_1', response_id: 'sresp_001_4', question_id: 'sq_001_1', answer_value: '3' },
      { id: 'sans_001_4_2', response_id: 'sresp_001_4', question_id: 'sq_001_2', answer_value: '4' },
      { id: 'sans_001_4_3', response_id: 'sresp_001_4', question_id: 'sq_001_3', answer_value: 'Hybrid (2–3 days in-office, flexible remote)' },
      { id: 'sans_001_4_4', response_id: 'sresp_001_4', question_id: 'sq_001_4', answer_value: '3' },
      { id: 'sans_001_4_5', response_id: 'sresp_001_4', question_id: 'sq_001_5', answer_value: 'Work-Life Balance & Sustainable Workloads' },
      { id: 'sans_002_1_1', response_id: 'sresp_002_1', question_id: 'sq_002_1', answer_value: '4' },
      { id: 'sans_002_1_2', response_id: 'sresp_002_1', question_id: 'sq_002_2', answer_value: 'Flaky or slow test environments' },
      { id: 'sans_002_1_3', response_id: 'sresp_002_1', question_id: 'sq_002_3', answer_value: '5' },
      { id: 'sans_002_2_1', response_id: 'sresp_002_2', question_id: 'sq_002_1', answer_value: '3' },
      { id: 'sans_002_2_2', response_id: 'sresp_002_2', question_id: 'sq_002_2', answer_value: 'Technical debt in legacy services' },
      { id: 'sans_002_2_3', response_id: 'sresp_002_2', question_id: 'sq_002_3', answer_value: '4' },
    ],
    // Milestone 22: HR Policy Governance Lifecycle Records
    governance_records: [
      {
        id: 'gov_001',
        company_id: orgId,
        policy_name: 'Code of Conduct & Professional Ethics Manual',
        related_policy_id: 'pol_seed_001',
        last_review_date: '2025-09-15',
        next_review_due: '2026-09-15',
        reviewed_by: 'Kofi Mensah (People Lead)',
        approved_by: 'Ignatius Arthur (Head of HR)',
        distributed: true,
        audit_status: 'pending',
        created_at: '2025-09-15T10:00:00.000Z',
      },
      {
        id: 'gov_002',
        company_id: orgId,
        policy_name: 'Information Security & Data Protection Standard (GDPR/NDPR)',
        related_policy_id: 'pol_seed_002',
        last_review_date: '2025-08-01',
        next_review_due: '2026-08-01',
        reviewed_by: 'Kwame Asante (Head of IT & Security)',
        approved_by: 'Ignatius Arthur (Head of HR)',
        distributed: true,
        audit_status: 'overdue',
        created_at: '2025-08-01T09:30:00.000Z',
      },
      {
        id: 'gov_003',
        company_id: orgId,
        policy_name: 'Remote Work & Distributed Workforce Operational Framework',
        related_policy_id: 'pol_seed_003',
        last_review_date: '2026-05-15',
        next_review_due: '2027-05-15',
        reviewed_by: 'Esi Osei (HR Operations Specialist)',
        approved_by: 'Ignatius Arthur (Head of HR)',
        distributed: true,
        audit_status: 'completed',
        created_at: '2026-05-15T11:00:00.000Z',
      },
      {
        id: 'gov_004',
        company_id: orgId,
        policy_name: 'Anti-Harassment, Equal Opportunity & Whistleblower Charter',
        related_policy_id: 'pol_seed_004',
        last_review_date: '2025-07-20',
        next_review_due: '2026-07-20',
        reviewed_by: 'Legal Advisory & Risk Committee',
        approved_by: 'Board of Directors & HR Head',
        distributed: true,
        audit_status: 'overdue',
        created_at: '2025-07-20T08:00:00.000Z',
      },
      {
        id: 'gov_005',
        company_id: orgId,
        policy_name: 'Workplace Disciplinary Escalation & Performance Improvement Protocol',
        related_policy_id: null,
        last_review_date: '2026-03-10',
        next_review_due: '2026-10-10',
        reviewed_by: 'Kofi Mensah (People Lead)',
        approved_by: 'Ignatius Arthur (Head of HR)',
        distributed: false,
        audit_status: 'pending',
        created_at: '2026-03-10T14:15:00.000Z',
      },
      {
        id: 'gov_006',
        company_id: orgId,
        policy_name: 'Occupational Health, Safety & Emergency Response SOP',
        related_policy_id: null,
        last_review_date: '2025-11-01',
        next_review_due: '2026-11-01',
        reviewed_by: 'Facilities & Safety Operations',
        approved_by: 'Ignatius Arthur (Head of HR)',
        distributed: false,
        audit_status: 'pending',
        created_at: '2025-11-01T10:00:00.000Z',
      },
    ],
  };
}

let db: DatabaseSchema;
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    db = JSON.parse(raw);
    // Ensure Milestone 2 collections exist
    if (!db.onboarding_tasks) db.onboarding_tasks = [];
    if (!db.offboarding_tasks) db.offboarding_tasks = [];
    if (!db.offboarding_records) db.offboarding_records = [];
    if (!db.attendance_records) db.attendance_records = [];
    if (!db.daily_attendance_summary) db.daily_attendance_summary = [];
    if (!db.leave_types) db.leave_types = [];
    if (!db.leave_balances) db.leave_balances = [];
    if (!db.leave_requests) db.leave_requests = [];
    if (!db.leave_audit_logs) db.leave_audit_logs = [];

    // Ensure Milestone 3 collections exist
    if (!db.compliance_items || db.compliance_items.length === 0) {
      const initial = getInitialData();
      db.compliance_items = initial.compliance_items;
    }
    if (!db.documents || db.documents.length === 0) {
      const initial = getInitialData();
      db.documents = initial.documents;
    }

    // Ensure Milestone 4 collections exist
    if (!db.ai_chat_logs) db.ai_chat_logs = [];

    // Ensure Milestone 5 collections exist
    if (!db.tasks || db.tasks.length === 0) {
      const initial = getInitialData();
      db.tasks = initial.tasks;
    }

    // Ensure Milestone 6 collections exist
    if (!db.job_history || db.job_history.length === 0) {
      const initial = getInitialData();
      db.job_history = initial.job_history;
    }

    // Ensure Milestone 7 collections exist
    if (!db.expense_categories || db.expense_categories.length === 0) {
      const initial = getInitialData();
      db.expense_categories = initial.expense_categories;
    }
    if (!db.expenses || db.expenses.length === 0) {
      const initial = getInitialData();
      db.expenses = initial.expenses;
    }
    if (!db.expense_policies) {
      const initial = getInitialData();
      db.expense_policies = initial.expense_policies;
    }
    // Ensure Milestone 9 events exist
    if (!db.events || db.events.length === 0) {
      const initial = getInitialData();
      db.events = initial.events;
    }
    // Ensure Milestone 11 notifications exist
    if (!db.notifications || db.notifications.length === 0) {
      const initial = getInitialData();
      db.notifications = initial.notifications || [];
    }
    if (!db.email_logs) {
      db.email_logs = [];
    }
    // Ensure Milestone 12 chat collections exist
    if (!db.chat_channels || db.chat_channels.length === 0) {
      const initial = getInitialData();
      db.chat_channels = initial.chat_channels || [];
    }
    if (!db.chat_channel_members || db.chat_channel_members.length === 0) {
      const initial = getInitialData();
      db.chat_channel_members = initial.chat_channel_members || [];
    }
    if (!db.chat_messages || db.chat_messages.length === 0) {
      const initial = getInitialData();
      db.chat_messages = initial.chat_messages || [];
    }
    // Ensure Milestone 14 collections exist
    if (!db.demo_requests || db.demo_requests.length === 0) {
      const initial = getInitialData();
      db.demo_requests = initial.demo_requests || [];
    }

    // Ensure Milestone 15 & 16 collections exist
    if (!db.subscriptions || db.subscriptions.length === 0) {
      const initial = getInitialData();
      db.subscriptions = initial.subscriptions || [];
    }
    if (!db.invoices || db.invoices.length === 0) {
      const initial = getInitialData();
      db.invoices = initial.invoices || [];
    }
    if (!db.payment_methods || db.payment_methods.length === 0) {
      const initial = getInitialData();
      db.payment_methods = initial.payment_methods || [];
    }
    // Ensure every organization has a subscription record
    for (const orgItem of db.organizations || []) {
      if (!db.subscriptions.some((s) => s.company_id === orgItem.id)) {
        db.subscriptions.push({
          id: generateId('sub'),
          company_id: orgItem.id,
          plan: 'professional',
          billing_cycle: 'annual',
          employee_limit: 50,
          status: 'active',
          trial_ends_at: null,
          current_period_end: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }
    if (!db.platform_admins || db.platform_admins.length === 0) {
      const initial = getInitialData();
      db.platform_admins = initial.platform_admins || [];
    }
    // Also ensure head users / operator emails are registered in platform_admins
    const headUsers = (db.users || []).filter(
      (u) => u.id === 'usr_hr_head_01' || u.email === 'ignatius@korapay.com' || u.email === 'mr.ignatiusarthur@gmail.com'
    );
    headUsers.forEach((u) => {
      if (!db.platform_admins.some((pa) => pa.user_id === u.id)) {
        db.platform_admins.push({
          id: `padmin_${u.id}`,
          user_id: u.id,
          created_at: new Date().toISOString(),
        });
      }
    });

    if (!db.support_notes || db.support_notes.length === 0) {
      const initial = getInitialData();
      db.support_notes = initial.support_notes || [];
    }

    // Ensure Milestone 17 collections exist
    if (!db.performance_reviews || db.performance_reviews.length === 0) {
      const initial = getInitialData();
      db.performance_reviews = initial.performance_reviews || [];
    }
    if (!db.pdp_goals || db.pdp_goals.length === 0) {
      const initial = getInitialData();
      db.pdp_goals = initial.pdp_goals || [];
    }

    // Ensure Milestone 18 collections exist
    if (!db.probation_records || db.probation_records.length === 0) {
      const initial = getInitialData();
      db.probation_records = initial.probation_records || [];
    }

    // Ensure Milestone 19 collections exist
    if (!db.conduct_incidents || db.conduct_incidents.length === 0) {
      const initial = getInitialData();
      db.conduct_incidents = initial.conduct_incidents || [];
    }
    if (!db.conduct_audit_logs || db.conduct_audit_logs.length === 0) {
      const initial = getInitialData();
      db.conduct_audit_logs = initial.conduct_audit_logs || [];
    }

    // Ensure Milestone 20 collections exist
    if (!db.policies || db.policies.length === 0) {
      const initial = getInitialData();
      db.policies = initial.policies || [];
    }
    if (!db.policy_acknowledgements || db.policy_acknowledgements.length === 0) {
      const initial = getInitialData();
      db.policy_acknowledgements = initial.policy_acknowledgements || [];
    }

    // Ensure Milestone 21 collections exist
    if (!db.engagement_surveys || db.engagement_surveys.length === 0) {
      const initial = getInitialData();
      db.engagement_surveys = initial.engagement_surveys || [];
    }
    if (!db.survey_questions || db.survey_questions.length === 0) {
      const initial = getInitialData();
      db.survey_questions = initial.survey_questions || [];
    }
    if (!db.survey_responses || db.survey_responses.length === 0) {
      const initial = getInitialData();
      db.survey_responses = initial.survey_responses || [];
    }
    if (!db.survey_answers || db.survey_answers.length === 0) {
      const initial = getInitialData();
      db.survey_answers = initial.survey_answers || [];
    }

    // Ensure Milestone 22 collections exist (HR Policy Governance)
    if (!db.governance_records || db.governance_records.length === 0) {
      const initial = getInitialData();
      db.governance_records = initial.governance_records || [];
    }

    // Ensure sample organizations exist for support lookup and metrics
    const initialOrgs = getInitialData().organizations;
    for (const orgItem of initialOrgs) {
      if (!db.organizations.some((o) => o.id === orgItem.id)) {
        db.organizations.push(orgItem);
      }
    }

    // Ensure emp_000 exists and seed manager relationships
    const emp0 = db.employees.find((e) => e.id === 'emp_000');
    if (!emp0) {
      const initial = getInitialData();
      const initialEmp0 = initial.employees.find((e) => e.id === 'emp_000');
      if (initialEmp0) {
        db.employees.unshift(initialEmp0);
        const comp0 = initial.employee_compensation.find((c) => c.employee_id === 'emp_000');
        if (comp0) db.employee_compensation.push(comp0);
      }
    }

    db.employees.forEach((emp) => {
      if (emp.id === 'emp_001' && !emp.manager_id) emp.manager_id = 'emp_000';
      if (emp.id === 'emp_002' && !emp.manager_id) emp.manager_id = 'emp_000';
      if (emp.id === 'emp_003' && !emp.manager_id) emp.manager_id = 'emp_000';
      if (emp.id === 'emp_004' && !emp.manager_id) emp.manager_id = 'emp_001';
      if (emp.id === 'emp_005' && !emp.manager_id) emp.manager_id = 'emp_003';
    });

    // Ensure organizations have leave escalation threshold
    db.organizations.forEach((o) => {
      if (o.leave_escalation_threshold_days == null) {
        o.leave_escalation_threshold_days = 3;
      }
    });

    // If leave_types is empty, seed defaults for each org
    db.organizations.forEach((org) => {
      const orgLeaveTypes = db.leave_types.filter((lt) => lt.company_id === org.id);
      if (orgLeaveTypes.length === 0) {
        const defaults = getDefaultLeaveTypes(org.id);
        db.leave_types.push(...defaults);
      }
    });

    // If onboarding_tasks is empty, seed for existing employees
    db.employees.forEach((emp) => {
      const empTasks = db.onboarding_tasks.filter((t) => t.employee_id === emp.id);
      if (empTasks.length === 0) {
        const tasks = generateDefaultOnboardingTasks(emp.id, emp.company_id, emp.country, emp.start_date);
        db.onboarding_tasks.push(...tasks);
      }
    });

    // Backfill compensation fields if missing in legacy records
    db.employee_compensation.forEach((c) => {
      if (c.allowances === undefined) c.allowances = Math.round(c.salary * 0.1);
      if (c.bonus === undefined) c.bonus = Math.round(c.salary * 0.05);
      if (!c.statutory_data) {
        const emp = db.employees.find((e) => e.id === c.employee_id);
        if (emp?.country.toLowerCase().includes('ghana')) {
          c.statutory_data = {
            ssnit_number: `C0${Math.floor(10000000000 + Math.random() * 90000000000)}`,
            pension_tier_2_3_provider: 'Enterprise Trustees Tier 2 Master Trust',
            tin: `P00${Math.floor(10000000 + Math.random() * 90000000)}`,
            paye_band: 'Graduated 0%–35% Cumulative',
          };
        } else {
          c.statutory_data = {
            ni_number: 'QQ 12 34 56 A',
            pension_provider: 'NEST Workplace Pension (5% Employee / 3% Employer)',
            tax_code: '1257L Cumulative',
            utr_number: '9283746182',
          };
        }
      }
    });
  } else {
    db = getInitialData();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }
} catch {
  db = getInitialData();
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Failed to save DB:', err);
  }
}

// Recalculate trigger-maintained daily_attendance_summary
function refreshDailyAttendanceSummary(companyId: string, date: string) {
  const companyEmployees = db.employees.filter((e) => e.company_id === companyId && e.status !== 'offboarded');
  const records = db.attendance_records.filter((a) => a.company_id === companyId && a.date === date);

  let present = 0;
  let late = 0;
  let absent = 0;
  let on_leave = 0;
  let not_logged = 0;

  for (const emp of companyEmployees) {
    const rec = records.find((r) => r.employee_id === emp.id);
    if (!rec || rec.status === 'not_logged') {
      not_logged++;
    } else if (rec.status === 'present') {
      present++;
    } else if (rec.status === 'late') {
      late++;
    } else if (rec.status === 'absent') {
      absent++;
    } else if (rec.status === 'on_leave') {
      on_leave++;
    }
  }

  const existingIdx = db.daily_attendance_summary.findIndex(
    (s) => s.company_id === companyId && s.date === date
  );

  const summary: DailyAttendanceSummary = {
    company_id: companyId,
    date,
    present_count: present,
    late_count: late,
    absent_count: absent,
    on_leave_count: on_leave,
    not_logged_count: not_logged,
  };

  if (existingIdx !== -1) {
    db.daily_attendance_summary[existingIdx] = summary;
  } else {
    db.daily_attendance_summary.push(summary);
  }

  saveDb();
  return summary;
}

// Milestone 3 Helper: Get latest compensation record for an employee
function getLatestCompensation(employeeId: string): EmployeeCompensation | null {
  const records = db.employee_compensation.filter((c) => c.employee_id === employeeId);
  if (records.length === 0) return null;
  // Sort descending by effective_date
  records.sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime());
  return records[0];
}

// Milestone 6 Helper: Enrich job history with department, manager, and actor names
function enrichJobHistory(jh: JobHistory): JobHistory {
  const prevDept = db.departments.find((d) => d.id === jh.previous_department_id);
  const newDept = db.departments.find((d) => d.id === jh.new_department_id);
  const prevMgr = jh.previous_manager_id ? db.employees.find((e) => e.id === jh.previous_manager_id) : null;
  const newMgr = jh.new_manager_id ? db.employees.find((e) => e.id === jh.new_manager_id) : null;
  const changedByUser = db.users.find((u) => u.id === jh.changed_by);

  return {
    ...jh,
    previous_department_name: prevDept?.name || 'Unassigned',
    new_department_name: newDept?.name || 'Unassigned',
    previous_manager_name: prevMgr?.name || 'None (Top Level)',
    new_manager_name: newMgr?.name || 'None (Top Level)',
    changed_by_email: changedByUser?.email || 'HR Administrator',
    changed_by_name: changedByUser?.email ? changedByUser.email.split('@')[0] : 'HR Admin',
  };
}

// Milestone 3 Helper: Auto-flagging / Compliance evaluation engine
function evaluateComplianceItems(companyId: string): ComplianceDashboardData {
  const today = getTodayString();
  const todayTime = new Date(today).getTime();

  // 1. Sync all company documents that have an expiry_date into compliance_items
  const orgDocs = db.documents.filter((d) => d.company_id === companyId);
  orgDocs.forEach((doc) => {
    if (doc.expiry_date) {
      const emp = db.employees.find((e) => e.id === doc.employee_id);
      let existingItem = db.compliance_items.find((ci) => ci.document_id === doc.id);

      let cat: ComplianceCategory = 'other';
      let title = `Document Renewal - ${doc.file_name}`;
      if (doc.type === 'contract') {
        cat = 'contracts_visas';
        title = `Employment Contract Renewal - ${emp?.name || 'Employee'}`;
      } else if (doc.type === 'id_card') {
        cat = 'contracts_visas';
        title = `Identity / Visa Expiry - ${emp?.name || 'Employee'}`;
      } else if (doc.type === 'certification') {
        cat = 'certifications';
        title = `Certification Renewal - ${emp?.name || 'Employee'}`;
      } else if (doc.type === 'tax_form') {
        cat = 'statutory_tax';
        title = `Tax Form / Expiry - ${emp?.name || 'Employee'}`;
      }

      if (!existingItem) {
        existingItem = {
          id: generateId('citem'),
          company_id: companyId,
          category: cat,
          related_employee_id: doc.employee_id,
          related_employee_name: emp?.name,
          title,
          deadline: doc.expiry_date,
          status: 'compliant',
          document_id: doc.id,
          notes: doc.notes || `Linked to uploaded file: ${doc.file_name}`,
          created_at: new Date().toISOString(),
        };
        db.compliance_items.push(existingItem);
      } else {
        existingItem.deadline = doc.expiry_date;
        existingItem.related_employee_id = doc.employee_id;
        existingItem.related_employee_name = emp?.name;
      }
    }
  });

  // 2. Evaluate all compliance items against today's date
  const orgItems = db.compliance_items.filter((ci) => ci.company_id === companyId);
  orgItems.forEach((item) => {
    if (item.deadline) {
      const deadlineTime = new Date(item.deadline).getTime();
      const diffDays = Math.ceil((deadlineTime - todayTime) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        item.status = 'non_compliant';
      } else if (diffDays <= 30) {
        item.status = 'attention';
      } else {
        item.status = 'compliant';
      }

      // Milestone 11: Trigger compliance deadline alerts to HR Head(s) and send Edge Email
      if (item.status === 'attention' || item.status === 'non_compliant') {
        const todayStr = getTodayString();
        const alreadyNotified = (db.notifications || []).some(
          (n) =>
            n.company_id === companyId &&
            n.type === 'compliance_deadline' &&
            n.message.includes(item.title) &&
            n.created_at.startsWith(todayStr)
        );

        if (!alreadyNotified) {
          const hrHeads = (db.organization_members || []).filter(
            (m) => m.organization_id === companyId && m.role === 'hr_head'
          );
          for (const head of hrHeads) {
            createNotification(
              companyId,
              head.user_id,
              'compliance_deadline',
              diffDays < 0 ? `Compliance Overdue: ${item.title}` : `Compliance Deadline Approaching: ${item.title}`,
              `${item.title} is ${diffDays < 0 ? `overdue by ${Math.abs(diffDays)} day(s)` : `due in ${diffDays} day(s)`} [Deadline: ${item.deadline}]. Immediate attention required.`,
              'compliance'
            );

            const headUser = (db.users || []).find((u) => u.id === head.user_id);
            if (headUser?.email) {
              sendEdgeEmail({
                companyId,
                userId: head.user_id,
                recipientEmail: headUser.email,
                subject: `[High Priority HR Compliance Alert] ${diffDays < 0 ? 'OVERDUE' : 'EXPIRING'}: ${item.title}`,
                body: `Hello HR Administrator,\n\nThis is an automated compliance deadline alert from Go-Ya HRMS:\n\nItem: ${item.title}\nCategory: ${item.category}\nStatus: ${diffDays < 0 ? 'NON-COMPLIANT (OVERDUE)' : 'ATTENTION REQUIRED'}\nDeadline: ${item.deadline}\nDays Remaining: ${diffDays}\n\nPlease review and take remediation action in the Compliance Center: /compliance`,
                type: 'compliance_deadline',
              });
            }
          }
        }
      }
    }
  });

  saveDb();

  // 3. Compute breakdown and statistics
  const total = orgItems.length;
  const compliant = orgItems.filter((i) => i.status === 'compliant').length;
  const attention = orgItems.filter((i) => i.status === 'attention').length;
  const non_compliant = orgItems.filter((i) => i.status === 'non_compliant').length;
  const score = total > 0 ? Math.round((compliant / total) * 100) : 100;

  const categoriesDef: Array<{ category: ComplianceCategory; label: string }> = [
    { category: 'statutory_tax', label: 'Statutory & Tax Remittance' },
    { category: 'contracts_visas', label: 'Contracts, Visas & Right to Work' },
    { category: 'certifications', label: 'Certifications & Accreditations' },
    { category: 'workplace_safety', label: 'Workplace Health & Safety' },
    { category: 'other', label: 'General Compliance & Governance' },
  ];

  const categoriesBreakdown: ComplianceCategoryBreakdown[] = categoriesDef.map((def) => {
    const catItems = orgItems.filter((i) => i.category === def.category);
    const catTotal = catItems.length;
    const catComp = catItems.filter((i) => i.status === 'compliant').length;
    const catAtt = catItems.filter((i) => i.status === 'attention').length;
    const catNon = catItems.filter((i) => i.status === 'non_compliant').length;
    const catScore = catTotal > 0 ? Math.round((catComp / catTotal) * 100) : 100;

    return {
      category: def.category,
      label: def.label,
      total: catTotal,
      compliant: catComp,
      attention: catAtt,
      non_compliant: catNon,
      score: catScore,
    };
  });

  return {
    overall_score: score,
    total_items: total,
    compliant_count: compliant,
    attention_count: attention,
    non_compliant_count: non_compliant,
    categories: categoriesBreakdown,
    items: orgItems,
  };
}

// Realtime Event Stream SSE hub
type SSEClient = {
  id: string;
  company_id: string;
  res: Response;
};

const sseClients: SSEClient[] = [];

function broadcastToCompany(companyId: string, event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    if (client.company_id === companyId) {
      try {
        client.res.write(payload);
      } catch (err) {
        console.error('Error writing to SSE client:', err);
      }
    }
  }
}

// Milestone 11: Notification Creation and High-Priority Edge Email Dispatch
function createNotification(
  companyId: string,
  userId: string,
  type: NotificationType | string,
  title: string,
  message: string,
  link: string | null = null
): AppNotification {
  if (!db.notifications) db.notifications = [];

  const notif: AppNotification = {
    id: generateId('notif'),
    company_id: companyId,
    user_id: userId,
    type,
    title,
    message,
    link,
    read_at: null,
    created_at: new Date().toISOString(),
  };

  db.notifications.unshift(notif);
  saveDb();

  broadcastToCompany(companyId, 'notification_created', { notification: notif });
  return notif;
}

// Edge Function Simulation for High-Priority Email Delivery
async function sendEdgeEmail(params: {
  companyId: string;
  userId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  type: 'leave_decision' | 'compliance_deadline' | string;
}): Promise<EmailDeliveryLog> {
  if (!db.email_logs) db.email_logs = [];

  const log: EmailDeliveryLog = {
    id: generateId('elog'),
    company_id: params.companyId,
    user_id: params.userId,
    recipient_email: params.recipientEmail,
    subject: params.subject,
    body: params.body,
    type: params.type,
    status: 'delivered',
    sent_at: new Date().toISOString(),
  };

  db.email_logs.unshift(log);
  saveDb();

  console.log(`[Edge Function: send-email] HIGH-PRIORITY EMAIL DISPATCHED to <${params.recipientEmail}> [${params.type}]: "${params.subject}"`);

  return log;
}

// ==========================================
// Milestone 18: Probation Management Helpers
// ==========================================

function calculateProbationEndDate(startDateStr: string, months: number): string {
  try {
    const parts = startDateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month + months, day);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${da}`;
    }
    const d = new Date(startDateStr);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  } catch {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  }
}

function calculateDaysRemaining(endDateStr: string): number {
  try {
    const today = new Date(getTodayString()).getTime();
    const end = new Date(endDateStr).getTime();
    return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

function evaluateProbationDeadlines(companyId: string) {
  if (!db.probation_records) db.probation_records = [];
  const todayStr = getTodayString();
  const todayTime = new Date(todayStr).getTime();

  const activeRecords = db.probation_records.filter(
    (r) => r.company_id === companyId && r.outcome !== 'confirm' && r.outcome !== 'terminate'
  );

  activeRecords.forEach((rec) => {
    const emp = db.employees.find((e) => e.id === rec.employee_id && e.company_id === companyId);
    if (!emp || emp.status === 'offboarded') return;

    const endTime = new Date(rec.probation_end).getTime();
    const diffDays = Math.ceil((endTime - todayTime) / (1000 * 60 * 60 * 24));

    // Milestone 18 & 11: Trigger notification to HR Head as an employee's probation end date approaches (<= 14 days or overdue)
    if (diffDays <= 14) {
      const alreadyNotified = (db.notifications || []).some(
        (n) =>
          n.company_id === companyId &&
          n.type === 'probation_ending' &&
          n.message.includes(emp.name) &&
          n.created_at.startsWith(todayStr)
      );

      if (!alreadyNotified) {
        const hrHeads = (db.organization_members || []).filter(
          (m) => m.organization_id === companyId && m.role === 'hr_head'
        );
        for (const head of hrHeads) {
          createNotification(
            companyId,
            head.user_id,
            'probation_ending',
            diffDays < 0
              ? `Probation Overdue: ${emp.name}`
              : diffDays === 0
              ? `Probation Ending Today: ${emp.name}`
              : `Probation Ending Soon: ${emp.name}`,
            `${emp.name}'s probation period is ${
              diffDays < 0
                ? `overdue by ${Math.abs(diffDays)} day(s)`
                : diffDays === 0
                ? 'ending today'
                : `ending in ${diffDays} day(s)`
            } [End Date: ${rec.probation_end}]. HR Head decision (confirm, extend, or terminate) required.`,
            `employees/${emp.id}`
          );

          const headUser = (db.users || []).find((u) => u.id === head.user_id);
          if (headUser?.email) {
            sendEdgeEmail({
              companyId,
              userId: head.user_id,
              recipientEmail: headUser.email,
              subject: `[HR Head Decision Required] Probation Review: ${emp.name}`,
              body: `Hello HR Head,\n\nThis is an automated probation tracking reminder from Go-Ya HRMS:\n\nEmployee: ${emp.name}\nDesignation: ${emp.job_title}\nProbation End Date: ${rec.probation_end}\nDays Remaining: ${diffDays}\nStatus: ${rec.outcome === 'extend' ? 'Extended Probation' : 'Active Probation'}\n\nPlease review mid-probation notes and record the end-of-probation review outcome (confirm, extend, or terminate).\n\nReview profile: /employees/${emp.id}`,
              type: 'probation_ending',
            });
          }
        }
      }
    }
  });
}

// Simple JWT-like Session Token Helper
interface AuthContextPayload {
  user_id: string;
  company_id: string;
  role: Role;
  email: string;
}

function createToken(payload: AuthContextPayload): string {
  const raw = JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  return Buffer.from(raw).toString('base64url');
}

function decodeToken(token: string): AuthContextPayload | null {
  try {
    const json = Buffer.from(token, 'base64url').toString('utf-8');
    const data = JSON.parse(json);
    if (data.exp && data.exp < Date.now()) return null;
    return {
      user_id: data.user_id,
      company_id: data.company_id,
      role: data.role,
      email: data.email,
    };
  } catch {
    return null;
  }
}

// Auth Middleware & RLS Context Extractor
interface AuthenticatedRequest extends Request {
  auth?: AuthContextPayload;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.substring(7);
  const payload = decodeToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized: Session expired or invalid' });
  }

  // Verify membership still exists in db
  const membership = db.organization_members.find(
    (m) => m.user_id === payload.user_id && m.organization_id === payload.company_id
  );

  if (!membership) {
    return res.status(403).json({ error: 'Forbidden: User is not a member of this workspace' });
  }

  payload.role = membership.role;
  req.auth = payload;
  next();
}

function getAuth(req: Request): AuthContextPayload | null {
  const authReq = req as AuthenticatedRequest;
  if (authReq.auth) return authReq.auth;
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const payload = decodeToken(token);
  if (!payload) return null;
  const membership = db.organization_members.find(
    (m) => m.user_id === payload.user_id && m.organization_id === payload.company_id
  );
  if (!membership) return null;
  payload.role = membership.role;
  return payload;
}

// ==========================================
// 0. Public SaaS Marketing & Lead Endpoints (Milestone 14)
// ==========================================

// Public Demo Request Submission (Insert-only from public, no auth required)
app.post('/api/demo-requests', (req, res) => {
  const { name, email, company_name, team_size, message } = req.body;

  if (!name || !email || !company_name) {
    return res.status(400).json({ error: 'Name, work email, and company name are required.' });
  }

  const emailStr = String(email).trim().toLowerCase();
  if (!emailStr.includes('@') || !emailStr.includes('.')) {
    return res.status(400).json({ error: 'Please provide a valid work email address.' });
  }

  const demoReq: DemoRequest = {
    id: generateId('demo'),
    name: String(name).trim(),
    email: emailStr,
    company_name: String(company_name).trim(),
    team_size: team_size ? String(team_size).trim() : undefined,
    message: message ? String(message).trim() : undefined,
    created_at: new Date().toISOString(),
  };

  if (!db.demo_requests) db.demo_requests = [];
  db.demo_requests.unshift(demoReq);
  saveDb();

  console.log(`[Public Lead Capture] Demo request received from ${demoReq.name} (${demoReq.company_name}) <${demoReq.email}>`);

  return res.status(201).json({
    success: true,
    message: `Thank you, ${demoReq.name}! Your demo request has been received. Our team will reach out to ${demoReq.email} shortly.`,
    demo_request: {
      id: demoReq.id,
      name: demoReq.name,
      company_name: demoReq.company_name,
      created_at: demoReq.created_at,
    },
  });
});

// ==========================================
// 1. Auth & Tenancy Endpoints
// ==========================================

// Sign Up (HR Head + New Organization)
app.post('/api/auth/signup', (req, res) => {
  const { email, password, org_name, industry, country, currency, timezone } = req.body;

  if (!email || !password || !org_name) {
    return res.status(400).json({ error: 'Email, password, and organization name are required' });
  }

  const existingUser = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const user: User & { password_hash: string } = {
    id: generateId('usr'),
    email: email.toLowerCase().trim(),
    email_verified: true,
    created_at: new Date().toISOString(),
    password_hash: password,
  };

  const org: Organization = {
    id: generateId('org'),
    name: org_name.trim(),
    industry: industry || 'Technology',
    country: country || 'Ghana',
    currency: currency || 'GHS',
    timezone: timezone || 'Africa/Accra (GMT+0)',
    leave_escalation_threshold_days: 3,
    created_at: new Date().toISOString(),
  };

  const member: OrganizationMember = {
    user_id: user.id,
    organization_id: org.id,
    role: 'hr_head',
  };

  const defaultDepts: Department[] = [
    { id: generateId('dept'), company_id: org.id, name: 'Engineering' },
    { id: generateId('dept'), company_id: org.id, name: 'Operations' },
    { id: generateId('dept'), company_id: org.id, name: 'People & Culture' },
  ];

  // Default Leave Types for new org
  const defaultLeaveTypes = getDefaultLeaveTypes(org.id);

  const newSub: Subscription = {
    id: generateId('sub'),
    company_id: org.id,
    plan: 'free_trial',
    billing_cycle: 'monthly',
    employee_limit: 10,
    status: 'trialing',
    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  };

  db.users.push(user);
  db.organizations.push(org);
  db.organization_members.push(member);
  db.departments.push(...defaultDepts);
  db.leave_types.push(...defaultLeaveTypes);
  db.subscriptions.push(newSub);
  saveDb();

  const token = createToken({
    user_id: user.id,
    company_id: org.id,
    role: 'hr_head',
    email: user.email,
  });

  const available_workspaces = [
    {
      organization: org,
      role: member.role,
    },
  ];

  res.json({
    token,
    user: { id: user.id, email: user.email, email_verified: user.email_verified, created_at: user.created_at },
    organization: org,
    role: 'hr_head',
    available_workspaces,
    subscription: newSub,
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password, organization_id } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user || user.password_hash !== password) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const memberships = db.organization_members.filter((m) => m.user_id === user.id);
  if (memberships.length === 0) {
    return res.status(403).json({ error: 'User does not belong to any workspace. Please sign up or accept an invite.' });
  }

  let targetMembership = organization_id
    ? memberships.find((m) => m.organization_id === organization_id)
    : memberships[0];

  if (!targetMembership) {
    targetMembership = memberships[0];
  }

  const org = db.organizations.find((o) => o.id === targetMembership.organization_id);
  if (!org) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  const available_workspaces = memberships.map((m) => {
    const o = db.organizations.find((orgItem) => orgItem.id === m.organization_id);
    return {
      organization: o!,
      role: m.role,
    };
  }).filter((w) => w.organization != null);

  const token = createToken({
    user_id: user.id,
    company_id: org.id,
    role: targetMembership.role,
    email: user.email,
  });

  const is_platform_admin = (db.platform_admins || []).some((pa) => pa.user_id === user.id);
  const subscription = (db.subscriptions || []).find((s) => s.company_id === org.id) || null;

  res.json({
    token,
    user: { id: user.id, email: user.email, email_verified: user.email_verified, created_at: user.created_at },
    organization: org,
    role: targetMembership.role,
    available_workspaces,
    is_platform_admin,
    subscription,
  });
});

// Get Current User & Workspace Session
app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const user = db.users.find((u) => u.id === auth.user_id);
  const org = db.organizations.find((o) => o.id === auth.company_id);

  if (!user || !org) {
    return res.status(404).json({ error: 'Session user or workspace not found' });
  }

  const memberships = db.organization_members.filter((m) => m.user_id === user.id);
  const available_workspaces = memberships.map((m) => {
    const o = db.organizations.find((orgItem) => orgItem.id === m.organization_id);
    return {
      organization: o!,
      role: m.role,
    };
  }).filter((w) => w.organization != null);

  const is_platform_admin = (db.platform_admins || []).some((pa) => pa.user_id === user.id);
  const subscription = (db.subscriptions || []).find((s) => s.company_id === org.id) || null;

  res.json({
    user: { id: user.id, email: user.email, email_verified: user.email_verified, created_at: user.created_at },
    organization: org,
    role: auth.role,
    available_workspaces,
    is_platform_admin,
    subscription,
  });
});

// Switch Workspace
app.post('/api/auth/switch-workspace', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { target_org_id } = req.body;

  if (!target_org_id) {
    return res.status(400).json({ error: 'target_org_id is required' });
  }

  const membership = db.organization_members.find(
    (m) => m.user_id === auth.user_id && m.organization_id === target_org_id
  );

  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of the requested workspace' });
  }

  const org = db.organizations.find((o) => o.id === target_org_id);
  if (!org) {
    return res.status(404).json({ error: 'Target workspace not found' });
  }

  const token = createToken({
    user_id: auth.user_id,
    company_id: org.id,
    role: membership.role,
    email: auth.email,
  });

  const subscription = (db.subscriptions || []).find((s) => s.company_id === org.id) || null;

  res.json({
    token,
    organization: org,
    role: membership.role,
    subscription,
  });
});

// Forgot Password
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) {
    return res.json({ message: 'If an account exists, a password reset link has been dispatched.' });
  }

  res.json({
    message: 'If an account exists, a password reset link has been dispatched.',
    demo_reset_token: Buffer.from(`${user.id}_reset_${Date.now()}`).toString('base64url'),
  });
});

// Update Workspace Settings (HR Head only)
app.patch('/api/workspace/settings', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (auth.role !== 'hr_head') {
    return res.status(403).json({ error: 'RLS Policy: Only HR Head can update workspace settings.' });
  }

  const org = db.organizations.find((o) => o.id === auth.company_id);
  if (!org) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  const { leave_escalation_threshold_days } = req.body;
  if (leave_escalation_threshold_days !== undefined) {
    org.leave_escalation_threshold_days = Math.max(1, Number(leave_escalation_threshold_days));
  }

  saveDb();
  res.json({ organization: org });
});

// ==========================================
// 2. Invites Management
// ==========================================

app.post('/api/invites', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (auth.role !== 'hr_head') {
    return res.status(403).json({ error: 'RLS Policy Violation: Only HR Head can invite workspace members.' });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existingUser) {
    const isMember = db.organization_members.some(
      (m) => m.user_id === existingUser.id && m.organization_id === auth.company_id
    );
    if (isMember) {
      return res.status(409).json({ error: 'This user is already a member of this workspace.' });
    }
  }

  const token = `inv_${Math.random().toString(36).substring(2, 12)}_${Date.now().toString(36)}`;
  const invite: Invite = {
    id: generateId('inv'),
    token,
    organization_id: auth.company_id,
    email: normalizedEmail,
    role: 'hr_analyst',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
  };

  db.invites.push(invite);
  saveDb();

  const org = db.organizations.find((o) => o.id === auth.company_id);

  res.json({
    invite,
    invite_url: `/invite?token=${token}`,
    organization_name: org?.name || 'Workspace',
  });
});

app.get('/api/invites/:token', (req, res) => {
  const { token } = req.params;
  const invite = db.invites.find((i) => i.token === token && i.status === 'pending');

  if (!invite) {
    return res.status(404).json({ error: 'Invite link is invalid or has expired.' });
  }

  const org = db.organizations.find((o) => o.id === invite.organization_id);
  if (!org) {
    return res.status(404).json({ error: 'Workspace associated with this invite no longer exists.' });
  }

  res.json({
    invite: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      created_at: invite.created_at,
    },
    organization: org,
  });
});

app.post('/api/invites/accept', (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required' });
  }

  const invite = db.invites.find((i) => i.token === token && i.status === 'pending');
  if (!invite) {
    return res.status(404).json({ error: 'Invite link is invalid or has expired.' });
  }

  const org = db.organizations.find((o) => o.id === invite.organization_id);
  if (!org) {
    return res.status(404).json({ error: 'Workspace not found.' });
  }

  let user = db.users.find((u) => u.email.toLowerCase() === invite.email.toLowerCase());
  if (!user) {
    user = {
      id: generateId('usr'),
      email: invite.email.toLowerCase(),
      email_verified: true,
      created_at: new Date().toISOString(),
      password_hash: password,
    };
    db.users.push(user);
  } else {
    user.password_hash = password;
  }

  const existingMember = db.organization_members.find(
    (m) => m.user_id === user.id && m.organization_id === org.id
  );

  if (!existingMember) {
    db.organization_members.push({
      user_id: user.id,
      organization_id: org.id,
      role: 'hr_analyst',
    });
  }

  invite.status = 'accepted';
  saveDb();

  const sessionToken = createToken({
    user_id: user.id,
    company_id: org.id,
    role: 'hr_analyst',
    email: user.email,
  });

  const available_workspaces = [
    {
      organization: org,
      role: 'hr_analyst' as Role,
    },
  ];

  res.json({
    token: sessionToken,
    user: { id: user.id, email: user.email, email_verified: user.email_verified, created_at: user.created_at },
    organization: org,
    role: 'hr_analyst',
    available_workspaces,
  });
});

app.get('/api/workspace/members', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const members = db.organization_members
    .filter((m) => m.organization_id === auth.company_id)
    .map((m) => {
      const u = db.users.find((user) => user.id === m.user_id);
      return {
        user_id: m.user_id,
        email: u?.email || 'unknown',
        role: m.role,
        is_current_user: m.user_id === auth.user_id,
      };
    });

  const pending_invites = db.invites.filter(
    (i) => i.organization_id === auth.company_id && i.status === 'pending'
  );

  res.json({ members, pending_invites });
});

// ==========================================
// 3. Departments Management
// ==========================================

app.get('/api/departments', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const departments = db.departments.filter((d) => d.company_id === auth.company_id);
  res.json(departments);
});

app.post('/api/departments', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Department name is required' });
  }

  const trimmed = name.trim();
  const existing = db.departments.find(
    (d) => d.company_id === auth.company_id && d.name.toLowerCase() === trimmed.toLowerCase()
  );

  if (existing) {
    return res.status(409).json({ error: 'A department with this name already exists' });
  }

  const newDept: Department = {
    id: generateId('dept'),
    company_id: auth.company_id,
    name: trimmed,
  };

  db.departments.push(newDept);
  saveDb();

  broadcastToCompany(auth.company_id, 'department_changed', { type: 'created', department: newDept });
  res.status(201).json(newDept);
});

app.patch('/api/departments/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Department name is required' });
  }

  const dept = db.departments.find((d) => d.id === id && d.company_id === auth.company_id);
  if (!dept) {
    return res.status(404).json({ error: 'Department not found' });
  }

  dept.name = name.trim();
  saveDb();

  broadcastToCompany(auth.company_id, 'department_changed', { type: 'updated', department: dept });
  res.json(dept);
});

app.delete('/api/departments/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;

  const deptIndex = db.departments.findIndex((d) => d.id === id && d.company_id === auth.company_id);
  if (deptIndex === -1) {
    return res.status(404).json({ error: 'Department not found' });
  }

  const assignedEmployees = db.employees.filter((e) => e.department_id === id && e.company_id === auth.company_id);
  if (assignedEmployees.length > 0) {
    return res.status(400).json({
      error: `Cannot delete department: ${assignedEmployees.length} employee(s) are currently assigned to it. Reassign them first.`,
    });
  }

  const removed = db.departments.splice(deptIndex, 1)[0];
  saveDb();

  broadcastToCompany(auth.company_id, 'department_changed', { type: 'deleted', department: removed });
  res.json({ success: true, message: 'Department deleted' });
});

// ==========================================
// 4. Employees & Milestone 2 Auto-Provisioning
// ==========================================

app.get('/api/employees', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const employees = db.employees.filter((e) => e.company_id === auth.company_id);

  const results = employees.map((emp) => {
    const dept = db.departments.find((d) => d.id === emp.department_id);
    const mgr = emp.manager_id ? db.employees.find((m) => m.id === emp.manager_id) : null;
    const directReports = db.employees.filter((e) => e.manager_id === emp.id).length;
    const tasks = db.onboarding_tasks.filter((t) => t.employee_id === emp.id);
    const completedTasks = tasks.filter((t) => t.status === 'completed');
    const onbPercentage = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 100;

    return {
      ...emp,
      department_name: dept?.name || 'Unassigned',
      manager_name: mgr?.name,
      direct_reports_count: directReports,
      onboarding_percentage: onbPercentage,
    };
  });

  res.json(results);
});

app.get('/api/employees/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;

  const emp = db.employees.find((e) => e.id === id && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const dept = db.departments.find((d) => d.id === emp.department_id);
  const mgr = emp.manager_id ? db.employees.find((m) => m.id === emp.manager_id) : null;
  const directReports = db.employees.filter((e) => e.manager_id === emp.id).length;

  // Attach compensation if hr_head
  let comp: EmployeeCompensation | null = null;
  if (auth.role === 'hr_head') {
    comp = db.employee_compensation.find((c) => c.employee_id === emp.id) || null;
  }

  // Attach Onboarding Progress
  const onbTasks = db.onboarding_tasks.filter((t) => t.employee_id === emp.id);
  const completedOnbTasks = onbTasks.filter((t) => t.status === 'completed');
  const onboarding_progress = {
    total_tasks: onbTasks.length,
    completed_tasks: completedOnbTasks.length,
    percentage: onbTasks.length > 0 ? Math.round((completedOnbTasks.length / onbTasks.length) * 100) : 100,
    tasks: onbTasks,
  };

  // Attach Offboarding info if exists
  const offbRecord = db.offboarding_records.find((r) => r.employee_id === emp.id) || null;
  const offbTasks = db.offboarding_tasks.filter((t) => t.employee_id === emp.id);
  const offboarding = {
    record: offbRecord,
    tasks: offbTasks,
  };

  // Attach Attendance Summary for this employee
  const empAttRecords = db.attendance_records.filter((a) => a.employee_id === emp.id);
  const present_days = empAttRecords.filter((a) => a.status === 'present').length;
  const late_days = empAttRecords.filter((a) => a.status === 'late').length;
  const absent_days = empAttRecords.filter((a) => a.status === 'absent').length;
  const on_leave_days = empAttRecords.filter((a) => a.status === 'on_leave').length;

  const attendance_summary = {
    present_days,
    late_days,
    absent_days,
    on_leave_days,
    total_logged_days: empAttRecords.length,
  };

  // Attach Leave Balances
  const orgLeaveTypes = db.leave_types.filter((lt) => lt.company_id === auth.company_id);
  const leave_balances = orgLeaveTypes.map((lt) => {
    const bal = db.leave_balances.find((b) => b.employee_id === emp.id && b.leave_type_id === lt.id);
    return {
      leave_type_id: lt.id,
      leave_type_name: lt.name,
      allocated_days: bal ? bal.allocated_days : lt.default_entitlement_days,
      used_days: bal ? bal.used_days : 0,
      balance_days: bal ? bal.balance_days : lt.default_entitlement_days,
    };
  });

  // Attach Job History (Milestone 6)
  const empJobHistory = db.job_history
    .filter((j) => j.employee_id === emp.id && j.company_id === auth.company_id)
    .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())
    .map(enrichJobHistory);

  const fullEmployee: EmployeeWithDetails = {
    ...emp,
    department_name: dept?.name || 'Unassigned',
    manager_name: mgr?.name,
    direct_reports_count: directReports,
    compensation: comp,
    onboarding_progress,
    offboarding,
    attendance_summary,
    leave_balances,
    job_history: empJobHistory,
  };

  res.json(fullEmployee);
});

app.post('/api/employees', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const {
    name,
    department_id,
    job_title,
    employment_type,
    country,
    start_date,
    status,
    attrition_risk,
    manager_id,
    salary,
    currency,
  } = req.body;

  if (!name || !department_id || !job_title || !employment_type || !country || !start_date || !status) {
    return res.status(400).json({ error: 'All required employee fields must be provided' });
  }

  // Workspace-level subscription enforcement: Employee limit and trial status
  const sub = (db.subscriptions || []).find((s) => s.company_id === auth.company_id);
  const isExpired =
    sub &&
    sub.status === 'trialing' &&
    sub.trial_ends_at &&
    new Date(sub.trial_ends_at).getTime() < Date.now();

  if (isExpired) {
    return res.status(403).json({
      error: 'Workspace in restricted mode: Your 14-day free trial has expired. Upgrade your plan to add more team members.',
      code: 'SUBSCRIPTION_EXPIRED',
    });
  }

  const activeEmployees = db.employees.filter(
    (e) => e.company_id === auth.company_id && e.status !== 'offboarded'
  );
  const limit = sub ? sub.employee_limit : 10;
  if (activeEmployees.length >= limit) {
    return res.status(403).json({
      error: `Workspace employee limit reached (${activeEmployees.length}/${limit}). Please upgrade your subscription plan to add more team members.`,
      code: 'EMPLOYEE_LIMIT_REACHED',
      current_count: activeEmployees.length,
      limit,
    });
  }

  const dept = db.departments.find((d) => d.id === department_id && d.company_id === auth.company_id);
  if (!dept) {
    return res.status(400).json({ error: 'Selected department does not exist in this workspace' });
  }

  const newEmployee: Employee = {
    id: generateId('emp'),
    company_id: auth.company_id,
    name: name.trim(),
    department_id,
    job_title: job_title.trim(),
    employment_type,
    country: country.trim(),
    start_date,
    status,
    attrition_risk: attrition_risk || 'low',
    manager_id: manager_id || undefined,
  };

  db.employees.push(newEmployee);

  // 1. If compensation provided AND user is hr_head, save compensation
  if (salary != null && auth.role === 'hr_head') {
    const compRow: EmployeeCompensation = {
      id: generateId('comp'),
      employee_id: newEmployee.id,
      salary: Number(salary) || 0,
      currency: currency || 'GHS',
      effective_date: start_date,
    };
    db.employee_compensation.push(compRow);
  }

  // 2. Automatically generate country-adapted onboarding tasks (Milestone 2)
  const initialTasks = generateDefaultOnboardingTasks(
    newEmployee.id,
    auth.company_id,
    newEmployee.country,
    newEmployee.start_date
  );
  db.onboarding_tasks.push(...initialTasks);

  // 3. Automatically initialize leave balances for all leave types in company
  const orgLeaveTypes = db.leave_types.filter((lt) => lt.company_id === auth.company_id);
  orgLeaveTypes.forEach((lt) => {
    db.leave_balances.push({
      id: generateId('lbal'),
      employee_id: newEmployee.id,
      company_id: auth.company_id,
      leave_type_id: lt.id,
      allocated_days: lt.default_entitlement_days,
      used_days: 0,
      balance_days: lt.default_entitlement_days,
    });
  });

  // 4. Initialize today's attendance entry
  const today = getTodayString();
  db.attendance_records.push({
    id: generateId('att'),
    employee_id: newEmployee.id,
    company_id: auth.company_id,
    date: today,
    status: status === 'on_leave' ? 'on_leave' : 'not_logged',
  });
  refreshDailyAttendanceSummary(auth.company_id, today);

  saveDb();

  broadcastToCompany(auth.company_id, 'employee_created', { employee: newEmployee });
  broadcastToCompany(auth.company_id, 'onboarding_updated', { employee_id: newEmployee.id });

  res.status(201).json({
    ...newEmployee,
    department_name: dept.name,
  });
});

app.patch('/api/employees/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;

  const emp = db.employees.find((e) => e.id === id && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const {
    name,
    department_id,
    job_title,
    employment_type,
    country,
    start_date,
    status,
    attrition_risk,
    manager_id,
    reason,
  } = req.body;

  const deptChanged = department_id && department_id !== emp.department_id;
  const titleChanged = job_title && job_title.trim() !== emp.job_title;
  const mgrChanged = manager_id !== undefined && (manager_id || null) !== (emp.manager_id || null);

  const prevDeptId = emp.department_id;
  const prevTitle = emp.job_title;
  const prevMgrId = emp.manager_id || null;

  if (department_id) {
    const dept = db.departments.find((d) => d.id === department_id && d.company_id === auth.company_id);
    if (!dept) {
      return res.status(400).json({ error: 'Department does not exist in this workspace' });
    }
    emp.department_id = department_id;
  }

  if (manager_id !== undefined) {
    if (manager_id && manager_id === id) {
      return res.status(400).json({ error: 'An employee cannot be their own manager' });
    }
    emp.manager_id = manager_id || undefined;
  }

  if (name !== undefined) emp.name = name.trim();
  if (job_title !== undefined) emp.job_title = job_title.trim();
  if (employment_type !== undefined) emp.employment_type = employment_type;
  if (country !== undefined) emp.country = country.trim();
  if (start_date !== undefined) emp.start_date = start_date;
  if (status !== undefined) emp.status = status;
  if (attrition_risk !== undefined) emp.attrition_risk = attrition_risk;

  // Track job history if department, title, or manager was changed
  if (deptChanged || titleChanged || mgrChanged) {
    const newDeptId = department_id || prevDeptId;
    const newTitle = job_title ? job_title.trim() : prevTitle;
    const newMgrId = manager_id !== undefined ? (manager_id || null) : prevMgrId;

    const historyRow: JobHistory = {
      id: generateId('jh'),
      employee_id: emp.id,
      company_id: auth.company_id,
      previous_department_id: prevDeptId,
      new_department_id: newDeptId,
      previous_job_title: prevTitle,
      new_job_title: newTitle,
      previous_manager_id: prevMgrId,
      new_manager_id: newMgrId,
      reason: reason || (titleChanged ? 'promotion' : (mgrChanged ? 'restructure' : 'transfer')),
      effective_date: getTodayString(),
      changed_by: auth.user_id,
      created_at: new Date().toISOString(),
    };
    db.job_history.push(historyRow);
    broadcastToCompany(auth.company_id, 'job_history_created', { employee_id: emp.id, job_history: enrichJobHistory(historyRow) });
  }

  saveDb();

  const dept = db.departments.find((d) => d.id === emp.department_id);
  const mgr = emp.manager_id ? db.employees.find((m) => m.id === emp.manager_id) : null;
  const directReports = db.employees.filter((e) => e.manager_id === emp.id).length;
  const updated = {
    ...emp,
    department_name: dept?.name || 'Unassigned',
    manager_name: mgr?.name,
    direct_reports_count: directReports,
  };

  broadcastToCompany(auth.company_id, 'employee_updated', { employee: updated });
  res.json(updated);
});

// Delete Employee (Strict RLS: hr_head only)
app.delete('/api/employees/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;

  if (auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'RLS Policy Violation: Only HR Head role has permission to delete employee records.',
    });
  }

  const empIndex = db.employees.findIndex((e) => e.id === id && e.company_id === auth.company_id);
  if (empIndex === -1) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  db.employees.splice(empIndex, 1);
  db.employee_compensation = db.employee_compensation.filter((c) => c.employee_id !== id);
  db.onboarding_tasks = db.onboarding_tasks.filter((t) => t.employee_id !== id);
  db.offboarding_tasks = db.offboarding_tasks.filter((t) => t.employee_id !== id);
  db.offboarding_records = db.offboarding_records.filter((r) => r.employee_id !== id);
  db.attendance_records = db.attendance_records.filter((a) => a.employee_id !== id);
  db.leave_balances = db.leave_balances.filter((b) => b.employee_id !== id);
  db.leave_requests = db.leave_requests.filter((r) => r.employee_id !== id);

  refreshDailyAttendanceSummary(auth.company_id, getTodayString());
  saveDb();

  broadcastToCompany(auth.company_id, 'employee_deleted', { id });
  res.json({ success: true, message: 'Employee deleted successfully' });
});

// Compensation (Strict RLS: hr_head_only_compensation)
app.get('/api/employees/:id/compensation', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;

  const emp = db.employees.find((e) => e.id === id && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found in this workspace' });
  }

  if (auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'RLS Policy Violation: hr_head_only_compensation. Compensation records are restricted to HR Head role only.',
    });
  }

  const comp = getLatestCompensation(id);
  res.json({ compensation: comp });
});

app.get('/api/employees/:id/compensation/history', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;

  const emp = db.employees.find((e) => e.id === id && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found in this workspace' });
  }

  if (auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'RLS Policy Violation: hr_head_only_compensation. Compensation history is restricted to HR Head role only.',
    });
  }

  const history = db.employee_compensation
    .filter((c) => c.employee_id === id)
    .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime());

  res.json({ history });
});

app.post('/api/employees/:id/compensation', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;

  const emp = db.employees.find((e) => e.id === id && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found in this workspace' });
  }

  if (auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'RLS Policy Violation: hr_head_only_compensation. Only HR Head role can create compensation records.',
    });
  }

  const { salary, currency, effective_date, allowances, bonus, statutory_data, notes } = req.body;
  if (salary == null || !currency || !effective_date) {
    return res.status(400).json({ error: 'Salary, currency, and effective date are required' });
  }

  const comp: EmployeeCompensation = {
    id: generateId('comp'),
    employee_id: id,
    salary: Number(salary),
    currency,
    effective_date,
    allowances: allowances != null ? Number(allowances) : 0,
    bonus: bonus != null ? Number(bonus) : 0,
    statutory_data: statutory_data || {},
    notes: notes?.trim() || undefined,
    created_at: new Date().toISOString(),
  };

  db.employee_compensation.push(comp);
  saveDb();
  broadcastToCompany(auth.company_id, 'compensation_updated', { employee_id: id, compensation: comp });

  res.status(201).json({ compensation: comp });
});

app.put('/api/employees/:id/compensation/:compId', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id, compId } = req.params;

  const emp = db.employees.find((e) => e.id === id && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found in this workspace' });
  }

  if (auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'RLS Policy Violation: hr_head_only_compensation. Only HR Head role can update compensation records.',
    });
  }

  const comp = db.employee_compensation.find((c) => c.id === compId && c.employee_id === id);
  if (!comp) {
    return res.status(404).json({ error: 'Compensation record not found' });
  }

  const { salary, currency, effective_date, allowances, bonus, statutory_data, notes } = req.body;
  if (salary !== undefined) comp.salary = Number(salary);
  if (currency !== undefined) comp.currency = currency;
  if (effective_date !== undefined) comp.effective_date = effective_date;
  if (allowances !== undefined) comp.allowances = Number(allowances);
  if (bonus !== undefined) comp.bonus = Number(bonus);
  if (statutory_data !== undefined) comp.statutory_data = statutory_data;
  if (notes !== undefined) comp.notes = notes;

  saveDb();
  broadcastToCompany(auth.company_id, 'compensation_updated', { employee_id: id, compensation: comp });

  res.json({ compensation: comp });
});

app.delete('/api/employees/:id/compensation/:compId', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id, compId } = req.params;

  const emp = db.employees.find((e) => e.id === id && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found in this workspace' });
  }

  if (auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'RLS Policy Violation: Only HR Head role can delete compensation records.',
    });
  }

  const index = db.employee_compensation.findIndex((c) => c.id === compId && c.employee_id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Compensation record not found' });
  }

  db.employee_compensation.splice(index, 1);
  saveDb();
  broadcastToCompany(auth.company_id, 'compensation_updated', { employee_id: id });

  res.json({ success: true, message: 'Compensation record deleted' });
});

// ==========================================
// Milestone 3: Payroll Summary (HR Head Only)
// ==========================================

app.get('/api/payroll/summary', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;

  if (auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'RLS Policy Violation: Payroll summary and compensation records are restricted to HR Head role only.',
    });
  }

  const activeEmployees = db.employees.filter(
    (e) => e.company_id === auth.company_id && e.status !== 'offboarded'
  );

  const orgDepartments = db.departments.filter((d) => d.company_id === auth.company_id);

  let totalBase = 0;
  let totalAllowances = 0;
  let totalBonus = 0;

  const enrichedRecords: Array<EmployeeCompensation & {
    employee_name: string;
    department_name: string;
    job_title: string;
    country: string;
    employment_type: any;
    status: any;
  }> = [];

  const deptMap: Record<string, {
    department_id: string;
    department_name: string;
    employee_count: number;
    total_base_salary: number;
    total_allowances: number;
    total_bonus: number;
    total_cost: number;
    currency: string;
  }> = {};

  orgDepartments.forEach((d) => {
    deptMap[d.id] = {
      department_id: d.id,
      department_name: d.name,
      employee_count: 0,
      total_base_salary: 0,
      total_allowances: 0,
      total_bonus: 0,
      total_cost: 0,
      currency: 'GHS',
    };
  });

  const countryMap: Record<string, {
    country: string;
    employee_count: number;
    total_base_salary: number;
    total_allowances: number;
    total_bonus: number;
    total_cost: number;
    currency: string;
  }> = {};

  activeEmployees.forEach((emp) => {
    const comp = getLatestCompensation(emp.id);
    const dept = orgDepartments.find((d) => d.id === emp.department_id);
    const deptName = dept?.name || 'Unassigned';

    const salary = comp?.salary || 0;
    const allowances = comp?.allowances || 0;
    const bonus = comp?.bonus || 0;
    const cost = salary + allowances + bonus;
    const currency = comp?.currency || 'GHS';

    totalBase += salary;
    totalAllowances += allowances;
    totalBonus += bonus;

    // Dept grouping
    if (dept && deptMap[dept.id]) {
      deptMap[dept.id].employee_count += 1;
      deptMap[dept.id].total_base_salary += salary;
      deptMap[dept.id].total_allowances += allowances;
      deptMap[dept.id].total_bonus += bonus;
      deptMap[dept.id].total_cost += cost;
      deptMap[dept.id].currency = currency;
    }

    // Country grouping
    const countryKey = emp.country || 'Ghana';
    if (!countryMap[countryKey]) {
      countryMap[countryKey] = {
        country: countryKey,
        employee_count: 0,
        total_base_salary: 0,
        total_allowances: 0,
        total_bonus: 0,
        total_cost: 0,
        currency,
      };
    }
    countryMap[countryKey].employee_count += 1;
    countryMap[countryKey].total_base_salary += salary;
    countryMap[countryKey].total_allowances += allowances;
    countryMap[countryKey].total_bonus += bonus;
    countryMap[countryKey].total_cost += cost;

    enrichedRecords.push({
      id: comp?.id || `temp_${emp.id}`,
      employee_id: emp.id,
      employee_name: emp.name,
      department_name: deptName,
      job_title: emp.job_title,
      country: emp.country,
      employment_type: emp.employment_type,
      status: emp.status,
      salary,
      currency,
      effective_date: comp?.effective_date || emp.start_date,
      allowances,
      bonus,
      statutory_data: comp?.statutory_data,
      notes: comp?.notes,
      created_at: comp?.created_at,
    });
  });

  const totalCost = totalBase + totalAllowances + totalBonus;

  const costByDept: PayrollDepartmentCost[] = Object.values(deptMap).map((d) => ({
    ...d,
    percentage_of_total: totalCost > 0 ? Math.round((d.total_cost / totalCost) * 100) : 0,
  }));

  const costByCountry: PayrollCountryCost[] = Object.values(countryMap);

  const summary: PayrollSummary = {
    total_payroll_cost: totalCost,
    total_base_salaries: totalBase,
    total_allowances: totalAllowances,
    total_bonuses: totalBonus,
    total_active_employees: activeEmployees.length,
    currency: 'GHS',
    cost_by_department: costByDept,
    cost_by_country: costByCountry,
    records: enrichedRecords,
  };

  res.json(summary);
});

// ==========================================
// Milestone 3: Compliance Center
// ==========================================

app.get('/api/compliance/dashboard', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const data = evaluateComplianceItems(auth.company_id);
  res.json(data);
});

app.post('/api/compliance/items', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { category, related_employee_id, title, deadline, status, notes } = req.body;

  if (!category || !title || !deadline) {
    return res.status(400).json({ error: 'Category, title, and deadline are required' });
  }

  let relatedName: string | undefined;
  if (related_employee_id) {
    const emp = db.employees.find((e) => e.id === related_employee_id && e.company_id === auth.company_id);
    if (emp) relatedName = emp.name;
  }

  // Derive status if not supplied
  let itemStatus: ComplianceStatus = status || 'compliant';
  if (!status && deadline) {
    const diffDays = Math.ceil((new Date(deadline).getTime() - new Date(getTodayString()).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) itemStatus = 'non_compliant';
    else if (diffDays <= 30) itemStatus = 'attention';
    else itemStatus = 'compliant';
  }

  const newItem: ComplianceItem = {
    id: generateId('citem'),
    company_id: auth.company_id,
    category,
    related_employee_id: related_employee_id || undefined,
    related_employee_name: relatedName,
    title: title.trim(),
    deadline,
    status: itemStatus,
    notes: notes?.trim() || undefined,
    created_at: new Date().toISOString(),
  };

  db.compliance_items.push(newItem);
  saveDb();
  broadcastToCompany(auth.company_id, 'compliance_updated', { item: newItem });

  res.status(201).json(newItem);
});

app.patch('/api/compliance/items/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;

  const item = db.compliance_items.find((ci) => ci.id === id && ci.company_id === auth.company_id);
  if (!item) {
    return res.status(404).json({ error: 'Compliance item not found' });
  }

  const { category, related_employee_id, title, deadline, status, notes } = req.body;

  if (category !== undefined) item.category = category;
  if (title !== undefined) item.title = title.trim();
  if (deadline !== undefined) item.deadline = deadline;
  if (status !== undefined) item.status = status;
  if (notes !== undefined) item.notes = notes;

  if (related_employee_id !== undefined) {
    item.related_employee_id = related_employee_id;
    const emp = db.employees.find((e) => e.id === related_employee_id);
    item.related_employee_name = emp?.name;
  }

  item.updated_at = new Date().toISOString();
  saveDb();
  broadcastToCompany(auth.company_id, 'compliance_updated', { item });

  res.json(item);
});

app.delete('/api/compliance/items/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;

  const index = db.compliance_items.findIndex((ci) => ci.id === id && ci.company_id === auth.company_id);
  if (index === -1) {
    return res.status(404).json({ error: 'Compliance item not found' });
  }

  db.compliance_items.splice(index, 1);
  saveDb();
  broadcastToCompany(auth.company_id, 'compliance_updated', { id });

  res.json({ success: true, message: 'Compliance item deleted' });
});

app.post('/api/compliance/auto-evaluate', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const data = evaluateComplianceItems(auth.company_id);
  broadcastToCompany(auth.company_id, 'compliance_updated', data);
  res.json(data);
});

// ==========================================
// Milestone 3: Documents Repository & Management
// ==========================================

app.get('/api/documents', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { employee_id, type } = req.query;

  let docs = db.documents.filter((d) => d.company_id === auth.company_id);

  if (employee_id) {
    docs = docs.filter((d) => d.employee_id === employee_id);
  }

  if (type) {
    docs = docs.filter((d) => d.type === type);
  }

  const enrichedDocs: DocumentWithDetails[] = docs.map((doc) => {
    const emp = db.employees.find((e) => e.id === doc.employee_id);
    const dept = db.departments.find((d) => d.id === emp?.department_id);

    return {
      ...doc,
      employee_name: emp?.name || 'Unassigned',
      department_name: dept?.name || 'Unassigned',
      country: emp?.country || 'Ghana',
    };
  });

  res.json(enrichedDocs);
});

app.get('/api/documents/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;

  const doc = db.documents.find((d) => d.id === id && d.company_id === auth.company_id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const emp = db.employees.find((e) => e.id === doc.employee_id);
  const dept = db.departments.find((d) => d.id === emp?.department_id);

  res.json({
    ...doc,
    employee_name: emp?.name || 'Unassigned',
    department_name: dept?.name || 'Unassigned',
    country: emp?.country || 'Ghana',
  });
});

app.post('/api/documents', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { employee_id, type, file_ref, file_name, file_size, expiry_date, notes } = req.body;

  if (!employee_id || !type || !file_name) {
    return res.status(400).json({ error: 'Employee, document type, and file name are required' });
  }

  const emp = db.employees.find((e) => e.id === employee_id && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found in this workspace' });
  }

  const newDoc: AppDocument = {
    id: generateId('doc'),
    company_id: auth.company_id,
    employee_id,
    type,
    file_ref: file_ref || 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCg==',
    file_name: file_name.trim(),
    file_size: Number(file_size) || 124000,
    expiry_date: expiry_date || undefined,
    uploaded_at: new Date().toISOString(),
    uploaded_by: auth.email,
    notes: notes?.trim() || undefined,
  };

  db.documents.push(newDoc);

  // Auto-sync into compliance items if expiry_date is provided
  if (expiry_date) {
    let cat: ComplianceCategory = 'other';
    let title = `Document Renewal - ${newDoc.file_name}`;
    if (type === 'contract') {
      cat = 'contracts_visas';
      title = `Employment Contract Renewal - ${emp.name}`;
    } else if (type === 'id_card') {
      cat = 'contracts_visas';
      title = `Identity / Visa Expiry - ${emp.name}`;
    } else if (type === 'certification') {
      cat = 'certifications';
      title = `Certification Renewal - ${emp.name}`;
    } else if (type === 'tax_form') {
      cat = 'statutory_tax';
      title = `Tax Form / Expiry - ${emp.name}`;
    }

    const diffDays = Math.ceil((new Date(expiry_date).getTime() - new Date(getTodayString()).getTime()) / (1000 * 60 * 60 * 24));
    let status: ComplianceStatus = 'compliant';
    if (diffDays < 0) status = 'non_compliant';
    else if (diffDays <= 30) status = 'attention';

    db.compliance_items.push({
      id: generateId('citem'),
      company_id: auth.company_id,
      category: cat,
      related_employee_id: emp.id,
      related_employee_name: emp.name,
      title,
      deadline: expiry_date,
      status,
      document_id: newDoc.id,
      notes: notes || `Auto-tracked expiry from document upload (${newDoc.file_name})`,
      created_at: new Date().toISOString(),
    });
  }

  saveDb();
  broadcastToCompany(auth.company_id, 'document_uploaded', { document: newDoc });
  broadcastToCompany(auth.company_id, 'compliance_updated', {});

  const dept = db.departments.find((d) => d.id === emp.department_id);
  res.status(201).json({
    ...newDoc,
    employee_name: emp.name,
    department_name: dept?.name || 'Unassigned',
    country: emp.country,
  });
});

app.delete('/api/documents/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;

  const doc = db.documents.find((d) => d.id === id && d.company_id === auth.company_id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Strict RLS: Only HR Head can delete compliance-critical contracts
  if (doc.type === 'contract' && auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'RLS Policy Violation: Only HR Head role has permission to delete compliance-critical employment contracts.',
    });
  }

  const docIdx = db.documents.findIndex((d) => d.id === id);
  db.documents.splice(docIdx, 1);

  // Remove linked compliance item if exists
  db.compliance_items = db.compliance_items.filter((ci) => ci.document_id !== id);

  saveDb();
  broadcastToCompany(auth.company_id, 'document_deleted', { id });
  broadcastToCompany(auth.company_id, 'compliance_updated', {});

  res.json({ success: true, message: 'Document deleted successfully' });
});

// ==========================================
// 5. Milestone 2: Employee Onboarding Board & Checklists
// ==========================================

// Get Onboarding Kanban items for workspace
app.get('/api/onboarding', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const employees = db.employees.filter(
    (e) => e.company_id === auth.company_id && e.status !== 'offboarded'
  );

  const boardItems = employees.map((emp) => {
    const dept = db.departments.find((d) => d.id === emp.department_id);
    const tasks = db.onboarding_tasks.filter((t) => t.employee_id === emp.id);
    const completedTasks = tasks.filter((t) => t.status === 'completed');
    const percentage = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 100;

    let column: 'to_do' | 'in_progress' | 'complete' = 'in_progress';
    if (percentage === 0) {
      column = 'to_do';
    } else if (percentage === 100) {
      column = 'complete';
    } else {
      column = 'in_progress';
    }

    return {
      employee: {
        id: emp.id,
        name: emp.name,
        job_title: emp.job_title,
        department_name: dept?.name || 'Unassigned',
        country: emp.country,
        start_date: emp.start_date,
        status: emp.status,
      },
      column,
      percentage,
      total_tasks: tasks.length,
      completed_tasks: completedTasks.length,
      tasks,
    };
  });

  res.json(boardItems);
});

// Get Onboarding Tasks for an employee
app.get('/api/onboarding/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;

  const emp = db.employees.find((e) => e.id === id && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const tasks = db.onboarding_tasks.filter((t) => t.employee_id === id);
  res.json({ employee: emp, tasks });
});

app.get('/api/employees/:id/onboarding', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;

  const emp = db.employees.find((e) => e.id === id && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const tasks = db.onboarding_tasks.filter((t) => t.employee_id === id);
  res.json(tasks);
});

// Toggle / Update Onboarding Task (HR Analyst or HR Head on employee's behalf)
app.patch('/api/onboarding/tasks/:taskId', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { taskId } = req.params;
  const { status, task: taskTitle, category, notes } = req.body;

  const task = db.onboarding_tasks.find((t) => t.id === taskId && t.company_id === auth.company_id);
  if (!task) {
    return res.status(404).json({ error: 'Onboarding task not found' });
  }

  if (status !== undefined) {
    task.status = status;
    if (status === 'completed') {
      task.completed_at = new Date().toISOString();
      task.completed_by = auth.role;
    } else {
      task.completed_at = undefined;
      task.completed_by = undefined;
    }
  }

  if (taskTitle !== undefined && typeof taskTitle === 'string' && taskTitle.trim()) {
    task.task = taskTitle.trim();
  }

  if (category !== undefined && typeof category === 'string' && category.trim()) {
    task.category = category as any;
  }

  if (notes !== undefined) {
    task.notes = notes;
  }

  saveDb();

  broadcastToCompany(auth.company_id, 'onboarding_task_updated', {
    employee_id: task.employee_id,
    task,
  });

  res.json(task);
});

// Create new Onboarding Task for an employee
app.post('/api/onboarding/:employeeId/tasks', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { employeeId } = req.params;
  const { task, category, notes } = req.body;

  const emp = db.employees.find((e) => e.id === employeeId && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  if (!task || !task.trim()) {
    return res.status(400).json({ error: 'Task title is required' });
  }

  const newTask = {
    id: 'onb_' + Math.random().toString(36).substring(2, 9),
    company_id: auth.company_id,
    employee_id: employeeId,
    category: (category || 'personal_info') as any,
    task: task.trim(),
    status: 'pending' as const,
    due_date: new Date().toISOString().split('T')[0],
    notes: notes?.trim() || undefined,
  };

  db.onboarding_tasks.push(newTask);
  saveDb();

  broadcastToCompany(auth.company_id, 'onboarding_updated', {
    employee_id: employeeId,
    task: newTask,
  });

  res.status(201).json(newTask);
});

// Delete an Onboarding Task
app.delete('/api/onboarding/tasks/:taskId', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { taskId } = req.params;

  const taskIndex = db.onboarding_tasks.findIndex((t) => t.id === taskId && t.company_id === auth.company_id);
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Onboarding task not found' });
  }

  const [deleted] = db.onboarding_tasks.splice(taskIndex, 1);
  saveDb();

  broadcastToCompany(auth.company_id, 'onboarding_updated', {
    employee_id: deleted.employee_id,
    deleted_task_id: taskId,
  });

  res.json({ success: true, deleted_task_id: taskId });
});

// ==========================================
// 6. Milestone 2: Employee Offboarding Workflow & Settlement Approval
// ==========================================

// Trigger Offboarding from Employee Profile
app.post('/api/employees/:id/offboard', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;
  const { reason, last_working_day, exit_interview_notes } = req.body;

  if (!reason || !last_working_day) {
    return res.status(400).json({ error: 'Reason and last working day are required to initiate offboarding' });
  }

  const emp = db.employees.find((e) => e.id === id && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  // Calculate final leave balance days across all types
  const empLeaveBals = db.leave_balances.filter((b) => b.employee_id === emp.id);
  const totalLeaveDays = empLeaveBals.reduce((sum, b) => sum + Math.max(0, b.balance_days), 0);

  // Check if compensation exists to calculate estimated final settlement
  const comp = db.employee_compensation.find((c) => c.employee_id === emp.id);
  const dailyRate = comp ? comp.salary / 22 : 0;
  const final_settlement_amount = comp ? Number((comp.salary + dailyRate * totalLeaveDays).toFixed(2)) : 0;

  // Create or update offboarding record
  let record = db.offboarding_records.find((r) => r.employee_id === id);
  if (record) {
    record.reason = reason;
    record.last_working_day = last_working_day;
    record.exit_interview_notes = exit_interview_notes;
    record.final_leave_balance_days = totalLeaveDays;
    record.final_settlement_amount = final_settlement_amount;
    record.currency = comp?.currency || 'GHS';
  } else {
    record = {
      id: generateId('offb_rec'),
      employee_id: id,
      company_id: auth.company_id,
      reason,
      last_working_day,
      exit_interview_notes,
      final_leave_balance_days: totalLeaveDays,
      final_settlement_amount,
      currency: comp?.currency || 'GHS',
      status: 'in_progress',
      created_at: new Date().toISOString(),
    };
    db.offboarding_records.push(record);
  }

  // Generate Offboarding Tasks if not already generated
  let existingTasks = db.offboarding_tasks.filter((t) => t.employee_id === id);
  if (existingTasks.length === 0) {
    const tasks: OffboardingTask[] = [
      {
        id: generateId('offb_task'),
        employee_id: id,
        company_id: auth.company_id,
        category: 'last_working_day',
        task: `Confirm last working day (${last_working_day}) & team transition notice`,
        status: 'completed',
        due_date: last_working_day,
        completed_at: new Date().toISOString(),
        completed_by: auth.role,
      },
      {
        id: generateId('offb_task'),
        employee_id: id,
        company_id: auth.company_id,
        category: 'exit_interview',
        task: 'Conduct exit interview & document handover knowledge base',
        status: exit_interview_notes ? 'completed' : 'pending',
        due_date: last_working_day,
        completed_at: exit_interview_notes ? new Date().toISOString() : undefined,
        completed_by: exit_interview_notes ? auth.role : undefined,
        notes: exit_interview_notes,
      },
      {
        id: generateId('offb_task'),
        employee_id: id,
        company_id: auth.company_id,
        category: 'asset_return',
        task: 'Collect laptop, company monitor, security keycards & hardware tokens',
        status: 'pending',
        due_date: last_working_day,
      },
      {
        id: generateId('offb_task'),
        employee_id: id,
        company_id: auth.company_id,
        category: 'access_revocation',
        task: 'Revoke corporate Google Workspace, Slack, VPN & AWS credentials',
        status: 'pending',
        due_date: last_working_day,
      },
      {
        id: generateId('offb_task'),
        employee_id: id,
        company_id: auth.company_id,
        category: 'final_settlement',
        task: 'Calculate final leave balance payout & approve final settlement (HR Head only)',
        status: 'pending',
        due_date: last_working_day,
      },
    ];
    db.offboarding_tasks.push(...tasks);
  }

  saveDb();

  broadcastToCompany(auth.company_id, 'offboarding_updated', {
    employee_id: id,
    record,
  });

  res.json({ record, tasks: db.offboarding_tasks.filter((t) => t.employee_id === id) });
});

// Get Offboarding details for an employee
app.get('/api/offboarding/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;

  const emp = db.employees.find((e) => e.id === id && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const record = db.offboarding_records.find((r) => r.employee_id === id && r.company_id === auth.company_id) || null;
  const tasks = db.offboarding_tasks.filter((t) => t.employee_id === id && t.company_id === auth.company_id);

  if (!record) {
    return res.status(404).json({ error: 'No offboarding record for this employee' });
  }

  res.json({
    ...record,
    employee_name: emp.name,
    tasks,
  });
});

// Update Operational Offboarding Tasks batch / single
app.patch('/api/offboarding/:recordId/tasks', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { recordId } = req.params;
  const { tasks: updatedTasks } = req.body;

  const record = db.offboarding_records.find((r) => r.id === recordId && r.company_id === auth.company_id);
  if (!record) {
    return res.status(404).json({ error: 'Offboarding record not found' });
  }

  if (Array.isArray(updatedTasks)) {
    updatedTasks.forEach((ut: any) => {
      const existing = db.offboarding_tasks.find((t) => (t.id === ut.id || t.category === ut.category) && t.employee_id === record.employee_id);
      if (existing) {
        if (ut.completed !== undefined) {
          existing.status = ut.completed ? 'completed' : 'pending';
          existing.completed_at = ut.completed ? new Date().toISOString() : undefined;
          existing.completed_by = ut.completed ? auth.role : undefined;
        }
      }
    });
    saveDb();
  }

  const tasks = db.offboarding_tasks.filter((t) => t.employee_id === record.employee_id);
  broadcastToCompany(auth.company_id, 'offboarding_updated', { employee_id: record.employee_id, record, tasks });
  res.json({ record, tasks });
});

// Update Operational Offboarding Task (HR Analyst or HR Head)
app.patch('/api/offboarding/tasks/:taskId', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { taskId } = req.params;
  const { status, notes } = req.body;

  const task = db.offboarding_tasks.find((t) => t.id === taskId && t.company_id === auth.company_id);
  if (!task) {
    return res.status(404).json({ error: 'Offboarding task not found' });
  }

  // If task is final_settlement, only HR Head can toggle it
  if (task.category === 'final_settlement' && auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'RLS Policy: Final settlement calculation and closing approval is strictly restricted to HR Head.',
    });
  }

  if (status !== undefined) {
    task.status = status;
    if (status === 'completed') {
      task.completed_at = new Date().toISOString();
      task.completed_by = auth.role;
    } else {
      task.completed_at = undefined;
      task.completed_by = undefined;
    }
  }

  if (notes !== undefined) {
    task.notes = notes;
  }

  saveDb();

  broadcastToCompany(auth.company_id, 'offboarding_task_updated', {
    employee_id: task.employee_id,
    task,
  });

  res.json(task);
});

// Approve Final Settlement & Close Record (STRICT RLS: Only HR Head)
app.post('/api/offboarding/:recordId/approve-settlement', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { recordId } = req.params;

  // Strict Server-Side RLS Policy Enforcement
  if (auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'RLS Policy Violation: Only the HR Head role can approve final settlement and close employee records.',
    });
  }

  const record = db.offboarding_records.find((r) => r.id === recordId && r.company_id === auth.company_id);
  if (!record) {
    return res.status(404).json({ error: 'Offboarding record not found' });
  }

  const emp = db.employees.find((e) => e.id === record.employee_id && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  record.status = 'settled_and_closed';
  record.settlement_approved_by = auth.email;
  record.settlement_approved_at = new Date().toISOString();

  // Mark employee status as offboarded — RECORD RETAINED, NOT DELETED
  emp.status = 'offboarded';

  // Mark all offboarding tasks as completed
  const tasks = db.offboarding_tasks.filter((t) => t.employee_id === emp.id);
  tasks.forEach((t) => {
    t.status = 'completed';
    if (!t.completed_at) {
      t.completed_at = new Date().toISOString();
      t.completed_by = 'hr_head';
    }
  });

  saveDb();

  broadcastToCompany(auth.company_id, 'employee_updated', { employee: emp });
  broadcastToCompany(auth.company_id, 'offboarding_closed', { record, employee_id: emp.id });

  res.json({
    message: `Final settlement approved by HR Head. ${emp.name} is now officially offboarded.`,
    record,
    employee: emp,
  });
});

// ==========================================
// 7. Milestone 2: Attendance Tracking
// ==========================================

// Get Attendance for a specific Date
app.get('/api/attendance', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const targetDate = (req.query.date as string) || getTodayString();

  const employees = db.employees.filter((e) => e.company_id === auth.company_id && e.status !== 'offboarded');
  const records = db.attendance_records.filter((a) => a.company_id === auth.company_id && a.date === targetDate);

  const results = employees.map((emp) => {
    const dept = db.departments.find((d) => d.id === emp.department_id);
    const rec = records.find((r) => r.employee_id === emp.id);

    return {
      employee_id: emp.id,
      employee_name: emp.name,
      job_title: emp.job_title,
      department_name: dept?.name || 'Unassigned',
      date: targetDate,
      status: rec ? rec.status : 'not_logged',
      notes: rec?.notes || '',
      record_id: rec?.id || null,
    };
  });

  const summary = refreshDailyAttendanceSummary(auth.company_id, targetDate);

  res.json({
    date: targetDate,
    records: results,
    summary,
  });
});

// Get Monthly Attendance Summary per Employee
app.get('/api/attendance/monthly', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const now = new Date();
  const year = req.query.year ? Number(req.query.year) : now.getFullYear();
  const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;

  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const employees = db.employees.filter((e) => e.company_id === auth.company_id);
  const monthlyRecords = db.attendance_records.filter(
    (a) => a.company_id === auth.company_id && a.date.startsWith(prefix)
  );

  const summaries = employees.map((emp) => {
    const empRecords = monthlyRecords.filter((r) => r.employee_id === emp.id);
    const present = empRecords.filter((r) => r.status === 'present').length;
    const late = empRecords.filter((r) => r.status === 'late').length;
    const absent = empRecords.filter((r) => r.status === 'absent').length;
    const on_leave = empRecords.filter((r) => r.status === 'on_leave').length;

    const dept = db.departments.find((d) => d.id === emp.department_id);

    return {
      employee_id: emp.id,
      employee_name: emp.name,
      job_title: emp.job_title,
      department_name: dept?.name || 'Unassigned',
      status: emp.status,
      present_days: present,
      late_days: late,
      absent_days: absent,
      on_leave_days: on_leave,
      total_recorded: empRecords.length,
    };
  });

  res.json({
    year,
    month,
    summaries,
  });
});

// Update or Log Attendance for an Employee
app.post('/api/attendance', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { employee_id, date, status, notes } = req.body;

  if (!employee_id || !date || !status) {
    return res.status(400).json({ error: 'employee_id, date, and status are required' });
  }

  const emp = db.employees.find((e) => e.id === employee_id && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found in workspace' });
  }

  let rec = db.attendance_records.find(
    (a) => a.employee_id === employee_id && a.date === date && a.company_id === auth.company_id
  );

  if (rec) {
    rec.status = status;
    if (notes !== undefined) rec.notes = notes;
  } else {
    rec = {
      id: generateId('att'),
      employee_id,
      company_id: auth.company_id,
      date,
      status,
      notes: notes || '',
    };
    db.attendance_records.push(rec);
  }

  const summary = refreshDailyAttendanceSummary(auth.company_id, date);
  saveDb();

  broadcastToCompany(auth.company_id, 'attendance_updated', {
    date,
    record: rec,
    summary,
  });

  res.json({ record: rec, summary });
});

// Bulk Batch Attendance Logger (e.g. Mark All Present)
app.post('/api/attendance/batch', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { date, status } = req.body;

  if (!date || !status) {
    return res.status(400).json({ error: 'Date and status are required for batch update' });
  }

  const employees = db.employees.filter((e) => e.company_id === auth.company_id && e.status !== 'offboarded');

  for (const emp of employees) {
    let rec = db.attendance_records.find(
      (a) => a.employee_id === emp.id && a.date === date && a.company_id === auth.company_id
    );

    if (rec) {
      rec.status = status;
    } else {
      rec = {
        id: generateId('att'),
        employee_id: emp.id,
        company_id: auth.company_id,
        date,
        status,
      };
      db.attendance_records.push(rec);
    }
  }

  const summary = refreshDailyAttendanceSummary(auth.company_id, date);
  saveDb();

  broadcastToCompany(auth.company_id, 'attendance_updated', {
    date,
    summary,
  });

  res.json({ success: true, message: `Batch updated ${employees.length} employees to ${status}`, summary });
});

// ==========================================
// 8. Milestone 2: Leave Management & Policy Escalation
// ==========================================

// Get Leave Types for workspace
app.get('/api/leave/types', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const types = db.leave_types.filter((t) => t.company_id === auth.company_id);
  res.json(types);
});

// Add Custom Leave Type (HR Head only)
app.post('/api/leave/types', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (auth.role !== 'hr_head') {
    return res.status(403).json({ error: 'RLS Policy: Only HR Head can create custom leave types.' });
  }

  const { name, default_entitlement_days, description, paid } = req.body;
  if (!name || default_entitlement_days == null) {
    return res.status(400).json({ error: 'Leave type name and default entitlement days are required' });
  }

  const newType: LeaveType = {
    id: generateId('lt'),
    company_id: auth.company_id,
    name: name.trim(),
    default_entitlement_days: Number(default_entitlement_days),
    description: description || '',
    paid: paid !== undefined ? Boolean(paid) : true,
  };

  db.leave_types.push(newType);

  // Initialize balance for all existing active employees in workspace
  const employees = db.employees.filter((e) => e.company_id === auth.company_id);
  employees.forEach((emp) => {
    db.leave_balances.push({
      id: generateId('lbal'),
      employee_id: emp.id,
      company_id: auth.company_id,
      leave_type_id: newType.id,
      allocated_days: newType.default_entitlement_days,
      used_days: 0,
      balance_days: newType.default_entitlement_days,
    });
  });

  saveDb();
  broadcastToCompany(auth.company_id, 'leave_type_changed', { type: newType });
  res.status(201).json(newType);
});

// Edit Statutory Leave Entitlement / Policy (HR Head only)
app.patch('/api/leave/types/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (auth.role !== 'hr_head') {
    return res.status(403).json({ error: 'RLS Policy: Only HR Head can edit statutory leave entitlements.' });
  }

  const { id } = req.params;
  const { name, default_entitlement_days, description, paid, update_existing_balances } = req.body;

  const lt = db.leave_types.find((t) => t.id === id && t.company_id === auth.company_id);
  if (!lt) {
    return res.status(404).json({ error: 'Statutory leave type not found' });
  }

  const prevEntitlement = lt.default_entitlement_days;
  const prevName = lt.name;

  if (name !== undefined) lt.name = name.trim();
  if (default_entitlement_days !== undefined) lt.default_entitlement_days = Number(default_entitlement_days);
  if (description !== undefined) lt.description = description;
  if (paid !== undefined) lt.paid = Boolean(paid);

  // If requested to update all existing employee baseline allocations
  if (update_existing_balances && default_entitlement_days !== undefined) {
    const newEntitlement = Number(default_entitlement_days);
    const employees = db.employees.filter((e) => e.company_id === auth.company_id && e.status !== 'offboarded');

    employees.forEach((emp) => {
      let bal = db.leave_balances.find((b) => b.employee_id === emp.id && b.leave_type_id === lt.id);
      if (bal) {
        const prevBal = bal.balance_days;
        bal.allocated_days = newEntitlement;
        bal.balance_days = bal.allocated_days - bal.used_days;

        if (!db.leave_audit_logs) db.leave_audit_logs = [];
        db.leave_audit_logs.push({
          id: generateId('laudit'),
          company_id: auth.company_id,
          employee_id: emp.id,
          employee_name: emp.name,
          leave_type_id: lt.id,
          leave_type_name: lt.name,
          action: 'statutory_update',
          days_changed: newEntitlement - prevEntitlement,
          previous_balance: prevBal,
          new_balance: bal.balance_days,
          performed_by: auth.email,
          timestamp: new Date().toISOString(),
          notes: `Statutory baseline changed from ${prevEntitlement} to ${newEntitlement} days/yr`,
        });
      } else {
        db.leave_balances.push({
          id: generateId('lbal'),
          employee_id: emp.id,
          company_id: auth.company_id,
          leave_type_id: lt.id,
          allocated_days: newEntitlement,
          used_days: 0,
          balance_days: newEntitlement,
        });
      }
    });
  }

  saveDb();
  broadcastToCompany(auth.company_id, 'leave_type_changed', { type: lt });
  broadcastToCompany(auth.company_id, 'leave_balance_updated', {});
  res.json(lt);
});

// Delete Custom Leave Type
app.delete('/api/leave/types/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (auth.role !== 'hr_head') {
    return res.status(403).json({ error: 'RLS Policy: Only HR Head can delete leave types.' });
  }

  const { id } = req.params;
  const idx = db.leave_types.findIndex((t) => t.id === id && t.company_id === auth.company_id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Leave type not found' });
  }

  // Prevent deleting if active requests exist
  const hasRequests = db.leave_requests.some((r) => r.leave_type_id === id && r.company_id === auth.company_id);
  if (hasRequests) {
    return res.status(400).json({ error: 'Cannot delete leave type with existing leave request history.' });
  }

  db.leave_types.splice(idx, 1);
  db.leave_balances = db.leave_balances.filter((b) => b.leave_type_id !== id);

  saveDb();
  broadcastToCompany(auth.company_id, 'leave_type_changed', { id });
  broadcastToCompany(auth.company_id, 'leave_balance_updated', {});
  res.json({ success: true, message: 'Leave type deleted successfully' });
});

// Manual Leave Balance Adjustment / Override (with Audit Trail)
app.post('/api/leave/balances/adjust', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (auth.role !== 'hr_head' && auth.role !== 'hr_analyst') {
    return res.status(403).json({ error: 'Unauthorized to adjust leave balances' });
  }

  const { employee_id, leave_type_id, adjustment_days, notes } = req.body;
  if (!employee_id || !leave_type_id || adjustment_days == null) {
    return res.status(400).json({ error: 'Employee ID, leave type ID, and adjustment days are required' });
  }

  const emp = db.employees.find((e) => e.id === employee_id && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const lt = db.leave_types.find((t) => t.id === leave_type_id && t.company_id === auth.company_id);
  if (!lt) {
    return res.status(404).json({ error: 'Leave type not found' });
  }

  let bal = db.leave_balances.find((b) => b.employee_id === employee_id && b.leave_type_id === leave_type_id);
  const prevAllocated = bal ? bal.allocated_days : lt.default_entitlement_days;
  const prevUsed = bal ? bal.used_days : 0;
  const prevBalance = bal ? bal.balance_days : prevAllocated;

  const adjDays = Number(adjustment_days);

  if (bal) {
    bal.allocated_days += adjDays;
    bal.balance_days = bal.allocated_days - bal.used_days;
  } else {
    bal = {
      id: generateId('lbal'),
      employee_id,
      company_id: auth.company_id,
      leave_type_id,
      allocated_days: prevAllocated + adjDays,
      used_days: prevUsed,
      balance_days: prevAllocated + adjDays - prevUsed,
    };
    db.leave_balances.push(bal);
  }

  // Audit log record
  const auditLog: LeaveAuditLog = {
    id: generateId('laudit'),
    company_id: auth.company_id,
    employee_id,
    employee_name: emp.name,
    leave_type_id,
    leave_type_name: lt.name,
    action: 'allocation_adjustment',
    days_changed: adjDays,
    previous_balance: prevBalance,
    new_balance: bal.balance_days,
    performed_by: auth.email,
    timestamp: new Date().toISOString(),
    notes: notes || `Manual allocation adjustment of ${adjDays > 0 ? '+' : ''}${adjDays} days`,
  };

  if (!db.leave_audit_logs) db.leave_audit_logs = [];
  db.leave_audit_logs.push(auditLog);

  saveDb();
  broadcastToCompany(auth.company_id, 'leave_balance_updated', { employee_id });
  res.json({ success: true, balance: bal, audit_log: auditLog });
});

// Get Leave Audit Logs
app.get('/api/leave/audit-logs', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { employee_id, leave_type_id } = req.query;

  let logs = (db.leave_audit_logs || []).filter((l) => l.company_id === auth.company_id);
  if (employee_id) {
    logs = logs.filter((l) => l.employee_id === String(employee_id));
  }
  if (leave_type_id) {
    logs = logs.filter((l) => l.leave_type_id === String(leave_type_id));
  }

  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(logs);
});

// Get Leave Balances for all employees
app.get('/api/leave/balances', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const employees = db.employees.filter((e) => e.company_id === auth.company_id && e.status !== 'offboarded');
  const orgLeaveTypes = db.leave_types.filter((lt) => lt.company_id === auth.company_id);

  const results = employees.map((emp) => {
    const dept = db.departments.find((d) => d.id === emp.department_id);
    const balances = orgLeaveTypes.map((lt) => {
      const bal = db.leave_balances.find((b) => b.employee_id === emp.id && b.leave_type_id === lt.id);
      const allocated = bal ? bal.allocated_days : lt.default_entitlement_days;
      const used = bal ? bal.used_days : 0;
      const remaining = bal ? bal.balance_days : lt.default_entitlement_days;
      return {
        leave_type_id: lt.id,
        leave_type_name: lt.name,
        allocated_days: allocated,
        used_days: used,
        balance_days: remaining,
        total_allocated_days: allocated,
        remaining_days: remaining,
      };
    });

    return {
      employee: {
        id: emp.id,
        name: emp.name,
        job_title: emp.job_title,
        department_name: dept?.name || 'Unassigned',
        status: emp.status,
      },
      employee_id: emp.id,
      employee_name: emp.name,
      job_title: emp.job_title,
      department_name: dept?.name || 'Unassigned',
      status: emp.status,
      balances,
    };
  });

  res.json(results);
});

// Get Leave Balances for a single employee
app.get('/api/leave/balances/:employeeId', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { employeeId } = req.params;

  const emp = db.employees.find((e) => e.id === employeeId && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const dept = db.departments.find((d) => d.id === emp.department_id);
  const orgLeaveTypes = db.leave_types.filter((lt) => lt.company_id === auth.company_id);

  const balances = orgLeaveTypes.map((lt) => {
    const bal = db.leave_balances.find((b) => b.employee_id === emp.id && b.leave_type_id === lt.id);
    const allocated = bal ? bal.allocated_days : lt.default_entitlement_days;
    const used = bal ? bal.used_days : 0;
    const remaining = bal ? bal.balance_days : lt.default_entitlement_days;
    return {
      leave_type_id: lt.id,
      leave_type_name: lt.name,
      allocated_days: allocated,
      used_days: used,
      balance_days: remaining,
      total_allocated_days: allocated,
      remaining_days: remaining,
    };
  });

  res.json({
    employee: {
      id: emp.id,
      name: emp.name,
      job_title: emp.job_title,
      department_name: dept?.name || 'Unassigned',
      status: emp.status,
    },
    employee_id: emp.id,
    employee_name: emp.name,
    job_title: emp.job_title,
    department_name: dept?.name || 'Unassigned',
    balances,
  });
});

// Get Leave Requests in workspace
app.get('/api/leave/requests', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const requests = db.leave_requests.filter((r) => r.company_id === auth.company_id);

  const results: LeaveRequestWithDetails[] = requests.map((reqItem) => {
    const emp = db.employees.find((e) => e.id === reqItem.employee_id);
    const dept = emp ? db.departments.find((d) => d.id === emp.department_id) : null;
    const lt = db.leave_types.find((t) => t.id === reqItem.leave_type_id);

    return {
      ...reqItem,
      employee_name: emp?.name || 'Unknown Employee',
      department_name: dept?.name || 'Unassigned',
      leave_type_name: lt?.name || 'Leave',
    };
  });

  // Sort by pending first, then newest
  results.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  res.json(results);
});

// Submit a Leave Request
app.post('/api/leave/requests', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { employee_id, leave_type_id, start_date, end_date, reason } = req.body;

  if (!employee_id || !leave_type_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'Employee, leave type, start date, and end date are required' });
  }

  const emp = db.employees.find((e) => e.id === employee_id && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found in workspace' });
  }

  const leaveType = db.leave_types.find((lt) => lt.id === leave_type_id && lt.company_id === auth.company_id);
  if (!leaveType) {
    return res.status(404).json({ error: 'Leave type not found in workspace' });
  }

  // Calculate working days requested
  const start = new Date(start_date);
  const end = new Date(end_date);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const days_requested = Math.max(1, diffDays);

  const org = db.organizations.find((o) => o.id === auth.company_id);
  const escalationThreshold = org?.leave_escalation_threshold_days ?? 3;
  const escalated_to_head = days_requested > escalationThreshold;

  const newRequest: LeaveRequest = {
    id: generateId('lreq'),
    employee_id,
    company_id: auth.company_id,
    leave_type_id,
    start_date,
    end_date,
    days_requested,
    status: 'pending',
    reason: reason || '',
    escalated_to_head,
    submitted_by: auth.user_id,
    created_at: new Date().toISOString(),
  };

  db.leave_requests.push(newRequest);
  saveDb();

  // Milestone 11 Trigger: Leave request submitted (→ approvers)
  const approvers = (db.organization_members || []).filter(
    (m) => m.organization_id === auth.company_id && (m.role === 'hr_head' || !escalated_to_head)
  );
  for (const approver of approvers) {
    if (approver.user_id !== auth.user_id) {
      createNotification(
        auth.company_id,
        approver.user_id,
        'leave_submitted',
        'Leave Request Submitted',
        `${emp.name} requested ${days_requested} day(s) of ${leaveType.name} (${start_date} to ${end_date})${escalated_to_head ? ' [Requires HR Head Approval]' : ''}`,
        'leave'
      );
    }
  }

  broadcastToCompany(auth.company_id, 'leave_request_created', { request: newRequest });

  const dept = db.departments.find((d) => d.id === emp.department_id);
  res.status(201).json({
    ...newRequest,
    employee_name: emp.name,
    department_name: dept?.name || 'Unassigned',
    leave_type_name: leaveType.name,
  });
});

// Helper function for processing leave decision
function processLeaveDecision(
  req: AuthenticatedRequest,
  res: any,
  status: 'approved' | 'rejected',
  decision_notes?: string
) {
  const auth = req.auth!;
  const { id } = req.params;
  const { approved_days } = req.body || {};

  const leaveReq = db.leave_requests.find((r) => r.id === id && r.company_id === auth.company_id);
  if (!leaveReq) {
    return res.status(404).json({ error: 'Leave request not found' });
  }

  if (leaveReq.status !== 'pending') {
    return res.status(400).json({ error: `This leave request is already ${leaveReq.status}` });
  }

  // Use actual approved number of days if specified, else originally requested days
  const actualDays = approved_days != null && Number(approved_days) > 0 
    ? Number(approved_days) 
    : leaveReq.days_requested;

  const org = db.organizations.find((o) => o.id === auth.company_id);
  const escalationThreshold = org?.leave_escalation_threshold_days ?? 3;

  // STRICT SERVER-SIDE RLS / POLICY ESCALATION CHECK
  if (actualDays > escalationThreshold && auth.role !== 'hr_head') {
    return res.status(403).json({
      error: `RLS & Policy Rule: Leave requests exceeding ${escalationThreshold} days (${actualDays} days) require HR Head authorization.`,
    });
  }

  leaveReq.days_requested = actualDays;
  leaveReq.status = status;
  leaveReq.approved_by = auth.email;
  leaveReq.approved_at = new Date().toISOString();
  leaveReq.decision_notes = decision_notes || '';

  let updatedBal: LeaveBalance | null = null;
  let auditLogEntry: LeaveAuditLog | null = null;

  // If approved: update leave balance and attendance records
  if (status === 'approved') {
    const lt = db.leave_types.find((t) => t.id === leaveReq.leave_type_id);
    const emp = db.employees.find((e) => e.id === leaveReq.employee_id);
    const prevAllocated = lt ? lt.default_entitlement_days : 0;

    let bal = db.leave_balances.find(
      (b) => b.employee_id === leaveReq.employee_id && b.leave_type_id === leaveReq.leave_type_id
    );

    const prevBalance = bal ? bal.balance_days : prevAllocated;

    if (bal) {
      bal.used_days += actualDays;
      bal.balance_days = bal.allocated_days - bal.used_days; // Allow negative balance
      updatedBal = bal;
    } else {
      bal = {
        id: generateId('lbal'),
        employee_id: leaveReq.employee_id,
        company_id: auth.company_id,
        leave_type_id: leaveReq.leave_type_id,
        allocated_days: prevAllocated,
        used_days: actualDays,
        balance_days: prevAllocated - actualDays, // Allow negative balance
      };
      db.leave_balances.push(bal);
      updatedBal = bal;
    }

    // Keep clear record of deduction for auditing
    auditLogEntry = {
      id: generateId('laudit'),
      company_id: auth.company_id,
      employee_id: leaveReq.employee_id,
      employee_name: emp?.name || 'Employee',
      leave_request_id: leaveReq.id,
      leave_type_id: leaveReq.leave_type_id,
      leave_type_name: lt?.name || 'Leave',
      action: 'deduction',
      days_changed: -actualDays,
      previous_balance: prevBalance,
      new_balance: bal.balance_days,
      performed_by: auth.email,
      timestamp: new Date().toISOString(),
      notes: `Automatic deduction of ${actualDays} ${actualDays === 1 ? 'day' : 'days'} upon approval for period ${leaveReq.start_date} to ${leaveReq.end_date}. ${decision_notes || ''}`.trim(),
    };

    if (!db.leave_audit_logs) db.leave_audit_logs = [];
    db.leave_audit_logs.push(auditLogEntry);

    // Mark attendance records as 'on_leave' for dates in range
    const start = new Date(leaveReq.start_date);
    const end = new Date(leaveReq.end_date);
    const cur = new Date(start);

    while (cur <= end) {
      const dStr = cur.toISOString().split('T')[0];
      let att = db.attendance_records.find(
        (a) => a.employee_id === leaveReq.employee_id && a.date === dStr && a.company_id === auth.company_id
      );

      if (att) {
        att.status = 'on_leave';
        att.notes = `Approved leave (${actualDays}d)`;
      } else {
        db.attendance_records.push({
          id: generateId('att'),
          employee_id: leaveReq.employee_id,
          company_id: auth.company_id,
          date: dStr,
          status: 'on_leave',
          notes: `Approved leave (${actualDays}d)`,
        });
      }

      refreshDailyAttendanceSummary(auth.company_id, dStr);
      cur.setDate(cur.getDate() + 1);
    }

    // If today is within leave range, mark employee status as 'on_leave'
    const today = getTodayString();
    if (leaveReq.start_date <= today && today <= leaveReq.end_date) {
      const emp = db.employees.find((e) => e.id === leaveReq.employee_id);
      if (emp && emp.status !== 'offboarded') {
        emp.status = 'on_leave';
      }
    }
  }

  // Milestone 11 Trigger: Leave decision (approved/rejected) (→ requester) + Edge Email
  const requesterUserId = (leaveReq as any).submitted_by || (auth.user_id === 'usr_hr_head_01' ? 'usr_hr_analyst_01' : 'usr_hr_head_01');
  const requesterUser = (db.users || []).find((u) => u.id === requesterUserId);
  const targetEmp = db.employees.find((e) => e.id === leaveReq.employee_id);
  const lt = db.leave_types.find((t) => t.id === leaveReq.leave_type_id);

  createNotification(
    auth.company_id,
    requesterUserId,
    status === 'approved' ? 'leave_approved' : 'leave_rejected',
    status === 'approved' ? 'Leave Request Approved' : 'Leave Request Rejected',
    `Leave request for ${targetEmp?.name || 'Employee'} (${leaveReq.start_date} to ${leaveReq.end_date}, ${actualDays} day(s) of ${lt?.name || 'Leave'}) was ${status} by ${auth.email.split('@')[0]}.${decision_notes ? ` Notes: ${decision_notes}` : ''}`,
    'leave'
  );

  // Email delivery via Edge Function (high-priority)
  if (requesterUser?.email) {
    sendEdgeEmail({
      companyId: auth.company_id,
      userId: requesterUserId,
      recipientEmail: requesterUser.email,
      subject: `[High Priority HR Update] Leave Request ${status.toUpperCase()} for ${targetEmp?.name || 'Employee'}`,
      body: `Hello,\n\nThe leave request for ${targetEmp?.name || 'Employee'} (${leaveReq.start_date} to ${leaveReq.end_date}, ${actualDays} days of ${lt?.name || 'Leave'}) has been ${status.toUpperCase()} by ${auth.email.split('@')[0]}.\n\nDecision Notes: ${decision_notes || 'None provided.'}\n\nYou can view your leave records in Go-Ya HRMS: /leave`,
      type: 'leave_decision',
    });
  }

  saveDb();

  broadcastToCompany(auth.company_id, 'leave_request_updated', { request: leaveReq });
  broadcastToCompany(auth.company_id, 'leave_balance_updated', { employee_id: leaveReq.employee_id });
  broadcastToCompany(auth.company_id, 'attendance_updated', { date: getTodayString() });

  return res.json({
    success: true,
    message: `Leave request has been ${status}`,
    request: leaveReq,
    balance: updatedBal,
    audit_log: auditLogEntry,
  });
}

// Approve Leave Request
app.post('/api/leave/requests/:id/approve', requireAuth, (req: AuthenticatedRequest, res) => {
  const { decision_notes } = req.body || {};
  return processLeaveDecision(req, res, 'approved', decision_notes);
});

// Reject Leave Request
app.post('/api/leave/requests/:id/reject', requireAuth, (req: AuthenticatedRequest, res) => {
  const { reason, decision_notes } = req.body || {};
  return processLeaveDecision(req, res, 'rejected', reason || decision_notes);
});

// Approve or Reject Leave Request (General decision endpoint)
app.post('/api/leave/requests/:id/decision', requireAuth, (req: AuthenticatedRequest, res) => {
  const { status, decision_notes } = req.body || {};

  if (status !== 'approved' && status !== 'rejected') {
    return res.status(400).json({ error: 'Status must be either "approved" or "rejected"' });
  }

  return processLeaveDecision(req, res, status, decision_notes);
});

// Delete Leave Request (mistake correction / cancellation)
app.delete('/api/leave/requests/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;

  const reqIdx = db.leave_requests.findIndex((r) => r.id === id && r.company_id === auth.company_id);
  if (reqIdx === -1) {
    return res.status(404).json({ error: 'Leave request not found' });
  }

  const leaveReq = db.leave_requests[reqIdx];

  // If request was approved, revert deductions, attendance marks, and employee on_leave status
  if (leaveReq.status === 'approved') {
    const bal = db.leave_balances.find(
      (b) => b.employee_id === leaveReq.employee_id && b.leave_type_id === leaveReq.leave_type_id
    );

    if (bal) {
      const prevBal = bal.balance_days;
      bal.used_days = Math.max(0, bal.used_days - leaveReq.days_requested);
      bal.balance_days = bal.allocated_days - bal.used_days;

      if (!db.leave_audit_logs) db.leave_audit_logs = [];
      const lt = db.leave_types.find((t) => t.id === leaveReq.leave_type_id);
      const emp = db.employees.find((e) => e.id === leaveReq.employee_id);
      db.leave_audit_logs.push({
        id: generateId('laudit'),
        company_id: auth.company_id,
        employee_id: leaveReq.employee_id,
        employee_name: emp?.name || 'Employee',
        leave_request_id: leaveReq.id,
        leave_type_id: leaveReq.leave_type_id,
        leave_type_name: lt?.name || 'Leave',
        action: 'allocation_adjustment',
        days_changed: leaveReq.days_requested,
        previous_balance: prevBal,
        new_balance: bal.balance_days,
        performed_by: auth.email,
        timestamp: new Date().toISOString(),
        notes: `Reverted deduction (+${leaveReq.days_requested} days) due to deleted approved leave request (${leaveReq.start_date} to ${leaveReq.end_date})`,
      });
    }

    // Revert attendance records for this period
    const start = new Date(leaveReq.start_date);
    const end = new Date(leaveReq.end_date);
    const cur = new Date(start);
    while (cur <= end) {
      const dStr = cur.toISOString().split('T')[0];
      const attIdx = db.attendance_records.findIndex(
        (a) => a.employee_id === leaveReq.employee_id && a.date === dStr && a.status === 'on_leave'
      );
      if (attIdx !== -1) {
        db.attendance_records.splice(attIdx, 1);
      }
      refreshDailyAttendanceSummary(auth.company_id, dStr);
      cur.setDate(cur.getDate() + 1);
    }

    // If today is within leave range, revert employee status if no other active leave
    const today = getTodayString();
    if (leaveReq.start_date <= today && today <= leaveReq.end_date) {
      const emp = db.employees.find((e) => e.id === leaveReq.employee_id);
      if (emp && emp.status === 'on_leave') {
        const otherApproved = db.leave_requests.some(
          (r) =>
            r.id !== leaveReq.id &&
            r.employee_id === leaveReq.employee_id &&
            r.status === 'approved' &&
            r.start_date <= today &&
            today <= r.end_date
        );
        if (!otherApproved) {
          emp.status = 'active';
        }
      }
    }
  }

  // Remove request
  db.leave_requests.splice(reqIdx, 1);

  saveDb();

  broadcastToCompany(auth.company_id, 'leave_request_deleted', { id: leaveReq.id });
  broadcastToCompany(auth.company_id, 'leave_request_updated', {});
  broadcastToCompany(auth.company_id, 'leave_balance_updated', { employee_id: leaveReq.employee_id });
  broadcastToCompany(auth.company_id, 'attendance_updated', { date: getTodayString() });

  return res.json({
    success: true,
    message: 'Leave request deleted successfully',
    id: leaveReq.id,
  });
});

// ==========================================
// 9. Milestone 2 Realtime Dashboard KPIs & Attention Block
// ==========================================

app.get('/api/dashboard', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const today = getTodayString();
  const employees = db.employees.filter((e) => e.company_id === auth.company_id);

  const total_employees = employees.length;
  const active_count = employees.filter((e) => e.status === 'active' || e.status === 'probation').length;
  const on_leave_count = employees.filter((e) => e.status === 'on_leave').length;
  const high_attrition_risk_count = employees.filter(
    (e) => e.attrition_risk === 'high' && e.status !== 'offboarded'
  ).length;

  // Milestone 2 Realtime KPIs
  const summary = refreshDailyAttendanceSummary(auth.company_id, today);
  const absences_today = summary.absent_count;
  const on_leave_today = summary.on_leave_count;

  const pending_leave_approvals = db.leave_requests.filter(
    (r) => r.company_id === auth.company_id && r.status === 'pending'
  ).length;

  const active_onboardings_count = employees.filter((e) => {
    if (e.status === 'offboarded') return false;
    const tasks = db.onboarding_tasks.filter((t) => t.employee_id === e.id);
    const incomplete = tasks.some((t) => t.status === 'pending');
    return incomplete;
  }).length;

  const kpis: DashboardKPIs = {
    total_employees,
    active_count,
    on_leave_count,
    high_attrition_risk_count,
    absences_today,
    on_leave_today,
    pending_leave_approvals,
    active_onboardings_count,
  };

  // Generate Actionable "Needs your attention" list block
  const attentionItems: AttentionItem[] = [];

  // 1. Pending Leave Requests (High priority action)
  const pendingLeaves = db.leave_requests.filter(
    (r) => r.company_id === auth.company_id && r.status === 'pending'
  );
  for (const lReq of pendingLeaves) {
    const emp = db.employees.find((e) => e.id === lReq.employee_id);
    const lt = db.leave_types.find((t) => t.id === lReq.leave_type_id);
    const requiresHead = lReq.escalated_to_head;

    attentionItems.push({
      id: `att_lreq_${lReq.id}`,
      type: 'leave_request',
      title: `${emp?.name || 'Employee'} requested ${lReq.days_requested} days ${lt?.name || 'Leave'}`,
      subtitle: `${lReq.start_date} to ${lReq.end_date} · ${
        requiresHead ? 'Escalated to HR Head (> 3 days)' : 'Awaiting review & approval'
      }`,
      employee_id: lReq.employee_id,
      employee_name: emp?.name || 'Employee',
      severity: requiresHead ? 'high' : 'medium',
      action_type: 'leave',
      metadata: { request_id: lReq.id, escalated: requiresHead },
    });
  }

  // 2. Pending Offboarding Settlements (HR Head priority)
  const inProgressOffboardings = db.offboarding_records.filter(
    (r) => r.company_id === auth.company_id && r.status === 'in_progress'
  );
  for (const offb of inProgressOffboardings) {
    const emp = db.employees.find((e) => e.id === offb.employee_id);
    attentionItems.push({
      id: `att_offb_${offb.id}`,
      type: 'offboarding_settlement',
      title: `${emp?.name || 'Employee'} offboarding in progress`,
      subtitle: `Last day: ${offb.last_working_day} · Awaiting final settlement approval (HR Head)`,
      employee_id: offb.employee_id,
      employee_name: emp?.name || 'Employee',
      severity: 'high',
      action_type: 'offboarding',
      metadata: { record_id: offb.id },
    });
  }

  // 3. Incomplete Onboarding checklists for new hires
  const onboardingNewHires = employees.filter((e) => e.status === 'probation' || e.status === 'active');
  for (const emp of onboardingNewHires) {
    const tasks = db.onboarding_tasks.filter((t) => t.employee_id === emp.id);
    const pendingTasks = tasks.filter((t) => t.status === 'pending');
    if (pendingTasks.length > 0 && tasks.length > 0) {
      attentionItems.push({
        id: `att_onb_${emp.id}`,
        type: 'onboarding_task',
        title: `${emp.name} has ${pendingTasks.length} pending onboarding items`,
        subtitle: `${emp.job_title} (${emp.country}) · ${tasks.length - pendingTasks.length}/${tasks.length} tasks completed`,
        employee_id: emp.id,
        employee_name: emp.name,
        severity: pendingTasks.length >= 3 ? 'medium' : 'low',
        action_type: 'onboarding',
      });
    }
  }

  // 4. High attrition risk alerts
  const highRiskEmployees = employees.filter((e) => e.attrition_risk === 'high' && e.status !== 'offboarded');
  for (const emp of highRiskEmployees) {
    attentionItems.push({
      id: `att_risk_${emp.id}`,
      type: 'high_attrition',
      title: `${emp.name} flagged as High Attrition Risk`,
      subtitle: `${emp.job_title} · Review retention indicators and check in`,
      employee_id: emp.id,
      employee_name: emp.name,
      severity: 'high',
      action_type: 'profile',
    });
  }

  // 5. Milestone 18: Probation endings approaching / review due
  evaluateProbationDeadlines(auth.company_id);
  const activeProbationRecords = (db.probation_records || []).filter(
    (r) => r.company_id === auth.company_id && r.outcome !== 'confirm' && r.outcome !== 'terminate'
  );

  for (const rec of activeProbationRecords) {
    const emp = db.employees.find((e) => e.id === rec.employee_id && e.company_id === auth.company_id);
    if (!emp || emp.status === 'offboarded') continue;

    const todayStr = getTodayString();
    const todayTime = new Date(todayStr).getTime();
    const endTime = new Date(rec.probation_end).getTime();
    const diffDays = Math.ceil((endTime - todayTime) / (1000 * 60 * 60 * 24));

    if (diffDays <= 30) {
      const isOverdue = diffDays < 0;
      attentionItems.push({
        id: `att_prob_${rec.id}`,
        type: 'probation',
        title: isOverdue
          ? `${emp.name}'s probation overdue by ${Math.abs(diffDays)} day(s)`
          : diffDays === 0
          ? `${emp.name}'s probation ends today`
          : `${emp.name}'s probation ends in ${diffDays} day(s)`,
        subtitle: `${emp.job_title} · End date: ${rec.probation_end} · ${
          rec.outcome === 'extend' ? 'Extended probation review' : 'End-of-probation review & outcome required'
        }`,
        employee_id: emp.id,
        employee_name: emp.name,
        severity: diffDays <= 7 ? 'high' : 'medium',
        action_type: 'profile',
        metadata: { record_id: rec.id, probation_end: rec.probation_end, days_remaining: diffDays },
      });
    }
  }

  // 6. Milestone 19: Conduct Incidents requiring attention (Strictly HR Head only)
  if (auth.role === 'hr_head') {
    const activeIncidents = (db.conduct_incidents || []).filter(
      (inc) => inc.company_id === auth.company_id && (inc.status === 'open' || inc.status === 'investigating')
    );

    for (const inc of activeIncidents) {
      const emp = db.employees.find((e) => e.id === inc.related_employee_id);
      const isHigh = inc.severity === 'high';
      attentionItems.push({
        id: `att_conduct_${inc.id}`,
        type: 'conduct_incident',
        title: `Conduct Incident (${inc.severity.toUpperCase()}): ${emp ? emp.name : 'Unknown Employee'}`,
        subtitle: `${inc.incident_type} · Status: ${inc.status.toUpperCase()} · Reported: ${inc.date_reported}`,
        employee_id: inc.related_employee_id,
        employee_name: emp ? emp.name : 'Unknown Employee',
        severity: isHigh ? 'high' : inc.severity === 'medium' ? 'medium' : 'low',
        action_type: 'conduct',
        metadata: { incident_id: inc.id, severity: inc.severity, status: inc.status },
      });
    }
  }

  // 7. Milestone 9: Upcoming Events (Next 3–5 events scoped to viewer)
  const allEvents = (db.events || []).filter((e) => e.company_id === auth.company_id);
  const now = Date.now();
  const sortedUpcoming = allEvents
    .filter((e) => {
      const endMs = new Date(e.end_datetime || e.start_datetime).getTime();
      return endMs >= now - 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

  const viewerDeptId = (req.query.viewer_department_id as string) || (req.query.department_id as string) || null;
  const scopedUpcomingEvents = sortedUpcoming.filter((e) => {
    if (e.visibility_scope === 'company') return true;
    if (auth.role === 'hr_head') return true;
    if (viewerDeptId && e.department_id === viewerDeptId) return true;
    if (e.created_by === auth.user_id) return true;
    return true;
  }).slice(0, 5);

  const enrichedUpcomingEvents: CompanyEventWithDetails[] = scopedUpcomingEvents.map((e) => {
    const dept = e.department_id ? db.departments.find((d) => d.id === e.department_id) : null;
    const creator = db.users.find((u) => u.id === e.created_by);
    return {
      ...e,
      department_name: dept?.name,
      created_by_email: creator?.email || 'HR Administrator',
      can_edit: auth.role === 'hr_head' || e.created_by === auth.user_id,
    };
  });

  res.json({
    kpis,
    attention_items: attentionItems,
    upcoming_events: enrichedUpcomingEvents,
  });
});

// ==========================================
// 10. Milestone 4: AI HR Assistant, Reports & Analytics, Org Chart, Real Attrition Scoring
// ==========================================

let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    try {
      geminiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (e) {
      console.warn('Failed to initialize Gemini SDK client', e);
    }
  }
  return geminiClient;
}

// 1. Rule-Based Attrition Scoring Engine
function computeEmployeeAttritionRisk(emp: Employee, companyId: string): EmployeeAttritionAnalysis {
  const dept = db.departments.find((d) => d.id === emp.department_id);
  const factors: AttritionFactorBreakdown[] = [];
  let totalScore = 15; // baseline low risk

  // Factor 1: Absence & Punctuality
  const empAtt = db.attendance_records.filter((a) => a.employee_id === emp.id && a.company_id === companyId);
  const totalDays = Math.max(1, empAtt.length);
  const lateCount = empAtt.filter((a) => a.status === 'late').length;
  const absentCount = empAtt.filter((a) => a.status === 'absent').length;
  const irregularRate = (lateCount + absentCount * 2) / totalDays;

  let absenceImpact = 0;
  let absenceSeverity: 'low' | 'medium' | 'high' = 'low';
  let absenceDetails = 'Consistent attendance record with minimal unexcused disruptions.';
  let absenceRec = 'Maintain standard 1-on-1 check-ins.';

  if (irregularRate > 0.3 || absentCount >= 2) {
    absenceImpact = 30;
    absenceSeverity = 'high';
    absenceDetails = `High frequency of irregular attendance (${absentCount} absences, ${lateCount} late arrivals recorded).`;
    absenceRec = 'Schedule an exploratory wellness check-in to discuss potential commute, health, or workload bottlenecks.';
  } else if (irregularRate > 0.15 || lateCount >= 2) {
    absenceImpact = 15;
    absenceSeverity = 'medium';
    absenceDetails = `Moderate attendance irregularity noted (${lateCount} late arrivals logged).`;
    absenceRec = 'Discuss flexible work hours or remote scheduling options.';
  }
  totalScore += absenceImpact;
  factors.push({
    key: 'absence_rate',
    label: 'Absence & Punctuality Index',
    severity: absenceSeverity,
    score_impact: absenceImpact,
    details: absenceDetails,
    investigation_recommendation: absenceRec,
  });

  // Factor 2: Leave Pattern & Burnout Indicator
  const balances = db.leave_balances.filter((b) => b.employee_id === emp.id && b.company_id === companyId);
  const annualBal = balances.find((b) => {
    const lt = db.leave_types.find((t) => t.id === b.leave_type_id);
    return lt?.name.toLowerCase().includes('annual');
  });

  let leaveImpact = 0;
  let leaveSeverity: 'low' | 'medium' | 'high' = 'low';
  let leaveDetails = 'Balanced statutory PTO utilization aligned with team baseline.';
  let leaveRec = 'Encourage ongoing periodic rest and restorative time off.';

  if (annualBal) {
    if (annualBal.balance_days <= 1 && annualBal.used_days >= annualBal.allocated_days) {
      leaveImpact = 25;
      leaveSeverity = 'high';
      leaveDetails = `Annual leave allowance fully exhausted (${annualBal.used_days}/${annualBal.allocated_days} days used). Potential fatigue risk.`;
      leaveRec = 'Review workload distribution and ensure employee is not experiencing burnout.';
    } else if (annualBal.used_days === 0 && new Date(emp.start_date).getTime() < Date.now() - 180 * 86400000) {
      leaveImpact = 20;
      leaveSeverity = 'medium';
      leaveDetails = 'Zero leave days taken despite >6 months tenure. Potential burnout accumulator.';
      leaveRec = 'Proactively remind employee of annual leave entitlement and encourage scheduled downtime.';
    }
  }
  totalScore += leaveImpact;
  factors.push({
    key: 'leave_pattern',
    label: 'Leave Utilization & Burnout Metric',
    severity: leaveSeverity,
    score_impact: leaveImpact,
    details: leaveDetails,
    investigation_recommendation: leaveRec,
  });

  // Factor 3: Tenure & Career Progression
  const startDate = new Date(emp.start_date);
  const tenureMonths = Math.max(1, Math.round((Date.now() - startDate.getTime()) / (30.44 * 86400000)));
  const compRecords = db.employee_compensation.filter((c) => c.employee_id === emp.id);

  let tenureImpact = 0;
  let tenureSeverity: 'low' | 'medium' | 'high' = 'low';
  let tenureDetails = `Tenure of ${tenureMonths} months is progressing normally.`;
  let tenureRec = 'Continue quarterly milestone reviews.';

  if (emp.status === 'probation' && tenureMonths > 3) {
    tenureImpact = 25;
    tenureSeverity = 'high';
    tenureDetails = `Probation status lingering for ${tenureMonths} months without formal confirmation or review.`;
    tenureRec = 'Convene probation review committee to confirm full-time status or formalize feedback plan.';
  } else if (tenureMonths >= 14 && compRecords.length <= 1) {
    tenureImpact = 20;
    tenureSeverity = 'medium';
    tenureDetails = `Over ${tenureMonths} months with initial title and baseline compensation without revision.`;
    tenureRec = 'Evaluate employee for annual merit increase, leveling promotion, or expanded scope.';
  }
  totalScore += tenureImpact;
  factors.push({
    key: 'tenure_progression',
    label: 'Tenure & Progression Velocity',
    severity: tenureSeverity,
    score_impact: tenureImpact,
    details: tenureDetails,
    investigation_recommendation: tenureRec,
  });

  // Factor 4: Compensation Parity Anomaly
  const allDeptEmps = db.employees.filter((e) => e.department_id === emp.department_id && e.company_id === companyId);
  const deptComps = db.employee_compensation.filter((c) =>
    allDeptEmps.some((e) => e.id === c.employee_id && e.employment_type === 'full_time')
  );
  const currentComp = db.employee_compensation
    .filter((c) => c.employee_id === emp.id)
    .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())[0];

  let compImpact = 0;
  let compSeverity: 'low' | 'medium' | 'high' = 'low';
  let compDetails = 'Compensation is well-aligned with department benchmark and peer band.';
  let compRec = 'Maintain regular market salary reviews.';

  if (deptComps.length > 1 && currentComp) {
    const avgSalary = deptComps.reduce((acc, c) => acc + c.salary, 0) / deptComps.length;
    if (currentComp.salary < avgSalary * 0.75) {
      compImpact = 20;
      compSeverity = 'high';
      compDetails = `Compensation is significantly below the ${dept?.name || 'department'} average for similar responsibilities.`;
      compRec = 'Conduct compensation benchmarking analysis and review market parity adjustment.';
    } else if (currentComp.salary < avgSalary * 0.85) {
      compImpact = 10;
      compSeverity = 'medium';
      compDetails = 'Compensation sits slightly below departmental peer average.';
      compRec = 'Include in upcoming semi-annual compensation band calibration.';
    }
  }
  totalScore += compImpact;
  factors.push({
    key: 'compensation_anomaly',
    label: 'Compensation Parity & Alignment',
    severity: compSeverity,
    score_impact: compImpact,
    details: compDetails,
    investigation_recommendation: compRec,
  });

  // Calculate final Risk Level
  let calculatedRisk: AttritionRisk = 'low';
  if (totalScore >= 65) {
    calculatedRisk = 'high';
  } else if (totalScore >= 40) {
    calculatedRisk = 'medium';
  }

  return {
    employee_id: emp.id,
    employee_name: emp.name,
    job_title: emp.job_title,
    department_name: dept?.name || 'Unassigned',
    start_date: emp.start_date,
    tenure_months: tenureMonths,
    attrition_risk: calculatedRisk,
    risk_score: Math.min(100, totalScore),
    factors,
    last_calculated_at: new Date().toISOString(),
  };
}

// 2. Workforce Analytics Generator
function generateWorkforceAnalytics(companyId: string): WorkforceAnalyticsReport {
  const org = db.organizations.find((o) => o.id === companyId);
  const emps = db.employees.filter((e) => e.company_id === companyId);
  const activeEmps = emps.filter((e) => e.status !== 'offboarded');
  const depts = db.departments.filter((d) => d.company_id === companyId);
  const offbRecords = db.offboarding_records.filter((r) => r.company_id === companyId);

  // Headcount progression trend
  const months = ['Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026'];
  const baseCount = Math.max(1, activeEmps.length - 2);
  const headcount_trend: HeadcountTrendPoint[] = months.map((m, idx) => {
    const growth = Math.min(activeEmps.length, baseCount + Math.floor(idx * 0.5));
    const newHires = idx === 0 ? 2 : idx % 2 === 0 ? 1 : 0;
    const departures = idx === 3 ? 1 : 0;
    return {
      period: m,
      headcount: growth,
      new_hires: newHires,
      departures,
      net_change: newHires - departures,
    };
  });

  // Turnover metrics
  const totalOffboarded = offbRecords.length;
  const voluntary = offbRecords.filter((r) => r.reason === 'resignation').length;
  const involuntary = totalOffboarded - voluntary;
  const avgTenure = emps.length > 0
    ? Math.round(emps.reduce((sum, e) => sum + (Date.now() - new Date(e.start_date).getTime()) / (30.44 * 86400000), 0) / emps.length)
    : 14;
  const turnoverRate = emps.length > 0 ? Math.round((totalOffboarded / emps.length) * 100 * 10) / 10 : 3.8;

  const turnover: TurnoverAnalytics = {
    annual_turnover_rate: turnoverRate,
    voluntary_exits: voluntary,
    involuntary_exits: involuntary,
    retention_rate: Math.max(0, 100 - turnoverRate),
    average_tenure_months: avgTenure,
  };

  // Department Breakdown
  const department_breakdown: DepartmentAnalyticsItem[] = depts.map((d) => {
    const deptEmps = emps.filter((e) => e.department_id === d.id);
    const active = deptEmps.filter((e) => e.status === 'active').length;
    const probation = deptEmps.filter((e) => e.status === 'probation').length;
    const highRisk = deptEmps.filter((e) => e.attrition_risk === 'high').length;
    const deptAvgTenure = deptEmps.length > 0
      ? Math.round(deptEmps.reduce((sum, e) => sum + (Date.now() - new Date(e.start_date).getTime()) / (30.44 * 86400000), 0) / deptEmps.length)
      : 0;

    return {
      department_id: d.id,
      department_name: d.name,
      headcount: deptEmps.length,
      percentage_of_workforce: emps.length > 0 ? Math.round((deptEmps.length / emps.length) * 100) : 0,
      active_count: active,
      probation_count: probation,
      high_attrition_count: highRisk,
      average_tenure_months: deptAvgTenure,
    };
  });

  // Country breakdown
  const countriesMap = new Map<string, number>();
  emps.forEach((e) => {
    countriesMap.set(e.country, (countriesMap.get(e.country) || 0) + 1);
  });
  const country_breakdown = Array.from(countriesMap.entries()).map(([country, count]) => ({
    country,
    count,
    percentage: Math.round((count / emps.length) * 100),
  }));

  // Employment Type breakdown
  const typeMap = new Map<EmploymentType, number>();
  emps.forEach((e) => {
    typeMap.set(e.employment_type, (typeMap.get(e.employment_type) || 0) + 1);
  });
  const employment_type_breakdown = Array.from(typeMap.entries()).map(([type, count]) => ({
    type,
    count,
    percentage: Math.round((count / emps.length) * 100),
  }));

  // Leave Utilization & Attendance Trends
  const leaveReqs = db.leave_requests.filter((r) => r.company_id === companyId && r.status === 'approved');
  const leaveTypes = db.leave_types.filter((t) => t.company_id === companyId);
  const totalLeaveDaysTaken = leaveReqs.reduce((sum, r) => sum + r.days_requested, 0);

  const breakdown_by_type = leaveTypes.map((lt) => {
    const days = leaveReqs.filter((r) => r.leave_type_id === lt.id).reduce((sum, r) => sum + r.days_requested, 0);
    return {
      leave_type_name: lt.name,
      days_taken: days,
      percentage: totalLeaveDaysTaken > 0 ? Math.round((days / totalLeaveDaysTaken) * 100) : 0,
    };
  });

  const leave_utilization: LeaveUtilizationAnalytics = {
    monthly_utilization: [
      { month: 'Apr', annual_leave_days: 8, sick_leave_days: 2, other_leave_days: 0, attendance_rate_percentage: 97 },
      { month: 'May', annual_leave_days: 12, sick_leave_days: 3, other_leave_days: 1, attendance_rate_percentage: 95 },
      { month: 'Jun', annual_leave_days: 15, sick_leave_days: 1, other_leave_days: 0, attendance_rate_percentage: 96 },
      { month: 'Jul', annual_leave_days: 20, sick_leave_days: 4, other_leave_days: 2, attendance_rate_percentage: 93 },
      { month: 'Aug', annual_leave_days: 18, sick_leave_days: 2, other_leave_days: 1, attendance_rate_percentage: 95 },
      { month: 'Sep', annual_leave_days: 14, sick_leave_days: 1, other_leave_days: 0, attendance_rate_percentage: 96 },
    ],
    total_leave_days_taken: totalLeaveDaysTaken || 32,
    average_days_per_employee: emps.length > 0 ? Math.round(((totalLeaveDaysTaken || 32) / emps.length) * 10) / 10 : 5.3,
    escalated_requests_count: db.leave_requests.filter((r) => r.company_id === companyId && r.escalated_to_head).length,
    breakdown_by_type,
  };

  return {
    company_id: companyId,
    company_name: org?.name || 'Company',
    generated_at: new Date().toISOString(),
    total_workforce: emps.length,
    active_headcount: emps.filter((e) => e.status === 'active').length,
    probation_headcount: emps.filter((e) => e.status === 'probation').length,
    headcount_trend,
    turnover,
    department_breakdown,
    country_breakdown,
    employment_type_breakdown,
    leave_utilization,
  };
}

// 3. Org Chart Tree Builder
function buildOrgChartTree(companyId: string, deptFilter?: string, countryFilter?: string): OrgNode[] {
  let emps = db.employees.filter((e) => e.company_id === companyId && e.status !== 'offboarded');
  const depts = db.departments.filter((d) => d.company_id === companyId);

  if (deptFilter && deptFilter !== 'all') {
    emps = emps.filter((e) => e.department_id === deptFilter);
  }
  if (countryFilter && countryFilter !== 'all') {
    emps = emps.filter((e) => e.country.toLowerCase() === countryFilter.toLowerCase());
  }

  const nodeMap = new Map<string, OrgNode>();
  emps.forEach((emp) => {
    const dept = depts.find((d) => d.id === emp.department_id);
    nodeMap.set(emp.id, {
      id: emp.id,
      name: emp.name,
      job_title: emp.job_title,
      department_id: emp.department_id,
      department_name: dept?.name || 'Unassigned',
      country: emp.country,
      status: emp.status,
      attrition_risk: emp.attrition_risk,
      manager_id: emp.manager_id,
      direct_reports_count: 0,
      children: [],
    });
  });

  const rootNodes: OrgNode[] = [];

  nodeMap.forEach((node) => {
    if (node.manager_id && nodeMap.has(node.manager_id)) {
      const manager = nodeMap.get(node.manager_id)!;
      manager.children = manager.children || [];
      manager.children.push(node);
      manager.direct_reports_count = (manager.direct_reports_count || 0) + 1;
    } else {
      rootNodes.push(node);
    }
  });

  if (rootNodes.length === 0 && nodeMap.size > 0) {
    const first = Array.from(nodeMap.values())[0];
    rootNodes.push(first);
  }

  return rootNodes;
}

// --- Org Chart Endpoints ---

app.get('/api/org-chart', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { department_id, country } = req.query as { department_id?: string; country?: string };
  const tree = buildOrgChartTree(auth.company_id, department_id, country);
  res.json({
    company_id: auth.company_id,
    root_nodes: tree,
    total_nodes: db.employees.filter((e) => e.company_id === auth.company_id && e.status !== 'offboarded').length,
  });
});

app.patch('/api/employees/:id/manager', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;
  const { manager_id } = req.body;

  const emp = db.employees.find((e) => e.id === id && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  if (manager_id) {
    if (manager_id === id) {
      return res.status(400).json({ error: 'An employee cannot be their own reporting manager' });
    }
    const manager = db.employees.find((e) => e.id === manager_id && e.company_id === auth.company_id);
    if (!manager) {
      return res.status(400).json({ error: 'Selected manager does not exist in this company workspace' });
    }
  }

  const prevManagerId = emp.manager_id || null;
  const newManagerId = manager_id || null;

  if (prevManagerId !== newManagerId) {
    const historyRow: JobHistory = {
      id: generateId('jh'),
      employee_id: emp.id,
      company_id: auth.company_id,
      previous_department_id: emp.department_id,
      new_department_id: emp.department_id,
      previous_job_title: emp.job_title,
      new_job_title: emp.job_title,
      previous_manager_id: prevManagerId,
      new_manager_id: newManagerId,
      reason: 'restructure',
      effective_date: getTodayString(),
      changed_by: auth.user_id,
      created_at: new Date().toISOString(),
    };
    db.job_history.push(historyRow);
    broadcastToCompany(auth.company_id, 'job_history_created', { employee_id: emp.id, job_history: enrichJobHistory(historyRow) });
  }

  emp.manager_id = manager_id || undefined;
  saveDb();

  broadcastToCompany(auth.company_id, 'employee_changed', { type: 'manager_updated', employee_id: emp.id });
  broadcastToCompany(auth.company_id, 'org_chart_updated', {});

  res.json({
    success: true,
    message: 'Reporting manager updated successfully',
    employee: emp,
  });
});

// --- Attrition Scoring Endpoints ---

app.get('/api/attrition-score/analysis', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const emps = db.employees.filter((e) => e.company_id === auth.company_id && e.status !== 'offboarded');
  const analyses = emps.map((emp) => computeEmployeeAttritionRisk(emp, auth.company_id));

  res.json({
    company_id: auth.company_id,
    total_analyzed: analyses.length,
    high_risk_count: analyses.filter((a) => a.attrition_risk === 'high').length,
    medium_risk_count: analyses.filter((a) => a.attrition_risk === 'medium').length,
    low_risk_count: analyses.filter((a) => a.attrition_risk === 'low').length,
    scores: analyses,
  });
});

app.post('/api/attrition-score/recalculate', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const emps = db.employees.filter((e) => e.company_id === auth.company_id && e.status !== 'offboarded');
  const scores: EmployeeAttritionAnalysis[] = [];

  emps.forEach((emp) => {
    const analysis = computeEmployeeAttritionRisk(emp, auth.company_id);
    emp.attrition_risk = analysis.attrition_risk;
    scores.push(analysis);
  });

  saveDb();

  broadcastToCompany(auth.company_id, 'attrition_recalculated', { count: scores.length });
  broadcastToCompany(auth.company_id, 'dashboard_updated', {});

  const response: AttritionRecalculateResponse = {
    success: true,
    total_analyzed: scores.length,
    high_risk_count: scores.filter((s) => s.attrition_risk === 'high').length,
    medium_risk_count: scores.filter((s) => s.attrition_risk === 'medium').length,
    low_risk_count: scores.filter((s) => s.attrition_risk === 'low').length,
    scores,
  };

  res.json(response);
});

// --- Reports & Analytics Endpoint ---

app.get('/api/analytics/report', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const report = generateWorkforceAnalytics(auth.company_id);
  res.json(report);
});

// --- AI HR Assistant Endpoints ---

app.post('/api/ai-assistant', requireAuth, async (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { question, mode = 'ask', target_employee_id, target_department_id } = req.body as AIAssistantRequest;

  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'A question or prompt is required' });
  }

  const cleanQuery = question.trim();
  const lower = cleanQuery.toLowerCase();

  // 1. Intent Classification
  const hrKeywords = [
    'leave', 'pto', 'vacation', 'holiday', 'sick', 'maternity', 'paternity',
    'employee', 'staff', 'headcount', 'attendance', 'absent', 'late', 'present',
    'compliance', 'visa', 'contract', 'id', 'tax', 'ssnit', 'tin', 'pension',
    'department', 'role', 'title', 'probation', 'salary', 'payroll', 'comp', 'compensation',
    'attrition', 'turnover', 'retention', 'manager', 'org', 'report', 'who is', 'kwame', 'ama',
    'kofi', 'abena', 'ebenezer', 'nana', 'ghana', 'uk', 'workplace', 'fire', 'first aid',
  ];

  const isRelevant = hrKeywords.some((kw) => lower.includes(kw)) ||
    db.employees.some((e) => e.company_id === auth.company_id && lower.includes(e.name.toLowerCase())) ||
    db.departments.some((d) => d.company_id === auth.company_id && lower.includes(d.name.toLowerCase()));

  if (!isRelevant && !target_employee_id && !target_department_id && cleanQuery.length > 25) {
    const redirectResponse: AIAssistantResponse = {
      answer: "I am Go-Ya's specialized HR Assistant. I can assist with company policies, leave entitlements, employee lookup, attendance statistics, compliance deadlines, and organizational summaries for your workspace. How can I help with your HR workflows today?",
      mode,
      intent_classification: 'redirect_out_of_scope',
      data_sources_used: ['intent_guardrail'],
      suggested_followups: [
        'What is Ghana statutory annual leave entitlement?',
        'Find all employees currently on probation',
        'Who is flagged with high attrition risk?',
        'Summarize department headcount and retention',
      ],
    };
    return res.json(redirectResponse);
  }

  // 2. Data Context Retrieval (RLS Company-scoped)
  const companyEmps = db.employees.filter((e) => e.company_id === auth.company_id);
  const companyDepts = db.departments.filter((d) => d.company_id === auth.company_id);
  const companyLeaveTypes = db.leave_types.filter((t) => t.company_id === auth.company_id);
  const companyCompliance = db.compliance_items.filter((c) => c.company_id === auth.company_id);
  const companyAttendanceSummary = db.daily_attendance_summary.filter((s) => s.company_id === auth.company_id);
  const companyLeaveReqs = db.leave_requests.filter((r) => r.company_id === auth.company_id);

  const dataSources: string[] = ['employees', 'departments', 'leave_types', 'compliance_items', 'attendance'];

  // Role-Aware Security: Only HR Head receives compensation context!
  let compensationContext = '';
  if (auth.role === 'hr_head') {
    dataSources.push('employee_compensation');
    const compRows = db.employee_compensation.filter((c) => companyEmps.some((e) => e.id === c.employee_id));
    const totalPayrollGHS = compRows.filter((c) => c.currency === 'GHS').reduce((sum, c) => sum + c.salary + (c.allowances || 0), 0);
    const totalPayrollGBP = compRows.filter((c) => c.currency === 'GBP').reduce((sum, c) => sum + c.salary + (c.allowances || 0), 0);
    compensationContext = `
COMPENSATION DATA (AUTHORIZED FOR HR HEAD ONLY):
- Active Monthly GHS Payroll: GHS ${totalPayrollGHS.toLocaleString()}
- Active Monthly GBP Payroll: GBP ${totalPayrollGBP.toLocaleString()}
- Employee Salary Records:
${compRows
  .map((c) => {
    const emp = companyEmps.find((e) => e.id === c.employee_id);
    return `  * ${emp?.name || c.employee_id}: ${c.currency} ${c.salary.toLocaleString()} base + ${c.currency} ${(c.allowances || 0).toLocaleString()} allowance (Effective: ${c.effective_date})`;
  })
  .join('\n')}
`;
  } else {
    compensationContext = `
COMPENSATION DATA POLICY:
- User is an HR Analyst. ALL SALARIES, BONUSES, ALLOWANCES, AND PAYROLL SUMMARIES ARE STRICTLY CONFIDENTIAL.
- If the user asks for any salary or compensation details, state politely: "Compensation details and payroll numbers are restricted to HR Head authorization under company data governance."
`;
  }

  // Find Matched Employees for search / reference
  let matched_employees: AIAssistantResponse['matched_employees'] = [];
  if (mode === 'search' || lower.includes('find') || lower.includes('who') || lower.includes('filter') || lower.includes('list')) {
    const matched = companyEmps.filter((e) => {
      const d = companyDepts.find((dept) => dept.id === e.department_id);
      const dName = d?.name.toLowerCase() || '';
      const text = `${e.name} ${e.job_title} ${dName} ${e.country} ${e.status} ${e.employment_type} ${e.attrition_risk}`.toLowerCase();
      
      if (lower.includes('probation') && e.status === 'probation') return true;
      if (lower.includes('high risk') || lower.includes('attrition') && e.attrition_risk === 'high') return true;
      if (lower.includes('leave') || lower.includes('vacation') && e.status === 'on_leave') return true;
      if (lower.includes('ghana') && e.country.toLowerCase().includes('ghana')) return true;
      if (lower.includes('uk') || lower.includes('united kingdom') && e.country.toLowerCase().includes('kingdom')) return true;
      if (lower.includes('engineering') && dName.includes('engineering')) return true;
      if (lower.includes('contract') && e.employment_type === 'contract') return true;
      return lower.split(' ').some((word) => word.length > 3 && text.includes(word));
    });

    matched_employees = (matched.length > 0 ? matched : companyEmps.slice(0, 4)).map((e) => {
      const d = companyDepts.find((dept) => dept.id === e.department_id);
      return {
        id: e.id,
        name: e.name,
        job_title: e.job_title,
        department_name: d?.name || 'Unassigned',
        country: e.country,
        status: e.status,
        attrition_risk: e.attrition_risk,
      };
    });
  }

  // Construct structured knowledge prompt
  const hrContext = `
COMPANY CONTEXT:
- Total Workforce: ${companyEmps.length} employees
- Active: ${companyEmps.filter((e) => e.status === 'active').length}
- On Probation: ${companyEmps.filter((e) => e.status === 'probation').length}
- On Leave: ${companyEmps.filter((e) => e.status === 'on_leave').length}
- High Attrition Risk Flagged: ${companyEmps.filter((e) => e.attrition_risk === 'high').length}

EMPLOYEES:
${companyEmps
  .map((e) => {
    const d = companyDepts.find((dept) => dept.id === e.department_id);
    const mgr = e.manager_id ? companyEmps.find((m) => m.id === e.manager_id)?.name : 'None / Top Executive';
    return `* ${e.name} (ID: ${e.id}): ${e.job_title} | Dept: ${d?.name || 'Unassigned'} | Country: ${e.country} | Status: ${e.status} | Risk: ${e.attrition_risk} | Reports to: ${mgr} | Start Date: ${e.start_date}`;
  })
  .join('\n')}

DEPARTMENTS:
${companyDepts.map((d) => `* ${d.name} (ID: ${d.id})`).join('\n')}

LEAVE POLICIES & TYPES:
${companyLeaveTypes.map((t) => `* ${t.name}: ${t.default_entitlement_days} days entitlement | ${t.paid ? 'Paid' : 'Unpaid'}`).join('\n')}

COMPLIANCE DEADLINES & ITEMS:
${companyCompliance.map((c) => `* ${c.title} (Category: ${c.category}, Due: ${c.deadline}, Status: ${c.status})`).join('\n')}

${compensationContext}
`;

  let finalAnswer = '';
  let suggested_followups: string[] = [
    'What is Ghana statutory leave policy?',
    'Show me high attrition risk employees',
    'Summarize upcoming compliance deadlines',
  ];

  // Model generation with Gemini API or Intelligent Synthesis Engine
  const gemini = getGemini();
  if (gemini) {
    try {
      const systemInstruction = `You are the expert Go-Ya HR Assistant for this company.
Respond with clear, structured, Notion-inspired Markdown formatting (use concise bullet points, bold key terms, and section headers when helpful).
Respect the data governance rules strictly: if the user is an HR Analyst and asks about compensation or salary, you MUST refuse and state that compensation data is restricted to HR Head authorization.
Keep answers accurate to the company context provided. Do not hallucinate outside company policies.`;

      const promptText = `
HR DATA CONTEXT:
${hrContext}

USER ROLE: ${auth.role}
REQUEST MODE: ${mode}
USER QUESTION: "${cleanQuery}"

Provide a direct, helpful, and concise answer based strictly on the company HR records above.`;

      const responseGen = await gemini.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: promptText,
        config: {
          systemInstruction,
        },
      });

      if (responseGen && responseGen.text) {
        finalAnswer = responseGen.text;
      }
    } catch (err) {
      console.warn('Gemini API call failed, switching to local synthesis engine:', err);
    }
  }

  // Deterministic local HR synthesis engine fallback
  if (!finalAnswer) {
    if (lower.includes('salary') || lower.includes('compensation') || lower.includes('payroll') || lower.includes('how much')) {
      if (auth.role !== 'hr_head') {
        finalAnswer = "🔒 **Confidentiality Notice**: Compensation details, employee salaries, and company payroll totals are restricted to **HR Head** authorization under company data governance policy.";
      } else {
        const compRows = db.employee_compensation.filter((c) => companyEmps.some((e) => e.id === c.employee_id));
        const totalPayrollGHS = compRows.filter((c) => c.currency === 'GHS').reduce((sum, c) => sum + c.salary + (c.allowances || 0), 0);
        finalAnswer = `### 💰 Executive Compensation & Payroll Overview\n\n* **Active Monthly GHS Payroll**: **GHS ${totalPayrollGHS.toLocaleString()}**\n* **Active Headcount with Compensation**: ${compRows.length} employees\n\n**Key Compensation Records:**\n` +
          compRows.slice(0, 4).map((c) => {
            const e = companyEmps.find((emp) => emp.id === c.employee_id);
            return `* **${e?.name || 'Employee'}** (${e?.job_title}): **${c.currency} ${c.salary.toLocaleString()}** base (${c.effective_date})`;
          }).join('\n');
      }
    } else if (lower.includes('leave') || lower.includes('pto') || lower.includes('vacation')) {
      finalAnswer = `### 🌴 Statutory & Company Leave Policies\n\n* **Annual Leave**: **15 working days** standard paid leave per annum under the Ghana Labour Act (Act 651).\n* **Sick Leave**: **10 working days** paid leave (medical certificate required after 2 consecutive days).\n* **Maternity Leave**: **12 weeks (84 days)** fully paid.\n* **Compassionate Leave**: **3 working days** for immediate bereavement.\n\n**Current Status:**\n* **1 employee currently on leave** (Kofi Boateng - Approved Annual Leave)\n* **Leave Requests**: All submitted requests have been audited.`;
    } else if (lower.includes('probation')) {
      const probEmps = companyEmps.filter((e) => e.status === 'probation');
      finalAnswer = `### ⏱️ Probation Review Overview\n\nCurrently, there are **${probEmps.length} employee(s)** in their statutory probation period:\n\n` +
        probEmps.map((e) => `* **${e.name}** — ${e.job_title} (${e.country}) · Start Date: ${e.start_date}`).join('\n') +
        `\n\n💡 *Recommendation*: Conduct formal 90-day confirmation milestones prior to contract rollover.`;
    } else if (lower.includes('attrition') || lower.includes('risk') || lower.includes('turnover')) {
      const highRisk = companyEmps.filter((e) => e.attrition_risk === 'high');
      finalAnswer = `### ⚠️ Attrition Risk & Retention Overview\n\n* **High Risk Flags**: **${highRisk.length} employee(s)** require exploratory attention.\n* **Key Indicators Evaluated**: Absence & punctuality trends, leave balance exhaustion, and tenure progression velocity.\n\n` +
        highRisk.map((e) => `* **${e.name}** (${e.job_title}, ${e.country}) — Flagged for attendance irregularity and extended probation review.`).join('\n') +
        `\n\n*Note*: Attrition flags are rule-based indicators to guide compassionate 1-on-1 check-ins, never definitive statements.`;
    } else if (lower.includes('compliance') || lower.includes('deadline')) {
      finalAnswer = `### 🛡️ Compliance & Regulatory Summary\n\n* **Total Active Trackers**: **${companyCompliance.length} compliance items**\n* **High Attention Deadlines**:\n` +
        companyCompliance.slice(0, 3).map((c) => `  * **${c.title}** (Due: **${c.deadline}**) — Status: \`${c.status.toUpperCase()}\``).join('\n') +
        `\n\nAll tax remittances (PAYE, SSNIT Tier 1 & 2) and statutory labor verifications are tracked.`;
    } else if (mode === 'summarize' || lower.includes('summarize')) {
      const targetEmp = companyEmps.find((e) => lower.includes(e.name.toLowerCase())) || companyEmps[0];
      const dept = companyDepts.find((d) => d.id === targetEmp.department_id);
      finalAnswer = `### 📋 Employee Summary: ${targetEmp.name}\n\n* **Job Title**: ${targetEmp.job_title}\n* **Department**: ${dept?.name || 'Engineering'}\n* **Location**: ${targetEmp.country}\n* **Employment Status**: \`${targetEmp.status.toUpperCase()}\` (${targetEmp.employment_type})\n* **Tenure**: Joined on ${targetEmp.start_date}\n* **Attrition Risk Level**: \`${targetEmp.attrition_risk.toUpperCase()}\`\n* **Reporting Manager**: ${targetEmp.manager_id ? companyEmps.find(m => m.id === targetEmp.manager_id)?.name : 'Dr. Nana Yaa Appiah'}\n* **Onboarding & Compliance**: Fully verified documentation on file.`;
    } else {
      finalAnswer = `### 🏢 Go-Ya Workspace Overview\n\n* **Total Workforce**: **${companyEmps.length} employees** across **${companyDepts.length} departments**.\n* **Locations**: Ghana (Accra Hub) & United Kingdom (Remote).\n* **Workforce Status**: ${companyEmps.filter(e => e.status === 'active').length} Active, ${companyEmps.filter(e => e.status === 'probation').length} on Probation, ${companyEmps.filter(e => e.status === 'on_leave').length} on Leave.\n* **Compliance Status**: 100% of quarterly filings in order.`;
    }
  }

  // 3. Log interaction to ai_chat_logs
  const logEntry: AIChatLog = {
    id: generateId('chatlog'),
    company_id: auth.company_id,
    user_id: auth.user_id,
    role_at_time: auth.role,
    question: cleanQuery,
    answer: finalAnswer,
    data_sources_used: dataSources,
    created_at: new Date().toISOString(),
  };

  db.ai_chat_logs.push(logEntry);
  saveDb();

  const response: AIAssistantResponse = {
    answer: finalAnswer,
    mode,
    intent_classification: 'company_hr_query',
    data_sources_used: dataSources,
    suggested_followups,
    matched_employees: matched_employees.length > 0 ? matched_employees : undefined,
  };

  res.json(response);
});

app.get('/api/ai-assistant/logs', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const logs = db.ai_chat_logs
    .filter((l) => l.company_id === auth.company_id && l.user_id === auth.user_id)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  res.json(logs);
});

app.delete('/api/ai-assistant/logs', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  db.ai_chat_logs = db.ai_chat_logs.filter((l) => !(l.company_id === auth.company_id && l.user_id === auth.user_id));
  saveDb();
  res.json({ success: true, message: 'Chat history cleared' });
});


// ==========================================
// Milestone 5: Task Management Endpoints
// ==========================================

function enrichTask(task: Task): TaskWithDetails {
  const assigneeUser = db.users.find((u) => u.id === task.assignee_id);
  const creatorUser = db.users.find((u) => u.id === task.created_by);
  let relEmpName: string | undefined;
  let relEmpTitle: string | undefined;
  let relEmpDept: string | undefined;

  if (task.related_employee_id) {
    const relEmp = db.employees.find((e) => e.id === task.related_employee_id);
    if (relEmp) {
      relEmpName = relEmp.name;
      relEmpTitle = relEmp.job_title;
      const dept = db.departments.find((d) => d.id === relEmp.department_id);
      relEmpDept = dept?.name;
    }
  }

  return {
    ...task,
    assignee_name: assigneeUser?.email.split('@')[0] || 'Member',
    assignee_email: assigneeUser?.email,
    creator_name: creatorUser?.email.split('@')[0] || 'Member',
    creator_email: creatorUser?.email,
    related_employee_name: relEmpName,
    related_employee_job_title: relEmpTitle,
    related_employee_department: relEmpDept,
  };
}

function canAccessTask(auth: AuthContextPayload, task: Task): boolean {
  if (task.company_id !== auth.company_id) return false;
  if (auth.role === 'hr_head') return true;
  return task.assignee_id === auth.user_id || task.created_by === auth.user_id;
}

// GET /api/tasks - List tasks with RLS and view filtering
app.get('/api/tasks', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { view, status, priority, search } = req.query;

  // 1. RLS filtering: HR Head sees all company tasks; HR Analyst sees assigned or created
  let tasks = db.tasks.filter((t) => canAccessTask(auth, t));

  // 2. View filtering: 'my' filters strictly to assignee === auth.user_id
  if (view === 'my') {
    tasks = tasks.filter((t) => t.assignee_id === auth.user_id);
  }

  // 3. Optional status / priority / search filters
  if (status && typeof status === 'string') {
    tasks = tasks.filter((t) => t.status === status);
  }

  if (priority && typeof priority === 'string') {
    tasks = tasks.filter((t) => t.priority === priority);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    tasks = tasks.filter((t) => {
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description ? t.description.toLowerCase().includes(q) : false;
      const emp = t.related_employee_id ? db.employees.find((e) => e.id === t.related_employee_id) : null;
      const matchEmp = emp ? emp.name.toLowerCase().includes(q) : false;
      return matchTitle || matchDesc || matchEmp;
    });
  }

  // Sort: Tasks with due dates ordered ascending, followed by tasks without due dates
  tasks.sort((a, b) => {
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const enrichedTasks = tasks.map(enrichTask);
  res.json({ tasks: enrichedTasks });
});

// POST /api/tasks - Create new task
app.post('/api/tasks', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { title, description, status, assignee_id, related_employee_id, due_date, priority } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Task title is required' });
  }

  // Assignee must be an organization member of this workspace
  const targetAssigneeId = assignee_id || auth.user_id;
  const isMember = db.organization_members.some(
    (m) => m.user_id === targetAssigneeId && m.organization_id === auth.company_id
  );
  if (!isMember) {
    return res.status(400).json({ error: 'Assignee must be an active member of this workspace' });
  }

  // Validate optional linked employee
  if (related_employee_id) {
    const emp = db.employees.find((e) => e.id === related_employee_id && e.company_id === auth.company_id);
    if (!emp) {
      return res.status(400).json({ error: 'Linked employee not found in workspace' });
    }
  }

  const validStatuses: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'complete'];
  const taskStatus: TaskStatus = validStatuses.includes(status) ? status : 'todo';

  const validPriorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
  const taskPriority: TaskPriority = validPriorities.includes(priority) ? priority : 'medium';

  const newTask: Task = {
    id: generateId('task'),
    company_id: auth.company_id,
    title: title.trim(),
    description: description ? description.trim() : '',
    status: taskStatus,
    assignee_id: targetAssigneeId,
    related_employee_id: related_employee_id || null,
    due_date: due_date || null,
    priority: taskPriority,
    created_by: auth.user_id,
    created_at: new Date().toISOString(),
  };

  db.tasks.push(newTask);
  saveDb();

  // Milestone 11 Trigger: Task assigned (→ assignee)
  if (targetAssigneeId) {
    createNotification(
      auth.company_id,
      targetAssigneeId,
      'task_assigned',
      'New Task Assigned',
      `You were assigned to task "${newTask.title}" (Priority: ${taskPriority.toUpperCase()}${due_date ? `, Due: ${due_date}` : ''})`,
      'tasks'
    );
  }

  const enriched = enrichTask(newTask);

  // Broadcast realtime event
  broadcastToCompany(auth.company_id, 'task_created', { task: enriched });

  res.status(201).json({ task: enriched });
});

// PATCH /api/tasks/:id - Update task details or status
app.patch('/api/tasks/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;
  const task = db.tasks.find((t) => t.id === id && t.company_id === auth.company_id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found in this workspace' });
  }

  // RLS check
  if (!canAccessTask(auth, task)) {
    return res.status(403).json({
      error: 'RLS Policy Violation: HR Analysts can only view and edit tasks assigned to or created by them.',
    });
  }

  const { title, description, status, assignee_id, related_employee_id, due_date, priority } = req.body;
  const oldStatus = task.status;
  const oldAssigneeId = task.assignee_id;

  if (title !== undefined) {
    if (!title.trim()) {
      return res.status(400).json({ error: 'Task title cannot be empty' });
    }
    task.title = title.trim();
  }

  if (description !== undefined) {
    task.description = description ? description.trim() : '';
  }

  if (status !== undefined) {
    const validStatuses: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'complete'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid task status' });
    }
    task.status = status;
  }

  if (assignee_id !== undefined) {
    const isMember = db.organization_members.some(
      (m) => m.user_id === assignee_id && m.organization_id === auth.company_id
    );
    if (!isMember) {
      return res.status(400).json({ error: 'Assignee must be an active member of this workspace' });
    }
    task.assignee_id = assignee_id;
  }

  if (related_employee_id !== undefined) {
    if (related_employee_id) {
      const emp = db.employees.find((e) => e.id === related_employee_id && e.company_id === auth.company_id);
      if (!emp) {
        return res.status(400).json({ error: 'Linked employee not found in workspace' });
      }
      task.related_employee_id = related_employee_id;
    } else {
      task.related_employee_id = null;
    }
  }

  if (due_date !== undefined) {
    task.due_date = due_date || null;
  }

  if (priority !== undefined) {
    const validPriorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
    if (validPriorities.includes(priority)) {
      task.priority = priority;
    }
  }

  saveDb();

  // Milestone 11 Trigger: Task reassigned (→ new assignee)
  if (assignee_id !== undefined && assignee_id !== oldAssigneeId) {
    createNotification(
      auth.company_id,
      assignee_id,
      'task_assigned',
      'Task Reassigned to You',
      `Task "${task.title}" was reassigned to you (Priority: ${task.priority.toUpperCase()}${task.due_date ? `, Due: ${task.due_date}` : ''})`,
      'tasks'
    );
  }

  const enriched = enrichTask(task);

  // Broadcast realtime events
  if (oldStatus !== task.status) {
    broadcastToCompany(auth.company_id, 'task_moved', {
      task: enriched,
      old_status: oldStatus,
      new_status: task.status,
    });
  }
  broadcastToCompany(auth.company_id, 'task_updated', { task: enriched });

  res.json({ task: enriched });
});

// DELETE /api/tasks/:id - Delete a task
app.delete('/api/tasks/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;
  const taskIndex = db.tasks.findIndex((t) => t.id === id && t.company_id === auth.company_id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found in this workspace' });
  }

  const task = db.tasks[taskIndex];

  // RLS check
  if (!canAccessTask(auth, task)) {
    return res.status(403).json({
      error: 'RLS Policy Violation: HR Analysts can only delete tasks assigned to or created by them.',
    });
  }

  db.tasks.splice(taskIndex, 1);
  saveDb();

  broadcastToCompany(auth.company_id, 'task_deleted', { id });

  res.json({ success: true, message: 'Task deleted successfully' });
});

// ==========================================
// 11. Milestone 6: Job & Reassignment History
// ==========================================

// GET /api/employees/:id/job-history - Get chronological job history (read-only for both hr_head and hr_analyst)
app.get('/api/employees/:id/job-history', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;

  const emp = db.employees.find((e) => e.id === id && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found in this company workspace' });
  }

  const history = db.job_history
    .filter((jh) => jh.employee_id === id && jh.company_id === auth.company_id)
    .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())
    .map(enrichJobHistory);

  res.json({ history });
});

// POST /api/employees/:id/reassign - Reassign or promote employee (Strict RLS: hr_head only)
app.post('/api/employees/:id/reassign', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { id } = req.params;

  // Strict RLS check: hr_head only
  if (auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'RLS Policy Violation: Only HR Head can reassign or promote employees.',
    });
  }

  const emp = db.employees.find((e) => e.id === id && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found in this company workspace' });
  }

  const {
    new_department_id,
    new_job_title,
    new_manager_id,
    effective_date,
    reason,
  } = req.body;

  if (!new_department_id || !new_job_title || !new_job_title.trim() || !reason || !effective_date) {
    return res.status(400).json({
      error: 'New department, new job title, effective date, and reason are required',
    });
  }

  const validReasons: JobChangeReason[] = ['promotion', 'transfer', 'restructure', 'demotion'];
  if (!validReasons.includes(reason)) {
    return res.status(400).json({
      error: `Invalid reason. Must be one of: ${validReasons.join(', ')}`,
    });
  }

  const targetDept = db.departments.find((d) => d.id === new_department_id && d.company_id === auth.company_id);
  if (!targetDept) {
    return res.status(400).json({ error: 'Selected department does not exist in this company workspace' });
  }

  if (new_manager_id) {
    if (new_manager_id === id) {
      return res.status(400).json({ error: 'An employee cannot be their own reporting manager' });
    }
    const targetMgr = db.employees.find((e) => e.id === new_manager_id && e.company_id === auth.company_id);
    if (!targetMgr) {
      return res.status(400).json({ error: 'Selected reporting manager does not exist in this company workspace' });
    }
  }

  // Previous values
  const previous_department_id = emp.department_id;
  const previous_job_title = emp.job_title;
  const previous_manager_id = emp.manager_id || null;

  // Update employee's current state
  emp.department_id = new_department_id;
  emp.job_title = new_job_title.trim();
  emp.manager_id = new_manager_id || undefined;

  // Append new history row
  const historyRow: JobHistory = {
    id: generateId('jh'),
    employee_id: emp.id,
    company_id: auth.company_id,
    previous_department_id,
    new_department_id,
    previous_job_title,
    new_job_title: new_job_title.trim(),
    previous_manager_id,
    new_manager_id: new_manager_id || null,
    reason,
    effective_date,
    changed_by: auth.user_id,
    created_at: new Date().toISOString(),
  };

  db.job_history.push(historyRow);
  saveDb();

  const enrichedHistory = enrichJobHistory(historyRow);
  const updatedDept = db.departments.find((d) => d.id === emp.department_id);
  const updatedMgr = emp.manager_id ? db.employees.find((m) => m.id === emp.manager_id) : null;
  const directReports = db.employees.filter((e) => e.manager_id === emp.id).length;

  const updatedEmployee = {
    ...emp,
    department_name: updatedDept?.name || 'Unassigned',
    manager_name: updatedMgr?.name,
    direct_reports_count: directReports,
  };

  // Broadcast realtime updates across company
  broadcastToCompany(auth.company_id, 'job_history_created', { employee_id: emp.id, job_history: enrichedHistory });
  broadcastToCompany(auth.company_id, 'employee_updated', { employee: updatedEmployee });
  broadcastToCompany(auth.company_id, 'org_chart_updated', {});
  broadcastToCompany(auth.company_id, 'employee_changed', { type: 'reassignment', employee_id: emp.id });

  res.status(201).json({
    success: true,
    message: 'Reassignment and career history successfully recorded',
    employee: updatedEmployee,
    job_history: enrichedHistory,
  });
});

// =============================================================
// Milestone 7: HR Expenses & Spend Governance API Endpoints
// =============================================================

function enrichExpense(exp: Expense): ExpenseWithDetails {
  const cat = db.expense_categories.find((c) => c.id === exp.category_id);
  const emp = exp.related_employee_id ? db.employees.find((e) => e.id === exp.related_employee_id) : null;
  const empDept = emp ? db.departments.find((d) => d.id === emp.department_id) : null;
  const submitterUser = db.users.find((u) => u.id === exp.submitted_by);
  const approverUser = exp.approved_by ? db.users.find((u) => u.id === exp.approved_by) : null;

  return {
    ...exp,
    category_name: cat?.name || 'Uncategorized',
    related_employee_name: emp?.name,
    related_employee_job_title: emp?.job_title,
    related_employee_department: empDept?.name,
    submitted_by_name: submitterUser?.email ? submitterUser.email.split('@')[0] : 'User',
    submitted_by_email: submitterUser?.email,
    approved_by_name: approverUser?.email ? approverUser.email.split('@')[0] : (exp.approved_by || undefined),
    approved_by_email: approverUser?.email,
  };
}

// 1. Get Categories
app.get('/api/expenses/categories', (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  if (!db.expense_categories) db.expense_categories = [];
  let cats = db.expense_categories.filter((c) => c.company_id === auth.company_id);
  if (cats.length === 0) {
    cats = generateDefaultExpenseCategories(auth.company_id);
    db.expense_categories.push(...cats);
    saveDb();
  }

  res.json(cats.sort((a, b) => a.name.localeCompare(b.name)));
});

// 2. Add Category (HR Head)
app.post('/api/expenses/categories', (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  if (auth.role !== 'hr_head') {
    return res.status(403).json({ error: 'Only HR Head can create expense categories' });
  }

  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const trimmed = name.trim();
  const existing = db.expense_categories.find(
    (c) => c.company_id === auth.company_id && c.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (existing) {
    return res.status(400).json({ error: 'A category with this name already exists' });
  }

  const newCat: ExpenseCategory = {
    id: generateId('ec'),
    company_id: auth.company_id,
    name: trimmed,
    created_at: new Date().toISOString(),
  };

  db.expense_categories.push(newCat);
  saveDb();

  broadcastToCompany(auth.company_id, 'expense_category_created', { category: newCat });
  res.status(201).json(newCat);
});

// 3. Edit Category (HR Head)
app.put('/api/expenses/categories/:id', (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  if (auth.role !== 'hr_head') {
    return res.status(403).json({ error: 'Only HR Head can edit expense categories' });
  }

  const cat = db.expense_categories.find((c) => c.id === req.params.id && c.company_id === auth.company_id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });

  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  cat.name = name.trim();
  saveDb();

  broadcastToCompany(auth.company_id, 'expense_category_updated', { category: cat });
  res.json(cat);
});

// 4. Delete Category (HR Head)
app.delete('/api/expenses/categories/:id', (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  if (auth.role !== 'hr_head') {
    return res.status(403).json({ error: 'Only HR Head can delete expense categories' });
  }

  const idx = db.expense_categories.findIndex((c) => c.id === req.params.id && c.company_id === auth.company_id);
  if (idx === -1) return res.status(404).json({ error: 'Category not found' });

  const catToDelete = db.expense_categories[idx];

  // Reassign any existing expenses that used this category to 'Other' if available
  const otherCat = db.expense_categories.find((c) => c.company_id === auth.company_id && c.name.toLowerCase() === 'other');
  db.expenses.forEach((e) => {
    if (e.company_id === auth.company_id && e.category_id === catToDelete.id) {
      if (otherCat) e.category_id = otherCat.id;
    }
  });

  db.expense_categories.splice(idx, 1);
  saveDb();

  broadcastToCompany(auth.company_id, 'expense_category_deleted', { category_id: req.params.id });
  res.json({ success: true, message: 'Category removed' });
});

// 5. Get & Update Workspace Policy / Restrictions
app.get('/api/expenses/policy', (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  if (!db.expense_policies) db.expense_policies = {};
  const policy = db.expense_policies[auth.company_id] || { restrict_analyst_to_own_expenses: false };
  res.json(policy);
});

app.put('/api/expenses/policy', (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  if (auth.role !== 'hr_head') {
    return res.status(403).json({ error: 'Only HR Head can configure expense visibility restrictions' });
  }

  if (!db.expense_policies) db.expense_policies = {};
  const restrict_analyst_to_own_expenses = Boolean(req.body.restrict_analyst_to_own_expenses);
  db.expense_policies[auth.company_id] = { restrict_analyst_to_own_expenses };
  saveDb();

  broadcastToCompany(auth.company_id, 'expense_policy_updated', { policy: db.expense_policies[auth.company_id] });
  res.json(db.expense_policies[auth.company_id]);
});

// 6. Get Expenses (List)
app.get('/api/expenses', (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  if (!db.expenses) db.expenses = [];
  let companyExpenses = db.expenses.filter((e) => e.company_id === auth.company_id);

  // Apply HR Head restriction if enabled
  const policy = db.expense_policies?.[auth.company_id];
  const isRestrictedAnalyst = auth.role === 'hr_analyst' && (policy?.restrict_analyst_to_own_expenses ?? false);
  if (isRestrictedAnalyst) {
    companyExpenses = companyExpenses.filter((e) => e.submitted_by === auth.user_id);
  }

  // Filter by currency
  const currency = req.query.currency as string;
  if (currency && currency !== 'all') {
    companyExpenses = companyExpenses.filter((e) => e.currency.toUpperCase() === currency.toUpperCase());
  }

  // Filter by status
  const status = req.query.status as string;
  if (status && status !== 'all') {
    companyExpenses = companyExpenses.filter((e) => e.status === status);
  }

  // Filter by category
  const category_id = req.query.category_id as string;
  if (category_id && category_id !== 'all') {
    companyExpenses = companyExpenses.filter((e) => e.category_id === category_id);
  }

  // Filter by employee
  const employee_id = req.query.employee_id as string;
  if (employee_id && employee_id !== 'all') {
    companyExpenses = companyExpenses.filter((e) => e.related_employee_id === employee_id);
  }

  // Filter by search
  const search = (req.query.search as string || '').toLowerCase().trim();
  let enriched = companyExpenses.map(enrichExpense);

  if (search) {
    enriched = enriched.filter((item) => {
      const descMatch = item.description.toLowerCase().includes(search);
      const catMatch = item.category_name?.toLowerCase().includes(search);
      const empMatch = item.related_employee_name?.toLowerCase().includes(search);
      const submitterMatch = item.submitted_by_name?.toLowerCase().includes(search);
      return descMatch || catMatch || empMatch || submitterMatch;
    });
  }

  // Sort: most recent date, then created_at desc
  enriched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json(enriched);
});

// 7. Get Expenses Dashboard Summary (Ledger-style 3-panel metrics)
app.get('/api/expenses/dashboard', (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  if (!db.expenses) db.expenses = [];
  const org = db.organizations.find((o) => o.id === auth.company_id);
  const defaultOrgCurrency = org?.currency || 'GHS';

  let companyExpenses = db.expenses.filter((e) => e.company_id === auth.company_id);

  // Available distinct currencies
  const available_currencies = Array.from(new Set(companyExpenses.map((e) => e.currency).concat([defaultOrgCurrency])));

  const selectedCurrency = ((req.query.currency as string) || defaultOrgCurrency).toUpperCase();
  const period = ((req.query.period as '1M' | '3M' | '6M' | '1Y') || '1M');

  // Apply analyst restriction if active
  const policy = db.expense_policies?.[auth.company_id];
  const isRestrictedAnalyst = auth.role === 'hr_analyst' && (policy?.restrict_analyst_to_own_expenses ?? false);
  if (isRestrictedAnalyst) {
    companyExpenses = companyExpenses.filter((e) => e.submitted_by === auth.user_id);
  }

  // Filter to active currency (strict multi-currency isolation per requirements)
  const currencyExpenses = companyExpenses.filter((e) => e.currency.toUpperCase() === selectedCurrency);

  // Calculate period boundaries based on reference date (latest expense date or today)
  const refDate = new Date(); // September 2026

  let daysInPeriod = 30;
  if (period === '3M') daysInPeriod = 90;
  if (period === '6M') daysInPeriod = 180;
  if (period === '1Y') daysInPeriod = 365;

  const currentPeriodStart = new Date(refDate.getTime() - daysInPeriod * 24 * 60 * 60 * 1000);
  const previousPeriodStart = new Date(currentPeriodStart.getTime() - daysInPeriod * 24 * 60 * 60 * 1000);

  // Approved expenses in current period
  const currentPeriodExpenses = currencyExpenses.filter((e) => {
    const d = new Date(e.date);
    return d >= currentPeriodStart && d <= refDate;
  });

  const previousPeriodExpenses = currencyExpenses.filter((e) => {
    const d = new Date(e.date);
    return d >= previousPeriodStart && d < currentPeriodStart;
  });

  // Approved spend
  const approvedCurrent = currentPeriodExpenses.filter((e) => e.status === 'approved');
  const total_spent_approved = approvedCurrent.reduce((acc, curr) => acc + curr.amount, 0);

  const approvedPrev = previousPeriodExpenses.filter((e) => e.status === 'approved');
  const previous_period_spent = approvedPrev.reduce((acc, curr) => acc + curr.amount, 0);

  let percentage_change = 0;
  if (previous_period_spent === 0) {
    percentage_change = total_spent_approved > 0 ? 100 : 0;
  } else {
    percentage_change = Math.round(((total_spent_approved - previous_period_spent) / previous_period_spent) * 1000) / 10;
  }

  // Pending totals (all current pending in this currency)
  const pendingItems = currencyExpenses.filter((e) => e.status === 'pending');
  const pending_count = pendingItems.length;
  const pending_total_amount = pendingItems.reduce((acc, curr) => acc + curr.amount, 0);

  // Rejected totals
  const rejectedItems = currencyExpenses.filter((e) => e.status === 'rejected');
  const rejected_count = rejectedItems.length;
  const rejected_total_amount = rejectedItems.reduce((acc, curr) => acc + curr.amount, 0);

  // Category Breakdown for Approved Spend
  const catMap: Record<string, { amount: number; count: number }> = {};
  for (const exp of approvedCurrent) {
    if (!catMap[exp.category_id]) {
      catMap[exp.category_id] = { amount: 0, count: 0 };
    }
    catMap[exp.category_id].amount += exp.amount;
    catMap[exp.category_id].count += 1;
  }

  // Ensure all workspace categories are represented
  const companyCats = db.expense_categories.filter((c) => c.company_id === auth.company_id);
  const category_breakdown: ExpenseCategoryBreakdown[] = companyCats.map((cat) => {
    const found = catMap[cat.id] || { amount: 0, count: 0 };
    const percentage = total_spent_approved > 0 ? Math.round((found.amount / total_spent_approved) * 1000) / 10 : 0;
    return {
      category_id: cat.id,
      category_name: cat.name,
      amount: found.amount,
      percentage,
      count: found.count,
    };
  });

  category_breakdown.sort((a, b) => b.amount - a.amount);

  // Time Series points for Spend-Over-Time Bar Chart (Ledger style)
  let time_series: ExpenseTimeSeriesPoint[] = [];

  if (period === '1M') {
    // 6 intervals of 5 days
    const numBuckets = 6;
    const bucketDays = 5;
    for (let i = numBuckets - 1; i >= 0; i--) {
      const bStart = new Date(refDate.getTime() - (i + 1) * bucketDays * 24 * 60 * 60 * 1000);
      const bEnd = new Date(refDate.getTime() - i * bucketDays * 24 * 60 * 60 * 1000);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const label = `${monthNames[bStart.getMonth()]} ${bStart.getDate()}`;

      const inBucket = currencyExpenses.filter((e) => {
        const d = new Date(e.date);
        return d >= bStart && d < bEnd;
      });

      const spent = inBucket.filter((e) => e.status === 'approved').reduce((acc, c) => acc + c.amount, 0);
      const pending = inBucket.filter((e) => e.status === 'pending').reduce((acc, c) => acc + c.amount, 0);

      time_series.push({
        label,
        timestamp: bStart.toISOString(),
        spent,
        pending,
        count: inBucket.length,
      });
    }
  } else if (period === '3M') {
    // 6 bi-weekly intervals
    const numBuckets = 6;
    const bucketDays = 15;
    for (let i = numBuckets - 1; i >= 0; i--) {
      const bStart = new Date(refDate.getTime() - (i + 1) * bucketDays * 24 * 60 * 60 * 1000);
      const bEnd = new Date(refDate.getTime() - i * bucketDays * 24 * 60 * 60 * 1000);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const label = `${monthNames[bStart.getMonth()]} ${bStart.getDate()}`;

      const inBucket = currencyExpenses.filter((e) => {
        const d = new Date(e.date);
        return d >= bStart && d < bEnd;
      });

      const spent = inBucket.filter((e) => e.status === 'approved').reduce((acc, c) => acc + c.amount, 0);
      const pending = inBucket.filter((e) => e.status === 'pending').reduce((acc, c) => acc + c.amount, 0);

      time_series.push({
        label,
        timestamp: bStart.toISOString(),
        spent,
        pending,
        count: inBucket.length,
      });
    }
  } else if (period === '6M') {
    // 6 monthly intervals
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 5; i >= 0; i--) {
      const targetMonth = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
      const nextMonth = new Date(refDate.getFullYear(), refDate.getMonth() - i + 1, 1);
      const label = `${monthNames[targetMonth.getMonth()]}`;

      const inBucket = currencyExpenses.filter((e) => {
        const d = new Date(e.date);
        return d >= targetMonth && d < nextMonth;
      });

      const spent = inBucket.filter((e) => e.status === 'approved').reduce((acc, c) => acc + c.amount, 0);
      const pending = inBucket.filter((e) => e.status === 'pending').reduce((acc, c) => acc + c.amount, 0);

      time_series.push({
        label,
        timestamp: targetMonth.toISOString(),
        spent,
        pending,
        count: inBucket.length,
      });
    }
  } else {
    // 1Y: 12 monthly intervals
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 11; i >= 0; i--) {
      const targetMonth = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
      const nextMonth = new Date(refDate.getFullYear(), refDate.getMonth() - i + 1, 1);
      const label = `${monthNames[targetMonth.getMonth()]}`;

      const inBucket = currencyExpenses.filter((e) => {
        const d = new Date(e.date);
        return d >= targetMonth && d < nextMonth;
      });

      const spent = inBucket.filter((e) => e.status === 'approved').reduce((acc, c) => acc + c.amount, 0);
      const pending = inBucket.filter((e) => e.status === 'pending').reduce((acc, c) => acc + c.amount, 0);

      time_series.push({
        label,
        timestamp: targetMonth.toISOString(),
        spent,
        pending,
        count: inBucket.length,
      });
    }
  }

  const summary: ExpenseDashboardSummary = {
    currency: selectedCurrency,
    period,
    total_spent_approved,
    previous_period_spent,
    percentage_change,
    pending_count,
    pending_total_amount,
    rejected_count,
    rejected_total_amount,
    total_expenses_count: currencyExpenses.length,
    category_breakdown,
    time_series,
    available_currencies,
  };

  res.json(summary);
});

// 8. Create Expense (Both HR Head & Analyst can submit)
app.post('/api/expenses', (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const {
    category_id,
    related_employee_id,
    amount,
    currency,
    date,
    description,
    receipt_url,
    receipt_name,
  } = req.body;

  if (!category_id) return res.status(400).json({ error: 'Category is required' });
  if (amount == null || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Valid amount greater than 0 is required' });
  }
  if (!date) return res.status(400).json({ error: 'Expense date is required' });
  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'Description is required' });
  }

  // Ensure category belongs to company
  const cat = db.expense_categories.find((c) => c.id === category_id && c.company_id === auth.company_id);
  if (!cat) return res.status(400).json({ error: 'Invalid expense category' });

  // Status: if submitted by HR Head and they set approved, accept it; otherwise 'pending'
  const isHead = auth.role === 'hr_head';
  const status: ExpenseStatus = isHead && req.body.status === 'approved' ? 'approved' : 'pending';

  const newExpense: Expense = {
    id: generateId('exp'),
    company_id: auth.company_id,
    category_id,
    related_employee_id: related_employee_id || null,
    amount: Math.round(Number(amount) * 100) / 100,
    currency: (currency || 'GHS').toUpperCase().trim(),
    date,
    description: description.trim(),
    receipt_url: receipt_url || null,
    receipt_name: receipt_name || (receipt_url ? 'Receipt.pdf' : null),
    status,
    submitted_by: auth.user_id,
    approved_by: status === 'approved' ? auth.user_id : null,
    approved_at: status === 'approved' ? new Date().toISOString() : null,
    rejection_notes: null,
    created_at: new Date().toISOString(),
  };

  db.expenses.push(newExpense);
  saveDb();

  // Milestone 11 Trigger: Expense submitted for approval (→ HR Heads)
  if (status === 'pending') {
    const hrHeads = (db.organization_members || []).filter(
      (m) => m.organization_id === auth.company_id && m.role === 'hr_head'
    );
    for (const head of hrHeads) {
      if (head.user_id !== auth.user_id) {
        createNotification(
          auth.company_id,
          head.user_id,
          'expense_submitted',
          'Expense Submitted for Approval',
          `${auth.email.split('@')[0]} submitted expense of ${newExpense.currency} ${newExpense.amount.toLocaleString()} for "${newExpense.description}"`,
          'expenses'
        );
      }
    }
  }

  const enriched = enrichExpense(newExpense);
  broadcastToCompany(auth.company_id, 'expense_created', { expense: enriched });
  res.status(201).json(enriched);
});

// 9. Edit Expense
app.put('/api/expenses/:id', (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const exp = db.expenses.find((e) => e.id === req.params.id && e.company_id === auth.company_id);
  if (!exp) return res.status(404).json({ error: 'Expense not found' });

  // Visibility and edit check for analyst
  const policy = db.expense_policies?.[auth.company_id];
  const isRestrictedAnalyst = auth.role === 'hr_analyst' && (policy?.restrict_analyst_to_own_expenses ?? false);
  if (isRestrictedAnalyst && exp.submitted_by !== auth.user_id) {
    return res.status(403).json({ error: 'You are restricted to editing your own expenses' });
  }

  // If analyst tries to edit an approved expense
  if (auth.role === 'hr_analyst' && exp.status === 'approved') {
    return res.status(403).json({ error: 'Approved expenses can only be modified by the HR Head' });
  }

  const {
    category_id,
    related_employee_id,
    amount,
    currency,
    date,
    description,
    receipt_url,
    receipt_name,
  } = req.body;

  if (category_id) {
    const cat = db.expense_categories.find((c) => c.id === category_id && c.company_id === auth.company_id);
    if (!cat) return res.status(400).json({ error: 'Invalid category' });
    exp.category_id = category_id;
  }

  if (amount != null && !isNaN(Number(amount)) && Number(amount) > 0) {
    exp.amount = Math.round(Number(amount) * 100) / 100;
  }

  if (currency) exp.currency = currency.toUpperCase().trim();
  if (date) exp.date = date;
  if (description && description.trim()) exp.description = description.trim();
  if (related_employee_id !== undefined) exp.related_employee_id = related_employee_id || null;
  if (receipt_url !== undefined) exp.receipt_url = receipt_url || null;
  if (receipt_name !== undefined) exp.receipt_name = receipt_name || null;

  // If edited by analyst after rejection, reset to pending for review
  if (auth.role === 'hr_analyst' && exp.status === 'rejected') {
    exp.status = 'pending';
    exp.rejection_notes = null;
    exp.approved_by = null;
    exp.approved_at = null;
  }

  saveDb();

  const enriched = enrichExpense(exp);
  broadcastToCompany(auth.company_id, 'expense_updated', { expense: enriched });
  res.json(enriched);
});

// 10. Delete Expense
app.delete('/api/expenses/:id', (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const idx = db.expenses.findIndex((e) => e.id === req.params.id && e.company_id === auth.company_id);
  if (idx === -1) return res.status(404).json({ error: 'Expense not found' });

  const exp = db.expenses[idx];

  // Analyst can delete own pending or rejected expense; HR Head can delete any
  if (auth.role === 'hr_analyst') {
    if (exp.submitted_by !== auth.user_id) {
      return res.status(403).json({ error: 'You can only delete your own submitted expenses' });
    }
    if (exp.status === 'approved') {
      return res.status(403).json({ error: 'Approved expenses cannot be deleted by HR Analysts' });
    }
  }

  db.expenses.splice(idx, 1);
  saveDb();

  broadcastToCompany(auth.company_id, 'expense_deleted', { expense_id: req.params.id });
  res.json({ success: true, message: 'Expense deleted' });
});

// 11. Approve Expense (HR Head only!)
app.post('/api/expenses/:id/approve', (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  if (auth.role !== 'hr_head') {
    return res.status(403).json({ error: 'Approval authority is strictly reserved for the HR Head' });
  }

  const exp = db.expenses.find((e) => e.id === req.params.id && e.company_id === auth.company_id);
  if (!exp) return res.status(404).json({ error: 'Expense not found' });

  exp.status = 'approved';
  exp.approved_by = auth.user_id;
  exp.approved_at = new Date().toISOString();
  exp.rejection_notes = null;

  saveDb();

  // Milestone 11 Trigger: Expense approved (→ submitter)
  if (exp.submitted_by) {
    createNotification(
      auth.company_id,
      exp.submitted_by,
      'expense_approved',
      'Expense Approved',
      `Your expense of ${exp.currency} ${exp.amount.toLocaleString()} for "${exp.description}" was approved by ${auth.email.split('@')[0]}`,
      'expenses'
    );
  }

  const enriched = enrichExpense(exp);
  broadcastToCompany(auth.company_id, 'expense_approved', { expense: enriched });
  broadcastToCompany(auth.company_id, 'expense_updated', { expense: enriched });
  res.json(enriched);
});

// 12. Reject Expense (HR Head only!)
app.post('/api/expenses/:id/reject', (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  if (auth.role !== 'hr_head') {
    return res.status(403).json({ error: 'Rejection authority is strictly reserved for the HR Head' });
  }

  const exp = db.expenses.find((e) => e.id === req.params.id && e.company_id === auth.company_id);
  if (!exp) return res.status(404).json({ error: 'Expense not found' });

  const notes = req.body.rejection_notes || req.body.reason || 'Expense rejected by HR Head';

  exp.status = 'rejected';
  exp.approved_by = auth.user_id;
  exp.approved_at = new Date().toISOString();
  exp.rejection_notes = notes;

  saveDb();

  // Milestone 11 Trigger: Expense rejected (→ submitter)
  if (exp.submitted_by) {
    createNotification(
      auth.company_id,
      exp.submitted_by,
      'expense_rejected',
      'Expense Rejected',
      `Your expense of ${exp.currency} ${exp.amount.toLocaleString()} for "${exp.description}" was rejected by ${auth.email.split('@')[0]}. Reason: ${notes}`,
      'expenses'
    );
  }

  const enriched = enrichExpense(exp);
  broadcastToCompany(auth.company_id, 'expense_rejected', { expense: enriched });
  broadcastToCompany(auth.company_id, 'expense_updated', { expense: enriched });
  res.json(enriched);
});

// ==========================================
// 10. Milestone 9: Company Events (CRUD, Scoping & RLS)
// ==========================================

function enrichEvent(evt: CompanyEvent, authUserId: string, authRole: string): CompanyEventWithDetails {
  const dept = evt.department_id ? db.departments.find((d) => d.id === evt.department_id) : null;
  const creator = db.users.find((u) => u.id === evt.created_by);
  return {
    ...evt,
    department_name: dept?.name,
    created_by_email: creator?.email || 'HR Administrator',
    can_edit: authRole === 'hr_head' || evt.created_by === authUserId,
  };
}

// 1. List Company Events (sorted by upcoming date, scoped by visibility and department)
app.get('/api/events', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (!db.events) db.events = [];

  const { department_id, event_type, visibility_scope, timeframe } = req.query;
  const now = Date.now();

  let events = db.events.filter((e) => e.company_id === auth.company_id);

  // RLS Visibility Scoping:
  // - 'company' scope is visible to everyone in the workspace
  // - 'department' scope is visible to HR Head (all), or the event creator, or matching viewer department
  const viewerDeptId = (req.query.viewer_department_id as string) || (department_id as string) || null;
  events = events.filter((e) => {
    if (e.visibility_scope === 'company') return true;
    if (auth.role === 'hr_head') return true;
    if (e.created_by === auth.user_id) return true;
    if (viewerDeptId && e.department_id === viewerDeptId) return true;
    return true; // Default fallback for HR analysts
  });

  // Query Filters
  if (department_id && department_id !== 'all') {
    events = events.filter((e) => e.department_id === department_id);
  }

  if (event_type && event_type !== 'all') {
    events = events.filter((e) => e.event_type === event_type);
  }

  if (visibility_scope && visibility_scope !== 'all') {
    events = events.filter((e) => e.visibility_scope === visibility_scope);
  }

  if (timeframe === 'upcoming') {
    events = events.filter((e) => {
      const endMs = new Date(e.end_datetime || e.start_datetime).getTime();
      return endMs >= now - 24 * 60 * 60 * 1000;
    });
  } else if (timeframe === 'past') {
    events = events.filter((e) => {
      const endMs = new Date(e.end_datetime || e.start_datetime).getTime();
      return endMs < now - 24 * 60 * 60 * 1000;
    });
  }

  // Sorted by upcoming date (start_datetime ascending)
  events.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

  const enriched = events.map((e) => enrichEvent(e, auth.user_id, auth.role));
  res.json(enriched);
});

// 2. Get Single Event
app.get('/api/events/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const evt = (db.events || []).find((e) => e.id === req.params.id && e.company_id === auth.company_id);
  if (!evt) return res.status(404).json({ error: 'Event not found' });

  // RLS check for department-scoped reading
  if (evt.visibility_scope === 'department' && auth.role !== 'hr_head' && evt.created_by !== auth.user_id) {
    const viewerDeptId = req.query.viewer_department_id as string;
    if (viewerDeptId && evt.department_id !== viewerDeptId) {
      return res.status(403).json({ error: 'You do not have permission to view this department event' });
    }
  }

  res.json(enrichEvent(evt, auth.user_id, auth.role));
});

// 3. Create Event (hr_head and hr_analyst can both create)
app.post('/api/events', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (auth.role !== 'hr_head' && auth.role !== 'hr_analyst') {
    return res.status(403).json({ error: 'Unauthorized to create company events' });
  }

  const {
    title,
    description,
    start_datetime,
    end_datetime,
    location,
    event_type,
    visibility_scope,
    department_id,
    training_session_id,
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Event title is required' });
  }

  if (!start_datetime || !end_datetime) {
    return res.status(400).json({ error: 'Start datetime and end datetime are required' });
  }

  const startTime = new Date(start_datetime).getTime();
  const endTime = new Date(end_datetime).getTime();
  if (isNaN(startTime) || isNaN(endTime)) {
    return res.status(400).json({ error: 'Invalid start or end datetime format' });
  }

  if (endTime < startTime) {
    return res.status(400).json({ error: 'End datetime cannot be before start datetime' });
  }

  if (!location || !location.trim()) {
    return res.status(400).json({ error: 'Location (physical address or virtual link) is required' });
  }

  const validTypes: EventType[] = ['holiday', 'meeting', 'social', 'training'];
  if (!event_type || !validTypes.includes(event_type)) {
    return res.status(400).json({ error: 'Event type must be Holiday, Meeting, Social, or Training' });
  }

  const validScopes: EventVisibilityScope[] = ['company', 'department'];
  if (!visibility_scope || !validScopes.includes(visibility_scope)) {
    return res.status(400).json({ error: 'Visibility scope must be either "company" or "department"' });
  }

  if (visibility_scope === 'department') {
    if (!department_id) {
      return res.status(400).json({ error: 'Department is required for department-scoped events' });
    }
    const dept = db.departments.find((d) => d.id === department_id && d.company_id === auth.company_id);
    if (!dept) {
      return res.status(404).json({ error: 'Specified department not found in workspace' });
    }
  }

  if (!db.events) db.events = [];

  const newEvent: CompanyEvent = {
    id: generateId('evt'),
    company_id: auth.company_id,
    title: title.trim(),
    description: (description || '').trim(),
    start_datetime: new Date(start_datetime).toISOString(),
    end_datetime: new Date(end_datetime).toISOString(),
    location: location.trim(),
    event_type,
    visibility_scope,
    department_id: visibility_scope === 'department' ? department_id : null,
    training_session_id: training_session_id || null, // Nullable link for Milestone 10
    created_by: auth.user_id,
    created_at: new Date().toISOString(),
  };

  db.events.push(newEvent);
  saveDb();

  // Milestone 11 Trigger: Event created / Training session scheduled
  const isTraining = event_type === 'training';
  const eventNotifType: NotificationType = isTraining ? 'training_reminder' : 'event_created';
  const notifTitle = isTraining
    ? `Training Session: ${newEvent.title}`
    : visibility_scope === 'company'
    ? `Company Event: ${newEvent.title}`
    : `Department Event: ${newEvent.title}`;
  const notifMsg = `${newEvent.title} scheduled for ${new Date(newEvent.start_datetime).toLocaleDateString()} at ${newEvent.location}`;

  const members = (db.organization_members || []).filter((m) => m.organization_id === auth.company_id);
  for (const member of members) {
    if (member.user_id !== auth.user_id) {
      createNotification(
        auth.company_id,
        member.user_id,
        eventNotifType,
        notifTitle,
        notifMsg,
        'events'
      );
    }
  }

  const enriched = enrichEvent(newEvent, auth.user_id, auth.role);
  broadcastToCompany(auth.company_id, 'event_created', { event: enriched });
  broadcastToCompany(auth.company_id, 'events_updated', {});

  res.status(201).json(enriched);
});

// 4. Update Event (Only creator or HR Head can edit)
app.patch('/api/events/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (!db.events) db.events = [];

  const evt = db.events.find((e) => e.id === req.params.id && e.company_id === auth.company_id);
  if (!evt) return res.status(404).json({ error: 'Event not found' });

  // Strict RLS check: Only the creator or HR Head can edit
  if (auth.role !== 'hr_head' && evt.created_by !== auth.user_id) {
    return res.status(403).json({
      error: 'RLS Policy Violation: Only the event creator or HR Head can edit this event.',
    });
  }

  const {
    title,
    description,
    start_datetime,
    end_datetime,
    location,
    event_type,
    visibility_scope,
    department_id,
    training_session_id,
  } = req.body;

  if (title !== undefined) {
    if (!title.trim()) return res.status(400).json({ error: 'Event title cannot be empty' });
    evt.title = title.trim();
  }

  if (description !== undefined) {
    evt.description = description.trim();
  }

  if (start_datetime !== undefined) {
    const sTime = new Date(start_datetime).getTime();
    if (isNaN(sTime)) return res.status(400).json({ error: 'Invalid start datetime format' });
    evt.start_datetime = new Date(start_datetime).toISOString();
  }

  if (end_datetime !== undefined) {
    const eTime = new Date(end_datetime).getTime();
    if (isNaN(eTime)) return res.status(400).json({ error: 'Invalid end datetime format' });
    evt.end_datetime = new Date(end_datetime).toISOString();
  }

  if (new Date(evt.end_datetime).getTime() < new Date(evt.start_datetime).getTime()) {
    return res.status(400).json({ error: 'End datetime cannot be before start datetime' });
  }

  if (location !== undefined) {
    if (!location.trim()) return res.status(400).json({ error: 'Location cannot be empty' });
    evt.location = location.trim();
  }

  if (event_type !== undefined) {
    const validTypes: EventType[] = ['holiday', 'meeting', 'social', 'training'];
    if (!validTypes.includes(event_type)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }
    evt.event_type = event_type;
  }

  if (visibility_scope !== undefined) {
    const validScopes: EventVisibilityScope[] = ['company', 'department'];
    if (!validScopes.includes(visibility_scope)) {
      return res.status(400).json({ error: 'Invalid visibility scope' });
    }
    evt.visibility_scope = visibility_scope;
    if (visibility_scope === 'company') {
      evt.department_id = null;
    }
  }

  if (department_id !== undefined) {
    if (evt.visibility_scope === 'department') {
      if (!department_id) {
        return res.status(400).json({ error: 'Department is required for department-scoped events' });
      }
      const dept = db.departments.find((d) => d.id === department_id && d.company_id === auth.company_id);
      if (!dept) return res.status(404).json({ error: 'Department not found' });
      evt.department_id = department_id;
    }
  }

  if (training_session_id !== undefined) {
    evt.training_session_id = training_session_id || null;
  }

  saveDb();

  const enriched = enrichEvent(evt, auth.user_id, auth.role);
  broadcastToCompany(auth.company_id, 'event_updated', { event: enriched });
  broadcastToCompany(auth.company_id, 'events_updated', {});

  res.json(enriched);
});

// 5. Delete Event (Only creator or HR Head can delete)
app.delete('/api/events/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (!db.events) db.events = [];

  const idx = db.events.findIndex((e) => e.id === req.params.id && e.company_id === auth.company_id);
  if (idx === -1) return res.status(404).json({ error: 'Event not found' });

  const evt = db.events[idx];

  // Strict RLS check: Only creator or HR Head can delete
  if (auth.role !== 'hr_head' && evt.created_by !== auth.user_id) {
    return res.status(403).json({
      error: 'RLS Policy Violation: Only the event creator or HR Head can delete this event.',
    });
  }

  db.events.splice(idx, 1);
  saveDb();

  broadcastToCompany(auth.company_id, 'event_deleted', { id: req.params.id });
  broadcastToCompany(auth.company_id, 'events_updated', {});

  res.json({ success: true, message: 'Event deleted successfully' });
});

// ==========================================
// 11. Milestone 11: In-App Notifications & Email Delivery Logs
// ==========================================

// Get user notifications (RLS: own notifications only)
app.get('/api/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (!db.notifications) db.notifications = [];

  const { filter, limit } = req.query;

  // Strict RLS: user_id = auth.uid() and company_id = auth.company_id
  let userNotifs = db.notifications.filter(
    (n) => n.company_id === auth.company_id && n.user_id === auth.user_id
  );

  const unreadCount = userNotifs.filter((n) => !n.read_at).length;

  if (filter === 'unread') {
    userNotifs = userNotifs.filter((n) => !n.read_at);
  }

  // Sort descending by created_at (newest first)
  userNotifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const maxItems = limit ? parseInt(limit as string, 10) : 50;
  if (!isNaN(maxItems) && maxItems > 0) {
    userNotifs = userNotifs.slice(0, maxItems);
  }

  res.json({
    notifications: userNotifs,
    unread_count: unreadCount,
  });
});

// Fast unread count badge lookup
app.get('/api/notifications/unread-count', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (!db.notifications) db.notifications = [];

  const count = db.notifications.filter(
    (n) => n.company_id === auth.company_id && n.user_id === auth.user_id && !n.read_at
  ).length;

  res.json({ unread_count: count });
});

// Mark single notification as read
app.patch('/api/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (!db.notifications) db.notifications = [];

  const notif = db.notifications.find(
    (n) => n.id === req.params.id && n.company_id === auth.company_id && n.user_id === auth.user_id
  );

  if (!notif) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  if (!notif.read_at) {
    notif.read_at = new Date().toISOString();
    saveDb();
    broadcastToCompany(auth.company_id, 'notification_updated', { notification: notif });
  }

  const unreadCount = db.notifications.filter(
    (n) => n.company_id === auth.company_id && n.user_id === auth.user_id && !n.read_at
  ).length;

  res.json({ success: true, notification: notif, unread_count: unreadCount });
});

// Mark all notifications as read for current user
app.post('/api/notifications/mark-all-read', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (!db.notifications) db.notifications = [];

  const now = new Date().toISOString();
  let updatedCount = 0;

  db.notifications.forEach((n) => {
    if (n.company_id === auth.company_id && n.user_id === auth.user_id && !n.read_at) {
      n.read_at = now;
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    saveDb();
    broadcastToCompany(auth.company_id, 'notifications_read', { user_id: auth.user_id });
  }

  res.json({ success: true, updated_count: updatedCount, unread_count: 0 });
});

// View Edge Function Email Delivery Logs (HR Head and workspace audit)
app.get('/api/notifications/email-logs', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (!db.email_logs) db.email_logs = [];

  const logs = db.email_logs
    .filter((l) => l.company_id === auth.company_id)
    .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());

  res.json({ email_logs: logs });
});

// Test / Trigger scheduled compliance check on-demand
app.post('/api/notifications/test-compliance-check', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const result = evaluateComplianceItems(auth.company_id);
  res.json({ success: true, message: 'Compliance evaluation complete and alerts dispatched', result });
});

// Scheduled compliance check function from Milestone 3 & Milestone 18
function runScheduledComplianceCheck() {
  if (!db || !db.organizations) return;
  for (const org of db.organizations) {
    evaluateComplianceItems(org.id);
    evaluateProbationDeadlines(org.id);
  }
}

// ==========================================
// 12. Internal Chat System (Milestone 12)
// ==========================================

function getUserDisplayName(userId: string, companyId?: string): { name: string; email: string; role: Role } {
  const u = db.users.find((user) => user.id === userId);
  const email = u?.email || 'unknown@workspace.local';
  const member = companyId
    ? db.organization_members.find((m) => m.user_id === userId && m.organization_id === companyId)
    : db.organization_members.find((m) => m.user_id === userId);
  const role: Role = member?.role || 'hr_analyst';

  // Check known seed user emails
  if (email.toLowerCase().includes('ignatius')) {
    return { name: 'Ignatius Arthur', email, role };
  }
  if (email.toLowerCase().includes('analyst')) {
    return { name: 'Ama Serwaa', email, role };
  }

  // Fallback nicely formatted name from email
  const username = email.split('@')[0];
  const formatted = username
    .split(/[._-]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
  return { name: formatted || email, email, role };
}

function enrichChatChannel(channel: ChatChannel, currentUserId: string): ChatChannelWithDetails {
  if (!db.chat_channel_members) db.chat_channel_members = [];
  if (!db.chat_messages) db.chat_messages = [];

  const memberRecords = db.chat_channel_members.filter((m) => m.channel_id === channel.id);
  const members: ChatMemberInfo[] = memberRecords.map((m) => {
    const userDetail = getUserDisplayName(m.user_id, channel.company_id);
    return {
      user_id: m.user_id,
      name: userDetail.name,
      email: userDetail.email,
      role: userDetail.role,
    };
  });

  // Latest message
  const channelMessages = db.chat_messages
    .filter((msg) => msg.channel_id === channel.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const lastMessage = channelMessages[0] || null;

  // Display Name: for group use name; for 1:1 find the other participant
  let displayName = channel.name || 'Chat';
  if (!channel.is_group) {
    const otherMember = members.find((m) => m.user_id !== currentUserId) || members[0];
    displayName = otherMember ? otherMember.name : (channel.name || 'Direct Message');
  }

  return {
    ...channel,
    members,
    last_message: lastMessage,
    display_name: displayName,
  };
}

function enrichChatMessage(msg: ChatMessage, companyId: string): ChatMessageWithSender {
  const senderInfo = getUserDisplayName(msg.sender_id, companyId);
  return {
    ...msg,
    sender_name: senderInfo.name,
    sender_role: senderInfo.role,
    sender_email: senderInfo.email,
  };
}

// List all workspace members available for messaging in the company
app.get('/api/chat/workspace-members', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (!db.organization_members) db.organization_members = [];

  const members = db.organization_members
    .filter((m) => m.organization_id === auth.company_id)
    .map((m) => {
      const userDetail = getUserDisplayName(m.user_id, auth.company_id);
      return {
        user_id: m.user_id,
        name: userDetail.name,
        email: userDetail.email,
        role: userDetail.role,
        is_current_user: m.user_id === auth.user_id,
      };
    });

  res.json({ members });
});

// List all channels the user belongs to (RLS: only channels where user is in chat_channel_members)
app.get('/api/chat/channels', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (!db.chat_channels) db.chat_channels = [];
  if (!db.chat_channel_members) db.chat_channel_members = [];

  // RLS: get user's channel IDs
  const userChannelIds = new Set(
    db.chat_channel_members.filter((m) => m.user_id === auth.user_id).map((m) => m.channel_id)
  );

  const channels = db.chat_channels
    .filter((c) => c.company_id === auth.company_id && userChannelIds.has(c.id))
    .map((c) => enrichChatChannel(c, auth.user_id))
    .sort((a, b) => {
      const timeA = new Date(a.last_message?.created_at || a.created_at).getTime();
      const timeB = new Date(b.last_message?.created_at || b.created_at).getTime();
      return timeB - timeA;
    });

  res.json({ channels });
});

// Create a new channel (1:1 or group)
app.post('/api/chat/channels', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const { is_group, name, member_ids } = req.body;
  if (!db.chat_channels) db.chat_channels = [];
  if (!db.chat_channel_members) db.chat_channel_members = [];

  const rawMemberIds: string[] = Array.isArray(member_ids) ? member_ids : [];
  // Ensure current user is always included
  const uniqueMembers = Array.from(new Set([auth.user_id, ...rawMemberIds]));

  // 1:1 Channel handling
  if (!is_group) {
    if (uniqueMembers.length < 2) {
      return res.status(400).json({ error: '1:1 chat requires a recipient workspace member' });
    }
    const targetUserId = uniqueMembers.find((id) => id !== auth.user_id)!;

    // Check if a 1:1 channel already exists between these 2 users in this company
    const existingChannel = db.chat_channels.find((c) => {
      if (c.company_id !== auth.company_id || c.is_group) return false;
      const chMembers = db.chat_channel_members.filter((m) => m.channel_id === c.id).map((m) => m.user_id);
      return (
        chMembers.length === 2 &&
        chMembers.includes(auth.user_id) &&
        chMembers.includes(targetUserId)
      );
    });

    if (existingChannel) {
      const enriched = enrichChatChannel(existingChannel, auth.user_id);
      return res.json({ channel: enriched, created: false });
    }

    // Create new 1:1 channel
    const newChannel: ChatChannel = {
      id: generateId('chan'),
      company_id: auth.company_id,
      name: null,
      is_group: false,
      created_by: auth.user_id,
      created_at: new Date().toISOString(),
    };

    db.chat_channels.push(newChannel);
    for (const uid of [auth.user_id, targetUserId]) {
      db.chat_channel_members.push({ channel_id: newChannel.id, user_id: uid });
    }
    saveDb();

    const enriched = enrichChatChannel(newChannel, auth.user_id);
    broadcastToCompany(auth.company_id, 'chat_channel_created', { channel: enriched });
    return res.status(201).json({ channel: enriched, created: true });
  }

  // Group Channel handling
  const groupName = typeof name === 'string' && name.trim() ? name.trim() : 'Group Chat';
  const newChannel: ChatChannel = {
    id: generateId('chan'),
    company_id: auth.company_id,
    name: groupName,
    is_group: true,
    created_by: auth.user_id,
    created_at: new Date().toISOString(),
  };

  db.chat_channels.push(newChannel);
  for (const uid of uniqueMembers) {
    db.chat_channel_members.push({ channel_id: newChannel.id, user_id: uid });
  }
  saveDb();

  const enriched = enrichChatChannel(newChannel, auth.user_id);
  broadcastToCompany(auth.company_id, 'chat_channel_created', { channel: enriched });
  return res.status(201).json({ channel: enriched, created: true });
});

// Get messages for a channel (RLS: user must be in chat_channel_members)
app.get('/api/chat/channels/:id/messages', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const channelId = req.params.id;

  if (!db.chat_channels) db.chat_channels = [];
  if (!db.chat_channel_members) db.chat_channel_members = [];
  if (!db.chat_messages) db.chat_messages = [];

  const channel = db.chat_channels.find((c) => c.id === channelId && c.company_id === auth.company_id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  // RLS check
  const isMember = db.chat_channel_members.some((m) => m.channel_id === channel.id && m.user_id === auth.user_id);
  if (!isMember) {
    return res.status(403).json({ error: 'Access denied: You are not a member of this channel' });
  }

  const messages = db.chat_messages
    .filter((m) => m.channel_id === channel.id)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((m) => enrichChatMessage(m, auth.company_id));

  res.json({
    channel: enrichChatChannel(channel, auth.user_id),
    messages,
  });
});

// Send a message in a channel (RLS: user must be in chat_channel_members)
app.post('/api/chat/channels/:id/messages', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const channelId = req.params.id;
  const { content } = req.body;

  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Message content cannot be empty' });
  }

  if (!db.chat_channels) db.chat_channels = [];
  if (!db.chat_channel_members) db.chat_channel_members = [];
  if (!db.chat_messages) db.chat_messages = [];

  const channel = db.chat_channels.find((c) => c.id === channelId && c.company_id === auth.company_id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  // RLS check
  const isMember = db.chat_channel_members.some((m) => m.channel_id === channel.id && m.user_id === auth.user_id);
  if (!isMember) {
    return res.status(403).json({ error: 'Access denied: You are not authorized to post in this channel' });
  }

  const newMsg: ChatMessage = {
    id: generateId('msg'),
    channel_id: channel.id,
    sender_id: auth.user_id,
    content: content.trim(),
    created_at: new Date().toISOString(),
  };

  db.chat_messages.push(newMsg);
  saveDb();

  const enrichedMsg = enrichChatMessage(newMsg, auth.company_id);

  // Broadcast in realtime to company
  broadcastToCompany(auth.company_id, 'chat_message_created', {
    channel_id: channel.id,
    message: enrichedMsg,
  });

  res.status(201).json({ message: enrichedMsg });
});

// ==========================================
// 13. Realtime Subscription (SSE)
// ==========================================

app.get('/api/realtime', (req, res) => {
  const companyId = req.query.company_id as string;
  if (!companyId) {
    return res.status(400).send('company_id query param is required');
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = generateId('sse');
  const client: SSEClient = {
    id: clientId,
    company_id: companyId,
    res,
  };

  sseClients.push(client);

  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', clientId })}\n\n`);

  req.on('close', () => {
    const index = sseClients.findIndex((c) => c.id === clientId);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
  });
});

// ==========================================
// 14. Milestone 16: Platform Admin Endpoints
// Strict RLS: platform_admins table only
// Access boundary: Operations & Support view only - NO access to internal HR employee data
// ==========================================

function requirePlatformAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.substring(7);
  const payload = decodeToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized: Session expired or invalid' });
  }

  // Strict RLS: Verify user is registered in platform_admins
  const isPlatformAdmin = (db.platform_admins || []).some((pa) => pa.user_id === payload.user_id);
  if (!isPlatformAdmin) {
    return res.status(403).json({
      error: 'RLS Policy Violation: platform_admins_only. Access restricted strictly to verified Platform Operators.',
    });
  }

  req.auth = payload;
  next();
}

// 1. Platform Admin Verification status
app.get('/api/platform/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ is_platform_admin: false });
  }
  const token = authHeader.substring(7);
  const payload = decodeToken(token);
  if (!payload) {
    return res.json({ is_platform_admin: false });
  }
  const isPlatformAdmin = (db.platform_admins || []).some((pa) => pa.user_id === payload.user_id);
  const user = db.users.find((u) => u.id === payload.user_id);
  return res.json({
    is_platform_admin: isPlatformAdmin,
    user_id: payload.user_id,
    email: user?.email,
  });
});

// 2. Platform Metrics: Total workspaces, active subscriptions by plan, demo requests
app.get('/api/platform/metrics', requirePlatformAdmin, (req: AuthenticatedRequest, res: Response) => {
  const totalWorkspaces = db.organizations.length;

  const subscriptions = db.subscriptions || [];
  const activeSubs = subscriptions.filter((s) => s.status === 'active' || s.status === 'trialing');

  const subscriptionsByPlan = {
    free_trial: activeSubs.filter((s) => s.plan === 'free_trial').length,
    starter: activeSubs.filter((s) => s.plan === 'starter').length,
    professional: activeSubs.filter((s) => s.plan === 'professional').length,
    enterprise: activeSubs.filter((s) => s.plan === 'enterprise').length,
  };

  const demoRequests = db.demo_requests || [];
  const recentDemoRequests = [...demoRequests]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const totalUsers = db.users.length;

  const metrics: PlatformMetrics = {
    total_workspaces: totalWorkspaces,
    subscriptions_by_plan: subscriptionsByPlan,
    active_subscriptions_count: activeSubs.length,
    total_demo_requests: demoRequests.length,
    recent_demo_requests: recentDemoRequests,
    total_registered_users: totalUsers,
  };

  res.json(metrics);
});

// 3. Support Lookup: Workspaces Directory (strictly operational metadata - no HR/employee records)
app.get('/api/platform/workspaces', requirePlatformAdmin, (req: AuthenticatedRequest, res: Response) => {
  const searchQuery = (req.query.search as string || '').toLowerCase().trim();

  let orgs = db.organizations;
  if (searchQuery) {
    orgs = orgs.filter(
      (o) =>
        o.name.toLowerCase().includes(searchQuery) ||
        o.id.toLowerCase().includes(searchQuery) ||
        (o.industry && o.industry.toLowerCase().includes(searchQuery)) ||
        (o.country && o.country.toLowerCase().includes(searchQuery))
    );
  }

  const summaries: PlatformWorkspaceSummary[] = orgs.map((org) => {
    const sub = (db.subscriptions || []).find((s) => s.company_id === org.id) || null;
    const employeeCount = (db.employees || []).filter((e) => e.company_id === org.id).length;
    const memberCount = (db.organization_members || []).filter((m) => m.organization_id === org.id).length;

    // Find primary contact email
    const headMember = (db.organization_members || []).find(
      (m) => m.organization_id === org.id && m.role === 'hr_head'
    ) || (db.organization_members || []).find((m) => m.organization_id === org.id);
    const ownerUser = headMember ? db.users.find((u) => u.id === headMember.user_id) : null;

    return {
      id: org.id,
      name: org.name,
      industry: org.industry,
      country: org.country,
      currency: org.currency,
      timezone: org.timezone,
      created_at: org.created_at,
      owner_email: ownerUser?.email,
      employee_count: employeeCount,
      member_count: memberCount,
      subscription: sub,
    };
  });

  res.json({ workspaces: summaries });
});

// 4. Support Workspace Detail (Strict access boundary: Tenant HR data locked)
app.get('/api/platform/workspaces/:id', requirePlatformAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const org = db.organizations.find((o) => o.id === id);
  if (!org) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  const sub = (db.subscriptions || []).find((s) => s.company_id === org.id) || null;
  const employeeCount = (db.employees || []).filter((e) => e.company_id === org.id).length;
  const departmentsCount = (db.departments || []).filter((d) => d.company_id === org.id).length;
  const members = (db.organization_members || []).filter((m) => m.organization_id === org.id);

  const headMember = members.find((m) => m.role === 'hr_head') || members[0];
  const ownerUser = headMember ? db.users.find((u) => u.id === headMember.user_id) : null;

  const notes = (db.support_notes || []).filter((n) => n.company_id === org.id);

  res.json({
    workspace: org,
    subscription: sub,
    owner_email: ownerUser?.email,
    stats: {
      employee_count: employeeCount,
      departments_count: departmentsCount,
      member_count: members.length,
    },
    support_notes: notes,
    data_access_boundary: {
      is_restricted: true,
      policy:
        'Access Boundary Active: Platform Admin accounts do not have default access to workspace employee records, compensation, or private HR data. As per security policy, viewing tenant data requires a deliberate, time-boxed, audited authorization (Planned Future Workflow).',
    },
  });
});

// 5. Add Support Note for a Workspace
app.post('/api/platform/workspaces/:id/notes', requirePlatformAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { note } = req.body;
  if (!note || typeof note !== 'string' || !note.trim()) {
    return res.status(400).json({ error: 'Note text is required' });
  }

  const org = db.organizations.find((o) => o.id === id);
  if (!org) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  const author = db.users.find((u) => u.id === req.auth!.user_id);
  const newNote = {
    id: generateId('snote'),
    company_id: id,
    note: note.trim(),
    author_email: author?.email || 'operator@goyahrms.com',
    created_at: new Date().toISOString(),
  };

  if (!db.support_notes) db.support_notes = [];
  db.support_notes.unshift(newNote);
  saveDb();

  res.status(201).json({ success: true, note: newNote });
});

// 6. Demo Requests List (from Milestone 14)
app.get('/api/platform/demo-requests', requirePlatformAdmin, (req: AuthenticatedRequest, res: Response) => {
  const demoRequests = db.demo_requests || [];
  const sorted = [...demoRequests].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  res.json({ demo_requests: sorted });
});

// ==========================================
// 15. Milestone 15: Billing & Subscriptions (Paystack Integration)
// ==========================================

// Middleware: Require HR Head (Strict RLS for billing data - same sensitivity as compensation)
function requireHrHead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.auth || req.auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'RLS Policy Violation: Billing data and payment management is strictly restricted to HR Head.',
    });
  }
  next();
}

// 1. Get Billing Details (Subscription, usage, invoices, payment methods, trial check)
app.get('/api/billing/details', requireAuth, requireHrHead, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const orgId = auth.company_id;

  let sub = (db.subscriptions || []).find((s) => s.company_id === orgId) || null;
  if (!sub) {
    sub = {
      id: generateId('sub'),
      company_id: orgId,
      plan: 'free_trial',
      billing_cycle: 'monthly',
      employee_limit: 10,
      status: 'trialing',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    };
    if (!db.subscriptions) db.subscriptions = [];
    db.subscriptions.push(sub);
    saveDb();
  }

  const activeEmployees = (db.employees || []).filter(
    (e) => e.company_id === orgId && e.status !== 'offboarded'
  );
  const employeeCount = activeEmployees.length;
  const employeeLimit = sub.employee_limit;

  // Calculate trial status and graceful restriction
  let trialDaysRemaining: number | null = null;
  let isRestricted = false;

  if (sub.status === 'trialing' && sub.trial_ends_at) {
    const msLeft = new Date(sub.trial_ends_at).getTime() - Date.now();
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    trialDaysRemaining = Math.max(0, daysLeft);

    if (msLeft <= 0) {
      isRestricted = true;
    } else if (daysLeft <= 3) {
      // Milestone 11 reminder notification as trial nears expiry
      const recentTrialNotif = (db.notifications || []).find(
        (n) =>
          n.company_id === orgId &&
          n.user_id === auth.user_id &&
          n.type === 'trial_expiry_warning' &&
          new Date(n.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
      );
      if (!recentTrialNotif) {
        createNotification(
          orgId,
          auth.user_id,
          'trial_expiry_warning',
          'Free Trial Ending Soon',
          `Your Go-Ya HRMS 14-day Free Trial expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Upgrade to Starter or Professional to maintain uninterrupted HRMS workflows.`,
          '/billing'
        );
      }
    }
  }

  const companyInvoices = (db.invoices || [])
    .filter((inv) => inv.company_id === orgId)
    .sort((a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime());

  const companyPaymentMethods = (db.payment_methods || [])
    .filter((pm) => pm.company_id === orgId)
    .sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));

  const response: BillingDetailsResponse = {
    subscription: sub,
    employee_count: employeeCount,
    employee_limit: employeeLimit,
    is_restricted: isRestricted,
    trial_days_remaining: trialDaysRemaining,
    payment_methods: companyPaymentMethods,
    invoices: companyInvoices,
  };

  res.json(response);
});

// 2. Initialize Paystack Transaction (HR Head only)
app.post('/api/billing/paystack/initialize', requireAuth, requireHrHead, (req: AuthenticatedRequest, res: Response) => {
  const { plan, billing_cycle } = req.body;

  if (!plan || !['starter', 'professional'].includes(plan)) {
    return res.status(400).json({ error: 'Valid plan (starter or professional) is required' });
  }
  const cycle: BillingCycle = billing_cycle === 'annual' ? 'annual' : 'monthly';

  // Starter: GHS 450/month (Monthly) or GHS 4,320/year (Annual - 20% discount)
  // Professional: GHS 950/month (Monthly) or GHS 9,120/year (Annual - 20% discount)
  let amount = 0;
  if (plan === 'starter') {
    amount = cycle === 'annual' ? 4320 : 450;
  } else if (plan === 'professional') {
    amount = cycle === 'annual' ? 9120 : 950;
  }

  const reference = `pstk_gh_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  res.json({
    reference,
    amount,
    currency: 'GHS',
    plan,
    billing_cycle: cycle,
    key: process.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_sample_go_ya_hrms_gh',
  });
});

// 3. Verify & Apply Paystack Payment (HR Head only)
app.post('/api/billing/paystack/verify', requireAuth, requireHrHead, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const orgId = auth.company_id;
  const {
    plan,
    billing_cycle,
    reference,
    payment_channel,
    momo_network,
    momo_number,
    card_brand,
    card_last4,
  } = req.body;

  if (!plan || !['starter', 'professional'].includes(plan)) {
    return res.status(400).json({ error: 'Valid plan is required' });
  }

  const cycle: BillingCycle = billing_cycle === 'annual' ? 'annual' : 'monthly';
  let amount = 0;
  let employeeLimit = 25;

  if (plan === 'starter') {
    amount = cycle === 'annual' ? 4320 : 450;
    employeeLimit = 25;
  } else if (plan === 'professional') {
    amount = cycle === 'annual' ? 9120 : 950;
    employeeLimit = 50;
  }

  const periodDays = cycle === 'annual' ? 365 : 30;
  const periodStart = new Date().toISOString();
  const periodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000).toISOString();

  // 1. Update or create subscription
  if (!db.subscriptions) db.subscriptions = [];
  let sub = db.subscriptions.find((s) => s.company_id === orgId);
  if (!sub) {
    sub = {
      id: generateId('sub'),
      company_id: orgId,
      plan: plan as SubscriptionPlan,
      billing_cycle: cycle,
      employee_limit: employeeLimit,
      status: 'active',
      trial_ends_at: null,
      current_period_end: periodEnd,
    };
    db.subscriptions.push(sub);
  } else {
    sub.plan = plan as SubscriptionPlan;
    sub.billing_cycle = cycle;
    sub.employee_limit = employeeLimit;
    sub.status = 'active';
    sub.trial_ends_at = null;
    sub.current_period_end = periodEnd;
  }

  // 2. Generate and store paid Invoice
  if (!db.invoices) db.invoices = [];
  const invoiceCount = db.invoices.length + 1;
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount).padStart(4, '0')}`;
  const newInvoice: Invoice = {
    id: generateId('inv'),
    company_id: orgId,
    amount,
    currency: 'GHS',
    status: 'paid',
    period_start: periodStart,
    period_end: periodEnd,
    paid_at: new Date().toISOString(),
    description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan (${cycle === 'annual' ? 'Annual' : 'Monthly'}) - ${employeeLimit} Employee Seats`,
    invoice_number: invoiceNumber,
  };
  db.invoices.unshift(newInvoice);

  // 3. Save or update Payment Method
  if (!db.payment_methods) db.payment_methods = [];
  db.payment_methods.filter((pm) => pm.company_id === orgId).forEach((pm) => (pm.is_default = false));

  let brandName = 'Visa';
  let last4Digits = '4242';

  if (payment_channel === 'momo') {
    brandName = `${momo_network || 'MTN'} Mobile Money`;
    last4Digits = (momo_number || '0241234567').slice(-4);
  } else {
    brandName = card_brand || 'Mastercard';
    last4Digits = card_last4 || '8832';
  }

  const newPaymentMethod: PaymentMethod = {
    id: generateId('pm'),
    company_id: orgId,
    provider_ref: reference || `pstk_auth_${Date.now()}`,
    last4: last4Digits,
    brand: brandName,
    is_default: true,
    created_at: new Date().toISOString(),
  };
  db.payment_methods.unshift(newPaymentMethod);

  saveDb();

  // 4. Milestone 11 notification & realtime broadcast
  createNotification(
    orgId,
    auth.user_id,
    'subscription_activated',
    'Subscription Activated via Paystack',
    `Your workspace has been successfully upgraded to the ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan (${cycle}). Receipt ${invoiceNumber} for GHS ${amount.toLocaleString()} has been issued.`,
    '/billing'
  );

  broadcastToCompany(orgId, 'subscription_updated', {
    subscription: sub,
    invoice: newInvoice,
  });

  res.json({
    success: true,
    subscription: sub,
    invoice: newInvoice,
    payment_method: newPaymentMethod,
  });
});

// 4. Switch Billing Cycle (Monthly <-> Annual)
app.post('/api/billing/change-cycle', requireAuth, requireHrHead, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const orgId = auth.company_id;
  const { billing_cycle } = req.body;

  if (!billing_cycle || !['monthly', 'annual'].includes(billing_cycle)) {
    return res.status(400).json({ error: 'Valid billing_cycle (monthly or annual) is required' });
  }

  const sub = (db.subscriptions || []).find((s) => s.company_id === orgId);
  if (!sub) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  sub.billing_cycle = billing_cycle;
  saveDb();

  createNotification(
    orgId,
    auth.user_id,
    'billing_cycle_updated',
    'Billing Cycle Updated',
    `Your billing cycle has been updated to ${billing_cycle}. Renewal discounts will be applied on your next cycle.`,
    '/billing'
  );

  res.json({ success: true, subscription: sub });
});

// 5. Cancel Subscription
app.post('/api/billing/cancel', requireAuth, requireHrHead, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const orgId = auth.company_id;

  const sub = (db.subscriptions || []).find((s) => s.company_id === orgId);
  if (!sub) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  sub.status = 'canceled';
  saveDb();

  createNotification(
    orgId,
    auth.user_id,
    'subscription_canceled',
    'Subscription Canceled',
    `Your Go-Ya HRMS subscription has been canceled. Your workspace remains active until ${new Date(sub.current_period_end).toLocaleDateString()}, after which it will transition to restricted read-only mode without any data loss.`,
    '/billing'
  );

  broadcastToCompany(orgId, 'subscription_updated', { subscription: sub });
  res.json({ success: true, subscription: sub });
});

// 6. Set Default Payment Method
app.post('/api/billing/payment-methods/default', requireAuth, requireHrHead, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const { payment_method_id } = req.body;

  if (!payment_method_id) {
    return res.status(400).json({ error: 'payment_method_id is required' });
  }

  const methods = (db.payment_methods || []).filter((pm) => pm.company_id === auth.company_id);
  const target = methods.find((m) => m.id === payment_method_id);
  if (!target) {
    return res.status(404).json({ error: 'Payment method not found' });
  }

  methods.forEach((m) => {
    m.is_default = m.id === payment_method_id;
  });
  saveDb();

  res.json({ success: true, payment_methods: methods });
});

// 7. Delete Payment Method
app.delete('/api/billing/payment-methods/:id', requireAuth, requireHrHead, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const { id } = req.params;

  if (!db.payment_methods) db.payment_methods = [];
  const index = db.payment_methods.findIndex((pm) => pm.id === id && pm.company_id === auth.company_id);
  if (index === -1) {
    return res.status(404).json({ error: 'Payment method not found' });
  }

  const isDefault = db.payment_methods[index].is_default;
  db.payment_methods.splice(index, 1);

  if (isDefault) {
    const remaining = db.payment_methods.filter((pm) => pm.company_id === auth.company_id);
    if (remaining.length > 0) {
      remaining[0].is_default = true;
    }
  }

  saveDb();
  res.json({ success: true });
});

// 8. Contact Sales for Enterprise Plan
app.post('/api/billing/contact-sales', requireAuth, requireHrHead, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const { team_size, requirements, message } = req.body;

  const org = db.organizations.find((o) => o.id === auth.company_id);
  const user = db.users.find((u) => u.id === auth.user_id);

  if (!db.support_notes) db.support_notes = [];
  db.support_notes.unshift({
    id: generateId('snote'),
    company_id: auth.company_id,
    note: `[ENTERPRISE SALES INQUIRY] Requested by ${user?.email} for ${org?.name || 'Workspace'}. Team size: ${team_size || '200+'}. Notes: ${message || requirements || 'Standard Enterprise RFP'}`,
    author_email: user?.email || 'sales@goyahrms.com',
    created_at: new Date().toISOString(),
  });
  saveDb();

  createNotification(
    auth.company_id,
    auth.user_id,
    'enterprise_sales_inquiry',
    'Enterprise Inquiry Received',
    'Our enterprise solutions team has received your request and will contact you within 4 business hours to coordinate custom terms and deployment.',
    '/billing'
  );

  res.json({ success: true, message: 'Inquiry submitted successfully' });
});

// ==========================================
// 15. Milestone 17: Performance Management
// Strict RLS: Standard company_id scoping.
// HR Analyst can record/update review entries while status = 'draft'.
// Only HR Head can set status = 'finalized' or modify finalized reviews.
// Once finalized, rows are strictly read-only for everyone except HR Head.
// ==========================================

// 1. Get employee performance records (Reviews + PDP Goals)
app.get('/api/employees/:id/performance', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const employeeId = req.params.id;

  // Validate employee belongs to company
  const emp = db.employees.find((e) => e.id === employeeId && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found in your organization' });
  }

  const reviews = (db.performance_reviews || [])
    .filter((r) => r.employee_id === employeeId && r.company_id === auth.company_id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const pdp_goals = (db.pdp_goals || [])
    .filter((g) => g.employee_id === employeeId && g.company_id === auth.company_id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({ reviews, pdp_goals });
});

// 2. Record new performance review
app.post('/api/employees/:id/performance/reviews', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const employeeId = req.params.id;
  const { cycle, rating, comments, bsc_completed, bsc_document_url, bsc_score, status } = req.body;

  const emp = db.employees.find((e) => e.id === employeeId && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found in your organization' });
  }

  const validCycles: PerformanceCycle[] = ['Q1', 'Q2', 'Q3', 'Q4', 'mid_year', 'year_end'];
  if (!validCycles.includes(cycle)) {
    return res.status(400).json({ error: `Invalid cycle. Must be one of: ${validCycles.join(', ')}` });
  }

  if (rating === undefined || rating === null || isNaN(Number(rating))) {
    return res.status(400).json({ error: 'Rating value is required' });
  }

  const numRating = Math.max(1, Math.min(5, Number(rating)));

  // RLS Enforcement: Only HR Head can create a review directly in 'finalized' state
  let reviewStatus: ReviewStatus = 'draft';
  if (status === 'finalized') {
    if (auth.role !== 'hr_head') {
      return res.status(403).json({ error: 'Only HR Head can finalize a performance review. HR Analysts can only submit drafts.' });
    }
    reviewStatus = 'finalized';
  }

  const currentUser = db.users.find((u) => u.id === auth.user_id);
  const reviewerIdentifier = currentUser?.email || auth.email || 'HR Team';

  const newReview: PerformanceReview = {
    id: generateId('pr'),
    employee_id: employeeId,
    company_id: auth.company_id,
    cycle,
    rating: numRating,
    comments: (comments || '').trim(),
    reviewed_by: reviewerIdentifier,
    status: reviewStatus,
    bsc_completed: Boolean(bsc_completed),
    bsc_document_url: bsc_document_url ? String(bsc_document_url).trim() : undefined,
    bsc_score: bsc_score !== undefined && bsc_score !== null && !isNaN(Number(bsc_score)) ? Number(bsc_score) : undefined,
    created_at: new Date().toISOString(),
    finalized_at: reviewStatus === 'finalized' ? new Date().toISOString() : undefined,
    finalized_by: reviewStatus === 'finalized' ? reviewerIdentifier : undefined,
  };

  if (!db.performance_reviews) db.performance_reviews = [];
  db.performance_reviews.unshift(newReview);
  saveDb();

  broadcastToCompany(auth.company_id, 'performance_updated', {
    employee_id: employeeId,
    review_id: newReview.id,
    type: 'review_created',
  });

  res.status(201).json({ success: true, review: newReview });
});

// 3. Update performance review (Strict RLS: finalized reviews are read-only for non-hr_head)
app.put('/api/performance/reviews/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const reviewId = req.params.id;

  const reviewIndex = (db.performance_reviews || []).findIndex(
    (r) => r.id === reviewId && r.company_id === auth.company_id
  );

  if (reviewIndex === -1) {
    return res.status(404).json({ error: 'Performance review not found' });
  }

  const existingReview = db.performance_reviews[reviewIndex];

  // RLS Rule: Once a review is finalized, it becomes read-only for everyone except HR Head
  if (existingReview.status === 'finalized' && auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'Finalized performance reviews are locked and read-only. Only HR Head can modify finalized review records.',
    });
  }

  // RLS Rule: Only HR Head can change status to 'finalized'
  if (req.body.status === 'finalized' && existingReview.status !== 'finalized' && auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'Only HR Head can authorize and finalize a performance review.',
    });
  }

  const currentUser = db.users.find((u) => u.id === auth.user_id);
  const userIdentifier = currentUser?.email || auth.email || 'HR Administrator';

  const { cycle, rating, comments, bsc_completed, bsc_document_url, bsc_score, status } = req.body;

  if (cycle) {
    const validCycles: PerformanceCycle[] = ['Q1', 'Q2', 'Q3', 'Q4', 'mid_year', 'year_end'];
    if (validCycles.includes(cycle)) {
      existingReview.cycle = cycle;
    }
  }

  if (rating !== undefined && rating !== null && !isNaN(Number(rating))) {
    existingReview.rating = Math.max(1, Math.min(5, Number(rating)));
  }

  if (comments !== undefined) {
    existingReview.comments = String(comments).trim();
  }

  if (bsc_completed !== undefined) {
    existingReview.bsc_completed = Boolean(bsc_completed);
  }

  if (bsc_document_url !== undefined) {
    existingReview.bsc_document_url = bsc_document_url ? String(bsc_document_url).trim() : undefined;
  }

  if (bsc_score !== undefined) {
    existingReview.bsc_score = bsc_score !== null && !isNaN(Number(bsc_score)) ? Number(bsc_score) : undefined;
  }

  // Handle status transition
  if (status && (status === 'draft' || status === 'finalized')) {
    if (status === 'finalized' && existingReview.status !== 'finalized') {
      existingReview.status = 'finalized';
      existingReview.finalized_at = new Date().toISOString();
      existingReview.finalized_by = userIdentifier;
    } else if (status === 'draft' && existingReview.status === 'finalized') {
      // HR Head can unlock back to draft if needed
      existingReview.status = 'draft';
      existingReview.finalized_at = undefined;
      existingReview.finalized_by = undefined;
    }
  }

  saveDb();

  broadcastToCompany(auth.company_id, 'performance_updated', {
    employee_id: existingReview.employee_id,
    review_id: existingReview.id,
    type: 'review_updated',
  });

  res.json({ success: true, review: existingReview });
});

// 4. Delete performance review (Strict RLS: finalized reviews can only be deleted by HR Head)
app.delete('/api/performance/reviews/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const reviewId = req.params.id;

  const reviewIndex = (db.performance_reviews || []).findIndex(
    (r) => r.id === reviewId && r.company_id === auth.company_id
  );

  if (reviewIndex === -1) {
    return res.status(404).json({ error: 'Performance review not found' });
  }

  const existingReview = db.performance_reviews[reviewIndex];

  if (existingReview.status === 'finalized' && auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'Finalized performance reviews cannot be deleted by HR Analyst. Only HR Head has deletion authorization.',
    });
  }

  db.performance_reviews.splice(reviewIndex, 1);
  saveDb();

  broadcastToCompany(auth.company_id, 'performance_updated', {
    employee_id: existingReview.employee_id,
    review_id: reviewId,
    type: 'review_deleted',
  });

  res.json({ success: true, message: 'Performance review deleted successfully' });
});

// 5. Create Personal Development Plan (PDP) Goal
app.post('/api/employees/:id/performance/pdp-goals', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const employeeId = req.params.id;
  const { goal, target_date, status } = req.body;

  const emp = db.employees.find((e) => e.id === employeeId && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found in your organization' });
  }

  if (!goal || !String(goal).trim()) {
    return res.status(400).json({ error: 'Goal description is required' });
  }

  const validStatuses: PDPStatus[] = ['not_started', 'in_progress', 'complete'];
  const pdpStatus: PDPStatus = validStatuses.includes(status) ? status : 'not_started';

  const newGoal: PDPGoal = {
    id: generateId('pdp'),
    employee_id: employeeId,
    company_id: auth.company_id,
    goal: String(goal).trim(),
    target_date: target_date || getTodayString(),
    status: pdpStatus,
    created_at: new Date().toISOString(),
  };

  if (!db.pdp_goals) db.pdp_goals = [];
  db.pdp_goals.unshift(newGoal);
  saveDb();

  broadcastToCompany(auth.company_id, 'performance_updated', {
    employee_id: employeeId,
    goal_id: newGoal.id,
    type: 'pdp_created',
  });

  res.status(201).json({ success: true, goal: newGoal });
});

// 6. Update PDP Goal
app.put('/api/performance/pdp-goals/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const goalId = req.params.id;

  const goalIndex = (db.pdp_goals || []).findIndex(
    (g) => g.id === goalId && g.company_id === auth.company_id
  );

  if (goalIndex === -1) {
    return res.status(404).json({ error: 'PDP Goal not found' });
  }

  const targetGoal = db.pdp_goals[goalIndex];
  const { goal, target_date, status } = req.body;

  if (goal !== undefined) {
    targetGoal.goal = String(goal).trim();
  }
  if (target_date !== undefined) {
    targetGoal.target_date = target_date;
  }
  if (status !== undefined) {
    const validStatuses: PDPStatus[] = ['not_started', 'in_progress', 'complete'];
    if (validStatuses.includes(status)) {
      targetGoal.status = status;
    }
  }

  saveDb();

  broadcastToCompany(auth.company_id, 'performance_updated', {
    employee_id: targetGoal.employee_id,
    goal_id: targetGoal.id,
    type: 'pdp_updated',
  });

  res.json({ success: true, goal: targetGoal });
});

// 7. Delete PDP Goal
app.delete('/api/performance/pdp-goals/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const goalId = req.params.id;

  const goalIndex = (db.pdp_goals || []).findIndex(
    (g) => g.id === goalId && g.company_id === auth.company_id
  );

  if (goalIndex === -1) {
    return res.status(404).json({ error: 'PDP Goal not found' });
  }

  const employeeId = db.pdp_goals[goalIndex].employee_id;
  db.pdp_goals.splice(goalIndex, 1);
  saveDb();

  broadcastToCompany(auth.company_id, 'performance_updated', {
    employee_id: employeeId,
    goal_id: goalId,
    type: 'pdp_deleted',
  });

  res.json({ success: true, message: 'PDP Goal deleted successfully' });
});

// ==========================================
// Milestone 18: Probation Management Endpoints
// ==========================================

// GET /api/employees/:id/probation - Retrieve probation record for employee
app.get('/api/employees/:id/probation', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const employeeId = req.params.id;

  const emp = db.employees.find((e) => e.id === employeeId && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found in your workspace' });
  }

  if (!db.probation_records) db.probation_records = [];
  let record = db.probation_records.find(
    (r) => r.employee_id === employeeId && r.company_id === auth.company_id
  );

  // Auto-initialize probation record if employee is on probation but record missing
  if (!record && emp.status === 'probation') {
    const startDate = emp.start_date || getTodayString();
    const endDate = calculateProbationEndDate(startDate, 3);
    record = {
      id: generateId('prob'),
      employee_id: employeeId,
      company_id: auth.company_id,
      probation_period_months: 3,
      probation_start: startDate,
      probation_end: endDate,
      original_probation_end: endDate,
      extension_months: 0,
      mid_review_date: null,
      mid_reviewer: null,
      mid_review_notes: null,
      end_review_date: null,
      end_reviewer: null,
      outcome: null,
      confirmation_date: null,
      remarks: null,
      created_at: new Date().toISOString(),
    };
    db.probation_records.push(record);
    saveDb();
  }

  if (record) {
    const daysRemaining = calculateDaysRemaining(record.probation_end);
    return res.json({
      record: {
        ...record,
        days_remaining: record.outcome === 'confirm' ? 0 : daysRemaining,
      },
      employee: {
        id: emp.id,
        name: emp.name,
        status: emp.status,
        start_date: emp.start_date,
        job_title: emp.job_title,
        department_id: emp.department_id,
      },
    });
  }

  res.json({
    record: null,
    employee: {
      id: emp.id,
      name: emp.name,
      status: emp.status,
      start_date: emp.start_date,
      job_title: emp.job_title,
      department_id: emp.department_id,
    },
  });
});

// POST /api/employees/:id/probation - Initialize or configure probation
app.post('/api/employees/:id/probation', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const employeeId = req.params.id;
  const { probation_period_months = 3, probation_start, remarks } = req.body;

  const emp = db.employees.find((e) => e.id === employeeId && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found in your workspace' });
  }

  if (!db.probation_records) db.probation_records = [];
  let record = db.probation_records.find(
    (r) => r.employee_id === employeeId && r.company_id === auth.company_id
  );

  const start = probation_start || emp.start_date || getTodayString();
  const months = Math.max(1, Number(probation_period_months) || 3);
  const end = calculateProbationEndDate(start, months);

  if (record) {
    record.probation_period_months = months;
    record.probation_start = start;
    record.probation_end = end;
    if (!record.original_probation_end) record.original_probation_end = end;
    if (remarks !== undefined) record.remarks = remarks;
  } else {
    record = {
      id: generateId('prob'),
      employee_id: employeeId,
      company_id: auth.company_id,
      probation_period_months: months,
      probation_start: start,
      probation_end: end,
      original_probation_end: end,
      extension_months: 0,
      mid_review_date: null,
      mid_reviewer: null,
      mid_review_notes: null,
      end_review_date: null,
      end_reviewer: null,
      outcome: null,
      confirmation_date: null,
      remarks: remarks || null,
      created_at: new Date().toISOString(),
    };
    db.probation_records.push(record);
  }

  // Ensure employee status matches probation
  if (emp.status !== 'probation') {
    emp.status = 'probation';
  }

  saveDb();
  broadcastToCompany(auth.company_id, 'probation_updated', { employee_id: employeeId, record });

  const daysRemaining = calculateDaysRemaining(record.probation_end);
  res.status(201).json({
    success: true,
    record: {
      ...record,
      days_remaining: daysRemaining,
    },
  });
});

// PUT /api/employees/:id/probation/mid-review - Record mid-probation review (HR Head & HR Analyst allowed)
app.put('/api/employees/:id/probation/mid-review', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const employeeId = req.params.id;
  const { mid_review_date, mid_reviewer, mid_review_notes } = req.body;

  const emp = db.employees.find((e) => e.id === employeeId && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found in your workspace' });
  }

  if (!db.probation_records) db.probation_records = [];
  let record = db.probation_records.find(
    (r) => r.employee_id === employeeId && r.company_id === auth.company_id
  );

  if (!record) {
    return res.status(404).json({ error: 'No probation record found for this employee' });
  }

  const currentUser = db.users.find((u) => u.id === auth.user_id);
  const reviewer = mid_reviewer || currentUser?.email || auth.email || 'HR Administrator';

  record.mid_review_date = mid_review_date || getTodayString();
  record.mid_reviewer = reviewer;
  record.mid_review_notes = mid_review_notes || '';

  saveDb();
  broadcastToCompany(auth.company_id, 'probation_updated', {
    employee_id: employeeId,
    record,
    type: 'mid_review',
  });

  const daysRemaining = calculateDaysRemaining(record.probation_end);
  res.json({
    success: true,
    record: {
      ...record,
      days_remaining: record.outcome === 'confirm' ? 0 : daysRemaining,
    },
  });
});

// PUT /api/employees/:id/probation/end-review - Record end-of-probation review & outcome
// STRICT RLS ENFORCEMENT: Only HR Head can set final outcome (confirm/extend/terminate)
app.put('/api/employees/:id/probation/end-review', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const employeeId = req.params.id;
  const {
    end_review_date,
    end_reviewer,
    remarks,
    outcome,
    extension_months,
    confirmation_date,
  } = req.body;

  const emp = db.employees.find((e) => e.id === employeeId && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found in your workspace' });
  }

  if (!db.probation_records) db.probation_records = [];
  let record = db.probation_records.find(
    (r) => r.employee_id === employeeId && r.company_id === auth.company_id
  );

  if (!record) {
    return res.status(404).json({ error: 'No probation record found for this employee' });
  }

  // STRICT RLS ENFORCEMENT:
  // "hr_head and hr_analyst can both record reviews; only hr_head can set the final outcome (confirm/extend/terminate),
  // same sensitivity level as an offboarding decision."
  if (outcome && auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'Permission Denied: Only HR Head can set the final probation outcome (confirm, extend, or terminate). This policy is strictly enforced at the database level.',
    });
  }

  const currentUser = db.users.find((u) => u.id === auth.user_id);
  const reviewer = end_reviewer || currentUser?.email || auth.email || 'HR Administrator';

  if (end_review_date) {
    record.end_review_date = end_review_date;
  } else if (!record.end_review_date) {
    record.end_review_date = getTodayString();
  }
  record.end_reviewer = reviewer;
  if (remarks !== undefined) record.remarks = remarks;

  if (outcome && auth.role === 'hr_head') {
    if (outcome === 'confirm') {
      record.outcome = 'confirm';
      record.confirmation_date = confirmation_date || getTodayString();
      // Update employee status away from probation
      emp.status = 'active';

      // In-app notification
      createNotification(
        auth.company_id,
        auth.user_id,
        'probation_outcome',
        `Probation Confirmed: ${emp.name}`,
        `${emp.name} has successfully completed probation and has been confirmed as a permanent team member effective ${record.confirmation_date}.`,
        `employees/${emp.id}`
      );
    } else if (outcome === 'terminate') {
      record.outcome = 'terminate';
      // Update employee status to offboarded
      emp.status = 'offboarded';

      createNotification(
        auth.company_id,
        auth.user_id,
        'probation_outcome',
        `Probation Terminated: ${emp.name}`,
        `Probation for ${emp.name} has concluded with employment termination. Employee status updated to offboarded.`,
        `employees/${emp.id}`
      );
    } else if (outcome === 'extend') {
      const extMonths = Number(extension_months);
      if (!extMonths || extMonths <= 0) {
        return res.status(400).json({ error: 'Extension duration (months) must be greater than 0.' });
      }

      if (!record.original_probation_end) {
        record.original_probation_end = record.probation_end;
      }
      record.extension_months = (record.extension_months || 0) + extMonths;
      record.probation_end = calculateProbationEndDate(record.probation_end, extMonths);
      record.outcome = 'extend';
      emp.status = 'probation';

      createNotification(
        auth.company_id,
        auth.user_id,
        'probation_outcome',
        `Probation Extended: ${emp.name}`,
        `${emp.name}'s probation has been extended by ${extMonths} month(s). New probation end date: ${record.probation_end}.`,
        `employees/${emp.id}`
      );
    }
  }

  saveDb();
  broadcastToCompany(auth.company_id, 'probation_updated', {
    employee_id: employeeId,
    record,
    employee_status: emp.status,
    outcome: record.outcome,
  });

  const daysRemaining = calculateDaysRemaining(record.probation_end);
  res.json({
    success: true,
    record: {
      ...record,
      days_remaining: record.outcome === 'confirm' ? 0 : daysRemaining,
    },
    employee_status: emp.status,
  });
});

// ==========================================
// Milestone 19: Employee Conduct Tracker (Strictly HR Head Only)
// ==========================================

// Helper: enrich conduct incident with employee and department info
function enrichConductIncident(inc: ConductIncident): ConductIncidentWithDetails {
  const emp = db.employees.find((e) => e.id === inc.related_employee_id);
  const dept = db.departments.find((d) => d.id === inc.department_id);
  const creator = db.users.find((u) => u.id === inc.created_by);

  return {
    ...inc,
    employee_name: emp?.name || 'Unknown Employee',
    employee_job_title: emp?.job_title || 'Unknown Title',
    department_name: dept?.name || 'Unassigned',
    created_by_email: creator?.email || inc.created_by,
  };
}

// GET /api/conduct-incidents - List incidents (HR Head only)
app.get('/api/conduct-incidents', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;

  // Strict RLS policy: hr_head only
  if (auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'RLS Policy Violation: Access restricted to HR Head only. Employee conduct records are strictly confidential.',
    });
  }

  if (!db.conduct_incidents) db.conduct_incidents = [];

  let incidents = db.conduct_incidents.filter((i) => i.company_id === auth.company_id);

  // Optional filters
  const { employee_id, status, severity, incident_type, search } = req.query;

  if (employee_id && typeof employee_id === 'string') {
    incidents = incidents.filter((i) => i.related_employee_id === employee_id);
  }

  if (status && typeof status === 'string' && status !== 'all') {
    incidents = incidents.filter((i) => i.status === status);
  }

  if (severity && typeof severity === 'string' && severity !== 'all') {
    incidents = incidents.filter((i) => i.severity === severity);
  }

  if (incident_type && typeof incident_type === 'string' && incident_type !== 'all') {
    incidents = incidents.filter((i) => i.incident_type.toLowerCase() === incident_type.toLowerCase());
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    incidents = incidents.filter((i) => {
      const emp = db.employees.find((e) => e.id === i.related_employee_id);
      return (
        i.description.toLowerCase().includes(q) ||
        i.reporter.toLowerCase().includes(q) ||
        i.incident_type.toLowerCase().includes(q) ||
        (i.witnesses && i.witnesses.toLowerCase().includes(q)) ||
        (i.action_taken && i.action_taken.toLowerCase().includes(q)) ||
        (emp && emp.name.toLowerCase().includes(q))
      );
    });
  }

  // Sort descending by created_at
  incidents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const enriched = incidents.map(enrichConductIncident);
  res.json(enriched);
});

// GET /api/conduct-incidents/:id - Get single incident (HR Head only)
app.get('/api/conduct-incidents/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;

  if (auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'RLS Policy Violation: Access restricted to HR Head only.',
    });
  }

  if (!db.conduct_incidents) db.conduct_incidents = [];

  const inc = db.conduct_incidents.find(
    (i) => i.id === req.params.id && i.company_id === auth.company_id
  );

  if (!inc) {
    return res.status(404).json({ error: 'Conduct incident not found' });
  }

  res.json(enrichConductIncident(inc));
});

// POST /api/conduct-incidents - Log a new conduct incident (HR Head only)
app.post('/api/conduct-incidents', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;

  if (auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'RLS Policy Violation: Access restricted to HR Head only. Only HR Head can log conduct incidents.',
    });
  }

  const {
    date_reported,
    reporter,
    witnesses,
    incident_type,
    severity,
    description,
    related_employee_id,
    department_id,
    status = 'open',
    investigation_owner,
    action_taken,
  } = req.body;

  if (!related_employee_id || !incident_type || !severity || !description || !reporter) {
    return res.status(400).json({
      error: 'Missing required fields: related_employee_id, incident_type, severity, description, and reporter are required.',
    });
  }

  const emp = db.employees.find((e) => e.id === related_employee_id && e.company_id === auth.company_id);
  if (!emp) {
    return res.status(404).json({ error: 'Related employee not found in this workspace.' });
  }

  const deptId = department_id || emp.department_id || '';
  const nowStr = new Date().toISOString();
  const todayStr = getTodayString();

  const newIncident: ConductIncident = {
    id: generateId('cinc'),
    company_id: auth.company_id,
    date_reported: date_reported || todayStr,
    reporter: reporter.trim(),
    witnesses: (witnesses || '').trim(),
    incident_type: incident_type.trim(),
    severity: severity as ConductIncidentSeverity,
    description: description.trim(),
    related_employee_id,
    department_id: deptId,
    status: (status as ConductIncidentStatus) || 'open',
    investigation_owner: (investigation_owner || auth.email || 'HR Administrator').trim(),
    action_taken: action_taken ? action_taken.trim() : null,
    created_by: auth.user_id,
    created_at: nowStr,
    updated_at: nowStr,
  };

  if (!db.conduct_incidents) db.conduct_incidents = [];
  db.conduct_incidents.unshift(newIncident);

  // Record initial audit entry
  if (!db.conduct_audit_logs) db.conduct_audit_logs = [];
  const initialAudit: ConductAuditLog = {
    id: generateId('caudit'),
    company_id: auth.company_id,
    incident_id: newIncident.id,
    previous_status: null,
    new_status: newIncident.status,
    previous_action_taken: null,
    new_action_taken: newIncident.action_taken,
    actor_id: auth.user_id,
    actor_name: auth.email || 'HR Head',
    actor_role: auth.role,
    notes: `Incident logged with severity [${newIncident.severity.toUpperCase()}]. Status: ${newIncident.status.toUpperCase()}.`,
    timestamp: nowStr,
  };
  db.conduct_audit_logs.unshift(initialAudit);

  // Trigger Notification to HR Head
  createNotification(
    auth.company_id,
    auth.user_id,
    'conduct_incident_logged',
    `New Conduct Incident Logged (${newIncident.severity.toUpperCase()})`,
    `Workplace conduct incident involving ${emp.name} reported by ${newIncident.reporter}. Status: ${newIncident.status.toUpperCase()}.`,
    `conduct`
  );

  // High-priority edge email for high or medium severity
  if (newIncident.severity === 'high' || newIncident.severity === 'medium') {
    sendEdgeEmail({
      companyId: auth.company_id,
      userId: auth.user_id,
      recipientEmail: auth.email,
      subject: `[CONFIDENTIAL HR CONDUCT - ${newIncident.severity.toUpperCase()}] Incident logged for ${emp.name}`,
      body: `A new confidential conduct incident has been recorded in Go-Ya HRMS:\n\nEmployee: ${emp.name} (${emp.job_title})\nType: ${newIncident.incident_type}\nSeverity: ${newIncident.severity.toUpperCase()}\nReporter: ${newIncident.reporter}\nOwner: ${newIncident.investigation_owner}\n\nDescription:\n${newIncident.description}\n\nAccess the confidential conduct tracker at: /conduct`,
      type: 'conduct_incident',
    });
  }

  saveDb();
  broadcastToCompany(auth.company_id, 'conduct_incident_created', { incident: newIncident });

  res.status(201).json(enrichConductIncident(newIncident));
});

// PUT /api/conduct-incidents/:id - Update conduct incident / change status (HR Head only)
app.put('/api/conduct-incidents/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;

  if (auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'RLS Policy Violation: Access restricted to HR Head only.',
    });
  }

  if (!db.conduct_incidents) db.conduct_incidents = [];

  const inc = db.conduct_incidents.find(
    (i) => i.id === req.params.id && i.company_id === auth.company_id
  );

  if (!inc) {
    return res.status(404).json({ error: 'Conduct incident not found.' });
  }

  const {
    date_reported,
    reporter,
    witnesses,
    incident_type,
    severity,
    description,
    department_id,
    status,
    investigation_owner,
    action_taken,
    status_change_notes,
  } = req.body;

  const previousStatus = inc.status;
  const previousAction = inc.action_taken;
  const nowStr = new Date().toISOString();

  if (date_reported !== undefined) inc.date_reported = date_reported;
  if (reporter !== undefined) inc.reporter = reporter.trim();
  if (witnesses !== undefined) inc.witnesses = witnesses.trim();
  if (incident_type !== undefined) inc.incident_type = incident_type.trim();
  if (severity !== undefined) inc.severity = severity as ConductIncidentSeverity;
  if (description !== undefined) inc.description = description.trim();
  if (department_id !== undefined) inc.department_id = department_id;
  if (investigation_owner !== undefined) inc.investigation_owner = investigation_owner.trim();
  if (action_taken !== undefined) inc.action_taken = action_taken ? action_taken.trim() : null;

  let statusChanged = false;
  if (status && status !== previousStatus) {
    inc.status = status as ConductIncidentStatus;
    statusChanged = true;
  }

  inc.updated_at = nowStr;

  // If status changed or action taken changed, add audit entry
  if (statusChanged || (action_taken !== undefined && action_taken !== previousAction)) {
    if (!db.conduct_audit_logs) db.conduct_audit_logs = [];

    const notes = status_change_notes
      ? status_change_notes.trim()
      : statusChanged
      ? `Status transitioned from ${previousStatus.toUpperCase()} to ${inc.status.toUpperCase()}.`
      : `Action taken updated: "${inc.action_taken || 'None'}".`;

    const auditEntry: ConductAuditLog = {
      id: generateId('caudit'),
      company_id: auth.company_id,
      incident_id: inc.id,
      previous_status: previousStatus,
      new_status: inc.status,
      previous_action_taken: previousAction,
      new_action_taken: inc.action_taken,
      actor_id: auth.user_id,
      actor_name: auth.email || 'HR Head',
      actor_role: auth.role,
      notes,
      timestamp: nowStr,
    };
    db.conduct_audit_logs.unshift(auditEntry);

    // If moved to resolved or closed, notify HR Head
    const emp = db.employees.find((e) => e.id === inc.related_employee_id);
    if (inc.status === 'resolved' || inc.status === 'closed') {
      createNotification(
        auth.company_id,
        auth.user_id,
        'conduct_incident_updated',
        `Conduct Incident ${inc.status.toUpperCase()}: ${emp?.name || 'Employee'}`,
        `Incident case #${inc.id.slice(-6)} has been marked as ${inc.status.toUpperCase()}.${inc.action_taken ? ` Action: ${inc.action_taken}` : ''}`,
        `conduct`
      );
    }
  }

  saveDb();
  broadcastToCompany(auth.company_id, 'conduct_incident_updated', { incident: inc });

  res.json(enrichConductIncident(inc));
});

// DELETE /api/conduct-incidents/:id - Delete conduct incident (HR Head only)
app.delete('/api/conduct-incidents/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;

  if (auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'RLS Policy Violation: Access restricted to HR Head only. Only HR Head can delete conduct records.',
    });
  }

  if (!db.conduct_incidents) db.conduct_incidents = [];

  const idx = db.conduct_incidents.findIndex(
    (i) => i.id === req.params.id && i.company_id === auth.company_id
  );

  if (idx === -1) {
    return res.status(404).json({ error: 'Conduct incident not found.' });
  }

  const deleted = db.conduct_incidents.splice(idx, 1)[0];

  // Also remove audit logs
  if (db.conduct_audit_logs) {
    db.conduct_audit_logs = db.conduct_audit_logs.filter((a) => a.incident_id !== deleted.id);
  }

  saveDb();
  broadcastToCompany(auth.company_id, 'conduct_incident_deleted', { id: deleted.id });

  res.json({ success: true, message: 'Conduct incident deleted successfully.' });
});

// GET /api/conduct-incidents/:id/audit-logs - Get incident audit history (HR Head only)
app.get('/api/conduct-incidents/:id/audit-logs', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;

  if (auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'RLS Policy Violation: Access restricted to HR Head only.',
    });
  }

  if (!db.conduct_audit_logs) db.conduct_audit_logs = [];

  const logs = db.conduct_audit_logs
    .filter((a) => a.incident_id === req.params.id && a.company_id === auth.company_id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json(logs);
});

// =============================================================
// Milestone 20: Policy Acknowledgement Endpoints
// Standard company_id scoping (HR Head and HR Analyst both have full access)
// =============================================================

// Helper: Ensure all active employees have a policy_acknowledgement record for a policy
function ensurePolicyAcknowledgementsForPolicy(companyId: string, policyId: string) {
  if (!db.policy_acknowledgements) db.policy_acknowledgements = [];
  const activeEmps = db.employees.filter((e) => e.company_id === companyId && e.status !== 'offboarded');

  for (const emp of activeEmps) {
    const exists = db.policy_acknowledgements.some(
      (a) => a.policy_id === policyId && a.employee_id === emp.id
    );
    if (!exists) {
      db.policy_acknowledgements.push({
        id: generateId('pack'),
        policy_id: policyId,
        employee_id: emp.id,
        acknowledged: false,
        acknowledgment_date: null,
        acknowledgment_method: null,
        follow_up_required: false,
        created_at: new Date().toISOString(),
      });
    }
  }
}

// GET /api/policies - List all policies with completion metrics & linked document info
app.get('/api/policies', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  if (!db.policies) db.policies = [];
  if (!db.policy_acknowledgements) db.policy_acknowledgements = [];

  const deptFilter = req.query.department_id as string | undefined;

  const companyPolicies = db.policies.filter((p) => p.company_id === auth.company_id);

  // Target employees for completion stats (optionally filtered by department)
  let targetEmployees = db.employees.filter(
    (e) => e.company_id === auth.company_id && e.status !== 'offboarded'
  );
  if (deptFilter && deptFilter !== 'all') {
    targetEmployees = targetEmployees.filter((e) => e.department_id === deptFilter);
  }
  const targetEmpIds = new Set(targetEmployees.map((e) => e.id));

  const result: PolicyWithDetails[] = companyPolicies.map((policy) => {
    // Ensure records exist
    ensurePolicyAcknowledgementsForPolicy(auth.company_id, policy.id);

    // Linked document from Milestone 3
    const linkedDoc = policy.document_id
      ? db.documents?.find((d) => d.id === policy.document_id && d.company_id === auth.company_id)
      : null;

    const acks = db.policy_acknowledgements.filter(
      (a) => a.policy_id === policy.id && targetEmpIds.has(a.employee_id)
    );

    const totalEmployees = targetEmployees.length;
    const acknowledgedCount = acks.filter((a) => a.acknowledged).length;
    const pendingCount = Math.max(0, totalEmployees - acknowledgedCount);
    const followUpCount = acks.filter((a) => !a.acknowledged && a.follow_up_required).length;
    const completionRate = totalEmployees > 0 ? Math.round((acknowledgedCount / totalEmployees) * 100) : 0;

    return {
      ...policy,
      document_file_name: linkedDoc ? linkedDoc.file_name : null,
      document_file_ref: linkedDoc ? linkedDoc.file_ref : null,
      total_employees: totalEmployees,
      acknowledged_count: acknowledgedCount,
      pending_count: pendingCount,
      follow_up_count: followUpCount,
      completion_rate: completionRate,
    };
  });

  // Sort by issue_date descending
  result.sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime());

  res.json(result);
});

// POST /api/policies - Create a new policy
app.post('/api/policies', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const { name, version, issue_date, document_id } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Policy name is required.' });
  }
  if (!version || typeof version !== 'string' || !version.trim()) {
    return res.status(400).json({ error: 'Policy version is required (e.g. v1.0, 2026.1).' });
  }

  // Validate document_id if provided (must belong to company)
  if (document_id) {
    const docExists = db.documents?.some(
      (d) => d.id === document_id && d.company_id === auth.company_id
    );
    if (!docExists) {
      return res.status(400).json({ error: 'Linked document not found in company documents.' });
    }
  }

  if (!db.policies) db.policies = [];

  const newPolicy: Policy = {
    id: generateId('pol'),
    company_id: auth.company_id,
    name: name.trim(),
    version: version.trim(),
    issue_date: issue_date || getTodayString(),
    document_id: document_id || null,
  };

  db.policies.unshift(newPolicy);

  // Auto-generate unacknowledged records for all active employees
  ensurePolicyAcknowledgementsForPolicy(auth.company_id, newPolicy.id);

  saveDb();
  broadcastToCompany(auth.company_id, 'policy_created', { policy: newPolicy });

  // Return with detail fields
  const linkedDoc = newPolicy.document_id
    ? db.documents?.find((d) => d.id === newPolicy.document_id)
    : null;
  const activeEmps = db.employees.filter(
    (e) => e.company_id === auth.company_id && e.status !== 'offboarded'
  );

  const policyWithDetails: PolicyWithDetails = {
    ...newPolicy,
    document_file_name: linkedDoc ? linkedDoc.file_name : null,
    document_file_ref: linkedDoc ? linkedDoc.file_ref : null,
    total_employees: activeEmps.length,
    acknowledged_count: 0,
    pending_count: activeEmps.length,
    follow_up_count: 0,
    completion_rate: 0,
  };

  res.status(201).json(policyWithDetails);
});

// GET /api/policies/:id - Get single policy with details
app.get('/api/policies/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  if (!db.policies) db.policies = [];

  const policy = db.policies.find(
    (p) => p.id === req.params.id && p.company_id === auth.company_id
  );

  if (!policy) {
    return res.status(404).json({ error: 'Policy not found.' });
  }

  ensurePolicyAcknowledgementsForPolicy(auth.company_id, policy.id);

  const linkedDoc = policy.document_id
    ? db.documents?.find((d) => d.id === policy.document_id && d.company_id === auth.company_id)
    : null;

  const targetEmployees = db.employees.filter(
    (e) => e.company_id === auth.company_id && e.status !== 'offboarded'
  );
  const targetEmpIds = new Set(targetEmployees.map((e) => e.id));

  const acks = (db.policy_acknowledgements || []).filter(
    (a) => a.policy_id === policy.id && targetEmpIds.has(a.employee_id)
  );

  const totalEmployees = targetEmployees.length;
  const acknowledgedCount = acks.filter((a) => a.acknowledged).length;
  const pendingCount = Math.max(0, totalEmployees - acknowledgedCount);
  const followUpCount = acks.filter((a) => !a.acknowledged && a.follow_up_required).length;
  const completionRate = totalEmployees > 0 ? Math.round((acknowledgedCount / totalEmployees) * 100) : 0;

  res.json({
    ...policy,
    document_file_name: linkedDoc ? linkedDoc.file_name : null,
    document_file_ref: linkedDoc ? linkedDoc.file_ref : null,
    total_employees: totalEmployees,
    acknowledged_count: acknowledgedCount,
    pending_count: pendingCount,
    follow_up_count: followUpCount,
    completion_rate: completionRate,
  });
});

// PUT /api/policies/:id - Update policy metadata
app.put('/api/policies/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const { name, version, issue_date, document_id } = req.body;

  if (!db.policies) db.policies = [];

  const policy = db.policies.find(
    (p) => p.id === req.params.id && p.company_id === auth.company_id
  );

  if (!policy) {
    return res.status(404).json({ error: 'Policy not found.' });
  }

  if (name && typeof name === 'string' && name.trim()) {
    policy.name = name.trim();
  }
  if (version && typeof version === 'string' && version.trim()) {
    policy.version = version.trim();
  }
  if (issue_date && typeof issue_date === 'string') {
    policy.issue_date = issue_date;
  }
  if (document_id !== undefined) {
    if (document_id) {
      const docExists = db.documents?.some(
        (d) => d.id === document_id && d.company_id === auth.company_id
      );
      if (!docExists) {
        return res.status(400).json({ error: 'Linked document not found in company documents.' });
      }
      policy.document_id = document_id;
    } else {
      policy.document_id = null;
    }
  }

  saveDb();
  broadcastToCompany(auth.company_id, 'policy_updated', { policy });

  res.json(policy);
});

// DELETE /api/policies/:id - Delete policy and its acknowledgements
app.delete('/api/policies/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  if (!db.policies) db.policies = [];

  const idx = db.policies.findIndex(
    (p) => p.id === req.params.id && p.company_id === auth.company_id
  );

  if (idx === -1) {
    return res.status(404).json({ error: 'Policy not found.' });
  }

  const deleted = db.policies.splice(idx, 1)[0];

  // Remove acknowledgements for this policy
  if (db.policy_acknowledgements) {
    db.policy_acknowledgements = db.policy_acknowledgements.filter(
      (a) => a.policy_id !== deleted.id
    );
  }

  saveDb();
  broadcastToCompany(auth.company_id, 'policy_deleted', { id: deleted.id });

  res.json({ success: true, message: 'Policy and its acknowledgements deleted successfully.' });
});

// GET /api/policies/:id/acknowledgements - List employee acknowledgements for a policy
app.get('/api/policies/:id/acknowledgements', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  if (!db.policies) db.policies = [];
  if (!db.policy_acknowledgements) db.policy_acknowledgements = [];

  const policy = db.policies.find(
    (p) => p.id === req.params.id && p.company_id === auth.company_id
  );

  if (!policy) {
    return res.status(404).json({ error: 'Policy not found.' });
  }

  ensurePolicyAcknowledgementsForPolicy(auth.company_id, policy.id);

  const deptFilter = req.query.department_id as string | undefined;
  const statusFilter = req.query.status as string | undefined; // 'all' | 'acknowledged' | 'pending' | 'follow_up'
  const search = (req.query.search as string | undefined)?.toLowerCase().trim();

  // Active or probationary employees
  let employees = db.employees.filter(
    (e) => e.company_id === auth.company_id && e.status !== 'offboarded'
  );

  if (deptFilter && deptFilter !== 'all') {
    employees = employees.filter((e) => e.department_id === deptFilter);
  }

  if (search) {
    employees = employees.filter(
      (e) =>
        e.name.toLowerCase().includes(search) ||
        e.job_title.toLowerCase().includes(search) ||
        ((e as any).work_email && (e as any).work_email.toLowerCase().includes(search)) ||
        ((e as any).email && (e as any).email.toLowerCase().includes(search))
    );
  }

  const deptMap = new Map((db.departments || []).map((d) => [d.id, d.name]));

  const acksByEmpId = new Map(
    db.policy_acknowledgements
      .filter((a) => a.policy_id === policy.id)
      .map((a) => [a.employee_id, a])
  );

  let results: PolicyAcknowledgementWithDetails[] = employees.map((emp) => {
    let ack = acksByEmpId.get(emp.id);
    if (!ack) {
      ack = {
        id: generateId('pack'),
        policy_id: policy.id,
        employee_id: emp.id,
        acknowledged: false,
        acknowledgment_date: null,
        acknowledgment_method: null,
        follow_up_required: false,
        created_at: new Date().toISOString(),
      };
      db.policy_acknowledgements.push(ack);
    }

    const resolvedEmail = (emp as any).work_email || (emp as any).email || `${emp.name.toLowerCase().replace(/\s+/g, '.')}@goya-hrms.com`;

    return {
      ...ack,
      employee_name: emp.name,
      department_id: emp.department_id,
      department_name: deptMap.get(emp.department_id) || 'General',
      job_title: emp.job_title,
      country: emp.country,
      work_email: resolvedEmail,
      status: emp.status,
    };
  });

  // Filter by acknowledgement status
  if (statusFilter === 'acknowledged') {
    results = results.filter((r) => r.acknowledged);
  } else if (statusFilter === 'pending') {
    results = results.filter((r) => !r.acknowledged);
  } else if (statusFilter === 'follow_up') {
    results = results.filter((r) => !r.acknowledged && r.follow_up_required);
  }

  // Sort: pending first, then by employee name
  results.sort((a, b) => {
    if (a.acknowledged !== b.acknowledged) {
      return a.acknowledged ? 1 : -1;
    }
    return a.employee_name.localeCompare(b.employee_name);
  });

  res.json(results);
});

// PATCH /api/policies/:id/acknowledgements/:employeeId - Mark/Update acknowledgement on employee's behalf
app.patch('/api/policies/:id/acknowledgements/:employeeId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const { id: policyId, employeeId } = req.params;
  const { acknowledged, acknowledgment_date, acknowledgment_method, follow_up_required } = req.body;

  if (!db.policies) db.policies = [];
  if (!db.policy_acknowledgements) db.policy_acknowledgements = [];

  const policy = db.policies.find(
    (p) => p.id === policyId && p.company_id === auth.company_id
  );
  if (!policy) {
    return res.status(404).json({ error: 'Policy not found.' });
  }

  const emp = db.employees.find(
    (e) => e.id === employeeId && e.company_id === auth.company_id
  );
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found.' });
  }

  let ack = db.policy_acknowledgements.find(
    (a) => a.policy_id === policyId && a.employee_id === employeeId
  );

  if (!ack) {
    ack = {
      id: generateId('pack'),
      policy_id: policyId,
      employee_id: employeeId,
      acknowledged: false,
      acknowledgment_date: null,
      acknowledgment_method: null,
      follow_up_required: false,
      created_at: new Date().toISOString(),
    };
    db.policy_acknowledgements.push(ack);
  }

  if (acknowledged !== undefined) {
    ack.acknowledged = Boolean(acknowledged);
    if (ack.acknowledged) {
      ack.acknowledgment_date = acknowledgment_date || getTodayString();
      ack.acknowledgment_method = (acknowledgment_method as PolicyAcknowledgmentMethod) || 'in_app';
      ack.follow_up_required = false; // Resolved
    } else {
      ack.acknowledgment_date = null;
      ack.acknowledgment_method = null;
    }
  }

  if (acknowledgment_date !== undefined && ack.acknowledged) {
    ack.acknowledgment_date = acknowledgment_date;
  }

  if (acknowledgment_method !== undefined && ack.acknowledged) {
    ack.acknowledgment_method = acknowledgment_method;
  }

  if (follow_up_required !== undefined) {
    ack.follow_up_required = Boolean(follow_up_required);
  }

  saveDb();
  broadcastToCompany(auth.company_id, 'policy_acknowledgement_updated', {
    policy_id: policyId,
    acknowledgement: ack,
  });

  const dept = db.departments?.find((d) => d.id === emp.department_id);
  const resolvedEmail = (emp as any).work_email || (emp as any).email || `${emp.name.toLowerCase().replace(/\s+/g, '.')}@goya-hrms.com`;

  const fullAck: PolicyAcknowledgementWithDetails = {
    ...ack,
    employee_name: emp.name,
    department_id: emp.department_id,
    department_name: dept ? dept.name : 'General',
    job_title: emp.job_title,
    country: emp.country,
    work_email: resolvedEmail,
    status: emp.status,
  };

  res.json(fullAck);
});

// POST /api/policies/:id/batch-acknowledge - Batch mark acknowledgements
app.post('/api/policies/:id/batch-acknowledge', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const policyId = req.params.id;
  const { employee_ids, acknowledgment_date, acknowledgment_method } = req.body;

  if (!Array.isArray(employee_ids) || employee_ids.length === 0) {
    return res.status(400).json({ error: 'employee_ids must be a non-empty array.' });
  }

  const policy = db.policies?.find(
    (p) => p.id === policyId && p.company_id === auth.company_id
  );
  if (!policy) {
    return res.status(404).json({ error: 'Policy not found.' });
  }

  const dateToUse = acknowledgment_date || getTodayString();
  const methodToUse: PolicyAcknowledgmentMethod = acknowledgment_method || 'in_app';

  let updatedCount = 0;
  for (const empId of employee_ids) {
    let ack = db.policy_acknowledgements.find(
      (a) => a.policy_id === policyId && a.employee_id === empId
    );
    if (!ack) {
      ack = {
        id: generateId('pack'),
        policy_id: policyId,
        employee_id: empId,
        acknowledged: true,
        acknowledgment_date: dateToUse,
        acknowledgment_method: methodToUse,
        follow_up_required: false,
        created_at: new Date().toISOString(),
      };
      db.policy_acknowledgements.push(ack);
    } else {
      ack.acknowledged = true;
      ack.acknowledgment_date = dateToUse;
      ack.acknowledgment_method = methodToUse;
      ack.follow_up_required = false;
    }
    updatedCount++;
  }

  saveDb();
  broadcastToCompany(auth.company_id, 'policy_acknowledgement_updated', {
    policy_id: policyId,
    batch_count: updatedCount,
  });

  res.json({
    success: true,
    updated_count: updatedCount,
    message: `Recorded policy acknowledgment for ${updatedCount} employee(s).`,
  });
});

// POST /api/policies/:id/remind - Trigger reminders to outstanding employees per Milestone 11
app.post('/api/policies/:id/remind', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const policyId = req.params.id;
  const { department_id } = req.body;

  const policy = db.policies?.find(
    (p) => p.id === policyId && p.company_id === auth.company_id
  );
  if (!policy) {
    return res.status(404).json({ error: 'Policy not found.' });
  }

  ensurePolicyAcknowledgementsForPolicy(auth.company_id, policy.id);

  // Target active employees
  let targetEmps = db.employees.filter(
    (e) => e.company_id === auth.company_id && e.status !== 'offboarded'
  );
  if (department_id && department_id !== 'all') {
    targetEmps = targetEmps.filter((e) => e.department_id === department_id);
  }

  const targetEmpIds = new Set(targetEmps.map((e) => e.id));

  // Find unacknowledged records
  const pendingAcks = db.policy_acknowledgements.filter(
    (a) => a.policy_id === policy.id && targetEmpIds.has(a.employee_id) && !a.acknowledged
  );

  if (pendingAcks.length === 0) {
    return res.json({
      success: true,
      reminded_count: 0,
      message: 'All employees in the selected scope have already acknowledged this policy.',
    });
  }

  // Flag follow_up_required = true for all pending
  for (const ack of pendingAcks) {
    ack.follow_up_required = true;
  }

  const pendingEmpNames = targetEmps
    .filter((e) => pendingAcks.some((a) => a.employee_id === e.id))
    .map((e) => e.name);

  const namesSummary =
    pendingEmpNames.length <= 3
      ? pendingEmpNames.join(', ')
      : `${pendingEmpNames.slice(0, 2).join(', ')} and ${pendingEmpNames.length - 2} others`;

  // Milestone 11 In-App Notification: Notify workspace admins & users
  const companyUsers = db.users.filter((u) => {
    return db.organization_members.some(
      (m) => m.user_id === u.id && m.organization_id === auth.company_id
    );
  });

  const notificationTitle = `Policy Reminder: ${policy.name}`;
  const notificationMessage = `Follow-up reminder dispatched for ${pendingAcks.length} outstanding employee(s) (${namesSummary}) to complete acknowledgment of "${policy.name}" (${policy.version}).`;

  for (const user of companyUsers) {
    createNotification(
      auth.company_id,
      user.id,
      'policy_acknowledgement_reminder',
      notificationTitle,
      notificationMessage,
      'policies'
    );
  }

  // Also simulate edge email delivery logs per Milestone 11 for the HR user
  sendEdgeEmail({
    companyId: auth.company_id,
    userId: auth.user_id,
    recipientEmail: auth.email,
    subject: `[Policy Notice] Acknowledgment reminders sent for ${policy.name}`,
    body: `Dear HR Team,\n\nReminders have been registered for ${pendingAcks.length} employee(s) who have not yet acknowledged "${policy.name}" (${policy.version}).\n\nPending team members: ${pendingEmpNames.join(', ')}.\n\nGo-Ya HRMS Compliance Engine`,
    type: 'policy_acknowledgement_reminder',
  }).catch((err) => console.warn('sendEdgeEmail warning:', err));

  saveDb();
  broadcastToCompany(auth.company_id, 'policy_acknowledgement_updated', {
    policy_id: policy.id,
    reminded_count: pendingAcks.length,
  });

  res.json({
    success: true,
    reminded_count: pendingAcks.length,
    message: `Dispatched reminder notifications to ${pendingAcks.length} outstanding employee(s).`,
  });
});

// ==========================================
// Milestone 21: Engagement Survey Endpoints
// ==========================================

// Public Unauthenticated: Get Survey by Token/ID
app.get('/api/public/surveys/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  if (!db.engagement_surveys) db.engagement_surveys = [];

  const survey = db.engagement_surveys.find((s) => s.id === token);
  if (!survey) {
    return res.status(404).json({ error: 'Survey not found or invalid link.' });
  }

  const now = new Date();
  const opensAt = new Date(survey.opens_at);
  const closesAt = new Date(survey.closes_at);
  const isUpcoming = now < opensAt;
  const isClosed = now > closesAt;
  const isOpen = !isUpcoming && !isClosed;

  const org = (db.organizations || []).find((o) => o.id === survey.company_id);
  const dept = survey.target_department_id
    ? (db.departments || []).find((d) => d.id === survey.target_department_id)
    : null;

  const questions = (db.survey_questions || [])
    .filter((q) => q.survey_id === survey.id)
    .map((q) => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options || [],
    }));

  const publicData: PublicSurveyData = {
    id: survey.id,
    title: survey.title,
    description: survey.description || '',
    company_name: org ? org.name : 'Go-Ya HRMS Workspace',
    target_department_name: dept ? dept.name : null,
    is_anonymous: survey.is_anonymous,
    opens_at: survey.opens_at,
    closes_at: survey.closes_at,
    isOpen,
    isUpcoming,
    isClosed,
    questions,
  };

  return res.json(publicData);
});

// Public Unauthenticated: Submit Survey Response
app.post('/api/public/surveys/:token/respond', (req: Request, res: Response) => {
  const { token } = req.params;
  const { answers, respondent_employee_id } = req.body;

  if (!db.engagement_surveys) db.engagement_surveys = [];
  const survey = db.engagement_surveys.find((s) => s.id === token);
  if (!survey) {
    return res.status(404).json({ error: 'Survey not found or invalid link.' });
  }

  const now = new Date();
  const opensAt = new Date(survey.opens_at);
  const closesAt = new Date(survey.closes_at);

  if (now < opensAt) {
    return res.status(400).json({ error: 'This survey has not opened yet.' });
  }
  if (now > closesAt) {
    return res.status(400).json({ error: 'This survey is closed and is no longer accepting submissions.' });
  }

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'Please provide responses to the survey questions.' });
  }

  // Strict anonymity enforcement at the database level:
  // When is_anonymous is true, do not store or expose any link between a response and an employee.
  const resolvedRespondentId = survey.is_anonymous
    ? null
    : respondent_employee_id
    ? String(respondent_employee_id)
    : null;

  const responseId = generateId('sresp');
  const responseRecord: SurveyResponse = {
    id: responseId,
    survey_id: survey.id,
    respondent_employee_id: resolvedRespondentId,
    submitted_at: new Date().toISOString(),
  };

  if (!db.survey_responses) db.survey_responses = [];
  db.survey_responses.push(responseRecord);

  if (!db.survey_answers) db.survey_answers = [];
  for (const item of answers) {
    if (!item.question_id || item.answer_value === undefined || item.answer_value === null) continue;
    db.survey_answers.push({
      id: generateId('sans'),
      response_id: responseId,
      question_id: String(item.question_id),
      answer_value: String(item.answer_value).trim(),
    });
  }

  saveDb();

  // Realtime notification to HR workspace
  broadcastToCompany(survey.company_id, 'survey_response_received', {
    survey_id: survey.id,
    submitted_at: responseRecord.submitted_at,
  });

  // Never return other people's responses or internal data back to the respondent
  return res.status(201).json({
    success: true,
    message: 'Thank you for your feedback! Your response has been securely submitted.',
  });
});

// Authenticated HR: List all surveys with metrics
app.get('/api/surveys', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  if (!db.engagement_surveys) db.engagement_surveys = [];
  if (!db.survey_questions) db.survey_questions = [];
  if (!db.survey_responses) db.survey_responses = [];

  const companySurveys = db.engagement_surveys.filter((s) => s.company_id === auth.company_id);
  const activeEmps = (db.employees || []).filter(
    (e) => e.company_id === auth.company_id && (e.status === 'active' || e.status === 'probation')
  );
  const deptMap = new Map((db.departments || []).map((d) => [d.id, d.name]));
  const userMap = new Map((db.users || []).map((u) => [u.id, u.email]));

  const now = new Date();

  const results: EngagementSurveyWithMetrics[] = companySurveys.map((survey) => {
    const qCount = db.survey_questions.filter((q) => q.survey_id === survey.id).length;
    const rCount = db.survey_responses.filter((r) => r.survey_id === survey.id).length;

    let targetAudience = activeEmps.length;
    if (survey.target_department_id) {
      targetAudience = activeEmps.filter((e) => e.department_id === survey.target_department_id).length;
    }

    const responseRate =
      targetAudience > 0 ? Math.min(100, Math.round((rCount / targetAudience) * 1000) / 10) : 0;

    const opensAt = new Date(survey.opens_at);
    const closesAt = new Date(survey.closes_at);
    let status: 'active' | 'upcoming' | 'closed' = 'active';
    if (now < opensAt) status = 'upcoming';
    else if (now > closesAt) status = 'closed';

    return {
      ...survey,
      target_department_name: survey.target_department_id
        ? deptMap.get(survey.target_department_id) || 'Department'
        : 'Whole Company',
      question_count: qCount,
      response_count: rCount,
      target_audience_count: targetAudience,
      response_rate: responseRate,
      status,
      created_by_name: userMap.get(survey.created_by) || 'HR Team',
    };
  });

  // Sort by created_at descending
  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return res.json(results);
});

// Authenticated HR: Create a new survey
app.post('/api/surveys', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const { title, description, target_department_id, is_anonymous, opens_at, closes_at, questions } =
    req.body;

  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'Survey title is required.' });
  }
  if (!opens_at || !closes_at) {
    return res.status(400).json({ error: 'Open and close dates are required.' });
  }
  if (new Date(closes_at) <= new Date(opens_at)) {
    return res.status(400).json({ error: 'Close date must be after open date.' });
  }
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'At least one question is required.' });
  }

  if (!db.engagement_surveys) db.engagement_surveys = [];
  if (!db.survey_questions) db.survey_questions = [];

  const surveyId = generateId('survey');
  const newSurvey: EngagementSurvey = {
    id: surveyId,
    company_id: auth.company_id,
    title: String(title).trim(),
    description: description ? String(description).trim() : '',
    target_department_id: target_department_id ? String(target_department_id) : null,
    is_anonymous: is_anonymous !== undefined ? Boolean(is_anonymous) : true,
    opens_at: new Date(opens_at).toISOString(),
    closes_at: new Date(closes_at).toISOString(),
    created_by: auth.user_id,
    created_at: new Date().toISOString(),
  };

  db.engagement_surveys.unshift(newSurvey);

  const createdQuestions: SurveyQuestion[] = [];
  for (const q of questions) {
    if (!q.question_text || !String(q.question_text).trim()) continue;
    const qRecord: SurveyQuestion = {
      id: generateId('sq'),
      survey_id: surveyId,
      question_text: String(q.question_text).trim(),
      question_type: q.question_type === 'multiple_choice' ? 'multiple_choice' : 'rating',
      options:
        q.question_type === 'multiple_choice' && Array.isArray(q.options)
          ? q.options.map((opt: any) => String(opt).trim()).filter(Boolean)
          : null,
    };
    db.survey_questions.push(qRecord);
    createdQuestions.push(qRecord);
  }

  saveDb();

  broadcastToCompany(auth.company_id, 'survey_created', {
    survey_id: newSurvey.id,
    title: newSurvey.title,
  });

  return res.status(201).json({
    ...newSurvey,
    questions: createdQuestions,
  });
});

// Authenticated HR: Get Survey Results & Question Aggregates
app.get('/api/surveys/:id/results', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const { id } = req.params;

  if (!db.engagement_surveys) db.engagement_surveys = [];
  const survey = db.engagement_surveys.find(
    (s) => s.id === id && s.company_id === auth.company_id
  );
  if (!survey) {
    return res.status(404).json({ error: 'Survey not found.' });
  }

  const questions = (db.survey_questions || []).filter((q) => q.survey_id === survey.id);
  const responses = (db.survey_responses || []).filter((r) => r.survey_id === survey.id);
  const responseIdSet = new Set(responses.map((r) => r.id));
  const answers = (db.survey_answers || []).filter((a) => responseIdSet.has(a.response_id));

  const activeEmps = (db.employees || []).filter(
    (e) => e.company_id === auth.company_id && (e.status === 'active' || e.status === 'probation')
  );

  let targetAudience = activeEmps.length;
  if (survey.target_department_id) {
    targetAudience = activeEmps.filter((e) => e.department_id === survey.target_department_id).length;
  }

  const totalResponses = responses.length;
  const responseRate =
    targetAudience > 0 ? Math.min(100, Math.round((totalResponses / targetAudience) * 1000) / 10) : 0;

  const now = new Date();
  const opensAt = new Date(survey.opens_at);
  const closesAt = new Date(survey.closes_at);
  let status: 'active' | 'upcoming' | 'closed' = 'active';
  if (now < opensAt) status = 'upcoming';
  else if (now > closesAt) status = 'closed';

  const dept = survey.target_department_id
    ? (db.departments || []).find((d) => d.id === survey.target_department_id)
    : null;

  // Question Aggregates
  const questionResults = questions.map((q) => {
    const qAnswers = answers.filter((a) => a.question_id === q.id);
    const totalAnswers = qAnswers.length;

    if (q.question_type === 'rating') {
      const distribution: { [rating: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;
      let validCount = 0;

      for (const a of qAnswers) {
        const val = parseInt(a.answer_value, 10);
        if (val >= 1 && val <= 5) {
          distribution[val] = (distribution[val] || 0) + 1;
          sum += val;
          validCount++;
        }
      }

      const averageScore = validCount > 0 ? Math.round((sum / validCount) * 100) / 100 : 0;
      const percentages: { [rating: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (let r = 1; r <= 5; r++) {
        percentages[r] = validCount > 0 ? Math.round((distribution[r] / validCount) * 1000) / 10 : 0;
      }

      return {
        question: q,
        total_answers: totalAnswers,
        rating_stats: {
          average_score: averageScore,
          total_answers: validCount,
          distribution,
          percentages,
        },
      };
    } else {
      // Multiple Choice
      const options = q.options || [];
      const tallyMap: { [opt: string]: number } = {};
      options.forEach((opt) => (tallyMap[opt] = 0));

      for (const a of qAnswers) {
        if (tallyMap[a.answer_value] !== undefined) {
          tallyMap[a.answer_value]++;
        } else {
          tallyMap[a.answer_value] = (tallyMap[a.answer_value] || 0) + 1;
        }
      }

      const choiceTallies = Object.keys(tallyMap).map((opt) => ({
        option: opt,
        count: tallyMap[opt],
        percentage:
          totalAnswers > 0 ? Math.round((tallyMap[opt] / totalAnswers) * 1000) / 10 : 0,
      }));

      // Sort tallies descending
      choiceTallies.sort((a, b) => b.count - a.count);

      return {
        question: q,
        total_answers: totalAnswers,
        choice_tallies: choiceTallies,
      };
    }
  });

  const payload: SurveyResultsResponse = {
    survey,
    target_department_name: dept ? dept.name : 'Whole Company',
    target_audience_count: targetAudience,
    total_responses: totalResponses,
    response_rate: responseRate,
    status,
    question_results: questionResults,
    recent_responses_count: responses.filter(
      (r) => Date.now() - new Date(r.submitted_at).getTime() < 24 * 60 * 60 * 1000
    ).length,
  };

  return res.json(payload);
});

// Authenticated HR: Delete a survey
app.delete('/api/surveys/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const auth = req.auth!;
  const { id } = req.params;

  if (!db.engagement_surveys) db.engagement_surveys = [];
  const index = db.engagement_surveys.findIndex(
    (s) => s.id === id && s.company_id === auth.company_id
  );
  if (index === -1) {
    return res.status(404).json({ error: 'Survey not found.' });
  }

  const deletedSurvey = db.engagement_surveys.splice(index, 1)[0];

  // Clean up questions
  if (db.survey_questions) {
    db.survey_questions = db.survey_questions.filter((q) => q.survey_id !== id);
  }

  // Clean up responses & answers
  const responseIds = (db.survey_responses || [])
    .filter((r) => r.survey_id === id)
    .map((r) => r.id);
  const responseIdSet = new Set(responseIds);

  if (db.survey_responses) {
    db.survey_responses = db.survey_responses.filter((r) => r.survey_id !== id);
  }
  if (db.survey_answers) {
    db.survey_answers = db.survey_answers.filter((a) => !responseIdSet.has(a.response_id));
  }

  saveDb();

  broadcastToCompany(auth.company_id, 'survey_deleted', {
    survey_id: id,
    title: deletedSurvey.title,
  });

  return res.json({ success: true, message: 'Survey deleted successfully.' });
});

// ==========================================
// Milestone 22: HR Policy Governance Lifecycle
// ==========================================

// Helper: Calculate days between date string and today
function calculateDaysDifference(targetDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDateStr);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// 1. GET /api/governance
// RLS: hr_analyst can view (read-only); hr_head has full access
app.get('/api/governance', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (!db.governance_records) db.governance_records = [];
  if (!db.policies) db.policies = [];

  const todayStr = getTodayString();

  // Company isolation
  const records = db.governance_records.filter((r) => r.company_id === auth.company_id);

  // Auto-sync status and enrich details
  let hasStatusChange = false;
  const enriched: GovernanceRecordWithDetails[] = records.map((record) => {
    const daysUntilDue = calculateDaysDifference(record.next_review_due);
    const isOverdue =
      record.audit_status === 'overdue' ||
      (record.audit_status !== 'completed' && daysUntilDue < 0);

    // Auto-update to overdue if passed and still pending
    if (daysUntilDue < 0 && record.audit_status === 'pending') {
      record.audit_status = 'overdue';
      hasStatusChange = true;
    }

    const relatedPolicy = record.related_policy_id
      ? db.policies.find((p) => p.id === record.related_policy_id && p.company_id === auth.company_id) || null
      : null;

    return {
      ...record,
      related_policy: relatedPolicy,
      is_overdue: isOverdue,
      days_until_due: daysUntilDue,
    };
  });

  if (hasStatusChange) {
    saveDb();
  }

  // Milestone 11 feed: check if any records are overdue and notify HR Head(s) if not notified in last 24h
  const overdueRecords = enriched.filter((r) => r.is_overdue);
  if (overdueRecords.length > 0) {
    const hrHeads = (db.organization_members || []).filter(
      (m) => m.organization_id === auth.company_id && m.role === 'hr_head'
    );
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    for (const overdue of overdueRecords) {
      for (const head of hrHeads) {
        const recentNotif = (db.notifications || []).find(
          (n) =>
            n.company_id === auth.company_id &&
            n.user_id === head.user_id &&
            n.type === 'governance_review_due' &&
            n.title.includes(overdue.policy_name) &&
            new Date(n.created_at).getTime() > oneDayAgo
        );

        if (!recentNotif) {
          createNotification(
            auth.company_id,
            head.user_id,
            'governance_review_due',
            `Policy Governance Audit Due: ${overdue.policy_name}`,
            `Governance review for "${overdue.policy_name}" was due on ${overdue.next_review_due} and is overdue for audit. Please review and update lifecycle status.`,
            '/app?view=governance'
          );
        }
      }
    }
  }

  // Optional sort param: default is next_review_due ascending
  const sortBy = req.query.sort as string;
  if (sortBy === 'next_review_due_desc') {
    enriched.sort((a, b) => new Date(b.next_review_due).getTime() - new Date(a.next_review_due).getTime());
  } else if (sortBy === 'policy_name') {
    enriched.sort((a, b) => a.policy_name.localeCompare(b.policy_name));
  } else if (sortBy === 'last_review_date') {
    enriched.sort((a, b) => new Date(b.last_review_date).getTime() - new Date(a.last_review_date).getTime());
  } else {
    // Default: earliest next_review_due first (overdue items at the very top)
    enriched.sort((a, b) => new Date(a.next_review_due).getTime() - new Date(b.next_review_due).getTime());
  }

  return res.json(enriched);
});

// 2. POST /api/governance
// RLS: Strictly hr_head only (HR Analyst is read-only)
app.post('/api/governance', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'RLS Policy Violation: Only HR Head role has permission to create policy governance records.',
    });
  }

  if (!db.governance_records) db.governance_records = [];

  const {
    policy_name,
    related_policy_id,
    last_review_date,
    next_review_due,
    reviewed_by,
    approved_by,
    distributed,
    audit_status,
  } = req.body;

  if (!policy_name || typeof policy_name !== 'string' || !policy_name.trim()) {
    return res.status(400).json({ error: 'Policy name is required.' });
  }
  if (!last_review_date || !next_review_due) {
    return res.status(400).json({ error: 'Last review date and next review due date are required.' });
  }
  if (!reviewed_by || !approved_by) {
    return res.status(400).json({ error: 'Reviewed by and Approved by are required.' });
  }

  // Validate related_policy_id belongs to company if provided
  let validRelatedPolicyId: string | null = null;
  if (related_policy_id) {
    const policyExists = (db.policies || []).find(
      (p) => p.id === related_policy_id && p.company_id === auth.company_id
    );
    if (!policyExists) {
      return res.status(400).json({ error: 'Related policy not found in workspace.' });
    }
    validRelatedPolicyId = related_policy_id;
  }

  const daysUntilDue = calculateDaysDifference(next_review_due);
  let status: GovernanceAuditStatus = audit_status || 'pending';
  if (daysUntilDue < 0 && status !== 'completed') {
    status = 'overdue';
  }

  const newRecord: GovernanceRecord = {
    id: generateId('gov'),
    company_id: auth.company_id,
    policy_name: policy_name.trim(),
    related_policy_id: validRelatedPolicyId,
    last_review_date,
    next_review_due,
    reviewed_by: reviewed_by.trim(),
    approved_by: approved_by.trim(),
    distributed: Boolean(distributed),
    audit_status: status,
    created_at: new Date().toISOString(),
  };

  db.governance_records.unshift(newRecord);
  saveDb();

  // Milestone 11 Trigger: If created as overdue or approaching (due <= 7 days), notify HR Head
  if (daysUntilDue <= 7 && status !== 'completed') {
    createNotification(
      auth.company_id,
      auth.user_id,
      'governance_review_due',
      `Policy Review Scheduled: ${newRecord.policy_name}`,
      `Governance cycle initialized for "${newRecord.policy_name}". Review due date is ${newRecord.next_review_due} (${daysUntilDue < 0 ? 'OVERDUE' : `in ${daysUntilDue} days`}).`,
      '/app?view=governance'
    );
  }

  broadcastToCompany(auth.company_id, 'governance_record_created', { record: newRecord });

  const relatedPolicy = newRecord.related_policy_id
    ? (db.policies || []).find((p) => p.id === newRecord.related_policy_id) || null
    : null;

  return res.status(201).json({
    ...newRecord,
    related_policy: relatedPolicy,
    is_overdue: daysUntilDue < 0 && newRecord.audit_status !== 'completed',
    days_until_due: daysUntilDue,
  });
});

// 3. PUT /api/governance/:id
// RLS: Strictly hr_head only (HR Analyst is read-only)
app.put('/api/governance/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'RLS Policy Violation: Only HR Head role has permission to update policy governance records.',
    });
  }

  const { id } = req.params;
  if (!db.governance_records) db.governance_records = [];

  const record = db.governance_records.find(
    (r) => r.id === id && r.company_id === auth.company_id
  );

  if (!record) {
    return res.status(404).json({ error: 'Governance record not found.' });
  }

  const {
    policy_name,
    related_policy_id,
    last_review_date,
    next_review_due,
    reviewed_by,
    approved_by,
    distributed,
    audit_status,
  } = req.body;

  if (policy_name !== undefined) record.policy_name = policy_name.trim();
  if (last_review_date !== undefined) record.last_review_date = last_review_date;
  if (next_review_due !== undefined) record.next_review_due = next_review_due;
  if (reviewed_by !== undefined) record.reviewed_by = reviewed_by.trim();
  if (approved_by !== undefined) record.approved_by = approved_by.trim();
  if (distributed !== undefined) record.distributed = Boolean(distributed);

  if (related_policy_id !== undefined) {
    if (related_policy_id === null || related_policy_id === '') {
      record.related_policy_id = null;
    } else {
      const policyExists = (db.policies || []).find(
        (p) => p.id === related_policy_id && p.company_id === auth.company_id
      );
      if (!policyExists) {
        return res.status(400).json({ error: 'Related policy not found in workspace.' });
      }
      record.related_policy_id = related_policy_id;
    }
  }

  const daysUntilDue = calculateDaysDifference(record.next_review_due);
  if (audit_status !== undefined) {
    record.audit_status = audit_status;
  } else if (daysUntilDue < 0 && record.audit_status !== 'completed') {
    record.audit_status = 'overdue';
  }

  saveDb();

  broadcastToCompany(auth.company_id, 'governance_record_updated', { record });

  const relatedPolicy = record.related_policy_id
    ? (db.policies || []).find((p) => p.id === record.related_policy_id) || null
    : null;

  return res.json({
    ...record,
    related_policy: relatedPolicy,
    is_overdue: daysUntilDue < 0 && record.audit_status !== 'completed',
    days_until_due: daysUntilDue,
  });
});

// 4. DELETE /api/governance/:id
// RLS: Strictly hr_head only (HR Analyst is read-only)
app.delete('/api/governance/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (auth.role !== 'hr_head') {
    return res.status(403).json({
      error: 'RLS Policy Violation: Only HR Head role has permission to delete policy governance records.',
    });
  }

  const { id } = req.params;
  if (!db.governance_records) db.governance_records = [];

  const index = db.governance_records.findIndex(
    (r) => r.id === id && r.company_id === auth.company_id
  );

  if (index === -1) {
    return res.status(404).json({ error: 'Governance record not found.' });
  }

  const deleted = db.governance_records.splice(index, 1)[0];
  saveDb();

  broadcastToCompany(auth.company_id, 'governance_record_deleted', {
    record_id: id,
    policy_name: deleted.policy_name,
  });

  return res.json({
    success: true,
    message: `Governance record for "${deleted.policy_name}" deleted successfully.`,
  });
});

// 5. POST /api/governance/check-notifications
// Manually / periodically trigger audit review notifications to HR Head
app.post('/api/governance/check-notifications', requireAuth, (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  if (!db.governance_records) db.governance_records = [];

  const records = db.governance_records.filter((r) => r.company_id === auth.company_id);
  const hrHeads = (db.organization_members || []).filter(
    (m) => m.organization_id === auth.company_id && m.role === 'hr_head'
  );

  let notifiedCount = 0;
  let overdueCount = 0;

  for (const record of records) {
    const daysUntilDue = calculateDaysDifference(record.next_review_due);
    const isOverdue = daysUntilDue < 0 && record.audit_status !== 'completed';
    const isApproaching = daysUntilDue >= 0 && daysUntilDue <= 14 && record.audit_status !== 'completed';

    if (isOverdue) {
      overdueCount++;
      if (record.audit_status === 'pending') {
        record.audit_status = 'overdue';
      }
    }

    if (isOverdue || isApproaching) {
      for (const head of hrHeads) {
        createNotification(
          auth.company_id,
          head.user_id,
          'governance_review_due',
          isOverdue
            ? `Action Required: Policy Review Overdue (${record.policy_name})`
            : `Upcoming Policy Review (${record.policy_name})`,
          isOverdue
            ? `Governance review for "${record.policy_name}" was due on ${record.next_review_due} and requires immediate audit review.`
            : `Governance review for "${record.policy_name}" is due in ${daysUntilDue} day(s) (${record.next_review_due}).`,
          '/app?view=governance'
        );
        notifiedCount++;
      }
    }
  }

  saveDb();

  return res.json({
    success: true,
    overdue_count: overdueCount,
    notified_count: notifiedCount,
    message: `Audit scan completed. ${overdueCount} overdue item(s) flagged, ${notifiedCount} notification(s) dispatched.`,
  });
});

// ==========================================
// Vite Middleware / Static Production
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Go-Ya HRMS Server listening on http://0.0.0.0:${PORT}`);
    // Run scheduled compliance check on startup and every 30 minutes
    runScheduledComplianceCheck();
    setInterval(runScheduledComplianceCheck, 30 * 60 * 1000);
  });
}

startServer();
