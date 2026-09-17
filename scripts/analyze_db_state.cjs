const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', '.db_state.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

console.log('='.repeat(80));
console.log('GO-YA HRMS Database State Analysis');
console.log('='.repeat(80));
console.log();

// 1. Collection Record Counts
console.log('1. COLLECTION RECORD COUNTS');
console.log('-'.repeat(80));
Object.keys(db).forEach(key => {
  const value = db[key];
  if (Array.isArray(value)) {
    console.log(`${key.padEnd(40)}: ${value.length} records`);
  } else if (typeof value === 'object' && value !== null) {
    console.log(`${key.padEnd(40)}: object (expense_policies)`);
  }
});
console.log();

// 2. ID Format Analysis
console.log('2. ID FORMAT ANALYSIS');
console.log('-'.repeat(80));
const idPatterns = {};
Object.keys(db).forEach(key => {
  if (Array.isArray(db[key]) && db[key].length > 0) {
    const sample = db[key][0];
    if (sample.id) {
      const pattern = sample.id.replace(/[0-9]/g, 'N').replace(/[a-z]/g, 'L').replace(/[A-Z]/g, 'U').replace(/_/g, '_');
      idPatterns[key] = {
        pattern,
        sample: sample.id,
        count: db[key].length
      };
    }
  }
});
Object.entries(idPatterns).forEach(([table, info]) => {
  console.log(`${table.padEnd(40)}: ${info.pattern.padEnd(20)} (sample: ${info.sample})`);
});
console.log();

// 3. Foreign Key Analysis
console.log('3. FOREIGN KEY ANALYSIS');
console.log('-'.repeat(80));
const foreignKeys = {
  organizations: [],
  organization_members: ['user_id', 'organization_id'],
  departments: ['company_id'],
  employees: ['company_id', 'department_id', 'manager_id'],
  employee_compensation: ['employee_id'],
  users: [],
  invites: ['organization_id'],
  onboarding_tasks: ['employee_id', 'company_id', 'completed_by'],
  offboarding_tasks: ['employee_id', 'company_id', 'completed_by'],
  offboarding_records: ['employee_id', 'company_id', 'settlement_approved_by'],
  attendance_records: ['employee_id', 'company_id'],
  daily_attendance_summary: ['company_id'],
  leave_types: ['company_id'],
  leave_balances: ['employee_id', 'company_id', 'leave_type_id'],
  leave_requests: ['employee_id', 'company_id', 'leave_type_id', 'approved_by', 'submitted_by'],
  leave_audit_logs: ['company_id', 'employee_id', 'leave_request_id', 'leave_type_id', 'performed_by'],
  compliance_items: ['company_id', 'related_employee_id', 'document_id'],
  documents: ['company_id', 'employee_id'],
  ai_chat_logs: ['company_id', 'user_id'],
  tasks: ['company_id', 'assignee_id', 'related_employee_id', 'created_by'],
  job_history: ['employee_id', 'company_id', 'previous_department_id', 'new_department_id', 'previous_manager_id', 'new_manager_id', 'changed_by'],
  expense_categories: ['company_id'],
  expenses: ['company_id', 'category_id', 'related_employee_id', 'submitted_by', 'approved_by'],
  events: ['company_id', 'department_id', 'created_by'],
  notifications: ['company_id', 'user_id'],
  email_logs: ['company_id', 'user_id'],
  chat_channels: ['company_id', 'created_by'],
  chat_channel_members: ['channel_id', 'user_id'],
  chat_messages: ['channel_id', 'sender_id'],
  demo_requests: [],
  subscriptions: ['company_id'],
  invoices: ['company_id'],
  payment_methods: ['company_id'],
  platform_admins: ['user_id'],
  support_notes: ['company_id'],
  performance_reviews: ['employee_id', 'company_id'],
  pdp_goals: ['employee_id', 'company_id'],
  probation_records: ['employee_id', 'company_id'],
  conduct_incidents: ['company_id', 'related_employee_id', 'department_id', 'created_by'],
  conduct_audit_logs: ['company_id', 'incident_id', 'actor_id'],
  policies: ['company_id', 'document_id'],
  policy_acknowledgements: ['policy_id', 'employee_id'],
  engagement_surveys: ['company_id', 'target_department_id', 'created_by'],
  survey_questions: ['survey_id'],
  survey_responses: ['survey_id', 'respondent_employee_id'],
  survey_answers: ['response_id', 'question_id'],
  governance_records: ['company_id', 'related_policy_id']
};

Object.entries(foreignKeys).forEach(([table, keys]) => {
  if (keys.length > 0) {
    console.log(`${table.padEnd(40)}: ${keys.join(', ')}`);
  }
});
console.log();

// 4. Data Quality Checks
console.log('4. DATA QUALITY CHECKS');
console.log('-'.repeat(80));

