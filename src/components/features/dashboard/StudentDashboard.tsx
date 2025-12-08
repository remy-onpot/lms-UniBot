'use client';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/types';
import { UniBotFace } from '@/components/ui/UniBotFace';
import { 
  Flame, Trophy, BookOpen, ChevronRight, Zap, Target, 
  Sparkles, Award, ShoppingBag, ArrowRight, Clock, CreditCard
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useFace } from '@/components/ui/FaceProvider';

interface StudentDashboardProps {
  profile: UserProfile;
  courses: any[];
}

export function StudentDashboard({ profile, courses }: StudentDashboardProps) {
  const router = useRouter();
  const face = useFace(); 
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [greeting, setGreeting] = useState('');

  // --- Dynamic Greeting Engine ---
  useEffect(() => {
    const getGreeting = () => {
      const hour = new Date().getHours();
      const name = profile.full_name.split(' ')[0];
      const random = Math.random();

      if (hour < 5) return `Still awake, ${name}? 🌙`;
      if (hour < 12) return random > 0.5 ? `Good morning, ${name}! ☀️` : `Ready to learn, ${name}? ☕`;
      if (hour < 17) return random > 0.5 ? `Good afternoon, ${name}. 👋` : `Keep the momentum going! 🚀`;
      if (hour < 22) return `Good evening, ${name}. 🌇`;
      return `Wrapping up for the day? 💤`;
    };
    setGreeting(getGreeting());
  }, [profile.full_name]);

  const level = Math.floor(profile.xp / 1000) + 1;
  const xpProgress = (profile.xp % 1000) / 1000 * 100;

  const filteredCourses = selectedFilter === 'all' 
    ? courses 
    : courses.filter(c => selectedFilter === 'active' ? c.quizCount > 0 || c.assignmentCount > 0 : false);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-10 relative font-sans">
      
      {/* --- TOP RIGHT ACTIONS --- */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
         {/* Simple Shop Button */}
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

      {/* --- HERO SECTION (UniBot Speaking) --- */}
      <div className="relative bg-white pt-24 pb-16 px-6 md:px-10 rounded-b-[3rem] shadow-sm border-b border-slate-200 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-br from-indigo-50 to-purple-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-70"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-start gap-6">
            
            {/* 🤖 UniBot Avatar */}
            <div className="shrink-0 relative">
               <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-indigo-50 relative z-10">
                  <UniBotFace size="md" state="happy" />
               </div>
               {/* Decorative Ring */}
               <div className="absolute -inset-2 bg-linear-to-br from-indigo-500 to-purple-500 rounded-4xl opacity-20 blur-md"></div>
               {/* Level Badge */}
               <div className="absolute -bottom-3 -right-3 z-20 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg border-2 border-white shadow-md">
                 Lvl {level}
               </div>
            </div>

            {/* 💬 Speech Bubble (Greeting) */}
            <div className="flex-1">
              <div className="relative bg-slate-50 border border-slate-100 p-5 rounded-2xl rounded-tl-none shadow-sm max-w-xl">
                 <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                   {greeting}
                 </h1>
                 <p className="text-slate-500 font-medium mt-1 text-sm">
                   You're on a <span className="text-orange-500 font-bold">{profile.current_streak} day streak!</span> Keep it up.
                 </p>
                 {/* Progress Bar Inside Bubble */}
                 <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                       <div className="h-full bg-linear-to-r from-indigo-500 to-purple-500 w-[45%] relative rounded-full" style={{ width: `${xpProgress}%` }}></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{Math.round(xpProgress)}% to Lvl {level+1}</span>
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
           className="group bg-linear-to-br from-slate-900 to-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-2xl cursor-pointer relative overflow-hidden transition-transform active:scale-[0.99] border border-slate-700/50"
        >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            
            <div className="flex justify-between items-center relative z-10">
               <div>
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold mb-3 border border-white/10">
                     <Clock className="w-3 h-3" /> 5 Mins
                  </div>
                  <h3 className="text-xl md:text-2xl font-black mb-1">Daily Brain Workout</h3>
                  <p className="text-slate-400 text-sm font-medium mb-4">Earn +50 XP and keep your streak alive!</p>
                  
                  <button className="bg-white text-slate-900 px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm hover:bg-indigo-50 transition flex items-center gap-2">
                     Start Quiz <ArrowRight className="w-4 h-4" />
                  </button>
               </div>
               <Trophy className="w-20 h-20 md:w-24 md:h-24 text-yellow-400 drop-shadow-lg rotate-12 group-hover:rotate-0 transition-transform duration-500" />
            </div>
        </div>

        {/* --- COURSES SECTION --- */}
        <div id="my-courses">
           <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-indigo-600" />
                My Courses
              </h2>
              
              <div className="flex items-center gap-2">
                 {/* ✅ MANAGE ACCESS BUTTON */}
                 <button 
                   onClick={() => router.push('/dashboard/student-billing')}
                   className="flex items-center gap-1.5 px-4 py-2 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-xl border border-yellow-200 hover:bg-yellow-100 transition"
                 >
                    <CreditCard className="w-3.5 h-3.5" />
                    Manage Access
                 </button>

                 <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={() => setSelectedFilter('all')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}>All</button>
                    <button onClick={() => setSelectedFilter('active')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedFilter === 'active' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}>Active</button>
                 </div>
              </div>
           </div>

           {courses.length === 0 ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                 <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                 <h3 className="text-lg font-bold text-slate-900">No courses yet</h3>
                 <p className="text-slate-500 text-sm mt-1 mb-4">Join a class to start learning.</p>
                 <button onClick={() => window.location.reload()} className="text-indigo-600 font-bold text-sm hover:underline">Refresh</button>
              </div>
           ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {filteredCourses.map(course => (
                    <div 
                      key={course.id}
                      onClick={() => router.push(`/dashboard/courses/${course.id}`)}
                      className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all cursor-pointer relative overflow-hidden"
                    >
                       <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-colors group-hover:bg-indigo-100"></div>

                       <div className="flex items-start gap-4 mb-4 relative z-10">
                          <div className="w-12 h-12 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-md">
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