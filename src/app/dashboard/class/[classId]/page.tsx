'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ClassPage() {
  const params = useParams();
  const classId = Array.isArray(params?.classId) ? params?.classId[0] : params?.classId;
  const router = useRouter();
  
  const [role, setRole] = useState<string | null>(null);
  const [classInfo, setClassInfo] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [isInstructor, setIsInstructor] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false); // Added processing state for modal

  useEffect(() => {
    const fetchData = async () => {
      // 1. Safety Check
      if (!classId || classId === 'undefined' || classId === 'null') {
        setErrorMsg("Invalid Class ID. The URL seems broken.");
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      setRole(profile?.role);

      // 2. Get Class Info
      const { data: cls, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

      if (classError || !cls) {
        setErrorMsg("Class not found. It may have been deleted.");
        setLoading(false);
        return;
      }
      setClassInfo(cls);

      // 3. Check if Instructor
      const { data: instructor } = await supabase
        .from('class_instructors')
        .select('id')
        .eq('class_id', classId)
        .eq('lecturer_id', user.id)
        .single();
      
      setIsInstructor(!!instructor || profile?.role === 'admin'); // Admin bypass added

      // 4. Get Courses (Modules) in this Class
      const { data: courseList } = await supabase
        .from('courses')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false });
        
      if (courseList) setCourses(courseList);
      
      setLoading(false);
    };
    fetchData();
  }, [classId, router]);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('courses').insert([{
      title: newCourse.title,
      description: newCourse.description,
      lecturer_id: user.id, // Current user is the lecturer who created this module
      class_id: classId // Link to this class!
    }]);

    if (error) alert(error.message);
    else {
      alert("Module Added!");
      setShowModal(false);
      setNewCourse({ title: '', description: '' });
      window.location.reload(); // Simple reload to refresh list
    }
    setProcessing(false);
  };

  const handleGoToRoster = () => {
    router.push(`/dashboard/class/${classId}/students`);
  }

  // --- UI/Error Logic ---
  if (errorMsg) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4">
        <h1 className="text-2xl font-bold text-red-700 mb-4">Course Load Failed</h1>
        <div className="bg-white p-4 rounded shadow text-red-600 font-mono text-sm mb-6 border border-red-200">
          {errorMsg}
        </div>
        <button onClick={() => router.push('/dashboard')} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-lg">
          Return to Dashboard
        </button>
    </div>
  );

  if (loading) return <div className="p-10 flex justify-center">Loading Class...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <button onClick={() => router.push('/dashboard')} className="mb-4 text-sm text-gray-500 hover:text-gray-900">← Back to Dashboard</button>
        
        <div className="mb-8 flex justify-between items-end border-b pb-4">
          <div>
             <h1 className="text-3xl font-bold text-gray-900">{classInfo?.name}</h1>
             <p className="text-gray-500">{classInfo?.description}</p>
             <p className="text-xs text-gray-400 mt-1 font-mono">Class Code: {classInfo?.access_code}</p>
          </div>
          {/* Instructor/Admin Actions */}
          {(isInstructor || role === 'admin') && (
            <div className="flex gap-3">
              <button onClick={handleGoToRoster} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 shadow-lg text-sm">
                View Roster
              </button>
             <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition shadow-lg">
               + Add Course Module
             </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
           {courses.length === 0 && <p className="text-gray-400 italic col-span-full text-center py-10">No modules in this class yet.</p>}
           
           {courses.map(course => (
             <div key={course.id} className="bg-white p-6 rounded-xl border hover:shadow-md transition flex flex-col justify-between h-full">
                <div>
                    <div className="flex justify-between items-start mb-3">
                    <span className="text-2xl">📚</span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">Module</span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">{course.title}</h3>
                    <p className="text-gray-500 text-sm mt-1 mb-4 line-clamp-3">{course.description}</p>
                </div>
                <Link href={`/dashboard/courses/${course.id}`} className="block w-full text-center bg-gray-50 border border-gray-200 py-2 rounded font-bold text-gray-700 hover:bg-gray-100 transition">
                  Open Materials
                </Link>
             </div>
           ))}
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                <h3 className="text-xl font-bold mb-4 text-gray-900">Add New Module</h3>
                <form onSubmit={handleAddCourse} className="space-y-4">
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