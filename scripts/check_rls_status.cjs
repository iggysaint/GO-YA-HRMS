const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkRLSStatus() {
  console.log('='.repeat(80));
  console.log('RLS STATUS INVESTIGATION');
  console.log('='.repeat(80));
  console.log();

  // Check using Supabase client
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Try to query a table with RLS
  console.log('Testing RLS with service role key:');
  try {
    const { data, error } = await supabase.from('organizations').select('*');
    if (error) {
      console.log(`Error: ${error.message}`);
      console.log(`Error code: ${error.code}`);
      console.log(`Error details: ${JSON.stringify(error.details)}`);
    } else {
      console.log(`Success: ${data.length} rows returned`);
    }
  } catch (error) {
    console.log(`Exception: ${error.message}`);
  }
  console.log();

  // Check migration history
  console.log('2. MIGRATION HISTORY:');
  const { data: migrations } = await supabase.from('_supabase_migrations').select('*').order('version');
  console.log(JSON.stringify(migrations, null, 2));
  console.log();

  console.log('='.repeat(80));
}

checkRLSStatus().catch(err => {
  console.error(err);
  process.exit(1);
});
