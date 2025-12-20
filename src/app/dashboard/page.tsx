import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import { UserProfile } from '@/types';

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Auth Check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // 2. Fetch Full Profile
  // We fetch strictly what we defined in the types
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    // If auth exists but profile is missing, something is wrong with the Trigger.
    // In production, we might redirect to a "Setup Profile" page or error.
    console.error('Profile missing for user:', user.id);
    redirect('/login'); // Or a custom error page
  }

  // 3. Check Onboarding
  // If we added an 'onboarding_completed' flag to the DB, check it here.
  // For now, we pass the profile to the client to decide.
  
  return (
    <div className="h-full w-full">
      {/* Fixed: Passed 'initialProfile' instead of 'user' to match DashboardClient props */}
      <DashboardClient initialProfile={profile as UserProfile} />
    </div>
  );
}