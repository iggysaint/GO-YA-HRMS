const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use the REST API to execute SQL
async function executeSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ sql })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL execution failed: ${error}`);
  }
  
  return response.json();
}

// SQL to disable RLS
const disableRLSSQL = `
DO $$
BEGIN
  EXECUTE 'ALTER TABLE organizations DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE departments DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE employees DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE employee_compensation DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE job_history DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE leave_types DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE leave_balances DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE leave_audit_logs DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE daily_attendance_summary DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE onboarding_tasks DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE offboarding_tasks DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE offboarding_records DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE documents DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE compliance_items DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE expense_categories DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE expenses DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE expense_policies DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE tasks DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE company_events DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE notifications DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE email_delivery_logs DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE chat_channels DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE chat_channel_members DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE invoices DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE payment_methods DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE platform_admins DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE support_notes DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE performance_reviews DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE pdp_goals DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE probation_records DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE conduct_incidents DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE conduct_audit_logs DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE policies DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE policy_acknowledgements DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE engagement_surveys DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE survey_questions DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE survey_responses DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE survey_answers DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE governance_records DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE demo_requests DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE invites DISABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE ai_chat_logs DISABLE ROW LEVEL SECURITY';
END $$;
`;

async function disableRLS() {
  console.log('Disabling RLS for migration...');
  
  try {
    await executeSQL(disableRLSSQL);
    console.log('✓ RLS disabled for all tables');
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
    console.log('Trying individual statements...');
    
    const tables = [
      'organizations', 'user_profiles', 'organization_members', 'departments', 'employees',
      'employee_compensation', 'job_history', 'leave_types', 'leave_balances', 'leave_requests',
      'leave_audit_logs', 'attendance_records', 'daily_attendance_summary', 'onboarding_tasks',
      'offboarding_tasks', 'offboarding_records', 'documents', 'compliance_items',
      'expense_categories', 'expenses', 'expense_policies', 'tasks', 'company_events',
      'notifications', 'email_delivery_logs', 'chat_channels', 'chat_channel_members',
      'chat_messages', 'subscriptions', 'invoices', 'payment_methods', 'platform_admins',
      'support_notes', 'performance_reviews', 'pdp_goals', 'probation_records',
      'conduct_incidents', 'conduct_audit_logs', 'policies', 'policy_acknowledgements',
      'engagement_surveys', 'survey_questions', 'survey_responses', 'survey_answers',
      'governance_records', 'demo_requests', 'invites', 'ai_chat_logs'
    ];
    
    for (const table of tables) {
      try {
        await executeSQL(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
        console.log(`✓ ${table}`);
      } catch (error) {
        console.log(`✗ ${table}: ${error.message}`);
      }
    }
  }
}

disableRLS().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
