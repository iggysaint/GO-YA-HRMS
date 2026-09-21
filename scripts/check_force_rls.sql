-- Check FORCE RLS status for all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  relforcerowsecurity AS force_rls
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check if any RLS policies explicitly deny service role
SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (roles IS NULL OR roles = ARRAY['postgres']::name[] OR 'postgres' = ANY(roles))
ORDER BY tablename, policyname;
