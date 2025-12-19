'use client';

import { useEffect, useState } from 'react';
import { UserProfile } from '@/types';
import { CourseService } from '@/lib/services/course.service';
import { ClassService } from '@/lib/services/class.service';
import { StudentDashboard } from '@/components/features/dashboard/StudentDashboard';
import { LecturerDashboard } from '@/components/features/dashboard/LecturerDashboard';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { GamificationService } from '@/lib/services/gamification.service';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';

// Lazy Load Wizard (Performance Optimization)
const OnboardingWizard = dynamic(() => import('@/components/OnboardingWizard'), { ssr: false });

interface DashboardClientProps {
  user: any;
  initialProfile: UserProfile;
}

export default function DashboardClient({ user, initialProfile }: DashboardClientProps) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  
  // State for different data types
  const [classesData, setClassesData] = useState<any[]>([]); // Sessions/Groups (The "6" items)
  const [modulesData, setModulesData] = useState<any[]>([]); // Unique Courses (The "1" item)
  
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    // 1. Logic: Check Onboarding
    if (!profile.onboarding_completed) {
      setShowWizard(true);
    }

    const loadDashboard = async () => {
      try {
        // 🚀 PERFORMANCE: Parallelize all async operations
        // We use Promise.allSettled so one failure doesn't crash the whole dashboard
        const [
            mainDataResult,   // Student Courses OR Lecturer Classes (Schedule)
            dailyLoginResult, // Student Bonus
            lecturerModulesResult // Lecturer Courses (Content/Modules)
        ] = await Promise.allSettled([
          
          // 1. Fetch Main List (Classes/Sessions)
          profile.role === 'student'
            ? CourseService.getStudentCourses(user.id)
            : ClassService.getDashboardClasses(user.id), 

          // 2. Daily Login Bonus (Students Only)
          profile.role === 'student'
            ? GamificationService.checkDailyLogin(user.id)
            : Promise.resolve(null),

          // 3. Fetch Unique Modules (Lecturers Only) - Fixes the "6 vs 1" issue
          profile.role === 'lecturer'
            ? CourseService.getLecturerCourses(user.id)
            : Promise.resolve([])
        ]);

        // --- HANDLE RESULTS ---

        // A. Handle Classes/Sessions Data
        if (mainDataResult.status === 'fulfilled') {
          setClassesData(mainDataResult.value || []);
        } else {
          console.error("Dashboard Classes Load Error:", mainDataResult.reason);
          toast.error("Failed to load classes");
        }

        // B. Handle Lecturer Modules Data
        if (lecturerModulesResult.status === 'fulfilled' && profile.role === 'lecturer') {
          setModulesData(lecturerModulesResult.value || []);
        }

        // C. Handle Daily Login
        if (dailyLoginResult.status === 'fulfilled' && dailyLoginResult.value) {
          setProfile(prev => ({ ...prev, ...dailyLoginResult.value }));
          toast.success("Daily login bonus collected! 💎");
        }

      } catch (e) {
        console.error("Critical Dashboard Error:", e);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user.id, profile.role, profile.onboarding_completed]);

  if (loading) return <DashboardSkeleton />;

  return (
    <>
      {showWizard && (
        <OnboardingWizard 
          userId={user.id} 
          role={profile.role as any} 
          isCourseRep={profile.is_course_rep} 
          onComplete={() => { setShowWizard(false); window.location.reload(); }} 
        />
      )}

      {/* Role-Based UI Rendering */}
      {profile.role === 'lecturer' || profile.role === 'super_admin' ? (
        <LecturerDashboard 
            profile={profile} 
            classes={classesData} // The 6 Classes (for schedule/groups)
            modules={modulesData} // The 1 Module (for content/stats)
        />
      ) : (
        <StudentDashboard 
            profile={profile} 
            courses={classesData} // Students see a unified list
        />
      )}
    </>
  );
}