'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useMotionValue, useSpring, useTransform, Variants } from 'framer-motion';
import { UserProfile, Class } from '@/types';
import { UniBotMascot, MascotEmotion, MascotAction } from '@/components/ui/UniBotMascot';
import { 
  BookOpen, Clock, ArrowUpRight, Zap, Target, 
  Terminal, Activity, Shield, Sparkles, Filter
} from 'lucide-react';
import { JoinClassModal } from '@/components/features/dashboard/modals/JoinClassModal';

// --- TYPES ---
interface StudentStats {
  activeCourses: number;
  upcomingAssignments: number;
  nextDeadline: string | null;
}

interface StudentDashboardProps {
  profile: UserProfile;
  classes: Class[];
  stats?: StudentStats | null;
}

// --- UTILS ---
const springConfig = { stiffness: 400, damping: 30 };

// --- COMPONENTS ---

function TiltCard({ children, className, onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, springConfig);
  const mouseY = useSpring(y, springConfig);

  const rotateX = useTransform(mouseY, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-15deg", "15deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-[20px] border border-white/10 shadow-2xl transition-colors hover:border-cyan-500/30 group ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {children}
    </motion.div>
  );
}

function SparklineStat({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: any, color: string }) {
  return (
    <div className="relative h-full flex flex-col justify-between p-6 group cursor-default">
      <div className="flex justify-between items-start">
        <div className={`p-2 rounded-lg bg-white/5 border border-white/5 ${color} text-white`}>
          <Icon size={18} />
        </div>
        <ArrowUpRight className="text-white/20 group-hover:text-cyan-400 transition-colors" size={18} />
      </div>
      
      <div className="relative h-16 w-full mt-4 flex items-end overflow-hidden">
        <span className="text-4xl font-black text-white tracking-tighter transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-4">
          {value}
        </span>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:-translate-y-2 flex items-end">
           <svg viewBox="0 0 100 30" className="w-full h-full stroke-cyan-400 fill-none stroke-[3px] drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
              <path d="M0,30 Q10,25 20,28 T40,15 T60,20 T80,5 T100,10" />
           </svg>
        </div>
      </div>
      
      <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

// --- MAIN DASHBOARD ---

export default function StudentDashboard({ profile, classes, stats = null }: StudentDashboardProps) {
  const router = useRouter();
  
  // UI State
  const [filter, setFilter] = useState<'all' | 'active'>('all');
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // Mascot State
  const [emotion, setEmotion] = useState<MascotEmotion>('idle');
  const [action, setAction] = useState<MascotAction>('wave');
  const [mascotMessage, setMascotMessage] = useState(`System Online. User: ${profile.full_name}`);
  const idleTimer = useRef<NodeJS.Timeout | null>(null);

  // 1. SMART GREETING LOGIC
  useEffect(() => {
    const hour = new Date().getHours();
    const name = profile.full_name.split(' ')[0];
    let timeGreeting = '';
    
    if (hour < 12) timeGreeting = `Morning, Agent ${name}.`;
    else if (hour < 17) timeGreeting = `Afternoon, Agent ${name}.`;
    else timeGreeting = `Evening, Agent ${name}.`;

    if (stats && stats.upcomingAssignments > 2) {
      setMascotMessage(`${timeGreeting} ⚠️ CRITICAL: ${stats.upcomingAssignments} tasks pending.`);
      setEmotion('surprised'); 
    } else if (profile.current_streak >= 3) {
      setMascotMessage(`${timeGreeting} STREAK ACTIVE: ${profile.current_streak} days.`);
      setEmotion('cool');
      setAction('dance');
    } else {
      setMascotMessage(`${timeGreeting} Systems Nominal.`);
      setEmotion('happy');
    }
  }, [profile.full_name, profile.current_streak, stats]);

  // 2. INTERACTIVE MASCOT LOGIC
  useEffect(() => {
    const resetIdle = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      setEmotion(prev => (prev === 'sleeping' ? 'surprised' : prev));
      
      idleTimer.current = setTimeout(() => {
        setEmotion('sleeping');
        setAction('none');
        setMascotMessage("System Idle. Hibernation Mode Active.");
      }, 30000); 
    };
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    resetIdle(); 
    return () => {
        if (idleTimer.current) clearTimeout(idleTimer.current);
        window.removeEventListener('mousemove', resetIdle);
        window.removeEventListener('keydown', resetIdle);
    };
  }, []);

  // Derived Values
  const level = Math.floor(profile.xp / 1000) + 1;
  const progress = (profile.xp % 1000) / 1000;
  
  const displayClasses = filter === 'all' 
    ? classes 
    : classes.filter(c => c.status === 'active');

  // Animation Variants
  const container: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30">
      
      {/* GLOBAL FX */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-950 to-slate-950 pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-[1600px] mx-auto p-6 md:p-10 lg:p-12">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500 tracking-tighter mb-2">
              DASHBOARD
            </h1>
            <div className="flex items-center gap-3 text-cyan-500 font-mono text-xs md:text-sm">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span> ONLINE</span>
              <span className="opacity-50">|</span>
              <span className="uppercase">{profile.email}</span>
            </div>
          </div>
          
          <button 
            onClick={() => router.push('/dashboard/shop')}
            className="mt-6 md:mt-0 flex items-center gap-2 px-6 py-3 bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-full hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all active:scale-95 group"
          >
            <div className="w-5 h-5 rounded bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-black text-white group-hover:rotate-12 transition-transform">
              G
            </div>
            <span className="font-bold text-sm text-slate-300 group-hover:text-white">{profile.gems}</span>
          </button>
        </header>

        {/* BENTO GRID LAYOUT */}
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-4 auto-rows-[180px] gap-6"
        >
          
          {/* 1. MASCOT (2x2) */}
          <motion.div variants={item} className="md:col-span-2 md:row-span-2 relative group">
            <TiltCard className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900/80 to-slate-950/80">
               <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
                  <div className="px-4 py-2 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 text-xs font-mono backdrop-blur-sm">
                    {">"} {mascotMessage}
                    <span className="animate-pulse">_</span>
                  </div>
                  <div className="text-[10px] font-bold text-white/20">LVL.{level}</div>
               </div>
               
               <div 
                 className="relative z-10 scale-125 filter drop-shadow-[0_0_30px_rgba(34,211,238,0.15)] group-hover:drop-shadow-[0_0_50px_rgba(34,211,238,0.3)] transition-all duration-500 cursor-pointer"
                 onClick={() => { setEmotion('happy'); setMascotMessage("Affirmative. Ready for input."); }}
               >
                 <UniBotMascot size={280} emotion={emotion} action={action === 'none' ? undefined : action} />
               </div>

               {/* XP Progress Bar */}
               <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.8)] relative" 
                  >
                    <div className="absolute right-0 -top-1 w-2 h-4 bg-white/80 blur-[2px]"></div>
                  </motion.div>
               </div>
            </TiltCard>
          </motion.div>

          {/* 2. STATS (1x1 each) */}
          <motion.div variants={item} className="md:col-span-1 md:row-span-1">
            <TiltCard className="h-full bg-slate-900/60">
              <SparklineStat 
                label="Streak" 
                value={profile.current_streak} 
                icon={Zap} 
                color="bg-orange-500/10 text-orange-400"
              />
            </TiltCard>
          </motion.div>

          <motion.div variants={item} className="md:col-span-1 md:row-span-1">
            <TiltCard className="h-full bg-slate-900/60">
              <SparklineStat 
                label="Total XP" 
                value={profile.xp} 
                icon={Activity} 
                color="bg-blue-500/10 text-blue-400"
              />
            </TiltCard>
          </motion.div>

          {/* 3. DAILY QUIZ (2x1) - Restored from original logic */}
          <motion.div variants={item} className="md:col-span-2 md:row-span-1 cursor-pointer" onClick={() => router.push('/dashboard/daily-quiz')}>
            <TiltCard className="h-full p-6 flex flex-col justify-center bg-gradient-to-r from-indigo-900/40 to-slate-900/60 border-indigo-500/20 hover:border-indigo-400/50">
               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold tracking-widest uppercase mb-1">
                      <Sparkles size={12} /> Target Practice
                    </div>
                    <h3 className="text-2xl font-black text-white">Daily Quiz Available</h3>
                    <p className="text-xs text-slate-400 font-mono">+50 XP REWARD FOR COMPLETION</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                    <Target className="text-indigo-400" />
                  </div>
               </div>
            </TiltCard>
          </motion.div>

          {/* 4. CLASS LIST (4xN) */}
          <motion.div variants={item} className="md:col-span-4 min-h-[240px] pt-8">
             <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <BookOpen className="text-cyan-500" /> 
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500">ENROLLED PROTOCOLS</span>
                </h2>
                
                <div className="flex items-center gap-3">
                  {/* Filter Toggle */}
                  <div className="flex bg-slate-900 p-1 rounded-lg border border-white/5">
                    <button 
                      onClick={() => setFilter('all')}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded transition-all ${filter === 'all' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setFilter('active')}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded transition-all ${filter === 'active' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Active
                    </button>
                  </div>

                  <button 
                    onClick={() => setShowJoinModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/50 rounded text-cyan-400 text-xs font-bold font-mono uppercase tracking-wider transition-all active:scale-95 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                  >
                    <Shield size={14} /> Join Protocol
                  </button>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayClasses.length > 0 ? displayClasses.map(cls => (
                  <motion.div 
                    key={cls.id}
                    whileHover={{ scale: 1.01, y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => router.push(`/dashboard/class/${cls.id}`)}
                    className="group relative h-40 bg-slate-900/40 border border-white/5 hover:border-cyan-500/50 rounded-2xl p-6 cursor-pointer overflow-hidden transition-all"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    
                    <div className="flex justify-between items-start mb-4">
                       <span className="font-mono text-[10px] text-cyan-500 border border-cyan-500/20 px-2 py-1 rounded bg-cyan-950/30">
                         {cls.access_code}
                       </span>
                       <div className="p-1.5 rounded bg-white/5 group-hover:bg-cyan-500/20 transition-colors">
                         <Target className="text-slate-600 group-hover:text-cyan-400 transition-colors" size={14} />
                       </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-200 group-hover:text-white mb-1 line-clamp-1">{cls.name}</h3>
                    <p className="text-xs text-slate-500 font-mono flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${cls.status === 'active' ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                      STATUS: {cls.status.toUpperCase()}
                    </p>
                    
                    <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                       <ArrowUpRight className="text-cyan-400" />
                    </div>
                  </motion.div>
                )) : (
                  <div className="col-span-full h-40 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl text-slate-600 font-mono text-sm bg-slate-900/20">
                    <Terminal className="mb-4 opacity-50" />
                    NO_CLASSES_FOUND. INIT_JOIN();
                  </div>
                )}
             </div>
          </motion.div>

        </motion.div>
      </div>

      <JoinClassModal 
        isOpen={showJoinModal} 
        onClose={() => setShowJoinModal(false)}
        userId={profile.id}
        onSuccess={() => window.location.reload()} 
      />
    </div>
  );
}