'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProgressRing } from '@/components/ProgressRing'; 

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // "Independent" means they are NOT linked to a University
  const [isIndependent, setIsIndependent] = useState(false);
  
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

      // 1. Fetch User Profile & Role
      const { data: profile } = await supabase
        .from('users')
        .select('role, university_id')
        .eq('id', user.id)
        .single();

      const userRole = profile?.role || 'student';
      const hasUniversity = !!profile?.university_id;

      // 2. ROUTING LOGIC (Dynamic - No Hardcoded IDs)
      
      if (userRole === 'super_admin') {
        return router.replace('/super-admin');
      }

      if (userRole === 'university_admin') {
        return router.replace('/dashboard/university-admin');
      }

      // Lecturers & Students Stay Here
      setUser(user);
      setRole(userRole);
      setIsIndependent(!hasUniversity);
      
      await fetchData(userRole, user.id);
      
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
            const totalQuizzes = cls.courses?.flatMap((c: any) => c.quizzes || []).length || 0;
            const takenQuizzes = cls.courses?.flatMap((c: any) => c.quizzes || [])
                .filter((q: any) => q.quiz_results?.some((r: any) => r.student_id === userId)).length || 0;
            const progress = totalQuizzes > 0 ? Math.round((takenQuizzes / totalQuizzes) * 100) : 0;

            return { ...cls, progress, totalQuizzes, takenQuizzes };
        });
      }
    }

    setClasses(classesData);

    if (role === 'student' && classesData.length > 0) {
      await fetchUnreadCounts(classesData.map(c => c.id), userId);
    }
  };

  const fetchUnreadCounts = async (classIds: string[], userId: string) => {
    if (classIds.length === 0) return;
    try {
      const { data: allAnnouncements } = await supabase
        .from('class_announcements')
        .select('id, class_id')
        .in('class_id', classIds);

      if (!allAnnouncements?.length) return;

      const { data: readReceipts } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', userId)
        .in('announcement_id', allAnnouncements.map(a => a.id));

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
      console.error("Error fetching counts:", error);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    
    const prefix = newClass.name.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const accessCode = `${prefix}-${randomNum}`;

    const { data: createdClass, error } = await supabase.from('classes').insert([{
      name: newClass.name,
      description: newClass.description,
      access_code: accessCode,
      lecturer_id: user.id 
    }]).select().single();

    if (error) {
        alert(error.message);
    } else {
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

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    const cleanCode = joinCode.trim().toUpperCase();

    // FIX: Added type casting 'as any' to satisfy TypeScript
    const { data: classData, error: rpcError } = await supabase
      .rpc('get_class_id_by_code', { class_code: cleanCode })
      .single() as any;

    if (rpcError || !classData) {
      console.error('Join error:', rpcError);
      alert("Invalid Class Code or Class Locked.");
      setProcessing(false);
      return;
    }

    const table = role === 'lecturer' ? 'class_instructors' : 'class_enrollments';
    const idField = role === 'lecturer' ? 'lecturer_id' : 'student_id';

    const { error: joinError } = await supabase.from(table).insert([{ [idField]: user.id, class_id: classData.id }]);

    if (joinError) {
      if (joinError.code === '23505') alert("You are already in this class!");
      else alert("Error joining class: " + joinError.message);
    } else {
      alert(`Successfully joined ${classData.name}!`);
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Loading Portal...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-800">LMS Portal</span>
              {role === 'lecturer' && (
                <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-bold border ${isIndependent ? 'bg-green-50 text-green-700 border-green-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                  {isIndependent ? 'Independent' : 'University Staff'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 hidden sm:block">{user?.email} ({role})</span>
              <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800 font-medium">Log Out</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {role === 'lecturer' ? 'Teaching Dashboard' : 'My Classes'}
            </h1>
            <p className="mt-2 text-gray-600">
              {role === 'lecturer' 
                ? (isIndependent ? 'Manage your personal classes.' : 'View classes assigned by your university.')
                : 'Select a class to continue learning.'}
            </p>
          </div>
          
          <div className="flex gap-2">
            {role === 'lecturer' && isIndependent && (
              <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-lg transition">
                + Create Class
              </button>
            )}
            
            <button onClick={() => setShowJoinModal(true)} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-50 transition">
              Join Existing
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {classes.length === 0 ? (
            <div className="col-span-full p-12 text-center text-gray-500 border-2 border-dashed rounded-xl bg-white/50">
              <div className="text-4xl mb-3">📚</div>
              <p className="font-medium">No classes found.</p>
              <p className="text-sm mt-1 text-gray-400">
                {role === 'lecturer' 
                  ? (isIndependent ? "Create a class to get started!" : "Contact your University Admin to be assigned classes.") 
                  : "Join a class to see your courses."}
              </p>
            </div>
          ) : (
            classes.map((cls) => (
              <div 
                key={cls.id} 
                className="group relative rounded-xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-200 cursor-pointer" 
                onClick={() => router.push(`/dashboard/class/${cls.id}`)}
              >
                {role === 'student' && unreadCounts[cls.id] > 0 && (
                  <div className="absolute top-3 right-3 z-10">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  </div>
                )}

                <div className="mb-4 flex justify-between items-start">
                  <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-2xl text-indigo-600 group-hover:scale-110 transition-transform">
                    🏫
                  </div>
                  
                  {role === 'student' && cls.progress !== undefined && (
                    <div className="w-12 h-12 shrink-0 -mt-1">
                        <ProgressRing radius={24} stroke={3} progress={cls.progress} color={cls.progress === 100 ? '#10b981' : '#3b82f6'} />
                    </div>
                  )}
                  
                  {role === 'lecturer' && (
                    <span className="text-xs font-mono bg-gray-50 px-2 py-1 rounded-md text-gray-600 border border-gray-200">
                      {cls.access_code}
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{cls.name}</h3>
                <p className="mt-2 text-sm text-gray-500 line-clamp-2 h-10">{cls.description || 'No description provided.'}</p>
                
                {role === 'student' && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 font-medium">
                       <span>📊 {cls.takenQuizzes}/{cls.totalQuizzes} Quizzes</span>
                    </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-400 group-hover:text-blue-600 transition-colors">Open Class</span>
                  <span className="text-gray-300 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {showCreateModal && role === 'lecturer' && isIndependent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl transform transition-all scale-100">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">Create New Class</h2>
            <form onSubmit={handleCreateClass} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                <input 
                  className="w-full border border-gray-200 p-3 rounded-xl text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-blue-500/20 transition-all" 
                  placeholder="e.g. Advanced Marketing 101" 
                  value={newClass.name} 
                  onChange={e => setNewClass({...newClass, name: e.target.value})} 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  className="w-full border border-gray-200 p-3 rounded-xl text-gray-900 h-32 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-blue-500/20 resize-none transition-all" 
                  placeholder="What will students learn?" 
                  value={newClass.description} 
                  onChange={e => setNewClass({...newClass, description: e.target.value})} 
                />
              </div>
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={processing} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:translate-y-0">
                  {processing ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🔑</div>
              <h2 className="text-2xl font-bold text-gray-900">Join a Class</h2>
              <p className="text-gray-500 mt-2">Enter the access code shared by your instructor.</p>
            </div>
            
            <form onSubmit={handleJoinClass} className="space-y-6">
              <input 
                className="w-full border-2 border-gray-200 p-4 rounded-xl text-gray-900 text-center font-mono text-2xl uppercase tracking-widest outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all placeholder-gray-300" 
                placeholder="XXX-0000" 
                value={joinCode} 
                onChange={e => setJoinCode(e.target.value.toUpperCase())} 
                required 
                maxLength={9}
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowJoinModal(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={processing} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:translate-y-0">
                  {processing ? 'Joining...' : 'Join Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}