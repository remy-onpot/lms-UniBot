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

// Lazy Load Wizard (Performance Optimization)
const OnboardingWizard = dynamic(() => import('@/components/OnboardingWizard'), { ssr: false });

interface DashboardClientProps {
  user: any;
  initialProfile: UserProfile;
}

export default function DashboardClient({ user, initialProfile }: DashboardClientProps) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [data, setData] = useState<any[]>([]); // Courses or Classes
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    // 1. Logic: Check Onboarding
    if (!profile.onboarding_completed) {
      setShowWizard(true);
    }

    // 🚀 PERFORMANCE: Parallelize all async operations
    const loadDashboard = async () => {
      try {
        // Run all async operations in parallel
        const [dashboardData, dailyLoginUpdates] = await Promise.allSettled([
          // Fetch Dashboard Data
          profile.role === 'student'
            ? CourseService.getStudentCourses(user.id)
            : ClassService.getDashboardClasses(user.id, profile.role, profile.is_course_rep),
          // Daily Login Bonus (Students Only) - non-blocking
          profile.role === 'student'
            ? GamificationService.checkDailyLogin(user.id)
            : Promise.resolve(null)
        ]);

        // Handle dashboard data
        if (dashboardData.status === 'fulfilled') {
          setData(dashboardData.value || []);
        } else {
          console.error("Dashboard Load Error:", dashboardData.reason);
        }

        // Handle daily login updates
        if (dailyLoginUpdates.status === 'fulfilled' && dailyLoginUpdates.value) {
          setProfile(prev => ({ ...prev, ...dailyLoginUpdates.value }));
        }
      } catch (e) {
        console.error("Dashboard Load Error:", e);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user.id, profile.role, profile.is_course_rep]);

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
        <LecturerDashboard profile={profile} classes={data} />
      ) : (
        <StudentDashboard profile={profile} courses={data} />
      )}
    </>
  );
}