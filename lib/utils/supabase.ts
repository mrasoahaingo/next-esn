import { createClient } from '@supabase/supabase-js';

/**
 * Returns a Supabase client using the service role key.
 * The service role key bypasses Row Level Security — every caller MUST
 * include an explicit .eq('org_id', orgId) filter on every tenant-scoped
 * query. No singleton: a new client is created per call to avoid any
 * cross-request state leak in warm serverless environments.
 */
export const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables are missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};
