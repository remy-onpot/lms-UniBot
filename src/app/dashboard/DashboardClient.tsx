'use client';

import { useState, useEffect } from 'react';
import { UserProfile, Class } from '@/types';
import StudentDashboard from '@/components/features/dashboard/StudentDashboard';
import LecturerDashboard from '@/components/features/dashboard/LecturerDashboard';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';

const OnboardingWizard = dynamic(() => import('@/components/OnboardingWizard'), { ssr: false });

interface DashboardClientProps {
  initialProfile: UserProfile;
  initialClasses: Class[];
  initialModules: any[];
  initialStats: any;
  dailyLoginReward: any;
}

export default function DashboardClient({ 
  initialProfile, 
  initialClasses, 
  initialModules,
  initialStats,
  dailyLoginReward 
}: DashboardClientProps) {
  
  const [profile] = useState<UserProfile>(initialProfile);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    // 1. Check Onboarding
    if (!profile.onboarding_completed) {
      setShowWizard(true);
    }

    // 2. Show Daily Login Toast (This logic was preserved!)
    // If the server detected a daily login reward, we show it here on mount.
    if (dailyLoginReward) {
      // Use a small timeout to ensure the UI is ready
      setTimeout(() => {
        toast.success(`Daily login bonus! +${dailyLoginReward.xpEarned} XP`, {
          duration: 5000,
          icon: '💎'
        });
      }, 1000);
    }
  }, [profile.onboarding_completed, dailyLoginReward]);

  return (
    <>
      {showWizard && (
        <OnboardingWizard 
          userId={profile.id} 
          role={profile.role as any} 
          isCourseRep={profile.is_course_rep} 
          onComplete={() => { setShowWizard(false); window.location.reload(); }} 
        />
      )}

      {profile.role === 'lecturer' || profile.role === 'super_admin' ? (
        <LecturerDashboard 
            profile={profile} 
            classes={initialClasses} 
            modules={initialModules} 
        />
      ) : (
        <StudentDashboard 
            profile={profile} 
            classes={initialClasses} 
            stats={initialStats}
        />
      )}
    </>
  );
}