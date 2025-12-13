import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OnboardingWizard from "@/components/OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  
  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  // 2. Check Existing Profile
  // We need to know if they are a student or lecturer to show the right form
  const { data: profile } = await supabase
    .from('users')
    .select('role, is_course_rep, onboarding_completed')
    .eq('id', user.id)
    .single();

  // 3. Safety Redirect
  // If they are already done, kick them to dashboard
  if (profile?.onboarding_completed) {
    return redirect('/dashboard');
  }

  // 4. Server Action for Redirect
  // We pass this to the Client Component to trigger the move after success
  async function handleComplete() {
    'use server';
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <OnboardingWizard 
        userId={user.id} 
        role={profile?.role || 'student'} 
        isCourseRep={profile?.is_course_rep || false}
        onComplete={handleComplete}
      />
    </div>
  );
}