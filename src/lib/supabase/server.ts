// src/lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Use createBrowserClient for client-side components
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);