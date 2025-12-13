import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StudentDashboard } from '@/components/features/dashboard/StudentDashboard';
import { LecturerDashboard } from '@/components/features/dashboard/LecturerDashboard';
import { CourseService } from '@/lib/services/course.service';
import { ClassService } from '@/lib/services/class.service';
import { UserProfile } from '@/types';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return redirect('/onboarding');

  const userProfile = profile as UserProfile;

  // 3. Role-Based Data Fetching
  if (userProfile.role === 'lecturer') {
    // ✅ FIX: Use new method name and pass strictly required args
    const classes = await ClassService.getDashboardClasses(
        user.id, 
        userProfile.role, 
        false // Lecturers aren't course reps in this context
    );
    
    return (
      <LecturerDashboard 
        profile={userProfile} 
        classes={classes} 
      />
    );
  } 
  
  // Default: Student Dashboard
  const courses = await CourseService.getStudentCourses(user.id);
  
  const dashboardCourses = courses.map((c: any) => ({
    id: c.id,
    title: c.title,
    className: c.classes?.name || 'Unknown Class',
    progress: c.progress || 0,
    quizCount: c.quizCount || 0,
    assignmentCount: c.assignmentCount || 0
  }));

  return (
    <StudentDashboard 
      profile={userProfile} 
      courses={dashboardCourses} 
    />
  );
}