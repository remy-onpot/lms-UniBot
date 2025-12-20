'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile, Class } from '@/types';
import { UniBotMascot, MascotEmotion, MascotAction } from '@/components/ui/UniBotMascot';
import { 
  BookOpen, Clock, ArrowRight, ShoppingBag, 
  Sparkles, Flame, Plus, Loader2, AlertTriangle, GraduationCap 
} from 'lucide-react';
import { JoinClassModal } from '@/components/features/dashboard/modals/JoinClassModal';
import { ClassService } from '@/lib/services/class.service';
import { createClient } from '@/lib/supabase/client';

interface StudentDashboardProps {
  user: UserProfile;
}

export default function StudentDashboard({ user: profile }: StudentDashboardProps) {
  const router = useRouter();
  
  // Data State
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeCourses: 0,
    upcomingAssignments: 0,
    nextDeadline: null as string | null
  });

  // UI State
  const [filter, setFilter] = useState<'all' | 'active'>('all');
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // Mascot State
  const [emotion, setEmotion] = useState<MascotEmotion>('idle');
  const [action, setAction] = useState<MascotAction>('wave');
  const [mascotMessage, setMascotMessage] = useState("Welcome back! Ready to learn?");
  const idleTimer = useRef<NodeJS.Timeout | null>(null);

  // --- 1. DATA FETCHING ---
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const supabase = createClient();

        // Fetch Data
        const [myClasses, statsResponse] = await Promise.all([
          ClassService.getUserClasses(profile.id),
          supabase.rpc('get_student_dashboard_stats', { student_uuid: profile.id })
        ]);

        setClasses(myClasses);

        if (!statsResponse.error && statsResponse.data) {
          const rawStats = statsResponse.data as any;
          setStats({
            activeCourses: rawStats.activeCourses || 0,
            upcomingAssignments: rawStats.upcomingAssignments || 0,
            nextDeadline: rawStats.nextDeadline || null
          });
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [profile.id]);

  // --- 2. SMART GREETING LOGIC ---
  useEffect(() => {
    const hour = new Date().getHours();
    const name = profile.full_name.split(' ')[0];
    let timeGreeting = '';
    
    if (hour < 12) timeGreeting = `Good morning, ${name}! ☀️`;
    else if (hour < 17) timeGreeting = `Good afternoon, ${name}. 👋`;
    else timeGreeting = `Good evening, ${name}. 🌙`;

    // Dynamic Context Awareness
    if (stats.upcomingAssignments > 2) {
      setMascotMessage(`${timeGreeting} You have ${stats.upcomingAssignments} tasks due soon! Stay focused!`);
      // 'concerned' wasn't in original types, fallback to 'surprised' or 'idle' logic
      setEmotion('surprised'); 
    } else if (profile.current_streak >= 3) {
      setMascotMessage(`${timeGreeting} You're on fire! ${profile.current_streak} day streak! 🔥`);
      setEmotion('cool');
      setAction('dance');
    } else {
      setMascotMessage(timeGreeting);
      setEmotion('happy');
    }
  }, [profile.full_name, profile.current_streak, stats.upcomingAssignments]);

  // --- 3. INTERACTIVE MASCOT ---
  useEffect(() => {
    const resetIdle = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      setEmotion(prev => {
        if (prev === 'sleeping') return 'surprised'; // Wake up!
        return prev;
      });
      
      // Go back to sleep after inactivity
      idleTimer.current = setTimeout(() => {
        setEmotion('sleeping');
        setAction('none');
        setMascotMessage("Zzz... Wake me up when you're ready to study.");
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

  // --- 4. RENDER HELPERS ---
  const level = Math.floor(profile.xp / 1000) + 1;
  const xpProgress = ((profile.xp % 1000) / 1000) * 100;
  
  const displayClasses = filter === 'all' 
    ? classes 
    : classes.filter(c => c.status === 'active');

  const getDeadlineText = () => {
    if (!stats.nextDeadline) return "No urgent deadlines";
    const date = new Date(stats.nextDeadline);
    if (isNaN(date.getTime())) return "No urgent deadlines";
    const diffDays = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Assignments Overdue!";
    if (diffDays === 0) return "Due Today!";
    return `Next due in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          <p className="text-slate-500 font-medium">Loading UniBot...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 md:pb-12">
      
      {/* Top Right Shop (Desktop) */}
      <div className="hidden md:flex absolute top-6 right-6 z-50 items-center gap-3">
         <button 
           onClick={() => router.push('/dashboard/shop')}
           className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-full shadow-sm border border-slate-200 hover:scale-105 transition-transform group"
         >
            <ShoppingBag className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-slate-600 group-hover:text-purple-700">Store</span>
            <span className="text-xs font-medium text-slate-400">|</span>
            <div className="flex items-center gap-1">
               <Sparkles className="w-3 h-3 text-blue-500" />
               <span className="text-xs font-black text-slate-800">{profile.gems}</span>
            </div>
         </button>
      </div>

      {/* --- HERO SECTION (New Layout) --- */}
      <div className="pt-24 pb-8 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          
          {/* Welcome Card Container */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-indigo-100 relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
            
            {/* Background Blob */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-60"></div>

            {/* LEFT: Text & Stats */}
            <div className="flex-1 z-10 w-full">
              {/* Speech Bubble (Visible on Desktop) */}
              <div className="hidden md:block mb-4">
                <div className="inline-block bg-indigo-50 text-indigo-900 px-4 py-2 rounded-2xl rounded-bl-none text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {mascotMessage}
                </div>
              </div>

              {/* Mobile Greeting (Simple) */}
              <h1 className="md:hidden text-2xl font-black text-slate-900 mb-2">Hi, {profile.full_name.split(' ')[0]}!</h1>

              {/* XP Progress */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-black text-sm border-4 border-indigo-50">
                  {level}
                </div>
                <div className="flex-1 max-w-sm">
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                    <span>Level {level}</span>
                    <span>{Math.round(xpProgress)}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-1000" style={{ width: `${xpProgress}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Quick Action Stats */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-lg">
                  <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                  <span className="text-xs font-bold text-orange-700">{profile.current_streak} Day Streak</span>
                </div>
                {stats.upcomingAssignments > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-blue-700">{stats.upcomingAssignments} Tasks Due</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Mascot (Responsive Sizing) */}
            <div className="relative shrink-0 md:mr-8 order-first md:order-last">
               {/* Mascot Container: Smaller on mobile, bigger on desktop */}
               <div 
                 className="w-[140px] h-[140px] md:w-[180px] md:h-[180px] transition-transform hover:scale-105 cursor-pointer"
                 onClick={() => {
                    setEmotion('happy');
                    setAction('dance'); // Fixed: 'jump' -> 'dance' (assuming dance is valid)
                 }}
               >
                   <UniBotMascot size={180} emotion={emotion} action={action} />
               </div>
               
               {/* Mobile Speech Bubble (Below mascot) */}
               <div className="md:hidden mt-4 text-center">
                  <p className="text-sm font-medium text-slate-600 bg-slate-50 px-3 py-2 rounded-xl inline-block">
                    "{mascotMessage}"
                  </p>
               </div>
            </div>

          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT GRID --- */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 space-y-8">
        
        {/* 1. Daily Quiz Banner (Pop of Color) */}
        <div 
           onClick={() => router.push('/dashboard/daily-quiz')}
           className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 cursor-pointer hover:shadow-xl transition-all relative overflow-hidden group"
        >
           <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-white/20 transition-colors"></div>
           <div className="relative z-10 flex justify-between items-center">
             <div>
               <div className="flex items-center gap-2 text-indigo-100 text-xs font-bold mb-2">
                 <Sparkles className="w-3 h-3" /> Daily Challenge
               </div>
               <h3 className="text-xl font-bold mb-1">Knowledge Check</h3>
               <p className="text-indigo-100 text-sm opacity-90">Keep your streak alive! (+50 XP)</p>
             </div>
             <button className="bg-white/20 hover:bg-white/30 p-3 rounded-full backdrop-blur-sm transition-colors">
               <ArrowRight className="w-5 h-5 text-white" />
             </button>
           </div>
        </div>

        {/* 2. Courses Section */}
        <div id="my-courses">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                My Courses
              </h2>
              
              <div className="flex gap-2">
                 <button 
                   onClick={() => setShowJoinModal(true)}
                   className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-xl hover:bg-indigo-100 transition"
                 >
                    <Plus className="w-3.5 h-3.5" />
                    Join Class
                 </button>
                 <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-900'}`}>All</button>
                    <button onClick={() => setFilter('active')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'active' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-900'}`}>Active</button>
                 </div>
              </div>
           </div>

           {classes.length === 0 ? (
              <EmptyState onJoin={() => setShowJoinModal(true)} />
           ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                 {displayClasses.map(cls => (
                   <ClassCard key={cls.id} classData={cls} />
                 ))}
              </div>
           )}
        </div>
      </div>

      {/* ✅ MODAL */}
      <JoinClassModal 
        isOpen={showJoinModal} 
        onClose={() => setShowJoinModal(false)}
        userId={profile.id}
        onSuccess={() => window.location.reload()} 
      />
    </div>
  );
}

// --- SUB-COMPONENTS (Cleaned up) ---

function ClassCard({ classData }: { classData: Class }) {
  const router = useRouter();
  
  return (
    <div 
      onClick={() => router.push(`/dashboard/class/${classData.id}`)}
      className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer relative overflow-hidden"
    >
      <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 font-black text-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            {classData.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-900 line-clamp-1">{classData.name}</h4>
            <p className="text-xs text-slate-500 font-medium truncate">Code: <span className="font-mono">{classData.access_code}</span></p>
          </div>
      </div>
      
      <div className="flex gap-2">
          <span className="bg-slate-50 text-slate-600 px-2 py-1 rounded text-[10px] font-bold border border-slate-100 flex items-center gap-1">
            <BookOpen className="w-3 h-3"/> {classData._count?.courses || 0} Modules
          </span>
      </div>
    </div>
  );
}

function EmptyState({ onJoin }: { onJoin: () => void }) {
  return (
    <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">No courses yet</h3>
        <p className="text-slate-500 text-sm mt-1 mb-4">Join a class to start learning.</p>
        <button onClick={onJoin} className="text-indigo-600 font-bold text-sm hover:underline">Join Class</button>
    </div>
  );
}