import { createClient } from '@supabase/supabase-js';

// These should be in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl) {
  console.error('Missing SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
  console.error('You need to add the anon/public key from your Supabase project');
}

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

