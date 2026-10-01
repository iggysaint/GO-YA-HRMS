const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EXPECTED_PROJECT_ID = 'srzbstrmiwggjvtzeifs';

// Security checks
if (!SUPABASE_URL) {
  console.error('ERROR: SUPABASE_URL environment variable is not set');
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  process.exit(1);
}

if (!SUPABASE_URL.includes(EXPECTED_PROJECT_ID)) {
  console.error('ERROR: Target project does not match expected DEV project');
  console.error(`Expected: ${EXPECTED_PROJECT_ID}`);
  console.error(`Current: ${SUPABASE_URL}`);
  process.exit(1);
}

const dbPath = path.join(__dirname, '..', '.db_state.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

console.log('='.repeat(80));
console.log('GO-YA HRMS Phase 2B: Data Migration to Supabase DEV');
console.log('='.repeat(80));
console.log(`Target Project: ${EXPECTED_PROJECT_ID}`);
console.log(`Start Time: ${new Date().toISOString()}`);
console.log();
console.log('Method: Generate SQL migration file');
console.log('RLS Status: ENABLED (will be temporarily disabled in migration)');
console.log();

// ID Mapping
function legacyIdToUUID(legacyId) {
  const hash = crypto.createHash('sha256').update(legacyId).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32)
  ].join('-');
}

const idMapping = {};
Object.keys(db).forEach(key => {
  if (Array.isArray(db[key])) {
    db[key].forEach(record => {
      if (record.id) {
        idMapping[record.id] = legacyIdToUUID(record.id);
      }
    });
  }
});

console.log(`ID Mapping Generated: ${Object.keys(idMapping).length} IDs mapped`);
console.log();

// Helper to escape SQL values
function escapeSQL(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  return 'NULL';
}

// Helper to build INSERT statement
function buildInsert(tableName, record, columns) {
  const values = columns.map(col => escapeSQL(record[col]));
  const columnsStr = columns.join(', ');
  const valuesStr = values.join(', ');
  return `INSERT INTO ${tableName} (${columnsStr}) VALUES (${valuesStr}) ON CONFLICT DO NOTHING;`;
}

// Migration state
const migrationState = {
  startTime: new Date().toISOString(),
  phases: {},
  totalRecords: 0,
  migratedRecords: 0,
  failedRecords: 0,
  errors: [],
  authUsers: [],
  storageUploads: []
};

