import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { GamificationService } from '@/lib/services/gamification.service';
import { UserProfile } from '@/types';

export function useStudentProfile() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [availableInterests, setAvailableInterests] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  
  const [stats, setStats] = useState({
    weeklyActivity: [] as any[],
    totalHours: 0,
    totalDays: 0,
    assignmentsCompleted: 0,
    assignmentsTotal: 0,
    quizzesCompleted: 0,
    quizzesTotal: 0
  });

  // --- Initial Fetch ---
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user');

        const { data: userProfile, error } = await supabase.from('users').select('*').eq('id', user.id).single();
        if (error) throw error;
        setProfile(userProfile);

        // Parallel Fetching
        const [
          interestsRes, 
          gamificationStats, 
          achievementList,
          assignmentStats,
          quizStats
        ] = await Promise.all([
          GamificationService.getAvailableInterests(),
          GamificationService.getUserStats(user.id),
          GamificationService.getAllAchievements(user.id),
          
          // Assignment Stats
          (async () => {
             const { data: enrollments } = await supabase.from('class_enrollments').select('class_id').eq('student_id', user.id);
             if (!enrollments?.length) return { total: 0, completed: 0 };
             const classIds = enrollments.map(e => e.class_id);
             const { count: total } = await supabase.from('assignments').select('id', { count: 'exact', head: true }).in('course_id', (await supabase.from('courses').select('id').in('class_id', classIds)).data?.map(c => c.id) || []);
             const { count: completed } = await supabase.from('assignment_submissions').select('id', { count: 'exact', head: true }).eq('student_id', user.id);
             return { total: total || 0, completed: completed || 0 };
          })(),

          // Quiz Stats
          (async () => {
             const { count: completed } = await supabase.from('quiz_results').select('id', { count: 'exact', head: true }).eq('student_id', user.id);
             return { total: 50, completed: completed || 0 }; 
          })()
        ]);

        setAvailableInterests(interestsRes || []);
        setAchievements(achievementList || []);
        setStats({
          weeklyActivity: gamificationStats.weeklyActivity,
          totalHours: gamificationStats.totalHours,
          totalDays: gamificationStats.totalDays,
          assignmentsTotal: assignmentStats.total,
          assignmentsCompleted: assignmentStats.completed,
          quizzesTotal: quizStats.total,
          quizzesCompleted: quizStats.completed
        });

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // --- Actions ---

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    try {
      const { error } = await supabase.from('users').update(updates).eq('id', profile.id);
      if (error) throw error;
      setProfile({ ...profile, ...updates });
      toast.success('Profile updated!');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!profile) return;
    try {
      const path = `${profile.id}/${Date.now()}.png`;
      await supabase.storage.from('avatars').upload(path, file);
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await updateProfile({ avatar_url: publicUrl });
    } catch (e) {
      toast.error("Upload failed");
    }
  };

  return {
    loading,
    profile,
    stats,
    availableInterests,
    achievements,
    updateProfile,
    uploadAvatar
  };
}