'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile, Course } from '@/types'; // Ensure 'Course' is imported
import { 
  Plus, Users, BookOpen, BarChart3, Settings, 
  ExternalLink 
} from 'lucide-react';

interface LecturerDashboardProps {
  profile: UserProfile;
  courses: any[]; // ✅ Renamed from 'classes' to 'courses'
}

export function LecturerDashboard({ profile, courses }: LecturerDashboardProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 lg:p-10">
      
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
         <div>
            <h1 className="text-2xl font-bold text-slate-900">Lecturer Console</h1>
            <p className="text-slate-500 text-sm">Manage your curriculum and track student performance.</p>
         </div>
         
         <div className="flex gap-3">
            <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-50 transition">
               <Settings className="w-4 h-4 inline mr-2" /> Settings
            </button>
            <button 
              onClick={() => router.push('/dashboard/create-class')}
              className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg text-sm hover:bg-slate-800 transition flex items-center gap-2 shadow-lg shadow-slate-200"
            >
               <Plus className="w-4 h-4" /> Create Class
            </button>
         </div>
      </div>

      {/* 2. STATS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-blue-50 text-blue-700 rounded-lg"><Users className="w-5 h-5"/></div>
               <span className="text-sm font-bold text-slate-500">Total Students</span>
            </div>
            <p className="text-3xl font-black text-slate-900">
               {courses.reduce((acc, c) => acc + (c._count?.enrollments || 0), 0)}
            </p>
         </div>
         
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg"><BookOpen className="w-5 h-5"/></div>
               <span className="text-sm font-bold text-slate-500">Active Classes</span>
            </div>
            <p className="text-3xl font-black text-slate-900">{courses.length}</p>
         </div>

         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-purple-50 text-purple-700 rounded-lg"><BarChart3 className="w-5 h-5"/></div>
               <span className="text-sm font-bold text-slate-500">Avg. Engagement</span>
            </div>
            <p className="text-3xl font-black text-slate-900">--%</p>
         </div>
      </div>

      {/* 3. CLASS LIST TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
         <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-900">Active Classes</h3>
         </div>
         
         {courses.length === 0 ? (
            <div className="p-12 text-center">
               <p className="text-slate-400 text-sm italic">You haven't created any classes yet.</p>
            </div>
         ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-3">Class Name</th>
                        <th className="px-6 py-3">Code</th>
                        <th className="px-6 py-3">Students</th>
                        <th className="px-6 py-3">Created</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {courses.map((course) => (
                        <tr key={course.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-6 py-4 font-bold text-slate-900">{course.title}</td>
                            <td className="px-6 py-4">
                                <span className="bg-slate-100 px-2 py-1 rounded font-mono text-xs text-slate-600">{course.code}</span>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{course._count?.enrollments || 0} Enrolled</td>
                            <td className="px-6 py-4 text-slate-500">{new Date(course.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-right">
                                <button 
                                    onClick={() => router.push(`/dashboard/class/${course.id}`)}
                                    className="text-indigo-600 hover:text-indigo-800 font-bold text-xs inline-flex items-center gap-1"
                                >
                                    Manage <ExternalLink className="w-3 h-3" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
                </table>
            </div>
         )}
      </div>
    </div>
  );
}