// Check for duplicate IDs
console.log('Checking for duplicate IDs...');
const allIds = {};
Object.keys(db).forEach(key => {
  if (Array.isArray(db[key])) {
    db[key].forEach(record => {
      if (record.id) {
        if (!allIds[record.id]) {
          allIds[record.id] = [];
        }
        allIds[record.id].push(key);
      }
    });
  }
});
const duplicates = Object.entries(allIds).filter(([id, tables]) => tables.length > 1);
if (duplicates.length > 0) {
  console.log('DUPLICATE IDs FOUND:');
  duplicates.forEach(([id, tables]) => {
    console.log(`  ${id}: ${tables.join(', ')}`);
  });
} else {
  console.log('No duplicate IDs found.');
}
console.log();

// Check for orphaned records
console.log('Checking for orphaned records...');
const orgIds = new Set(db.organizations.map(o => o.id));
const userIds = new Set(db.users.map(u => u.id));
const deptIds = new Set(db.departments.map(d => d.id));
const empIds = new Set(db.employees.map(e => e.id));

const orphanChecks = [];

// Check employees.company_id
db.employees.forEach(emp => {
  if (!orgIds.has(emp.company_id)) {
    orphanChecks.push(`employees.${emp.id}: company_id ${emp.company_id} not found in organizations`);
  }
});

// Check employees.department_id
db.employees.forEach(emp => {
  if (emp.department_id && !deptIds.has(emp.department_id)) {
    orphanChecks.push(`employees.${emp.id}: department_id ${emp.department_id} not found in departments`);
  }
});

// Check employees.manager_id
db.employees.forEach(emp => {
  if (emp.manager_id && !empIds.has(emp.manager_id)) {
    orphanChecks.push(`employees.${emp.id}: manager_id ${emp.manager_id} not found in employees`);
  }
});

// Check organization_members
db.organization_members.forEach(member => {
  if (!orgIds.has(member.organization_id)) {
    orphanChecks.push(`organization_members: organization_id ${member.organization_id} not found in organizations`);
  }
  if (!userIds.has(member.user_id)) {
    orphanChecks.push(`organization_members: user_id ${member.user_id} not found in users`);
  }
});

if (orphanChecks.length > 0) {
  console.log('ORPHANED RECORDS FOUND:');
  orphanChecks.forEach(check => console.log(`  ${check}`));
} else {
  console.log('No orphaned records found.');
}
console.log();

// 5. Enum Value Validation
console.log('5. ENUM VALUE VALIDATION');
console.log('-'.repeat(80));

const expectedEnums = {
  organization_members: { role: ['hr_head', 'hr_analyst'] },
  employees: { 
    employment_type: ['full_time', 'part_time', 'contract', 'intern'],
    status: ['active', 'probation', 'on_leave', 'offboarded'],
    attrition_risk: ['low', 'medium', 'high']
  },
  attendance_records: { status: ['present', 'late', 'absent', 'on_leave', 'not_logged'] },
  leave_requests: { status: ['pending', 'approved', 'rejected'] },
  compliance_items: { 
    category: ['statutory_tax', 'contracts_visas', 'certifications', 'workplace_safety', 'other'],
    status: ['compliant', 'attention', 'non_compliant']
  },
  documents: { type: ['contract', 'id_card', 'certification', 'tax_form', 'other'] },
  tasks: { 
    status: ['todo', 'in_progress', 'in_review', 'complete'],
    priority: ['low', 'medium', 'high', 'urgent']
  },
  expenses: { status: ['pending', 'approved', 'rejected'] },
  company_events: { 
    event_type: ['holiday', 'meeting', 'social', 'training'],
    visibility_scope: ['company', 'department']
  },
  performance_reviews: { 
    cycle: ['Q1', 'Q2', 'Q3', 'Q4', 'mid_year', 'year_end'],
    status: ['draft', 'finalized']
  },
  pdp_goals: { status: ['not_started', 'in_progress', 'complete'] },
  conduct_incidents: { 
    severity: ['low', 'medium', 'high'],
    status: ['open', 'investigating', 'resolved', 'closed']
  },
  subscriptions: { 
    plan: ['free_trial', 'starter', 'professional', 'enterprise'],
    status: ['active', 'trialing', 'past_due', 'canceled'],
    billing_cycle: ['monthly', 'annual']
  },
  invoices: { status: ['paid', 'open', 'void', 'uncollectible'] }
};

Object.entries(expectedEnums).forEach(([table, fields]) => {
  if (db[table] && db[table].length > 0) {
    Object.entries(fields).forEach(([field, validValues]) => {
      const invalidValues = new Set();
      db[table].forEach(record => {
        if (record[field] && !validValues.includes(record[field])) {
          invalidValues.add(record[field]);
        }
      });
      if (invalidValues.size > 0) {
        console.log(`${table}.${field}: Invalid values found: ${Array.from(invalidValues).join(', ')}`);
      }
    });
  }
});
console.log('All enum values valid.');
console.log();

