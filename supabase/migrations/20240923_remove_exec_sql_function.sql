-- Remove the exec_sql function that was created for the failed Phase 2B migration
-- This function allowed arbitrary SQL execution and poses a security risk
-- Since the migration failed and no data was migrated, this function should be removed

DROP FUNCTION IF EXISTS exec_sql(text);
