'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronRight, LogOut, TrendingUp, User, Target, Loader2, Trophy, GraduationCap } from 'lucide-react';
import { GamificationService, Achievement } from '@/lib/services/gamification.service';
import { UserProfile } from '@/types';
import { Button } from '@/components/ui/Button';

// Feature Components
import { ProfileHeader } from '@/components/features/profile/ProfileHeader';
import { OverviewTab } from '@/components/features/profile/OverviewTab';
import { EditProfileTab } from '@/components/features/profile/EditProfileTab';
import { InterestsTab } from '@/components/features/profile/InterestsTab';
import { AchievementsTab } from '@/components/features/profile/AchievementsTab';

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Trigger re-fetches
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [availableInterests, setAvailableInterests] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  
  const [stats, setStats] = useState({
    weeklyActivity: [] as any[],
    totalHours: 0,
    totalDays: 0,
    assignmentsCompleted: 0,
    assignmentsTotal: 0,
    quizzesCompleted: 0,
    quizzesTotal: 0
  });
  
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'profile' | 'interests'>('overview');
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const [formData, setFormData] = useState({ full_name: '', phone_number: '', bio: '', email: '' });

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return router.push('/login');

        const { data: userProfile, error } = await supabase.from('users').select('*').eq('id', user.id).single();
        if (error || !userProfile) {
          toast.error("Failed to load profile");
          return setLoading(false);
        }

        setProfile(userProfile as UserProfile);
        setFormData({
          full_name: userProfile.full_name || '',
          phone_number: userProfile.phone_number || '',
          bio: userProfile.bio || '',
          email: user.email || ''
        });

        // Parallel Data Fetching
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
          
          // Assignments
          (async () => {
             const { data: enrollments } = await supabase.from('class_enrollments').select('class_id').eq('student_id', user.id);
             if (!enrollments?.length) return { total: 0, completed: 0 };
             const classIds = enrollments.map(e => e.class_id);
             const { count: total } = await supabase.from('assignments').select('id', { count: 'exact', head: true }).in('course_id', (await supabase.from('courses').select('id').in('class_id', classIds)).data?.map(c => c.id) || []);
             const { count: completed } = await supabase.from('assignment_submissions').select('id', { count: 'exact', head: true }).eq('student_id', user.id);
             return { total: total || 0, completed: completed || 0 };
          })(),

          // Quizzes
          (async () => {
             const { count: completed } = await supabase.from('quiz_results').select('id', { count: 'exact', head: true }).eq('student_id', user.id);
             return { total: 50, completed: completed || 0 }; // Simplified total
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
        console.error("Profile load error:", e);
        toast.error("Could not load data");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router, refreshKey]);

  const handleSave = async (field: string) => {
    try {
      const { error } = await supabase.from('users').update({ [field]: (formData as any)[field] }).eq('id', profile?.id);
      if (error) throw error;
      toast.success('Saved!');
      setEditMode({ ...editMode, [field]: false });
      if (profile) setProfile({ ...profile, [field]: (formData as any)[field] });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !profile) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      const path = `${profile.id}/${Date.now()}.png`;
      await supabase.storage.from('avatars').upload(path, file);
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', profile.id);
      setProfile({ ...profile, avatar_url: publicUrl });
      toast.success('Avatar updated!');
    } catch (e: any) { toast.error("Upload failed"); } 
    finally { setUploading(false); }
  };

  const handleToggleInterest = async (interestName: string) => {
    if (!profile) return;
    const current = profile.interests || [];
    const updated = current.includes(interestName) ? current.filter(i => i !== interestName) : [...current, interestName];
    setProfile({ ...profile, interests: updated }); 
    await supabase.from('users').update({ interests: updated }).eq('id', profile.id);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  if (loading || !profile) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600 w-8 h-8" /></div>;

  const level = Math.floor((profile.xp || 0) / 1000) + 1;
  const currentLevelXp = (profile.xp || 0) % 1000;
  const xpProgress = (currentLevelXp / 1000) * 100;
  const maxXp = Math.max(...stats.weeklyActivity.map(d => d.xp), 100);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 md:pb-10">
      
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm">
            <ChevronRight className="w-4 h-4 rotate-180" /> Back
          </button>
          <div className="flex items-center gap-3">
             {/* ✅ TRANSCRIPT BUTTON */}
             <Button 
                onClick={() => router.push('/dashboard/transcript')} 
                variant="outline" 
                size="sm"
                className="hidden sm:flex items-center gap-2 bg-slate-50 hover:bg-slate-100"
             >
                <GraduationCap className="w-4 h-4 text-indigo-600" /> Transcript
             </Button>
             
             <Button variant="ghost" size="sm" onClick={() => setShowLogoutModal(true)} className="text-red-500 hover:bg-red-50">
                <LogOut className="w-4 h-4 mr-2" /> Logout
             </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        
        {/* Profile Header */}
        <ProfileHeader 
          profile={profile} 
          fullName={formData.full_name}
          level={level}
          currentLevelXp={currentLevelXp}
          xpForNextLevel={1000}
          xpProgress={xpProgress}
          uploading={uploading}
          onAvatarClick={() => fileInputRef.current?.click()}
        />
        <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleAvatarUpload} />

        {/* Tabs */}
        <div className="flex p-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
           {['overview', 'achievements', 'profile', 'interests'].map((tab) => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab as any)}
               className={`flex-1 min-w-[100px] py-3 text-sm font-bold rounded-xl transition-all capitalize flex items-center justify-center gap-2 ${
                 activeTab === tab ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
               }`}
             >
               {tab === 'overview' && <TrendingUp className="w-4 h-4" />}
               {tab === 'achievements' && <Trophy className="w-4 h-4" />}
               {tab === 'profile' && <User className="w-4 h-4" />}
               {tab === 'interests' && <Target className="w-4 h-4" />}
               {tab}
             </button>
           ))}
        </div>

        {/* Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'overview' && (
            <OverviewTab 
              currentXp={profile.xp || 0} 
              totalHours={stats.totalHours} 
              totalDays={stats.totalDays}
              assignmentsCompleted={stats.assignmentsCompleted}
              assignmentsTotal={stats.assignmentsTotal}
              quizzesCompleted={stats.quizzesCompleted}
              quizzesTotal={stats.quizzesTotal}
              weeklyActivity={stats.weeklyActivity} 
              achievements={achievements} // Pass Real Badges
            />
          )}

          {activeTab === 'achievements' && (
             <AchievementsTab 
               achievements={achievements} 
               onRefresh={() => setRefreshKey(prev => prev + 1)} // Sync Trigger
             />
          )}

          {activeTab === 'profile' && (
            <EditProfileTab 
              formData={formData} 
              editMode={editMode}
              onChange={(f, v) => setFormData(prev => ({ ...prev, [f]: v }))}
              onEdit={(f) => setEditMode({ ...editMode, [f]: true })}
              onCancel={(f) => setEditMode({ ...editMode, [f]: false })}
              onSave={handleSave}
            />
          )}

          {activeTab === 'interests' && (
            <InterestsTab 
              availableInterests={availableInterests}
              selectedInterests={profile.interests ?? []} 
              onToggle={handleToggleInterest}
            />
          )}
        </div>
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-xl font-black mb-4">Log Out?</h3>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowLogoutModal(false)} className="flex-1">Cancel</Button>
              <Button variant="danger" onClick={handleLogout} className="flex-1">Log Out</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}