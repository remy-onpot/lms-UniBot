'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { getRouteParam } from '../../../../lib/route-utils';
import { ClassService, DashboardClass } from '../../../../lib/services/class.service';
import { CourseService } from '../../../../lib/services/course.service';
import { Course } from '../../../../types';
import Link from 'next/link';

export default function ClassPage() {
  const params = useParams();
  const router = useRouter();
  const classId = getRouteParam(params, 'classId');
  
  // State
  const [classInfo, setClassInfo] = useState<DashboardClass | null>(null);
  const [modules, setModules] = useState<Course[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [isCourseRep, setIsCourseRep] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', description: '' });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (classId) fetchData();
  }, [classId]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // 1. Get User Role
      const { data: profile } = await supabase.from('users').select('role, is_course_rep').eq('id', user.id).single();
      setRole(profile?.role);
      setIsCourseRep(profile?.is_course_rep || false);

      // 2. Fetch Class Details via Service
      const classData = await ClassService.getById(classId!);
      setClassInfo(classData);

      // 3. Fetch Modules via Service
      const modulesData = await ClassService.getModules(classId!);
      setModules(modulesData);

    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to load class. It may not exist.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !classId) return;

      await CourseService.create({
        title: newCourse.title,
        description: newCourse.description,
        lecturer_id: user.id,
        class_id: classId
      });

      alert("Module Added!");
      setShowModal(false);
      setNewCourse({ title: '', description: '' });
      
      // Refresh list
      const updatedModules = await ClassService.getModules(classId);
      setModules(updatedModules);

    } catch (error: any) {
      alert(error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (errorMsg) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4">
        <h1 className="text-2xl font-bold text-red-700 mb-4">Error</h1>
        <div className="bg-white p-4 rounded shadow text-red-600 mb-6 border border-red-200">{errorMsg}</div>
        <button onClick={() => router.push('/dashboard')} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-lg">Return to Dashboard</button>
    </div>
  );

  if (loading) return <div className="p-10 flex justify-center text-gray-500">Loading Class...</div>;

  // Logic: Owner (Lecturer/Rep) or Super Admin can edit
  const isOwner = classInfo?.lecturer_id === (supabase.auth.getUser() as any)?.data?.user?.id; 
  const canEdit = role === 'lecturer' || role === 'super_admin' || (role === 'student' && isCourseRep && isOwner);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <button onClick={() => router.push('/dashboard')} className="mb-4 text-sm text-gray-500 hover:text-gray-900">← Back to Dashboard</button>
        
        <div className="mb-8 flex justify-between items-end border-b pb-4">
          <div>
             <h1 className="text-3xl font-bold text-gray-900">{classInfo?.name}</h1>
             <p className="text-gray-500">{classInfo?.description}</p>
             <p className="text-xs text-gray-400 mt-1 font-mono">Class Code: <span className="bg-gray-200 px-1 rounded text-gray-700 select-all">{classInfo?.access_code}</span></p>
          </div>
          {/* Actions */}
          <div className="flex gap-3">
            {canEdit && (
                <button onClick={() => router.push(`/dashboard/class/${classId}/students`)} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 shadow-lg text-sm">
                    View Roster
                </button>
            )}
            
            {(canEdit && !isCourseRep) && ( 
              <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition shadow-lg text-sm">
                + Add Module
              </button>
            )}
            
            {(isCourseRep && canEdit) && (
                <button onClick={() => alert(`Share Code: ${classInfo?.access_code}`)} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition shadow-lg text-sm">
                    Invite Lecturer
                </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
           {modules.length === 0 && <p className="text-gray-400 italic col-span-full text-center py-10">No modules yet.</p>}
           
           {modules.map(mod => (
             <div key={mod.id} className="bg-white p-6 rounded-xl border hover:shadow-md transition flex flex-col justify-between h-full">
                <div>
                    <div className="flex justify-between items-start mb-3">
                    <span className="text-2xl">📚</span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">Module</span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">{mod.title}</h3>
                    <p className="text-gray-500 text-sm mt-1 mb-4 line-clamp-3">{mod.description}</p>
                </div>
                <Link href={`/dashboard/courses/${mod.id}`} className="block w-full text-center bg-gray-50 border border-gray-200 py-2 rounded font-bold text-gray-700 hover:bg-gray-100 transition">
                  Open Materials
                </Link>
             </div>
           ))}
        </div>
      </div>

      {/* ADD MODULE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                <h3 className="text-xl font-bold mb-4 text-gray-900">Add New Module</h3>
                <form onSubmit={handleAddModule} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input className="w-full border p-2 rounded text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Week 1: Introduction" value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea className="w-full border p-2 rounded text-gray-900 h-24 resize-none focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Overview of this week..." value={newCourse.description} onChange={e => setNewCourse({...newCourse, description: e.target.value})} />
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 border py-2 rounded text-gray-700 hover:bg-gray-50 font-medium">Cancel</button>
                        <button type="submit" disabled={processing} className="flex-1 bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700 transition">{processing ? 'Adding...' : 'Add'}</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}