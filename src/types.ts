export type Role = 'hr_head' | 'hr_analyst';

export type EmployeeStatus = 'active' | 'probation' | 'on_leave' | 'offboarded';

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';

export type AttritionRisk = 'low' | 'medium' | 'high';

export interface Organization {
  id: string;
  name: string;
  industry: string;
  country: string;
  currency: string;
  timezone: string;
  leave_escalation_threshold_days?: number;
  created_at: string;
}

export interface OrganizationMember {
  user_id: string;
  organization_id: string;
  role: Role;
}

export interface Department {
  id: string;
  company_id: string;
  name: string;
}

export interface Employee {
  id: string;
  company_id: string;
  name: string;
  department_id: string;
  job_title: string;
  employment_type: EmploymentType;
  country: string;
  start_date: string;
  status: EmployeeStatus;
  attrition_risk: AttritionRisk;
  manager_id?: string;
}

export interface StatutoryDataGhana {
  ssnit_number?: string;
  pension_tier_2_3_provider?: string;
  tin?: string;
  paye_band?: string;
}

export interface EmployeeCompensation {
  id: string;
  employee_id: string;
  salary: number;
  currency: string;
  effective_date: string;
  allowances?: number;
  bonus?: number;
  statutory_data?: Record<string, any> | StatutoryDataGhana;
  notes?: string;
  created_at?: string;
}

export interface User {
  id: string;
  email: string;
  email_verified: boolean;
  created_at: string;
}

export interface Invite {
  id: string;
  token: string;
  organization_id: string;
  email: string;
  role: Role;
  created_at: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired';
}

export interface AuthSession {
  token: string;
  user: User;
  organization: Organization;
  role: Role;
  available_workspaces: Array<{
    organization: Organization;
    role: Role;
  }>;
}

// -------------------------------------------------------------
// Milestone 2 Data Models
// -------------------------------------------------------------

export type OnboardingTaskCategory =
  | 'personal_info'
  | 'emergency_contact'
  | 'payroll_bank'
  | 'statutory_info'
  | 'document_upload'
  | 'policy_acknowledgement';

export interface OnboardingTask {
  id: string;
  employee_id: string;
  company_id: string;
  task: string;
  category: OnboardingTaskCategory;
  status: 'pending' | 'completed';
  due_date: string;
  completed_at?: string;
  completed_by?: string;
  notes?: string;
}

export type OffboardingReason = 'resignation' | 'termination' | 'retirement' | 'contract_expiry';

export type OffboardingTaskCategory =
  | 'last_working_day'
  | 'exit_interview'
  | 'asset_return'
  | 'access_revocation'
  | 'final_settlement';

export interface OffboardingTask {
  id: string;
  employee_id: string;
  company_id: string;
  task: string;
  category: OffboardingTaskCategory;
  status: 'pending' | 'completed';
  due_date: string;
  completed_at?: string;
  completed_by?: string;
  notes?: string;
}

export interface OffboardingRecord {
  id: string;
  employee_id: string;
  company_id: string;
  reason: OffboardingReason;
  last_working_day: string;
  exit_interview_notes?: string;
  final_leave_balance_days: number;
  final_settlement_amount?: number;
  currency?: string;
  settlement_approved_by?: string; // only HR Head
  settlement_approved_at?: string;
  status: 'in_progress' | 'settled_and_closed';
  created_at: string;
}

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'on_leave' | 'not_logged';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  company_id: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string;
}

export interface DailyAttendanceSummary {
  company_id: string;
  date: string; // YYYY-MM-DD
  present_count: number;
  absent_count: number;
  on_leave_count: number;
  late_count: number;
  not_logged_count: number;
}

export interface LeaveType {
  id: string;
  company_id: string;
  name: string;
  default_entitlement_days: number;
  description?: string;
  paid: boolean;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  company_id: string;
  leave_type_id: string;
  balance_days: number;
  used_days: number;
  allocated_days: number;
}

export interface LeaveAuditLog {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name?: string;
  leave_request_id?: string;
  leave_type_id: string;
  leave_type_name?: string;
  action: 'deduction' | 'allocation_adjustment' | 'statutory_update' | 'manual_override';
  days_changed: number;
  previous_balance: number;
  new_balance: number;
  performed_by: string;
  timestamp: string;
  notes?: string;
}

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  employee_id: string;
  company_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  status: LeaveRequestStatus;
  reason?: string;
  approved_by?: string;
  approved_at?: string;
  decision_notes?: string;
  escalated_to_head?: boolean;
  submitted_by?: string;
  created_at: string;
}

