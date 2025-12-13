import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StudentDashboard } from "@/components/features/dashboard/StudentDashboard";
import { LecturerDashboard } from "@/components/features/dashboard/LecturerDashboard";
import { GamificationService } from "@/lib/services/gamification.service";

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // 1. Check Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  // 2. Fetch User Profile
  const { data: profile, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    console.error("Profile Load Error:", error);
    return <div className="p-10 text-center">Error loading profile. Please refresh.</div>;
  }

  // --- ROUTING LOGIC ---

  // A. LECTURER VIEW
  if (profile.role === 'lecturer') {
    // Fetch courses they TEACH
    const { data: teachingCourses } = await supabase
      .from('courses')
      .select('*, _count: enrollments(count)') // Gets enrollment count
      .eq('instructor_id', user.id);

    return (
      <LecturerDashboard 
        profile={profile} 
        courses={teachingCourses || []} 
      />
    );
  } 
  
  // B. STUDENT VIEW (Default)
  else {
    // Fetch courses they are ENROLLED in
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*, courses(*)')
      .eq('user_id', user.id);
      
    // Transform data for UI
    const courseSummary = enrollments?.map((e: any) => ({
      ...e.courses,
      progress: e.progress || 0,
      enrolled_at: e.enrolled_at
    })) || [];

    // Fetch Stats
    const stats = await GamificationService.getUserStats(user.id);

    return (
      <StudentDashboard 
        profile={profile} 
        courses={courseSummary} 
        stats={stats} 
      />
    );
  }
}