'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { getRouteParam } from '../../../../lib/route-utils';
// Import Types
import { Class as ClassItem, Course as ModuleItem } from '@/types';
// Import Services
import { ClassService } from '../../../../lib/services/class.service';
import { CourseService } from '../../../../lib/services/course.service';
import Link from 'next/link';
import { FocusTrap } from 'focus-trap-react';

export default function ClassPage() {
  const params = useParams();
  const router = useRouter();
  const classId = getRouteParam(params, 'classId');
  
  // State
  const [classInfo, setClassInfo] = useState<ClassItem | null>(null);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [isCourseRep, setIsCourseRep] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', description: '' });
  const [processing, setProcessing] = useState(false);

  // ✅ Instantiate Services
  // We use the supabase client imported from lib
  const classService = new ClassService(supabase);
  const courseService = new CourseService(supabase);

  useEffect(() => {
    if (classId) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      setUserId(user.id);

      // 1. Get User Role & Profile
      const { data: profile } = await supabase
        .from('users')
        .select('role, is_course_rep')
        .eq('id', user.id)
        .single();
        
      setRole(profile?.role);
      setIsCourseRep(profile?.is_course_rep || false);

      // 2. Fetch Class Details
      // ✅ FIX: Use instance method getClassById
      const classData = await classService.getClassById(classId!);
      if (!classData) throw new Error("Class not found");
      setClassInfo(classData);

      // 3. Fetch Modules
      // ✅ FIX: Use courseService to get modules (courses)
      const modulesData = await courseService.getCoursesByClass(classId!);
      setModules(modulesData as ModuleItem[]);

    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to load class. It may not exist or you lack permission.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    
    try {
      if (!userId || !classId) return;

      // ✅ FIX: Use courseService.createCourse
      await courseService.createCourse({
        title: newCourse.title,
        description: newCourse.description,
        lecturer_id: userId,
        class_id: classId,
        status: 'active'
      });

      setShowModal(false);
      setNewCourse({ title: '', description: '' });
      
      // Refresh list
      const updatedModules = await courseService.getCoursesByClass(classId);
      setModules(updatedModules as ModuleItem[]);

    } catch (error: any) {
      alert(error.message);
    } finally {
      setProcessing(false);
    }
  };

  // Logic: Owner (Lecturer/Rep) or Super Admin can edit
  const isOwner = classInfo?.owner_id === userId; 
  const canEdit = role === 'lecturer' || role === 'super_admin' || (role === 'student' && isCourseRep && isOwner);

  // --- Components for cleaner render ---
  
  if (errorMsg) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
       <div className="text-center space-y-4">
          <div className="bg-red-100 text-red-600 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
          <p className="text-gray-500">{errorMsg}</p>
          <button onClick={() => router.push('/dashboard')} className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition">Return to Dashboard</button>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* 1. Modern Header Section */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
                <button onClick={() => router.push('/dashboard')} className="flex items-center text-sm text-gray-500 hover:text-gray-900 transition gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back
                </button>
                {loading && <div className="text-sm text-gray-400 animate-pulse">Syncing...</div>}
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Loading Skeleton */}
        {loading ? (
            <div className="animate-pulse space-y-8">
                <div className="h-32 bg-gray-200 rounded-2xl w-full"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="h-48 bg-gray-200 rounded-xl"></div>
                    <div className="h-48 bg-gray-200 rounded-xl"></div>
                    <div className="h-48 bg-gray-200 rounded-xl"></div>
                </div>
            </div>
        ) : (
            <>
                {/* 2. Hero Card */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 mb-10 text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div className="space-y-2">
                            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium tracking-wide">CLASSROOM</span>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{classInfo?.name}</h1>
                            {/* ✅ FIX: Now 'description' exists on the type */}
                            <p className="text-blue-100 max-w-2xl text-lg opacity-90">{classInfo?.description}</p>
                            
                            <div className="flex items-center gap-3 pt-2">
                                <div className="flex items-center bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                                    <span className="text-xs text-blue-200 mr-2">CODE:</span>
                                    <span className="font-mono font-bold tracking-wider">{classInfo?.access_code}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3">
                            {canEdit && (
                                <button onClick={() => router.push(`/dashboard/class/${classId}/students`)} className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-5 py-2.5 rounded-xl font-medium transition flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                    Students
                                </button>
                            )}
                            
                            {(canEdit && !isCourseRep) && ( 
                            <button onClick={() => setShowModal(true)} className="bg-white text-indigo-600 px-5 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                New Module
                            </button>
                            )}
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl"></div>
                </div>

                {/* 3. Modules Grid */}
                <div className="mb-6 flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900">Learning Modules</h2>
                    <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">{modules.length}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modules.length === 0 && (
                        <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-gray-300">
                            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            </div>
                            <p className="text-gray-500 font-medium">No modules published yet.</p>
                            {canEdit && <p className="text-sm text-gray-400 mt-1">Click "New Module" to get started.</p>}
                        </div>
                    )}
                    
                    {modules.map((mod, index) => (
                    <div key={mod.id} className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-indigo-50 text-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center">
                                    <span className="font-bold text-sm">{index + 1}</span>
                                </div>
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-indigo-600 transition-colors">{mod.title}</h3>
                            <p className="text-gray-500 text-sm mb-6 line-clamp-3 leading-relaxed">{mod.description}</p>
                        </div>
                        <Link href={`/dashboard/courses/${mod.id}`} className="flex items-center justify-center w-full bg-gray-50 border border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all duration-300 text-sm group-hover:shadow-md">
                            Open Materials
                            <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </Link>
                    </div>
                    ))}
                </div>
            </>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)}></div>
            
            <FocusTrap focusTrapOptions={{ initialFocus: '#module-title', clickOutsideDeactivates: false, allowOutsideClick: true }}>
                <div className="bg-white p-8 rounded-2xl w-full max-w-lg shadow-2xl relative z-10 transform transition-all scale-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-900">Add New Module</h3>
                        <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    
                    <form onSubmit={handleAddModule} className="space-y-5">
                        <div>
                            <label htmlFor="module-title" className="block text-sm font-semibold text-gray-700 mb-2">Module Title</label>
                            <input 
                                id="module-title" 
                                className="w-full border border-gray-300 px-4 py-3 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" 
                                placeholder="e.g. Week 1: Introduction to AI" 
                                value={newCourse.title} 
                                onChange={e => setNewCourse({...newCourse, title: e.target.value})} 
                                required 
                            />
                        </div>
                        <div>
                            <label htmlFor="module-desc" className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                            <textarea 
                                id="module-desc" 
                                className="w-full border border-gray-300 px-4 py-3 rounded-xl text-gray-900 h-32 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" 
                                placeholder="Brief overview of what students will learn..." 
                                value={newCourse.description} 
                                onChange={e => setNewCourse({...newCourse, description: e.target.value})} 
                            />
                        </div>
                        <div className="flex gap-4 mt-8">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 py-3 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition">Cancel</button>
                            <button type="submit" disabled={processing} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/30 transition disabled:opacity-70 disabled:cursor-not-allowed">
                                {processing ? 'Creating...' : 'Create Module'}
                            </button>
                        </div>
                    </form>
                </div>
            </FocusTrap>
        </div>
      )}

    </div>
  );
}