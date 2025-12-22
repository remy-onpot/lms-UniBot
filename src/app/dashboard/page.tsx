import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClassService } from '@/lib/services/class.service';
import { CourseService } from '@/lib/services/course.service';
import { GamificationService } from '@/lib/services/gamification.service';
import DashboardClient from './DashboardClient';
import { UserProfile } from '@/types';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 2. Initialize Services
  const classService = new ClassService(supabase);
  const courseService = new CourseService(supabase);
  const gamificationService = new GamificationService(supabase);

  // 3. Fetch User Profile
  const { data: profileData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profileData) redirect('/onboarding'); 

  const profile = profileData as UserProfile;

  // 4. Parallel Data Fetching
  const [classesResult, lecturerModulesResult, statsResult, dailyLoginResult] = await Promise.allSettled([
    classService.getDashboardClasses(),
    
    profile.role === 'lecturer' 
      ? courseService.getLecturerCourses(user.id) 
      : Promise.resolve([]),

    profile.role === 'student'
      ? gamificationService.getUserStats(user.id) // ✅ UPDATED: Use Service method instead of direct RPC
      : Promise.resolve(null),
      
    profile.role === 'student'
      ? gamificationService.checkDailyLogin(user.id)
      : Promise.resolve(null)
  ]);

  // Safely extract values
  const classes = classesResult.status === 'fulfilled' ? classesResult.value : [];
  const lecturerModules = lecturerModulesResult.status === 'fulfilled' ? lecturerModulesResult.value : [];
  const studentStats = statsResult.status === 'fulfilled' ? statsResult.value : null;
  const dailyLoginReward = dailyLoginResult.status === 'fulfilled' ? dailyLoginResult.value : null;

  return (
    <DashboardClient 
      initialProfile={{
        ...profile,
        // ✅ FIX: Map 'streak' from reward or fall back to profile
        current_streak: dailyLoginReward?.streak ?? profile.current_streak,
        // ✅ FIX: The service now returns 'points_added', not 'xp_earned'
        xp: (profile.xp || 0) + (dailyLoginReward?.points_added || 0),
        // ✅ FIX: Gems logic removed from service for now, keeping profile gems
        gems: profile.gems || 0
      }}
      initialClasses={classes}
      initialModules={lecturerModules}
      initialStats={studentStats}
      dailyLoginReward={dailyLoginReward}
    />
  );
}