export interface LeaveRequestWithDetails extends LeaveRequest {
  employee_name: string;
  department_name: string;
  leave_type_name: string;
}

export interface EmployeeWithDetails extends Employee {
  department_name?: string;
  manager_name?: string;
  direct_reports_count?: number;
  compensation?: EmployeeCompensation | null;
  onboarding_progress?: {
    total_tasks: number;
    completed_tasks: number;
    percentage: number;
    tasks: OnboardingTask[];
  };
  offboarding?: {
    record?: OffboardingRecord | null;
    tasks: OffboardingTask[];
  };
  attendance_summary?: {
    present_days: number;
    late_days: number;
    absent_days: number;
    on_leave_days: number;
    total_logged_days: number;
  };
  leave_balances?: Array<{
    leave_type_id: string;
    leave_type_name: string;
    allocated_days: number;
    used_days: number;
    balance_days: number;
  }>;
  job_history?: JobHistory[];
}

export interface DashboardKPIs {
  total_employees: number;
  active_count: number;
  on_leave_count: number;
  high_attrition_risk_count: number;
  absences_today: number;
  on_leave_today: number;
  pending_leave_approvals: number;
  active_onboardings_count: number;
}

export interface AttentionItem {
  id: string;
  type: 'leave_request' | 'offboarding_settlement' | 'onboarding_task' | 'probation' | 'conduct_incident' | 'on_leave' | 'high_attrition';
  title: string;
  subtitle: string;
  employee_id: string;
  employee_name: string;
  severity: 'low' | 'medium' | 'high';
  action_type?: 'leave' | 'offboarding' | 'onboarding' | 'profile' | 'conduct';
  metadata?: any;
}

// -------------------------------------------------------------
// Milestone 3 Data Models (Payroll, Compliance Center, Documents)
// -------------------------------------------------------------

export interface PayrollDepartmentCost {
  department_id: string;
  department_name: string;
  employee_count: number;
  total_base_salary: number;
  total_allowances: number;
  total_bonus: number;
  total_cost: number;
  currency: string;
  percentage_of_total: number;
}

export interface PayrollCountryCost {
  country: string;
  employee_count: number;
  total_base_salary: number;
  total_allowances: number;
  total_bonus: number;
  total_cost: number;
  currency: string;
}

export interface PayrollSummary {
  total_payroll_cost: number;
  total_base_salaries: number;
  total_allowances: number;
  total_bonuses: number;
  total_active_employees: number;
  currency: string;
  cost_by_department: PayrollDepartmentCost[];
  cost_by_country: PayrollCountryCost[];
  records: Array<EmployeeCompensation & {
    employee_name: string;
    department_name: string;
    job_title: string;
    country: string;
    employment_type: EmploymentType;
    status: EmployeeStatus;
  }>;
}

export type ComplianceCategory =
  | 'statutory_tax'
  | 'contracts_visas'
  | 'certifications'
  | 'workplace_safety'
  | 'other';

export type ComplianceStatus = 'compliant' | 'attention' | 'non_compliant';

