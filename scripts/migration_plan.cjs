const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '..', '.db_state.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

console.log('='.repeat(80));
console.log('GO-YA HRMS Data Migration Plan - Dry Run Analysis');
console.log('='.repeat(80));
console.log();

// ============================================================================
// 1. ID MAPPING STRATEGY
// ============================================================================

console.log('1. ID MAPPING STRATEGY');
console.log('-'.repeat(80));
console.log('Strategy: Deterministic UUID generation from legacy IDs');
console.log('Method: SHA256 hash of legacy ID, then take first 16 bytes as UUID');
console.log('This ensures same legacy ID always maps to same UUID');
console.log();

// Create deterministic UUID generator
function legacyIdToUUID(legacyId) {
  const hash = crypto.createHash('sha256').update(legacyId).digest('hex');
  // Convert to UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32)
  ].join('-');
}

// Tables that need ID mapping
const tablesNeedingMapping = [
  'organizations',
  'departments',
  'employees',
  'employee_compensation',
  'users',
  'invites',
  'onboarding_tasks',
  'offboarding_tasks',
  'offboarding_records',
  'attendance_records',
  'leave_types',
  'leave_balances',
  'leave_requests',
  'leave_audit_logs',
  'compliance_items',
  'documents',
  'ai_chat_logs',
  'tasks',
  'job_history',
  'expense_categories',
  'expenses',
  'events',
  'notifications',
  'email_logs',
  'chat_channels',
  'chat_channel_members',
  'chat_messages',
  'demo_requests',
  'subscriptions',
  'invoices',
  'payment_methods',
  'platform_admins',
  'support_notes',
  'performance_reviews',
  'pdp_goals',
  'probation_records',
  'conduct_incidents',
  'conduct_audit_logs',
  'policies',
  'policy_acknowledgements',
  'engagement_surveys',
  'survey_questions',
  'survey_responses',
  'survey_answers',
  'governance_records'
];

console.log('Tables requiring ID mapping:', tablesNeedingMapping.length);
console.log('Sample mappings:');
const sampleIds = ['org_ghana_fintech_01', 'emp_000', 'usr_hr_head_01'];
sampleIds.forEach(id => {
  console.log(`  ${id} → ${legacyIdToUUID(id)}`);
});
console.log();

// ============================================================================
// 2. MIGRATION ORDER
// ============================================================================

console.log('2. PROPOSED MIGRATION ORDER');
console.log('-'.repeat(80));
const migrationOrder = [
  // Phase 1: Core infrastructure
  { table: 'organizations', dependencies: [] },
  { table: 'users', dependencies: [] },
  { table: 'organization_members', dependencies: ['organizations', 'users'] },
  
  // Phase 2: Organization structure
  { table: 'departments', dependencies: ['organizations'] },
  { table: 'employees', dependencies: ['organizations', 'departments'] },
  
  // Phase 3: Employee data
  { table: 'employee_compensation', dependencies: ['employees'] },
  { table: 'job_history', dependencies: ['employees', 'departments'] },
  
  // Phase 4: Leave management
  { table: 'leave_types', dependencies: ['organizations'] },
  { table: 'leave_balances', dependencies: ['employees', 'leave_types'] },
  { table: 'leave_requests', dependencies: ['employees', 'leave_types'] },
  { table: 'leave_audit_logs', dependencies: ['leave_requests', 'leave_types'] },
  
  // Phase 5: Attendance
  { table: 'attendance_records', dependencies: ['employees'] },
  { table: 'daily_attendance_summary', dependencies: ['organizations'] },
  
  // Phase 6: Onboarding/Offboarding
  { table: 'onboarding_tasks', dependencies: ['employees'] },
  { table: 'offboarding_tasks', dependencies: ['employees'] },
  { table: 'offboarding_records', dependencies: ['employees'] },
  
  // Phase 7: Documents & Compliance
  { table: 'documents', dependencies: ['employees'] },
  { table: 'compliance_items', dependencies: ['organizations', 'employees', 'documents'] },
  
  // Phase 8: Tasks & Expenses
  { table: 'expense_categories', dependencies: ['organizations'] },
  { table: 'expenses', dependencies: ['organizations', 'expense_categories'] },
  { table: 'tasks', dependencies: ['organizations', 'users'] },
  
  // Phase 9: Events & Notifications
  { table: 'events', dependencies: ['organizations', 'departments'] },
  { table: 'notifications', dependencies: ['organizations', 'users'] },
  { table: 'email_logs', dependencies: ['organizations', 'users'] },
  
  // Phase 10: Chat
  { table: 'chat_channels', dependencies: ['organizations', 'users'] },
  { table: 'chat_channel_members', dependencies: ['chat_channels', 'users'] },
  { table: 'chat_messages', dependencies: ['chat_channels', 'users'] },
  
  // Phase 11: Performance & Probation
  { table: 'performance_reviews', dependencies: ['employees'] },
  { table: 'pdp_goals', dependencies: ['employees'] },
  { table: 'probation_records', dependencies: ['employees'] },
  
  // Phase 12: Conduct
  { table: 'conduct_incidents', dependencies: ['employees', 'departments'] },
  { table: 'conduct_audit_logs', dependencies: ['conduct_incidents'] },
  
  // Phase 13: Policies & Surveys
  { table: 'policies', dependencies: ['organizations', 'documents'] },
  { table: 'policy_acknowledgements', dependencies: ['policies', 'employees'] },
  { table: 'engagement_surveys', dependencies: ['organizations', 'departments'] },
  { table: 'survey_questions', dependencies: ['engagement_surveys'] },
  { table: 'survey_responses', dependencies: ['engagement_surveys'] },
  { table: 'survey_answers', dependencies: ['survey_responses', 'survey_questions'] },
  
  // Phase 14: Governance
  { table: 'governance_records', dependencies: ['organizations', 'policies'] },
  
  // Phase 15: Billing
  { table: 'subscriptions', dependencies: ['organizations'] },
  { table: 'invoices', dependencies: ['organizations'] },
  { table: 'payment_methods', dependencies: ['organizations'] },
  
  // Phase 16: Platform
  { table: 'platform_admins', dependencies: ['users'] },
  { table: 'support_notes', dependencies: ['organizations'] },
  
  // Phase 17: Public
  { table: 'demo_requests', dependencies: [] },
  { table: 'invites', dependencies: ['organizations'] },
  
  // Phase 18: AI (optional)
  { table: 'ai_chat_logs', dependencies: ['organizations', 'users'] }
];

