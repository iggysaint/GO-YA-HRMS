-- ============================================================================
-- GO-YA HRMS Initial Database Schema
-- ============================================================================
-- This migration creates the complete database schema for the GO-YA HRMS system.
-- The schema is designed for multi-tenant SaaS with strict row-level security.
-- 
-- ID MIGRATION STRATEGY:
-- - All new tables use UUID primary keys (Supabase default)
-- - Key tables include legacy_id columns to map old string IDs during migration
-- - Foreign key references will be updated during data migration phase
-- 
-- TENANT ISOLATION:
-- - All company-scoped tables have company_id references
-- - RLS policies ensure users can only access their organization's data
-- - Organization membership table controls multi-tenancy access
-- 
-- RBAC ROLES:
-- - hr_head: Full access including compensation, settlements, org settings
-- - hr_analyst: Standard HR operations, no compensation/settlement access
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE ORGANIZATION TABLES (No dependencies)
-- ============================================================================

-- Organizations: Top-level tenant entities
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration from old string IDs
  name TEXT NOT NULL,
  industry TEXT,
  country TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  timezone TEXT NOT NULL DEFAULT 'Africa/Accra (GMT+0)',
  leave_escalation_threshold_days INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles: Extension of Supabase Auth users
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization members: Multi-tenancy join table with roles
CREATE TABLE organization_members (
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('hr_head', 'hr_analyst')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, organization_id)
);

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS (Depend on organization_members)
-- ============================================================================

-- Function to get current user's role in an organization
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID, organization_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM organization_members 
  WHERE user_id = get_user_role.user_id 
  AND organization_id = get_user_role.organization_id
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to check if user is HR Head in an organization
CREATE OR REPLACE FUNCTION is_hr_head(user_id UUID, organization_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = is_hr_head.user_id 
    AND organization_id = is_hr_head.organization_id 
    AND role = 'hr_head'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to check if user is HR Analyst in an organization
CREATE OR REPLACE FUNCTION is_hr_analyst(user_id UUID, organization_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = is_hr_analyst.user_id 
    AND organization_id = is_hr_analyst.organization_id 
    AND role = 'hr_analyst'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to get user's accessible organizations
CREATE OR REPLACE FUNCTION get_user_organizations(user_id UUID)
RETURNS TABLE (organization_id UUID, role TEXT) AS $$
  SELECT organization_id, role FROM organization_members 
  WHERE user_id = get_user_organizations.user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to check if user has any access to an organization
CREATE OR REPLACE FUNCTION has_org_access(user_id UUID, organization_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = has_org_access.user_id 
    AND organization_id = has_org_access.organization_id
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================================
-- DEPARTMENT TABLES (Depend on organizations)
-- ============================================================================

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- EMPLOYEE TABLES (Depend on departments, organizations)
-- ============================================================================

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  job_title TEXT NOT NULL,
  employment_type TEXT NOT NULL CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern')),
  country TEXT NOT NULL,
  start_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'probation', 'on_leave', 'offboarded')),
  attrition_risk TEXT NOT NULL CHECK (attrition_risk IN ('low', 'medium', 'high')),
  manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INVITES TABLE (Depend on organizations)
-- ============================================================================

CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('hr_head', 'hr_analyst')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'expired'))
);

-- ============================================================================
-- COMPENSATION TABLES (Depend on employees)
-- ============================================================================

CREATE TABLE employee_compensation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  salary NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  effective_date DATE NOT NULL,
  allowances NUMERIC,
  bonus NUMERIC,
  statutory_data JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ONBOARDING TABLES (Depend on employees)
-- ============================================================================

CREATE TABLE onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('personal_info', 'emergency_contact', 'payroll_bank', 'statutory_info', 'document_upload', 'policy_acknowledgement')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- OFFBOARDING TABLES (Depend on employees)
-- ============================================================================

CREATE TABLE offboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('last_working_day', 'exit_interview', 'asset_return', 'access_revocation', 'final_settlement')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE offboarding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('resignation', 'termination', 'retirement', 'contract_expiry')),
  last_working_day DATE NOT NULL,
  exit_interview_notes TEXT,
  final_leave_balance_days INTEGER NOT NULL,
  final_settlement_amount NUMERIC,
  currency TEXT,
  settlement_approved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  settlement_approved_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'settled_and_closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ATTENDANCE TABLES (Depend on employees)
-- ============================================================================

CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'late', 'absent', 'on_leave', 'not_logged')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

