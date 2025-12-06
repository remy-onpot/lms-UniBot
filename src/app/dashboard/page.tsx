'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ProgressRing } from '../../components/ProgressRing'; 
import { useClasses, useCreateClass, useJoinClass } from '../../hooks/useClasses';
import { UserProfile } from '../../types';
import { DashboardSkeleton } from '../../components/skeletons/DashboardSkeleton';
import { GamificationService } from '../../lib/services/gamification.service';
import { logger } from '../../lib/logger';
import { Button } from '../../components/ui/Button'; 
import { useDebounce } from '../../hooks/useDebounce';
import dynamic from 'next/dynamic';

// --- DYNAMIC IMPORTS (Lazy Loaded) ---
const OnboardingWizard = dynamic(() => import('../../components/OnboardingWizard'), { ssr: false });
const CreateClassModal = dynamic(() => import('../../components/features/dashboard/modals/CreateClassModal'));
const JoinClassModal = dynamic(() => import('../../components/features/dashboard/modals/JoinClassModal'));
const InviteTAModal = dynamic(() => import('../../components/features/dashboard/modals/InviteTAModal'));

export default function Dashboard() {
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  
  const { data: classes = [], isLoading: classesLoading } = useClasses();
  const createClassMutation = useCreateClass();
  const joinClassMutation = useJoinClass();

  const [activeFilter, setActiveFilter] = useState<'all' | 'ongoing' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [showWizard, setShowWizard] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showInviteTA, setShowInviteTA] = useState(false);
  
  const [newClass, setNewClass] = useState({ name: '', description: '' });
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) { router.replace('/login'); return; }
        
        setUser(session.user);
        const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
        setProfile(profile);

        GamificationService.checkDailyLogin(session.user.id).then((res: any) => {
           if (res) setProfile(prev => prev ? ({ ...prev, current_streak: res.newStreak, xp: (prev.xp || 0) + res.xpGained }) : null);
        });

        if ((profile?.role === 'lecturer' || profile?.is_course_rep) && !profile?.onboarding_completed) setShowWizard(true);
        setInitializing(false);
      } catch (e) { router.replace('/login'); }
    };
    init();
  }, [router]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace('/login'); };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    createClassMutation.mutate(newClass, {
      onSuccess: (data) => { alert(`Success! Code: ${data?.access_code}`); setShowCreateModal(false); setNewClass({ name: '', description: '' }); },
      onError: (err) => alert(err.message)
    });
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    joinClassMutation.mutate(joinCode, {
      onSuccess: () => { alert(`Joined!`); setShowJoinModal(false); setJoinCode(''); },
      onError: (err) => alert(err.message)
    });
  };

  if (initializing || !profile) return <DashboardSkeleton />;

  const filteredClasses = classes.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(debouncedSearch.toLowerCase());
    if (activeFilter === 'all') return matchesSearch;
    if (activeFilter === 'ongoing') return matchesSearch && c.progress < 100;
    return matchesSearch && c.progress === 100;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans text-slate-900">
      {showWizard && user && <OnboardingWizard userId={user.id} role={profile.role as any} isCourseRep={profile.is_course_rep || false} onComplete={() => setShowWizard(false)} />}

      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-xl shadow-lg text-white">🎓</div>
            <span className="font-bold text-xl tracking-tight text-slate-900">UniBot</span>
          </div>
          <div className="hidden md:flex items-center bg-slate-100 rounded-full px-4 py-2.5 w-96">
            <span className="text-slate-400 mr-2">🔍</span>
            <input className="bg-transparent outline-none text-sm w-full placeholder:text-slate-400" placeholder="Search courses..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 mr-2">
               <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-full" title="Streak">
                  <span className="text-lg">🔥</span><span className="text-sm font-black text-orange-600">{profile.current_streak || 0}</span>
               </div>
               <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-100 px-3 py-1.5 rounded-full" title="XP">
                  <span className="text-lg">⚡</span><span className="text-sm font-black text-yellow-700">{profile.xp || 0}</span>
               </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden relative">
              <Image src={`https://api.dicebear.com/7.x/notionists/svg?seed=${profile.email}`} alt="Avatar" fill className="object-cover" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-10">
        <section className="relative bg-slate-900 rounded-3xl p-8 md:p-12 text-white shadow-2xl overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <h1 className="text-3xl md:text-5xl font-bold mb-4">Welcome back, <span className="text-blue-400">{profile.full_name.split(' ')[0]}</span>.</h1>
              <div className="flex flex-wrap gap-3 mt-6">
                {(profile.role === 'lecturer' || (profile.is_course_rep && classes.filter(c=>c.isOwner).length === 0)) && (
                  <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2"><span>+</span> Create Class</Button>
                )}
                <Button onClick={() => setShowJoinModal(true)} variant="outline" className="bg-white/10 text-white border-white/10 hover:bg-white/20"><span>🔑</span> Join Class</Button>
                {profile.role === 'student' && (
                   <Link href="/dashboard/daily-quiz" className="inline-flex items-center rounded-xl font-bold bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 shadow-lg gap-2"><span>💪</span> Daily Workout</Link>
                )}
              </div>
            </div>
        </section>

        <section>
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-2xl font-bold text-slate-900">My Courses</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClasses.map((cls, i) => (
                <div key={cls.id} onClick={() => router.push(`/dashboard/class/${cls.id}`)} className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-blue-50 text-blue-600">📚</div>
                      {!cls.isOwner && <div className="w-12 h-12"><ProgressRing radius={24} stroke={4} progress={cls.progress || 0} color="#3b82f6" /></div>}
                    </div>
                    <h3 className="font-bold text-xl text-slate-900 mb-2">{cls.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-6">{cls.description}</p>
                </div>
            ))}
          </div>
        </section>
      </main>

      {/* --- LAZY LOADED MODALS --- */}
      {showCreateModal && (
        <CreateClassModal 
            onClose={() => setShowCreateModal(false)} 
            onSubmit={handleCreateClass} 
            loading={createClassMutation.isPending} 
            data={newClass} 
            onChange={setNewClass} 
        />
      )}

      {showJoinModal && (
        <JoinClassModal 
            onClose={() => setShowJoinModal(false)} 
            onSubmit={handleJoinClass} 
            loading={joinClassMutation.isPending} 
            code={joinCode} 
            onChange={setJoinCode} 
        />
      )}
      
      {showInviteTA && user && (
        <InviteTAModal 
            onClose={() => setShowInviteTA(false)} 
            userId={user.id} 
        />
      )}
    </div>
  );
}