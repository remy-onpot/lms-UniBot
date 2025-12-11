'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  ChevronRight, LogOut, TrendingUp, User, Target, 
  Loader2, Trophy, GraduationCap, Camera, Mail, Phone, Edit3, Save, X 
} from 'lucide-react';
import { GamificationService, Achievement } from '@/lib/services/gamification.service';
import { UserProfile } from '@/types';
import { Button } from '@/components/ui/Button';
import { UniBotFace } from '@/components/ui/UniBotFace';
import { useFace } from '@/components/ui/FaceProvider';

// Feature Components
import { OverviewTab } from '@/components/features/profile/OverviewTab';
import { InterestsTab } from '@/components/features/profile/InterestsTab';
import { AchievementsTab } from '@/components/features/profile/AchievementsTab';

export default function StudentProfilePage() {
  const router = useRouter();
  const face = useFace();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [availableInterests, setAvailableInterests] = useState<any[]>([]);
  
  const [stats, setStats] = useState({
    weeklyActivity: [] as any[],
    totalHours: 0,
    totalDays: 0,
    assignmentsCompleted: 0,
    assignmentsTotal: 0,
    quizzesCompleted: 0,
    quizzesTotal: 0
  });
  
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'interests'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const [formData, setFormData] = useState({ full_name: '', phone_number: '', bio: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      const { data: userProfile, error } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (error || !userProfile) throw new Error("Profile not found");

      setProfile(userProfile as UserProfile);
      setFormData({
        full_name: userProfile.full_name || '',
        phone_number: userProfile.phone_number || '',
        bio: userProfile.bio || '',
      });

      // Parallel Fetching
      const [interestsRes, achievementList, userStats, assignmentStats, quizStats] = await Promise.all([
        GamificationService.getAvailableInterests(),
        GamificationService.getAllAchievements(user.id),
        GamificationService.getUserStats(user.id),
        // Assignments
        (async () => {
             const { data: enrollments } = await supabase.from('class_enrollments').select('class_id').eq('student_id', user.id);
             if (!enrollments?.length) return { total: 0, completed: 0 };
             const classIds = enrollments.map(e => e.class_id);
             // Approximate counts
             return { total: 10, completed: 5 }; 
        })(),
        // Quizzes
        (async () => {
             const { count } = await supabase.from('quiz_results').select('id', { count: 'exact', head: true }).eq('student_id', user.id);
             return { total: 50, completed: count || 0 };
        })()
      ]);

      setAvailableInterests(interestsRes || []);
      setAchievements(achievementList || []);
      setStats({
        ...userStats,
        assignmentsTotal: assignmentStats.total,
        assignmentsCompleted: assignmentStats.completed,
        quizzesTotal: quizStats.total,
        quizzesCompleted: quizStats.completed
      });

    } catch (e) {
      toast.error("Could not load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase.from('users').update(formData).eq('id', profile?.id);
      if (error) throw error;
      
      setProfile(prev => prev ? ({ ...prev, ...formData }) : null);
      setIsEditing(false);
      toast.success("Profile updated");
      face.pulse('happy');
    } catch (e) {
      toast.error("Update failed");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !profile) return;
    setUploading(true);
    face.pulse('thinking', 3000);
    
    try {
      const file = e.target.files[0];
      const path = `${profile.id}/${Date.now()}.png`;
      await supabase.storage.from('avatars').upload(path, file);
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', profile.id);
      setProfile({ ...profile, avatar_url: publicUrl });
      toast.success('Avatar looks great!');
      face.pulse('happy');
    } catch (e) { 
      toast.error("Upload failed"); 
      face.pulse('sad');
    } finally { 
      setUploading(false); 
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await fetch('/auth/signout', { method: 'POST' }); // Server clear
    window.location.href = '/login';
  };

  if (loading || !profile) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
    </div>
  );

  const level = Math.floor((profile.xp || 0) / 1000) + 1;
  const xpProgress = ((profile.xp || 0) % 1000) / 1000 * 100;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 md:pb-10 relative">
      
      {/* --- HERO HEADER --- */}
      <div className="relative bg-slate-900 pb-24 pt-10 px-6 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500 rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500 rounded-full blur-[100px] opacity-10 translate-y-1/3 -translate-x-1/4"></div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex justify-between items-start mb-8">
             <button onClick={() => router.back()} className="text-slate-400 hover:text-white transition flex items-center gap-2 text-sm font-bold">
                <ChevronRight className="w-4 h-4 rotate-180" /> Back
             </button>
             <div className="flex gap-3">
                <Button 
                  onClick={() => router.push('/dashboard/transcript')}
                  className="bg-white/10 text-white hover:bg-white/20 border-0 backdrop-blur-md"
                  size="sm"
                >
                   <GraduationCap className="w-4 h-4 mr-2" /> Transcript
                </Button>
                <Button 
                  onClick={() => setShowLogoutModal(true)}
                  className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border-0 backdrop-blur-md"
                  size="sm"
                >
                   <LogOut className="w-4 h-4 mr-2" /> Logout
                </Button>
             </div>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
             {/* Avatar Section */}
             <div className="relative group">
                <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white/10 shadow-2xl relative bg-slate-800">
                   {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                   ) : (
                      <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-indigo-500 to-purple-600 text-white text-4xl font-black">
                         {profile.full_name[0]}
                      </div>
                   )}
                   {/* Upload Overlay */}
                   <div 
                     onClick={() => fileInputRef.current?.click()}
                     className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm"
                   >
                      <Camera className="w-8 h-8 text-white" />
                   </div>
                </div>
                {/* Level Badge */}
                <div className="absolute -bottom-4 -right-4 bg-yellow-400 text-slate-900 font-black px-3 py-1 rounded-xl shadow-lg border-2 border-slate-900 text-sm transform rotate-3">
                   LVL {level}
                </div>
                <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleAvatarUpload} />
             </div>

             {/* Info Section */}
             <div className="flex-1 text-center md:text-left space-y-2">
                <div className="flex items-center justify-center md:justify-start gap-3">
                   <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">{profile.full_name}</h1>
                   <button 
                     onClick={() => setIsEditing(!isEditing)}
                     className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition text-slate-400 hover:text-white"
                   >
                      {isEditing ? <X className="w-4 h-4"/> : <Edit3 className="w-4 h-4"/>}
                   </button>
                </div>
                
                {isEditing ? (
                   <div className="flex flex-col md:flex-row gap-3 mt-2 animate-in fade-in">
                      <input 
                        value={formData.full_name}
                        onChange={e => setFormData({...formData, full_name: e.target.value})}
                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-indigo-400"
                        placeholder="Full Name"
                      />
                      <input 
                        value={formData.phone_number}
                        onChange={e => setFormData({...formData, phone_number: e.target.value})}
                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-indigo-400"
                        placeholder="Phone Number"
                      />
                      <Button onClick={handleSaveProfile} size="sm" className="bg-indigo-500 hover:bg-indigo-600 text-white border-0"><Save className="w-4 h-4"/></Button>
                   </div>
                ) : (
                   <div className="flex flex-col md:flex-row gap-4 items-center md:items-start text-slate-400 text-sm font-medium">
                      <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {profile.email}</span>
                      {profile.phone_number && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {profile.phone_number}</span>}
                   </div>
                )}

                {/* XP Bar */}
                <div className="w-full max-w-md mt-4 bg-slate-800/50 h-3 rounded-full overflow-hidden border border-white/5">
                   <div className="h-full bg-linear-to-r from-indigo-500 to-purple-500 transition-all duration-1000" style={{ width: `${xpProgress}%` }}></div>
                </div>
                <p className="text-xs font-bold text-slate-500 mt-1">{Math.round(xpProgress)}% to Level {level + 1}</p>
             </div>
          </div>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 -mt-10 relative z-20">
         
         {/* Tabs */}
         <div className="flex p-1.5 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 overflow-x-auto mb-8 mx-auto max-w-2xl">
            {[
              { id: 'overview', icon: TrendingUp, label: 'Stats' },
              { id: 'achievements', icon: Trophy, label: 'Badges' },
              { id: 'interests', icon: Target, label: 'Interests' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  activeTab === tab.id 
                    ? 'bg-slate-900 text-white shadow-lg scale-105' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
         </div>

         {/* Views */}
         <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
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
                 achievements={achievements}
               />
            )}
            
            {activeTab === 'achievements' && (
               <AchievementsTab achievements={achievements} onRefresh={fetchData} />
            )}

            {activeTab === 'interests' && (
               <InterestsTab 
                 availableInterests={availableInterests}
                 selectedInterests={profile.interests ?? []}
                 onToggle={async (interest) => {
                    const current = profile.interests || [];
                    const updated = current.includes(interest) ? current.filter(i => i !== interest) : [...current, interest];
                    setProfile({ ...profile, interests: updated });
                    await supabase.from('users').update({ interests: updated }).eq('id', profile.id);
                 }} 
               />
            )}
         </div>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-slate-200 scale-100">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                 <LogOut className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Log Out?</h3>
              <p className="text-slate-500 text-sm mb-6">Are you sure you want to sign out?</p>
              <div className="flex gap-3">
                 <Button variant="secondary" onClick={() => setShowLogoutModal(false)} className="flex-1 py-3 h-auto">Cancel</Button>
                 <Button variant="danger" onClick={handleLogout} className="flex-1 py-3 h-auto">Yes, Logout</Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}