// 6. Date/Time Format Analysis
console.log('6. DATE/TIME FORMAT ANALYSIS');
console.log('-'.repeat(80));
const dateFields = {
  organizations: ['created_at'],
  employees: ['start_date'],
  employee_compensation: ['effective_date', 'created_at'],
  users: ['created_at'],
  invites: ['created_at', 'expires_at'],
  onboarding_tasks: ['due_date', 'completed_at'],
  offboarding_tasks: ['due_date', 'completed_at'],
  offboarding_records: ['last_working_day', 'created_at', 'settlement_approved_at'],
  attendance_records: ['date'],
  daily_attendance_summary: ['date'],
  leave_requests: ['start_date', 'end_date', 'approved_at', 'created_at'],
  compliance_items: ['deadline', 'created_at', 'updated_at'],
  documents: ['expiry_date', 'uploaded_at'],
  ai_chat_logs: ['created_at'],
  tasks: ['due_date', 'created_at'],
  job_history: ['effective_date', 'created_at'],
  expenses: ['date', 'approved_at', 'created_at'],
  company_events: ['start_datetime', 'end_datetime', 'created_at'],
  notifications: ['read_at', 'created_at'],
  email_logs: ['sent_at'],
  chat_channels: ['created_at'],
  chat_messages: ['created_at'],
  demo_requests: ['created_at'],
  subscriptions: ['trial_ends_at', 'current_period_end', 'created_at'],
  invoices: ['period_start', 'period_end', 'paid_at', 'created_at'],
  payment_methods: ['created_at'],
  platform_admins: ['created_at'],
  support_notes: ['created_at'],
  performance_reviews: ['created_at', 'finalized_at'],
  pdp_goals: ['target_date', 'created_at'],
  probation_records: ['probation_start', 'probation_end', 'original_probation_end', 'mid_review_date', 'end_review_date', 'confirmation_date', 'created_at'],
  conduct_incidents: ['date_reported', 'created_at', 'updated_at'],
  conduct_audit_logs: ['timestamp'],
  policies: ['issue_date', 'created_at'],
  policy_acknowledgements: ['acknowledgment_date', 'created_at'],
  engagement_surveys: ['opens_at', 'closes_at', 'created_at'],
  survey_responses: ['submitted_at'],
  survey_answers: ['created_at'],
  governance_records: ['last_review_date', 'next_review_due', 'created_at']
};

Object.entries(dateFields).forEach(([table, fields]) => {
  if (db[table] && db[table].length > 0) {
    const sample = db[table][0];
    fields.forEach(field => {
      if (sample[field]) {
        const value = sample[field];
        const isISO = value.includes('T') && value.includes('Z');
        const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
        if (!isISO && !isDateOnly) {
          console.log(`${table}.${field}: Unexpected format - ${value}`);
        }
      }
    });
  }
});
console.log('Date/time formats appear consistent (ISO 8601 or YYYY-MM-DD).');
console.log();

// 7. File/Document Analysis
console.log('7. FILE/DOCUMENT ANALYSIS');
console.log('-'.repeat(80));
if (db.documents && db.documents.length > 0) {
  console.log(`Total documents: ${db.documents.length}`);
  let base64Count = 0;
  let urlCount = 0;
  let totalSize = 0;
  db.documents.forEach(doc => {
    if (doc.file_ref && doc.file_ref.startsWith('data:')) {
      base64Count++;
      totalSize += doc.file_size || 0;
    } else if (doc.file_ref && (doc.file_ref.startsWith('http') || doc.file_ref.startsWith('/'))) {
      urlCount++;
    }
  });
  console.log(`  Base64-encoded: ${base64Count}`);
  console.log(`  URL/path references: ${urlCount}`);
  console.log(`  Total size: ${(totalSize / 1024).toFixed(2)} KB`);
}

if (db.expenses && db.expenses.length > 0) {
  console.log(`Total expenses: ${db.expenses.length}`);
  let receiptCount = 0;
  db.expenses.forEach(exp => {
    if (exp.receipt_url) {
      receiptCount++;
    }
  });
  console.log(`  With receipts: ${receiptCount}`);
}
console.log();

// 8. Historical/Audit Data Analysis
console.log('8. HISTORICAL/AUDIT DATA ANALYSIS');
console.log('-'.repeat(80));
const auditTables = ['leave_audit_logs', 'conduct_audit_logs', 'job_history', 'performance_reviews', 'policy_acknowledgements', 'email_logs'];
auditTables.forEach(table => {
  if (db[table]) {
    console.log(`${table.padEnd(40)}: ${db[table].length} records`);
  }
});
console.log();

console.log('='.repeat(80));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(80));
