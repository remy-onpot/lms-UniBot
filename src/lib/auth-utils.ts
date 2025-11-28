import { supabase } from './supabase';

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('role, email')
    .eq('id', userId)
    .single();
  
  if (error || !data) return false;
  
  // Check role or email
  return data.role === 'super_admin' || 
         data.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
}