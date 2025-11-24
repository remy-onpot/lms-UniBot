'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProgressRing } from '@/components/ProgressRing'; 

// PASTE YOUR SUPER ADMIN UID HERE
const SUPER_ADMIN_UID = "82711e72-9c6a-48b8-ac34-e47f379e4695"; 

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

      // 1. REDIRECT SUPER ADMIN
      if (user.id === SUPER_ADMIN_UID) {
        return router.replace('/super-admin');
      }

      setUser(user);

      // 2. Get User Role from Database
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile) {
        setRole(profile.role);
        // Fetch data specific to this role
        await fetchData(profile.role, user.id);
      } else {
        // Fallback for user created before trigger update
        setRole('student'); 
        await fetchData('student', user.id);
      }
      setLoading(false);
    };
    checkSession();
  }, [router]);

  const fetchData = async (role: string, userId: string) => {
    let classesData: any[] = [];
    
    if (role === 'lecturer') {
      const { data } = await supabase
        .from('class_instructors')
        .select('class_id, classes(*)')
        .eq('lecturer_id', userId);
      classesData = data?.map((e: any) => e.classes) || [];
    } else {
      // Student: Fetch enrolled classes AND calculate progress
      const { data: enrolled } = await supabase
        .from('class_enrollments')
        .select(`
          class_id, 
          classes (id, name, description, access_code, 
            courses ( id, quizzes ( id, quiz_results ( student_id ) ) ) 
          )
        `)
        .eq('student_id', userId);
      
      if (enrolled) {
        classesData = enrolled.map((e: any) => {
            const cls = e.classes;
            // Calculate total quizzes available in the class
            const totalQuizzes = cls.courses?.flatMap((c: any) => c.quizzes || []).length || 0;
            
            // Calculate how many this student has taken
            const takenQuizzes = cls.courses?.flatMap((c: any) => c.quizzes || [])
                .filter((q: any) => q.quiz_results?.some((r: any) => r.student_id === userId)).length || 0;

            const progress = totalQuizzes > 0 ? Math.round((takenQuizzes / totalQuizzes) * 100) : 0;

            return {
                ...cls,
                progress: progress,
                totalQuizzes: totalQuizzes,
                takenQuizzes: takenQuizzes
            };
        });
      }
    }

    setClasses(classesData);

    // Only fetch notifications for students if they have classes
    if (role === 'student' && classesData.length > 0) {
      await fetchUnreadCounts(classesData.map(c => c.id), userId);
    }
  };

  // --- OPTIMIZED PERFORMANCE FETCH (Batching) ---
  const fetchUnreadCounts = async (classIds: string[], userId: string) => {
    if (classIds.length === 0) return;

    try {
      // 1. Get ALL announcements for these classes
      const { data: allAnnouncements, error: annError } = await supabase
        .from('class_announcements')
        .select('id, class_id')
        .in('class_id', classIds);

      if (annError) throw annError;
      if (!allAnnouncements || allAnnouncements.length === 0) return;

      const allAnnouncementIds = allAnnouncements.map(a => a.id);

      // 2. Get read receipts for this user
      const { data: readReceipts, error: readError } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', userId)
        .in('announcement_id', allAnnouncementIds);

      if (readError) throw readError;

      // 3. Calculate unread counts in memory
      const readSet = new Set(readReceipts?.map(r => r.announcement_id));
      const counts: { [key: string]: number } = {};

      classIds.forEach(id => counts[id] = 0);

      allAnnouncements.forEach(announcement => {
        if (!readSet.has(announcement.id)) {
          counts[announcement.class_id] = (counts[announcement.class_id] || 0) + 1;
        }
      });

      setUnreadCounts(counts);

    } catch (error) {
      console.error("Error fetching unread counts:", error);
    }
  };

  // LECTURER: Create Class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    
    const prefix = newClass.name.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const accessCode = `${prefix}-${randomNum}`;

    // 1. Create Class
    const { data: createdClass, error } = await supabase.from('classes').insert([{
      name: newClass.name,
      description: newClass.description,
      access_code: accessCode,
      lecturer_id: user.id 
    }]).select().single();

    if (error) {
        alert(error.message);
    } else {
        // 2. Auto-Assign Creator as Instructor
        await supabase.from('class_instructors').insert([{
            lecturer_id: user.id,
            class_id: createdClass.id
        }]);

        alert(`Class Created! Access Code: ${accessCode}`);
        setShowCreateModal(false);
        fetchData('lecturer', user.id);
    }
    setProcessing(false);
  };

  // EVERYONE: Join Class
  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    const cleanCode = joinCode.trim().toUpperCase();
    
    const { data: classData, error: searchError } = await supabase
      .from('classes')
      .select('id')
      .eq('access_code', cleanCode)
      .single();

    if (searchError || !classData) {
      alert(`Invalid Class Code: "${cleanCode}".`);
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
      else alert("Join Error: " + joinError.message);
    } else {
      alert(`Successfully joined as ${role === 'lecturer' ? 'Instructor' : 'Student'}! 🎉`);
      setShowJoinModal(false);
      setJoinCode('');
      fetchData(role!, user.id);
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
      {/* NAVBAR */}
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

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {role === 'lecturer' ? 'My Teaching Classes' : 'My Classes'}
            </h1>
            <p className="mt-2 text-gray-600">
              {role === 'lecturer' ? 'Manage your classes and content.' : 'Select a class to view courses.'}
            </p>
          </div>
          
          {/* ACTION BUTTONS */}
          {role === 'lecturer' ? (
             <div className="flex gap-2">
                <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-lg transition">
                  + Create Class
                </button>
                <button onClick={() => setShowJoinModal(true)} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-50 transition">
                  Join Existing
                </button>
             </div>
          ) : (
            <button onClick={() => setShowJoinModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 shadow-lg transition">
              Join Class with Code
            </button>
          )}
        </div>

        {/* CLASSES GRID */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {classes.length === 0 ? (
            <div className="col-span-full p-12 text-center text-gray-500 border-2 border-dashed rounded-xl">
              No classes found. {role === 'lecturer' ? "Create one to get started!" : "Join one to see your courses."}
            </div>
          ) : (
            classes.map((cls) => (
              <div 
                key={cls.id} 
                className="group relative rounded-xl bg-white p-6 shadow-sm border hover:shadow-md transition cursor-pointer" 
                onClick={() => router.push(`/dashboard/class/${cls.id}`)}
              >
                {/* Notification Badge (Students Only) */}
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
                  <div className="h-12 w-12 rounded-lg bg-indigo-50 flex items-center justify-center text-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
                    🏫
                  </div>
                  
                  {/* Progress Ring (Student View) */}
                  {role === 'student' && cls.progress !== undefined && (
                    <div className="w-14 h-14 shrink-0 -mt-1">
                        <ProgressRing 
                            radius={28} 
                            stroke={4} 
                            progress={cls.progress} 
                            color={cls.progress === 0 ? '#9ca3af' : '#3b82f6'} 
                        />
                    </div>
                  )}
                  
                  {/* Code Label (Lecturer) */}
                  {role === 'lecturer' && (
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 border">
                      Code: {cls.access_code}
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-gray-900">{cls.name}</h3>
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">{cls.description || 'No description.'}</p>
                
                {/* Show progress text */}
                {role === 'student' && cls.progress !== undefined && (
                    <p className="text-xs text-gray-500 mt-2">
                        {cls.takenQuizzes}/{cls.totalQuizzes} Quizzes Done
                    </p>
                )}
                
                <div className="mt-4 pt-4 border-t border-gray-100 text-blue-600 text-sm font-bold group-hover:underline">
                  Enter Class →
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* MODAL: CREATE CLASS (Lecturer) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Create New Class</h2>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <input 
                className="w-full border p-2 rounded text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                placeholder="Class Name (e.g. Marketing 300)" 
                value={newClass.name} 
                onChange={e => setNewClass({...newClass, name: e.target.value})} 
                required 
              />
              <textarea 
                className="w-full border p-2 rounded text-gray-900 h-24 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                placeholder="Description" 
                value={newClass.description} 
                onChange={e => setNewClass({...newClass, description: e.target.value})} 
              />
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2 border rounded text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={processing} className="flex-1 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700">{processing ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: JOIN CLASS (Everyone) */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Join a Class</h2>
            <p className="text-sm text-gray-500 mb-4">Enter the Class Access Code.</p>
            <form onSubmit={handleJoinClass} className="space-y-4">
              <input 
                className="w-full border p-3 rounded text-gray-900 text-center font-mono text-lg uppercase tracking-widest outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" 
                placeholder="XXX-0000" 
                value={joinCode} 
                onChange={e => setJoinCode(e.target.value.toUpperCase())} 
                required 
              />
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowJoinModal(false)} className="flex-1 py-2 border rounded text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={processing} className="flex-1 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700">{processing ? 'Joining...' : 'Join'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
