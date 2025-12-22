'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  Search, Archive, Plus, Users, 
  ChevronRight, Loader2, Lock, 
  Sparkles, ArrowUpRight, Zap,
  LayoutGrid, GraduationCap, X
} from 'lucide-react';
import { getPlanLimits } from '@/lib/constants'; 
// ✅ FIX 1: Import Types correctly
import { Class as ClassData, UserProfile } from '@/types';
// ✅ FIX 2: Import Service Class
import { ClassService } from '@/lib/services/class.service';
import { OverLimitModal } from '@/components/features/lecturer/OverLimitModal';

export default function LecturerConsole() {
  const router = useRouter();
  
  // Services
  const classService = new ClassService(supabase);

  // State
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeClasses, setActiveClasses] = useState<ClassData[]>([]);
  const [archivedClasses, setArchivedClasses] = useState<ClassData[]>([]);
  const [limits, setLimits] = useState<any>({ max_classes: 1 });
  const [saasUsage, setSaasUsage] = useState(0);
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => { fetchLecturerData(); }, []);

  const fetchLecturerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      const { data: userProfile } = await supabase.from('users').select('*').eq('id', user.id).single();
      setProfile(userProfile);
      setLimits(getPlanLimits(userProfile.role, userProfile.plan_tier, userProfile.is_course_rep));

      // ✅ FIX 3: Use Instance Method
      const classes = await classService.getDashboardClasses();

      // Filter
      const active = classes.filter(c => c.status === 'active' || !c.status); // Default to active if null
      const archived = classes.filter(c => c.status === 'archived');
      
      setActiveClasses(active);
      setArchivedClasses(archived);
      setSaasUsage(active.filter(c => c.type === 'saas').length);

    } catch (e) {
      toast.error("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !profile) return;
    
    setJoining(true);
    try {
        // ✅ FIX 4: Use Service Instance Method
        await classService.joinClass(profile.id, joinCode.trim());

        toast.success(`Joined class successfully!`);
        setShowJoinModal(false);
        setJoinCode('');
        fetchLecturerData();
    } catch (error: any) {
        toast.error(error.message || "Failed to join class");
    } finally {
        setJoining(false);
    }
  };

  const filteredActive = activeClasses.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500"/>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-indigo-500/30">
      
      {/* 🌌 BACKGROUND GLOWS */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-violet-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pb-20">
        
        {/* 1. HEADER: GLASS DOCK STYLE */}
        <header className="py-8 flex flex-col md:flex-row justify-between items-end md:items-center gap-6 mb-12">
            <div className="flex items-center gap-6">
                {/* Organic Breathing Avatar */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[60%_40%_30%_70%/60%_30%_70%_40%] blur-md opacity-50 group-hover:opacity-100 transition duration-500 animate-[morph_8s_ease-in-out_infinite]"></div>
                    <div className="w-20 h-20 relative bg-slate-900 rounded-[60%_40%_30%_70%/60%_30%_70%_40%] overflow-hidden border border-white/10 shadow-2xl z-10">
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.full_name}`} alt="Profile" className="w-full h-full object-cover"/>
                    </div>
                </div>
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
                        {profile?.full_name}
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-mono uppercase tracking-wider">
                            {profile?.role || 'LECTURER'}
                        </span>
                        <span className="text-slate-500 text-sm">•</span>
                        <span className="text-slate-400 text-sm font-medium">{profile?.department || 'General Science'}</span>
                    </div>
                </div>
            </div>

            <div className="flex gap-3">
                 <button onClick={() => router.push('/dashboard/billing')} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-md transition text-sm font-medium">
                    Manage Billing
                 </button>
                 <button onClick={() => router.push('/dashboard/lecturer-profile/records')} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition text-sm font-bold flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4" /> Records
                 </button>
            </div>
        </header>

        {/* 2. STATS BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <BentoTile label="Total Students" value={activeClasses.reduce((acc, c) => acc + (c._count?.enrollments || 0), 0)} icon={<Users className="w-5 h-5 text-blue-400"/>} delay={0.1} />
            <BentoTile label="Active Classes" value={activeClasses.length} icon={<Zap className="w-5 h-5 text-yellow-400"/>} delay={0.2} />
            <BentoTile label="Avg. Engagement" value="84%" icon={<Sparkles className="w-5 h-5 text-purple-400"/>} delay={0.3} sub="Top 5% of Dept" />
        </div>

        {/* 3. CONTROLS BAR */}
        <div className="flex flex-col md:flex-row gap-4 items-center mb-8 sticky top-4 z-20 p-2 rounded-2xl bg-[#050505]/80 backdrop-blur-xl border border-white/5 shadow-2xl">
             <button 
                onClick={() => router.push('/dashboard/create-class')}
                className="w-full md:w-auto px-6 py-3 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
             >
                <Plus className="w-4 h-4" /> Create Class
             </button>

             <button 
                onClick={() => setShowJoinModal(true)}
                className="w-full md:w-auto px-6 py-3 bg-white/5 text-white border border-white/10 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
             >
                <GraduationCap className="w-4 h-4 text-slate-400" /> Join Class
             </button>

             <div className="flex-1 w-full relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    placeholder="Search your classes..." 
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-500/50 focus:bg-white/10 outline-none text-slate-200 placeholder:text-slate-600 transition-all" 
                />
             </div>

             <button 
                onClick={() => setShowArchived(!showArchived)}
                className={`px-4 py-3 rounded-xl border transition-all ${showArchived ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'}`}
             >
                <Archive className="w-5 h-5" />
             </button>
        </div>

        {/* 4. CLASS TILES GRID */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
                {filteredActive.map((cls, idx) => (
                    <motion.div 
                        key={cls.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group relative bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-3xl p-6 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 hover:-translate-y-1"
                    >
                        {/* Glow Effect on Hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-xs font-mono text-slate-400 group-hover:text-white transition-colors">
                                    {cls.access_code}
                                </div>
                                <div className="flex -space-x-2">
                                    {[...Array(Math.min(3, cls._count?.enrollments || 0))].map((_, i) => (
                                        <div key={i} className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700"></div>
                                    ))}
                                    {(cls._count?.enrollments || 0) > 3 && (
                                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[8px] text-slate-400">
                                            +{cls._count!.enrollments - 3}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-slate-200 mb-2 group-hover:text-white transition-colors truncate">{cls.name}</h3>
                            <p className="text-sm text-slate-500 mb-8 line-clamp-2 min-h-[40px]">{cls.description || 'No description provided.'}</p>

                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => router.push(`/dashboard/class/${cls.id}/students`)}
                                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-bold transition flex items-center justify-center gap-2"
                                >
                                    <Users className="w-3 h-3" /> Roster
                                </button>
                                <button 
                                    onClick={() => router.push(`/dashboard/class/${cls.id}`)}
                                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                                >
                                    Enter <ArrowUpRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>

      </div>

      {/* JOIN MODAL */}
      <AnimatePresence>
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md" 
                onClick={() => setShowJoinModal(false)}
             />
             <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#0A0A0A] border border-white/10 p-8 rounded-3xl w-full max-w-md relative z-10 shadow-2xl"
             >
                 <button onClick={() => setShowJoinModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
                 <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4">
                    <GraduationCap className="w-6 h-6 text-indigo-400" />
                 </div>
                 <h2 className="text-2xl font-bold text-white mb-2">Join a Workspace</h2>
                 <p className="text-slate-500 text-sm mb-6">Enter the 6-character access code to join a peer's class.</p>
                 
                 <form onSubmit={handleJoinClass} className="space-y-4">
                     <input 
                        autoFocus
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="CS-X9Y"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-center text-2xl font-mono tracking-[0.5em] text-white focus:border-indigo-500 focus:bg-white/10 outline-none transition-all uppercase placeholder:tracking-normal placeholder:text-base placeholder:font-sans"
                        maxLength={6}
                     />
                     <button 
                        disabled={joining}
                        className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                     >
                        {joining ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Join Now'}
                     </button>
                 </form>
             </motion.div>
        </div>
      )}
      </AnimatePresence>

      <OverLimitModal activeClasses={activeClasses} limit={limits.max_classes} onArchive={() => {}} />
    </div>
  );
}

// ✨ Micro-Component: Bento Tile
function BentoTile({ label, value, icon, sub, delay = 0 }: any) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
            className="bg-white/[0.02] backdrop-blur-sm border border-white/5 p-6 rounded-3xl flex items-center justify-between hover:bg-white/[0.04] transition-colors group"
        >
            <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-slate-200 group-hover:text-white transition-colors">{value}</h3>
                    {sub && <span className="text-[10px] text-indigo-400 font-medium bg-indigo-500/10 px-1.5 py-0.5 rounded">{sub}</span>}
                </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                {icon}
            </div>
        </motion.div>
    )
}