// Migration order with SQL columns
const migrationOrder = [
  { table: 'organizations', data: db.organizations, columns: ['id', 'legacy_id', 'name', 'industry', 'country', 'currency', 'timezone', 'leave_escalation_threshold_days', 'created_at', 'updated_at'] },
  { table: 'user_profiles', data: db.users, columns: ['id', 'legacy_id', 'email', 'email_verified', 'created_at', 'updated_at'] },
  { table: 'organization_members', data: db.organization_members, columns: ['user_id', 'organization_id', 'role', 'created_at', 'legacy_id'] },
  { table: 'departments', data: db.departments, columns: ['id', 'legacy_id', 'company_id', 'name', 'created_at', 'updated_at'] },
  { table: 'employees', data: db.employees, columns: ['id', 'legacy_id', 'company_id', 'name', 'department_id', 'job_title', 'employment_type', 'country', 'start_date', 'status', 'attrition_risk', 'manager_id', 'created_at', 'updated_at'] },
  { table: 'employee_compensation', data: db.employee_compensation, columns: ['id', 'legacy_id', 'employee_id', 'salary', 'currency', 'effective_date', 'allowances', 'bonus', 'statutory_data', 'notes', 'created_at'] },
  { table: 'job_history', data: db.job_history, columns: ['id', 'legacy_id', 'employee_id', 'company_id', 'previous_department_id', 'new_department_id', 'previous_job_title', 'new_job_title', 'previous_manager_id', 'new_manager_id', 'reason', 'effective_date', 'changed_by', 'created_at'] },
  { table: 'leave_types', data: db.leave_types, columns: ['id', 'legacy_id', 'company_id', 'name', 'default_entitlement_days', 'description', 'paid', 'created_at'] },
  { table: 'leave_balances', data: db.leave_balances, columns: ['id', 'legacy_id', 'employee_id', 'company_id', 'leave_type_id', 'balance_days', 'used_days', 'allocated_days', 'created_at', 'updated_at'] },
  { table: 'leave_requests', data: db.leave_requests, columns: ['id', 'legacy_id', 'employee_id', 'company_id', 'leave_type_id', 'start_date', 'end_date', 'days_requested', 'status', 'reason', 'approved_by', 'approved_at', 'decision_notes', 'escalated_to_head', 'submitted_by', 'created_at', 'updated_at'] },
  { table: 'leave_audit_logs', data: db.leave_audit_logs, columns: ['id', 'legacy_id', 'company_id', 'employee_id', 'employee_name', 'leave_request_id', 'leave_type_id', 'leave_type_name', 'action', 'days_changed', 'previous_balance', 'new_balance', 'performed_by', 'timestamp', 'notes'] },
  { table: 'attendance_records', data: db.attendance_records, columns: ['id', 'legacy_id', 'employee_id', 'company_id', 'date', 'status', 'notes', 'created_at', 'updated_at'] },
  { table: 'daily_attendance_summary', data: db.daily_attendance_summary, columns: ['company_id', 'date', 'present_count', 'late_count', 'absent_count', 'on_leave_count', 'not_logged_count', 'created_at', 'updated_at', 'legacy_id'] },
  { table: 'onboarding_tasks', data: db.onboarding_tasks, columns: ['id', 'legacy_id', 'employee_id', 'company_id', 'task', 'category', 'status', 'due_date', 'completed_at', 'completed_by', 'notes', 'created_at'] },
  { table: 'offboarding_tasks', data: db.offboarding_tasks, columns: ['id', 'legacy_id', 'employee_id', 'company_id', 'task', 'category', 'status', 'due_date', 'completed_at', 'completed_by', 'notes', 'created_at'] },
  { table: 'offboarding_records', data: db.offboarding_records, columns: ['id', 'legacy_id', 'employee_id', 'company_id', 'reason', 'last_working_day', 'exit_interview_notes', 'final_leave_balance_days', 'final_settlement_amount', 'currency', 'settlement_approved_by', 'settlement_approved_at', 'status', 'created_at', 'updated_at'] },
  { table: 'documents', data: db.documents, columns: ['id', 'legacy_id', 'company_id', 'employee_id', 'type', 'file_ref', 'file_name', 'file_size', 'expiry_date', 'uploaded_at', 'uploaded_by', 'notes', 'created_at', 'updated_at'] },
  { table: 'compliance_items', data: db.compliance_items, columns: ['id', 'legacy_id', 'company_id', 'category', 'related_employee_id', 'related_employee_name', 'title', 'deadline', 'status', 'notes', 'document_id', 'created_at', 'updated_at'] },
  { table: 'expense_categories', data: db.expense_categories, columns: ['id', 'legacy_id', 'company_id', 'name', 'created_at'] },
  { table: 'expenses', data: db.expenses, columns: ['id', 'legacy_id', 'company_id', 'category_id', 'related_employee_id', 'amount', 'currency', 'date', 'description', 'receipt_url', 'receipt_name', 'status', 'submitted_by', 'approved_by', 'approved_at', 'rejection_notes', 'created_at', 'updated_at'] },
  { table: 'tasks', data: db.tasks, columns: ['id', 'legacy_id', 'company_id', 'title', 'description', 'status', 'assignee_id', 'related_employee_id', 'due_date', 'priority', 'created_by', 'created_at', 'updated_at'] },
  { table: 'company_events', data: db.events, columns: ['id', 'legacy_id', 'company_id', 'title', 'description', 'start_datetime', 'end_datetime', 'location', 'event_type', 'visibility_scope', 'department_id', 'training_session_id', 'created_by', 'created_at', 'updated_at'] },
  { table: 'notifications', data: db.notifications, columns: ['id', 'legacy_id', 'company_id', 'user_id', 'type', 'title', 'message', 'link', 'read_at', 'created_at'] },
  { table: 'email_delivery_logs', data: db.email_logs, columns: ['id', 'legacy_id', 'company_id', 'user_id', 'recipient_email', 'subject', 'body', 'type', 'status', 'sent_at'] },
  { table: 'chat_channels', data: db.chat_channels, columns: ['id', 'legacy_id', 'company_id', 'name', 'is_group', 'created_by', 'created_at'] },
  { table: 'chat_channel_members', data: db.chat_channel_members, columns: ['channel_id', 'user_id', 'joined_at', 'legacy_id'] },
  { table: 'chat_messages', data: db.chat_messages, columns: ['id', 'legacy_id', 'channel_id', 'sender_id', 'content', 'created_at'] },
  { table: 'subscriptions', data: db.subscriptions, columns: ['id', 'legacy_id', 'company_id', 'plan', 'billing_cycle', 'employee_limit', 'status', 'trial_ends_at', 'current_period_end', 'created_at', 'updated_at'] },
  { table: 'invoices', data: db.invoices, columns: ['id', 'legacy_id', 'company_id', 'amount', 'currency', 'status', 'period_start', 'period_end', 'paid_at', 'description', 'invoice_number', 'created_at'] },
  { table: 'payment_methods', data: db.payment_methods, columns: ['id', 'legacy_id', 'company_id', 'provider_ref', 'last4', 'brand', 'is_default', 'created_at'] },
  { table: 'platform_admins', data: db.platform_admins, columns: ['id', 'legacy_id', 'user_id', 'created_at'] },
  { table: 'support_notes', data: db.support_notes, columns: ['id', 'legacy_id', 'company_id', 'note', 'author_email', 'created_at'] },
  { table: 'performance_reviews', data: db.performance_reviews, columns: ['id', 'legacy_id', 'employee_id', 'company_id', 'cycle', 'rating', 'comments', 'reviewed_by', 'status', 'bsc_completed', 'bsc_document_url', 'bsc_score', 'created_at', 'finalized_at', 'finalized_by'] },
  { table: 'pdp_goals', data: db.pdp_goals, columns: ['id', 'legacy_id', 'employee_id', 'company_id', 'goal', 'target_date', 'status', 'created_at', 'updated_at'] },
  { table: 'probation_records', data: db.probation_records, columns: ['id', 'legacy_id', 'employee_id', 'company_id', 'probation_period_months', 'probation_start', 'probation_end', 'original_probation_end', 'extension_months', 'mid_review_date', 'mid_reviewer', 'mid_review_notes', 'end_review_date', 'end_reviewer', 'outcome', 'confirmation_date', 'remarks', 'created_at', 'updated_at'] },
  { table: 'conduct_incidents', data: db.conduct_incidents, columns: ['id', 'legacy_id', 'company_id', 'date_reported', 'reporter', 'witnesses', 'incident_type', 'severity', 'description', 'related_employee_id', 'department_id', 'status', 'investigation_owner', 'action_taken', 'created_by', 'created_at', 'updated_at'] },
  { table: 'conduct_audit_logs', data: db.conduct_audit_logs, columns: ['id', 'legacy_id', 'company_id', 'incident_id', 'previous_status', 'new_status', 'previous_action_taken', 'new_action_taken', 'actor_id', 'actor_name', 'actor_role', 'notes', 'timestamp'] },
  { table: 'policies', data: db.policies, columns: ['id', 'legacy_id', 'company_id', 'name', 'version', 'issue_date', 'document_id', 'created_at', 'updated_at'] },
  { table: 'policy_acknowledgements', data: db.policy_acknowledgements, columns: ['id', 'legacy_id', 'policy_id', 'employee_id', 'acknowledged', 'acknowledgment_date', 'acknowledgment_method', 'follow_up_required', 'created_at', 'updated_at'] },
  { table: 'engagement_surveys', data: db.engagement_surveys, columns: ['id', 'legacy_id', 'company_id', 'title', 'description', 'target_department_id', 'is_anonymous', 'opens_at', 'closes_at', 'created_by', 'created_at', 'updated_at'] },
  { table: 'survey_questions', data: db.survey_questions, columns: ['id', 'legacy_id', 'survey_id', 'question_text', 'question_type', 'options', 'created_at'] },
  { table: 'survey_responses', data: db.survey_responses, columns: ['id', 'legacy_id', 'survey_id', 'respondent_employee_id', 'submitted_at'] },
  { table: 'survey_answers', data: db.survey_answers, columns: ['id', 'legacy_id', 'response_id', 'question_id', 'answer_value', 'created_at'] },
  { table: 'governance_records', data: db.governance_records, columns: ['id', 'legacy_id', 'company_id', 'policy_name', 'related_policy_id', 'last_review_date', 'next_review_due', 'reviewed_by', 'approved_by', 'distributed', 'audit_status', 'created_at', 'updated_at'] },
  { table: 'demo_requests', data: db.demo_requests, columns: ['id', 'legacy_id', 'name', 'email', 'company_name', 'team_size', 'message', 'created_at'] },
  { table: 'invites', data: db.invites, columns: ['id', 'legacy_id', 'token', 'organization_id', 'email', 'role', 'created_at', 'expires_at', 'status'] },
  { table: 'ai_chat_logs', data: db.ai_chat_logs, columns: ['id', 'legacy_id', 'company_id', 'user_id', 'role_at_time', 'question', 'answer', 'data_sources_used', 'created_at'] }
];

