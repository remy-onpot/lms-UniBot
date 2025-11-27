'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProgressRing } from '@/components/ProgressRing'; 
import OnboardingWizard from '@/components/OnboardingWizard';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isCourseRep, setIsCourseRep] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  
  const [classes, setClasses] = useState<any[]>([]);
  const [ownedClassesCount, setOwnedClassesCount] = useState(0);

  const [showWizard, setShowWizard] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showInviteTA, setShowInviteTA] = useState(false);
  
  const [newClass, setNewClass] = useState({ name: '', description: '' });
  const [joinCode, setJoinCode] = useState('');
  const [processing, setProcessing] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      const userRole = userProfile?.role || 'student';
      const isRep = userProfile?.is_course_rep || false;

      setUser(user);
      setProfile(userProfile);
      setRole(userRole);
      setIsCourseRep(isRep);
      
      // TRIGGER WIZARD IF NEEDED
      if ((userRole === 'lecturer' || isRep) && !userProfile?.onboarding_completed) {
        setShowWizard(true);
      }
      
      await fetchData(userRole, user.id, isRep);
      setLoading(false);
    };
    checkSession();
  }, [router]);

  const fetchData = async (role: string, userId: string, isRep: boolean) => {
    let classesData: any[] = [];
    
    // 1. Fetch Owned Classes (Lecturer or Rep)
    if (role === 'lecturer' || isRep) {
      const { data } = await supabase
        .from('class_instructors')
        .select('class_id, classes(*)')
        .eq('lecturer_id', userId);
      
      const owned = data?.map((e: any) => e.classes) || [];
      const classMap = new Map();
      owned.forEach(c => classMap.set(c.id, { ...c, isOwner: true }));
      
      // Check how many they actually created vs just joined as instructor
      const { count } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('lecturer_id', userId);
        
      setOwnedClassesCount(count || 0);
      classesData = Array.from(classMap.values());
    } 
    
    // 2. Fetch Enrolled Classes (Student view)
    if (role === 'student') {
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
        const enrolledClasses = enrolled.map((e: any) => {
            const cls = e.classes;
            
            const allQuizzes = cls.courses?.flatMap((c: any) => c.quizzes || []) || [];
            const totalQuizzes = allQuizzes.length;
            
            const takenQuizzes = allQuizzes.filter((q: any) => 
                q.quiz_results && Array.isArray(q.quiz_results) && q.quiz_results.some((r: any) => r.student_id === userId)
            ).length;

            let progress = 0;
            if (totalQuizzes > 0) {
                progress = Math.round((takenQuizzes / totalQuizzes) * 100);
            }
            if (isNaN(progress)) progress = 0;

            return { ...cls, progress, totalQuizzes, takenQuizzes, isOwner: false };
        });
        
        // Merge without duplicates
        const currentIds = new Set(classesData.map(c => c.id));
        enrolledClasses.forEach(c => {
            if(!currentIds.has(c.id)) classesData.push(c);
        });
      }
    }
    setClasses(classesData);
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    
    const prefix = newClass.name.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const accessCode = `${prefix}-${randomNum}`;

    const { data: createdClass, error } = await supabase.from('classes').insert([{
      name: newClass.name, description: newClass.description, access_code: accessCode, lecturer_id: user.id 
    }]).select().single();

    if (error) alert(error.message);
    else {
        await supabase.from('class_instructors').insert([{ lecturer_id: user.id, class_id: createdClass.id }]);
        alert(`Class Created! Access Code: ${accessCode}`);
        setShowCreateModal(false);
        fetchData(role!, user.id, isCourseRep);
    }
    setProcessing(false);
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    const cleanCode = joinCode.trim().toUpperCase();
    const { data: classData, error: rpcError } = await supabase.rpc('get_class_id_by_code', { class_code: cleanCode }).single() as any;

    if (rpcError || !classData) { alert("Invalid Class Code."); setProcessing(false); return; }

    const table = 'class_enrollments';
    const idField = 'student_id';
    
    const { data: existing } = await supabase.from(table).select('id').eq(idField, user.id).eq('class_id', classData.id).maybeSingle();
    if (existing) { alert("You are already in this class!"); setProcessing(false); return; }

    const { error: joinError } = await supabase.from(table).insert([{ [idField]: user.id, class_id: classData.id }]);

    if (joinError) alert(joinError.message);
    else { alert(`Joined ${classData.name}!`); setShowJoinModal(false); fetchData(role!, user.id, isCourseRep); }
    setProcessing(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  if (loading) return <div className="p-20 text-center animate-pulse">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {showWizard && <OnboardingWizard userId={user.id} role={role as any} isCourseRep={isCourseRep} onComplete={() => { setShowWizard(false); fetchData(role!, user.id, isCourseRep); }} />}

      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎓</span>
            <span className="font-bold text-slate-900">UniBot</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden sm:block">{profile?.full_name}</span>
            <button onClick={handleLogout} className="text-sm text-red-600 font-bold hover:underline">Log Out</button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        
        <div className="bg-linear-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">Hello, {profile?.full_name?.split(' ')[0]} 👋</h1>
            <p className="text-slate-300 mb-6 max-w-xl">
              {role === 'lecturer' || isCourseRep
                ? "Your classroom is ready. Manage your content and students below." 
                : "Ready to learn? Access your courses and get instant AI tutoring."}
            </p>
            
            <div className="flex flex-wrap gap-3 mt-6">
              
              {/* CREATE CLASS - Visible to Lecturer OR Course Rep (if they don't have one) */}
              {(role === 'lecturer' || (isCourseRep && ownedClassesCount === 0)) && (
                <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg flex items-center gap-2">
                  <span>+</span> Create Class
                </button>
              )}

              {/* INVITE TA - Visible to Lecturers with Elite Plan */}
              {role === 'lecturer' && profile?.plan_tier === 'elite' && (
                <button onClick={() => setShowInviteTA(true)} className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold transition backdrop-blur-sm flex items-center gap-2">
                  <span>🤝</span> Invite Co-Lecturer
                </button>
              )}

              {/* JOIN CLASS - Visible to Everyone */}
              <button onClick={() => setShowJoinModal(true)} className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold transition backdrop-blur-sm flex items-center gap-2">
                <span>🔑</span> Join Existing Class
              </button>
            </div>
          </div>
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-20 -mb-10 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl"></div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 font-bold uppercase">Active Classes</p>
              <p className="text-2xl font-bold text-slate-900">{classes.length}</p>
           </div>
           {role === 'student' && (
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <p className="text-xs text-slate-500 font-bold uppercase">Pending Quizzes</p>
                <p className="text-2xl font-bold text-orange-600">
                    {classes.reduce((acc, c) => acc + (isNaN((c.totalQuizzes || 0) - (c.takenQuizzes || 0)) ? 0 : ((c.totalQuizzes || 0) - (c.takenQuizzes || 0))), 0)}
                </p>
             </div>
           )}
        </div>

        {/* CLASSES LIST */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Your Classes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {classes.length === 0 ? (
              <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <p className="text-slate-500">No classes yet. Click the button above to get started!</p>
              </div>
            ) : (
              classes.map((cls) => (
                <div 
                  key={cls.id} 
                  onClick={() => router.push(`/dashboard/class/${cls.id}`)}
                  className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📚</div>
                    
                    {!cls.isOwner && cls.totalQuizzes > 0 && (
                       <div className="w-10 h-10">
                           <ProgressRing radius={20} stroke={3} progress={cls.progress || 0} color="#3b82f6" />
                       </div>
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-1 group-hover:text-blue-600 transition">{cls.name}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2">{cls.description}</p>
                  
                  {cls.isOwner && (
                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase">Code:</span>
                      <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-700 select-all">{cls.access_code}</span>
                    </div>
                  )}
                  
                  {!cls.isOwner && (
                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2 text-xs text-gray-500 font-medium">
                       {cls.totalQuizzes > 0 ? (
                           <span>📝 {cls.takenQuizzes}/{cls.totalQuizzes} Quizzes</span>
                       ) : (
                           <span>No quizzes yet</span>
                       )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <Link href="/ai-assistant" className="fixed bottom-8 right-8 bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:bg-slate-800 hover:scale-110 transition-all z-50 group flex items-center gap-0 hover:gap-2 hover:pr-6">
        <span className="text-2xl">🤖</span>
        <span className="w-0 overflow-hidden group-hover:w-auto transition-all whitespace-nowrap font-bold text-sm">Ask AI</span>
      </Link>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Create New Class</h2>
            <form onSubmit={handleCreateClass} className="space-y-4">
                <input placeholder="Class Name" className="w-full border p-3 rounded-xl" value={newClass.name} onChange={e=>setNewClass({...newClass, name: e.target.value})} required />
                <textarea placeholder="Description" className="w-full border p-3 rounded-xl h-24" value={newClass.description} onChange={e=>setNewClass({...newClass, description: e.target.value})} />
                <div className="flex gap-2">
                    <button type="button" onClick={()=>setShowCreateModal(false)} className="flex-1 py-3 border rounded-xl font-bold text-slate-600">Cancel</button>
                    <button type="submit" disabled={processing} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">{processing ? '...' : 'Create'}</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Join Existing Class</h2>
            <form onSubmit={handleJoinClass} className="space-y-4">
                <input placeholder="Enter Class Code" className="w-full border p-3 rounded-xl text-center font-mono text-xl uppercase tracking-widest" value={joinCode} onChange={e=>setJoinCode(e.target.value)} required />
                <div className="flex gap-2">
                    <button type="button" onClick={()=>setShowJoinModal(false)} className="flex-1 py-3 border rounded-xl font-bold text-slate-600">Cancel</button>
                    <button type="submit" disabled={processing} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold">{processing ? '...' : 'Join'}</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {showInviteTA && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl w-full max-w-sm shadow-2xl text-center">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">🤝</div>
            <h2 className="text-xl font-bold mb-2">Invite Co-Lecturer</h2>
            <p className="text-gray-500 text-sm mb-6">Share this code with your TA or colleague to give them admin access.</p>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
                <p className="font-mono text-2xl font-bold text-orange-800 tracking-widest select-all">
                    {`TA-${user.id.substring(0,4).toUpperCase()}-${Math.floor(Math.random()*1000)}`}
                </p>
            </div>
            <button onClick={() => setShowInviteTA(false)} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}