CREATE TABLE daily_attendance_summary (
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  present_count INTEGER NOT NULL DEFAULT 0,
  absent_count INTEGER NOT NULL DEFAULT 0,
  on_leave_count INTEGER NOT NULL DEFAULT 0,
  late_count INTEGER NOT NULL DEFAULT 0,
  not_logged_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (company_id, date)
);

-- ============================================================================
-- LEAVE MANAGEMENT TABLES (Depend on employees)
-- ============================================================================

CREATE TABLE leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_entitlement_days INTEGER NOT NULL,
  description TEXT,
  paid BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  balance_days INTEGER NOT NULL,
  used_days INTEGER NOT NULL DEFAULT 0,
  allocated_days INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, leave_type_id)
);

CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  approved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  decision_notes TEXT,
  escalated_to_head BOOLEAN NOT NULL DEFAULT false,
  submitted_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leave_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT,
  leave_request_id UUID,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  leave_type_name TEXT,
  action TEXT NOT NULL CHECK (action IN ('deduction', 'allocation_adjustment', 'statutory_update', 'manual_override')),
  days_changed INTEGER NOT NULL,
  previous_balance INTEGER NOT NULL,
  new_balance INTEGER NOT NULL,
  performed_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Add foreign key constraint after leave_requests table exists
ALTER TABLE leave_audit_logs 
ADD CONSTRAINT leave_audit_logs_leave_request_id_fkey 
FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) ON DELETE SET NULL;

-- ============================================================================
-- DOCUMENTS TABLES (Depend on employees)
-- ============================================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('contract', 'id_card', 'certification', 'tax_form', 'other')),
  file_ref TEXT NOT NULL, -- Storage path or URL
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  expiry_date DATE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- COMPLIANCE TABLES (Depend on documents, employees)
-- ============================================================================

CREATE TABLE compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('statutory_tax', 'contracts_visas', 'certifications', 'workplace_safety', 'other')),
  related_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  related_employee_name TEXT,
  title TEXT NOT NULL,
  deadline DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('compliant', 'attention', 'non_compliant')),
  notes TEXT,
  document_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint after documents table exists
ALTER TABLE compliance_items 
ADD CONSTRAINT compliance_items_document_id_fkey 
FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;

-- ============================================================================
-- AI ASSISTANT TABLES (Depend on organizations, users)
-- ============================================================================

CREATE TABLE ai_chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role_at_time TEXT NOT NULL CHECK (role_at_time IN ('hr_head', 'hr_analyst')),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  data_sources_used TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TASK MANAGEMENT TABLES (Depend on employees, users)
-- ============================================================================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'in_review', 'complete')),
  assignee_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  related_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  due_date DATE,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- JOB HISTORY TABLES (Depend on employees, departments)
-- ============================================================================

CREATE TABLE job_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  previous_department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  new_department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  previous_job_title TEXT NOT NULL,
  new_job_title TEXT NOT NULL,
  previous_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  new_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('promotion', 'transfer', 'restructure', 'demotion')),
  effective_date DATE NOT NULL,
  changed_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- EXPENSE MANAGEMENT TABLES (Depend on organizations, employees)
-- ============================================================================

CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
  related_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  receipt_url TEXT,
  receipt_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expense_policies (
  company_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  restrict_analyst_to_own_expenses BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- EVENTS TABLES (Depend on organizations, departments)
-- ============================================================================

CREATE TABLE company_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('holiday', 'meeting', 'social', 'training')),
  visibility_scope TEXT NOT NULL CHECK (visibility_scope IN ('company', 'department')),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  training_session_id UUID, -- Reserved for future Milestone 10
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATIONS TABLES (Depend on organizations, users)
-- ============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('delivered')),
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CHAT SYSTEM TABLES (Depend on organizations, users)
-- ============================================================================

CREATE TABLE chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT,
  is_group BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_channel_members (
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DEMO REQUESTS TABLE (No auth required)
-- ============================================================================

CREATE TABLE demo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  team_size TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BILLING & SUBSCRIPTION TABLES (Depend on organizations)
-- ============================================================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('free_trial', 'starter', 'professional', 'enterprise')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  employee_limit INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled')),
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('paid', 'open', 'void', 'uncollectible')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  description TEXT,
  invoice_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider_ref TEXT NOT NULL,
  last4 TEXT NOT NULL,
  brand TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PLATFORM ADMIN TABLES (Depend on users)
-- ============================================================================

CREATE TABLE platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE support_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  author_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PERFORMANCE MANAGEMENT TABLES (Depend on employees)
-- ============================================================================

CREATE TABLE performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cycle TEXT NOT NULL CHECK (cycle IN ('Q1', 'Q2', 'Q3', 'Q4', 'mid_year', 'year_end')),
  rating NUMERIC NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comments TEXT NOT NULL,
  reviewed_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'finalized')),
  bsc_completed BOOLEAN,
  bsc_document_url TEXT,
  bsc_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finalized_at TIMESTAMPTZ,
  finalized_by TEXT
);

