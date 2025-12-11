'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/types';
import { UniBotMascot, MascotEmotion, MascotAction } from '@/components/ui/UniBotMascot';
import { 
  BookOpen, Trophy, Clock, ArrowRight, ShoppingBag, 
  Sparkles, Target, CreditCard, Flame 
} from 'lucide-react';

interface StudentDashboardProps {
  profile: UserProfile;
  courses: any[];
}

export function StudentDashboard({ profile, courses }: StudentDashboardProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'active'>('all');
  const [greeting, setGreeting] = useState('Welcome back!');
  
  // 🎭 MASCOT STATE
  const [emotion, setEmotion] = useState<MascotEmotion>('idle');
  const [action, setAction] = useState<MascotAction>('wave');
  const idleTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    const name = profile.full_name.split(' ')[0];
    if (hour < 12) setGreeting(`Good morning, ${name}! ☀️`);
    else if (hour < 17) setGreeting(`Good afternoon, ${name}. 👋`);
    else setGreeting(`Good evening, ${name}. 🌙`);
  }, [profile.full_name]);

  // 1. Initial Emotion (Streak)
  useEffect(() => {
    if (profile.current_streak >= 3) {
       setEmotion('cool'); setAction('dance');
    } else {
       setEmotion('happy'); setAction('wave');
    }
  }, [profile.current_streak]);

  // 2. 💤 SLEEP LOGIC
  useEffect(() => {
    const resetIdle = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      
      setEmotion(prev => {
        if (prev === 'sleeping') {
            // Wake Up Sequence
            setTimeout(() => setEmotion(profile.current_streak >= 3 ? 'cool' : 'happy'), 1500); 
            return 'surprised'; 
        }
        return prev;
      });
      
      // If we woke up, ensure action resets
      if (action === 'none' && emotion !== 'sleeping') setAction('idle');

      // Go to sleep after 30s
      idleTimer.current = setTimeout(() => {
        setEmotion('sleeping');
        setAction('none');
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
  }, [profile.current_streak, action, emotion]);

  const level = Math.floor(profile.xp / 1000) + 1;
  const xpProgress = ((profile.xp % 1000) / 1000) * 100;
  const displayCourses = filter === 'all' 
    ? courses 
    : courses.filter(c => c.quizCount > 0 || c.assignmentCount > 0);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 md:pb-12">
      
      {/* Top Right Shop */}
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

      {/* --- HERO SECTION --- */}
      <div className="relative bg-white pt-24 pb-16 px-6 md:px-10 rounded-b-[3rem] shadow-sm border-b border-slate-200 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-br from-indigo-50 to-purple-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-70 pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            
            {/* 🤖 UNI-BOT MASCOT (Interactive POKE) */}
            <div 
                className="shrink-0 -mt-6 md:-mt-10 cursor-pointer transition-transform active:scale-95"
                onMouseEnter={() => {
                    if (emotion !== 'sleeping') {
                        setEmotion('surprised');
                        setAction('none');
                        setTimeout(() => setEmotion('happy'), 1000);
                    }
                }}
            >
               <div className="w-[180px] h-[180px]">
                   <UniBotMascot 
                     size={180} 
                     emotion={emotion} 
                     action={action} 
                   />
               </div>
            </div>

            {/* 💬 Greeting Bubble */}
            <div className="flex-1 w-full md:mt-4">
              <div className="relative bg-slate-50 border border-slate-100 p-6 rounded-3xl rounded-tl-none shadow-sm max-w-xl">
                 <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{greeting}</h1>
                 <p className="text-slate-500 font-medium mt-1">
                   You're on a <span className="text-orange-500 font-bold inline-flex items-center gap-1"><Flame className="w-4 h-4 fill-orange-500"/> {profile.current_streak} day streak!</span>
                 </p>
                 
                 {/* XP Bar */}
                 <div className="mt-4 flex items-center gap-3 max-w-md">
                    <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                       <div className="h-full bg-linear-to-r from-indigo-500 to-purple-500 transition-all duration-1000" style={{ width: `${xpProgress}%` }}></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{Math.round(xpProgress)}% to Lvl {level+1}</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 -mt-10 relative z-20 space-y-8">
        
        {/* --- DAILY WORKOUT --- */}
        <div 
           onClick={() => router.push('/dashboard/daily-quiz')}
           className="group bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-indigo-200/50 cursor-pointer relative overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] opacity-30 -mr-20 -mt-20 pointer-events-none"></div>
            
            <div className="relative z-10 flex justify-between items-center">
               <div>
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold mb-3 border border-white/10 text-indigo-100">
                     <Clock className="w-3 h-3" /> 5 Mins
                  </div>
                  <h3 className="text-xl md:text-2xl font-black mb-1">Daily Knowledge Check</h3>
                  <p className="text-slate-400 text-sm font-medium mb-5 max-w-sm">
                    Complete your daily quiz to earn +50 XP and keep your streak alive.
                  </p>
                  
                  <button className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-50 transition flex items-center gap-2 shadow-lg">
                     Start Quiz <ArrowRight className="w-4 h-4" />
                  </button>
               </div>
               
               <div className="hidden sm:block transform rotate-12 group-hover:rotate-6 transition-transform duration-500">
                  <div className="w-24 h-24 bg-linear-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-2xl flex items-center justify-center border-4 border-white/20">
                     <Trophy className="w-12 h-12 text-white" />
                  </div>
               </div>
            </div>
        </div>

        {/* --- COURSES --- */}
        <div id="my-courses">
           <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-indigo-600" />
                My Courses
              </h2>
              
              <div className="flex flex-wrap items-center gap-3">
                 <button 
                   onClick={() => router.push('/dashboard/student-billing')}
                   className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 text-xs font-bold rounded-xl border border-amber-200 hover:bg-amber-100 transition active:scale-95"
                 >
                    <CreditCard className="w-3.5 h-3.5" />
                    Manage Access
                 </button>

                 <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={() => setFilter('all')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}>All</button>
                    <button onClick={() => setFilter('active')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'active' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}>Active</button>
                 </div>
              </div>
           </div>

           {courses.length === 0 ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-slate-300" />
                 </div>
                 <h3 className="text-lg font-bold text-slate-900">No courses yet</h3>
                 <p className="text-slate-500 text-sm mt-1 mb-4">Join a class to start learning.</p>
                 <button onClick={() => window.location.reload()} className="text-indigo-600 font-bold text-sm hover:underline">Refresh</button>
              </div>
           ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                 {displayCourses.map(course => (
                    <div 
                      key={course.id}
                      onClick={() => router.push(`/dashboard/courses/${course.id}`)}
                      className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all cursor-pointer relative overflow-hidden active:scale-[0.98]"
                    >
                       <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-colors group-hover:bg-indigo-100"></div>

                       <div className="flex items-start gap-4 mb-4 relative z-10">
                          <div className="w-12 h-12 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
                             <span className="text-white font-black text-lg">{course.title.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                             <h4 className="font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">{course.title}</h4>
                             <p className="text-xs text-slate-500 font-medium truncate">{course.className}</p>
                          </div>
                       </div>
                       
                       <div className="flex gap-2 relative z-10">
                          {course.quizCount > 0 && <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-[10px] font-bold border border-green-100 flex items-center gap-1"><Target className="w-3 h-3"/> {course.quizCount} Quizzes</span>}
                          {course.assignmentCount > 0 && <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-[10px] font-bold border border-purple-100 flex items-center gap-1"><BookOpen className="w-3 h-3"/> {course.assignmentCount} Tasks</span>}
                       </div>
                    </div>
                 ))}
              </div>
           )}
        </div>
      </div>
    </div>
  );
}