function runMigration() {
  console.log('Generating SQL migration file...');
  console.log();

  // Calculate total records
  migrationState.totalRecords = migrationOrder.reduce((sum, item) => sum + item.data.length, 0);
  console.log(`Total records to migrate: ${migrationState.totalRecords}`);
  console.log();

  // Generate SQL file
  const sqlStatements = [];
  
  sqlStatements.push('-- Phase 2B Data Migration');
  sqlStatements.push('-- Generated: ' + new Date().toISOString());
  sqlStatements.push('-- Target: ' + SUPABASE_URL);
  sqlStatements.push('--');
  sqlStatements.push('-- Step 1: Disable RLS temporarily for migration');
  sqlStatements.push('--');
  
  // Disable RLS for all tables
  const tables = migrationOrder.map(m => m.table);
  tables.forEach(table => {
    sqlStatements.push(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
  });
  
  sqlStatements.push('--');
  sqlStatements.push('-- Step 2: Migrate data');
  sqlStatements.push('--');
  
  // Migrate each table
  for (const phase of migrationOrder) {
    console.log(`Generating SQL for ${phase.table}...`);
    
    if (phase.data.length === 0) {
      sqlStatements.push(`-- ${phase.table}: No records to migrate`);
      sqlStatements.push('');
      continue;
    }

    // Transform records
    const transformedRecords = phase.data.map(record => {
      const transformed = { ...record };
      // Add legacy_id
      transformed.legacy_id = record.id;
      // Replace IDs with mapped UUIDs
      Object.keys(transformed).forEach(key => {
        if (transformed[key] && idMapping[transformed[key]]) {
          transformed[key] = idMapping[transformed[key]];
        }
      });
      return transformed;
    });

    // Build INSERT statements
    transformedRecords.forEach(record => {
      sqlStatements.push(buildInsert(phase.table, record, phase.columns));
    });
    
    migrationState.phases[phase.table] = {
      tableName: phase.table,
      total: phase.data.length,
      migrated: phase.data.length,
      failed: 0,
      errors: []
    };
    migrationState.migratedRecords += phase.data.length;
    
    console.log(`  ${phase.data.length} statements generated`);
  }

  // Handle expense_policies
  console.log('Generating SQL for expense_policies...');
  const policiesArray = Object.entries(db.expense_policies).map(([company_id, policy]) => ({
    company_id: idMapping[company_id],
    restrict_analyst_to_own_expenses: policy.restrict_analyst_to_own_expenses,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  
  policiesArray.forEach(policy => {
    sqlStatements.push(buildInsert('expense_policies', policy, ['company_id', 'restrict_analyst_to_own_expenses', 'created_at', 'updated_at']));
  });
  migrationState.migratedRecords += policiesArray.length;
  console.log(`  ${policiesArray.length} statements generated`);

  sqlStatements.push('--');
  sqlStatements.push('-- Step 3: Re-enable RLS');
  sqlStatements.push('--');
  
  // Re-enable RLS for all tables
  tables.forEach(table => {
    sqlStatements.push(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
  });

  // Write SQL file
  const SQL_FILE = path.join(__dirname, '..', 'supabase', 'migrations', '20241001_phase2b_data_migration.sql');
  fs.writeFileSync(SQL_FILE, sqlStatements.join('\n'));
  
  console.log();
  console.log(`SQL migration file generated: ${SQL_FILE}`);
  console.log(`Total statements: ${sqlStatements.length}`);
  console.log();

  // Complete migration state
  migrationState.endTime = new Date().toISOString();
  migrationState.duration = new Date(migrationState.endTime) - new Date(migrationState.startTime);

  // Save migration log
  const LOG_FILE = path.join(__dirname, '..', `migration_plan_${new Date().toISOString().replace(/[:.]/g, '').replace('T', '_')}.json`);
  fs.writeFileSync(LOG_FILE, JSON.stringify(migrationState, null, 2));
  console.log(`Migration plan saved to: ${LOG_FILE}`);
  console.log();

  // Print summary
  console.log('='.repeat(80));
  console.log('SQL GENERATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Records: ${migrationState.totalRecords}`);
  console.log(`SQL Statements Generated: ${sqlStatements.length}`);
  console.log(`SQL File: ${SQL_FILE}`);
  console.log('='.repeat(80));

  console.log();
  console.log('NEXT STEPS:');
  console.log('1. Review the generated SQL file');
  console.log('2. Apply migration: npx supabase db push');
  console.log('3. This will temporarily disable RLS, migrate data, then re-enable RLS');
  console.log('4. Auth users will need to be created separately via Supabase Dashboard');
}

try {
  runMigration();
  console.log();
  console.log('SQL generation completed.');
  process.exit(0);
} catch (error) {
  console.error('SQL generation failed:', error);
  process.exit(1);
}
