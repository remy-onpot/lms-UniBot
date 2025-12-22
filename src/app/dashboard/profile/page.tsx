'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  LogOut, TrendingUp, Trophy, Target, 
  Camera, Edit3, Save, X, Share2, 
  Hexagon, Zap, Brain, Rocket, Clock
} from 'lucide-react';

// ✅ FIX 1: Import Types from central location
import { UserProfile, Achievement } from '@/types';
// ✅ FIX 2: Import Service Class
import { GamificationService } from '@/lib/services/gamification.service';

// --- VISUAL COMPONENTS ---

// 1. The Progress Orb (Profile Picture)
const ProgressOrb = ({ avatarUrl, level, progress, onUpload }: any) => {
  return (
    <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center group">
      {/* Outer Rotating Rings */}
      <motion.div 
        animate={{ rotate: 360 }} 
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-full border border-dashed border-indigo-500/30"
      />
      <motion.div 
        animate={{ rotate: -360 }} 
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute inset-2 rounded-full border border-dotted border-purple-500/30"
      />
      
      {/* Progress SVG Ring */}
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="50%" cy="50%" r="48%" fill="none" stroke="#1e293b" strokeWidth="4" />
        <motion.circle 
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progress / 100 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          cx="50%" cy="50%" r="48%" 
          fill="none" 
          stroke="url(#gradient)" 
          strokeWidth="4" 
          strokeLinecap="round" 
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>

      {/* Avatar Container */}
      <div className="relative w-[80%] h-[80%] rounded-full overflow-hidden border-4 border-slate-900 bg-slate-800 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
        {avatarUrl ? (
             // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                <UserIconPlaceholder />
            </div>
        )}
        
        {/* Upload Overlay */}
        <div onClick={onUpload} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
            <Camera className="w-8 h-8 text-white drop-shadow-lg" />
        </div>
      </div>

      {/* Level Badge (Floating) */}
      <div className="absolute -bottom-2 bg-indigo-600 text-white font-black px-4 py-1 rounded-full shadow-lg border-4 border-slate-900 z-20 flex items-center gap-2">
         <span className="text-xs text-indigo-200">LVL</span>
         <span className="text-lg">{level}</span>
      </div>
    </div>
  );
};

// 2. Spider Chart (Skill Web) - Simplified SVG Implementation
const SkillWeb = () => {
  return (
    <div className="relative w-full aspect-square max-w-[300px] flex items-center justify-center mx-auto">
        {/* Grid Lines */}
        <svg viewBox="0 0 100 100" className="w-full h-full opacity-20">
            <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-indigo-500" />
            <polygon points="50,25 75,37.5 75,62.5 50,75 25,62.5 25,37.5" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-indigo-500" />
            <line x1="50" y1="50" x2="50" y2="10" stroke="currentColor" strokeWidth="0.5" />
            <line x1="50" y1="50" x2="90" y2="30" stroke="currentColor" strokeWidth="0.5" />
            <line x1="50" y1="50" x2="90" y2="70" stroke="currentColor" strokeWidth="0.5" />
            <line x1="50" y1="50" x2="50" y2="90" stroke="currentColor" strokeWidth="0.5" />
            <line x1="50" y1="50" x2="10" y2="70" stroke="currentColor" strokeWidth="0.5" />
            <line x1="50" y1="50" x2="10" y2="30" stroke="currentColor" strokeWidth="0.5" />
        </svg>

        {/* The Data Shape (Pulsing) */}
        <motion.svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
             {/* Example Data: Logic (Top), Speed (TR), etc. */}
             <motion.polygon 
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.6, scale: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
                points="50,15 80,40 70,75 50,80 30,65 20,40" 
                fill="rgba(168, 85, 247, 0.4)" 
                stroke="#a855f7" 
                strokeWidth="2"
             />
        </motion.svg>

        {/* Labels */}
        <div className="absolute top-0 text-[10px] font-bold text-indigo-400">LOGIC</div>
        <div className="absolute top-[25%] right-0 text-[10px] font-bold text-indigo-400">SPEED</div>
        <div className="absolute bottom-[25%] right-0 text-[10px] font-bold text-indigo-400">CREATIVITY</div>
        <div className="absolute bottom-0 text-[10px] font-bold text-indigo-400">FOCUS</div>
        <div className="absolute bottom-[25%] left-0 text-[10px] font-bold text-indigo-400">MEMORY</div>
        <div className="absolute top-[25%] left-0 text-[10px] font-bold text-indigo-400">TEAMWORK</div>
    </div>
  );
};