export interface ComplianceItem {
  id: string;
  company_id: string;
  category: ComplianceCategory;
  related_employee_id?: string;
  related_employee_name?: string;
  title: string;
  deadline: string; // YYYY-MM-DD
  status: ComplianceStatus;
  notes?: string;
  document_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface ComplianceCategoryBreakdown {
  category: ComplianceCategory;
  label: string;
  total: number;
  compliant: number;
  attention: number;
  non_compliant: number;
  score: number;
}

export interface ComplianceDashboardData {
  overall_score: number;
  total_items: number;
  compliant_count: number;
  attention_count: number;
  non_compliant_count: number;
  categories: ComplianceCategoryBreakdown[];
  items: ComplianceItem[];
}

export type DocumentType = 'contract' | 'id_card' | 'certification' | 'tax_form' | 'other';

export interface AppDocument {
  id: string;
  company_id: string;
  employee_id: string;
  type: DocumentType;
  file_ref: string; // Base64 data URL or Storage URI
  file_name: string;
  file_size: number;
  expiry_date?: string; // YYYY-MM-DD
  uploaded_at: string;
  uploaded_by: string;
  notes?: string;
}

export interface DocumentWithDetails extends AppDocument {
  employee_name: string;
  department_name: string;
  country: string;
}

// -------------------------------------------------------------
// Milestone 4 Data Models (AI Assistant, Analytics, Real Attrition, Org Chart)
// -------------------------------------------------------------

export type AppView =
  | 'dashboard'
  | 'directory'
  | 'profile'
  | 'onboarding'
  | 'attendance'
  | 'leave'
  | 'payroll'
  | 'compliance'
  | 'documents'
  | 'analytics'
  | 'org_chart'
  | 'ai_assistant'
  | 'tasks'
  | 'expenses'
  | 'recruitment'
  | 'events'
  | 'notifications'
  | 'chat'
  | 'billing'
  | 'conduct'
  | 'policies'
  | 'surveys'
  | 'governance';

export type AIAssistantMode = 'ask' | 'search' | 'summarize';

export interface AIChatLog {
  id: string;
  company_id: string;
  user_id: string;
  role_at_time: Role;
  question: string;
  answer: string;
  data_sources_used: string[];
  created_at: string;
}

export interface AIAssistantRequest {
  question: string;
  mode: AIAssistantMode;
  target_employee_id?: string;
  target_department_id?: string;
}

export interface AIAssistantResponse {
  answer: string;
  mode: AIAssistantMode;
  intent_classification: 'company_hr_query' | 'redirect_out_of_scope';
  data_sources_used: string[];
  suggested_followups?: string[];
  matched_employees?: Array<{
    id: string;
    name: string;
    job_title: string;
    department_name: string;
    country: string;
    status: EmployeeStatus;
    attrition_risk: AttritionRisk;
  }>;
}

export interface AttritionFactorBreakdown {
  key: 'absence_rate' | 'leave_pattern' | 'tenure_progression' | 'compensation_anomaly';
  label: string;
  severity: 'low' | 'medium' | 'high';
  score_impact: number;
  details: string;
  investigation_recommendation: string;
}

export interface EmployeeAttritionAnalysis {
  employee_id: string;
  employee_name: string;
  job_title: string;
  department_name: string;
  start_date: string;
  tenure_months: number;
  attrition_risk: AttritionRisk;
  risk_score: number; // 0 to 100
  factors: AttritionFactorBreakdown[];
  last_calculated_at: string;
}

export interface AttritionRecalculateResponse {
  success: boolean;
  total_analyzed: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  scores: EmployeeAttritionAnalysis[];
}

export interface HeadcountTrendPoint {
  period: string; // e.g. "Jan", "Feb", etc.
  headcount: number;
  new_hires: number;
  departures: number;
  net_change: number;
}

export interface TurnoverAnalytics {
  annual_turnover_rate: number; // percentage
  voluntary_exits: number;
  involuntary_exits: number;
  retention_rate: number;
  average_tenure_months: number;
}

export interface DepartmentAnalyticsItem {
  department_id: string;
  department_name: string;
  headcount: number;
  percentage_of_workforce: number;
  active_count: number;
  probation_count: number;
  high_attrition_count: number;
  average_tenure_months: number;
}

export interface LeaveUtilizationAnalytics {
  monthly_utilization: Array<{
    month: string;
    annual_leave_days: number;
    sick_leave_days: number;
    other_leave_days: number;
    attendance_rate_percentage: number;
  }>;
  total_leave_days_taken: number;
  average_days_per_employee: number;
  escalated_requests_count: number;
  breakdown_by_type: Array<{
    leave_type_name: string;
    days_taken: number;
    percentage: number;
  }>;
}

export interface WorkforceAnalyticsReport {
  company_id: string;
  company_name: string;
  generated_at: string;
  total_workforce: number;
  active_headcount: number;
  probation_headcount: number;
  headcount_trend: HeadcountTrendPoint[];
  turnover: TurnoverAnalytics;
  department_breakdown: DepartmentAnalyticsItem[];
  country_breakdown: Array<{ country: string; count: number; percentage: number }>;
  employment_type_breakdown: Array<{ type: EmploymentType; count: number; percentage: number }>;
  leave_utilization: LeaveUtilizationAnalytics;
}

export interface OrgNode {
  id: string;
  name: string;
  job_title: string;
  department_id: string;
  department_name: string;
  country: string;
  status: EmployeeStatus;
  attrition_risk: AttritionRisk;
  manager_id?: string;
  direct_reports_count: number;
  children?: OrgNode[];
}

// -------------------------------------------------------------
// Milestone 6 Data Models (Job & Reassignment History)
// -------------------------------------------------------------

export type JobChangeReason = 'promotion' | 'transfer' | 'restructure' | 'demotion';

export interface JobHistory {
  id: string;
  employee_id: string;
  company_id: string;
  previous_department_id: string;
  new_department_id: string;
  previous_job_title: string;
  new_job_title: string;
  previous_manager_id?: string | null;
  new_manager_id?: string | null;
  reason: JobChangeReason;
  effective_date: string;
  changed_by: string;
  created_at: string;
  // Enriched presentation fields
  previous_department_name?: string;
  new_department_name?: string;
  previous_manager_name?: string;
  new_manager_name?: string;
  changed_by_email?: string;
  changed_by_name?: string;
}

// -------------------------------------------------------------
// Milestone 5 Data Models (Task Management & Board)
// -------------------------------------------------------------

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'complete';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskViewMode = 'company' | 'my' | 'timeline';

export interface Task {
  id: string;
  company_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignee_id: string; // user_id of organization_member
  related_employee_id?: string | null;
  due_date?: string | null;
  priority: TaskPriority;
  created_by: string; // user_id
  created_at: string;
}

export interface TaskWithDetails extends Task {
  assignee_name?: string;
  assignee_email?: string;
  creator_name?: string;
  creator_email?: string;
  related_employee_name?: string;
  related_employee_job_title?: string;
  related_employee_department?: string;
}

// -------------------------------------------------------------
// Milestone 7 Data Models (HR Expenses & Spend Governance)
// -------------------------------------------------------------

export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

export interface ExpenseCategory {
  id: string;
  company_id: string;
  name: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  company_id: string;
  category_id: string;
  related_employee_id?: string | null;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD
  description: string;
  receipt_url?: string | null;
  receipt_name?: string | null;
  status: ExpenseStatus;
  submitted_by: string; // user_id
  approved_by?: string | null; // user_id or email
  approved_at?: string | null;
  rejection_notes?: string | null;
  created_at: string;
}

export interface ExpenseWithDetails extends Expense {
  category_name?: string;
  related_employee_name?: string;
  related_employee_job_title?: string;
  related_employee_department?: string;
  submitted_by_name?: string;
  submitted_by_email?: string;
  approved_by_name?: string;
  approved_by_email?: string;
}

export interface ExpenseCategoryBreakdown {
  category_id: string;
  category_name: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface ExpenseTimeSeriesPoint {
  label: string; // e.g. 'Aug 24' or 'Week 1' or 'Aug'
  timestamp: string;
  spent: number; // approved
  pending: number;
  count: number;
}

export interface ExpenseDashboardSummary {
  currency: string;
  period: '1M' | '3M' | '6M' | '1Y';
  total_spent_approved: number;
  previous_period_spent: number;
  percentage_change: number; // trend vs previous period (+/- percentage)
  pending_count: number;
  pending_total_amount: number;
  rejected_count: number;
  rejected_total_amount: number;
  total_expenses_count: number;
  category_breakdown: ExpenseCategoryBreakdown[];
  time_series: ExpenseTimeSeriesPoint[];
  available_currencies: string[];
}

export interface ExpensePolicy {
  restrict_analyst_to_own_expenses: boolean;
}

// -------------------------------------------------------------
// Milestone 8 Data Models (Recruitment & Hiring - ATS V1)
// -------------------------------------------------------------

export type JobPostingStatus = 'open' | 'on_hold' | 'closed';

export interface JobPosting {
  id: string;
  company_id: string;
  title: string;
  department_id: string;
  country: string;
  employment_type: EmploymentType;
  status: JobPostingStatus;
  created_by: string;
  created_at: string;
}

export interface JobPostingWithDetails extends JobPosting {
  department_name?: string;
  created_by_email?: string;
  candidates_count?: number;
  active_candidates_count?: number;
}

export type CandidateStage = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';

export interface CandidateStageHistoryItem {
  stage: CandidateStage;
  timestamp: string;
  changed_by?: string;
  changed_by_email?: string;
  notes?: string;
}

export interface Candidate {
  id: string;
  company_id: string;
  job_posting_id: string;
  name: string;
  email: string;
  phone: string;
  resume_url: string | null;
  resume_name?: string | null;
  stage: CandidateStage;
  notes: string;
  stage_history?: CandidateStageHistoryItem[];
  hired_employee_id?: string | null;
  created_at: string;
}

export interface CandidateWithDetails extends Candidate {
  job_title?: string;
  job_department?: string;
  job_country?: string;
  job_employment_type?: EmploymentType;
  hired_employee_name?: string;
}

export interface HireCandidateInput {
  start_date?: string;
  salary?: number;
  currency?: string;
  manager_id?: string;
  notes?: string;
}

// -------------------------------------------------------------
// Milestone 9 Data Models (Company Events)
// -------------------------------------------------------------

export type EventType = 'holiday' | 'meeting' | 'social' | 'training';
export type EventVisibilityScope = 'company' | 'department';

export interface CompanyEvent {
  id: string;
  company_id: string;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  event_type: EventType;
  visibility_scope: EventVisibilityScope;
  department_id?: string | null;
  training_session_id?: string | null; // Optional link to training session (Milestone 10)
  created_by: string;
  created_at: string;
}

export interface CompanyEventWithDetails extends CompanyEvent {
  department_name?: string;
  created_by_email?: string;
  can_edit?: boolean;
}

// -------------------------------------------------------------
// Milestone 11 Data Models (Notifications System)
// -------------------------------------------------------------

export type NotificationType =
  | 'leave_submitted'
  | 'leave_approved'
  | 'leave_rejected'
  | 'compliance_deadline'
  | 'task_assigned'
  | 'expense_submitted'
  | 'expense_approved'
  | 'expense_rejected'
  | 'event_created'
  | 'training_reminder'
  | 'probation_ending'
  | 'probation_outcome'
  | 'conduct_incident_logged'
  | 'conduct_incident_updated';

export interface AppNotification {
  id: string;
  company_id: string;
  user_id: string;
  type: NotificationType | string;
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface EmailDeliveryLog {
  id: string;
  company_id: string;
  user_id: string;
  recipient_email: string;
  subject: string;
  body: string;
  type: 'leave_decision' | 'compliance_deadline' | string;
  status: 'delivered';
  sent_at: string;
}

// -------------------------------------------------------------
// Milestone 12 Data Models (Internal Chat System)
// -------------------------------------------------------------

export interface ChatChannel {
  id: string;
  company_id: string;
  name: string | null;
  is_group: boolean;
  created_by: string;
  created_at: string;
}

export interface ChatChannelMember {
  channel_id: string;
  user_id: string;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface ChatMemberInfo {
  user_id: string;
  name: string;
  email: string;
  role: Role;
}

export interface ChatMessageWithSender extends ChatMessage {
  sender_name: string;
  sender_role: Role;
  sender_email?: string;
}

export interface ChatChannelWithDetails extends ChatChannel {
  members: ChatMemberInfo[];
  last_message?: ChatMessage | null;
  display_name: string;
}

// -------------------------------------------------------------
// Milestone 14 Data Models (Public Marketing & Demo Requests)
// -------------------------------------------------------------

export interface DemoRequest {
  id: string;
  name: string;
  email: string;
  company_name: string;
  team_size?: string;
  message?: string;
  created_at: string;
}

// -------------------------------------------------------------
// Milestone 15 & 16 Data Models (Subscriptions & Platform Admin)
// -------------------------------------------------------------

export type SubscriptionPlan = 'free_trial' | 'starter' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled';
export type BillingCycle = 'monthly' | 'annual';

export interface Subscription {
  id: string;
  company_id: string;
  plan: SubscriptionPlan;
  billing_cycle: BillingCycle;
  employee_limit: number;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string;
}

export interface PlatformAdmin {
  id: string;
  user_id: string;
  created_at: string;
}

export interface PlatformMetrics {
  total_workspaces: number;
  subscriptions_by_plan: {
    free_trial: number;
    starter: number;
    professional: number;
    enterprise: number;
  };
  active_subscriptions_count: number;
  total_demo_requests: number;
  recent_demo_requests: DemoRequest[];
  total_registered_users: number;
}

export interface PlatformWorkspaceSummary {
  id: string;
  name: string;
  industry: string;
  country: string;
  currency: string;
  timezone: string;
  created_at: string;
  owner_email?: string;
  employee_count: number;
  member_count: number;
  subscription: Subscription | null;
}

export type InvoiceStatus = 'paid' | 'open' | 'void' | 'uncollectible';

export interface Invoice {
  id: string;
  company_id: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  period_start: string;
  period_end: string;
  paid_at: string | null;
  description?: string;
  invoice_number?: string;
}

export interface PaymentMethod {
  id: string;
  company_id: string;
  provider_ref: string;
  last4: string;
  brand: string; // e.g. 'Visa', 'Mastercard', 'MTN Mobile Money', 'Telecel Cash', 'Vodafone Cash'
  is_default: boolean;
  created_at: string;
}

export interface BillingDetailsResponse {
  subscription: Subscription | null;
  employee_count: number;
  employee_limit: number;
  is_restricted: boolean;
  trial_days_remaining: number | null;
  payment_methods: PaymentMethod[];
  invoices: Invoice[];
}

// -------------------------------------------------------------
// Milestone 17 Data Models (Performance Management)
// -------------------------------------------------------------

export type PerformanceCycle = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'mid_year' | 'year_end';
export type ReviewStatus = 'draft' | 'finalized';
export type PDPStatus = 'not_started' | 'in_progress' | 'complete';

export interface PerformanceReview {
  id: string;
  employee_id: string;
  company_id: string;
  cycle: PerformanceCycle;
  rating: number; // e.g. 1 to 5
  comments: string;
  reviewed_by: string;
  status: ReviewStatus;
  bsc_completed?: boolean;
  bsc_document_url?: string;
  bsc_score?: number;
  created_at: string;
  finalized_at?: string;
  finalized_by?: string;
}

export interface PDPGoal {
  id: string;
  employee_id: string;
  company_id: string;
  goal: string;
  target_date: string;
  status: PDPStatus;
  created_at: string;
}

export interface PerformanceDataResponse {
  reviews: PerformanceReview[];
  pdp_goals: PDPGoal[];
}

// -------------------------------------------------------------
// Milestone 18 Data Models (Probation Management)
// -------------------------------------------------------------

export type ProbationOutcome = 'confirm' | 'extend' | 'terminate';

export interface ProbationRecord {
  id: string;
  employee_id: string;
  company_id: string;
  probation_period_months?: number;
  probation_start: string;
  probation_end: string;
  original_probation_end?: string | null;
  extension_months?: number | null;
  mid_review_date?: string | null;
  mid_reviewer?: string | null;
  mid_review_notes?: string | null;
  end_review_date?: string | null;
  end_reviewer?: string | null;
  outcome?: ProbationOutcome | null;
  confirmation_date?: string | null;
  remarks?: string | null;
  created_at: string;
  // Computed properties
  days_remaining?: number;
}

// -------------------------------------------------------------
// Milestone 19 Data Models (Employee Conduct Tracker)
// -------------------------------------------------------------

export type ConductIncidentSeverity = 'low' | 'medium' | 'high';
export type ConductIncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export interface ConductIncident {
  id: string;
  company_id: string;
  date_reported: string; // YYYY-MM-DD
  reporter: string;
  witnesses: string;
  incident_type: string;
  severity: ConductIncidentSeverity;
  description: string;
  related_employee_id: string;
  department_id: string;
  status: ConductIncidentStatus;
  investigation_owner: string;
  action_taken?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ConductIncidentWithDetails extends ConductIncident {
  employee_name?: string;
  employee_job_title?: string;
  department_name?: string;
  created_by_email?: string;
}

export interface ConductAuditLog {
  id: string;
  company_id: string;
  incident_id: string;
  previous_status?: ConductIncidentStatus | null;
  new_status: ConductIncidentStatus;
  previous_action_taken?: string | null;
  new_action_taken?: string | null;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  notes?: string;
  timestamp: string;
}

// -------------------------------------------------------------
// Milestone 20 Data Models (Policy Acknowledgement)
// -------------------------------------------------------------

export type PolicyAcknowledgmentMethod = 'in_app' | 'email' | 'paper';

export interface Policy {
  id: string;
  company_id: string;
  name: string;
  version: string;
  issue_date: string; // YYYY-MM-DD
  document_id: string | null; // links to documents table
}

export interface PolicyAcknowledgement {
  id: string;
  policy_id: string;
  employee_id: string;
  acknowledged: boolean;
  acknowledgment_date: string | null; // YYYY-MM-DD
  acknowledgment_method: PolicyAcknowledgmentMethod | null;
  follow_up_required: boolean;
  created_at: string;
}

export interface PolicyWithDetails extends Policy {
  document_file_name?: string | null;
  document_file_ref?: string | null;
  total_employees: number;
  acknowledged_count: number;
  pending_count: number;
  follow_up_count: number;
  completion_rate: number;
}

export interface PolicyAcknowledgementWithDetails extends PolicyAcknowledgement {
  employee_name: string;
  department_id: string;
  department_name: string;
  job_title: string;
  country: string;
  work_email?: string;
  status: EmployeeStatus;
}

// -------------------------------------------------------------
// Milestone 21 Data Models (Engagement Survey)
// -------------------------------------------------------------

export type SurveyQuestionType = 'rating' | 'multiple_choice';

export interface EngagementSurvey {
  id: string;
  company_id: string;
  title: string;
  description?: string;
  target_department_id?: string | null;
  is_anonymous: boolean;
  opens_at: string;
  closes_at: string;
  created_by: string;
  created_at: string;
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: SurveyQuestionType;
  options?: string[] | null;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  respondent_employee_id?: string | null;
  submitted_at: string;
}

export interface SurveyAnswer {
  id: string;
  response_id: string;
  question_id: string;
  answer_value: string;
}

export interface EngagementSurveyWithMetrics extends EngagementSurvey {
  target_department_name?: string | null;
  question_count: number;
  response_count: number;
  target_audience_count: number;
  response_rate: number;
  status: 'active' | 'upcoming' | 'closed';
  created_by_name?: string;
}

export interface SurveyRatingStats {
  average_score: number;
  total_answers: number;
  distribution: { [rating: number]: number };
  percentages: { [rating: number]: number };
}

export interface SurveyChoiceTally {
  option: string;
  count: number;
  percentage: number;
}

export interface SurveyQuestionResult {
  question: SurveyQuestion;
  total_answers: number;
  rating_stats?: SurveyRatingStats;
  choice_tallies?: SurveyChoiceTally[];
}

export interface SurveyResultsResponse {
  survey: EngagementSurvey;
  target_department_name?: string | null;
  target_audience_count: number;
  total_responses: number;
  response_rate: number;
  status: 'active' | 'upcoming' | 'closed';
  question_results: SurveyQuestionResult[];
  recent_responses_count: number;
}

export interface PublicSurveyData {
  id: string;
  title: string;
  description?: string;
  company_name: string;
  target_department_name?: string | null;
  is_anonymous: boolean;
  opens_at: string;
  closes_at: string;
  isOpen: boolean;
  isUpcoming: boolean;
  isClosed: boolean;
  questions: Array<{
    id: string;
    question_text: string;
    question_type: SurveyQuestionType;
    options?: string[] | null;
  }>;
}

// -------------------------------------------------------------
// Milestone 22 Data Models (HR Policy Governance Lifecycle)
// -------------------------------------------------------------

export type GovernanceAuditStatus = 'pending' | 'completed' | 'overdue';

export interface GovernanceRecord {
  id: string;
  company_id: string;
  policy_name: string;
  related_policy_id: string | null;
  last_review_date: string; // YYYY-MM-DD
  next_review_due: string; // YYYY-MM-DD
  reviewed_by: string;
  approved_by: string;
  distributed: boolean; // Y/N
  audit_status: GovernanceAuditStatus;
  created_at: string;
}

export interface GovernanceRecordWithDetails extends GovernanceRecord {
  related_policy?: Policy | null;
  is_overdue: boolean;
  days_until_due: number;
}