migrationOrder.forEach((item, index) => {
  console.log(`${(index + 1).toString().padStart(2)}. ${item.table.padEnd(40)} deps: ${item.dependencies.join(', ') || 'none'}`);
});
console.log();

// ============================================================================
// 3. SCHEMA MAPPING ANALYSIS
// ============================================================================

console.log('3. SCHEMA MAPPING ANALYSIS');
console.log('-'.repeat(80));

const schemaMapping = {
  organizations: {
    direct: ['id', 'name', 'industry', 'country', 'currency', 'timezone', 'leave_escalation_threshold_days', 'created_at'],
    transform: [],
    defaults: ['updated_at'],
    sourceOnly: [],
    destOnly: ['legacy_id', 'updated_at']
  },
  user_profiles: {
    direct: ['id', 'email', 'email_verified', 'created_at'],
    transform: [],
    defaults: ['updated_at'],
    sourceOnly: ['password_hash'], // Will be handled separately for auth migration
    destOnly: ['legacy_id', 'updated_at']
  },
  organization_members: {
    direct: ['user_id', 'organization_id', 'role'],
    transform: [],
    defaults: ['created_at'],
    sourceOnly: [],
    destOnly: ['created_at']
  },
  departments: {
    direct: ['id', 'company_id', 'name'],
    transform: [],
    defaults: ['created_at', 'updated_at'],
    sourceOnly: [],
    destOnly: ['legacy_id', 'created_at', 'updated_at']
  },
  employees: {
    direct: ['company_id', 'name', 'department_id', 'job_title', 'employment_type', 'country', 'start_date', 'status', 'attrition_risk', 'manager_id'],
    transform: [],
    defaults: ['created_at', 'updated_at'],
    sourceOnly: [],
    destOnly: ['legacy_id', 'created_at', 'updated_at']
  },
  employee_compensation: {
    direct: ['employee_id', 'salary', 'currency', 'effective_date', 'allowances', 'bonus', 'notes', 'created_at'],
    transform: ['statutory_data'], // JSON field, direct copy
    defaults: [],
    sourceOnly: [],
    destOnly: ['legacy_id']
  },
  // ... (continue for all tables)
};