// 3. 3D Badge Tile
const BadgeTile = ({ achievement }: { achievement: Achievement }) => {
    return (
        <motion.div 
            whileHover={{ scale: 1.05, rotateX: 5, rotateY: 5 }}
            className="relative bg-slate-800/50 border border-white/10 p-4 rounded-xl flex flex-col items-center justify-center text-center group cursor-pointer"
        >
            <div className="w-16 h-16 mb-3 relative">
                 <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <img src={achievement.badge_url || '/badges/generic.png'} alt="Badge" className="w-full h-full object-contain relative z-10 drop-shadow-lg" />
            </div>
            <h4 className="text-xs font-bold text-slate-200 group-hover:text-yellow-400 transition-colors">{achievement.title}</h4>
            <p className="text-[10px] text-slate-500 mt-1">{achievement.description}</p>
        </motion.div>
    )
}

// --- MAIN PAGE ---

// Fix Type for Interests locally until global types are updated
type ExtendedProfile = UserProfile & { interests?: string[] };

export default function StudentProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Services
  // ✅ FIX 3: Instantiate Service
  const gamificationService = new GamificationService(supabase);

  // State
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [availableInterests, setAvailableInterests] = useState<string[]>([]);
  
  const [stats, setStats] = useState({
    totalHours: 0,
    assignmentsCompleted: 0,
    quizzesCompleted: 0
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', bio: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // 1. Fetch Profile
      const { data: userProfile, error } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (error || !userProfile) throw new Error("Profile not found");

      setProfile(userProfile as ExtendedProfile);
      setFormData({
        full_name: userProfile.full_name || '',
        bio: userProfile.bio || '',
      });

      // 2. Parallel Fetching for Stats
      const [interestsRes, achievementList, userStats] = await Promise.all([
        gamificationService.getAvailableInterests(),
        gamificationService.getAllAchievements(user.id),
        gamificationService.getUserStats(user.id)
      ]);

      setAvailableInterests(interestsRes || []);
      setAchievements(achievementList || []);
      setStats({
        totalHours: userStats.totalHours,
        assignmentsCompleted: userStats.assignmentsCompleted,
        quizzesCompleted: userStats.quizzesCompleted
      });

    } catch (e) {
      toast.error("Could not load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    try {
      const { error } = await supabase.from('users').update(formData).eq('id', profile.id);
      if (error) throw error;
      setProfile({ ...profile, ...formData });
      setIsEditing(false);
      toast.success("Profile updated");
    } catch (e) { toast.error("Update failed"); }
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
    } catch (e) { toast.error("Upload failed"); } 
    finally { setUploading(false); }
  };

  if (loading || !profile) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><div className="animate-spin text-indigo-500 text-4xl">❖</div></div>;

  const level = Math.floor((profile.xp || 0) / 1000) + 1;
  const xpProgress = ((profile.xp || 0) % 1000) / 10; // Percentage

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      
      {/* 🌌 SCIFI BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[50vw] h-[50vw] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-[40vw] h-[40vw] bg-purple-600/10 rounded-full blur-[100px]"></div>
          {/* Scanlines */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-8">
        
        {/* TOP BAR */}
        <div className="flex justify-between items-center mb-12">
             <button onClick={() => router.back()} className="text-slate-500 hover:text-white transition flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                 <LogOut className="w-4 h-4 rotate-180" /> Dashboard
             </button>
             <div className="flex gap-4">
                 <button onClick={() => router.push('/dashboard/transcript')} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition text-xs font-bold uppercase flex items-center gap-2">
                     <Save className="w-4 h-4" /> Transcript
                 </button>
                 <button onClick={() => { supabase.auth.signOut(); router.push('/login'); }} className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition text-xs font-bold uppercase">
                     Log Out
                 </button>
             </div>
        </div>

        {/* HERO SECTION (PLAYER CARD) */}
        <div className="grid lg:grid-cols-[1fr_2fr] gap-8 mb-16">
            
            {/* Left: Avatar & Stats Orb */}
            <div className="flex flex-col items-center">
                <ProgressOrb 
                    avatarUrl={profile.avatar_url} 
                    level={level} 
                    progress={xpProgress} 
                    onUpload={() => fileInputRef.current?.click()}
                />
                <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleAvatarUpload} />
                
                <div className="mt-8 text-center w-full">
                    {isEditing ? (
                        <div className="space-y-3 animate-in fade-in">
                            <input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-center text-white" placeholder="Name" />
                            <textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-center text-white text-sm min-h-[80px]" placeholder="Bio..." />
                            <div className="flex gap-2 justify-center">
                                <button onClick={handleSaveProfile} className="px-4 py-1 bg-indigo-600 rounded text-xs font-bold">Save</button>
                                <button onClick={() => setIsEditing(false)} className="px-4 py-1 bg-slate-700 rounded text-xs font-bold">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-3xl font-black text-white tracking-tight mb-1 flex items-center justify-center gap-2">
                                {profile.full_name}
                                <Edit3 onClick={() => setIsEditing(true)} className="w-4 h-4 text-slate-600 hover:text-white cursor-pointer transition" />
                            </h1>
                            <p className="text-indigo-400 text-sm font-mono uppercase tracking-widest mb-4">{profile.role || 'SCHOLAR'}</p>
                            <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">{profile.bio || "No bio yet. Ready to learn."}</p>
                        </>
                    )}
                </div>

                {/* Social/Action Row */}
                <div className="flex gap-4 mt-6">
                    <ActionButton icon={<Share2 className="w-4 h-4"/>} label="Share" />
                    <ActionButton icon={<Zap className="w-4 h-4 text-yellow-400"/>} label="Boost" active />
                </div>
            </div>

            {/* Right: Data & Spider Chart */}
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 backdrop-blur-sm flex flex-col md:flex-row gap-8">
                 {/* Skill Web */}
                 <div className="flex-1 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5 pb-8 md:pb-0 md:pr-8">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Skill Matrix</h3>
                      <SkillWeb />
                 </div>
                 
                 {/* Stats Grid */}
                 <div className="flex-1 grid grid-cols-1 gap-4">
                      <StatRow icon={<Clock className="w-5 h-5 text-blue-400"/>} label="Hours Learned" value={`${stats.totalHours}h`} />
                      <StatRow icon={<Brain className="w-5 h-5 text-purple-400"/>} label="Quizzes Aced" value={stats.quizzesCompleted} />
                      <StatRow icon={<Target className="w-5 h-5 text-green-400"/>} label="Assignments" value={stats.assignmentsCompleted} />
                      <StatRow icon={<Rocket className="w-5 h-5 text-orange-400"/>} label="Current Streak" value={`${profile.current_streak || 0} Days`} />
                      
                      <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                          <div className="flex justify-between text-xs font-bold mb-2">
                              <span className="text-indigo-300">NEXT LEVEL PROGRESS</span>
                              <span className="text-white">{Math.round(xpProgress)}%</span>
                          </div>
                          <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }} 
                                animate={{ width: `${xpProgress}%` }} 
                                transition={{ duration: 1.5, delay: 0.5 }}
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" 
                              />
                          </div>
                      </div>
                 </div>
            </div>
        </div>

        {/* INVENTORY (BADGES) */}
        <div className="mb-16">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                <Hexagon className="w-6 h-6 text-indigo-500" /> 
                BADGE INVENTORY <span className="text-slate-600 text-sm font-normal">({achievements.length})</span>
            </h3>
            
            {achievements.length === 0 ? (
                 <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                     <p className="text-slate-500">No badges earned yet. Complete your first quiz!</p>
                 </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {achievements.map((ach) => (
                        <BadgeTile key={ach.id} achievement={ach} />
                    ))}
                    {/* Locked Slots for effect */}
                    {[1,2,3].map(i => (
                        <div key={i} className="bg-white/[0.01] border border-white/5 rounded-xl p-4 flex items-center justify-center opacity-50">
                            <Trophy className="w-8 h-8 text-slate-800" />
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* INTERESTS (Traits) */}
        <div>
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                <Zap className="w-6 h-6 text-yellow-500" /> 
                CHARACTER TRAITS
            </h3>
            <div className="flex flex-wrap gap-3">
                {availableInterests.map(interest => {
                     const isSelected = (profile.interests || []).includes(interest);
                     return (
                         <button 
                            key={interest}
                            onClick={async () => {
                                const current = profile.interests || [];
                                const updated = current.includes(interest) ? current.filter(i => i !== interest) : [...current, interest];
                                setProfile({ ...profile, interests: updated });
                                await supabase.from('users').update({ interests: updated }).eq('id', profile.id);
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                                isSelected 
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' 
                                : 'bg-transparent border-white/10 text-slate-500 hover:border-white/30 hover:text-slate-300'
                            }`}
                         >
                            {interest}
                         </button>
                     )
                })}
            </div>
        </div>

      </div>
    </div>
  );
}

// Helpers
const ActionButton = ({ icon, label, active }: any) => (
    <button className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${active ? 'bg-white text-black hover:bg-slate-200' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>
        {icon} {label}
    </button>
)

const StatRow = ({ icon, label, value }: any) => (
    <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg">{icon}</div>
            <span className="text-sm text-slate-400 font-medium">{label}</span>
        </div>
        <span className="text-lg font-bold text-white">{value}</span>
    </div>
)

const UserIconPlaceholder = () => (
    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
)