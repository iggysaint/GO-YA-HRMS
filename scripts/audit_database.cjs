const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function executeSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ sql })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL execution failed: ${error}`);
  }
  
  return response.json();
}

async function auditDatabase() {
  console.log('='.repeat(80));
  console.log('PHASE 2B FAILURE AUDIT - DATABASE STATE');
  console.log('='.repeat(80));
  console.log();

  // Check exec_sql function
  console.log('1. EXEC_SQL FUNCTION:');
  try {
    const result = await executeSQL(`
      SELECT 
        routine_name,
        routine_type,
        security_type
      FROM information_schema.routines
      WHERE routine_schema = 'public' 
        AND routine_name = 'exec_sql';
    `);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
  console.log();

  // Check RLS status
  console.log('2. RLS STATUS FOR ALL TABLES:');
  try {
    const result = await executeSQL(`
      SELECT 
        schemaname,
        tablename,
        rowsecurity AS rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
  console.log();

  // Check legacy_id columns
  console.log('3. LEGACY_ID COLUMNS:');
  try {
    const result = await executeSQL(`
      SELECT 
        table_name,
        column_name,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'legacy_id'
      ORDER BY table_name;
    `);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
  console.log();

  // Check row counts
  console.log('4. TABLE ROW COUNTS:');
  try {
    const result = await executeSQL(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') AS column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
  console.log();

  console.log('='.repeat(80));
}

auditDatabase().catch(err => {
  console.error(err);
  process.exit(1);
});
