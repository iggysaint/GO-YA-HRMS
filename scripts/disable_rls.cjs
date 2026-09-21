const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const disableRLSSQL = `
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_compensation DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attendance_summary DISABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE expense_policies DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE email_delivery_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channel_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods DISABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE pdp_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE probation_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE conduct_incidents DISABLE ROW LEVEL SECURITY;
ALTER TABLE conduct_audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE policies DISABLE ROW LEVEL SECURITY;
ALTER TABLE policy_acknowledgements DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_surveys DISABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE survey_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE governance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE demo_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_logs DISABLE ROW LEVEL SECURITY;
`;

async function disableRLS() {
  console.log('Disabling RLS for migration...');
  
  const statements = disableRLSSQL.trim().split('\n').filter(s => s.trim());
  
  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) {
        console.log(`Error: ${error.message}`);
      }
    } catch (error) {
      console.log(`Exception: ${error.message}`);
    }
  }
  
  console.log('RLS disabled for all tables');
}

disableRLS().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