CREATE TABLE pdp_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  target_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'complete')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROBATION MANAGEMENT TABLES (Depend on employees)
-- ============================================================================

CREATE TABLE probation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  probation_period_months INTEGER,
  probation_start DATE NOT NULL,
  probation_end DATE NOT NULL,
  original_probation_end DATE,
  extension_months INTEGER,
  mid_review_date DATE,
  mid_reviewer TEXT,
  mid_review_notes TEXT,
  end_review_date DATE,
  end_reviewer TEXT,
  outcome TEXT CHECK (outcome IN ('confirm', 'extend', 'terminate')),
  confirmation_date DATE,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CONDUCT MANAGEMENT TABLES (Depend on employees, departments)
-- ============================================================================

CREATE TABLE conduct_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date_reported DATE NOT NULL,
  reporter TEXT NOT NULL,
  witnesses TEXT NOT NULL,
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  description TEXT NOT NULL,
  related_employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  investigation_owner TEXT NOT NULL,
  action_taken TEXT,
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conduct_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES conduct_incidents(id) ON DELETE CASCADE,
  previous_status TEXT CHECK (previous_status IN ('open', 'investigating', 'resolved', 'closed')),
  new_status TEXT NOT NULL CHECK (new_status IN ('open', 'investigating', 'resolved', 'closed')),
  previous_action_taken TEXT,
  new_action_taken TEXT,
  actor_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- POLICY MANAGEMENT TABLES (Depend on documents, employees)
-- ============================================================================

CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  issue_date DATE NOT NULL,
  document_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint after documents table exists
ALTER TABLE policies 
ADD CONSTRAINT policies_document_id_fkey 
FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;

CREATE TABLE policy_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledgment_date DATE,
  acknowledgment_method TEXT CHECK (acknowledgment_method IN ('in_app', 'email', 'paper')),
  follow_up_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(policy_id, employee_id)
);

-- ============================================================================
-- SURVEY MANAGEMENT TABLES (Depend on organizations, departments)
-- ============================================================================

CREATE TABLE engagement_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  survey_id UUID NOT NULL REFERENCES engagement_surveys(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('rating', 'multiple_choice')),
  options TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  survey_id UUID NOT NULL REFERENCES engagement_surveys(id) ON DELETE CASCADE,
  respondent_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE survey_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
  answer_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- GOVERNANCE MANAGEMENT TABLES (Depend on organizations, policies)
-- ============================================================================

