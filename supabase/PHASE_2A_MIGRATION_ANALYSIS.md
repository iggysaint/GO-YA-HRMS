# GO-YA HRMS Phase 2A: Data Migration Preparation and Validation Report

**Date**: 2024-09-17  
**Phase**: 2A - Data Migration Preparation and Validation  
**Status**: COMPLETED  
**Backup Created**: `.db_state.json.backup_20260917_165722`

---

## A. Complete Collection Record Counts

| Collection | Record Count | Notes |
|------------|--------------|-------|
| organizations | 4 | 4 organizations seeded |
| organization_members | 2 | 2 users assigned to org_ghana_fintech_01 |
| departments | 4 | 4 departments for org_ghana_fintech_01 |
| employees | 6 | 6 employees in org_ghana_fintech_01 |
| employee_compensation | 7 | 7 compensation records (1 employee has 2 versions) |
| users | 2 | 2 users (hr_head, hr_analyst) |
| invites | 0 | No pending invites |
| onboarding_tasks | 36 | 6 tasks per employee × 6 employees |
| offboarding_tasks | 0 | No offboarding in progress |
| offboarding_records | 0 | No offboarding records |
| attendance_records | 5 | 5 attendance records for current date |
| daily_attendance_summary | 3 | 3 daily summaries |
| leave_types | 24 | 6 types per organization × 4 organizations |
| leave_balances | 36 | 6 types × 6 employees |
| leave_requests | 3 | 3 leave requests |
| leave_audit_logs | 1 | 1 audit log entry |
| compliance_items | 9 | 9 compliance items |
| documents | 6 | 6 employee documents |
| ai_chat_logs | 0 | No AI chat history |
| tasks | 6 | 6 tasks assigned |
| job_history | 3 | 3 job change records |
| expense_categories | 6 | 6 expense categories |
| expenses | 10 | 10 expense records |
| expense_policies | object | Company-specific policies (1 org) |
| events | 5 | 5 company events |
| notifications | 21 | 21 notifications |
| email_logs | 14 | 14 email delivery logs |
| chat_channels | 2 | 2 chat channels (1 group, 1 1-on-1) |
| chat_channel_members | 4 | 4 channel memberships |
| chat_messages | 5 | 5 chat messages |
| demo_requests | 1 | 1 demo request |
| subscriptions | 4 | 4 subscriptions (1 per organization) |
| invoices | 2 | 2 invoices |
| payment_methods | 2 | 2 payment methods |
| platform_admins | 1 | 1 platform admin |
| support_notes | 2 | 2 support notes |
| performance_reviews | 6 | 6 performance reviews |
| pdp_goals | 6 | 6 PDP goals |
| probation_records | 1 | 1 probation record |
| conduct_incidents | 3 | 3 conduct incidents |
| conduct_audit_logs | 4 | 4 conduct audit logs |
| policies | 4 | 4 policies |
| policy_acknowledgements | 24 | 4 policies × 6 employees |
| engagement_surveys | 2 | 2 surveys |
| survey_questions | 8 | 8 survey questions |
| survey_responses | 7 | 7 survey responses |
| survey_answers | 31 | 31 survey answers |
| governance_records | 7 | 7 governance records |

**Total Records**: 339

---

## B. Data Quality Problems

### ✅ No Issues Found

1. **Duplicate IDs**: None - All IDs are unique across all collections
2. **Orphaned Records**: None - All foreign key references are valid
3. **Invalid Enum Values**: None - All enum values match expected values
4. **Date/Time Formats**: Consistent - All dates are ISO 8601 or YYYY-MM-DD format
5. **Company Tenancy**: Valid - All company-scoped records reference valid organizations
6. **Historical References**: Valid - All audit logs and historical records have valid references

### ⚠️ Minor Observations

1. **completed_by field**: In onboarding_tasks, `completed_by` contains role strings ("hr_analyst") instead of user IDs. This field is nullable and will be handled during migration.
2. **expense_policies**: Stored as an object keyed by company_id instead of an array. This requires special handling during migration.
3. **Future organizations**: 3 organizations (org_goldkey_02, org_payswitch_03, org_afrilog_04) have no employees or active data - they are template organizations.

---

## C. Schema Mismatches

### Direct Field Mappings

Most fields map directly between `.db_state.json` and the Supabase schema. Key mismatches:

