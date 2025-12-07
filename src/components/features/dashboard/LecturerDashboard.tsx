'use client';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/types';
import { Users, AlertCircle, CheckCircle, Plus, Book, GraduationCap } from 'lucide-react';

interface LecturerDashboardProps {
  profile: UserProfile;
  classes: any[];
}

export function LecturerDashboard({ profile, classes }: LecturerDashboardProps) {
  const router = useRouter();
  
  // Real-time calculations from props
  const totalCohorts = classes.length;
  // Note: Assuming 'studentCount' or similar is aggregated in the service query. 
  // If not, we fallback to 0 or estimates for now.
  const totalStudents = classes.reduce((acc, c) => acc + (c.studentCount || 0), 0);
  const totalModules = classes.reduce((acc, c) => acc + (c.course_count || 0), 0);

  return (
    <div className="space-y-8 pb-24 md:pb-10">
      
      {/* 1. Header & Stats */}
      <section>
        <div className="flex justify-between items-center mb-6">
           <h1 className="text-xl md:text-2xl font-black text-slate-900">
             Overview
           </h1>
           <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
             {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
           </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
           <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                 <Users className="w-4 h-4 text-blue-500" /> <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Students</span>
              </div>
              <p className="text-2xl md:text-3xl font-black text-slate-900">{totalStudents}</p>
           </div>
           
           <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                 <GraduationCap className="w-4 h-4 text-purple-500" /> <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Cohorts</span>
              </div>
              <p className="text-2xl md:text-3xl font-black text-slate-900">{totalCohorts}</p>
           </div>

           <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                 <Book className="w-4 h-4 text-indigo-500" /> <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Modules</span>
              </div>
              <p className="text-2xl md:text-3xl font-black text-slate-900">{totalModules}</p>
           </div>

           <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                 <AlertCircle className="w-4 h-4 text-orange-500" /> <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Actions</span>
              </div>
              <p className="text-2xl md:text-3xl font-black text-orange-600">0</p>
           </div>
        </div>
      </section>

      {/* 2. Quick Actions */}
      <section className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
         <button 
           onClick={() => router.push('/dashboard/lecturer-profile')}
           className="shrink-0 flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition active:scale-95"
         >
            <Plus className="w-4 h-4" /> Create Class
         </button>
         <button className="shrink-0 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition active:scale-95">
            Gradebook
         </button>
         <button className="shrink-0 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition active:scale-95">
            Manage Content
         </button>
      </section>

      {/* 3. Active Cohorts List */}
      <section>
        <h3 className="font-bold text-slate-900 text-lg mb-4">Active Classes</h3>
        {classes.length === 0 ? (
           <div className="text-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <p className="text-slate-500 text-sm">No active classes found.</p>
              <button onClick={() => router.push('/dashboard/lecturer-profile')} className="text-blue-600 font-bold text-sm mt-2">Create one now</button>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.map(cls => (
              <div 
                key={cls.id} 
                onClick={() => router.push(`/dashboard/class/${cls.id}`)}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md transition cursor-pointer group"
              >
                 <div className="flex justify-between items-start">
                    <div>
                       <h4 className="font-bold text-base md:text-lg text-slate-900 group-hover:text-blue-600 transition">{cls.name}</h4>
                       <p className="text-slate-500 text-xs md:text-sm mt-1 font-medium">{cls.course_count || 0} Modules • 0 Students</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-600">
                       {cls.access_code}
                    </div>
                 </div>
                 <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> Active</span>
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