CREATE TABLE governance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE, -- For migration
  company_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  policy_name TEXT NOT NULL,
  related_policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
  last_review_date DATE NOT NULL,
  next_review_due DATE NOT NULL,
  reviewed_by TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  distributed BOOLEAN NOT NULL DEFAULT false,
  audit_status TEXT NOT NULL CHECK (audit_status IN ('pending', 'completed', 'overdue')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Organization indexes
CREATE INDEX idx_organizations_created_at ON organizations(created_at);
CREATE INDEX idx_organizations_country ON organizations(country);

-- Department indexes
CREATE INDEX idx_departments_company_id ON departments(company_id);

-- Employee indexes
CREATE INDEX idx_employees_company_id ON employees(company_id);
CREATE INDEX idx_employees_department_id ON employees(department_id);
CREATE INDEX idx_employees_manager_id ON employees(manager_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_start_date ON employees(start_date);

-- Compensation indexes
CREATE INDEX idx_employee_compensation_employee_id ON employee_compensation(employee_id);
CREATE INDEX idx_employee_compensation_effective_date ON employee_compensation(effective_date);

-- Attendance indexes
CREATE INDEX idx_attendance_records_company_id ON attendance_records(company_id);
CREATE INDEX idx_attendance_records_employee_id ON attendance_records(employee_id);
CREATE INDEX idx_attendance_records_date ON attendance_records(date);
CREATE INDEX idx_attendance_records_status ON attendance_records(status);
CREATE INDEX idx_daily_attendance_summary_company_id ON daily_attendance_summary(company_id);
CREATE INDEX idx_daily_attendance_summary_date ON daily_attendance_summary(date);

-- Leave indexes
CREATE INDEX idx_leave_types_company_id ON leave_types(company_id);
CREATE INDEX idx_leave_balances_employee_id ON leave_balances(employee_id);
CREATE INDEX idx_leave_balances_company_id ON leave_balances(company_id);
CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_company_id ON leave_requests(company_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_leave_type_id ON leave_requests(leave_type_id);
CREATE INDEX idx_leave_audit_logs_employee_id ON leave_audit_logs(employee_id);
CREATE INDEX idx_leave_audit_logs_company_id ON leave_audit_logs(company_id);

-- Document indexes
CREATE INDEX idx_documents_company_id ON documents(company_id);
CREATE INDEX idx_documents_employee_id ON documents(employee_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_expiry_date ON documents(expiry_date);

-- Compliance indexes
CREATE INDEX idx_compliance_items_company_id ON compliance_items(company_id);
CREATE INDEX idx_compliance_items_employee_id ON compliance_items(related_employee_id);
CREATE INDEX idx_compliance_items_status ON compliance_items(status);
CREATE INDEX idx_compliance_items_deadline ON compliance_items(deadline);
CREATE INDEX idx_compliance_items_category ON compliance_items(category);

-- Task indexes
CREATE INDEX idx_tasks_company_id ON tasks(company_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- Expense indexes
CREATE INDEX idx_expenses_company_id ON expenses(company_id);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_employee_id ON expenses(related_employee_id);
CREATE INDEX idx_expenses_submitted_by ON expenses(submitted_by);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_date ON expenses(date);

-- Event indexes
CREATE INDEX idx_company_events_company_id ON company_events(company_id);
CREATE INDEX idx_company_events_department_id ON company_events(department_id);
CREATE INDEX idx_company_events_start_datetime ON company_events(start_datetime);
CREATE INDEX idx_company_events_event_type ON company_events(event_type);

-- Notification indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_company_id ON notifications(company_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Chat indexes
CREATE INDEX idx_chat_channels_company_id ON chat_channels(company_id);
CREATE INDEX idx_chat_messages_channel_id ON chat_messages(channel_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Performance indexes
CREATE INDEX idx_performance_reviews_employee_id ON performance_reviews(employee_id);
CREATE INDEX idx_performance_reviews_company_id ON performance_reviews(company_id);
CREATE INDEX idx_pdp_goals_employee_id ON pdp_goals(employee_id);

-- Conduct indexes
CREATE INDEX idx_conduct_incidents_company_id ON conduct_incidents(company_id);
CREATE INDEX idx_conduct_incidents_employee_id ON conduct_incidents(related_employee_id);
CREATE INDEX idx_conduct_incidents_status ON conduct_incidents(status);
CREATE INDEX idx_conduct_incidents_severity ON conduct_incidents(severity);

-- Policy indexes
CREATE INDEX idx_policies_company_id ON policies(company_id);
CREATE INDEX idx_policy_acknowledgements_employee_id ON policy_acknowledgements(employee_id);
CREATE INDEX idx_policy_acknowledgements_policy_id ON policy_acknowledgements(policy_id);

-- Survey indexes
CREATE INDEX idx_engagement_surveys_company_id ON engagement_surveys(company_id);
CREATE INDEX idx_survey_responses_survey_id ON survey_responses(survey_id);

-- Governance indexes
CREATE INDEX idx_governance_records_company_id ON governance_records(company_id);
CREATE INDEX idx_governance_records_audit_status ON governance_records(audit_status);
CREATE INDEX idx_governance_records_next_review_due ON governance_records(next_review_due);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_compensation ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attendance_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdp_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE probation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE conduct_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conduct_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_records ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICY DEFINITIONS
-- ============================================================================

-- Organizations: Only platform admins can manage (handled separately)
-- Regular users can only view organizations they belong to
CREATE POLICY "Users can view their organizations" 
ON organizations FOR SELECT 
USING (
  id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

-- Organization Members: Users can view their own memberships
CREATE POLICY "Users can view their own memberships" 
ON organization_members FOR SELECT 
USING (user_id = auth.uid());

-- Only service role can insert memberships (via API logic)
CREATE POLICY "Service role can insert memberships" 
ON organization_members FOR INSERT 
WITH CHECK (false);

-- Only service role can update/delete memberships (via API logic)
CREATE POLICY "Service role can update memberships" 
ON organization_members FOR UPDATE 
WITH CHECK (false);

CREATE POLICY "Service role can delete memberships" 
ON organization_members FOR DELETE 
USING (false);

-- Departments: Users can view departments in their organizations
CREATE POLICY "Users can view company departments" 
ON departments FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

-- HR Head can manage departments
CREATE POLICY "HR Head can insert departments" 
ON departments FOR INSERT 
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

CREATE POLICY "HR Head can update departments" 
ON departments FOR UPDATE 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

CREATE POLICY "HR Head can delete departments" 
ON departments FOR DELETE 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

-- Employees: Users can view employees in their organizations
CREATE POLICY "Users can view company employees" 
ON employees FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

-- HR Head can manage employees
CREATE POLICY "HR Head can insert employees" 
ON employees FOR INSERT 
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

CREATE POLICY "HR Head can update employees" 
ON employees FOR UPDATE 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

CREATE POLICY "HR Head can delete employees" 
ON employees FOR DELETE 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

-- Employee Compensation: Only HR Head can view
CREATE POLICY "HR Head can view compensation" 
ON employee_compensation FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM employees e
    JOIN organization_members om ON e.company_id = om.organization_id
    WHERE e.id = employee_compensation.employee_id
    AND om.user_id = auth.uid()
    AND om.role = 'hr_head'
  )
);

CREATE POLICY "HR Head can insert compensation" 
ON employee_compensation FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    JOIN organization_members om ON e.company_id = om.organization_id
    WHERE e.id = employee_compensation.employee_id
    AND om.user_id = auth.uid()
    AND om.role = 'hr_head'
  )
);

CREATE POLICY "HR Head can update compensation" 
ON employee_compensation FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM employees e
    JOIN organization_members om ON e.company_id = om.organization_id
    WHERE e.id = employee_compensation.employee_id
    AND om.user_id = auth.uid()
    AND om.role = 'hr_head'
  )
);

CREATE POLICY "HR Head can delete compensation" 
ON employee_compensation FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM employees e
    JOIN organization_members om ON e.company_id = om.organization_id
    WHERE e.id = employee_compensation.employee_id
    AND om.user_id = auth.uid()
    AND om.role = 'hr_head'
  )
);

