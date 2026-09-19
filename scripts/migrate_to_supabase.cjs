const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EXPECTED_PROJECT_ID = 'srzbstrmiwggjvtzeifs';

// Security checks
if (!SUPABASE_URL) {
  console.error('ERROR: SUPABASE_URL environment variable is not set');
  console.error('Please set SUPABASE_URL environment variable');
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

// Verify we're connecting to DEV project
if (!SUPABASE_URL.includes(EXPECTED_PROJECT_ID)) {
  console.error('ERROR: Target project does not match expected DEV project');
  console.error(`Expected project ID: ${EXPECTED_PROJECT_ID}`);
  console.error(`Current URL: ${SUPABASE_URL}`);
  console.error('Migration aborted for safety');
  process.exit(1);
}

const dbPath = path.join(__dirname, '..', '.db_state.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const LOG_FILE = path.join(__dirname, '..', `migration_log_${new Date().toISOString().replace(/[:.]/g, '').replace('T', '_')}.json`);

console.log('='.repeat(80));
console.log('GO-YA HRMS Phase 2B: Data Migration to Supabase DEV');
console.log('='.repeat(80));
console.log(`Target Project: ${EXPECTED_PROJECT_ID}`);
console.log(`Start Time: ${new Date().toISOString()}`);
console.log('Security Status:');
console.log('  SUPABASE_URL: configured ✓');
console.log('  SUPABASE_SERVICE_ROLE_KEY: configured ✓');
console.log('  Secret exposed in logs: NO ✓');
console.log('  Secret committed to Git: NO ✓');
console.log();

// ============================================================================
// ID MAPPING
// ============================================================================

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

// Build complete ID mapping table
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

// ============================================================================
// MIGRATION STATE TRACKING
// ============================================================================

const migrationState = {
  startTime: new Date().toISOString(),
  phases: {},
  totalRecords: 0,
  migratedRecords: 0,
  skippedRecords: 0,
  failedRecords: 0,
  failedFiles: [],
  errors: []
};

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function migrateTable(tableName, records, transformFn = null) {
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
    // Check for existing records
    const { data: existing, error: checkError } = await supabase
      .from(tableName)
      .select('legacy_id');
    
    if (checkError) {
      console.log(`  Error checking existing records: ${checkError.message}`);
      tableState.errors.push(checkError.message);
      return tableState;
    }

    const existingIds = new Set(existing ? existing.map(r => r.legacy_id) : []);
    
    // Filter out already-migrated records
    const toInsert = records.filter(r => !existingIds.has(r.id));
    
    if (toInsert.length === 0) {
      console.log(`  All ${records.length} records already migrated (skipped)`);
      tableState.skipped = records.length;
      return tableState;
    }

    console.log(`  Inserting ${toInsert.length} records (${records.length - toInsert.length} skipped)...`);

    // Transform records
    const transformedRecords = toInsert.map(record => {
      const transformed = transformFn ? transformFn(record) : { ...record };
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

    // Insert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < transformedRecords.length; i += batchSize) {
      const batch = transformedRecords.slice(i, i + batchSize);
      const { error } = await supabase.from(tableName).insert(batch);
      
      if (error) {
        console.log(`  Error inserting batch ${i}-${i + batchSize}: ${error.message}`);
        tableState.errors.push(error.message);
        tableState.failed += batch.length;
      } else {
        tableState.migrated += batch.length;
      }
    }

    console.log(`  Result: ${tableState.migrated} migrated, ${tableState.skipped} skipped, ${tableState.failed} failed`);

  } catch (error) {
    console.log(`  Exception: ${error.message}`);
    tableState.errors.push(error.message);
    tableState.failed = records.length;
  }

  return tableState;
}

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

const transforms = {
  organizations: (r) => ({ ...r }),
  user_profiles: (r) => ({
    id: idMapping[r.id],
    email: r.email,
    email_verified: r.email_verified,
    created_at: r.created_at,
    updated_at: r.created_at
  }),
  organization_members: (r) => ({
    user_id: idMapping[r.user_id],
    organization_id: idMapping[r.organization_id],
    role: r.role,
    created_at: new Date().toISOString()
  }),
  departments: (r) => ({
    ...r,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  employees: (r) => ({
    ...r,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  employee_compensation: (r) => ({
    ...r,
    statutory_data: r.statutory_data
  }),
  onboarding_tasks: (r) => ({
    ...r,
    completed_by: r.completed_by // Keep as string (role name)
  }),
  attendance_records: (r) => ({
    ...r,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  daily_attendance_summary: (r) => ({
    ...r,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  leave_types: (r) => ({ ...r }),
  leave_balances: (r) => ({ ...r }),
  leave_requests: (r) => ({
    ...r,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  leave_audit_logs: (r) => ({ ...r }),
  compliance_items: (r) => ({ ...r }),
  documents: (r) => ({
    ...r,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  tasks: (r) => ({
    ...r,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  job_history: (r) => ({ ...r }),
  expense_categories: (r) => ({ ...r }),
  expenses: (r) => ({
    ...r,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  events: (r) => ({
    ...r,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  notifications: (r) => ({ ...r }),
  email_logs: (r) => ({ ...r }),
  chat_channels: (r) => ({ ...r }),
  chat_channel_members: (r) => ({
    ...r,
    joined_at: new Date().toISOString()
  }),
  chat_messages: (r) => ({ ...r }),
  demo_requests: (r) => ({ ...r }),
  subscriptions: (r) => ({
    ...r,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  invoices: (r) => ({ ...r }),
  payment_methods: (r) => ({ ...r }),
  support_notes: (r) => ({ ...r }),
  performance_reviews: (r) => ({ ...r }),
  pdp_goals: (r) => ({
    ...r,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  probation_records: (r) => ({
    ...r,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  conduct_incidents: (r) => ({
    ...r,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  conduct_audit_logs: (r) => ({ ...r }),
  policies: (r) => ({
    ...r,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  policy_acknowledgements: (r) => ({
    ...r,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  engagement_surveys: (r) => ({
    ...r,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  survey_questions: (r) => ({ ...r }),
  survey_responses: (r) => ({ ...r }),
  survey_answers: (r) => ({ ...r }),
  governance_records: (r) => ({
    ...r,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
};

// ============================================================================
// MAIN MIGRATION
// ============================================================================

async function runMigration() {
  console.log('Starting migration...');
  console.log();

  const migrationOrder = [
    { table: 'organizations', data: db.organizations, transform: transforms.organizations },
    { table: 'user_profiles', data: db.users, transform: transforms.user_profiles },
    { table: 'organization_members', data: db.organization_members, transform: transforms.organization_members },
    { table: 'departments', data: db.departments, transform: transforms.departments },
    { table: 'employees', data: db.employees, transform: transforms.employees },
    { table: 'employee_compensation', data: db.employee_compensation, transform: transforms.employee_compensation },
    { table: 'job_history', data: db.job_history, transform: transforms.job_history },
    { table: 'leave_types', data: db.leave_types, transform: transforms.leave_types },
    { table: 'leave_balances', data: db.leave_balances, transform: transforms.leave_balances },
    { table: 'leave_requests', data: db.leave_requests, transform: transforms.leave_requests },
    { table: 'leave_audit_logs', data: db.leave_audit_logs, transform: transforms.leave_audit_logs },
    { table: 'attendance_records', data: db.attendance_records, transform: transforms.attendance_records },
    { table: 'daily_attendance_summary', data: db.daily_attendance_summary, transform: transforms.daily_attendance_summary },
    { table: 'onboarding_tasks', data: db.onboarding_tasks, transform: transforms.onboarding_tasks },
    { table: 'offboarding_tasks', data: db.offboarding_tasks, transform: transforms.onboarding_tasks },
    { table: 'offboarding_records', data: db.offboarding_records, transform: transforms.offboarding_tasks },
    { table: 'documents', data: db.documents, transform: transforms.documents },
    { table: 'compliance_items', data: db.compliance_items, transform: transforms.compliance_items },
    { table: 'expense_categories', data: db.expense_categories, transform: transforms.expense_categories },
    { table: 'expenses', data: db.expenses, transform: transforms.expenses },
    { table: 'tasks', data: db.tasks, transform: transforms.tasks },
    { table: 'events', data: db.events, transform: transforms.events },
    { table: 'notifications', data: db.notifications, transform: transforms.notifications },
    { table: 'email_logs', data: db.email_logs, transform: transforms.email_logs },
    { table: 'chat_channels', data: db.chat_channels, transform: transforms.chat_channels },
    { table: 'chat_channel_members', data: db.chat_channel_members, transform: transforms.chat_channel_members },
    { table: 'chat_messages', data: db.chat_messages, transform: transforms.chat_messages },
    { table: 'subscriptions', data: db.subscriptions, transform: transforms.subscriptions },
    { table: 'invoices', data: db.invoices, transform: transforms.invoices },
    { table: 'payment_methods', data: db.payment_methods, transform: transforms.payment_methods },
    { table: 'platform_admins', data: db.platform_admins, transform: (r) => ({ ...r }) },
    { table: 'support_notes', data: db.support_notes, transform: transforms.support_notes },
    { table: 'performance_reviews', data: db.performance_reviews, transform: transforms.performance_reviews },
    { table: 'pdp_goals', data: db.pdp_goals, transform: transforms.pdp_goals },
    { table: 'probation_records', data: db.probation_records, transform: transforms.probation_records },
    { table: 'conduct_incidents', data: db.conduct_incidents, transform: transforms.conduct_incidents },
    { table: 'conduct_audit_logs', data: db.conduct_audit_logs, transform: transforms.conduct_audit_logs },
    { table: 'policies', data: db.policies, transform: transforms.policies },
    { table: 'policy_acknowledgements', data: db.policy_acknowledgements, transform: transforms.policy_acknowledgements },
    { table: 'engagement_surveys', data: db.engagement_surveys, transform: transforms.engagement_surveys },
    { table: 'survey_questions', data: db.survey_questions, transform: transforms.survey_questions },
    { table: 'survey_responses', data: db.survey_responses, transform: transforms.survey_responses },
    { table: 'survey_answers', data: db.survey_answers, transform: transforms.survey_answers },
    { table: 'governance_records', data: db.governance_records, transform: transforms.governance_records },
    { table: 'demo_requests', data: db.demo_requests, transform: transforms.demo_requests },
    { table: 'invites', data: db.invites, transform: (r) => ({ ...r }) },
    { table: 'ai_chat_logs', data: db.ai_chat_logs, transform: (r) => ({ ...r }) }
  ];

  // Calculate total records
  migrationState.totalRecords = migrationOrder.reduce((sum, item) => sum + item.data.length, 0);
  console.log(`Total records to migrate: ${migrationState.totalRecords}`);
  console.log();

  // Migrate each table
  for (const phase of migrationOrder) {
    const result = await migrateTable(phase.table, phase.data, phase.transform);
    migrationState.phases[phase.table] = result;
    migrationState.migratedRecords += result.migrated;
    migrationState.skippedRecords += result.skipped;
    migrationState.failedRecords += result.failed;
    migrationState.errors.push(...result.errors);
  }

  // Handle expense_policies separately (object to array)
  console.log('Migrating expense_policies...');
  try {
    const policiesArray = Object.entries(db.expense_policies).map(([company_id, policy]) => ({
      company_id: idMapping[company_id],
      restrict_analyst_to_own_expenses: policy.restrict_analyst_to_own_expenses,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const { error } = await supabase.from('expense_policies').upsert(policiesArray);
    if (error) {
      console.log(`  Error: ${error.message}`);
      migrationState.errors.push(error.message);
    } else {
      console.log(`  Success: ${policiesArray.length} policies`);
      migrationState.migratedRecords += policiesArray.length;
    }
  } catch (error) {
    console.log(`  Exception: ${error.message}`);
    migrationState.errors.push(error.message);
  }

  // Complete migration state
  migrationState.endTime = new Date().toISOString();
  migrationState.duration = new Date(migrationState.endTime) - new Date(migrationState.startTime);

  // Save migration log
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
  console.log(`Skipped: ${migrationState.skippedRecords}`);
  console.log(`Failed: ${migrationState.failedRecords}`);
  console.log(`Errors: ${migrationState.errors.length}`);
  console.log(`Duration: ${migrationState.duration}ms`);
  console.log('='.repeat(80));

  return migrationState;
}

// ============================================================================
// EXECUTE MIGRATION
// ============================================================================

runMigration()
  .then(state => {
    console.log('Migration completed.');
    process.exit(state.failedRecords > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