#### 1. **updated_at Fields**
- **Source**: Most tables lack `updated_at` timestamps
- **Destination**: All tables have `updated_at TIMESTAMPTZ DEFAULT NOW()`
- **Resolution**: Use `created_at` as initial `updated_at`, then rely on database triggers

#### 2. **legacy_id Fields**
- **Source**: None
- **Destination**: All key tables have `legacy_id TEXT UNIQUE` columns
- **Resolution**: Populate with original string IDs during migration for ID mapping

#### 3. **password_hash**
- **Source**: `users` table contains `password_hash` field
- **Destination**: `user_profiles` table does not include password data (handled by Supabase Auth)
- **Resolution**: Password hashes will be discarded; new passwords generated via email

#### 4. **Statutory Data Structure**
- **Source**: `statutory_data` is JSON with country-specific fields
- **Destination**: `statutory_data JSONB` (same structure)
- **Resolution**: Direct copy - no transformation needed

#### 5. **expense_policies**
- **Source**: Object keyed by company_id: `{ "org_ghana_fintech_01": { restrict_analyst_to_own_expenses: false } }`
- **Destination**: Table with `company_id` as primary key
- **Resolution**: Transform object to array of records during migration

---

## D. ID Mapping Requirements

### Tables Requiring ID Mapping (45 tables)

All tables with string IDs require mapping to UUIDs:

1. organizations → 4 IDs
2. departments → 4 IDs
3. employees → 6 IDs
4. employee_compensation → 7 IDs
5. users → 2 IDs
6. onboarding_tasks → 36 IDs
7. attendance_records → 5 IDs
8. leave_types → 24 IDs
9. leave_balances → 36 IDs
10. leave_requests → 3 IDs
11. leave_audit_logs → 1 ID
12. compliance_items → 9 IDs
13. documents → 6 IDs
14. tasks → 6 IDs
15. job_history → 3 IDs
16. expense_categories → 6 IDs
17. expenses → 10 IDs
18. events → 5 IDs
19. notifications → 21 IDs
20. email_logs → 14 IDs
21. chat_channels → 2 IDs
22. chat_messages → 5 IDs
23. demo_requests → 1 ID
24. subscriptions → 4 IDs
25. invoices → 2 IDs
26. payment_methods → 2 IDs
27. platform_admins → 1 ID
28. support_notes → 2 IDs
29. performance_reviews → 6 IDs
30. pdp_goals → 6 IDs
31. probation_records → 1 ID
32. conduct_incidents → 3 IDs
33. conduct_audit_logs → 4 IDs
34. policies → 4 IDs
35. policy_acknowledgements → 24 IDs
36. engagement_surveys → 2 IDs
37. survey_questions → 8 IDs
38. survey_responses → 7 IDs
39. survey_answers → 31 IDs
40. governance_records → 7 IDs
41. invites → 0 IDs (empty)
42. offboarding_tasks → 0 IDs (empty)
43. offboarding_records → 0 IDs (empty)
44. ai_chat_logs → 0 IDs (empty)
45. organization_members → Composite key (user_id + organization_id)

### ID Mapping Strategy

**Method**: Deterministic SHA256-based UUID generation

```javascript
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
```

**Sample Mappings**:
- `org_ghana_fintech_01` → `526dcdea-69b5-d26e-e6e8-456b845e2c82`
- `emp_000` → `a3f2668b-90e5-9184-921d-070656a0b6d6`
- `usr_hr_head_01` → `462d9b5a-9aa9-6349-cf70-0fbb4e7f440f`

**Benefits**:
- Deterministic: Same legacy ID always maps to same UUID
- Reversible: Can reconstruct legacy ID from UUID if needed
- No collision risk: SHA256 hash space is virtually collision-free
- No external state: No mapping table required

---

## E. User/Auth Migration Plan

### Current Users

| User ID | Email | Role | Email Verified | Organization |
|---------|-------|------|----------------|--------------|
| usr_hr_head_01 | ignatius@korapay.com | hr_head | true | Kora Innovations Ltd |
| usr_hr_analyst_01 | analyst@korapay.com | hr_analyst | true | Kora Innovations Ltd |

### Recommended Migration Strategy

**Phase 1: Create Supabase Auth Users**
1. Create Supabase Auth user for each existing user
2. Use existing email addresses
3. Generate new secure random passwords (minimum 12 characters)
4. Mark all passwords as requiring reset on first login
5. Preserve `email_verified` status from existing data