-- Invites: HR Head can manage invites for their organization
CREATE POLICY "HR Head can view invites" 
ON invites FOR SELECT 
USING (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

CREATE POLICY "HR Head can insert invites" 
ON invites FOR INSERT 
WITH CHECK (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

CREATE POLICY "HR Head can update invites" 
ON invites FOR UPDATE 
USING (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

-- Onboarding Tasks: Users can view tasks for their company's employees
CREATE POLICY "Users can view company onboarding tasks" 
ON onboarding_tasks FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY "HR roles can manage onboarding tasks" 
ON onboarding_tasks FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

-- Offboarding Tasks: Similar to onboarding
CREATE POLICY "Users can view company offboarding tasks" 
ON offboarding_tasks FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY "HR roles can manage offboarding tasks" 
ON offboarding_tasks FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

-- Offboarding Records: HR Head can approve settlements
CREATE POLICY "Users can view company offboarding records" 
ON offboarding_records FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY "HR Head can manage offboarding records" 
ON offboarding_records FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

-- Attendance Records: HR roles can manage
CREATE POLICY "Users can view company attendance" 
ON attendance_records FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY "HR roles can manage attendance" 
ON attendance_records FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

-- Daily Attendance Summary: Computed field, HR roles can manage
CREATE POLICY "HR roles can manage attendance summary" 
ON daily_attendance_summary FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

-- Leave Types: HR Head can configure
CREATE POLICY "Users can view company leave types" 
ON leave_types FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY "HR Head can manage leave types" 
ON leave_types FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

-- Leave Balances: Users can view their own or company-wide (HR roles)
CREATE POLICY "Users can view own leave balances" 
ON leave_balances FOR SELECT 
USING (
  employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()))
);

CREATE POLICY "HR roles can view all company leave balances" 
ON leave_balances FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY "HR Head can adjust leave balances" 
ON leave_balances FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

-- Leave Requests: Users can view company requests
CREATE POLICY "Users can view company leave requests" 
ON leave_requests FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY "Users can submit leave requests" 
ON leave_requests FOR INSERT 
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  AND employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()))
);

CREATE POLICY "HR roles can approve/reject leave requests" 
ON leave_requests FOR UPDATE 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

