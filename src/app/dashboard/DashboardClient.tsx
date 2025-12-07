'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UserProfile } from '../../types';
import { CourseService } from '@/lib/services/course.service';
import { ClassService } from '@/lib/services/class.service';
import { StudentDashboard } from '@/components/features/dashboard/StudentDashboard';
import { LecturerDashboard } from '@/components/features/dashboard/LecturerDashboard';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { GamificationService } from '@/lib/services/gamification.service';
import dynamic from 'next/dynamic';

// Onboarding Wizard (Only loaded if needed)
const OnboardingWizard = dynamic(() => import('../../components/OnboardingWizard'), { ssr: false });

interface DashboardClientProps {
  user: any;
  initialProfile: UserProfile | null;
}

export default function DashboardClient({ user, initialProfile }: DashboardClientProps) {
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [data, setData] = useState<any[]>([]); // Holds either Courses (Student) or Classes (Lecturer)
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    // 1. Check Onboarding
    if (initialProfile && !initialProfile.onboarding_completed) {
      setShowWizard(true);
    }

    // 2. Check Daily Login (Gamification) - Students Only
    if (user && initialProfile?.role === 'student') {
      GamificationService.checkDailyLogin(user.id).then((res: any) => {
         if (res) {
           setProfile(prev => prev ? ({ ...prev, ...res }) : null);
         }
      });
    }
  }, [user, initialProfile]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !profile) return;

      try {
        if (profile.role === 'student') {
          // STUDENTS: Get "My Courses" (Modules)
          // They see: "Biology 101", "Calculus I"
          const courses = await CourseService.getStudentCourses(user.id);
          setData(courses);
        } else {
          // LECTURERS: Get "My Classes" (Cohorts)
          // They see: "Biology Class A", "Math Group B"
          // Note: isCourseRep logic is handled inside service, but reps mainly use student view unless managing
          const classes = await ClassService.getDashboardClasses(user.id, profile.role, profile.is_course_rep);
          setData(classes);
        }
      } catch (e) {
        console.error("Dashboard data load failed:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, profile]);

  if (loading || !profile) return <DashboardSkeleton />;

  return (
    <>
      {showWizard && (
        <OnboardingWizard 
          userId={user.id} 
          role={profile.role as any} 
          isCourseRep={profile.is_course_rep || false} 
          onComplete={() => { setShowWizard(false); window.location.reload(); }} 
        />
      )}

      {/* ✅ Role-Based Rendering */}
      {profile.role === 'lecturer' || profile.role === 'super_admin' ? (
        <LecturerDashboard profile={profile} classes={data} />
      ) : (
        <StudentDashboard profile={profile} courses={data} />
      )}
    </>
  );
}