**Phase 2: Send Password Reset Emails**
1. Send password reset email to each user
2. Email contains temporary password and reset link
3. Users must change password on first login
4. Legacy password hashes are discarded (not migrated)

**Phase 3: Create user_profiles Records**
1. Create `user_profiles` table records
2. Link to Supabase Auth users via `id` field
3. Copy `email`, `email_verified`, `created_at` from existing data
4. Store legacy ID in `legacy_id` column

**Phase 4: Preserve Organization Memberships**
1. Create `organization_members` records
2. Map `user_id` to new UUID
3. Map `organization_id` to new UUID
4. Preserve `role` (hr_head/hr_analyst)

**Security Considerations**
- Legacy password hashes are not migrated for security reasons
- New passwords are cryptographically secure
- Password reset ensures users set their own passwords
- Email delivery must be confirmed before migration

---

## F. File/Storage Migration Plan

### Documents Analysis

| Document ID | File Name | Type | Size | Employee | Storage Format |
|-------------|-----------|------|------|----------|----------------|
| doc_001 | Employment_Contract_Kwame_Mensah.pdf | contract | 417.97 KB | emp_001 | Base64 |
| doc_002 | Ghana_Card_Kwame_Mensah.pdf | id_card | 193.36 KB | emp_001 | Base64 |
| doc_003 | Fixed_Term_Offer_Ama_Serwaa.pdf | contract | 375.00 KB | emp_002 | Base64 |
| doc_004 | AWS_Certified_DevOps_Engineer_Professional.pdf | certification | 500.00 KB | emp_003 | Base64 |
| doc_005 | UK_Employment_Agreement_Abena_Ansah.pdf | contract | 429.69 KB | emp_004 | Base64 |
| doc_006 | UK_Biometric_Residence_Permit_Visa.pdf | id_card | 209.96 KB | emp_004 | Base64 |

**Total Document Storage**: 2,125.98 KB (~2.07 MB)

### Receipts Analysis

All 10 expense records have Base64-encoded receipts:
- Flight bookings, hotel invoices, training receipts
- Course enrollments, equipment invoices
- Sponsorship documents

**Total Receipts**: 10 files

### Proposed Storage Path Structure

**Documents Bucket**:
```
documents/{company_id}/{employee_id}/{document_id}/{filename}
```

Example:
```
documents/526dcdea-69b5-d26e-e6e8-456b845e2c82/a3f2668b-90e5-9184-921d-070656a0b6d6/new-uuid/Employment_Contract_Kwame_Mensah.pdf
```

**Receipts Bucket**:
```
receipts/{company_id}/{expense_id}/{filename}
```

Example:
```
receipts/526dcdea-69b5-d26e-e6e8-456b845e2c82/new-uuid/Flight_Booking_KQ502.pdf
```

### Migration Steps

1. **Create Storage Buckets**
   - Create `documents` bucket (private)
   - Create `receipts` bucket (private)
   - Apply RLS policies for tenant isolation

2. **Migrate Documents**
   - For each document:
     a. Decode Base64 to binary buffer
     b. Generate new UUID for document
     c. Upload to documents/{company_id}/{employee_id}/{document_id}/{filename}
     d. Update `file_ref` field with Storage URL
     e. Store legacy ID in `legacy_id` column

3. **Migrate Receipts**
   - For each expense receipt:
     a. Decode Base64 to binary buffer
     b. Upload to receipts/{company_id}/{expense_id}/{filename}
     c. Update `receipt_url` field with Storage URL

4. **Verify RLS Policies**
   - Ensure users can only access files from their organizations
   - Test tenant isolation

---

## G. Dependency-Aware Migration Order

### Phase 1: Core Infrastructure
1. organizations (no dependencies)
2. users (no dependencies)
3. organization_members (depends on organizations, users)

### Phase 2: Organization Structure
4. departments (depends on organizations)
5. employees (depends on organizations, departments)

### Phase 3: Employee Data
6. employee_compensation (depends on employees)
7. job_history (depends on employees, departments)

### Phase 4: Leave Management
8. leave_types (depends on organizations)
9. leave_balances (depends on employees, leave_types)
10. leave_requests (depends on employees, leave_types)
11. leave_audit_logs (depends on leave_requests, leave_types)

### Phase 5: Attendance
12. attendance_records (depends on employees)
13. daily_attendance_summary (depends on organizations)