-- Leave Audit Logs: HR Head can view all
CREATE POLICY "HR Head can view leave audit logs" 
ON leave_audit_logs FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

CREATE POLICY "System can insert audit logs" 
ON leave_audit_logs FOR INSERT 
WITH CHECK (true); -- Only service role should insert

CREATE POLICY "Service role can update audit logs" 
ON leave_audit_logs FOR UPDATE 
WITH CHECK (false);

CREATE POLICY "Service role can delete audit logs" 
ON leave_audit_logs FOR DELETE 
USING (false);

-- Documents: Users can view company documents
CREATE POLICY "Users can view company documents" 
ON documents FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY "HR roles can manage documents" 
ON documents FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

-- Compliance Items: Users can view company compliance
CREATE POLICY "Users can view company compliance" 
ON compliance_items FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY "HR Head can manage compliance items" 
ON compliance_items FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

-- AI Chat Logs: Users can view their own logs
CREATE POLICY "Users can view own AI chat logs" 
ON ai_chat_logs FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own AI chat logs" 
ON ai_chat_logs FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Tasks: HR Head sees all, HR Analyst sees assigned/created
CREATE POLICY "HR Head can view all company tasks" 
ON tasks FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

CREATE POLICY "HR Analyst can view assigned or created tasks" 
ON tasks FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  AND (assignee_id = auth.uid() OR created_by = auth.uid())
);

CREATE POLICY "HR Head can manage all tasks" 
ON tasks FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

CREATE POLICY "Users can create tasks" 
ON tasks FOR INSERT 
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  AND created_by = auth.uid()
);

-- Job History: Users can view company job history
CREATE POLICY "Users can view company job history" 
ON job_history FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY "HR Head can manage job history" 
ON job_history FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

-- Expense Categories: Users can view company categories
CREATE POLICY "Users can view company expense categories" 
ON expense_categories FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY "HR Head can manage expense categories" 
ON expense_categories FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

-- Expenses: Respect analyst restriction policy
CREATE POLICY "HR Head can view all company expenses" 
ON expenses FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

CREATE POLICY "HR Analyst can view expenses based on policy" 
ON expenses FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  AND (
    -- If restriction is enabled, only own expenses
    EXISTS (
      SELECT 1 FROM expense_policies ep
      WHERE ep.company_id = expenses.company_id
      AND ep.restrict_analyst_to_own_expenses = false
    )
    OR submitted_by = auth.uid()
  )
);

CREATE POLICY "HR Head can manage all expenses" 
ON expenses FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

CREATE POLICY "Users can submit expenses" 
ON expenses FOR INSERT 
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  AND submitted_by = auth.uid()
);

-- Expense Policies: HR Head can manage
CREATE POLICY "HR Head can manage expense policies" 
ON expense_policies FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

-- Company Events: Users can view company events
CREATE POLICY "Users can view company events" 
ON company_events FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY "HR roles can manage company events" 
ON company_events FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

-- Notifications: Users can view their own notifications
CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" 
ON notifications FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update own notifications" 
ON notifications FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications" 
ON notifications FOR DELETE 
USING (user_id = auth.uid());

-- Email Logs: HR Head can view company email logs
CREATE POLICY "HR Head can view company email logs" 
ON email_delivery_logs FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

CREATE POLICY "System can insert email logs" 
ON email_delivery_logs FOR INSERT 
WITH CHECK (true);

