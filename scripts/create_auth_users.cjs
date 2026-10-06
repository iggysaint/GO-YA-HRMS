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
console.log('GO-YA HRMS Phase 2B: Create Auth Users First');
console.log('='.repeat(80));
console.log(`Target Project: ${EXPECTED_PROJECT_ID}`);
console.log(`Start Time: ${new Date().toISOString()}`);
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
        console.log(`  ✓ Created Auth user: ${user.email} -> ${authUser.id}`);
      } else {
        const error = await response.text();
        console.log(`  ✗ Failed to create user ${user.email}: ${error}`);
      }
    } catch (error) {
      console.log(`  ✗ Exception for ${user.email}: ${error.message}`);
    }
  }

  console.log();
  return authUserIds;
}

createAuthUsers()
  .then(authUserIds => {
    console.log('='.repeat(80));
    console.log('AUTH USERS CREATED');
    console.log('='.repeat(80));
    console.log(`Total Auth users created: ${Object.keys(authUserIds).length}`);
    console.log();
    console.log('Auth User ID Mapping:');
    Object.entries(authUserIds).forEach(([legacyId, authId]) => {
      console.log(`  ${legacyId} -> ${authId}`);
    });
    console.log();
    console.log('NOTE: The auth.user IDs need to match the user_profiles.id values.');
    console.log('The current migration uses generated UUIDs for user_profiles.id.');
    console.log('We need to update the migration to use the actual Auth user IDs.');
    console.log();
    
    // Save auth user mapping
    const mappingFile = path.join(__dirname, '..', 'auth_user_mapping.json');
    fs.writeFileSync(mappingFile, JSON.stringify(authUserIds, null, 2));
    console.log(`Auth user mapping saved to: ${mappingFile}`);
    console.log();
    console.log('NEXT STEP: Regenerate migration SQL with correct Auth user IDs');
  })
  .catch(error => {
    console.error('Auth user creation failed:', error);
    process.exit(1);
  });