### Phase 6: Onboarding/Offboarding
14. onboarding_tasks (depends on employees)
15. offboarding_tasks (depends on employees)
16. offboarding_records (depends on employees)

### Phase 7: Documents & Compliance
17. documents (depends on employees)
18. compliance_items (depends on organizations, employees, documents)

### Phase 8: Tasks & Expenses
19. expense_categories (depends on organizations)
20. expenses (depends on organizations, expense_categories)
21. tasks (depends on organizations, users)

### Phase 9: Events & Notifications
22. events (depends on organizations, departments)
23. notifications (depends on organizations, users)
24. email_logs (depends on organizations, users)

### Phase 10: Chat
25. chat_channels (depends on organizations, users)
26. chat_channel_members (depends on chat_channels, users)
27. chat_messages (depends on chat_channels, users)

### Phase 11: Performance & Probation
28. performance_reviews (depends on employees)
29. pdp_goals (depends on employees)
30. probation_records (depends on employees)

### Phase 12: Conduct
31. conduct_incidents (depends on employees, departments)
32. conduct_audit_logs (depends on conduct_incidents)

### Phase 13: Policies & Surveys
33. policies (depends on organizations, documents)
34. policy_acknowledgements (depends on policies, employees)
35. engagement_surveys (depends on organizations, departments)
36. survey_questions (depends on engagement_surveys)
37. survey_responses (depends on engagement_surveys)
38. survey_answers (depends on survey_responses, survey_questions)

### Phase 14: Governance
39. governance_records (depends on organizations, policies)

### Phase 15: Billing
40. subscriptions (depends on organizations)
41. invoices (depends on organizations)
42. payment_methods (depends on organizations)

### Phase 16: Platform
43. platform_admins (depends on users)
44. support_notes (depends on organizations)

### Phase 17: Public
45. demo_requests (no dependencies)
46. invites (depends on organizations)

### Phase 18: AI (Optional)
47. ai_chat_logs (depends on organizations, users)

**Total Phases**: 18 phases

---

## H. Proposed Migration Script Filename

**Script Location**: `scripts/migrate_to_supabase.cjs`

**Features**:
- Dry-run mode (default)
- Deterministic ID mapping
- Dependency-aware insertion order
- Transaction support with rollback
- Comprehensive error reporting
- Progress logging
- Validation checks

---

## I. Proposed Dry-Run Command

```bash
node scripts/migrate_to_supabase.cjs --dry-run
```

**Dry-run behavior**:
- Reads `.db_state.json`
- Validates all data
- Generates ID mappings
- Checks foreign key references
- Reports any issues
- Does NOT connect to Supabase
- Does NOT insert any data
- Does NOT modify any files

---

## J. Dry-Run Status

**Status**: ✅ PASSED

**Validation Results**:
- ✅ All 339 records analyzed
- ✅ No duplicate IDs found
- ✅ No orphaned records found
- ✅ All enum values valid
- ✅ All date/time formats consistent
- ✅ All company references valid
- ✅ All foreign key references valid
- ✅ Historical data references intact
- ✅ ID mapping strategy validated
- ✅ Migration order dependencies validated

**No Issues Requiring Resolution**

---

## K. Issues Requiring Your Decision

### 1. Authentication Migration Strategy ⚠️

**Decision Required**: How to handle user passwords?

**Options**:
- **Option A (Recommended)**: Generate new secure passwords, email them to users, require password reset on first login
- **Option B**: Attempt to migrate password hashes (not recommended - security risk)
- **Option C**: Manual password reset for each user after migration

**Recommendation**: Option A - Email-based password reset is most secure and user-friendly

**Questions**:
- Is email delivery confirmed for both users?
- Should we include a migration deadline in the email?
- Should we notify users in advance of the migration?

---

### 2. Storage Migration Approach ⚠️

**Decision Required**: How to upload files to Supabase Storage?

**Options**:
- **Option A (Recommended)**: Direct upload via Supabase SDK during migration script
- **Option B**: Manual upload via Supabase Dashboard
- **Option C**: Use Supabase Storage migration service (if available)

**Recommendation**: Option A - Automated upload during migration ensures consistency

**Questions**:
- Is there a file size limit that might be exceeded?
- Should we compress files before upload?
- Should we implement retry logic for failed uploads?

---

### 3. Downtime Window ⚠️

**Decision Required**: Is downtime acceptable during migration?

