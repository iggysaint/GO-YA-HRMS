const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function queryWithAdminAPI(sql) {
  // Use direct PostgreSQL connection string approach
  const connectionString = `${SUPABASE_URL.replace('https://', 'postgresql://postgres:')}:${SERVICE_ROLE_KEY}@${SUPABASE_URL.replace('https://', '')}:5432/postgres`;
  
  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString });
    await client.connect();
    
    const result = await client.query(sql);
    await client.end();
    return result.rows;
  } catch (error) {
    throw error;
  }
}

async function investigateRLS() {
  console.log('='.repeat(80));
  console.log('RLS AND PERMISSION INVESTIGATION');
  console.log('='.repeat(80));
  console.log();

  // Check RLS policies for all tables
  console.log('1. RLS POLICIES FOR ALL TABLES:');
  try {
    const policies = await queryWithAdminAPI(`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);
    console.log(JSON.stringify(policies, null, 2));
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
  console.log();

  // Check table permissions for service role
  console.log('2. TABLE PERMISSIONS:');
  try {
    const permissions = await queryWithAdminAPI(`
      SELECT 
        table_name,
        privilege_type,
        grantee
      FROM information_schema.table_privileges
      WHERE table_schema = 'public'
      ORDER BY table_name, privilege_type;
    `);
    console.log(JSON.stringify(permissions, null, 2));
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
  console.log();

  // Check RLS enabled status
  console.log('3. RLS ENABLED STATUS:');
  try {
    const rlsStatus = await queryWithAdminAPI(`
      SELECT 
        schemaname,
        tablename,
        rowsecurity AS rls_enabled,
        relforcerowsecurity AS force_rls
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    console.log(JSON.stringify(rlsStatus, null, 2));
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
  console.log();

  console.log('='.repeat(80));
}

investigateRLS().catch(err => {
  console.error(err);
  process.exit(1);
});
