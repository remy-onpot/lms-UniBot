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

    // 2. Logic: Daily Login Bonus (Students Only)
    if (profile.role === 'student') {
      GamificationService.checkDailyLogin(user.id).then((updates: any) => {
         if (updates) setProfile(prev => ({ ...prev, ...updates }));
      });
    }

    // 3. Logic: Fetch Dashboard Data
    const fetchData = async () => {
      try {
        if (profile.role === 'student') {
          // Student: Fetch Modules
          const courses = await CourseService.getStudentCourses(user.id);
          setData(courses || []);
        } else {
          // Lecturer: Fetch Classes (SaaS + Cohort)
          // We pass 'true' for isRep if they are a rep, though lecturers usually aren't.
          const classes = await ClassService.getDashboardClasses(user.id, profile.role, profile.is_course_rep);
          setData(classes || []);
        }
      } catch (e) {
        console.error("Dashboard Load Error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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