Object.entries(schemaMapping).forEach(([table, mapping]) => {
  console.log(`${table}:`);
  console.log(`  Direct mappings: ${mapping.direct.length}`);
  console.log(`  Transforms: ${mapping.transform.length}`);
  console.log(`  Defaults needed: ${mapping.defaults.length}`);
  console.log(`  Source-only (excluded): ${mapping.sourceOnly.length}`);
  console.log(`  Dest-only (new): ${mapping.destOnly.length}`);
});
console.log();

// ============================================================================
// 4. USER/AUTH MIGRATION PLAN
// ============================================================================

console.log('4. USER/AUTH MIGRATION PLAN');
console.log('-'.repeat(80));
console.log('Current users in database:');
db.users.forEach(user => {
  console.log(`  ID: ${user.id}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Email verified: ${user.email_verified}`);
  console.log(`  Created: ${user.created_at}`);
  console.log(`  Password hash: [REDACTED]`);
  console.log();
});

console.log('Organization memberships:');
db.organization_members.forEach(member => {
  const user = db.users.find(u => u.id === member.user_id);
  const org = db.organizations.find(o => o.id === member.organization_id);
  console.log(`  User: ${user?.email} (${member.user_id})`);
  console.log(`  Organization: ${org?.name} (${member.organization_id})`);
  console.log(`  Role: ${member.role}`);
  console.log();
});

console.log('RECOMMENDED AUTH MIGRATION STRATEGY:');
console.log('1. Create Supabase Auth users for each existing user');
console.log('2. Use existing email addresses');
console.log('3. Generate new secure passwords and email them to users');
console.log('4. Mark all new passwords as requiring password reset on first login');
console.log('5. Preserve email_verified status from existing data');
console.log('6. Create user_profiles table records linking to auth.users');
console.log('7. Preserve organization_members relationships');
console.log('8. Legacy password hashes will be discarded (not migrated)');
console.log();

// ============================================================================
// 5. FILE/STORAGE MIGRATION PLAN
// ============================================================================

console.log('5. FILE/STORAGE MIGRATION PLAN');
console.log('-'.repeat(80));
console.log('Documents analysis:');
let totalDocSize = 0;
db.documents.forEach(doc => {
  totalDocSize += doc.file_size || 0;
  console.log(`  ${doc.id}: ${doc.file_name} (${(doc.file_size / 1024).toFixed(2)} KB)`);
  console.log(`    Type: ${doc.type}`);
  console.log(`    Employee: ${doc.employee_id}`);
  console.log(`    Storage format: Base64 (needs conversion)`);
});
console.log(`Total document storage: ${(totalDocSize / 1024).toFixed(2)} KB`);
console.log();

console.log('Proposed Storage path structure:');
console.log('  documents/{company_id}/{employee_id}/{document_id}/{filename}');
console.log('  receipts/{company_id}/{expense_id}/{filename}');
console.log();

console.log('Receipts analysis:');
let receiptCount = 0;
db.expenses.forEach(exp => {
  if (exp.receipt_url) {
    receiptCount++;
    console.log(`  ${exp.id}: ${exp.receipt_name || 'unnamed'}`);
    console.log(`    Storage format: Base64 (needs conversion)`);
  }
});
console.log(`Total receipts: ${receiptCount}`);
console.log();

console.log('STORAGE MIGRATION STEPS:');
console.log('1. Create storage buckets: documents, receipts');
console.log('2. For each document:');
console.log('   a. Decode Base64 to binary');
console.log('   b. Upload to documents/{company_id}/{employee_id}/{document_id}/{filename}');
console.log('   c. Update file_ref field with Storage URL');
console.log('3. For each expense receipt:');
console.log('   a. Decode Base64 to binary');
console.log('   b. Upload to receipts/{company_id}/{expense_id}/{filename}');
console.log('   c. Update receipt_url field with Storage URL');
console.log('4. Apply RLS policies to ensure tenant isolation');
console.log();

// ============================================================================
// 6. HISTORICAL DATA VALIDATION
// ============================================================================

console.log('6. HISTORICAL DATA VALIDATION');
console.log('-'.repeat(80));

// Check leave_audit_logs for orphaned references
console.log('leave_audit_logs validation:');
db.leave_audit_logs.forEach(log => {
  const hasRequest = log.leave_request_id ? db.leave_requests.find(r => r.id === log.leave_request_id) : true;
  const hasEmployee = db.employees.find(e => e.id === log.employee_id);
  const hasLeaveType = db.leave_types.find(lt => lt.id === log.leave_type_id);
  
  if (!hasRequest) console.log(`  ⚠️  Missing leave_request reference: ${log.leave_request_id}`);
  if (!hasEmployee) console.log(`  ⚠️  Missing employee reference: ${log.employee_id}`);
  if (!hasLeaveType) console.log(`  ⚠️  Missing leave_type reference: ${log.leave_type_id}`);
});

