'use client';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/types';
import { UniBotFace } from '@/components/ui/UniBotFace';
import { Flame, Trophy, BookOpen, ChevronRight } from 'lucide-react';

interface StudentDashboardProps {
  profile: UserProfile;
  courses: any[];
}

export function StudentDashboard({ profile, courses }: StudentDashboardProps) {
  const router = useRouter();

  return (
    <div className="space-y-6 md:space-y-8 pb-24 md:pb-10"> {/* Extra padding for bottom nav */}
      
      {/* 1. Hero / Status Section */}
      <section className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight">
            Hi, {profile.full_name.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1 font-medium">Let's keep that streak alive.</p>
          
          <div className="flex gap-3 mt-4">
             <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100 shadow-sm">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                <span className="font-black text-orange-700 text-xs md:text-sm">{profile.current_streak}</span>
             </div>
             <div className="flex items-center gap-1.5 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-100 shadow-sm">
                <Trophy className="w-4 h-4 text-yellow-600" />
                <span className="font-black text-yellow-700 text-xs md:text-sm">{profile.xp} XP</span>
             </div>
          </div>
        </div>
        
        {/* The "Virtual Pet" Bot */}
        <div className="relative shrink-0">
           <div className="w-20 h-20 md:w-28 md:h-28">
              <UniBotFace size="md" state="happy" className="w-full h-full" />
           </div>
           <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full border-2 border-white shadow-sm">
             Lvl {Math.floor(profile.xp / 1000) + 1}
           </div>
        </div>
      </section>

      {/* 2. Daily Workout Card */}
      <section 
        onClick={() => router.push('/dashboard/daily-quiz')}
        className="cursor-pointer group relative overflow-hidden bg-linear-to-r from-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 transition-transform active:scale-[0.98]"
      >
         <div className="relative z-10 flex justify-between items-center">
            <div>
               <h2 className="text-lg md:text-2xl font-bold mb-1">Daily Workout</h2>
               <p className="text-indigo-100 text-xs md:text-sm font-medium">3 questions • 5 mins • +50 XP</p>
               <button className="mt-4 bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold text-xs md:text-sm hover:bg-indigo-50 transition shadow-md">
                 Start Now
               </button>
            </div>
            <div className="bg-white/10 p-3 md:p-4 rounded-full backdrop-blur-sm">
               <Trophy className="w-8 h-8 md:w-10 md:h-10 text-yellow-300" />
            </div>
         </div>
      </section>

      {/* 3. My Courses (Grid) */}
      <section id="my-courses" className="scroll-mt-20"> {/* ID for anchor link */}
        <div className="flex justify-between items-center mb-4 px-1">
           <h3 className="font-bold text-slate-900 text-lg md:text-xl">My Courses</h3>
        </div>
        
        {courses.length === 0 ? (
           <div className="text-center p-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium">You haven't joined any classes yet.</p>
              <button onClick={() => window.location.reload()} className="text-blue-600 font-bold text-sm mt-2 hover:underline">Refresh or Ask Course Rep</button>
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {courses.map((course) => (
               <div 
                 key={course.id} 
                 onClick={() => router.push(`/dashboard/courses/${course.id}`)}
                 className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 active:scale-[0.98] transition cursor-pointer flex flex-col justify-between"
               >
                 <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                       <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                       <h4 className="font-bold text-slate-900 text-sm md:text-base truncate pr-2">{course.title}</h4>
                       <p className="text-xs text-slate-500 font-medium truncate">{course.className}</p>
                    </div>
                 </div>
                 
                 <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center">
                    <div className="flex gap-2">
                      {course.quizCount > 0 && (
                          <span className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded-md font-bold border border-green-100">
                             {course.quizCount} Quiz
                          </span>
                      )}
                      {course.assignmentCount > 0 && (
                          <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-1 rounded-md font-bold border border-purple-100">
                             {course.assignmentCount} Assign.
                          </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition" />
                 </div>
               </div>
             ))}
           </div>
        )}
      </section>
    </div>
  );
}