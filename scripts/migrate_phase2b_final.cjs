const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
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
console.log('Method: Supabase Client with Service Role + SQL RPC');
console.log('RLS Status: ENABLED (bypassed via SQL RPC with SECURITY DEFINER)');
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

// Supabase client with service role
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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

// SQL-based migration via Supabase Client RPC
async function migrateTableSQL(tableName, records, columns) {
  const tableState = {
    tableName,
    total: records.length,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  console.log(`Migrating ${tableName}...`);

  try {
    if (records.length === 0) {
      console.log(`  No records to migrate`);
      return tableState;
    }

    // Transform records
    const transformedRecords = records.map(record => {
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

    // Build batch SQL
    const batchSize = 50;
    for (let i = 0; i < transformedRecords.length; i += batchSize) {
      const batch = transformedRecords.slice(i, i + batchSize);
      const sqlStatements = batch.map(record => buildInsert(tableName, record, columns)).join(';\n');
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: sqlStatements });
        
        if (error) {
          tableState.errors.push(error.message);
          tableState.failed += batch.length;
        } else {
          tableState.migrated += batch.length;
        }
      } catch (error) {
        tableState.errors.push(error.message);
        tableState.failed += batch.length;
      }
    }

    console.log(`  Result: ${tableState.migrated} migrated, ${tableState.failed} failed`);

  } catch (error) {
    console.log(`  Exception: ${error.message}`);
    tableState.errors.push(error.message);
    tableState.failed = records.length;
  }

  return tableState;
}

// Create Auth users via Supabase Auth Admin API
async function createAuthUsers() {
  console.log('Creating Supabase Auth users...');
  console.log();

  const users = db.users; // 2 users
  const authUserIds = {};

  for (const user of users) {
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          email: user.email,
          email_confirm: true,
          user_metadata: {
            full_name: user.email.split('@')[0]
          },
          app_metadata: {
            provider: 'email',
            legacy_id: user.id
          }
        })
      });

      if (response.ok) {
        const authUser = await response.json();
        authUserIds[user.id] = authUser.id;
        migrationState.authUsers.push({
          email: user.email,
          authId: authUser.id,
          legacyId: user.id
        });
        console.log(`  ✓ Created Auth user: ${user.email} -> ${authUser.id}`);
      } else {
        const error = await response.text();
        console.log(`  ✗ Failed to create user ${user.email}: ${error}`);
        migrationState.errors.push(`Auth user creation failed for ${user.email}: ${error}`);
      }
    } catch (error) {
      console.log(`  ✗ Exception for ${user.email}: ${error.message}`);
      migrationState.errors.push(`Auth user creation exception for ${user.email}: ${error.message}`);
    }
  }

  console.log();
  return authUserIds;
}

// First, need to recreate exec_sql function temporarily for migration
async function createExecSQLFunction() {
  console.log('Creating temporary exec_sql function for migration...');
  
  const createFunctionSQL = `
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
`;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: createFunctionSQL });
    
    if (error) {
      console.log('✗ Failed to create exec_sql function');
      console.log(`Error: ${error.message}`);
    } else {
      console.log('✓ exec_sql function created');
    }
  } catch (error) {
    console.log(`Exception: ${error.message}`);
  }
  console.log();
}

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