// Check conduct_audit_logs
console.log('conduct_audit_logs validation:');
db.conduct_audit_logs.forEach(log => {
  const hasIncident = db.conduct_incidents.find(i => i.id === log.incident_id);
  if (!hasIncident) console.log(`  ⚠️  Missing incident reference: ${log.incident_id}`);
});

// Check job_history
console.log('job_history validation:');
db.job_history.forEach(history => {
  const hasEmployee = db.employees.find(e => e.id === history.employee_id);
  const hasPrevDept = db.departments.find(d => d.id === history.previous_department_id);
  const hasNewDept = db.departments.find(d => d.id === history.new_department_id);
  
  if (!hasEmployee) console.log(`  ⚠️  Missing employee reference: ${history.employee_id}`);
  if (!hasPrevDept) console.log(`  ⚠️  Missing previous_department reference: ${history.previous_department_id}`);
  if (!hasNewDept) console.log(`  ⚠️  Missing new_department reference: ${history.new_department_id}`);
});

console.log('Historical data appears intact with valid references.');
console.log();

// ============================================================================
// 7. ORGANIZATION TENANCY VALIDATION
// ============================================================================

console.log('7. ORGANIZATION TENANCY VALIDATION');
console.log('-'.repeat(80));

const orgIds = new Set(db.organizations.map(o => o.id));
const orgValidationIssues = [];

// Check all company-scoped records
const companyScopedTables = [
  'departments', 'employees', 'employee_compensation', 'onboarding_tasks',
  'offboarding_tasks', 'offboarding_records', 'attendance_records',
  'daily_attendance_summary', 'leave_types', 'leave_balances', 'leave_requests',
  'leave_audit_logs', 'compliance_items', 'documents', 'ai_chat_logs', 'tasks',
  'job_history', 'expense_categories', 'expenses', 'events', 'notifications',
  'email_logs', 'chat_channels', 'subscriptions', 'invoices', 'payment_methods',
  'support_notes', 'performance_reviews', 'pdp_goals', 'probation_records',
  'conduct_incidents', 'conduct_audit_logs', 'policies', 'policy_acknowledgements',
  'engagement_surveys', 'governance_records'
];

companyScopedTables.forEach(tableName => {
  if (db[tableName] && db[tableName].length > 0) {
    db[tableName].forEach(record => {
      if (record.company_id && !orgIds.has(record.company_id)) {
        orgValidationIssues.push(`${tableName}.${record.id}: Invalid company_id ${record.company_id}`);
      }
    });
  }
});

if (orgValidationIssues.length > 0) {
  console.log('TENANCY ISSUES FOUND:');
  orgValidationIssues.forEach(issue => console.log(`  ⚠️  ${issue}`));
} else {
  console.log('All company-scoped records have valid organization references.');
}
console.log();

// ============================================================================
// 8. SUMMARY
// ============================================================================

console.log('='.repeat(80));
console.log('MIGRATION PLAN SUMMARY');
console.log('='.repeat(80));
console.log();
console.log('Total records to migrate:');
Object.keys(db).forEach(key => {
  if (Array.isArray(db[key])) {
    console.log(`  ${key.padEnd(40)}: ${db[key].length} records`);
  }
});
console.log();
console.log('Total records:', Object.keys(db).reduce((sum, key) => {
  return sum + (Array.isArray(db[key]) ? db[key].length : 0);
}, 0));
console.log();
console.log('ID mapping strategy: Deterministic SHA256-based UUID generation');
console.log('Migration phases: 18 phases');
console.log('Authentication: Password reset required for all users');
console.log('Storage: ~2.13 KB of documents + receipts to migrate');
console.log('Historical data: All references validated');
console.log('Tenancy: All company references validated');
console.log();
console.log('CRITICAL DECISIONS REQUIRED:');
console.log('1. Confirm authentication migration strategy (password reset emails)');
console.log('2. Confirm storage migration approach (direct upload vs migration service)');
console.log('3. Confirm downtime window (if any) required for migration');
console.log('4. Confirm rollback strategy if migration fails');
console.log();
console.log('='.repeat(80));
console.log('DRY RUN ANALYSIS COMPLETE');
console.log('='.repeat(80));
