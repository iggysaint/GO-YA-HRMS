-- Audit script to check current database state after failed Phase 2B
-- This checks RLS status, exec_sql function, and table row counts

-- Check if exec_sql function exists
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'exec_sql';

-- Check RLS status for all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check row counts for all tables
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check for legacy_id columns
SELECT 
  table_name,
  column_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'legacy_id'
ORDER BY table_name;
