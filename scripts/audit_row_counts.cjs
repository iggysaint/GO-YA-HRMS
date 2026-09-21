const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function queryTable(tableName) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*`, {
    method: 'GET',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'count=exact'
    }
  });
  
  const count = response.headers.get('content-range') || '0-0/0';
  const total = count.split('/')[1] || '0';
  
  return {
    count: parseInt(total),
    status: response.status
  };
}

async function auditDatabase() {
  console.log('='.repeat(80));
  console.log('PHASE 2B FAILURE AUDIT - DATABASE STATE');
  console.log('='.repeat(80));
  console.log();

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

  console.log('TABLE ROW COUNTS:');
  for (const table of tables) {
    try {
      const result = await queryTable(table);
      console.log(`  ${table.padEnd(40)}: ${result.count} rows`);
    } catch (error) {
      console.log(`  ${table.padEnd(40)}: ERROR - ${error.message}`);
    }
  }
  console.log();

  console.log('='.repeat(80));
}

auditDatabase().catch(err => {
  console.error(err);
  process.exit(1);
});