-- Chat Channels: Users can view company channels
CREATE POLICY "Users can view company chat channels" 
ON chat_channels FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  AND (
    is_group = true
    OR id IN (SELECT channel_id FROM chat_channel_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can create chat channels" 
ON chat_channels FOR INSERT 
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  AND created_by = auth.uid()
);

-- Chat Channel Members: Users can view memberships for channels they're in
CREATE POLICY "Users can view channel memberships" 
ON chat_channel_members FOR SELECT 
USING (
  channel_id IN (SELECT id FROM chat_channels WHERE company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()))
  AND (
    channel_id IN (SELECT channel_id FROM chat_channel_members WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM chat_channels cc
      WHERE cc.id = chat_channel_members.channel_id
      AND cc.is_group = true
      AND cc.company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can join channels" 
ON chat_channel_members FOR INSERT 
WITH CHECK (
  user_id = auth.uid()
  AND channel_id IN (SELECT id FROM chat_channels WHERE company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()))
);

-- Chat Messages: Users can view messages in channels they're members of
CREATE POLICY "Users can view channel messages" 
ON chat_messages FOR SELECT 
USING (
  channel_id IN (SELECT channel_id FROM chat_channel_members WHERE user_id = auth.uid())
);

CREATE POLICY "Users can send messages" 
ON chat_messages FOR INSERT 
WITH CHECK (
  sender_id = auth.uid()
  AND channel_id IN (SELECT channel_id FROM chat_channel_members WHERE user_id = auth.uid())
);

-- Subscriptions: Users can view their organization's subscription
CREATE POLICY "Users can view company subscription" 
ON subscriptions FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

-- Invoices: Users can view company invoices
CREATE POLICY "Users can view company invoices" 
ON invoices FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

-- Payment Methods: HR Head can manage
CREATE POLICY "HR Head can manage payment methods" 
ON payment_methods FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

-- Platform Admins: Only service role can manage
CREATE POLICY "Service role can manage platform admins" 
ON platform_admins FOR ALL 
WITH CHECK (false);

-- Support Notes: Platform admin can view
CREATE POLICY "Platform admin can view support notes" 
ON support_notes FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
);

-- Performance Reviews: HR Head can view all, users can view own
CREATE POLICY "HR Head can view all performance reviews" 
ON performance_reviews FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

CREATE POLICY "Users can view own performance reviews" 
ON performance_reviews FOR SELECT 
USING (
  employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()))
);

CREATE POLICY "HR Head can manage performance reviews" 
ON performance_reviews FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

-- PDP Goals: Similar to performance reviews
CREATE POLICY "HR Head can view all PDP goals" 
ON pdp_goals FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

CREATE POLICY "Users can view own PDP goals" 
ON pdp_goals FOR SELECT 
USING (
  employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()))
);

CREATE POLICY "HR Head can manage PDP goals" 
ON pdp_goals FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

-- Probation Records: HR Head can view all
CREATE POLICY "HR Head can view all probation records" 
ON probation_records FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

CREATE POLICY "HR Head can manage probation records" 
ON probation_records FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

-- Conduct Incidents: HR Head can view all
CREATE POLICY "HR Head can view all conduct incidents" 
ON conduct_incidents FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

CREATE POLICY "HR Head can manage conduct incidents" 
ON conduct_incidents FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

-- Conduct Audit Logs: HR Head can view
CREATE POLICY "HR Head can view conduct audit logs" 
ON conduct_audit_logs FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

CREATE POLICY "System can insert conduct audit logs" 
ON conduct_audit_logs FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can update conduct audit logs" 
ON conduct_audit_logs FOR UPDATE 
WITH CHECK (false);

CREATE POLICY "Service role can delete conduct audit logs" 
ON conduct_audit_logs FOR DELETE 
USING (false);

-- Policies: HR Head can manage
CREATE POLICY "Users can view company policies" 
ON policies FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY "HR Head can manage policies" 
ON policies FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

-- Policy Acknowledgements: Users can view own, HR Head can manage
CREATE POLICY "Users can view own policy acknowledgements" 
ON policy_acknowledgements FOR SELECT 
USING (
  employee_id IN (SELECT id FROM employees WHERE company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()))
);

CREATE POLICY "HR Head can manage policy acknowledgements" 
ON policy_acknowledgements FOR ALL 
USING (
  policy_id IN (SELECT id FROM policies WHERE company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head'))
)
WITH CHECK (
  policy_id IN (SELECT id FROM policies WHERE company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head'))
);

-- Engagement Surveys: HR Head can manage
CREATE POLICY "Users can view company surveys" 
ON engagement_surveys FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY "HR Head can manage surveys" 
ON engagement_surveys FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

-- Survey Questions: Read-only for survey viewers
CREATE POLICY "Users can view survey questions" 
ON survey_questions FOR SELECT 
USING (
  survey_id IN (SELECT id FROM engagement_surveys WHERE company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()))
);

-- Survey Responses: HR Head can view
CREATE POLICY "HR Head can view survey responses" 
ON survey_responses FOR SELECT 
USING (
  survey_id IN (SELECT id FROM engagement_surveys WHERE company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head'))
);

CREATE POLICY "Users can submit survey responses" 
ON survey_responses FOR INSERT 
WITH CHECK (
  survey_id IN (SELECT id FROM engagement_surveys WHERE company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()))
);

-- Survey Answers: Read-only for survey viewers
CREATE POLICY "Users can view survey answers" 
ON survey_answers FOR SELECT 
USING (
  response_id IN (SELECT id FROM survey_responses WHERE survey_id IN (SELECT id FROM engagement_surveys WHERE company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')))
);

-- Governance Records: HR Head can manage
CREATE POLICY "Users can view company governance records" 
ON governance_records FOR SELECT 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY "HR Head can manage governance records" 
ON governance_records FOR ALL 
USING (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
)
WITH CHECK (
  company_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'hr_head')
);

-- Demo Requests: Public access (no auth required)
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert demo requests" 
ON demo_requests FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Platform admin can view demo requests" 
ON demo_requests FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
);

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('documents', 'documents', false),
  ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE RLS POLICIES
-- ============================================================================

-- Documents bucket RLS
-- Documents are stored in format: company_id/filename
CREATE POLICY "Users can view company documents" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'documents'
  AND (
    -- Public documents (no restrictions)
    -- OR user belongs to the company based on folder structure
    (storage.foldername(name))[1] IN (
      SELECT om.organization_id::text 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  )
);

CREATE POLICY "HR roles can upload company documents" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'documents'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT om.organization_id::text 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  )
  AND owner = auth.uid()
);

