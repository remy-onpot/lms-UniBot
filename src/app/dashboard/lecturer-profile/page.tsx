'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input'; // Ensure you have this or use standard input
import { toast } from 'sonner';
import { 
  Search, Archive, Plus, Users, 
  ChevronRight, Loader2, Lock, 
  BookOpen, ArrowRight, TrendingUp, LogIn
} from 'lucide-react';
import { getPlanLimits } from '@/lib/constants'; 
// 🟢 FIX 1: Import 'ClassData' instead of 'DashboardClass'
import { ClassService, ClassData } from '@/lib/services/class.service';
import { OverLimitModal } from '@/components/features/lecturer/OverLimitModal';
// import { UpgradeModal } from '@/components/features/lecturer/UpgradeModal'; // Uncomment if you have this

export default function LecturerConsole() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  
  // 🟢 FIX 2: Use ClassData type for state
  const [activeClasses, setActiveClasses] = useState<ClassData[]>([]);
  const [archivedClasses, setArchivedClasses] = useState<ClassData[]>([]);
  
  const [limits, setLimits] = useState<any>({ max_classes: 1 });
  const [saasUsage, setSaasUsage] = useState(0);
   
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Join Class State
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const [targetItem, setTargetItem] = useState<{id: string, name: string, action: 'delete' | 'archive'} | null>(null);

  useEffect(() => { fetchLecturerData(); }, []);

  const fetchLecturerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      const { data: userProfile } = await supabase.from('users').select('*').eq('id', user.id).single();
      setProfile(userProfile);
      setLimits(getPlanLimits(userProfile.role, userProfile.plan_tier, userProfile.is_course_rep));

      // 1. Fetch Classes Owned
      // Note: We are using 'owner_id' as per your latest DB schema update
      const { data: classList } = await supabase
        .from('classes')
        .select('*, students:class_enrollments(count)')
        .eq('owner_id', user.id); // Updated from lecturer_id to owner_id for consistency

      if (!classList) return;

      const processed = classList.map((c: any) => ({
        ...c,
        studentCount: c.students?.[0]?.count || 0
      }));

      const active = processed.filter((c: any) => c.status === 'active');
      const archived = processed.filter((c: any) => c.status === 'archived');
      
      setActiveClasses(active);
      setArchivedClasses(archived);
      setSaasUsage(active.filter((c: any) => c.type === 'saas').length);

    } catch (e) {
      toast.error("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    if (saasUsage >= limits.max_classes) setShowUpgradeModal(true);
    else router.push('/dashboard/create-class');
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    
    setJoining(true);
    try {
        // 1. Find Class
        const classData = await ClassService.getClassByAccessCode(joinCode.trim());
        if (!classData) throw new Error("Invalid access code");

        // 2. Enroll (As a lecturer/observer)
        await ClassService.enrollStudent(classData.id, profile.id, {
            role: 'lecturer', // Joining as a peer/lecturer
            hasPaid: true, // Lecturers usually don't pay to join peer classes (business logic dependent)
            accessType: 'full_semester'
        });

        toast.success(`Joined ${classData.name} successfully!`);
        setShowJoinModal(false);
        setJoinCode('');
        // Refresh data or redirect
        router.push(`/dashboard/class/${classData.id}`);
    } catch (error: any) {
        toast.error(error.message || "Failed to join class");
    } finally {
        setJoining(false);
    }
  };

  const handleAction = async () => {
    if (!targetItem || !profile) return;
    try {
      if (targetItem.action === 'archive') await ClassService.archiveClass(targetItem.id, profile.id);
      else await ClassService.deleteClass(targetItem.id, profile.id);
      toast.success("Success");
      setTargetItem(null); 
      fetchLecturerData(); 
    } catch (e: any) { toast.error(e.message); }
  };

  const filteredActive = activeClasses.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-indigo-600"/></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      <OverLimitModal activeClasses={activeClasses} limit={limits.max_classes} onArchive={(id) => handleAction()} />

      {/* JOIN CLASS MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200">
                <h3 className="text-xl font-bold mb-2">Join a Class</h3>
                <p className="text-slate-500 mb-6 text-sm">Enter the access code provided by the class owner.</p>
                <form onSubmit={handleJoinClass} className="space-y-4">
                    <Input 
                        placeholder="e.g. CS-1234" 
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        className="text-lg uppercase font-mono tracking-widest text-center h-12"
                    />
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowJoinModal(false)} className="flex-1">Cancel</Button>
                        <Button type="submit" disabled={joining} className="flex-1 bg-indigo-600 text-white">
                            {joining ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Join Class'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
      )}

      <header className="bg-slate-900 border-b border-slate-800 pt-8 pb-16 px-4 md:px-8 relative overflow-hidden">
         <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex justify-between items-center mb-10">
               <div>
                  <button onClick={() => router.back()} className="text-slate-400 hover:text-white flex items-center gap-2 text-xs font-bold uppercase mb-4"><ChevronRight className="w-4 h-4 rotate-180"/> Back</button>
                  <h1 className="text-3xl font-black text-white">Lecturer Console</h1>
               </div>
               <div className="flex gap-2">
                  <Button onClick={() => router.push('/dashboard/lecturer-profile/records')} variant="outline" className="bg-slate-800 text-slate-300 border-slate-700">Records</Button>
                  <Button onClick={() => router.push('/dashboard/billing')} className="bg-indigo-600 text-white">Billing</Button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 flex justify-between items-center">
                  <div>
                      <p className="text-slate-500 text-xs font-bold uppercase">Total Enrollment</p>
                      <h3 className="text-3xl font-black text-slate-900">{activeClasses.reduce((acc, c) => acc + (c.student_count || 0), 0)}</h3>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users className="w-6 h-6"/></div>
               </div>

               <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 flex justify-between items-center">
                  <div>
                      <p className="text-slate-500 text-xs font-bold uppercase">Active Classes</p>
                      <h3 className="text-3xl font-black text-slate-900">{activeClasses.length}</h3>
                  </div>
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><BookOpen className="w-6 h-6"/></div>
               </div>

               <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700 flex justify-between items-center text-white">
                  <div>
                      <p className="text-slate-400 text-xs font-bold uppercase">Avg. Participation</p>
                      <h3 className="text-3xl font-black flex items-center gap-1">--%</h3>
                  </div>
                  <div className="p-3 bg-slate-700 text-green-400 rounded-xl"><TrendingUp className="w-6 h-6"/></div>
               </div>
            </div>
         </div>
      </header>

      {/* BODY */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-8">
         <div className="flex flex-col md:flex-row gap-4 items-center">
           
           {/* CREATE CLASS BUTTON */}
           <button onClick={handleCreateClick} className="w-full md:w-auto px-8 py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-slate-800 active:scale-95 transition-all">
             {saasUsage >= limits.max_classes ? <Lock className="w-4 h-4 text-slate-400" /> : <Plus className="w-4 h-4" />}
             Create New Class
           </button>

           {/* 🟢 NEW: JOIN CLASS BUTTON */}
           <button onClick={() => setShowJoinModal(true)} className="w-full md:w-auto px-6 py-4 bg-white text-slate-900 border-2 border-slate-200 rounded-xl font-bold flex items-center justify-center gap-2 hover:border-indigo-500 hover:text-indigo-600 active:scale-95 transition-all">
             <LogIn className="w-4 h-4" />
             Join Class
           </button>

           <div className="flex-1 w-full relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search classes..." className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none font-medium text-slate-900 bg-white transition-all focus:shadow-md" />
           </div>
           
           <button onClick={() => setShowArchived(!showArchived)} className={`px-6 py-3.5 rounded-xl font-bold border-2 transition-all flex items-center gap-2 ${showArchived ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
              <Archive className="w-4 h-4" /> {showArchived ? 'Hide Archives' : 'View Archives'}
           </button>
         </div>

         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filteredActive.map((cls) => (
             <div key={cls.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-indigo-300 transition-all shadow-sm">
               <div className="flex justify-between items-start mb-4">
                 <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-xs">{cls.access_code}</div>
                 <Badge variant="outline">{cls.student_count} Students</Badge>
               </div>
               <h3 className="font-bold text-lg text-slate-900 mb-6 truncate">{cls.name}</h3>
               <div className="grid grid-cols-2 gap-2">
                 <Button variant="outline" className="text-xs" onClick={() => router.push(`/dashboard/class/${cls.id}/students`)}>
                   <Users className="w-3 h-3 mr-2"/> Roster
                 </Button>
                 <Button className="text-xs bg-slate-900 text-white" onClick={() => router.push(`/dashboard/class/${cls.id}`)}>
                   Enter <ArrowRight className="w-3 h-3 ml-1"/>
                 </Button>
               </div>
             </div>
           ))}
         </div>
      </div>
    </div>
  );
}