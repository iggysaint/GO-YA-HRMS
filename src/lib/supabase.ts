import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

// Server-side Supabase client with service role (bypasses RLS for admin operations)
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Verify we're connecting to the expected DEV project
const EXPECTED_PROJECT_ID = 'srzbstrmiwggjvtzeifs';
if (!SUPABASE_URL.includes(EXPECTED_PROJECT_ID)) {
  throw new Error(`Security: Target project ID ${EXPECTED_PROJECT_ID} does not match SUPABASE_URL`);
}
