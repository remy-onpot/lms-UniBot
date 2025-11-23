'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const ADMIN_UID = "82711e72-9c6a-48b8-ac34-e47f379e4695"; 

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  const [newClass, setNewClass] = useState({ name: '', description: '' });
  const [joinCode, setJoinCode] = useState('');
  const [processing, setProcessing] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      setUser(user);

      if (user.id === ADMIN_UID) {
        setRole('admin');
        await fetchClasses('admin', user.id);
      } else {
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile) {
          setRole(profile.role);
          await fetchClasses(profile.role, user.id);
        }
      }
      setLoading(false);
    };
    checkSession();
  }, [router]);

  const fetchClasses = async (role: string, userId: string) => {
    let fetchedClasses: any[] = [];

    if (role === 'admin') {
      const { data } = await supabase.from('classes').select('*');
      if (data) fetchedClasses = data;
    } else if (role === 'lecturer') {
      const { data } = await supabase
        .from('class_instructors')
        .select('class_id, classes(*)')
        .eq('lecturer_id', userId);
      if (data) fetchedClasses = data.map((e: any) => e.classes);
    } else {
      const { data } = await supabase
        .from('class_enrollments')
        .select('class_id, classes(*)')
        .eq('student_id', userId);
      if (data) fetchedClasses = data.map((e: any) => e.classes);
    }

    setClasses(fetchedClasses);

    // Fetch unread counts for students only
    if (role === 'student' && fetchedClasses.length > 0) {
      await fetchUnreadCounts(fetchedClasses.map(c => c.id), userId);
    }
  };

  const fetchUnreadCounts = async (classIds: string[], userId: string) => {
    const counts: { [key: string]: number } = {};
    
    for (const classId of classIds) {
      // Get all announcements for this class
      const { data: announcements } = await supabase
        .from('class_announcements')
        .select('id')
        .eq('class_id', classId);
      
      if (!announcements || announcements.length === 0) {
        counts[classId] = 0;
        continue;
      }
      
      const announcementIds = announcements.map(a => a.id);
      
      // Get read announcements by this user
      const { data: readAnnouncements } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', userId)
        .in('announcement_id', announcementIds);
      
      const readIds = new Set(readAnnouncements?.map(r => r.announcement_id) || []);
      counts[classId] = announcementIds.filter(id => !readIds.has(id)).length;
    }
    
    setUnreadCounts(counts);
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    
    const prefix = newClass.name.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const accessCode = `${prefix}-${randomNum}`;

    const { error } = await supabase.from('classes').insert([{
      name: newClass.name,
      description: newClass.description,
      access_code: accessCode,
      lecturer_id: user.id
    }]);

    if (error) alert(error.message);
    else {
      alert(`Class Created! Access Code: ${accessCode}`);
      setShowCreateModal(false);
      fetchClasses('admin', user.id);
    }
    setProcessing(false);
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    const { data: classData, error: searchError } = await supabase
      .from('classes')
      .select('id')
      .eq('access_code', joinCode)
      .single();

    if (searchError || !classData) {
      alert("Invalid Class Code.");
      setProcessing(false);
      return;
    }

    const table = role === 'lecturer' ? 'class_instructors' : 'class_enrollments';
    const idField = role === 'lecturer' ? 'lecturer_id' : 'student_id';

    const { error: joinError } = await supabase.from(table).insert([{
      [idField]: user.id,
      class_id: classData.id
    }]);

    if (joinError) {
      if (joinError.code === '23505') alert("You are already in this class!");
      else if (joinError.code === '23505' && joinError.message.includes('one_class_per_student')) {
        alert("You can only join ONE class! Please contact admin to switch classes.");
      } else {
        alert(joinError.message);
      }
    } else {
      alert(`Successfully joined as ${role === 'lecturer' ? 'Instructor' : 'Student'}! 🎉`);
      setShowJoinModal(false);
      fetchClasses(role!, user.id);
    }
    setProcessing(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading Portal...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-800">LMS Portal</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{user?.email} ({role})</span>
              <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800 font-medium">Log Out</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {role === 'admin' ? 'Admin Panel' : role === 'lecturer' ? 'My Teaching Classes' : 'My Classes'}
            </h1>
            <p className="mt-2 text-gray-600">
              {role === 'admin' ? 'Manage university classes.' : 'Select a class to view courses.'}
            </p>
          </div>
          
          {/* Admin creates, Lecturers join anytime, Students join only if they have no class */}
          {role === 'admin' ? (
            <button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-lg">
              + Create Global Class
            </button>
          ) : role === 'lecturer' || (role === 'student' && classes.length === 0) ? (
            <button onClick={() => setShowJoinModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 shadow-lg">
              Join Class with Code
            </button>
          ) : null}
        </div>

        {/* CLASSES GRID */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {classes.length === 0 ? (
            <div className="col-span-full p-12 text-center text-gray-500 border-2 border-dashed rounded-xl">
              No classes found. {role !== 'admin' && "Join one to get started!"}
            </div>
          ) : (
            classes.map((cls) => (
              <div 
                key={cls.id} 
                className="group relative rounded-xl bg-white p-6 shadow-sm border hover:shadow-md transition cursor-pointer" 
                onClick={() => router.push(`/dashboard/class/${cls.id}`)}
              >
                {/* Notification Badge for Students */}
                {role === 'student' && unreadCounts[cls.id] > 0 && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className="relative">
                      <span className="flex h-7 w-7">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-7 w-7 bg-red-500 items-center justify-center">
                          <span className="text-white text-xs font-bold">{unreadCounts[cls.id]}</span>
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                <div className="mb-4 flex justify-between items-start">
                  <div className="h-12 w-12 rounded-lg bg-indigo-50 flex items-center justify-center text-2xl text-indigo-600">
                    🏫
                  </div>
                  {(role === 'admin' || role === 'lecturer') && (
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 border">
                      Code: {cls.access_code}
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-gray-900">{cls.name}</h3>
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">{cls.description || 'No description.'}</p>
                
                {/* Show notification indicator in text for students */}
                {role === 'student' && unreadCounts[cls.id] > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-red-600 font-medium">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    {unreadCounts[cls.id]} new announcement{unreadCounts[cls.id] !== 1 ? 's' : ''}
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-gray-100 text-blue-600 text-sm font-bold group-hover:underline">
                  Enter Class →
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* MODAL: CREATE CLASS */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Create Global Class</h2>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <input 
                className="w-full border p-2 rounded text-gray-900" 
                placeholder="Class Name (e.g. Marketing 300)" 
                value={newClass.name} 
                onChange={e => setNewClass({...newClass, name: e.target.value})} 
                required 
              />
              <textarea 
                className="w-full border p-2 rounded text-gray-900 h-24" 
                placeholder="Description" 
                value={newClass.description} 
                onChange={e => setNewClass({...newClass, description: e.target.value})} 
              />
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2 border rounded text-gray-700">Cancel</button>
                <button type="submit" disabled={processing} className="flex-1 py-2 bg-indigo-600 text-white rounded font-bold">{processing ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: JOIN CLASS */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Join a Class</h2>
            <p className="text-sm text-gray-500 mb-4">
              {role === 'student' 
                ? 'You can only join ONE class. Enter the Class Access Code.' 
                : 'Enter the Class Access Code.'}
            </p>
            <form onSubmit={handleJoinClass} className="space-y-4">
              <input 
                className="w-full border p-3 rounded text-gray-900 text-center font-mono text-lg uppercase tracking-widest" 
                placeholder="XXX-0000" 
                value={joinCode} 
                onChange={e => setJoinCode(e.target.value.toUpperCase())} 
                required 
              />
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowJoinModal(false)} className="flex-1 py-2 border rounded text-gray-700">Cancel</button>
                <button type="submit" disabled={processing} className="flex-1 py-2 bg-green-600 text-white rounded font-bold">{processing ? 'Joining...' : 'Join'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}