async function runMigration() {
  console.log('Starting migration...');
  console.log();

  // Step 1: Create Auth users
  console.log('STEP 1: Creating Auth Users');
  const authUserIds = await createAuthUsers();
  
  if (Object.keys(authUserIds).length === 0) {
    console.log('WARNING: No Auth users created. Will use generated UUIDs for user_profiles.');
  } else {
    console.log(`Auth users created: ${Object.keys(authUserIds).length}`);
  }
  console.log();

  // Step 2: Create exec_sql function temporarily
  await createExecSQLFunction();

  // Step 3: Migrate tables
  console.log('STEP 3: Migrating tables');
  console.log();

  // Calculate total records
  migrationState.totalRecords = migrationOrder.reduce((sum, item) => sum + item.data.length, 0);
  console.log(`Total records to migrate: ${migrationState.totalRecords}`);
  console.log();

  // Migrate each table
  for (const phase of migrationOrder) {
    const result = await migrateTableSQL(phase.table, phase.data, phase.columns);
    migrationState.phases[phase.table] = result;
    migrationState.migratedRecords += result.migrated;
    migrationState.failedRecords += result.failed;
    migrationState.errors.push(...result.errors);
    
    if (result.failed > 0 && result.migrated === 0) {
      console.log(`STOPPING: Table ${phase.table} had complete failure`);
      migrationState.endTime = new Date().toISOString();
      return migrationState;
    }
  }

  // Handle expense_policies
  console.log('Migrating expense_policies...');
  try {
    const policiesArray = Object.entries(db.expense_policies).map(([company_id, policy]) => ({
      company_id: idMapping[company_id],
      restrict_analyst_to_own_expenses: policy.restrict_analyst_to_own_expenses,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    if (policiesArray.length > 0) {
      for (const policy of policiesArray) {
        const sql = buildInsert('expense_policies', policy, ['company_id', 'restrict_analyst_to_own_expenses', 'created_at', 'updated_at']);
        try {
          const { error } = await supabase.rpc('exec_sql', { sql });
          
          if (error) {
            migrationState.errors.push(`Expense policy insert failed: ${error.message}`);
          } else {
            migrationState.migratedRecords++;
          }
        } catch (error) {
          migrationState.errors.push(error.message);
        }
      }
    }
    console.log(`  Success: ${policiesArray.length} policies`);
  } catch (error) {
    console.log(`  Exception: ${error.message}`);
    migrationState.errors.push(error.message);
  }

  // Step 4: Remove exec_sql function
  console.log();
  console.log('STEP 4: Removing exec_sql function');
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: 'DROP FUNCTION IF EXISTS exec_sql(text)' });
    
    if (error) {
      console.log('✗ Failed to remove exec_sql function');
      console.log(`Error: ${error.message}`);
    } else {
      console.log('✓ exec_sql function removed');
    }
  } catch (error) {
    console.log(`Exception: ${error.message}`);
  }

  // Complete migration state
  migrationState.endTime = new Date().toISOString();
  migrationState.duration = new Date(migrationState.endTime) - new Date(migrationState.startTime);

  // Save migration log
  const LOG_FILE = path.join(__dirname, '..', `migration_log_${new Date().toISOString().replace(/[:.]/g, '').replace('T', '_')}.json`);
  fs.writeFileSync(LOG_FILE, JSON.stringify(migrationState, null, 2));
  console.log();
  console.log(`Migration log saved to: ${LOG_FILE}`);
  console.log();

  // Print summary
  console.log('='.repeat(80));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Records: ${migrationState.totalRecords}`);
  console.log(`Migrated: ${migrationState.migratedRecords}`);
  console.log(`Failed: ${migrationState.failedRecords}`);
  console.log(`Errors: ${migrationState.errors.length}`);
  console.log(`Duration: ${migrationState.duration}ms`);
  console.log('='.repeat(80));

  // Print per-table results
  console.log();
  console.log('PER-TABLE RESULTS:');
  Object.entries(migrationState.phases).forEach(([table, state]) => {
    console.log(`  ${table.padEnd(40)}: ${state.migrated}/${state.total} migrated`);
  });

  console.log();
  console.log('AUTH USERS CREATED:');
  migrationState.authUsers.forEach(user => {
    console.log(`  ${user.email} -> ${user.authId}`);
  });

  return migrationState;
}

runMigration()
  .then(state => {
    console.log();
    console.log('='.repeat(80));
    console.log('Migration completed.');
    console.log('='.repeat(80));
    process.exit(state.failedRecords > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
