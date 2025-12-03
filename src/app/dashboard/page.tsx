'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProgressRing } from '@/components/ProgressRing'; 
import OnboardingWizard from '@/components/OnboardingWizard';
import { useClasses, useCreateClass, useJoinClass } from '@/hooks/useClasses';
import { UserProfile } from '@/types';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';

export default function Dashboard() {
  const router = useRouter();

  // --- STATE ---
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  
  const { data: classes = [], isLoading: classesLoading } = useClasses();
  const createClassMutation = useCreateClass();
  const joinClassMutation = useJoinClass();

  // --- UI STATE ---
  const [activeFilter, setActiveFilter] = useState<'all' | 'ongoing' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // --- MODALS ---
  const [showWizard, setShowWizard] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // --- FORMS ---
  const [newClass, setNewClass] = useState({ name: '', description: '' });
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      // Get session (instant - reads from cookies/localStorage)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.log('No session found, redirecting...');
        router.replace('/login');
        return;
      }

      setUser(session.user);

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profileData) {
        console.error('Profile error:', profileError);
        router.replace('/login');
        return;
      }

      setProfile(profileData);

      // Check if onboarding is needed
      if ((profileData.role === 'lecturer' || profileData.is_course_rep) && !profileData.onboarding_completed) {
        setShowWizard(true);
      }

      setInitializing(false);
    } catch (err) {
      console.error('Dashboard initialization error:', err);
      router.replace('/login');
    }
  };

  const handleLogout = async () => { 
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    createClassMutation.mutate(newClass, {
      onSuccess: (data) => {
        alert(`Class Created! Access Code: ${data?.access_code}`);
        setShowCreateModal(false);
        setNewClass({ name: '', description: '' });
      },
      onError: (err) => alert(err.message)
    });
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    joinClassMutation.mutate(joinCode, {
      onSuccess: (data) => {
        alert(`Joined ${data?.name}!`);
        setShowJoinModal(false);
        setJoinCode('');
      },
      onError: (err) => alert(err.message)
    });
  };

  // Show skeleton while initializing
  if (initializing || !profile) {
    return <DashboardSkeleton />;
  }

  // Filter Logic
  const filteredClasses = classes.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === 'all') return matchesSearch;
    if (activeFilter === 'ongoing') return matchesSearch && c.progress < 100;
    if (activeFilter === 'completed') return matchesSearch && c.progress === 100;
    return matchesSearch;
  });

  const ownedClassesCount = classes.filter(c => c.isOwner).length;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans text-slate-900">
      
      {/* Onboarding Wizard */}
      {showWizard && user && (
        <OnboardingWizard 
          userId={user.id} 
          role={profile.role as any} 
          isCourseRep={profile.is_course_rep || false} 
          onComplete={() => setShowWizard(false)} 
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-slate-200">
              🎓
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">UniBot</span>
          </div>
          
          <div className="hidden md:flex items-center bg-slate-100 rounded-full px-4 py-2.5 w-96 border border-transparent focus-within:border-slate-300 focus-within:bg-white transition-all">
            <span className="text-slate-400 mr-2">🔍</span>
            <input 
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400" 
              placeholder="Search for courses..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 leading-none">{profile.full_name}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">{profile.role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
              <img 
                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${profile.email}`} 
                alt="Avatar" 
              />
            </div>
            <button 
              onClick={handleLogout} 
              className="text-slate-400 hover:text-red-500 transition"
              title="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" x2="9" y1="12" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-10">
        
        {/* Hero Section */}
        <section className="relative">
          <div className="bg-slate-900 rounded-3xl p-8 md:p-12 text-white shadow-2xl shadow-slate-200 overflow-hidden relative">
            <div className="relative z-10 max-w-2xl">
              <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
                Welcome back, <br/>
                <span className="text-blue-400">{profile.full_name.split(' ')[0]}</span>.
              </h1>
              <p className="text-slate-400 mb-8 text-lg">
                {profile.role === 'lecturer' || profile.is_course_rep
                  ? "Manage your classroom, track progress, and engage with students." 
                  : "Ready to learn? Your AI tutor is waiting to help you ace your courses."}
              </p>
              
              <div className="flex flex-wrap gap-3">
                {(profile.role === 'lecturer' || (profile.is_course_rep && ownedClassesCount === 0)) && (
                  <button 
                    onClick={() => setShowCreateModal(true)} 
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-blue-900/50 flex items-center gap-2"
                  >
                    <span>+</span> Create Class
                  </button>
                )}
                <button 
                  onClick={() => setShowJoinModal(true)} 
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold transition backdrop-blur-sm flex items-center gap-2 border border-white/10"
                >
                  <span>🔑</span> Join Class
                </button>
                {profile.role === 'lecturer' && profile.plan_tier === 'elite' && (
                  <button 
                    className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 px-6 py-3 rounded-xl font-bold transition backdrop-blur-sm border border-orange-500/20"
                  >
                    Invite TA
                  </button>
                )}
              </div>
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 right-20 w-[300px] h-[300px] bg-purple-600/20 rounded-full blur-3xl -mb-20"></div>
          </div>
        </section>

        {/* Courses Section */}
        <section>
          <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">My Courses</h2>
              <p className="text-slate-500 text-sm mt-1">Continue where you left off</p>
            </div>
            
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100">
              {['all', 'ongoing', 'completed'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                    activeFilter === filter 
                      ? 'bg-slate-900 text-white shadow-md' 
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {classesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div 
                  key={i} 
                  className="bg-white p-6 rounded-3xl border border-slate-100 h-64 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                  <div className="text-4xl mb-4">📂</div>
                  <p className="text-slate-500 font-medium">No courses found.</p>
                  <button 
                    onClick={() => setShowJoinModal(true)} 
                    className="text-blue-600 font-bold mt-2 hover:underline"
                  >
                    Join a class?
                  </button>
                </div>
              ) : (
                filteredClasses.map((cls, i) => {
                  const colors = [
                    'bg-blue-50 text-blue-600', 
                    'bg-purple-50 text-purple-600', 
                    'bg-orange-50 text-orange-600', 
                    'bg-pink-50 text-pink-600'
                  ];
                  const colorClass = colors[i % colors.length];

                  return (
                    <div 
                      key={cls.id} 
                      onClick={() => router.push(`/dashboard/class/${cls.id}`)}
                      className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${colorClass}`}>
                          📚
                        </div>
                        
                        {!cls.isOwner && (
                          <div className="w-12 h-12">
                            <ProgressRing 
                              radius={24} 
                              stroke={4} 
                              progress={cls.progress || 0} 
                              color="#3b82f6" 
                            />
                          </div>
                        )}
                      </div>

                      <h3 className="font-bold text-xl text-slate-900 mb-2 group-hover:text-blue-600 transition">
                        {cls.name}
                      </h3>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-6 h-10">
                        {cls.description || 'No description provided.'}
                      </p>
                      
                      <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                        {cls.isOwner ? (
                          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
                            <span className="text-xs font-bold text-slate-500 uppercase">Code</span>
                            <span className="text-xs font-mono font-bold text-slate-900 tracking-widest">
                              {cls.access_code}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-400 font-bold uppercase">Quizzes</span>
                            <span className="text-sm font-bold text-slate-700">
                              {cls.takenQuizzes} / {cls.totalQuizzes} Done
                            </span>
                          </div>
                        )}
                        
                        <span className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition">
                          →
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>
      </main>

      {/* Floating AI Assistant Button */}
      <Link 
        href="/ai-assistant" 
        className="fixed bottom-8 right-8 bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:bg-slate-800 hover:scale-110 transition-all z-50 group flex items-center gap-2 pr-6"
      >
        <span className="text-2xl">🤖</span>
        <span className="font-bold text-sm">Ask AI</span>
      </Link>

      {/* CREATE CLASS MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-1 text-slate-900">Create Class</h2>
            <p className="text-slate-500 text-sm mb-6">Set up a new space for your students.</p>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <input 
                placeholder="Class Name" 
                className="w-full bg-slate-50 border-none p-4 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-bold placeholder:font-normal" 
                value={newClass.name} 
                onChange={e => setNewClass({...newClass, name: e.target.value})} 
                required 
              />
              <textarea 
                placeholder="Description" 
                className="w-full bg-slate-50 border-none p-4 rounded-xl h-32 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
                value={newClass.description} 
                onChange={e => setNewClass({...newClass, description: e.target.value})} 
              />
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)} 
                  className="flex-1 py-3.5 bg-slate-100 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createClassMutation.isPending} 
                  className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 disabled:opacity-50"
                >
                  {createClassMutation.isPending ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN CLASS MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-1 text-slate-900">Join Class</h2>
            <p className="text-slate-500 text-sm mb-6">Enter the access code shared by your lecturer.</p>
            <form onSubmit={handleJoinClass} className="space-y-4">
              <input 
                placeholder="XXX-0000" 
                className="w-full bg-slate-50 border-2 border-dashed border-slate-200 p-4 rounded-xl text-center font-mono text-2xl uppercase tracking-widest text-slate-900 focus:border-blue-500 outline-none" 
                value={joinCode} 
                onChange={e => setJoinCode(e.target.value)} 
                required 
              />
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowJoinModal(false)} 
                  className="flex-1 py-3.5 bg-slate-100 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={joinClassMutation.isPending} 
                  className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-lg disabled:opacity-50"
                >
                  {joinClassMutation.isPending ? 'Joining...' : 'Join Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}