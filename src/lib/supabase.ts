import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ✅ FIX: Use createBrowserClient to automatically handle cookies
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);