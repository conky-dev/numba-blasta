import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role
// Use this ONLY in API routes for admin operations
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
    'Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