CREATE POLICY "Users can delete their own documents" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'documents'
  AND owner = auth.uid()
);

-- Receipts bucket RLS
-- Receipts are stored in format: company_id/filename
CREATE POLICY "Users can view company receipts" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'receipts'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT om.organization_id::text 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  )
);

CREATE POLICY "HR roles can upload company receipts" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'receipts'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT om.organization_id::text 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  )
  AND owner = auth.uid()
);

-- ============================================================================
-- REALTIME CONFIGURATION
-- ============================================================================

-- Enable realtime for key tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE organizations;
ALTER PUBLICATION supabase_realtime ADD TABLE departments;
ALTER PUBLICATION supabase_realtime ADD TABLE employees;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE leave_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE company_events;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to tables that have it
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_attendance_summary_updated_at BEFORE UPDATE ON daily_attendance_summary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_items_updated_at BEFORE UPDATE ON compliance_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_events_updated_at BEFORE UPDATE ON company_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_policy_acknowledgements_updated_at BEFORE UPDATE ON policy_acknowledgements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_engagement_surveys_updated_at BEFORE UPDATE ON engagement_surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pdp_goals_updated_at BEFORE UPDATE ON pdp_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_probation_records_updated_at BEFORE UPDATE ON probation_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conduct_incidents_updated_at BEFORE UPDATE ON conduct_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_governance_records_updated_at BEFORE UPDATE ON governance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_policies_updated_at BEFORE UPDATE ON expense_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGER FOR DAILY ATTENDANCE SUMMARY
-- ============================================================================

-- Function to refresh daily attendance summary
CREATE OR REPLACE FUNCTION refresh_daily_attendance_summary()
RETURNS TRIGGER AS $$
DECLARE
  v_present_count INTEGER;
  v_late_count INTEGER;
  v_absent_count INTEGER;
  v_on_leave_count INTEGER;
  v_not_logged_count INTEGER;
BEGIN
  -- Count attendance statuses for the date
  SELECT 
    COUNT(*) FILTER (WHERE status = 'present'),
    COUNT(*) FILTER (WHERE status = 'late'),
    COUNT(*) FILTER (WHERE status = 'absent'),
    COUNT(*) FILTER (WHERE status = 'on_leave'),
    COUNT(*) FILTER (WHERE status = 'not_logged')
  INTO v_present_count, v_late_count, v_absent_count, v_on_leave_count, v_not_logged_count
  FROM attendance_records
  WHERE company_id = NEW.company_id AND date = NEW.date;
  
  -- Insert or update the summary
  INSERT INTO daily_attendance_summary (company_id, date, present_count, late_count, absent_count, on_leave_count, not_logged_count)
  VALUES (NEW.company_id, NEW.date, v_present_count, v_late_count, v_absent_count, v_on_leave_count, v_not_logged_count)
  ON CONFLICT (company_id, date) DO UPDATE SET
    present_count = EXCLUDED.present_count,
    late_count = EXCLUDED.late_count,
    absent_count = EXCLUDED.absent_count,
    on_leave_count = EXCLUDED.on_leave_count,
    not_logged_count = EXCLUDED.not_logged_count,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh summary after attendance record insert/update
CREATE TRIGGER trigger_refresh_attendance_summary
AFTER INSERT OR UPDATE ON attendance_records
FOR EACH ROW EXECUTE FUNCTION refresh_daily_attendance_summary();

-- ============================================================================
-- COMPLETED MIGRATION
-- ============================================================================
