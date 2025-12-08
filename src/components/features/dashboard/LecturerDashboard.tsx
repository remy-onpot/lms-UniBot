'use client';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/types';
import { Users, AlertCircle, Plus, Book, GraduationCap, BarChart3, Lock, BookOpen } from 'lucide-react';
import { getPlanLimits } from '@/lib/constants'; // ✅ Import logic

interface LecturerDashboardProps {
  profile: UserProfile;
  classes: any[];
}

export function LecturerDashboard({ profile, classes }: LecturerDashboardProps) {
  const router = useRouter();
  
  // 1. Check Limits
  const limits = getPlanLimits(profile.role, profile.plan_tier, profile.is_course_rep);
  const activeClassCount = classes.length;
  const isOverLimit = activeClassCount > limits.max_classes;

  // 🔒 LOCK SCREEN
  if (isOverLimit) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-6">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
          <Lock className="w-12 h-12 text-red-600" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900">Dashboard Locked</h2>
          <p className="text-slate-600 mt-2 max-w-md mx-auto">
            You have <b>{activeClassCount} active classes</b>, but your current plan only supports <b>{limits.max_classes}</b>.
          </p>
        </div>
        <button 
          onClick={() => router.push('/dashboard/lecturer-profile')}
          className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-xl"
        >
          Go to Console to Archive Classes
        </button>
      </div>
    );
  }

  // --- Normal Dashboard Content ---
  const totalStudents = classes.reduce((acc, c) => acc + (c.studentCount || 0), 0);
  const totalModules = classes.reduce((acc, c) => acc + (c.course_count || 0), 0);
  const totalCohorts = classes.length;

  return (
    <div className="space-y-8 pb-24 md:pb-10">
      
      {/* Header & Stats */}
      <section>
        <div className="flex justify-between items-center mb-6">
           <div>
             <h1 className="text-xl md:text-2xl font-black text-slate-900">Overview</h1>
             <p className="text-slate-500 text-sm">Welcome back, Professor.</p>
           </div>
           <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
             {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
           </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
           {/* Students */}
           <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                 <Users className="w-4 h-4 text-blue-600" /> <span className="text-xs font-bold uppercase">Students</span>
              </div>
              <p className="text-3xl font-black text-slate-900">{totalStudents}</p>
           </div>
           
           {/* Cohorts */}
           <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                 <GraduationCap className="w-4 h-4 text-purple-600" /> <span className="text-xs font-bold uppercase">Cohorts</span>
              </div>
              <p className="text-3xl font-black text-slate-900">{totalCohorts}</p>
           </div>

           {/* Modules */}
           <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                 <Book className="w-4 h-4 text-indigo-600" /> <span className="text-xs font-bold uppercase">Modules</span>
              </div>
              <p className="text-3xl font-black text-slate-900">{totalModules}</p>
           </div>

           {/* Actions */}
           <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                 <AlertCircle className="w-4 h-4 text-orange-600" /> <span className="text-xs font-bold uppercase">Alerts</span>
              </div>
              <p className="text-3xl font-black text-orange-600">0</p>
           </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
         <button 
           onClick={() => router.push('/dashboard/lecturer-profile')} 
           className="shrink-0 flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition active:scale-95"
         >
            <Plus className="w-4 h-4" /> Manage Classes
         </button>
      </section>

      {/* Active Classes */}
      <section>
        <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
          Active Classes
        </h3>
        
        {classes.length === 0 ? (
           <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <p className="text-slate-500 text-sm font-medium mb-3">No active classes found.</p>
              <button onClick={() => router.push('/dashboard/lecturer-profile')} className="text-blue-600 font-bold text-sm hover:underline">
                Go to Console to Create
              </button>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.map(cls => (
              <div 
                key={cls.id} 
                onClick={() => router.push(`/dashboard/class/${cls.id}`)}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group"
              >
                 <div className="flex justify-between items-start">
                    <div>
                       <h4 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition">{cls.name}</h4>
                       <p className="text-slate-500 text-sm mt-1 font-medium flex items-center gap-2">
                         <BookOpen className="w-3 h-3" /> {cls.course_count || 0} Modules
                       </p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-600">
                       {cls.access_code}
                    </div>
                 </div>
                 <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1.5 text-green-600">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Active
                    </span>
                    <span>Created: {new Date(cls.created_at).toLocaleDateString()}</span>
                 </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}