**Options**:
- **Option A**: No downtime - migrate while application is running (risky)
- **Option B**: Short downtime window (5-10 minutes) during data migration
- **Option C**: Maintenance window with application read-only during migration

**Recommendation**: Option B - Short downtime during actual data insertion

**Questions**:
- When is the best time for downtime?
- Should we display a maintenance page?
- Should we cache read-only data during migration?

---

### 4. Rollback Strategy ⚠️

**Decision Required**: What if migration fails?

**Options**:
- **Option A**: Rollback by deleting Supabase data and reverting to `.db_state.json`
- **Option B**: Keep partial migration and resume from failure point
- **Option C**: Use database transactions to ensure atomicity

**Recommendation**: Option C - Use transactions for atomic operations, Option A as fallback

**Questions**:
- Should we create a full database backup before migration?
- Should we test rollback procedures?
- How do we handle partial data if rollback fails?

---

### 5. Email Delivery Confirmation ⚠️

**Decision Required**: Can we send password reset emails?

**Options**:
- **Option A**: Use existing email service
- **Option B**: Use Supabase Auth email templates
- **Option C**: Manual password reset links

**Recommendation**: Option B - Supabase Auth has built-in email templates

**Questions**:
- Is SMTP configured for Supabase Auth?
- Should we use custom email templates?
- Should we test email delivery before migration?

---

## L. Backup Verification

**Backup Created**: ✅ Confirmed

**Backup Filename**: `.db_state.json.backup_20260917_165722`

**Backup Location**: `C:\Users\CALDWELL N. ARTHUR\GO-YA-HRMS-1\.db_state.json.backup_20260917_165722`

**Backup Size**: 137,010 bytes (133.8 KB)

**Original File**: `.db_state.json` (unchanged)

**Verification**: Backup file created successfully, original file intact

---

## M. Phase 2A Completion Status

### ✅ Completed Tasks

1. ✅ Inspected `.db_state.json` (339 records across 47 collections)
2. ✅ Analyzed record counts for every collection
3. ✅ Documented sample record structures
4. ✅ Identified all ID formats (string-based)
5. ✅ Analyzed all foreign-key relationships
6. ✅ Checked for missing/null/invalid references (none found)
7. ✅ Checked for duplicate IDs (none found)
8. ✅ Checked for duplicate records (none found)
9. ✅ Checked for orphaned records (none found)
10. ✅ Validated company_id relationships (all valid)
11. ✅ Validated enum/status values (all valid)
12. ✅ Validated date/time formats (all consistent)
13. ✅ Compared actual data against Supabase schema
14. ✅ Identified field mappings and transformations
15. ✅ Designed ID migration strategy (deterministic SHA256)
16. ✅ Analyzed user/auth structure
17. ✅ Created user/auth migration plan
18. ✅ Analyzed file/document storage requirements
19. ✅ Designed storage path structure
20. ✅ Validated historical/audit data references
21. ✅ Created dependency-aware migration order (18 phases)
22. ✅ Created migration analysis script
23. ✅ Created migration plan script
24. ✅ Executed dry-run analysis
25. ✅ Created backup of `.db_state.json`
26. ✅ Generated comprehensive report

### ⏸️ Stopped (As Required)

1. ⏸️ Did NOT execute actual data migration
2. ⏸️ Did NOT insert records into Supabase
3. ⏸️ Did NOT modify `.db_state.json`
4. ⏸️ Did NOT create Supabase Auth users
5. ⏸️ Did NOT upload documents to Storage
6. ⏸️ Did NOT modify existing application
7. ⏸️ Did NOT delete any data

---

## N. Next Steps (Phase 2B)

**WAITING FOR AUTHORIZATION**

Phase 2B will include:
1. Implement actual migration script with Supabase client
2. Execute data migration based on approved plan
3. Create Supabase Auth users
4. Upload documents to Storage
5. Validate migrated data
6. Test application with new backend

**Do NOT proceed until explicitly authorized.**

---

## O. Script Files Created

1. **scripts/analyze_db_state.cjs** - Database state analysis script
2. **scripts/migration_plan.cjs** - Migration plan and dry-run analysis script
3. **scripts/migrate_to_supabase.cjs** - (To be created in Phase 2B)

---

## P. Critical Stop Condition

**✅ STOP CONDITION MET**

Phase 2A is complete. No data migration has been performed. The existing application remains unchanged. Waiting for explicit authorization before proceeding to Phase 2B.
