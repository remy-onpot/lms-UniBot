import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// NOTE: This client bypasses Row Level Security (RLS). 
// Use ONLY for admin/system tasks (Webhooks, Cron jobs, Billing).
// NEVER expose this to the client-side.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase Service Key in environment variables');
}

export const adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});