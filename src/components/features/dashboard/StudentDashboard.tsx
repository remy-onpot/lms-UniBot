'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile, StudentCourseSummary } from '@/types';
import { UniBotMascot } from '@/components/ui/UniBotMascot';
import { EmptyState } from '@/components/ui/EmptyStateCard';
import { BookOpen, Clock, ArrowRight, Sparkles, Target, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- SUB-COMPONENTS ---

function StatCard({ label, value, icon: Icon, colorClass }: any) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", colorClass)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{label}</p>
        <p className="text-lg font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function CourseCard({ course, onClick }: { course: any, onClick: () => void }) {
  return (
    <div onClick={onClick} className="group bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:border-indigo-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-md shadow-slate-200">
          {course.title?.charAt(0) || 'C'}
        </div>
        <div className="px-2.5 py-1 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-500 border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
          {course.code || 'Course'}
        </div>
      </div>
      <h3 className="font-bold text-slate-900 line-clamp-1 mb-1 group-hover:text-indigo-700 transition-colors text-base">{course.title}</h3>
      <p className="text-xs text-slate-500 mb-4 font-medium">{course.progress || 0}% Completed</p>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div className="h-full bg-linear-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000" style={{ width: `${course.progress || 0}%` }} />
      </div>
      <div className="flex gap-3 text-[10px] font-bold text-slate-400">
        <span className="flex items-center gap-1"><Target className="w-3 h-3"/> {course.quizCount || 0} Quizzes</span>
        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3"/> {course.assignmentCount || 0} Tasks</span>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---

interface StudentDashboardProps {
  profile: UserProfile;
  courses: StudentCourseSummary[];
  stats: any; // ✅ Added to match parent
}

export function StudentDashboard({ profile, courses = [], stats }: StudentDashboardProps) {
  const router = useRouter();
  const [greeting, setGreeting] = useState('');
  const [subText, setSubText] = useState('');

  // 🧠 SMART GREETING ENGINE
  useEffect(() => {
    const hour = new Date().getHours();
    const name = profile.full_name?.split(' ')[0] || 'friend';
    
    let greets = [];
    let subs = [];

    if (hour >= 5 && hour < 12) {
      greets = [`Up early, ${name}?`, `Good morning, ${name}!`, `Rise and grind, ${name}.`];
      subs = ["Ready to crush some goals?", "Let's get that brain working.", "Coffee first, then quizzes."];
    } else if (hour >= 12 && hour < 17) {
      greets = [`Good afternoon, ${name}.`, `Keep moving, ${name}.`, `Sup, ${name}?`];
      subs = ["Don't break the streak.", "Halfway through the day!", "Stay focused."];
    } else if (hour >= 17 && hour < 22) {
      greets = [`Good evening, ${name}.`, `Winding down?`, `Waddup ${name}.`];
      subs = ["Just a few more tasks.", "Night study session?", "Finish strong."];
    } else { 
      greets = [`Still awake, ${name}?`, `Night owl mode 🦉`, `Go to sleep, ${name}!`];
      subs = ["The best coders work at night.", "Don't forget to rest.", "One last quiz?"];
    }

    setGreeting(greets[Math.floor(Math.random() * greets.length)]);
    setSubText(subs[Math.floor(Math.random() * subs.length)]);
  }, [profile.full_name]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 animate-in fade-in slide-in-from-bottom-4">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 pt-8 pb-16 px-6 lg:px-12 relative overflow-hidden">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-6 w-full md:w-auto">
              
             {/* MASCOT + FRAME */}
             <div className="relative shrink-0 group cursor-pointer" onClick={() => router.push('/dashboard/profile')}>
                <div className={cn(
                  "w-24 h-24 rounded-3xl flex items-center justify-center transition-transform group-hover:scale-105 duration-300 relative bg-indigo-50",
                  profile.profile_frame
                )}>
                   <UniBotMascot 
                     size={90} 
                     emotion="happy" 
                     action="none" 
                     interactive={true}
                   />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-white shadow-sm z-20">
                  Lvl {Math.floor((profile.xp || 0) / 1000) + 1}
                </div>
             </div>

             <div>
               <h1 className="text-2xl font-black text-slate-900 tracking-tight">{greeting}</h1>
               <p className="text-sm text-slate-500 font-medium">{subText}</p>
             </div>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
             <StatCard label="Streak" value={`${profile.current_streak || 0} Days`} icon={Flame} colorClass="bg-orange-50 text-orange-600" />
             <StatCard label="Gems" value={profile.gems || 0} icon={Sparkles} colorClass="bg-purple-50 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-12 -mt-8 relative z-20">
        
        {/* SMART DAILY QUIZ CARD */}
        <div onClick={() => router.push('/dashboard/daily-quiz')} className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl shadow-slate-200 cursor-pointer relative overflow-hidden group mb-10 transition-all hover:-translate-y-1 hover:shadow-indigo-500/20">
           <div className="absolute right-0 top-0 h-full w-2/3 bg-linear-to-lrom-indigo-600 to-transparent opacity-30 group-hover:opacity-40 transition-opacity" />
           <div className="absolute -right-10 -bottom-20 w-60 h-60 bg-purple-500/30 rounded-full blur-3xl" />
           <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div>
                 <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[10px] font-bold text-indigo-200 mb-3 uppercase tracking-wider"><Clock className="w-3 h-3" /> Daily Challenge</div>
                 <h2 className="text-2xl font-black mb-1">Keep the brain sharp!</h2>
                 <p className="text-slate-300 text-sm mb-0 font-medium">5 minutes, +50 XP. You got this.</p>
             </div>
             <button className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center gap-2 shadow-lg">Start Now <ArrowRight className="w-4 h-4" /></button>
           </div>
        </div>

        {/* COURSE GRID */}
        <div className="mb-6 flex justify-between items-end">
           <h3 className="text-lg font-black text-slate-900">Your Courses</h3>
           {courses.length > 0 && <button onClick={() => router.push('/dashboard/join')} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-bold transition-colors">+ Join New</button>}
        </div>

        {courses.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
             {courses.map((course: any) => (
                <CourseCard key={course.id} course={course} onClick={() => router.push(`/dashboard/courses/${course.id}`)} />
             ))}
          </div>
        ) : (
          <EmptyState 
            title="So... No Courses?"
            description="It's looking pretty empty in here. I'm bored. Go join a class so I have something to do."
            actionLabel="Join Class"
            onAction={() => router.push('/dashboard/join')}
            mascotEmotion="deadpan"
            mascotAction="none"
          />
        )}
      </div>
    </div>
  );
}